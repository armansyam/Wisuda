# Wisuda Platform — Setup & Run Guide

Repositori ini berisi **Wisuda Platform** (Platform Reservasi Fotografi Wisuda). Aplikasi ini dirancang untuk mengotomatiskan alur dari tanya-tanya (*inquiry*), konfirmasi pembayaran DP/pelunasan, penjadwalan fotografer freelance, pengiriman file foto wisuda, hingga pelaporan finansial owner.

---

## Prasyarat Server
- **Node.js 20+**
- **Git**
- **PM2** (Direkomendasikan untuk manajemen proses background di produksi: `npm install -g pm2`)

---

## Struktur Direktori Utama
```text
wisuda-platform/
├── admin-app/          # Aplikasi SPA Admin (Vue 3 + Vite) - Dibuild ke public/admin
├── docs/               # Dokumentasi sistem (PRD, flow, deploy guide)
├── scripts/            # Skema SQL & script seeder database
├── src/                # Kode sumber backend Express.js (config, middleware, routes, services)
├── public/             # Folder aset publik (HTML portal, booking link, invoice, & build admin)
├── package.json        # Konfigurasi dependensi proyek
└── .env.example        # Template konfigurasi environment
```

---

## 🚀 Panduan Deployment Pertama Kali (First-time Deploy)

Ikuti langkah-langkah berikut untuk memasang aplikasi di server target Anda:

### 1. Ambil Source Code & Install Dependensi
Kloning repositori ke server Anda dan unduh dependensi produksi:
```bash
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda

# Install dependensi core saja (mengabaikan unit test/dev tools agar cepat & ringan)
npm install --omit=dev
```

### 2. Konfigurasi Environment (`.env`)
Salin file template `.env.example` menjadi `.env` aktif di server:
```bash
cp .env.example .env
```
Gunakan text editor (seperti `nano .env`) untuk mengedit isinya. Sesuaikan jalur direktori database dan folder penyimpanan:
```env
PORT=8081
NODE_ENV=production
DB_PATH=/DATA/AppData/wisuda.db
SESSION_SECRET=masukkan-string-acak-yang-panjang-dan-aman-di-sini
UPLOAD_PATH=/DATA/AppData/wisuda-uploads
BACKUP_PATH=/DATA/backups
TZ=Asia/Makassar
```
> **PENTING:** Pastikan direktori `/DATA/AppData/` di server Anda memiliki hak akses baca-tulis (*read-write permissions*) agar SQLite dan upload file berfungsi lancar (`chown -R $USER:$USER /DATA/`).

### 3. Jalankan Pengisian Data Awal (Database Seeding)
Jalankan script seeder untuk membuat akun admin default, paket awal, dan template pesan WhatsApp default ke database:
```bash
npm run seed
```
*Output sukses:*
```text
Seeding database...
✓ Admin user: admin / admin123
✓ 3 seed packages inserted
✓ WA templates inserted to DB
```

### 4. Jalankan Aplikasi di Latar Belakang (PM2)
Gunakan PM2 agar aplikasi tetap berjalan secara otomatis sekalipun terminal ditutup atau server melakukan restart:
```bash
# Menjalankan menggunakan konfigurasi PM2 bawaan proyek
pm2 start ecosystem.config.js
```
Periksa status aplikasi dengan:
```bash
pm2 status
```

---

## 🔄 Pembaruan Rutin di Server (Update Flow)
Jika Anda melakukan perubahan kode di lokal dan telah mem-push ke GitHub, Anda dapat melakukan pembaruan di server secara otomatis menggunakan script `deploy.sh` yang telah disediakan:
```bash
./deploy.sh
```
Script ini akan secara otomatis mengamankan perubahan lokal sementara (git stash), menarik kode terbaru (git pull), mendeteksi perubahan dependensi dan menginstalnya (npm install), serta me-restart service PM2 (`wisuda-api` & `wisuda-cron`) secara aman.

---

## 🔒 Rekomendasi Keamanan & Produksi

1.  **Ganti Password Default:**
    Setelah berhasil login pertama kali di dashboard admin (`http://IP-SERVER:8081/admin/`), segera buka menu **Settings -> Keamanan** dan ganti password akun `admin123` dengan password yang lebih kuat.
2.  **Ubah SESSION_SECRET:**
    Jangan gunakan default `your-secret-session-key-here` pada file `.env` produksi. Generate string acak (misal menggunakan `openssl rand -base64 32`) dan simpan di `.env`.
3.  **Gunakan HTTPS / SSL:**
    Sangat disarankan untuk menempatkan Nginx Reverse Proxy di depan port `8081` aplikasi, atau gunakan **Cloudflare Tunnel** untuk mengamankan komunikasi data menggunakan HTTPS.
4.  **Auto-Start PM2:**
    Jalankan perintah berikut agar PM2 dan aplikasi Anda otomatis hidup kembali ketika server reboot:
    ```bash
    pm2 startup
    pm2 save
    ```

---

## 🛠️ Perintah Berguna (Debugging & Utility)

### Menjalankan Mode Development (Lokal)
```bash
npm run dev
```

### Melakukan Backup Database Manual
```bash
sqlite3 /DATA/AppData/wisuda.db "VACUUM INTO '/DATA/AppData/backups/wisuda_$(date +%F_%H%M%S).db';"
```

### Memeriksa Log Aplikasi
```bash
pm2 logs wisuda-api
```

---
Happy deploying! 🚀
