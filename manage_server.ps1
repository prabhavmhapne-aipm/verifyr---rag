#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Helper script to manage FastAPI server and Python processes for Verifyr RAG system.

.DESCRIPTION
    Manages Python processes and FastAPI server with common operations:
    - status: Check running Python processes and server status
    - kill: Stop all Python processes (releases Qdrant locks)
    - start: Start the FastAPI server
    - restart: Kill all Python processes and start fresh server
    - port: Check if port 8000 is in use

.PARAMETER Action
    The action to perform: status, kill, start, restart, port

.EXAMPLE
    .\manage_server.ps1 -Action status
    .\manage_server.ps1 -Action restart
    .\manage_server.ps1 -Action kill

.NOTES
    Use this script before re-running indexing scripts to avoid Qdrant lock issues.
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "kill", "start", "restart", "port")]
    [string]$Action
)

# Colors for output
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }

# Ensure Write-Info exists (for PowerShell versions that don't have it)
if (-not (Get-Command Write-Info -ErrorAction SilentlyContinue)) {
    function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-PythonProcesses {
    Write-Info "Checking for Python processes..."
    $processes = Get-Process python* -ErrorAction SilentlyContinue

    if ($processes) {
        Write-Warning "Found $($processes.Count) Python process(es):"
        $processes | Select-Object Id, ProcessName, StartTime, @{
            Name='Runtime';
            Expression={(Get-Date) - $_.StartTime}
        } | Format-Table -AutoSize
        return $true
    } else {
        Write-Success "No Python processes running"
        return $false
    }
}

function Test-Port8000 {
    Write-Info "Checking if port 8000 is in use..."
    $portCheck = netstat -ano | Select-String ":8000"

    if ($portCheck) {
        Write-Warning "Port 8000 is in use:"
        Write-Host $portCheck

        # Try to find the process ID
        $portInfo = netstat -ano | Select-String ":8000" | Select-Object -First 1
        if ($portInfo -match '\s+(\d+)$') {
            $processId = $Matches[1]
            try {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Info "Process using port 8000: $($process.ProcessName) (PID: $processId)"
                }
            } catch {
                Write-Warning "Could not get details for PID: $processId"
            }
        }
        return $true
    } else {
        Write-Success "Port 8000 is free"
        return $false
    }
}

function Stop-AllPython {
    Write-Info "Stopping all Python processes..."

    $processes = Get-Process python* -ErrorAction SilentlyContinue
    if (-not $processes) {
        Write-Success "No Python processes to stop"
        return
    }

    try {
        $processes | Stop-Process -Force
        Start-Sleep -Seconds 2

        # Verify all stopped
        $remaining = Get-Process python* -ErrorAction SilentlyContinue
        if ($remaining) {
            Write-Warning "Some Python processes still running:"
            $remaining | Select-Object Id, ProcessName | Format-Table -AutoSize
        } else {
            Write-Success "All Python processes stopped successfully"
        }
    } catch {
        Write-Error "Failed to stop Python processes: $_"
    }
}

function Start-Server {
    Write-Info "Starting FastAPI server..."

    # Check if already running
    if (Test-Port8000) {
        Write-Error "Port 8000 already in use. Run 'kill' action first."
        return
    }

    # Navigate to backend directory and start server
    $backendDir = Join-Path $ScriptDir "backend"

    if (-not (Test-Path $backendDir)) {
        Write-Error "Backend directory not found: $backendDir"
        return
    }

    Write-Info "Starting server in: $backendDir"
    Write-Info "Server will run in background. Press Ctrl+C to stop."
    Write-Info "API will be available at: http://localhost:8000"
    Write-Info "Swagger docs at: http://localhost:8000/docs"
    Write-Host ""

    # Start server in current terminal
    Set-Location $backendDir
    python main.py
}

function Restart-Server {
    Write-Info "Restarting server (kill all Python + start fresh)..."
    Write-Host ""

    # Stop all Python
    Stop-AllPython

    # Wait a moment for cleanup
    Write-Info "Waiting for cleanup..."
    Start-Sleep -Seconds 3

    # Start server
    Write-Host ""
    Start-Server
}

# Main script logic
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verifyr RAG Server Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    "status" {
        Write-Host "=== Server Status ===" -ForegroundColor Yellow
        Write-Host ""
        Get-PythonProcesses
        Write-Host ""
        Test-Port8000
    }

    "kill" {
        Write-Host "=== Stopping Python Processes ===" -ForegroundColor Yellow
        Write-Host ""
        Stop-AllPython
    }

    "start" {
        Write-Host "=== Starting Server ===" -ForegroundColor Yellow
        Write-Host ""
        Start-Server
    }

    "restart" {
        Write-Host "=== Restarting Server ===" -ForegroundColor Yellow
        Write-Host ""
        Restart-Server
    }

    "port" {
        Write-Host "=== Port 8000 Status ===" -ForegroundColor Yellow
        Write-Host ""
        Test-Port8000
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
