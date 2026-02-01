# VPS Server Management & Update Workflow

**For:** Verifyr RAG Application on Hostinger VPS

**Last Updated:** 2026-01-31

---

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Quick Commands Reference](#quick-commands-reference)
3. [Update Procedures](#update-procedures)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring & Logs](#monitoring--logs)
6. [Backup & Recovery](#backup--recovery)

---

## Development Workflow

### 🔄 Complete Update Flow: Local → GitHub → VPS

```
Local Changes → Git Commit → GitHub Push → VPS Pull → Restart Services → Test
```

---

## Step-by-Step Update Guide

### Step 1: Make Changes Locally

Work on your code in:
```
C:\Users\prabh\OneDrive\Git_PM\verifyr - rag\
```

Make changes to:
- `backend/` files (Python code)
- `frontend/` files (HTML, CSS, JS)
- Configuration files

---

### Step 2: Test Locally

```powershell
# On your local Windows machine
.\manage_server.ps1 -Action restart

# Test at http://localhost:8000
```

---

### Step 3: Commit & Push to GitHub

```powershell
# In your project directory
git add .
git commit -m "Description of changes"
git push origin main
```

**IMPORTANT:** Never commit:
- `.env` (API keys)
- SSL certificates
- `data/qdrant_storage/`
- `venv/`

---

### Step 4: Update VPS

#### Connect to VPS
- Open **Hostinger Dashboard** (hpanel.hostinger.com)
- Go to your VPS
- Click **Browser Terminal**

#### Pull Latest Code

**IMPORTANT:** Always switch to verifyr user before running git commands to avoid permission issues.

```bash
# Switch to verifyr user (if logged in as root)
su - verifyr

# Navigate to project
cd /var/www/verifyr

# Pull latest changes
git pull origin main

# Verify update
git log --oneline -1

# Exit back to root
exit
```

---

### Step 5: Restart Appropriate Services

#### Backend Code Changed?

```bash
# Restart backend service
systemctl restart verifyr-backend

# Check status
systemctl status verifyr-backend

# Monitor logs
tail -f /var/log/verifyr-backend.log
```

#### Frontend Code Changed?

```bash
# No restart needed!
# Nginx serves static files directly
# Just refresh browser (Ctrl+F5)
```

#### Nginx Config Changed?

```bash
# Test config first
nginx -t

# If OK, reload
systemctl reload nginx
```

#### Environment Variables Changed?

```bash
# Update .env manually (not in git!)
nano /var/www/verifyr/.env
# Make changes, save (Ctrl+X, Y, Enter)

# Restart backend
systemctl restart verifyr-backend
```

#### New Python Packages Added?

```bash
# Activate venv
cd /var/www/verifyr
source venv/bin/activate

# Install new packages
pip install -r requirements.txt

# Deactivate
deactivate

# Restart backend
systemctl restart verifyr-backend
```

---

### Step 6: Verify Changes

**Test in browser:**
```
https://verifyr.de
```

**Check backend health:**
```
https://verifyr.de/health
```

**Should return:**
```json
{"status":"healthy","indexes_loaded":true}
```

---

## Quick Commands Reference

### Server Management

```bash
# VPS Info
VPS IP: 76.13.135.117
Domain: verifyr.de
Project Path: /var/www/verifyr
User: verifyr
```

### Service Commands

```bash
# Backend Service
systemctl status verifyr-backend      # Check status
systemctl start verifyr-backend       # Start
systemctl stop verifyr-backend        # Stop
systemctl restart verifyr-backend     # Restart
systemctl enable verifyr-backend      # Enable auto-start

# Nginx
systemctl status nginx                # Check status
systemctl restart nginx               # Restart
systemctl reload nginx                # Reload config (no downtime)
nginx -t                             # Test config

# View Service Logs
journalctl -u verifyr-backend -f     # Live backend logs
journalctl -u nginx -f               # Live nginx logs
```

### Log Files

```bash
# Backend Logs
tail -f /var/log/verifyr-backend.log          # Live log
tail -f /var/log/verifyr-backend-error.log    # Error log
tail -100 /var/log/verifyr-backend.log        # Last 100 lines

# Nginx Logs
tail -f /var/log/nginx/access.log             # Access log
tail -f /var/log/nginx/error.log              # Error log
```

### Git Operations

**IMPORTANT:** Always run git commands as verifyr user to avoid permission errors.

```bash
# Switch to verifyr user first
su - verifyr

# Update from GitHub
cd /var/www/verifyr
git pull origin main

# Check status
git status

# View recent commits
git log --oneline -10

# Discard local changes
git checkout .

# Handle conflicts
git stash          # Save local changes
git pull           # Pull from GitHub
git stash pop      # Reapply local changes

# Exit back to root when done
exit
```

---

## Update Procedures

### Update Backend Code

**Example:** Fixed bug in `backend/retrieval/hybrid_search.py`

**Local Machine:**
```powershell
# Make changes, test locally
git add backend/retrieval/hybrid_search.py
git commit -m "Fix: Improved hybrid search ranking"
git push origin main
```

**VPS:**
```bash
cd /var/www/verifyr
git pull origin main
systemctl restart verifyr-backend
systemctl status verifyr-backend
tail -20 /var/log/verifyr-backend.log
```

---

### Update Frontend Code

**Example:** Updated `frontend/styles.css`

**Local Machine:**
```powershell
git add frontend/styles.css
git commit -m "Style: Updated landing page colors"
git push origin main
```

**VPS:**
```bash
cd /var/www/verifyr
git pull origin main
# No restart needed! Just refresh browser
```

---

### Update Dependencies

**Example:** Added new Python package

**Local Machine:**
```powershell
pip install new-package
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Deps: Added new-package"
git push origin main
```

**VPS:**
```bash
cd /var/www/verifyr
git pull origin main

# Install new Python packages
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Restart backend
systemctl restart verifyr-backend
systemctl status verifyr-backend
```

**⚠️ Important - System-Level Dependencies:**

Some Python packages require **system binaries** to be installed separately:

| Python Package | Requires System Binary | Install Command |
|---------------|------------------------|-----------------|
| `pytesseract` | Tesseract OCR | `apt install -y tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng` |
| `opencv-python` | OpenCV libraries | `apt install -y libopencv-dev python3-opencv` |
| `pillow` | Image libraries | `apt install -y libjpeg-dev zlib1g-dev` |

**Example - Installing Tesseract:**
```bash
# Install system binary
apt update
apt install -y tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng

# Verify
tesseract --version

# Then install Python wrapper
su - verifyr
cd /var/www/verifyr
source venv/bin/activate
pip install pytesseract
deactivate
exit
```

---

### Update Environment Variables

**Example:** Changed API key

**VPS Only:**
```bash
nano /var/www/verifyr/.env
# Edit values
# Save: Ctrl+X, Y, Enter

# Restart backend
systemctl restart verifyr-backend
```

**NEVER commit .env to GitHub!**

---

### Reindex Data (After Adding PDFs)

**Example:** Added new product PDFs to `data/raw/`

**VPS:**
```bash
cd /var/www/verifyr

# Stop backend (releases Qdrant locks)
systemctl stop verifyr-backend

# Activate venv
source venv/bin/activate

# Run indexing pipeline
python backend/ingestion/pdf_processor.py
python backend/ingestion/chunker.py
python backend/indexing/vector_store.py
python backend/indexing/bm25_index.py

# Deactivate venv
deactivate

# Start backend
systemctl start verifyr-backend
systemctl status verifyr-backend
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check error logs
tail -50 /var/log/verifyr-backend-error.log

# Check service status
systemctl status verifyr-backend

# Check if port is in use
netstat -tulpn | grep 8000

# Try running manually to see errors
cd /var/www/verifyr
source venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
# Press Ctrl+C when done
deactivate
```

**Common Issues:**
- **Permission denied:** Run `chown -R verifyr:verifyr /var/www/verifyr`
- **Module not found:** Run `pip install -r requirements.txt`
- **Port already in use:** Kill existing process or restart VPS

---

### Nginx Errors

```bash
# Check Nginx error log
tail -50 /var/log/nginx/error.log

# Test Nginx config
nginx -t

# Check if Nginx is running
systemctl status nginx

# Restart Nginx
systemctl restart nginx
```

**Common Issues:**
- **502 Bad Gateway:** Backend not running (check `systemctl status verifyr-backend`)
- **404 Not Found:** Check Nginx config and file paths
- **Permission denied:** Check file ownership

---

### Site Not Loading

```bash
# Check DNS resolution
nslookup verifyr.de

# Test from VPS
curl http://localhost:8000/health     # Backend directly
curl http://verifyr.de/health         # Through domain

# Check firewall
ufw status
```

---

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew

# Test renewal
certbot renew --dry-run
```

---

### Qdrant Database Errors

```bash
# Remove and recreate Qdrant storage
systemctl stop verifyr-backend
rm -rf /var/www/verifyr/data/qdrant_storage

# Recreate as verifyr user
su - verifyr
cd /var/www/verifyr
source venv/bin/activate
python backend/indexing/vector_store.py
deactivate
exit

# Restart service
systemctl start verifyr-backend
```

---

### Authentication Issues (Chat/Admin Login Problems)

**Symptom:** Login redirects but immediately logs out, or page flickers between auth.html and chat/admin page.

**Cause:** Frontend JavaScript trying to call `localhost:8000` instead of production domain.

**Check browser console (F12):**
```
Access to fetch at 'http://localhost:8000/config' from origin 'https://verifyr.de'
has been blocked by CORS policy
```

**Solution:**

1. **Verify VPS has latest code:**
```bash
# Switch to verifyr user
su - verifyr

cd /var/www/verifyr
git log --oneline -1
# Should show: "Fix: Dynamic API_BASE_URL..."

# If not, pull latest
git pull origin main

# Verify fix is present
grep -A 3 "const API_BASE_URL" frontend/app.js
# Should show dynamic URL code, NOT hardcoded localhost:8000

exit  # Back to root
```

2. **Clear browser cache:**
   - Press **Ctrl + Shift + R** (hard refresh)
   - Or **F12** → Right-click refresh → "Empty Cache and Hard Reload"
   - Or **Ctrl + Shift + Delete** → Clear cached files

3. **Verify fix in browser console:**
```javascript
// Should show current domain, NOT localhost
console.log(window.location.origin);
fetch('/config').then(r => r.json()).then(console.log);
```

**Expected:** Config endpoint returns Supabase credentials without CORS errors.

---

### Git Permission Errors on VPS

**Symptom:**
```
fatal: detected dubious ownership in repository at '/var/www/verifyr'
```

**Cause:** Running git commands as root user, but directory is owned by verifyr user.

**Solution - Switch to verifyr user (Recommended):**

```bash
# As root, switch to verifyr user
su - verifyr

# Navigate to project
cd /var/www/verifyr

# Now run git commands
git pull origin main
git log --oneline -5

# Exit back to root
exit
```

**Alternative - Add safe directory:**
```bash
# As root
git config --global --add safe.directory /var/www/verifyr

# Then run git commands
cd /var/www/verifyr
git pull origin main
```

**Best Practice:** Always use `su - verifyr` before git operations to maintain proper file ownership.

---

### Browser Cache Issues

**Symptom:** Code updated on VPS, but browser still shows old version or old JavaScript behavior.

**Solutions:**

**Method 1: Hard Refresh**
- **Ctrl + Shift + R** (Windows/Linux)
- **Ctrl + F5** (Windows)
- **Cmd + Shift + R** (Mac)

**Method 2: DevTools Cache Clear**
1. Press **F12** (open DevTools)
2. Right-click the **refresh button**
3. Select **"Empty Cache and Hard Reload"**

**Method 3: Clear Browser Data**
1. **Ctrl + Shift + Delete**
2. Select "Cached images and files"
3. Time range: "Last hour"
4. Click "Clear data"

**Method 4: Disable Cache (for testing)**
1. **F12** → **Network** tab
2. Check **"Disable cache"**
3. Keep DevTools open while testing

**Verify cache is cleared:**
```javascript
// Open console (F12) and check file versions
performance.getEntriesByType("resource")
  .filter(e => e.name.includes('.js'))
  .forEach(e => console.log(e.name, new Date(e.fetchStart)));
```

---

### Tesseract OCR Not Working

**Symptom:**
```python
TesseractNotFoundError: tesseract is not installed or it's not in your PATH
```

Or PDF processing fails with OCR-related errors.

**Cause:** `pytesseract` in requirements.txt is only the Python wrapper. The actual **Tesseract OCR binary** must be installed separately on the system.

**Solution - Install Tesseract on VPS:**

```bash
# Update package list
apt update

# Install Tesseract OCR binary and language data
apt install -y tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng

# Verify installation
tesseract --version
# Should show: tesseract 4.x.x or 5.x.x

# Test OCR
tesseract --list-langs
# Should show: deu, eng, osd
```

**For German + English support:**
```bash
# Install additional language packs
apt install -y tesseract-ocr-deu tesseract-ocr-eng
```

**Verify Python can find it:**
```bash
su - verifyr
cd /var/www/verifyr
source venv/bin/activate

python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
# Should print version number without errors

deactivate
exit
```

**If still not found after installation:**
```bash
# Find Tesseract binary location
which tesseract

# Add to Python code (if needed)
# In your Python script:
# pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
```

**Common Issues:**
- **pytesseract installed, Tesseract not installed:** Run `apt install tesseract-ocr`
- **Wrong language pack:** Install language-specific packages (`tesseract-ocr-deu` for German)
- **Outdated version:** Update with `apt upgrade tesseract-ocr`

---

## Monitoring & Logs

### Check System Resources

```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU and processes
htop
# Press 'q' to exit

# Check backend memory usage
systemctl status verifyr-backend
```

### Monitor Logs in Real-Time

```bash
# Backend application logs
tail -f /var/log/verifyr-backend.log

# Backend errors
tail -f /var/log/verifyr-backend-error.log

# Nginx access logs
tail -f /var/log/nginx/access.log

# System logs
journalctl -f
```

### Check Service Health

```bash
# Backend health endpoint
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","indexes_loaded":true}

# Check what's running on ports
netstat -tulpn | grep LISTEN
```

---

## Backup & Recovery

### Manual Backup

```bash
# Create backup directory
mkdir -p /home/verifyr/backups

# Backup entire project
tar -czf /home/verifyr/backups/verifyr-backup-$(date +%Y%m%d).tar.gz /var/www/verifyr

# Backup .env file separately
cp /var/www/verifyr/.env /home/verifyr/backups/.env-$(date +%Y%m%d)

# List backups
ls -lh /home/verifyr/backups/
```

### Restore from Backup

```bash
# Stop services
systemctl stop verifyr-backend
systemctl stop nginx

# Extract backup
cd /var/www
tar -xzf /home/verifyr/backups/verifyr-backup-YYYYMMDD.tar.gz

# Fix permissions
chown -R verifyr:verifyr /var/www/verifyr

# Start services
systemctl start nginx
systemctl start verifyr-backend
```

### Automated Backup Script

Create `/home/verifyr/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/verifyr/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup project files
tar -czf $BACKUP_DIR/verifyr_$DATE.tar.gz /var/www/verifyr

# Keep only last 7 backups
ls -t $BACKUP_DIR/verifyr_*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: $DATE"
```

Make executable:
```bash
chmod +x /home/verifyr/backup.sh
```

Run manually:
```bash
/home/verifyr/backup.sh
```

Setup daily cron (optional):
```bash
crontab -e
# Add this line:
0 2 * * * /home/verifyr/backup.sh >> /home/verifyr/backup.log 2>&1
```

---

## SSL Certificate Management

### Certificate Auto-Renewal

Certbot automatically renews certificates. Check status:

```bash
# View certificate info
certbot certificates

# Test renewal (dry run)
certbot renew --dry-run

# Force renewal (if needed)
certbot renew --force-renewal
```

**Certificate expires:** May 1, 2026

**Auto-renewal:** Runs automatically 30 days before expiry

---

## Quick Checklist After Updates

After running `git pull`:

- [ ] **New Python packages?**
  - `pip install -r requirements.txt`
  - `systemctl restart verifyr-backend`

- [ ] **Backend code changed?**
  - `systemctl restart verifyr-backend`

- [ ] **Frontend changed?**
  - No action needed (just refresh browser)

- [ ] **Nginx config changed?**
  - `nginx -t`
  - `systemctl reload nginx`

- [ ] **Check logs for errors**
  - `tail -20 /var/log/verifyr-backend.log`

- [ ] **Test in browser**
  - Visit `https://verifyr.de/health`

---

## Git Workflow Best Practices

### Before Making Changes

```bash
# Always pull latest first
git pull origin main
```

### After Making Changes

```bash
# Check what changed
git status

# Add specific files (better than git add .)
git add backend/specific_file.py

# Or add all changes
git add .

# Commit with clear message
git commit -m "Type: Brief description

Longer explanation if needed"

# Push to GitHub
git push origin main
```

### Commit Message Format

```
Type: Brief description (max 50 chars)

- Detail 1
- Detail 2

Examples:
- Fix: Resolved Qdrant connection timeout
- Feature: Added product comparison endpoint
- Update: Improved chunk size to 1000 tokens
- Docs: Updated API documentation
```

---

## Security Best Practices

### Never Commit These to GitHub:

- ❌ `.env` (contains API keys)
- ❌ SSL certificates (`/etc/letsencrypt/`)
- ❌ Qdrant database (`data/qdrant_storage/`)
- ❌ Virtual environment (`venv/`)

### Keep .gitignore Updated:

```gitignore
# Verifyr .gitignore
.env
venv/
data/qdrant_storage/
data/processed/
__pycache__/
*.pyc
*.log
.DS_Store
```

### File Permissions

```bash
# Ensure correct ownership
chown -R verifyr:verifyr /var/www/verifyr

# .env should not be world-readable
chmod 600 /var/www/verifyr/.env
```

---

## VPS Access

### Connect via Hostinger Browser Terminal

1. Go to Hostinger Dashboard (hpanel.hostinger.com)
2. Click your VPS
3. Click "Browser Terminal"
4. You'll be logged in as root

### Useful Aliases (Optional)

Add to `/root/.bashrc` or `/home/verifyr/.bashrc`:

```bash
# Quick shortcuts
alias vlog='tail -f /var/log/verifyr-backend.log'
alias vrestart='systemctl restart verifyr-backend'
alias vstatus='systemctl status verifyr-backend'
alias vcd='cd /var/www/verifyr'
alias vpull='cd /var/www/verifyr && git pull origin main'
```

Reload:
```bash
source ~/.bashrc
```

---

## Monthly Maintenance Checklist

### First Week of Month:

- [ ] Check VPS disk space: `df -h`
- [ ] Check SSL certificate expiry: `certbot certificates`
- [ ] Review logs for errors: `tail -100 /var/log/verifyr-backend-error.log`
- [ ] Check service uptime: `systemctl status verifyr-backend`
- [ ] Test site: `https://verifyr.de/health`
- [ ] Create backup: `/home/verifyr/backup.sh`
- [ ] Review Hostinger invoice

---

## Emergency Procedures

### Site is Down - Quick Fix

```bash
# 1. Check backend
systemctl status verifyr-backend

# 2. If not running, restart
systemctl restart verifyr-backend

# 3. Check Nginx
systemctl status nginx

# 4. If not running, restart
systemctl restart nginx

# 5. Check logs
tail -50 /var/log/verifyr-backend-error.log

# 6. Test site
curl http://localhost:8000/health
```

### Complete System Restart

```bash
# Restart all services
systemctl restart nginx
systemctl restart verifyr-backend

# Or reboot entire VPS (last resort)
reboot
```

---

## Cost Tracking

### Current Costs:

- **VPS 1:** $7/month
- **Domain (verifyr.de):** ~$10-15/year
- **SSL Certificate:** FREE (Let's Encrypt)
- **Total:** ~$8-9/month

### Next Year:

- **Don't renew:** Web hosting (no longer needed)
- **Keep:** Domain registration + VPS

---

## Support Resources

### If You Get Stuck:

1. **Check logs first:**
   ```bash
   tail -100 /var/log/verifyr-backend-error.log
   journalctl -u verifyr-backend -n 100
   ```

2. **Hostinger Support:**
   - 24/7 live chat
   - Knowledge base: hostinger.com/tutorials

3. **Documentation:**
   - FastAPI: fastapi.tiangolo.com
   - Nginx: nginx.org/en/docs/
   - Ubuntu: askubuntu.com
   - Let's Encrypt: letsencrypt.org/docs/

4. **Quick Fixes:**
   - Restart everything: `systemctl restart verifyr-backend nginx`
   - Check disk space: `df -h`
   - Check memory: `free -h`

---

## VPS Info Summary

```
Server IP:       76.13.135.117
Domain:          verifyr.de
OS:              Ubuntu 24.04.3 LTS
Python:          3.12.3
Web Server:      Nginx
Backend:         FastAPI (localhost:8000)
SSL:             Let's Encrypt (auto-renews)
Project Path:    /var/www/verifyr
Service Name:    verifyr-backend.service
Backend User:    verifyr
```

---

## File Locations Reference

```
/var/www/verifyr/              # Main project directory
├── backend/                   # FastAPI application
├── frontend/                  # Static files (served by Nginx)
├── data/                      # Data files
│   ├── raw/                   # PDF source files
│   ├── processed/             # Chunks, BM25 index
│   └── qdrant_storage/        # Vector database
├── venv/                      # Python virtual environment
└── .env                       # Environment variables (API keys)

/etc/nginx/sites-available/verifyr    # Nginx config
/etc/systemd/system/verifyr-backend.service   # Systemd service

/var/log/verifyr-backend.log         # Application logs
/var/log/verifyr-backend-error.log   # Error logs
/var/log/nginx/access.log            # Nginx access logs
/var/log/nginx/error.log             # Nginx error logs

/etc/letsencrypt/live/verifyr.de/    # SSL certificates
```

---

**Last Updated:** 2026-01-31

**Questions?** Check logs first, then consult support resources above.

**Happy deploying!** 🚀
