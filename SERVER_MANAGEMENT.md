# Server Management Guide

Quick reference for managing the FastAPI server and Python processes.

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
# Morning startup
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
