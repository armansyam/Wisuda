# 📋 Wisuda Platform — Changelog

---

## [v1.4.1] — 2026-07-28

### 📚 Konsolidasi & Restrukturisasi Dokumentasi Suite (`docs/`)
- **Penyederhanaan File Documentation**: Mengkonsolidasi 14 file `.md` yang sebelumnya terpisah-pisah dan redundan menjadi **5 file utama** yang komprehensif, terstruktur, dan mudah dipelihara:
  1. `MASTER_BLUEPRINT.md`: Master arsitektur sistem, PRD, peta direktori proyek, data flow, dan konsep UI landing page (menggabungkan `MASTER_BLUEPRINT.md`, `PRD.md`, `PLATFORM_MAP.md`, dan `PLAN_LANDING_PAGE.md`).
  2. `WISUDA_WORKFLOW.md`: End-to-end business workflow, state machine diagram Mermaid, galeri seleksi zero-storage, dan Syarat & Ketentuan (S&K) + SOP booking (menggabungkan `WISUDA_WORKFLOW.md`, `WISUDA_FLOW.md`, dan `SK_DAN_SOP_BOOKING.md`).
  3. `TECHNICAL_GUIDE.md`: Spasifikasi teknis lengkap meliputi SQLite WAL schema, 16 indexes, REST API reference endpoints, dan panduan deployment produksi PM2/Docker (menggabungkan `WISUDA_DB.md`, `WISUDA_API.md`, dan `WISUDA_DEPLOY.md`).
  4. `MEDIA_HANDLING.md`: Pengelolaan media, Sharp WebP no-crop compression engine, GDrive background importer resilience (4-tier protection), dan aturan file lifecycle retention (menggabungkan `MEDIA_HANDLING.md`, `PENANGANAN_TIMEOUT_DAN_RATE_LIMIT_GDRIVE.md`, dan `SHARP_KOMPRESI_GAMBAR_PORTOFOLIO.md`).
  5. `CHANGELOG.md`: Catatan rilis dan riwayat versi sistem.
- **Pembersihan Sub-Dokumen Redundan**: Menghapus 10 file markdown lama (`PRD.md`, `PLATFORM_MAP.md`, `PLAN_LANDING_PAGE.md`, `WISUDA_FLOW.md`, `SK_DAN_SOP_BOOKING.md`, `PENANGANAN_TIMEOUT_DAN_RATE_LIMIT_GDRIVE.md`, `SHARP_KOMPRESI_GAMBAR_PORTOFOLIO.md`, `WISUDA_DB.md`, `WISUDA_API.md`, `WISUDA_DEPLOY.md`) yang seluruh isinya telah terintegrasi secara utuh.

---

## [v1.4.0] — 2026-07-28

### 🌍 Fitur Baru: Dukungan Multibahasa (Default English & EN | ID Switcher)
- **Default Bahasa Inggris International (`EN`)**: Seluruh halaman publik (`/index.html`, `/portfolio.html`, `/tracking.html`, `/inquiry.html`, `/confirm-booking.html`) kini menyajikan copywriting Bahasa Inggris berstandar internasional secara default.
- **Language Switcher Toggle (`EN | ID`)**: Opsi pengalih bahasa instan di navbar seluruh halaman publik dengan persistensi preferensi via `localStorage` sehingga preferensi pengguna tersimpan di seluruh sesi dan navigasi halaman.
- **Penerjemahan Dinamis Form Reservasi & Live Tracking**:
  - Formulir Reservasi (`/inquiry.html` & `/confirm-booking.html`) lengkap dengan terjemahan 5-step wizard, ringkasan booking, alert S&K, dan penemu paket.
  - Fungsi `getTranslatedStatusLabel()` untuk menerjemahkan banner status booking (`Confirmed (Active)`, `Pending Confirmation`, `Photos Ready for Download`, `Session Completed`, dll.).
  - Generator `get timelineEvents` dinamis untuk menerjemahkan 10 alur kerja dokumentasi secara realtime (`Booking Received`, `Deposit Verification`, `Active Schedule`, `Photographer Assignment`, `Shooting Schedule`, `Photo Session & File Submission`, `Final Payment Confirmation`, `Photo Selection`, `Highlight Photos`, `All Edited Photos`).

### 🎨 Penguncian Tema Netral & Perbaikan Spacing Layout
- **Neutral Light Theme Lock**: Menambahkan `:root { color-scheme: light !important; }` dan penguncian latar `#FAF9F6` & teks `#1A1A2E` di semua halaman publik untuk mencegah perubahan warna otomatis akibat mode gelap (*Dark Mode*) OS browser mobile/desktop.
- **Visual Spacing Optimization**: Penyelarasan *vertical padding* antar-section (misal: jarak FAQ ke CTA dirapatkan dari 192px menjadi 80px) untuk estetika yang lebih padat, simetris, dan mewah.
- **Tag Balance Clean Up**: Verifikasi dan perbaikan struktur penutup tag HTML 100% presisi pada seluruh berkas publik.

---

## [v1.3.1] — 2026-07-26

### 🔧 Perbaikan Bug

- **fix(public):** Tambah null guard pada `customSanitizer` phone di `POST /api/public/inquiry` dan `POST /api/public/inquiry-book`.
  - Sebelumnya: jika `client_phone` tidak disertakan dalam request body, server crash dengan `TypeError: Cannot read properties of undefined (reading 'replace')` → HTTP 500.
  - Setelah: server mengembalikan HTTP 400 Validation Error dengan pesan yang jelas.

### 🔒 Peningkatan Keamanan

- **fix(main):** Cookie session `secure` kini conditional — `true` saat `NODE_ENV=production` (HTTPS via Nginx), `false` di development/LAN.
  - Sebelumnya: hardcoded `false`, sehingga cookie dikirim via HTTP bahkan di production.

### 🏷️ Lainnya

- Version bump `package.json`: `1.2.0` → `1.3.0` (selaras dengan fitur v1.3 yang sudah rilis).
- Tambah folder `logs/` dengan `.gitkeep` untuk PM2 log output.
- Update `.gitignore`: tambah `logs/*.log`.

---

## [v1.3.0] — 2026-07-25

### ⚡ Fitur Baru: Otomasi Folder Google Drive
- **Service Account Integration**: Saat admin verifikasi DP client, sistem otomatis membuat struktur folder Google Drive via Google Service Account (background, tidak blocking response).
- Struktur folder yang dibuat: `JPG/`, `Highlight/`, `All File Edited/` — lengkap dengan permission "Anyone with link can view".
- `drive_parent_url`, `staging_drive_url`, `highlight_drive_url`, `download_url` otomatis terisi di DB.
- File kredensial: `DATA/service-account.json` (tidak masuk git).
- Konfigurasi: `GOOGLE_DRIVE_MASTER_FOLDER_ID` dan `GOOGLE_SERVICE_ACCOUNT_PATH` di `.env`.
- Endpoint test koneksi: `GET /api/admin/settings/drive-test`.

### 🖼️ Fitur Baru: Galeri Seleksi Zero-Storage dengan Disk Cache
- **Proxy dengan on-demand disk cache**: `/api/proxy/thumb/:fileId` — thumbnail `w400` di-cache ke `DATA/uploads/gallery_cache/` setelah pertama kali diambil dari Google CDN. Valid 7 hari.
- **Popup lightbox HD**: Menggunakan `sz=w800` (on-demand, tidak di-cache disk) untuk kualitas preview yang lebih baik.
- **Auto-retry silent**: Gambar gagal load diretry otomatis 3x (0.8s / 2.5s / 5s) tanpa visual dimming. Hanya tampil abu-abu jika semua retry habis.
- **Cache cleanup otomatis** di 4 titik: upload highlight, deliver final, clean-staging, client konfirmasi terima.

### 🗑️ Penghapusan: Sistem PIN Akses
- Dihapus total: endpoint `POST /verify-pin`, generate PIN 6-digit, kolom `download_password` dari semua logika aktif.
- Akses client kini **100% via Tracking Token** (`TRK-{id}-{hex}`) yang dikirim via WhatsApp.
- Keamanan lebih bersih: satu mekanisme auth, tidak ada fallback PIN.

---

*Wisuda Platform Changelog — Updated 2026-07-28*
