# Wisuda Platform — Luxenary.co Guide & Documentation

Platform Manajemen Dokumentasi Wisuda **Luxenary.co** adalah sistem terintegrasi yang menangani seluruh alur reservasi fotografi wisuda: mulai dari konsultasi awal (*inquiry*), konfirmasi DP/Pelunasan, penjadwalan fotografer freelance, seleksi foto favorit klien, pengiriman berkas via Google Drive, hingga penggajian (*payroll*) fotografer dan laporan keuangan owner.

---

## 📖 Navigasi Dokumentasi (Urutan Baca)

| File / Folder | Tujuan & Deskripsi Operasional Sistem |
|---------------|---------------------------------------|
| **[README.md](./README.md)** | Panduan setup, cara instalasi, deployment, dan ringkasan fitur utama. |
| **[FLOW_SISTEM/MASTER_FLOW.md](./FLOW_SISTEM/MASTER_FLOW.md)** | 🗺️ **Master System Flow & Wiki Central Hub** (Diagram alur makro end-to-end, isolasi state, & indeks lengkap). |
| **[FLOW_SISTEM/TAHAP1_alur_inqury.md](./FLOW_SISTEM/TAHAP1_alur_inqury.md)** | Tahap 1: Inquiry 1-pintu mandiri client, Link Booking Terpadu, timer 3j dinamis, & Gate 1 DP. |
| **[FLOW_SISTEM/TAHAP2_alur_client.md](./FLOW_SISTEM/TAHAP2_alur_client.md)** | Tahap 2: Client deal, assign FG, cron 30m sesi selesai, & Gate 2 Pelunasan. |
| **[FLOW_SISTEM/TAHAP3_alur_postproduksi.md](./FLOW_SISTEM/TAHAP3_alur_postproduksi.md)** | Tahap 3: Direct upload admin, Galeri Seleksi Klien, Highlight Portofolio, & Closing Statement. |
| **[FLOW_SISTEM/TAHAP4_alur_arsip.md](./FLOW_SISTEM/TAHAP4_alur_arsip.md)** | Tahap 4: Sidetab Arsip (Completed/Cancelled), WA Reminder H-7/H-3, & Drive Expired Cleanup. |
| **[FLOW_SISTEM/ALUR_FREELANCE.md](./FLOW_SISTEM/ALUR_FREELANCE.md)** | Sistem Freelance: Onboarding 2 jalur, Access Code, Portal Mobile `freelance.html`, & Payroll. |
| **[FLOW_SISTEM/ALUR_PORTOFOLIO.md](./FLOW_SISTEM/ALUR_PORTOFOLIO.md)** | Sistem Portofolio: Consent `is_portfolio_allowed`, Cloud-to-Cloud copy Root 2, & `portofolio.html`. |
| **[FLOW_SISTEM/ALUR_TRACKING_CLIENT.md](./FLOW_SISTEM/ALUR_TRACKING_CLIENT.md)** | Portal Tracking Klien: Antarmuka `tracking.html`, DP/Pelunasan, Direct Drive Access, Size Calculator, & Closing Card. |
| **[FLOW_SISTEM/ALUR_EMAIL_SMTP.md](./FLOW_SISTEM/ALUR_EMAIL_SMTP.md)** | Sub-Sistem Email Otomatis: Nodemailer SMTP Gateway, Luxury Template Engine, & Rotation Access Code FG. |
| **[FLOW_SISTEM/STRUKTUR_FOLDER_DRIVE.md](./FLOW_SISTEM/STRUKTUR_FOLDER_DRIVE.md)** | Arsitektur Dual-Root Google Drive Storage (Root 1 Client Storage vs Root 2 Master Portofolio). |
| **[PLATFORM_MAP.md](./PLATFORM_MAP.md)** | Peta arsitektur proyek, alur data (*data flow*), lokasi file utama, dan panduan modifikasi aman. |
| **[docs/WISUDA_DB.md](./docs/WISUDA_DB.md)** | Skema database SQLite (14 tabel utama), indeks, dan relasi data. |
| **[docs/WISUDA_DEPLOY.md](./docs/WISUDA_DEPLOY.md)** | Panduan deployment server produksi (PM2, Nginx, Docker, SSL, & backup). |
| **[.env.example](./.env.example)** | Template konfigurasi variabel environment beserta deskripsi lengkapnya. |

---

## ✨ Fitur Utama Sistem

### 1. **Dual-Mode Architecture (Standard Web + Headless API Engine)**
- **Standard Web**: Menyajikan file web statis (`/index.html`, `/admin`, `/tracking.html`, `/select-photos.html`) langsung untuk pengguna browser.
- **Headless API Engine**: Menyediakan RESTful API (`/api/v1/*`) dengan otentikasi **JWT Token (Bearer Token)**, **API Key (`X-API-Key`)**, **Session Cookie**, dan **CORS Multi-Origin** untuk dikonsumsi oleh aplikasi mobile / sistem external.
- **Dokumentasi OpenAPI 3.0**: Spesifikasi interaktif di [docs/swagger.json](./docs/swagger.json).

### 2. **Halaman Publik & Internationalization (i18n)**
- **Default International English (`EN`)**: Seluruh tampilan publik (`/index.html`, `/portfolio.html`, `/tracking.html`) menyajikan bahasa Inggris editorial berstandar internasional secara default.
- **Language Switcher Toggle (`EN | ID`)**: Opsi pengalih bahasa instan di navbar dengan penyimpanan preferensi di `localStorage`.
- **Penguncian Warna Netral (Light Theme Fixed)**: Penguncian skema `:root { color-scheme: light !important; }` dan gading `#FAF9F6` untuk menjamin konsistensi visual luxury tanpa terganggu mode gelap (*Dark Mode*) OS perangkat pengguna.
- **Landing Page (`/index.html`)**: Desain estetik premium dengan Hero Carousel yang memprioritaskan foto **Featured**, layout multiline fleksibel, penyesuaian *spacing* presisi, dan pengunci lokasi Tahun Wisuda.
- **Proteksi Foto Anti-Copy**: Menutup akses klik kanan (*contextmenu blocker*), drag-and-drop gambar, serta penambahan *transparent protective overlay*.
- **Katalog Portofolio (`/portfolio.html`)**: Filter universitas & tahun wisuda, modal carousel zoom, dan proteksi gambar.

### 3. **Portal Klien & Seleksi Foto (`/select-photos.html`)**
- **Lightbox Navigation**: Fitur geser foto (*Touch Swipe* pada mobile/tablet), tombol panah (`‹` `›`), dan navigasi keyboard (`←` `→` `ESC`).
- **Pemilihan Foto Instant**: Tombol `❤️ Pilih Foto Ini` tersedia langsung di modal zoom sehingga klien dapat memilih foto sambil menggeser galeri.
- **Lacak Progres & Token Security (`/tracking.html`)**: Memerlukan Token Tracking unik klien (`TRK-...`) untuk melihat status progres dan membuka secara langsung link Drive hasil akhir.

### 4. **Dashboard Admin (Vue 3 + Vite SPA)**
- **Kelola Inquiries & Booking**: Otomatisasi status booking, konfirmasi DP & pelunasan, verifikasi bukti transfer.
- **Pengunggahan Master Photo Terpusat (Admin Direct-to-Drive Stream)**: Seluruh pengunggahan foto wisuda klien dilakukan 100% oleh Admin Studio dari Admin Dashboard. Menggunakan Google Drive Resumable Stream (Zero Disk Transit) langsung dari browser Admin ke Google Drive tanpa mengendap di disk lokal VPS server.
- **Jadwal & Penugasan Freelance**: Kalender interaktif penugasan fotografer dengan deteksi bentrok jadwal.
- **Payroll Freelance**: Tabel 1 baris per fotografer dengan indikator rasio sesi selesai (`✓ 2/2 Selesai` / `⏳ 1/3 Selesai`), popup modal detail multi-project, dan layering konfirmasi pembayaran yang rapi (`z-[70]`).
- **Arsip Client & Notifikasi Fee**: Indikator peringatan `⚠️ Fee FG Belum Dibayar` untuk mempermudah pemantauan keuangan admin.
- **Management Portofolio**: Memilih cover foto langsung dari foto highlight yang ada, serta impor otomatis folder Google Drive via **Drive API & Sharp Compression**.

### 5. **Portal Freelance (`/freelance.html`)**
- Akses portal khusus fotografer untuk melihat jadwal penugasan job, detail brief shooting klien, dan check-in/out lokasi shoot. *(Seluruh pengunggahan foto wisuda master ditangani 100% terpusat oleh Admin Studio)*.

---

## 🛠️ Struktur Direktori Proyek

```text
Wisuda/
├── admin-app/          # Source code aplikasi Admin (Vue 3 + Vite) -> dibuild ke public/admin
├── FLOW_SISTEM/        # Cetak biru arsitektur & alur kerja sistem (Master Flow, Tahap 1-4, Freelance, Portofolio, Drive)
├── docs/               # Dokumentasi teknis tambahan (DB Schema, Deployment, OpenAPI Swagger)
├── public/             # Berkas web publik (index.html, portfolio, tracking, select-photos, freelance, dll)
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
2. **Otomatisasi Kunci Keamanan:** `SESSION_SECRET`, `JWT_SECRET`, dan `WEBHOOK_SECRET` **100% otomatis di-generate secara acak & aman oleh `deploy.sh`** saat pertama kali deployment di server VPS. (Pengubahan manual di `.env` hanya diperlukan jika Anda tidak menggunakan `deploy.sh`).
3. Tempatkan Nginx Reverse Proxy atau Cloudflare Tunnel di depan port `8081` untuk mengamankan koneksi dengan HTTPS.

---
*Luxenary.co Wisuda Management System v1.4.5*


# tidak perlu d baca, hanya sekedar catatatn kecil untuk scala bisnis grup media visual
#domain plan
Luxenary.co
graduation.luxenary.co
wedding.luxinary.co
event.luxenary.co