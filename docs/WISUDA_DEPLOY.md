# 🚀 Wisuda Platform — Deployment & Operations Guide

**Version:** 1.2  
**Last Updated:** 2026-07-25  
**Target Environment:** Linux Server (Ubuntu / Debian / Proxmox STB / Docker)  
**Timezone Requirement:** `Asia/Makassar` (WITA)

---

## 1. Architecture Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    LINUX SERVER (HOST)                      │
├─────────────────────────────────────────────────────────────┤
│  Port 8081  │  Node.js Express Backend (PM2: wisuda-api)   │
│             │  SQLite WAL Mode Engine (DATA/wisuda.db)     │
│             │  16 B-Tree Performance Indexes Active         │
│             │  Upload Storage (DATA/uploads)              │
│             │  Auto Backups (DATA/backups)                  │
├─────────────────────────────────────────────────────────────┤
│  Nginx Reverse Proxy & SSL → https://wisuda.domainanda.com  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Server Requirements

- **Node.js**: v20.x LTS atau lebih baru (`node -v`)
- **npm**: v10.x atau lebih baru (`npm -v`)
- **PM2**: `npm install -g pm2`
- **SQLite3 CLI**: (Opsional untuk inspeksi manual) `sudo apt install sqlite3`
- **Nginx & Certbot**: Reverse Proxy & SSL HTTPS

---

## 3. Automated One-Command Deployment

Script `deploy.sh` mengotomatiskan seluruh proses build & setup:

```bash
# 1. Clone repository
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda

# 2. Set permission & run deployment
chmod +x deploy.sh
./deploy.sh
```

### ⚙️ Alur Kerja `./deploy.sh`:
1. **Auto-Generate `.env`**: Menyalin `.env.example` menjadi `.env` jika belum ada.
2. **Install Dependensi**: Menjalankan `npm install --omit=dev` di root dan `admin-app/`.
3. **Build SPA Frontend**: Menjalankan `npm run build` di `admin-app/` untuk memproduksi SPA di `public/admin/`.
4. **Auto Migration & Indexing**: Membuat `DATA/wisuda.db`, mengaktifkan WAL mode, dan memasang 16 B-Tree indexes.
5. **Start PM2 Service**: Menyala di PM2 port `8081` dengan nama process `wisuda-api`.

---

## 4. Konfigurasi Environment (`.env`)

```env
PORT=8081
NODE_ENV=production
DB_PATH=./DATA/wisuda.db
SESSION_SECRET=a_strong_random_secret_32_chars
UPLOAD_PATH=./DATA/uploads
BACKUP_PATH=./DATA/backups
GOOGLE_DRIVE_API_KEY=your_google_drive_api_key_here
COMPANY_NAME="AmsDev Wisuda"
ADMIN_PHONE="6281234567890"
TZ=Asia/Makassar
```

---

## 5. Nginx Reverse Proxy & Rate Limiting

Buat konfigurasi `/etc/nginx/sites-available/wisuda`:

```nginx
server {
    listen 80;
    server_name wisuda.domainanda.com;

    # Rate limiting buffer untuk file upload besar
    client_max_body_size 50M;

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

    # Cache static assets di public/
    location /assets/ {
        proxy_pass http://127.0.0.1:8081;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Aktifkan site & SSL Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/wisuda /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d wisuda.domainanda.com
```

---

## 6. Maintenance, Graceful Shutdown & Log Rotation

### Graceful Shutdown (SIGTERM / SIGINT)
Aplikasi mendukung *graceful shutdown*. Saat PM2 melakukan restart (`pm2 restart wisuda-api`), aplikasi akan:
1. Menutup listener HTTP server.
2. Menjalankan `PRAGMA wal_checkpoint(TRUNCATE)` untuk menjamin semua data tertulis ke database utama.
3. Menutup koneksi database `better-sqlite3` secara aman.

### Automatic Log Rotation
Log aplikasi di `./DATA/wisuda-builder.log` dibatasi maksimum **5 MB**. Ketika melebihi 5 MB, sistem secara otomatis me-rename file menjadi `wisuda-builder.log.old` untuk mencegah kehabisan kapasitas disk.

### Automatic Data Retention Cron
Dijalankan setiap hari jam **03:00 WITA**:
- Purge notifikasi > 90 hari.
- Purge token expired & import jobs > 30 hari.
- Clear data proses layanan clientcompleted > 30 hari.
- Delete file bukti transfer `payment_proofs/` > 90 hari.
- Run `PRAGMA optimize` untuk merefresh statistik index SQLite.

### Command Operations PM2:
```bash
pm2 logs wisuda-api      # Cek realtime log
pm2 restart wisuda-api   # Restart aman dengan WAL checkpoint
pm2 status               # Cek status memori & CPU
```

---

*Wisuda Platform Deployment & Operations Guide v1.2*