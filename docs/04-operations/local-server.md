# How to Run Verifyr Landing Page Locally

## 🚀 Quick Start

### VS Code Live Server (Recommended)
1. Open VS Code (or Cursor)
2. Install the **"Live Server"** extension (by Ritwick Dey)
3. Right-click on `index.html`
4. Select **"Open with Live Server"**
5. Your page will open at `http://127.0.0.1:5500`

## 📝 Notes

- The server needs to run from the `Verifyr` folder (where `index.html` is located)
- Make sure all your assets (images, CSS, JS) are in the correct relative paths
- Your Supabase API calls will work from localhost
- Live Server automatically refreshes the page when you save changes to files
- To stop the server, click the "Go Live" button in the VS Code status bar or close the browser tab

## 🔧 Troubleshooting

**Live Server keeps refreshing constantly?**
- This is often caused by OneDrive or other file sync services triggering file system events
- A `.vscode/settings.json` file has been created in the project root to fix this issue
- The settings exclude unnecessary files from watching and reduce refresh sensitivity
- **Alternative:** Use the PowerShell server script instead (see below)

**Images not loading?**
- Check that the `images/` folder is in the same directory as `index.html`
- Verify the paths in your HTML match the actual file structure

**CORS errors with Supabase?**
- Supabase works perfectly from localhost
- If you encounter issues, check your Supabase project settings and ensure your API keys are correct
- Make sure your Supabase project allows requests from `localhost` and `127.0.0.1`

### Alternative: PowerShell Server (No Auto-Refresh Issues)

If Live Server continues to cause problems, use the included PowerShell server:

1. Open PowerShell in the `Verifyr` folder
2. Run: `.\start-server.ps1`
3. Open `http://localhost:8000` in your browser
4. This server won't auto-refresh (manual refresh required)
