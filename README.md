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

Sistem ini didesain agar sangat mudah dideploy dengan sekali jalan. Anda tidak perlu menyalin berkas `.env` atau membuat database secara manual. Cukup jalankan langkah berikut di server Anda:

```bash
# 1. Kloning repositori proyek
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda

# 2. Jalankan script deployment otomatis
./deploy.sh
```

### ⚙️ Apa yang dilakukan oleh `./deploy.sh` secara otomatis?
1. **Membuat berkas `.env`:** Menyalin template `.env.example` ke `.env` secara otomatis jika berkas `.env` belum ditemukan di server.
2. **Mengunci Keamanan Sesi:** Men-generate `SESSION_SECRET` acak 32-byte yang aman dan menuliskannya langsung ke berkas `.env` Anda.
3. **Menginstal Dependensi:** Menjalankan perintah `npm install --omit=dev` secara otomatis.
4. **Membuat & Mengisi Database:** Mendeteksi database baru, membuat berkas `./DATA/wisuda.db` beserta tabelnya, dan mengisi data awal bawaan (seperti akun login default `admin / admin123`, paket awal, dan template pesan WhatsApp).
5. **Menjalankan Background Process (PM2):** Mendaftarkan dan mengaktifkan service aplikasi (`wisuda-api` & `wisuda-cron`) ke dalam daftar PM2 server secara otomatis.

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
sqlite3 ./DATA/wisuda.db "VACUUM INTO './DATA/backups/wisuda_$(date +%F_%H%M%S).db';"
```

### Memeriksa Log Aplikasi
```bash
pm2 logs wisuda-api
```

---
Happy deploying! 🚀
