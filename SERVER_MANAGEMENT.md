# Server Management Guide

Quick reference for managing the FastAPI server and Python processes.

## 🚨 CRITICAL: Server Restart Reference

### Workspace & Python Locations

**Workspace Root:**
```
C:\Users\prabh\OneDrive\Git_PM\verifyr - rag
```

**Python Executable Locations:**
- Base Python: `C:\ProgramData\anaconda3\python.exe`
- Virtual Environment Python: `venv\Scripts\python.exe` (relative to workspace root)
- Full Path: `C:\Users\prabh\OneDrive\Git_PM\verifyr - rag\venv\Scripts\python.exe`

**Server File:**
```
backend\main.py
```

**Management Script:**
```
manage_server.ps1 (in workspace root)
```

### Step-by-Step Restart Procedure

#### Method 1: Using Management Script (Recommended)

1. **Open PowerShell in workspace root:**
   ```powershell
   cd "C:\Users\prabh\OneDrive\Git_PM\verifyr - rag"
   ```

2. **Activate virtual environment (REQUIRED):**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   You should see `(venv)` in your prompt.

3. **Restart the server:**
   ```powershell
   .\manage_server.ps1 -Action restart
   ```

   This script will:
   - Kill all Python processes
   - Wait 3 seconds for cleanup
   - Navigate to `backend\` directory
   - Run `python main.py`
   - Start server on `http://localhost:8000`

#### Method 2: Manual Restart (if script fails)

1. **Open PowerShell in workspace root:**
   ```powershell
   cd "C:\Users\prabh\OneDrive\Git_PM\verifyr - rag"
   ```

2. **Activate virtual environment:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

3. **Kill all Python processes:**
   ```powershell
   Get-Process python* -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

4. **Wait 3 seconds:**
   ```powershell
   Start-Sleep -Seconds 3
   ```

5. **Navigate to backend directory:**
   ```powershell
   cd backend
   ```

6. **Start the server:**
   ```powershell
   python main.py
   ```

### ⚠️ Important Notes

1. **Virtual Environment Activation:**
   - The `manage_server.ps1` script does NOT activate the venv automatically
   - You MUST activate it manually before running the script: `.\venv\Scripts\Activate.ps1`
   - If venv is not activated, the script uses system Python (may cause dependency issues)

2. **Python Executable Priority:**
   - If venv is activated: uses `venv\Scripts\python.exe`
   - If venv is not activated: uses system Python (may cause dependency issues)

3. **Port 8000:**
   - Server runs on `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - Frontend: `http://localhost:8000/frontend/`

4. **Qdrant Database Locks:**
   - Qdrant uses SQLite which locks the database
   - Always kill all Python processes before running indexing scripts
   - Wait 3 seconds after killing processes for cleanup

### Quick Reference Commands

```powershell
# 1. Navigate to workspace
cd "C:\Users\prabh\OneDrive\Git_PM\verifyr - rag"

# 2. Activate virtual environment (ALWAYS DO THIS FIRST)
.\venv\Scripts\Activate.ps1

# 3. Check status
.\manage_server.ps1 -Action status

# 4. Kill all Python processes
.\manage_server.ps1 -Action kill

# 5. Start server
.\manage_server.ps1 -Action start

# 6. Restart server (kill + start)
.\manage_server.ps1 -Action restart

# 7. Check port 8000
.\manage_server.ps1 -Action port
```

### Recommended Daily Workflow

```powershell
# Morning startup routine
cd "C:\Users\prabh\OneDrive\Git_PM\verifyr - rag"
.\venv\Scripts\Activate.ps1
.\manage_server.ps1 -Action restart

# After code changes
.\manage_server.ps1 -Action restart

# Before running indexing scripts
.\manage_server.ps1 -Action kill
# ... run your indexing script ...
.\manage_server.ps1 -Action start

# End of day
.\manage_server.ps1 -Action kill
```

---

## Helper Script: `manage_server.ps1`

This PowerShell script helps you manage the FastAPI server and avoid Qdrant lock issues.

### Usage

```powershell
# Check status of Python processes and server
.\manage_server.ps1 -Action status

# Kill all Python processes (releases Qdrant locks)
.\manage_server.ps1 -Action kill

# Start the FastAPI server
.\manage_server.ps1 -Action start

# Restart server (kill all Python + start fresh)
.\manage_server.ps1 -Action restart

# Check if port 8000 is in use
.\manage_server.ps1 -Action port
```

### Common Scenarios

#### Scenario 1: Running indexing scripts (Phase 1-4)
```powershell
# 0. Activate virtual environment (if not already active)
.\venv\Scripts\Activate.ps1

# 1. Stop the server if running
.\manage_server.ps1 -Action kill

# 2. Run your indexing script
python backend/indexing/vector_store.py

# 3. Start server when done
.\manage_server.ps1 -Action start
```

#### Scenario 2: Testing code changes
```powershell
# Restart server to load new code
.\manage_server.ps1 -Action restart
```

#### Scenario 3: Qdrant database locked error
```powershell
# Kill all Python processes to release locks
.\manage_server.ps1 -Action kill

# Wait a few seconds, then run your script
```

#### Scenario 4: Check if server is running
```powershell
# Check status
.\manage_server.ps1 -Action status

# Or just check the port
.\manage_server.ps1 -Action port
```

## Manual Commands (if script doesn't work)

### Check Python processes
```powershell
Get-Process python* | Select-Object Id, ProcessName, StartTime | Format-Table
```

### Kill all Python processes
```powershell
Get-Process python* -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Check port 8000
```powershell
netstat -ano | findstr :8000
```

### Start server manually
```powershell
# First, activate virtual environment
.\venv\Scripts\Activate.ps1

# Then navigate to backend and start
cd backend
python main.py
```

## Important Notes

1. **Always stop the server before running indexing scripts** - Qdrant uses SQLite which locks the database

2. **Restart after code changes** - The server caches search components on startup. After modifying:
   - `vector_store.py`
   - `hybrid_search.py`
   - `llm_client.py`
   - `bm25_index.py`

   You MUST restart the server to load the new code.

3. **OneDrive sync issues** - If you see persistent locks, OneDrive might be syncing Qdrant files. The lock errors mention this.

4. **Server startup time** - The server takes ~3-5 seconds to load indexes. Wait for "Application startup complete" message.

## Langfuse Docker Services (Observability)

Langfuse v3 is deployed via Docker Compose for LLM observability and evaluation tracking.

### Services

The `docker-compose.yml` includes:
- **Langfuse** (port 3000) - Main observability platform
- **PostgreSQL** (port 5432) - Database for Langfuse
- **Redis** (port 6379) - Cache and queue
- **ClickHouse** (ports 8123, 9000) - Analytics database (required for v3)
- **MinIO** (ports 9001, 9002) - S3-compatible blob storage (required for v3)

### Quick Commands

```powershell
# Start all Langfuse services
docker compose up -d

# Check status
docker compose ps

# View Langfuse logs
docker compose logs -f langfuse

# Stop all services
docker compose down

# Restart services
docker compose restart
```

### Access Points

- **Langfuse Dashboard**: http://localhost:3000
- **Langfuse Health API**: http://localhost:3000/api/public/health
- **MinIO Console**: http://localhost:9001 (login: `minioadmin` / `minioadmin`)

### Important Notes

1. **Langfuse v3 Requirements**: 
   - ClickHouse and MinIO are required (not optional)
   - All services must be healthy for Langfuse to work

2. **Port Conflicts**:
   - MinIO uses port 9002 externally (9000 internally) to avoid conflict with ClickHouse
   - ClickHouse uses port 9000 for native protocol

3. **First Time Setup**:
   - MinIO bucket (`langfuse-events`) is created automatically on first startup
   - Access Langfuse dashboard to get API keys for `.env` file

4. **Environment Variables** (in `.env` file):
   ```bash
   LANGFUSE_HOST=http://localhost:3000
   LANGFUSE_PUBLIC_KEY=<from-dashboard>
   LANGFUSE_SECRET_KEY=<from-dashboard>
   ```

## API Endpoints

Once the server is running:

- **API Base**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Query Endpoint**: http://localhost:8000/query (POST)

## Troubleshooting

### "Storage folder already accessed" error
```powershell
.\manage_server.ps1 -Action kill
# Wait 3 seconds
.\manage_server.ps1 -Action start
```

### Server won't start (port already in use)
```powershell
.\manage_server.ps1 -Action port
# Check what's using it, then:
.\manage_server.ps1 -Action kill
```

### Changes not reflecting in API
```powershell
# Full restart required
.\manage_server.ps1 -Action restart
```

## Development Workflow

Recommended workflow when developing:

```powershell
# Morning startup (ALWAYS activate venv first!)
cd "C:\Users\prabh\OneDrive\Git_PM\verifyr - rag"
.\venv\Scripts\Activate.ps1
.\manage_server.ps1 -Action start

# Making code changes? Restart:
.\manage_server.ps1 -Action restart

# Running indexing? Kill first:
.\manage_server.ps1 -Action kill
python backend/indexing/vector_store.py
.\manage_server.ps1 -Action start

# End of day
.\manage_server.ps1 -Action kill
```
