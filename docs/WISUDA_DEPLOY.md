# Wisuda Platform — Server Deployment Guide

**Version:** 1.1  
**Last Updated:** 2026-07-22  
**Target Server:** Linux Server (Ubuntu / Debian / Proxmox STB / Docker)

---

## 1. Arsitektur Infrastruktur

```
┌─────────────────────────────────────────────────────────────┐
│                    LINUX SERVER (HOST)                      │
├─────────────────────────────────────────────────────────────┤
│  Port 8081  │  Node.js Express Backend (PM2: wisuda-api)   │
│             │  SQLite Database WAL Mode (DATA/wisuda.db)  │
│             │  Upload Storage (DATA/uploads)              │
│             │  Automated Backups (DATA/backups)             │
├─────────────────────────────────────────────────────────────┤
│  Nginx / Cloudflare Tunnel → https://wisuda.domainanda.com  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prasyarat Server
- **Node.js 20+** (`node -v`)
- **npm 10+** (`npm -v`)
- **PM2** (`npm install -g pm2`)
- **Nginx** (Opsional untuk Reverse Proxy & HTTPS)

---

## 3. Langkah Deployment Otomatis (Metode 1: PM2)

Script `deploy.sh` telah disediakan untuk mengotomatiskan seluruh proses instalasi, pembuatan database, build frontend SPA, dan penyalaan PM2 background service.

```bash
# 1. Kloning Repositori
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda

# 2. Beri Izin Eksekusi & Jalankan Script Deploy
chmod +x deploy.sh
./deploy.sh
```

### ⚙️ Alur Kerja `./deploy.sh`:
1. **Auto-Generate `.env`**: Menyalin `.env.example` menjadi `.env` jika belum ada.
2. **Install Dependensi**: Menjalankan `npm install --omit=dev` di backend dan frontend admin.
3. **Build SPA Frontend**: Menjalankan `npm run build` di `admin-app/` untuk menghasilkan aset produksi di `public/admin/`.
4. **Inisialisasi Database**: Membuat file SQLite `./DATA/wisuda.db`, mengaktifkan mode WAL (`journal_mode = WAL`), dan menginjeksikan data awal (akun admin default, paket, dan template WA).
5. **Start PM2 Service**: Registrasi & restart service `wisuda-api` di PM2 port 8081.

---

## 4. Langkah Deployment via Docker (Metode 2: Docker Compose)

```bash
# 1. Salin berkas environment
cp .env.example .env

# 2. Jalankan container di background
docker compose up -d --build
```

### Pembaruan Rutin Docker:
```bash
git pull
docker compose up -d --build
```

---

## 5. Konfigurasi Environment (`.env`)

```env
PORT=8081
NODE_ENV=production
DB_PATH=./DATA/wisuda.db
SESSION_SECRET=string_acak_rahasia_session_32_character
JWT_SECRET=string_acak_rahasia_jwt_32_character
UPLOAD_PATH=./DATA/uploads
BACKUP_PATH=./DATA/backups
GOOGLE_DRIVE_API_KEY=your_google_drive_api_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminpassword123
```

---

## 6. Konfigurasi Nginx Reverse Proxy & SSL

Buat file `/etc/nginx/sites-available/wisuda`:

```nginx
server {
    listen 80;
    server_name wisuda.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Upload file size limit
    client_max_body_size 20M;
}
```

Aktifkan konfigurasi Nginx dan pasang SSL Certbot:
```bash
ln -s /etc/nginx/sites-available/wisuda /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d wisuda.domainanda.com
```

---

## 7. Pemeliharaan & Backup Manual

### Cek Log Service PM2:
```bash
pm2 logs wisuda-api
```

### Backup Database Manual:
```bash
sqlite3 ./DATA/wisuda.db "VACUUM INTO './DATA/backups/wisuda_$(date +%F_%H%M%S).db';"
```

### Auto Restart PM2 saat Reboot Server:
```bash
pm2 startup
pm2 save
```

---
*Wisuda Management System Deployment Guide v1.1*