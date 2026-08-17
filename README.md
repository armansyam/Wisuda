# Wisuda Platform — Luxenary.co Guide & Documentation

Platform Manajemen Dokumentasi Wisuda **Luxenary.co** adalah sistem terintegrasi yang menangani seluruh alur reservasi fotografi wisuda: mulai dari konsultasi awal (*inquiry*), konfirmasi DP/Pelunasan, penjadwalan fotografer freelance, seleksi foto favorit klien, pengiriman berkas via Google Drive, hingga penggajian (*payroll*) fotografer dan laporan keuangan owner.

---

## 📖 Navigasi Dokumentasi Terpadu (`master_docs/`)

Seluruh dokumentasi teknis, cetak biru alur sistem, rekam jejak audit, dan laporan maintenance disatukan secara terpusat di direktori **[`master_docs/`](./master_docs/README.md)**:

| Folder / Berkas Utama | Deskripsi & Topik Bahasan |
| :--- | :--- |
| **[🧠 SYSTEM_STATE.md](./master_docs/SYSTEM_STATE.md)** | ⭐ **Living System Memory**: Status sistem terkini v2.1.0, arsitektur terkunci, dan Buku Besar Resolusi Audit (`100% PASS`). |
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
- **Headless API Engine**: Menyediakan RESTful API (`/api/v1/*`) dengan otentikasi **JWT Token (Bearer Token)**, **API Key (`X-API-Key`)**, **Session Cookie**, dan **CORS Multi-Origin** untuk dikonsumsi oleh aplikasi mobile / sistem external.
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

### 5. **Portal Freelance (`/freelance.html`)**
- Akses portal khusus fotografer untuk melihat jadwal penugasan job, detail brief shooting klien, dan check-in/out lokasi shoot. *(Seluruh pengunggahan foto wisuda master ditangani 100% terpusat oleh Admin Studio)*.

---

## 🛠️ Struktur Direktori Proyek

```text
Wisuda/
├── admin-app/          # Source code aplikasi Admin (Vue 3 + Vite) -> dibuild ke public/admin
├── master_docs/        # Pusat Dokumentasi Terpadu (System State, Flow Sistem, Panduan Teknis, Audit, Maintenance)
├── public/             # Berkas web publik (index.html, portfolio, tracking, select-photos, freelance, dll)
├── src/                # Backend Express.js (config, middleware, routes, services)
├── DATA/               # Folder runtime data (wisuda.db, uploads, backups)
├── deploy.sh           # Script otomatisasi deployment PM2
├── docker-compose.yml  # Konfigurasi containerization Docker
├── package.json        # Dependensi utama proyek
└── .env.example        # Template konfigurasi environment
```

---

## 🚀 Panduan Deployment Server Produksi (Lengkap & Terstruktur)

### 📌 1. Prasyarat Server VPS (Requirements)
- **Sistem Operasi**: Linux Ubuntu 20.04 / 22.04 LTS (Direkomendasikan RAM min. 1GB).
- **Node.js**: v18.x atau v20.x LTS.
- **Tools Tambahan**: `git`, `npm`, `pm2`, `nginx`, `certbot`.

---

### ⚡ 2. Metode A: Deployment Otomatis Script (`./deploy.sh`) — *Paling Direkomendasikan*

Script `deploy.sh` mengotomatiskan seluruh proses instalasi server dalam 1 perintah:

```bash
# 1. Kloning repositori
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda

# 2. Beri izin eksekusi & jalankan script otomatis
chmod +x deploy.sh
./deploy.sh
```

#### 🔄 Otomatisasi yang Dilakukan oleh `deploy.sh`:
1. **Penyalinan & Konfigurasi `.env`**: Otomatis membuat file `.env` dari `.env.example` jika belum ada.
2. **Kunci Keamanan Otomatis**: Membangkitkan `SESSION_SECRET`, `JWT_SECRET`, dan `WEBHOOK_SECRET` 64-karakter hex secara acak & aman.
3. **Deteksi Zona Waktu Lokal**: Otomatis mengeset `TZ=Asia/Makassar` (WITA UTC+8).
4. **Pembuatan Direktori Storage**: Membuat folder runtime `DATA/uploads`, `DATA/backups`, dan `logs`.
5. **Kompilasi Visual Admin SPA**: Menginstal dependensi dan meng-compile `admin-app` Vue 3 ke `public/admin`.
6. **Mendaftarkan 2 Process Daemon di PM2**:
   - `wisuda-api`: Server backend Express JS API Engine.
   - `wisuda-cron`: Background worker otomatisasi retensi Drive & pengingat WA.
7. **Pemeriksaan Kesehatan (Health Check)**: Menguji kesiapan endpoint `http://localhost:8081/api/health`.

---

### 🛠️ 3. Metode B: Deployment Manual dengan PM2

Jika Anda ingin mengelola proses langkah demi langkah secara manual:

```bash
# 1. Kloning repositori & buat file .env
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda
cp .env.example .env

# 2. Install dependensi backend
npm install --omit=dev

# 3. Build SPA Admin Panel (Vue 3 + Vite)
cd admin-app
npm install
npm run build
cd ..

# 4. Buat folder direktori runtime data
mkdir -p DATA/uploads DATA/backups logs

# 5. Jalankan Service di PM2 & Simpan Auto-Start Server
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

### 🐳 4. Metode C: Deployment Menggunakan Docker Compose

```bash
# 1. Salin template .env
cp .env.example .env

# 2. Build & jalankan container di latar belakang
docker compose up -d --build

# 3. Cek log status container
docker compose logs -f
```

---

### 🌐 5. Konfigurasi Nginx Reverse Proxy & SSL (HTTPS)

Untuk mengarahkan domain produksi Anda ke port `8081` dengan enkripsi SSL HTTPS aman:

#### 1) Buat berkas konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/wisuda.conf
```

Isi dengan konfigurasi berikut (ganti `domain-anda.com` dengan domain Anda):

```nginx
server {
    listen 80;
    server_name domain-anda.com www.domain-anda.com;

    # Ukuran maksimum upload foto master ke Google Drive via browser
    client_max_body_size 500M;

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
}
```

#### 2) Aktifkan situs & jalankan SSL Certbot:
```bash
# Aktifkan konfigurasi Nginx
sudo ln -s /etc/nginx/sites-available/wisuda.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Pasang Sertifikat SSL Gratis dari Let's Encrypt (HTTPS)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

---

### 📊 6. Perawatan, Monitoring & Troubleshooting Server Produksi

- **Melihat Status Service PM2**:
  ```bash
  pm2 status
  ```
- **Melihat Log Server Real-Time**:
  ```bash
  pm2 logs wisuda-api
  pm2 logs wisuda-cron
  ```
- **Mereset / Restart Server**:
  ```bash
  pm2 restart all
  ```

---

## 🔑 Manajemen Otentikasi Admin & Penanganan Lupa Password

### 📍 Di Mana Kredensial Admin Tersimpan?
- Kredensial login Dashboard Admin (`username` & `password`) **tersimpan di dalam Database SQLite (`./DATA/wisuda.db`) pada tabel `users`**, dan **BUKAN di file `.env`**.
- Password diautentikasi dengan enkripsi satu-arah (**`bcrypt` hash**) demi keamanan standar industri.

### ❓ Mengapa Tidak Ditaruh di File `.env`?
1. **Keamanan Standar Industri**: Mencegah kebocoran kata sandi dalam bentuk *plain text* jika file `.env` tidak sengaja tersebar.
2. **Multi-User & Hak Akses Berjenjang (RBAC)**: Mendukung banyak akun pengelola (`admin`, `staff`, `superadmin`).
3. **Pembaruan Dinamis via UI**: Admin dapat mengubah username, foto profil, atau kata sandi secara langsung via menu visual **Settings > User Profile** tanpa harus merestart server.

---

### 🚨 Panduan Reset Kata Sandi Admin (Jika Lupa Password)

Jika Anda lupa kata sandi login admin, Anda dapat meresetnya kembali ke bawaan (`admin123`) dalam waktu 2 detik melalui terminal tanpa menghapus data apa pun:

```bash
# Jalankan perintah 1-baris ini di terminal proyek:
node -e "const bcrypt = require('bcrypt'); const { getDb } = require('./src/config/database'); const db = getDb(); const hash = bcrypt.hashSync('admin123', 12); db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'admin'); console.log('✅ Password admin di-reset ke admin123!');"
```

> [!IMPORTANT]
> **Jaminan Keamanan Data:** Perintah `UPDATE` di atas **HANYA menimpa 1 kolom kata sandi akun `admin`**. Seluruh data booking client, foto, inquiry, portofolio, dan laporan keuangan **tetap 100% aman dan tidak tersentuh**.

---

## 🛡️ Standar Operasional: Tata Kelola Audit & Maintenance Dua Arah (Two-Way Governance Protocol)

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
│       📁 MAINTENANCE_AUDIT/RESPON_YYYY-MM-DD_...md     │
└────────────────────────────────────────────────────────┘
```

### 📋 Aturan Khusus Server Deploy (Hermes / Auditor):
1. **Mode Read-Only Kode**: Server Deploy / Hermes **TIDAK BOLEH** mengubah kode produksi apapun di server.
2. **Append-Only Report**: Jika menemukan kendala baru atau rekomendasi, buat berkas MD baru di `AUDIT/` (contoh: `AUDIT/AUDIT_YYYY-MM-DD_<HERMES/TOPIK>.md`) dan perbarui indeks di [AUDIT/README.md](./AUDIT/README.md).
3. **Commit & Push Bersih**: Segera commit dan push berkas MD laporan audit baru agar tim developer dapat segera memverifikasi.

### 📋 Aturan Khusus Tim Pengembang (AMS & AGY / Claude / Dev Agent):
1. **Laporan Audit Bersifat Permanen (Immutable)**: Tim developer **TIDAK BOLEH** mengubah isi laporan audit yang dikirimkan server.
2. **Perbaikan Murni Tanpa Akal-akalan**: Wajib meneliti akar masalah secara jujur (*No Workaround / No Symptom Patching*).
3. **Wajib Menerbitkan Dokumentasi Respon Balik**: Setelah perbaikan selesai, tim pengembang **WAJIB** membuat laporan balasan di direktori [MAINTENANCE_AUDIT/](./MAINTENANCE_AUDIT/README.md) yang merinci status perbaikan, *code diff*, serta hasil verifikasi pasca-perbaikan.

👉 **Pusat Temuan Server:** [📁 Direktori AUDIT/](./AUDIT/README.md)  
👉 **Pusat Respon Balik Developer:** [📁 Direktori MAINTENANCE_AUDIT/](./MAINTENANCE_AUDIT/README.md)

---

## 🔒 Rekomendasi Keamanan Produksi

1. Ganti password default akun admin di menu **Settings -> Keamanan** setelah login pertama kali.
2. **Otomatisasi Kunci Keamanan:** `SESSION_SECRET`, `JWT_SECRET`, dan `WEBHOOK_SECRET` **100% otomatis di-generate secara acak & aman oleh `deploy.sh`** saat pertama kali deployment di server VPS. (Pengubahan manual di `.env` hanya diperlukan jika Anda tidak menggunakan `deploy.sh`).
3. Tempatkan Nginx Reverse Proxy atau Cloudflare Tunnel di depan port `8081` untuk mengamankan koneksi dengan HTTPS.

---
*Luxenary.co Wisuda Management System v2.1.0*