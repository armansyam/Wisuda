# Wisuda Platform — Deployment Guide

**Version:** 1.0  
**Author:** Farah  
**Date:** 2026-07-02  
**Target:** Proxmox STB (Armbian + CasaOS) — 192.168.100.254

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    192.168.100.254                          │
├─────────────────────────────────────────────────────────────┤
│  Port 8081  │  Node.js API (PM2: wisuda-api)               │
│  Port 8089  │  Static: farah-brain.html, portfolio, inquiry │
│  Port 3001  │  Baileys WA Bridge (separate host .83)        │
├─────────────────────────────────────────────────────────────┤
│  Nginx (port 80) → Reverse proxy :8081 + static files       │
│  Cloudflare Tunnel → wisuda.ammang.my.id                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

```bash
# On 192.168.100.254 (Armbian)
apt update && apt install -y nodejs npm nginx sqlite3 git

# Node 20+
node --version  # v20.x.x
npm --version   # 10.x.x

# PM2 global
npm install -g pm2

# Directories
mkdir -p /DATA/AppData/wisuda-uploads/{contracts,quotations,payouts,portfolio,temp}
mkdir -p /DATA/backups
mkdir -p /var/log/wisuda
chown -R $USER:$USER /DATA/AppData /DATA/backups /var/log/wisuda
```

---

## 3. Environment Configuration

### `.env` (at `/root/wisuda-platform/.env`)

```env
# Database
DB_PATH=/DATA/AppData/wisuda.db

# Uploads
UPLOAD_PATH=/DATA/AppData/wisuda-uploads

# Server
PORT=8081
NODE_ENV=production
HOST=0.0.0.0

# Session
SESSION_SECRET=generate-with-openssl-rand-base64-32
SESSION_MAX_AGE=86400000  # 24 hours

# Timezone
TZ=Asia/Makassar

# WA Bridge (on 192.168.100.83:3001)
WA_BRIDGE_URL=http://192.168.100.83:3001
WA_BOT_PHONE=6285813999513
WA_ADMIN_PHONE=6282333333420

# File serving
PUBLIC_URL=https://wisuda.ammang.my.id
LOCAL_URL=http://192.168.100.254:8081

# Google Drive (optional)
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

---

## 4. PM2 Configuration

### `ecosystem.config.js` (at `/root/wisuda-platform/ecosystem.config.js`)

```js
module.exports = {
  apps: [
    {
      name: 'wisuda-api',
      script: 'src/main.js',
      cwd: '/root/wisuda-platform',
      env: {
        NODE_ENV: 'production',
        PORT: 8081,
        DB_PATH: '/DATA/AppData/wisuda.db',
        UPLOAD_PATH: '/DATA/AppData/wisuda-uploads'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/wisuda/api-error.log',
      out_file: '/var/log/wisuda/api-out.log',
      log_file: '/var/log/wisuda/api-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'wisuda-cron',
      script: 'src/services/cron.service.js',
      cwd: '/root/wisuda-platform',
      env: {
        NODE_ENV: 'production',
        DB_PATH: '/DATA/AppData/wisuda.db'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      error_file: '/var/log/wisuda/cron-error.log',
      out_file: '/var/log/wisuda/cron-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### PM2 Commands

```bash
cd /root/wisuda-platform
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Run the command it outputs

# Logs
pm2 logs wisuda-api
pm2 logs wisuda-cron

# Monitor
pm2 monit

# Restart
pm2 restart wisuda-api
pm2 restart wisuda-cron
```

---

## 5. Nginx Configuration

### `/etc/nginx/sites-available/wisuda`

```nginx
server {
    listen 80;
    server_name 192.168.100.254 wisuda.ammang.my.id;
    client_max_body_size 50M;

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Admin Dashboard (Vue SPA)
    location /admin/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Public Pages
    location /portfolio {
        alias /root/wisuda-platform/public/portfolio.html;
        try_files $uri $uri/ /portfolio.html;
    }

    location /inquiry {
        alias /root/wisuda-platform/public/inquiry.html;
        try_files $uri $uri/ /inquiry.html;
    }

    location /booking/ {
        alias /root/wisuda-platform/public/booking.html;
        try_files $uri $uri/ /booking.html;
    }

    # Static Assets
    location /assets/ {
        alias /root/wisuda-platform/public/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Uploads (protected - add auth in production)
    location /uploads/ {
        alias /DATA/AppData/wisuda-uploads/;
        internal;  # Only accessible via X-Accel-Redirect from app
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8081/health;
        access_log off;
    }

    # Farah Brain (port 8089)
    location /farah-brain.html {
        proxy_pass http://127.0.0.1:8089;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
ln -sf /etc/nginx/sites-available/wisuda /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 6. Cloudflare Tunnel

```bash
# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
dpkg -i cloudflared-linux-arm64.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create wisuda-tunnel

# Route DNS
cloudflared tunnel route dns wisuda-tunnel wisuda.ammang.my.id

# Config: ~/.cloudflared/config.yml
# tunnel: <tunnel-id>
# credentials-file: ~/.cloudflared/<tunnel-id>.json
# ingress:
#   - hostname: wisuda.ammang.my.id
#     service: http://localhost:80
#   - service: http_status:404

# Run as service
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

---

## 7. Health Check Endpoint

### `src/routes/health.js`

```js
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/health', (req, res) => {
  const checks = {
    db: false,
    wal_mode: false,
    fk_enabled: false,
    tables: false,
    disk_space: false
  };

  try {
    checks.db = db.prepare('SELECT 1 as ok').get().ok === 1;
    checks.wal_mode = db.pragma('journal_mode') === 'wal';
    checks.fk_enabled = db.pragma('foreign_keys') === 1;
    checks.tables = db.prepare(
      "SELECT count(*) as cnt FROM sqlite_master WHERE type='table'"
    ).get().cnt >= 13;

    const fs = require('fs');
    const stats = fs.statfsSync('/DATA');
    const freeGB = (stats.bfree * stats.bsize) / (1024**3);
    checks.disk_space = freeGB > 1;  // At least 1GB free
  } catch (e) {
    console.error('[Health] Check failed:', e.message);
  }

  const healthy = Object.values(checks).every(v => v === true);
  res.status(healthy ? 200 : 503).json({
    healthy,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;
```

---

## 8. Backup & Recovery

### Daily Backup Cron (already in cron.service.js)

```bash
# Manual backup
sqlite3 /DATA/AppData/wisuda.db ".backup /DATA/backups/wisuda_$(date +%Y%m%d).db"
gzip /DATA/backups/wisuda_$(date +%Y%m%d).db

# Restore
gunzip -c /DATA/backups/wisuda_20260702.db.gz | sqlite3 /DATA/AppData/wisuda.db
```

### Verify Backup Integrity

```bash
sqlite3 /DATA/backups/wisuda_20260702.db "PRAGMA integrity_check;"
```

---

## 9. Log Rotation

### `/etc/logrotate.d/wisuda`

```conf
/var/log/wisuda/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 10. Monitoring Checklist

| Check | Command | Expected |
|-------|---------|----------|
| API Health | `curl -s http://127.0.0.1:8081/health \| jq .healthy` | `true` |
| PM2 Status | `pm2 list` | `wisuda-api` online |
| Nginx Status | `systemctl status nginx` | active |
| Cloudflare | `curl -s https://wisuda.ammang.my.id/health \| jq .healthy` | `true` |
| DB Integrity | `sqlite3 /DATA/AppData/wisuda.db "PRAGMA integrity_check;"` | `ok` |
| Disk Space | `df -h /DATA` | > 1GB free |
| Cron Running | `pm2 logs wisuda-cron --lines 20` | recent entries |

---

## 11. Rollback Procedure

```bash
# 1. Stop new version
pm2 stop wisuda-api

# 2. Restore DB from backup
gunzip -c /DATA/backups/wisuda_YYYYMMDD.db.gz | sqlite3 /DATA/AppData/wisuda.db

# 3. Restore code (if git)
cd /root/wisuda-platform && git checkout <previous-tag>

# 4. Reinstall deps (if package.json changed)
npm ci --production

# 5. Run migrations (if any down migrations)
# Note: Better-sqlite3 migrations are forward-only
# Restore from backup is the rollback

# 6. Start
pm2 start wisuda-api
```

---

## 12. Port Summary

| Port | Service | Access |
|------|---------|--------|
| 80 | Nginx (reverse proxy) | LAN + Cloudflare |
| 8081 | Node.js API (PM2) | Internal only |
| 8089 | Farah Brain (static) | LAN |
| 3001 | Baileys WA Bridge | Internal (on .83) |
| 443 | Cloudflare Tunnel | Public HTTPS |