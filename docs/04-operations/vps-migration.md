# Complete VPS Migration Plan - Ubuntu 22.04 LTS

## Overview

Migrate Verifyr (FastAPI backend + frontend) from local development to Hostinger VPS with Ubuntu 22.04 LTS.

**Goal:** Deploy both frontend and backend on single VPS, accessible via your domain.

**Timeline:** 4-5 hours one-time setup

**Cost:** ~$7-12/month (Hostinger VPS 1 or 2)

---

## Architecture After Migration

```
https://yourdomain.com (Hostinger VPS)
├── Nginx (Web Server & Reverse Proxy)
│   ├── Port 80 → Redirect to 443 (HTTPS)
│   └── Port 443 (HTTPS)
│       ├── / → Frontend (Static Files)
│       ├── /quiz/score → Backend API
│       ├── /query → Backend API
│       └── /config → Backend API
│
├── Frontend (Static Files in /var/www/verifyr/frontend)
│   ├── index.html
│   ├── chat.html
│   ├── quiz/
│   └── design-system/
│
└── Backend (FastAPI running on localhost:8000)
    ├── Systemd Service (auto-restart)
    ├── Virtual Environment
    └── Qdrant Database
```

---

## Prerequisites

### What You Need:
- ✅ Hostinger VPS ordered (VPS 1 or 2)
- ✅ Ubuntu 22.04 LTS selected
- ✅ Domain name (already have from Hostinger Premium)
- ✅ SSH client (Windows: use PowerShell or Windows Terminal)
- ✅ Your project files ready to upload
- ✅ API keys (Anthropic, Supabase)

### Files to Prepare on Local Machine:
1. Backend folder (`backend/`)
2. Frontend folder (`frontend/`)
3. Data folder (`data/`)
4. `.env` file with your API keys

---

## Phase 1: VPS Initial Setup (30 minutes)

### Step 1.1: Order Hostinger VPS

1. Go to Hostinger VPS page
2. Choose plan:
   - **VPS 1** ($7/month) - Good for starting, 1 vCPU, 4GB RAM
   - **VPS 2** ($10/month) - Better, 2 vCPU, 8GB RAM (recommended)
3. Select **Operating System**
4. Choose **Ubuntu 22.04 LTS (64-bit)**
5. Complete payment
6. Wait for setup email (5-10 minutes)

### Step 1.2: Get VPS Access Details

**From Hostinger Email or Dashboard:**
```
IP Address: 123.456.789.10
SSH Port: 22
Root Password: [provided by Hostinger]
```

**Save these details somewhere safe!**

### Step 1.3: First SSH Connection

**On Windows (PowerShell):**
```powershell
# Connect to VPS
ssh root@123.456.789.10

# Type "yes" when asked about fingerprint
# Enter the root password from email
```

**You're now in your VPS!** You'll see:
```bash
root@vps-123456:~#
```

### Step 1.4: Update System

```bash
# Update package lists
apt update

# Upgrade all packages (this may take 5-10 minutes)
apt upgrade -y

# Install essential tools
apt install -y curl wget git nano ufw
```

**What this does:**
- `apt update` - Gets latest package information
- `apt upgrade -y` - Installs updates (the `-y` auto-confirms)
- Installs tools we'll need later

---

## Phase 2: Security Configuration (30 minutes)

### Step 2.1: Create Non-Root User

**Why:** Never run applications as root (security best practice)

```bash
# Create new user called "verifyr"
adduser verifyr

# You'll be asked for:
# - Password: [choose strong password]
# - Full Name: [press Enter to skip]
# - Other fields: [press Enter to skip all]

# Add user to sudo group (allows running admin commands)
usermod -aG sudo verifyr

# Test: Switch to new user
su - verifyr

# You should now see:
verifyr@vps-123456:~$

# Exit back to root for now
exit
```

### Step 2.2: Configure Firewall

```bash
# Allow SSH (IMPORTANT: do this first or you'll lock yourself out!)
ufw allow 22/tcp

# Allow HTTP (port 80)
ufw allow 80/tcp

# Allow HTTPS (port 443)
ufw allow 443/tcp

# Enable firewall
ufw enable

# Type "y" and press Enter to confirm

# Check status
ufw status

# You should see:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

### Step 2.3: Setup SSH Key Authentication (Recommended)

**On your local Windows machine (new PowerShell window):**

```powershell
# Check if you have SSH key
ls ~/.ssh/id_rsa.pub

# If not found, create one:
ssh-keygen -t rsa -b 4096

# Press Enter 3 times (accept defaults, no passphrase for simplicity)

# Copy your public key
cat ~/.ssh/id_rsa.pub
```

**Copy the output (starts with `ssh-rsa ...`)**

**Back on VPS (as verifyr user):**

```bash
# Switch to verifyr user
su - verifyr

# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create authorized_keys file
nano ~/.ssh/authorized_keys

# Paste your public key (Ctrl+Shift+V)
# Save: Ctrl+X, then Y, then Enter

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys

# Exit to test
exit
```

**Test SSH key login (from local machine):**
```powershell
ssh verifyr@123.456.789.10
# Should login WITHOUT password!
```

---

## Phase 3: Install Dependencies (45 minutes)

### Step 3.1: Install Python 3.11

```bash
# Install Python and pip
sudo apt install -y python3.11 python3.11-venv python3-pip

# Verify installation
python3.11 --version
# Should show: Python 3.11.x

# Install build tools (needed for some Python packages)
sudo apt install -y build-essential python3.11-dev
```

### Step 3.2: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx

# Enable auto-start on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
# Should show "active (running)" in green

# Test: Visit http://123.456.789.10 in browser
# You should see "Welcome to nginx!" page
```

### Step 3.3: Install SSL Certificate Tool

```bash
# Install Certbot (Let's Encrypt SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## Phase 4: Upload Project Files (30 minutes)

### Step 4.1: Create Project Directory

```bash
# Create web directory
sudo mkdir -p /var/www/verifyr

# Set ownership to verifyr user
sudo chown -R verifyr:verifyr /var/www/verifyr

# Navigate to it
cd /var/www/verifyr
```

### Step 4.2: Upload Files from Local Machine

**Option A: Using SCP (from local Windows PowerShell)**

```powershell
# Navigate to your project folder
cd "C:\Users\prabh\OneDrive\Git_PM\verifyr - rag"

# Upload backend folder
scp -r backend verifyr@123.456.789.10:/var/www/verifyr/

# Upload frontend folder
scp -r frontend verifyr@123.456.789.10:/var/www/verifyr/

# Upload data folder
scp -r data verifyr@123.456.789.10:/var/www/verifyr/

# Upload .env file
scp .env verifyr@123.456.789.10:/var/www/verifyr/
```

**Option B: Using Git (Alternative)**

```bash
# On VPS
cd /var/www/verifyr

# If your project is on GitHub:
git clone https://github.com/yourusername/verifyr.git .

# Then manually upload .env file (has secrets, don't commit to git)
```

**Option C: Using FileZilla (GUI)**

1. Download FileZilla: https://filezilla-project.org/
2. Connect:
   - Host: `sftp://123.456.789.10`
   - Username: `verifyr`
   - Password: [your verifyr user password]
   - Port: `22`
3. Drag and drop folders to `/var/www/verifyr/`

### Step 4.3: Verify Upload

```bash
# On VPS, check files
cd /var/www/verifyr
ls -la

# You should see:
# backend/
# frontend/
# data/
# .env
```

---

## Phase 5: Setup Backend (45 minutes)

### Step 5.1: Create Virtual Environment

```bash
cd /var/www/verifyr

# Create virtual environment
python3.11 -m venv venv

# Activate it
source venv/bin/activate

# You should see (venv) in prompt:
# (venv) verifyr@vps-123456:/var/www/verifyr$
```

### Step 5.2: Install Python Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install fastapi uvicorn python-multipart anthropic qdrant-client sentence-transformers supabase python-jose passlib python-dotenv
```

**If you have requirements.txt:**
```bash
pip install -r backend/requirements.txt
```

### Step 5.3: Setup Environment Variables

```bash
# Edit .env file
nano .env

# Add your keys (replace with actual values):
ANTHROPIC_API_KEY=sk-ant-xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx
SUPABASE_JWT_SECRET=xxxxx

# Save: Ctrl+X, Y, Enter
```

### Step 5.4: Test Backend Manually

```bash
# Try running backend
cd /var/www/verifyr
source venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

**Test from browser (new tab):**
- Visit: `http://123.456.789.10:8000/docs`
- You should see FastAPI documentation page

**If it works, stop it:**
- Press `Ctrl+C`

**If you get errors about missing data/Qdrant:**
```bash
# You may need to run indexing first
cd /var/www/verifyr
source venv/bin/activate
python backend/indexing/vector_store.py
```

---

## Phase 6: Create Systemd Service (30 minutes)

### Step 6.1: Create Service File

```bash
# Create systemd service
sudo nano /etc/systemd/system/verifyr-backend.service
```

**Paste this content:**
```ini
[Unit]
Description=Verifyr FastAPI Backend
After=network.target

[Service]
Type=simple
User=verifyr
Group=verifyr
WorkingDirectory=/var/www/verifyr
Environment="PATH=/var/www/verifyr/venv/bin"
EnvironmentFile=/var/www/verifyr/.env
ExecStart=/var/www/verifyr/venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=10

StandardOutput=append:/var/log/verifyr-backend.log
StandardError=append:/var/log/verifyr-backend-error.log

[Install]
WantedBy=multi-user.target
```

**Save: Ctrl+X, Y, Enter**

**What this does:**
- Runs FastAPI backend automatically
- Restarts if it crashes
- Starts on server boot
- Logs to `/var/log/verifyr-backend.log`

### Step 6.2: Enable and Start Service

```bash
# Create log files
sudo touch /var/log/verifyr-backend.log
sudo touch /var/log/verifyr-backend-error.log
sudo chown verifyr:verifyr /var/log/verifyr-backend*.log

# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable verifyr-backend

# Start service
sudo systemctl start verifyr-backend

# Check status
sudo systemctl status verifyr-backend

# Should show "active (running)" in green
```

### Step 6.3: Monitor Logs

```bash
# View live logs
sudo tail -f /var/log/verifyr-backend.log

# Press Ctrl+C to exit

# Check for errors
sudo tail -f /var/log/verifyr-backend-error.log
```

---

## Phase 7: Configure Nginx (45 minutes)

### Step 7.1: Create Nginx Configuration

```bash
# Create site config
sudo nano /etc/nginx/sites-available/verifyr
```

**Paste this configuration:**
```nginx
# Verifyr Nginx Configuration

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Allow Certbot verification
    location /.well-known/acme-challenge/ {
        root /var/www/verifyr/frontend;
    }

    # Redirect everything else to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root directory for frontend
    root /var/www/verifyr/frontend;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API endpoints - proxy to backend
    location ~ ^/(query|products|quiz|config|health|conversations|admin) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed for chat)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts for long-running requests (Claude API)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve static frontend files
    location / {
        try_files $uri $uri/ =404;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**IMPORTANT:** Replace `yourdomain.com` with your actual domain!

**Save: Ctrl+X, Y, Enter**

### Step 7.2: Enable Site

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/verifyr /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Should show: "syntax is ok" and "test is successful"

# If OK, reload Nginx
sudo systemctl reload nginx
```

---

## Phase 8: Configure Domain (15 minutes)

### Step 8.1: Point Domain to VPS

**In Hostinger Dashboard:**

1. Go to **Domains** section
2. Click your domain name
3. Go to **DNS / Name Servers**
4. Update A records:

```
Type    Name    Value               TTL
A       @       123.456.789.10      3600
A       www     123.456.789.10      3600
```

**Replace `123.456.789.10` with your VPS IP!**

5. Save changes
6. Wait 5-60 minutes for DNS propagation

### Step 8.2: Verify DNS

```bash
# Check if domain points to your VPS
ping yourdomain.com

# Should show your VPS IP address
```

**Or use online tool:** https://dnschecker.org

---

## Phase 9: Setup SSL Certificate (15 minutes)

### Step 9.1: Get Free SSL Certificate

```bash
# Run Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# 1. Enter email address (for renewal notifications)
# 2. Agree to terms: Y
# 3. Share email with EFF: N (optional)
# 4. Redirect HTTP to HTTPS: 2 (Yes, recommended)
```

**Certbot will:**
- Generate SSL certificate
- Update Nginx configuration automatically
- Setup auto-renewal

### Step 9.2: Test SSL

**Visit your site:**
- `https://yourdomain.com`
- Should show secure lock icon 🔒

**Test SSL configuration:**
- Visit: https://www.ssllabs.com/ssltest/
- Enter your domain
- Should get **A** or **A+** rating

### Step 9.3: Setup Auto-Renewal

```bash
# Certbot auto-renewal is already configured
# Test renewal process:
sudo certbot renew --dry-run

# Should show: "Congratulations, all simulated renewals succeeded"
```

**Certificates auto-renew every 60 days!**

---

## Phase 10: Update Frontend Configuration (15 minutes)

### Step 10.1: Create Frontend Config

**On VPS:**
```bash
# Create config file
nano /var/www/verifyr/frontend/config.js
```

**Add this content:**
```javascript
// Auto-detect environment and set API URL
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;

    // Development (local)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // Production (VPS) - same domain, so use relative paths
    // Or use full domain for clarity
    return '';  // Empty string means use same domain (relative paths work)

    // Alternative: return 'https://yourdomain.com';
};

window.VERIFYR_CONFIG = {
    API_BASE_URL: getApiBaseUrl()
};

console.log('🔧 API Base URL:', window.VERIFYR_CONFIG.API_BASE_URL);
```

**Save: Ctrl+X, Y, Enter**

### Step 10.2: Update HTML Files

**For each HTML file that loads JavaScript:**

```bash
# Edit index.html
nano /var/www/verifyr/frontend/index.html
```

**Add BEFORE other script tags:**
```html
<!-- Config must load first -->
<script src="/config.js"></script>
```

**Repeat for:**
- `/var/www/verifyr/frontend/chat.html`
- `/var/www/verifyr/frontend/quiz/category.html`
- `/var/www/verifyr/frontend/quiz/use-case.html`
- `/var/www/verifyr/frontend/quiz/features.html`
- `/var/www/verifyr/frontend/quiz/results.html`

### Step 10.3: Update JavaScript Files (If Using Absolute URLs)

**Since backend and frontend are on same domain, you can use relative paths!**

**No changes needed if using:**
```javascript
fetch('/quiz/score', ...)  // ✅ Works as-is
fetch('/query', ...)       // ✅ Works as-is
```

**But if you have hardcoded `http://localhost:8000`:**

```bash
# Update app.js
nano /var/www/verifyr/frontend/app.js

# Change:
const API_BASE_URL = 'http://localhost:8000';

# To:
const API_BASE_URL = window.VERIFYR_CONFIG?.API_BASE_URL || '';
```

**Repeat for any files with hardcoded localhost URLs.**

---

## Phase 11: Testing (30 minutes)

### Test 11.1: Backend API

```bash
# Test health endpoint
curl https://yourdomain.com/health

# Should return: {"status":"healthy"}

# Test from browser:
# Visit: https://yourdomain.com/docs
# Should see FastAPI documentation
```

### Test 11.2: Frontend

**Visit: `https://yourdomain.com`**

- ✅ Landing page loads
- ✅ CSS and images load
- ✅ Navigation works

### Test 11.3: Quiz Flow

1. ✅ Click "Try Quiz"
2. ✅ Category page loads with images
3. ✅ Select category, click Next
4. ✅ Use-case page loads
5. ✅ Select use-cases, click Next
6. ✅ Features page loads
7. ✅ Select features (max 5)
8. ✅ Click "Quiz abschließen"
9. ✅ Results page loads with products
10. ✅ Auth modal appears (if not logged in)

### Test 11.4: Chat

1. ✅ Click Chat icon
2. ✅ Chat page loads
3. ✅ Auth modal appears (if not logged in)
4. ✅ Login works
5. ✅ Send message
6. ✅ Response received

### Test 11.5: Check Logs

```bash
# Backend logs
sudo tail -f /var/log/verifyr-backend.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Phase 12: Monitoring & Maintenance

### Step 12.1: Check Service Status

```bash
# Check backend service
sudo systemctl status verifyr-backend

# Check Nginx
sudo systemctl status nginx

# View resource usage
htop  # Install with: sudo apt install htop
```

### Step 12.2: Restart Services

```bash
# Restart backend (after code changes)
sudo systemctl restart verifyr-backend

# Restart Nginx (after config changes)
sudo systemctl restart nginx

# View logs after restart
sudo journalctl -u verifyr-backend -f
```

### Step 12.3: Update Code

**When you make changes locally:**

```powershell
# From local machine, upload changed files
scp -r frontend verifyr@123.456.789.10:/var/www/verifyr/

# Or for backend:
scp -r backend verifyr@123.456.789.10:/var/www/verifyr/
```

**Then on VPS:**
```bash
# Restart backend to load changes
sudo systemctl restart verifyr-backend

# Frontend changes load immediately (no restart needed)
```

### Step 12.4: Monitor Disk Space

```bash
# Check disk usage
df -h

# Should have plenty free on /dev/vda1 or similar

# Check specific folder size
du -sh /var/www/verifyr
```

### Step 12.5: Setup Automatic Backups (Optional)

```bash
# Create backup script
nano ~/backup.sh
```

**Add:**
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

**Make executable:**
```bash
chmod +x ~/backup.sh
```

**Run manually:**
```bash
~/backup.sh
```

**Or setup cron (daily at 2 AM):**
```bash
crontab -e

# Add this line:
0 2 * * * /home/verifyr/backup.sh >> /home/verifyr/backup.log 2>&1
```

---

## Troubleshooting

### Issue: Backend not starting

```bash
# Check logs
sudo journalctl -u verifyr-backend -n 50

# Common fixes:
# 1. Check .env file exists
ls -la /var/www/verifyr/.env

# 2. Check permissions
sudo chown -R verifyr:verifyr /var/www/verifyr

# 3. Test manually
cd /var/www/verifyr
source venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### Issue: Nginx 502 Bad Gateway

```bash
# Backend probably not running
sudo systemctl status verifyr-backend

# Restart it
sudo systemctl restart verifyr-backend

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Issue: SSL certificate error

```bash
# Re-run Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Force renewal
sudo certbot renew --force-renewal
```

### Issue: Domain not resolving

```bash
# Check DNS
nslookup yourdomain.com

# Wait for DNS propagation (can take up to 48 hours, usually 5-60 minutes)
```

### Issue: Quiz submission fails

```bash
# Check backend logs
sudo tail -f /var/log/verifyr-backend.log

# Check if Qdrant database exists
ls -la /var/www/verifyr/data/qdrant_storage

# May need to run indexing
cd /var/www/verifyr
source venv/bin/activate
python backend/indexing/vector_store.py
```

---

## Performance Optimization (Optional)

### Enable HTTP/2

**Already enabled in Nginx config!**

### Add Redis Caching (Advanced)

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Then update backend to use Redis for caching (requires code changes).

### Optimize Qdrant

```bash
# Give Qdrant more resources if needed
# Edit systemd service to add environment variables
sudo nano /etc/systemd/system/verifyr-backend.service

# Add under [Service]:
Environment="QDRANT__STORAGE__MMAP_THRESHOLD_KB=10240"
```

---

## Security Hardening (Recommended)

### Fail2Ban (Prevent Brute Force)

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Enable for SSH
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Auto Security Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Enable
sudo dpkg-reconfigure -plow unattended-upgrades
# Select "Yes"
```

### Disable Root SSH Login

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Find and change:
PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

---

## Cost Summary

### One-Time Costs:
- ✅ Domain: Already have from Hostinger Premium
- ✅ SSL Certificate: FREE (Let's Encrypt)
- ✅ Setup: FREE (DIY)

### Monthly Costs:
- **Hostinger VPS 1**: $7/month
- **Hostinger VPS 2**: $10/month (recommended)
- **Total**: $7-10/month

### Savings vs. Alternatives:
- Railway paid: $5/month + Premium $3/month = $8/month
- cPanel VPS: $10/month + $15/month panel = $25/month
- **Your setup**: $10/month total ✅

---

## Final Checklist

### Before Going Live:

- [ ] VPS ordered and accessible via SSH
- [ ] Domain DNS points to VPS IP
- [ ] Backend service running (`sudo systemctl status verifyr-backend`)
- [ ] Nginx running (`sudo systemctl status nginx`)
- [ ] SSL certificate installed (green lock icon)
- [ ] All frontend files uploaded
- [ ] config.js created and loaded
- [ ] Quiz flow works end-to-end
- [ ] Chat works with authentication
- [ ] API keys set in .env file
- [ ] Firewall configured (ufw status)
- [ ] Backups configured (optional)
- [ ] Monitoring setup (optional)

### After Going Live:

- [ ] Test from multiple devices
- [ ] Test on mobile
- [ ] Share with friends for feedback
- [ ] Monitor logs for errors
- [ ] Check SSL rating (ssllabs.com)
- [ ] Setup Google Analytics (optional)
- [ ] Submit to Google Search Console (optional)

---

## Next Steps After Migration

1. **Monitor for 1 week** - Check logs daily, fix any issues
2. **Optimize performance** - Add caching if needed
3. **Add analytics** - Track user behavior
4. **Setup backups** - Automate daily backups
5. **Plan scaling** - If traffic grows, upgrade VPS

---

## Support Resources

### If You Get Stuck:

1. **Check logs first:**
   ```bash
   sudo journalctl -u verifyr-backend -n 100
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Hostinger Support:**
   - 24/7 live chat
   - Knowledge base: hostinger.com/tutorials

3. **Community Help:**
   - FastAPI: fastapi.tiangolo.com
   - Nginx: nginx.org/en/docs/
   - Ubuntu: askubuntu.com

4. **Quick Fixes:**
   - Restart everything: `sudo systemctl restart verifyr-backend nginx`
   - Check disk space: `df -h`
   - Check memory: `free -h`

---

## Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | VPS Setup | 30 min |
| 2 | Security | 30 min |
| 3 | Install Dependencies | 45 min |
| 4 | Upload Files | 30 min |
| 5 | Setup Backend | 45 min |
| 6 | Systemd Service | 30 min |
| 7 | Configure Nginx | 45 min |
| 8 | Domain DNS | 15 min |
| 9 | SSL Certificate | 15 min |
| 10 | Frontend Config | 15 min |
| 11 | Testing | 30 min |
| **TOTAL** | | **4.5 hours** |

**Realistic estimate with breaks:** 5-6 hours over 1-2 days

---

## Success Criteria

✅ You'll know it's working when:
1. `https://yourdomain.com` loads with green lock
2. Quiz completes and shows results
3. Chat sends messages and gets responses
4. Backend logs show no errors
5. Everything works on mobile
6. Page load time < 3 seconds

**You're done! Your app is live! 🎉**
