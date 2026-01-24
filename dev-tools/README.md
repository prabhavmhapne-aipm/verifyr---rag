# Verifyr Developer Tools

A simple toolkit for managing the Verifyr RAG server without using Claude Code tokens.

## Quick Start

### Option 1: Web UI (Recommended)
Double-click `index.html` to open the Developer Tools dashboard in your browser.

**Features:**
- Real-time server status (auto-refreshes every 10 seconds)
- Quick links to Chat, API Docs, Langfuse
- Test API endpoints without burning tokens
- Copy PowerShell commands with one click
- Activity log

### Option 2: Clickable Scripts
Double-click any of these batch files:

| Script | Description |
|--------|-------------|
| `START_SERVER.bat` | Start the FastAPI backend server |
| `STOP_SERVER.bat` | Kill all Python processes |
| `CHECK_STATUS.bat` | Show running processes and server health |

## Server URLs

Once the server is running:

| URL | Description |
|-----|-------------|
| http://localhost:8000/ | Landing page |
| http://localhost:8000/chat.html | Chat interface |
| http://localhost:8000/docs | API documentation (Swagger) |
| http://localhost:8000/health | Health check endpoint |
| http://localhost:3000/ | Langfuse dashboard (if Docker is running) |

## PowerShell Commands

If you prefer using PowerShell directly:

```powershell
# Start server
.\manage_server.ps1 -Action start

# Stop server
.\manage_server.ps1 -Action kill

# Restart server
.\manage_server.ps1 -Action restart

# Check status
.\manage_server.ps1 -Action status

# Check Python processes
Get-Process python -ErrorAction SilentlyContinue
```

## API Testing

The web UI includes quick API tests:

- **Test Health** - Check if server is responding
- **Test Products** - List available products in the knowledge base
- **Test Query** - Run a sample RAG query (uses GPT-4o Mini)

## Troubleshooting

### Server won't start
1. Check if another Python process is running: `CHECK_STATUS.bat`
2. Kill existing processes: `STOP_SERVER.bat`
3. Try starting again: `START_SERVER.bat`

### Qdrant database locked
```powershell
# Kill all Python processes
.\manage_server.ps1 -Action kill

# Wait a few seconds, then start again
.\manage_server.ps1 -Action start
```

### CORS errors in browser
Make sure you're accessing the chat at `http://localhost:8000/chat.html` (served by FastAPI), not via Live Server.

### Claude models not working
Your Anthropic account needs credits. Use GPT-4o Mini (default) which works with your OpenAI API key.

## File Structure

```
dev-tools/
├── index.html        # Web UI dashboard
├── START_SERVER.bat  # Start server script
├── STOP_SERVER.bat   # Stop server script
├── CHECK_STATUS.bat  # Status check script
└── README.md         # This file
```
