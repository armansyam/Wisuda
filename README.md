# Wisuda Platform — Luxenary.co Guide & Documentation

Platform Manajemen Dokumentasi Wisuda **Luxenary.co** adalah sistem terintegrasi yang menangani seluruh alur reservasi fotografi wisuda: mulai dari konsultasi awal (*inquiry*), konfirmasi DP/Pelunasan, penjadwalan fotografer freelance, seleksi foto favorit klien, pengiriman berkas via Google Drive, hingga penggajian (*payroll*) fotografer dan laporan keuangan owner.

---

## 📖 Navigasi Dokumentasi (Urutan Baca)

| File | Tujuan & Deskripsi |
|------|--------------------|
| **[README.md](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/README.md)** | Panduan setup, cara instalasi, deployment, dan ringkasan fitur utama. |
| **[PLATFORM_MAP.md](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/PLATFORM_MAP.md)** | Peta arsitektur proyek, alur data (*data flow*), lokasi file utama, dan panduan modifikasi aman. |
| **[WISUDA_FLOW.md](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/WISUDA_FLOW.md)** | Detail alur bisnis end-to-end (state machine inquiry, booking, deliverables, & payroll). |
| **[WISUDA_DB.md](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/WISUDA_DB.md)** | Skema database SQLite (14 tabel utama), indeks, dan relasi data. |
| **[WISUDA_DEPLOY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/WISUDA_DEPLOY.md)** | Panduan deployment server produksi (PM2, Nginx, Docker, SSL, & backup). |
| **[.env.example](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/.env.example)** | Template konfigurasi variabel environment beserta deskripsi lengkapnya. |

---

## ✨ Fitur Utama Sistem

### 1. **Dual-Mode Architecture (Standard Web + Headless API Engine)**
- **Standard Web**: Menyajikan file web statis (`/index.html`, `/admin`, `/tracking.html`, `/select-photos.html`) langsung untuk pengguna browser.
- **Headless API Engine**: Menyediakan RESTful API (`/api/v1/*`) dengan otentikasi **JWT Token (Bearer Token)**, **API Key (`X-API-Key`)**, **Session Cookie**, dan **CORS Multi-Origin** untuk dikonsumsi oleh aplikasi mobile / sistem external.
- **Dokumentasi OpenAPI 3.0**: Spesifikasi interaktif di [docs/swagger.json](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/swagger.json).

### 2. **Halaman Publik & Internationalization (i18n)**
- **Default International English (`EN`)**: Seluruh tampilan publik (`/index.html`, `/portfolio.html`, `/tracking.html`) menyajikan bahasa Inggris editorial berstandar internasional secara default.
- **Language Switcher Toggle (`EN | ID`)**: Opsi pengalih bahasa instan di navbar dengan penyimpanan preferensi di `localStorage`.
- **Penguncian Warna Netral (Light Theme Fixed)**: Penguncian skema `:root { color-scheme: light !important; }` dan gading `#FAF9F6` untuk menjamin konsistensi visual luxury tanpa terganggu mode gelap (*Dark Mode*) OS perangkat pengguna.
- **Landing Page (`/index.html`)**: Desain estetik premium dengan Hero Carousel yang memprioritaskan foto **Featured**, layout multiline fleksibel, penyesuaian *spacing* presisi, dan pengunci lokasi Tahun Wisuda.
- **Proteksi Foto Anti-Copy**: Menutup akses klik kanan (*contextmenu blocker*), drag-and-drop gambar, serta penambahan *transparent protective overlay*.
- **Katalog Portofolio (`/portfolio.html`)**: Filter universitas & tahun wisuda, modal carousel zoom, dan proteksi gambar.

### 2. **Portal Klien & Seleksi Foto (`/select-photos.html`)**
- **Lightbox Navigation**: Fitur geser foto (*Touch Swipe* pada mobile/tablet), tombol panah (`‹` `›`), dan navigasi keyboard (`←` `→` `ESC`).
- **Pemilihan Foto Instant**: Tombol `❤️ Pilih Foto Ini` tersedia langsung di modal zoom sehingga klien dapat memilih foto sambil menggeser galeri.
- **Lacak Progres & Token Security (`/tracking.html`)**: Memerlukan Token Tracking unik klien (`TRK-...`) untuk melihat status progres dan membuka secara langsung link Drive hasil akhir.

### 3. **Dashboard Admin (Vue 3 + Vite SPA)**
- **Kelola Inquiries & Booking**: Otomatisasi status booking, konfirmasi DP & pelunasan, verifikasi bukti transfer.
- **Jadwal & Penugasan Freelance**: Kalender interaktif penugasan fotografer dengan deteksi bentrok jadwal.
- **Payroll Freelance**: Tabel 1 baris per fotografer dengan indikator rasio sesi selesai (`✓ 2/2 Selesai` / `⏳ 1/3 Selesai`), popup modal detail multi-project, dan layering konfirmasi pembayaran yang rapi (`z-[70]`).
- **Arsip Client & Notifikasi Fee**: Indikator peringatan `⚠️ Fee FG Belum Dibayar` untuk mempermudah pemantauan keuangan admin.
- **Management Portofolio**: Memilih cover foto langsung dari foto highlight yang ada, serta impor otomatis folder Google Drive via **Drive API & Sharp Compression**.

### 4. **Portal Freelance (`/freelance-portal.html`)**
- Akses portal khusus fotografer untuk melihat jadwal penugasan, brief klien, check-in/out lokasi shoot, dan setor link Google Drive.

---

## 🛠️ Struktur Direktori Proyek

```text
Wisuda/
├── admin-app/          # Source code aplikasi Admin (Vue 3 + Vite) -> dibuild ke public/admin
├── docs/               # Dokumentasi sistem (PRD, FLOW, DB, DEPLOY, API)
├── public/             # Berkas web publik (index.html, portfolio, tracking, select-photos, dll)
├── src/                # Backend Express.js (config, middleware, routes, services)
├── DATA/               # Folder runtime data (wisuda.db, uploads, backups)
├── deploy.sh           # Script otomatisasi deployment PM2
├── docker-compose.yml  # Konfigurasi containerization Docker
├── package.json        # Dependensi utama proyek
└── .env.example        # Template konfigurasi environment
```

---

## 🚀 Panduan Deployment & Jalankan Sistem

### 1. Opsi A: Deployment Otomatis (PM2)
```bash
# 1. Kloning repositori
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda

# 2. Jalankan script deployment otomatis
./deploy.sh
```

### 2. Opsi B: Deployment via Docker Compose
```bash
# 1. Salin template .env
cp .env.example .env

# 2. Jalankan kontainer
docker compose up -d --build
```

### 3. Opsi C: Mode Development (Lokal)
```bash
# 1. Install dependensi backend & admin app
npm install
cd admin-app && npm install && npm run build && cd ..

# 2. Jalankan backend server
node src/main.js
# Server aktif di http://localhost:8081
```

---

## 🔒 Rekomendasi Keamanan Produksi

1. Ganti password default akun admin di menu **Settings -> Keamanan**.
2. Ubah `SESSION_SECRET` dan `JWT_SECRET` pada berkas `.env` dengan string acak yang kuat.
3. Tempatkan Nginx Reverse Proxy atau Cloudflare Tunnel di depan port `8081` untuk mengamankan koneksi dengan HTTPS.

---
*Luxenary.co Wisuda Management System v1.0.0*


# tidak perlu d baca, hanya sekedar catatatn kecil untuk scala bisnis grup media visual
#domain plan
Luxenary.co
graduation.luxenary.co
wedding.luxinary.co
event.luxenary.co