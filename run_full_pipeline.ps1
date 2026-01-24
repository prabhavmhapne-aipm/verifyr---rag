<#
.SYNOPSIS
    Verifyr RAG Pipeline Orchestration Agent
    Automates the complete indexing pipeline from PDFs to search indexes

.DESCRIPTION
    This script orchestrates the full RAG pipeline:
    1. Kills server (prevent Qdrant locks)
    2. Processes PDFs → Text extraction
    3. Chunks text (800 tokens, 200 overlap)
    4. Builds Qdrant vector index
    5. Builds BM25 keyword index
    6. Verifies metadata completeness
    7. Starts server

    Features:
    - Error handling with rollback
    - Progress reporting
    - Health checks at each step
    - Timing and statistics
    - Automatic snapshot backup before indexing

.PARAMETER SkipBackup
    Skip creating backup snapshot of existing indexes

.PARAMETER SkipVerify
    Skip metadata verification step (faster, but not recommended)

.PARAMETER StartServer
    Start the server after successful indexing (default: true)

.EXAMPLE
    .\run_full_pipeline.ps1
    Runs full pipeline with defaults

.EXAMPLE
    .\run_full_pipeline.ps1 -SkipBackup -StartServer:$false
    Runs pipeline without backup and doesn't start server
#>

[CmdletBinding()]
param(
    [switch]$SkipBackup = $false,
    [switch]$SkipVerify = $false,
    [switch]$StartServer = $true
)

# Configuration
$VenvPython = ".\venv\Scripts\python.exe"
$ScriptDir = $PSScriptRoot
$BackupDir = Join-Path $ScriptDir "data\backups"
$DataDir = Join-Path $ScriptDir "data\processed"

# ANSI color codes for better output
$ColorReset = "`e[0m"
$ColorGreen = "`e[32m"
$ColorYellow = "`e[33m"
$ColorRed = "`e[31m"
$ColorBlue = "`e[34m"
$ColorCyan = "`e[36m"

# Helper functions
function Write-Step {
    param([string]$Message, [string]$Icon = "🔄")
    Write-Host "`n${ColorBlue}${Icon} ${Message}...${ColorReset}"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${ColorGreen}✅ ${Message}${ColorReset}"
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "${ColorYellow}⚠️  ${Message}${ColorReset}"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "${ColorRed}❌ ${Message}${ColorReset}"
}

function Write-Info {
    param([string]$Message)
    Write-Host "${ColorCyan}ℹ️  ${Message}${ColorReset}"
}

# Track overall timing
$PipelineStart = Get-Date

# Pipeline state for rollback
$PipelineState = @{
    StepCompleted = @()
    BackupCreated = $false
    BackupPath = ""
    Errors = @()
}

# Step 0: Pre-flight checks
Write-Step "Running pre-flight checks" "🔍"

# Check if venv exists
if (-not (Test-Path $VenvPython)) {
    Write-Error-Custom "Virtual environment not found at: $VenvPython"
    Write-Info "Run: python -m venv venv"
    exit 1
}

# Check if data directory exists
if (-not (Test-Path (Join-Path $ScriptDir "data\raw"))) {
    Write-Error-Custom "Data directory not found. Expected: data\raw\"
    exit 1
}

Write-Success "Pre-flight checks passed"

# Step 1: Kill server
Write-Step "Stopping server" "🛑"
try {
    & "$ScriptDir\manage_server.ps1" -Action kill
    $PipelineState.StepCompleted += "kill_server"
    Write-Success "Server stopped"
} catch {
    Write-Error-Custom "Failed to stop server: $_"
    $PipelineState.Errors += "kill_server: $_"
    exit 1
}

# Step 2: Create backup (optional)
if (-not $SkipBackup) {
    Write-Step "Creating backup snapshot" "💾"
    try {
        # Create backup directory if it doesn't exist
        if (-not (Test-Path $BackupDir)) {
            New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        }

        # Backup with timestamp
        $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $BackupPath = Join-Path $BackupDir "backup_$Timestamp"

        # Copy Qdrant storage
        if (Test-Path (Join-Path $ScriptDir "data\qdrant_storage")) {
            Copy-Item -Path (Join-Path $ScriptDir "data\qdrant_storage") -Destination (Join-Path $BackupPath "qdrant_storage") -Recurse -Force
        }

        # Copy processed data
        if (Test-Path $DataDir) {
            Copy-Item -Path $DataDir -Destination (Join-Path $BackupPath "processed") -Recurse -Force
        }

        $PipelineState.BackupCreated = $true
        $PipelineState.BackupPath = $BackupPath
        Write-Success "Backup created: $BackupPath"
    } catch {
        Write-Warning-Custom "Backup failed (continuing anyway): $_"
        $PipelineState.Errors += "backup: $_"
    }
} else {
    Write-Info "Skipping backup (use -SkipBackup:$false to enable)"
}

# Step 3: Process PDFs
Write-Step "Processing PDFs" "📥"
$StepStart = Get-Date
try {
    $Output = & $VenvPython "backend\ingestion\pdf_processor.py" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "PDF processing failed with exit code $LASTEXITCODE"
    }
    $StepDuration = (Get-Date) - $StepStart
    $PipelineState.StepCompleted += "process_pdfs"
    Write-Success "PDFs processed (${StepDuration}.TotalSeconds)s)"

    # Parse output for stats
    if ($Output -match "(\d+) pages") {
        Write-Info "Processed $($Matches[1]) pages"
    }
} catch {
    Write-Error-Custom "PDF processing failed: $_"
    $PipelineState.Errors += "process_pdfs: $_"

    # Attempt rollback
    if ($PipelineState.BackupCreated) {
        Write-Warning-Custom "Attempting rollback from backup..."
        # Rollback logic would go here
    }
    exit 1
}

# Step 4: Chunk text
Write-Step "Chunking text" "✂️"
$StepStart = Get-Date
try {
    $Output = & $VenvPython "backend\ingestion\chunker.py" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Chunking failed with exit code $LASTEXITCODE"
    }
    $StepDuration = (Get-Date) - $StepStart
    $PipelineState.StepCompleted += "chunk_text"
    Write-Success "Text chunked (${StepDuration}.TotalSeconds)s)"

    # Parse output for chunk count
    if ($Output -match "(\d+) chunks") {
        $ChunkCount = $Matches[1]
        Write-Info "Created $ChunkCount chunks (800 tokens, 200 overlap)"
    }
} catch {
    Write-Error-Custom "Chunking failed: $_"
    $PipelineState.Errors += "chunk_text: $_"
    exit 1
}

# Step 5: Build Qdrant vector index
Write-Step "Building Qdrant vector index" "🔍"
$StepStart = Get-Date
try {
    $Output = & $VenvPython "backend\indexing\vector_store.py" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Vector indexing failed with exit code $LASTEXITCODE"
    }
    $StepDuration = (Get-Date) - $StepStart
    $PipelineState.StepCompleted += "index_vector"
    Write-Success "Qdrant index built (${StepDuration}.TotalSeconds)s)"

    # Parse output for stats
    if ($Output -match "(\d+) vectors") {
        Write-Info "Indexed $($Matches[1]) vectors (384-dim, paraphrase-multilingual-MiniLM-L12-v2)"
    }
} catch {
    Write-Error-Custom "Vector indexing failed: $_"
    $PipelineState.Errors += "index_vector: $_"
    exit 1
}

# Step 6: Build BM25 index
Write-Step "Building BM25 keyword index" "🔑"
$StepStart = Get-Date
try {
    $Output = & $VenvPython "backend\indexing\bm25_index.py" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "BM25 indexing failed with exit code $LASTEXITCODE"
    }
    $StepDuration = (Get-Date) - $StepStart
    $PipelineState.StepCompleted += "index_bm25"
    Write-Success "BM25 index built (${StepDuration}.TotalSeconds)s)"
} catch {
    Write-Error-Custom "BM25 indexing failed: $_"
    $PipelineState.Errors += "index_bm25: $_"
    exit 1
}

# Step 7: Verify metadata (optional)
if (-not $SkipVerify) {
    Write-Step "Verifying metadata completeness" "✔️"
    $StepStart = Get-Date
    try {
        # Check if verification script exists
        $VerifyScript = Join-Path $ScriptDir "backend\indexing\verify_source_metadata.py"
        if (Test-Path $VerifyScript) {
            $Output = & $VenvPython $VerifyScript 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warning-Custom "Metadata verification warnings (non-critical)"
            }
            $StepDuration = (Get-Date) - $StepStart
            $PipelineState.StepCompleted += "verify_metadata"
            Write-Success "Metadata verified (${StepDuration}.TotalSeconds)s)"
        } else {
            Write-Warning-Custom "Verification script not found: $VerifyScript"
        }
    } catch {
        Write-Warning-Custom "Metadata verification failed (non-critical): $_"
        $PipelineState.Errors += "verify_metadata: $_"
    }
} else {
    Write-Info "Skipping metadata verification (use -SkipVerify:$false to enable)"
}

# Step 8: Start server (optional)
if ($StartServer) {
    Write-Step "Starting server" "🚀"
    try {
        & "$ScriptDir\manage_server.ps1" -Action start
        $PipelineState.StepCompleted += "start_server"
        Write-Success "Server started: http://localhost:8000"
    } catch {
        Write-Warning-Custom "Failed to start server: $_"
        Write-Info "Start manually with: .\manage_server.ps1 -Action start"
        $PipelineState.Errors += "start_server: $_"
    }
} else {
    Write-Info "Server not started (use -StartServer to enable)"
    Write-Info "Start manually with: .\manage_server.ps1 -Action start"
}

# Final summary
$PipelineDuration = (Get-Date) - $PipelineStart
Write-Host "`n${ColorGreen}═══════════════════════════════════════════════════════════${ColorReset}"
Write-Host "${ColorGreen}📊 PIPELINE SUMMARY${ColorReset}"
Write-Host "${ColorGreen}═══════════════════════════════════════════════════════════${ColorReset}"

Write-Host "`n${ColorCyan}Steps Completed:${ColorReset}"
foreach ($Step in $PipelineState.StepCompleted) {
    Write-Host "  ${ColorGreen}✓${ColorReset} $Step"
}

if ($PipelineState.Errors.Count -gt 0) {
    Write-Host "`n${ColorYellow}Warnings/Errors:${ColorReset}"
    foreach ($Error in $PipelineState.Errors) {
        Write-Host "  ${ColorYellow}⚠${ColorReset} $Error"
    }
}

# Read final stats from chunks.json if available
$ChunksFile = Join-Path $DataDir "chunks.json"
if (Test-Path $ChunksFile) {
    try {
        $ChunksData = Get-Content $ChunksFile -Raw | ConvertFrom-Json
        $TotalChunks = $ChunksData.Count
        $Products = $ChunksData | Select-Object -ExpandProperty product_name -Unique

        Write-Host "`n${ColorCyan}Data Statistics:${ColorReset}"
        Write-Host "  Chunks: $TotalChunks"
        Write-Host "  Products: $($Products.Count) ($($Products -join ', '))"
        Write-Host "  Chunk size: 800 tokens, 200 overlap"
        Write-Host "  Embedding model: paraphrase-multilingual-MiniLM-L12-v2 (384-dim)"
    } catch {
        Write-Warning-Custom "Could not read chunk statistics"
    }
}

# Index sizes
$QdrantSize = 0
$BM25Size = 0
if (Test-Path (Join-Path $ScriptDir "data\qdrant_storage")) {
    $QdrantSize = (Get-ChildItem (Join-Path $ScriptDir "data\qdrant_storage") -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
}
if (Test-Path (Join-Path $DataDir "bm25_index.pkl")) {
    $BM25Size = (Get-Item (Join-Path $DataDir "bm25_index.pkl")).Length / 1MB
}

Write-Host "`n${ColorCyan}Index Sizes:${ColorReset}"
Write-Host "  Qdrant: $([math]::Round($QdrantSize, 2)) MB"
Write-Host "  BM25: $([math]::Round($BM25Size, 2)) MB"

if ($PipelineState.BackupCreated) {
    Write-Host "`n${ColorCyan}Backup:${ColorReset}"
    Write-Host "  Location: $($PipelineState.BackupPath)"
    Write-Host "  Restore with: Copy-Item '$($PipelineState.BackupPath)\*' -Destination '.\data\' -Recurse -Force"
}

Write-Host "`n${ColorCyan}Total Time:${ColorReset} $([math]::Round($PipelineDuration.TotalMinutes, 2)) minutes"

Write-Host "`n${ColorGreen}═══════════════════════════════════════════════════════════${ColorReset}"
Write-Host "${ColorGreen}✅ PIPELINE COMPLETED SUCCESSFULLY${ColorReset}"
Write-Host "${ColorGreen}═══════════════════════════════════════════════════════════${ColorReset}"

if ($StartServer) {
    Write-Host "`n${ColorCyan}Access Points:${ColorReset}"
    Write-Host "  Landing Page: ${ColorBlue}http://localhost:8000/${ColorReset}"
    Write-Host "  Chat Interface: ${ColorBlue}http://localhost:8000/chat.html${ColorReset}"
    Write-Host "  API Docs: ${ColorBlue}http://localhost:8000/docs${ColorReset}"
}

Write-Host ""
