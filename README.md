# Wisuda Platform — Luxenary.co Guide & Documentation

Platform Manajemen Dokumentasi Wisuda **Luxenary.co** adalah sistem terintegrasi yang menangani seluruh alur reservasi fotografi wisuda: mulai dari konsultasi awal (*inquiry*), konfirmasi DP/Pelunasan, penjadwalan fotografer freelance, seleksi foto favorit klien, pengiriman berkas via Google Drive, hingga penggajian (*payroll*) fotografer dan laporan keuangan owner.

---

## 📖 Navigasi Dokumentasi Terpadu (`master_docs/` & `scripts/`)

Seluruh dokumentasi teknis, cetak biru alur sistem, rekam jejak audit, dan katalog skrip otomasi disatukan secara terpusat:

| Direktori / Dokumen Utama | Deskripsi & Topik Bahasan |
| :--- | :--- |
| **[🧠 SYSTEM_STATE.md](./master_docs/SYSTEM_STATE.md)** | ⭐ **Living System Memory**: Status sistem terkini v2.1.0, arsitektur terkunci, dan Buku Besar Resolusi Audit (`100% PASS`). |
| **[📜 scripts/README.md](./scripts/README.md)** | **Katalog Skrip Utilitas**: Panduan lengkap seluruh skrip di folder `scripts/` (seed, reset admin, reset DB, schema, testing, dan QA scanner). |
| **[🧭 master_docs/README.md](./master_docs/README.md)** | **Master Documentation Portal**: Peta navigasi lengkap seluruh modul dan dokumen sistem. |
| **[🌊 master_docs/01_FLOW_SISTEM/](./master_docs/01_FLOW_SISTEM/README.md)** | **Cetak Biru Alur Bisnis**: [MASTER_FLOW](./master_docs/01_FLOW_SISTEM/MASTER_FLOW.md), Tahap 1 (Inquiry/DP), Tahap 2 (Assign FG/Pelunasan), Tahap 3 (Post-Pro/Seleksi), Tahap 4 (Arsip/Retensi), Freelance & Portofolio. |
| **[📖 master_docs/02_PANDUAN_TEKNIS/](./master_docs/02_PANDUAN_TEKNIS/README.md)** | **Panduan Teknis & Operasional**: [Dokumentasi Utama](./master_docs/02_PANDUAN_TEKNIS/DOKUMENTASI_UTAMA_PLATFORM_WISUDA.md), [Technical Guide](./master_docs/02_PANDUAN_TEKNIS/TECHNICAL_GUIDE.md), [SOP Operasional Studio](./master_docs/02_PANDUAN_TEKNIS/WORKFLOW_OPERASIONAL_STUDIO_WISUDA.md), [Changelog](./master_docs/02_PANDUAN_TEKNIS/CHANGELOG.md), & [OpenAPI Swagger](./master_docs/02_PANDUAN_TEKNIS/swagger.json). |
| **[🛡️ master_docs/03_LAPORAN_AUDIT/](./master_docs/03_LAPORAN_AUDIT/README.md)** | **Pusat Rekam Jejak Audit**: [Deploy Produksi (Live VPS)](./master_docs/03_LAPORAN_AUDIT/deploy_produksi/), [Local Development](./master_docs/03_LAPORAN_AUDIT/local_development/), & [Arsip Historis Lawas](./master_docs/03_LAPORAN_AUDIT/arsip_lama/). |
| **[🛠️ master_docs/04_RESPON_MAINTENANCE/](./master_docs/04_RESPON_MAINTENANCE/README.md)** | **Laporan Respon Perbaikan**: Catatan resmi Root Cause Analysis (RCA), surgical patches, dan bukti pengujian developer. |
| **[.env.example](./.env.example)** | Template konfigurasi variabel environment beserta deskripsi lengkapnya. |

---

## ✨ Fitur Utama Sistem

### 1. **Dual-Mode Architecture (Standard Web + Headless API Engine)**
- **Standard Web**: Menyajikan file web statis (`/index.html`, `/admin`, `/tracking.html`, `/select-photos.html`) langsung untuk pengguna browser.
- **Headless API Engine**: Menyediakan RESTful API (`/api/v1/*`) dengan otentikasi **JWT Token (Bearer Token)**, **API Key (`X-API-Key`)**, **Session Cookie**, dan **CORS Multi-Origin** untuk dikonsumsi oleh aplikasi mobile / sistem eksternal.
- **Dokumentasi OpenAPI 3.0**: Spesifikasi interaktif di [master_docs/02_PANDUAN_TEKNIS/swagger.json](./master_docs/02_PANDUAN_TEKNIS/swagger.json).

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
- **Backup & Restore Terintegrasi**: Pembuatan snapshot instan dan pemulihan database dengan auto-restart PM2 terkelola.

### 5. **Portal Freelance (`/freelance.html`)**
- Akses portal khusus fotografer untuk melihat jadwal penugasan job, detail brief shooting klien, dan check-in/out lokasi shoot. *(Seluruh pengunggahan foto wisuda master ditangani 100% terpusat oleh Admin Studio)*.

---

## 🛠️ Struktur Direktori Proyek

```text
Wisuda/
├── admin-app/          # Source code aplikasi Admin (Vue 3 + Vite) -> dibuild ke public/admin
├── master_docs/        # Pusat Dokumentasi Terpadu (System State, Flow Sistem, Panduan Teknis, Audit, Maintenance)
├── public/             # Berkas web publik (index.html, portfolio, tracking, select-photos, freelance, dll)
├── scripts/            # Skrip utilitas otomasi (seed, reset admin, reset DB, schema, testing, QA)
├── src/                # Backend Express.js (config, middleware, routes, services)
├── DATA/               # Folder runtime data (wisuda.db, uploads, backups, tmp)
├── logs/               # Log runtime server (wisuda-api, wisuda-cron)
├── deploy.sh           # Script otomatisasi deployment PM2 & health check
├── docker-compose.yml  # Konfigurasi containerization Docker
├── package.json        # Dependensi dan runner skrip utama
└── .env.example        # Template konfigurasi variabel environment
```

---

## 🚀 Panduan Deployment Server Produksi (VPS Linux)

### 📌 1. Prasyarat Server (Server Requirements)
* **OS**: Ubuntu 20.04 / 22.04 LTS (RAM disarankan min. 2GB).
* **Node.js**: v20.x LTS (disarankan) atau v18.x LTS.
* **Perangkat Lunak**: `git`, `npm`, `pm2`, `nginx`, `certbot`.
* **User**: Jalankan seluruh aplikasi di bawah user biasa non-root (contoh: `amsdev`).

---

### ⚡ 2. Langkah Deployment Otomatis (`./deploy.sh`) — *Sangat Direkomendasikan*

1. **Masuk ke VPS via SSH**:
   ```bash
   ssh -i /path/to/key.pem amsdev@IP_VPS_ANDA
   ```

2. **Kloning Repositori**:
   ```bash
   git clone https://github.com/armansyam/Wisuda.git
   cd Wisuda
   ```

3. **Pastikan Hak Kepemilikan User (`amsdev:amsdev`)**:
   ```bash
   sudo chown -R amsdev:amsdev /home/amsdev/Wisuda
   ```

4. **Beri Izin Eksekusi & Jalankan Deployment**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

> [!TIP]
> **Apa yang Dikerjakan Otomatis oleh `deploy.sh`?**
> 1. Sinkronisasi Git (`git pull origin main`).
> 2. Pembangkitan kunci acak aman (`SESSION_SECRET`, `JWT_SECRET`, `WEBHOOK_SECRET`).
> 3. Pengesetan zona waktu sistem (`TZ=Asia/Makassar` WITA UTC+8).
> 4. Pembuatan direktori runtime (`DATA/uploads`, `DATA/backups`, `DATA/tmp`, `logs`, `public/admin`).
> 5. Instalasi dependensi backend & rebuild modul native (`better-sqlite3`, `sharp`, `bcrypt`).
> 6. Kompilasi frontend dashboard Admin SPA (Vue 3 + Vite).
> 7. Pengecekan cerdas database (auto-seeding jika database kosong 0–4KB).
> 8. Registrasi dan reload zero-downtime 2 service di PM2 (`wisuda-api` & `wisuda-cron`).
> 9. Verifikasi kesehatan API Engine (`/api/health`).

---

### 🌐 3. Konfigurasi Nginx Reverse Proxy & SSL (HTTPS)

Arahkan domain produksi Anda ke port backend `8081`:

#### 1) Buat berkas konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/wisuda.conf
```

Isi dengan template berikut (sesuaikan `domain-anda.com`):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name domain-anda.com www.domain-anda.com;

    # Bebas dari error 413 Payload Too Large untuk upload foto master
    client_max_body_size 0;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_buffering off;
    }
}
```

#### 2) Aktifkan Virtual Host & Pasang SSL Let's Encrypt:
```bash
# Aktifkan konfigurasi
sudo ln -s /etc/nginx/sites-available/wisuda.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Pasang Sertifikat SSL Gratis (HTTPS)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

---

### 📊 4. Monitoring & Pengelolaan Layanan PM2

* **Melihat Status Layanan**:
  ```bash
  pm2 list
  # atau
  pm2 status
  ```
* **Melihat Log Server Real-Time**:
  ```bash
  pm2 logs wisuda-api
  pm2 logs wisuda-cron
  ```
* **Me-restart Layanan**:
  ```bash
  pm2 restart ecosystem.config.js --env production
  ```

---

## 💾 Panduan Backup & Restore Database

Sistem Wisuda Platform menyediakan 2 metode pemulihan (*restore*) database:

### Metode 1: Melalui Dashboard Admin Web UI (*Paling Mudah*)
1. Login ke **Admin Dashboard** (`https://domain-anda.com/admin`).
2. Masuk ke menu **Pengaturan (Settings) > Backup & Restore**.
3. Pilih salah satu snapshot yang ada di server ATAU unggah berkas backup dari perangkat Anda (`.db` atau `.db.gz`).
4. Masukkan **Password Akun Admin** Anda untuk otorisasi keamanan.
5. Klik **Pulihkan Sekarang**.
6. Sistem akan memvalidasi integritas file, menimpa database, membuat cadangan pengaman (*safety backup*), dan me-restart proses PM2 secara instan.
7. Web UI akan menampilkan notifikasi countdown 3 detik lalu mengarahkan Anda ke halaman login baru.

---

### Metode 2: Melalui Terminal CLI (SSH)
Jika Anda ingin merestore file database secara manual langsung di VPS:

```bash
# 1. Masuk ke direktori proyek
cd /home/amsdev/Wisuda

# 2. Hentikan service sementara
pm2 stop wisuda-api wisuda-cron

# 3. Timpa file database aktif dengan file cadangan Anda
cp /path/to/backup_file.db ./DATA/wisuda.db

# 4. Bersihkan file cache WAL & SHM
rm -f ./DATA/wisuda.db-wal ./DATA/wisuda.db-shm

# 5. Pastikan izin akses file tetap milik user amsdev
sudo chown -R amsdev:amsdev ./DATA

# 6. Jalankan migrasi & nyalakan kembali PM2
npm run migrate
pm2 restart ecosystem.config.js --env production
```

---

## 🔑 Panduan Manajemen Akun & Reset Password Admin

Kredensial login admin (`username` & `password`) **tersimpan terenkripsi dengan hash `bcrypt` di dalam Database SQLite (`./DATA/wisuda.db`) pada tabel `users`** (bukan di `.env` demi standar keamanan multi-user).

### 🚨 Cara Reset Kata Sandi Admin (Jika Lupa Password)

Jika Anda lupa kata sandi login admin, jalankan skrip resmi berikut di terminal:

```bash
# 1. Masuk ke direktori proyek
cd /home/amsdev/Wisuda

# 2. Reset ke password bawaan 'admin123' untuk user 'admin'
npm run reset:admin
```

Atau jika Anda ingin menentukan password kustom langsung:
```bash
# Format: node scripts/reset-admin-password.js [password_baru] [username_opsional]
node scripts/reset-admin-password.js RahasiaKu2026! admin
```

> [!IMPORTANT]
> **Jaminan Keamanan Data:** Skrip reset password di atas **HANYA memperbarui 1 kolom kata sandi akun yang dituju**. Seluruh data booking klien, foto, inquiry, portofolio, dan laporan keuangan **tetap 100% aman dan tidak tersentuh**.

---

## 📜 Katalog Skrip Otomasi (`scripts/`)

Dokumentasi detail seluruh skrip utilitas proyek tersedia di **[`scripts/README.md`](./scripts/README.md)**:

* `npm run seed`: Inisialisasi awal database, paket default, dan akun admin.
* `npm run reset:admin`: Reset password admin secara aman.
* `npm run migrate`: Menjalankan migrasi skema tabel DDL.
* `npm run db:reset`: Pengosongan data transaksi testing (*development only*).
* `npm test`: Menjalankan rangkaian unit test Jest.
* `npm run health`: Memeriksa kesehatan endpoint API engine.

---

## 🛡️ Standar Operasional: Tata Kelola Dua Arah (Two-Way Governance Protocol)

Sistem memberlakukan **Protokol Tata Kelola Dua Arah (*Closed-Loop Governance*)** antara **Server Deploy / Hermes** (di server produksi) dan **Tim Pengembang (AMS & AGY / Claude / Dev Agent)** (di lingkungan pengembangan) untuk memastikan keaslian audit, mencegah tabrakan commit (*merge conflict*), dan menjamin penyelesaian masalah yang terverifikasi murni.

```
┌────────────────────────────────────────────────────────┐
│             SERVER DEPLOY / HERMES (LAPANGAN)          │
│  • Melakukan Deep Audit & Pengetesan di Server         │
│  • 🚫 DILARANG KERAS mengubah kode produksi (*.js)     │
│  • 🚫 DILARANG KERAS mengedit/menimpa MD audit lama    │
│  • 📝 HANYA membuat berkas MD baru di folder AUDIT/   │
│  • 🚀 Lakukan `git push` berkas audit baru             │
└───────────────────────────┬────────────────────────────┘
                            │ (Notifikasi & Laporan)
                            ▼
┌────────────────────────────────────────────────────────┐
│     TIM DEVELOPER (AMS & AGY / CLAUDE / DEV AGENT)     │
│  • 📖 Membaca & menjaga keaslian laporan audit server  │
│  • 🔍 Verifikasi empiris & Root Cause Analysis (RCA)   │
│  • 🛠️ Menyusun Plan & eksekusi perbaikan kode (Zero BA)│
│  • 🧪 Menjalankan unit test & verifikasi menyeluruh   │
│  • 📑 WAJIB membuat Laporan Balasan di:               │
│       📁 master_docs/04_RESPON_MAINTENANCE/            │
└────────────────────────────────────────────────────────┘
```

👉 **Pusat Rekam Jejak Audit:** [`master_docs/03_LAPORAN_AUDIT/`](./master_docs/03_LAPORAN_AUDIT/README.md)  
👉 **Pusat Respon Balik Developer:** [`master_docs/04_RESPON_MAINTENANCE/`](./master_docs/04_RESPON_MAINTENANCE/README.md)

---

## 🔒 Rekomendasi Keamanan Produksi

1. **Ganti Password Default**: Segera ganti password default akun admin (`admin123`) via menu **Settings > Keamanan** setelah login pertama kali.
2. **Kunci Otomatis**: `SESSION_SECRET`, `JWT_SECRET`, dan `WEBHOOK_SECRET` **100% otomatis di-generate secara acak 64-karakter hex oleh `deploy.sh`** saat pertama kali deployment.
3. **Reverse Proxy & HTTPS**: Selalu gunakan Nginx Reverse Proxy dengan enkripsi SSL Let's Encrypt di depan port `8081`.
4. **Kepemilikan Berkas**: Selalu operasikan aplikasi di bawah user non-root (`amsdev:amsdev`).

---
*Luxenary.co Wisuda Management System v2.1.0*