# 📋 Wisuda Platform — Changelog

## [v2.0.0] — 2026-07-31

### 🚀 Direct-to-Cloud Upload Architecture v2.0 untuk Subfolder Google Drive Client
- **Bypass Limitasi 100MB Cloudflare**:
  - Implementasi *client-side direct upload* dari browser Admin langsung ke endpoint **3 Subfolder Google Drive Client** (`JPG`, `Highlight`, dan `Final Editing`) di Post Production.
  - Membebaskan server dari transit file besar & menghilangkan error pemblokiran HTTP 413 Cloudflare.
- **Backend API Direct Upload (`src/routes/direct-upload.js`)**:
  - Endpoint `POST /api/v2/admin/uploads/initiate`: Menerbitkan Resumable Upload Session URI dari Google Drive API v3 untuk subfolder target.
  - Endpoint `POST /api/v2/admin/uploads/finalize`: Menerima laporan batch berkas selesai dan memperbarui database `staging_files` / metadata deliverable booking.
- **Pinia Direct Upload Store (`admin-app/src/stores/upload.js`)**:
  - Mengelola antrian upload dengan **konkuransi 5 worker paralel**.
  - Persistensi `localStorage` (`wisuda_direct_upload_queue`) untuk memulihkan (*rehydrate*) state antrian jika browser di-refresh.
- **Floating Global Uploader Component (`admin-app/src/components/GlobalUploader.vue`)**:
  - Dipasang pada tingkat root `App.vue` sehingga proses upload tetap berjalan lancar saat Admin berpindah-pindah menu sidebar di Admin Panel.
  - Tampilan visual modern dengan progress bar per file, total progress, indikator status, serta tombol Retry/Cancel.
- **Pengujian & Verifikasi System (100% PASS)**:
  - Penambahan test suite baru `src/__tests__/direct_upload.test.js`.
  - Seluruh 20 test suites (90 test cases) **LULUS 100% PASS**.

---

## [v1.4.2] — 2026-07-31

### 🔒 Feature Toggle Akses Portal Freelance, Migrasi Session Store Native, & Patch Kompatibilitas PM2 Linux
- **Feature Toggle Akses Portal Freelance (`enable_freelance_portal`)**:
  - Dibuatkan opsi sakelar di **Admin Settings > General** untuk beralih antara **Mode Full Admin (Portal OFF)** dan **Mode Freelance Portal Aktif (Portal ON)**.
  - Saat Portal OFF: Seluruh alur penugasan, pemantauan shoot, dan pasca-produksi dikendalikan 100% dari Admin Panel. Link portal menampilkan layar informasi maintenance.
  - Saat Portal ON: Portal freelance dikonfigurasi menjadi *Lightweight Portal* (hanya untuk cek jadwal & gaji).
- **Synchronized Dual Control untuk Sesi Foto Selesai**:
  - Pemicu status *"Selesai Sesi"* dapat dieksekusi dari Portal Freelance maupun langsung dari tombol `📸 Selesai Sesi` di Admin Panel. Keduanya sinkron real-time ke database.
- **Migrasi Session Store ke Native `BetterSqliteStore` (`src/config/session-store.js`)**:
  - Penggantian total `connect-sqlite3` dengan custom session store berbasis `better-sqlite3` untuk mengeliminasi ketergantungan pada native C++ binding `sqlite3` legacy yang rentan *crash* di server Linux PM2.
- **Patch Kompatibilitas PM2 Linux Multi-Statement SQL**:
  - Pemisahan `CREATE TABLE` dan `CREATE INDEX` menjadi 2 panggilan `.exec()` terpisah pada `src/config/session-store.js` untuk kompatibilitas 100% dengan `better-sqlite3` pada PM2 Linux.
- **Penyempurnaan Validator Status Booking (`src/routes/admin.js`)**:
  - Pendaftaran eksplisit status `'editing'` dan `'uploaded'` pada skema validasi `body('status').isIn([...])` dan `validTransitions`, menjamin kelancaran perpindahan 3 Tab Pipeline Admin (*Inquiries* ➔ *Client Produksi* ➔ *Post Production*).
- **Pengujian & Verifikasi System (100% PASS)**:
  - Seluruh 19 test suites (87 test cases) lulus 100% PASS.

---

## [v1.4.7] — 2026-07-30

### ⚡ Audit Kode, Optimasi Performa Frontend, & Dynamic Admin Session Timeout
- **Optimasi Performa Jaringan `tracking.html`**:
  - Pengubahan interval polling dari 3s menjadi **15s** dengan fitur *Visibility-Aware Suspend* (`document.hidden`), mencegah pemborosan CPU & bandwidth database saat tab tidak fokus.
  - Perbaikan image fallback broken photo menggunakan SVG netral dan pembersihan link favicon hardcoded.
- **Eliminasi Tailwind CDN & Penyeragaman Styling Publik (7 Halaman)**:
  - Penggantian total `<script src="https://cdn.tailwindcss.com"></script>` dengan CSS terkompilasi lokal `/css/tailwind.min.css` di `inquiry.html`, `moodboard.html`, `portfolio.html`, `confirm-booking.html`, `select-photos.html`, `payout-invoice.html`, dan `freelancer-register.html`.
  - Penyeragaman versi Alpine.js (`3.15.x`) dan penyelarasan versi cache Service Worker PWA (`amsdev-pwa-v4` di `sw.js`).
- **Sinkronisasi Dinamis Admin Session Timeout**:
  - Penghapusan hardcode 10 menit di `admin-app/src/stores/auth.js` (`IDLE_TIMEOUT`).
  - Penyelarasan *Client-Side Idle Watcher* dengan setting database `session_timeout_minutes` (`SESSION TIMEOUT ADMIN` di UI). Sekarang saat admin mengatur ke **480 menit (8 Jam)** di UI, baik server cookie maupun layar idleWatcher di frontend secara otomatis kompak berlaku 480 menit.
- **Pembersihan Kode Yatim & Pembaruan Repositori**:
  - Pembuangan file orphan `src/routes/health.js` dan pembaruan laporan audit di `docs/code_audit_report.md`.
  - Seluruh 19 test suites (87 test cases) lulus 100% PASS.

---

## [v1.4.6] — 2026-07-30

### 🛡️ Modal Konfirmasi Hapus Client, Auto-Retry Health Check, & 4 Test Suite Baru
- **Fitur Hapus Client Permanen & Modal Swal.fire (`FinancesView.vue` & `BookingsView.vue`)**:
  - Penambahan tombol **`🗑️ Hapus`** di Arsip Client (`/admin/archive`) dan penguncian eksekusi menggunakan modal visual **SweetAlert2 (`Swal.fire`) dengan `await`** untuk mencegah *auto-confirm bug* native browser dialog.
  - Peringatan status-aware: Peringatan ketat pemusnahan transaksi untuk status `SELESAI` vs konfirmasi pembersihan data `BATAL`.
- **Ketahanan Health Check Verification (`deploy.sh`)**:
  - Penambahan *Smart Auto-Retry Loop* (5x percobaan dengan jeda 2s) pada tahap verifikasi health check API Engine untuk mengakomodasi jeda *warm-up* SQLite WAL mode saat PM2 restart.
- **Ekspansi Suite Pengujian Berdedikasi (19 Test Suites / 87 Test Cases Lulus 100%)**:
  - Penambahan 4 test suite baru: `archive_and_deletion.test.js`, `oauth_verification_wizard.test.js`, `daily_capacity_limit.test.js`, dan `system_hard_reset.test.js`.
  - Seluruh 19 test suites (87 test cases) lulus 100% PASS.

---

## [v1.4.5] — 2026-07-30

### 🛡️ Penyempurnaan Cache-Control Watermark & Ketahanan Build Server (`deploy.sh`)
- **Penyempurnaan Cache-Control Watermark Script (`/js/watermark.js`)**:
  - Penambahan header `public, max-age=0, no-cache, must-revalidate` pada middleware [`src/middleware/cacheControl.js`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/middleware/cacheControl.js#L11) untuk menghentikan pembekuan disk cache 1 tahun (`immutable`) oleh browser pada script watermark.
- **Stabilisasi Build Production Admin SPA pada `deploy.sh`**:
  - Pengubahan alur kompilasi `admin-app` di [`deploy.sh`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/deploy.sh#L145) menjadi `NODE_ENV=development npm install --include=dev && npm run build` untuk menjamin penginstalan `devDependencies` (Vite, Vue, Tailwind) di server VPS produksi.
  - Penambahan validasi *exit status code* (`exit 1`) otomatis jika proses build Vite gagal, mencegah *silent failure*.
- **Suite Testing & Verifikasi Integritas (100% PASS)**:
  - Penambahan unit test baru di `src/__tests__/cache_control.test.js` untuk rute `/js/watermark.js`.
  - Verifikasi seluruh 15 test suite (76 tests) lulus 100% PASS tanpa regresi.

---

## [v1.4.4] — 2026-07-30

### 🚀 Penyempurnaan Alur Pemindahan Kepemilikan Drive & Pembersihan UI
- **Pemberian Status Direct Transferred (`transferred`)**:
  - Saat Admin mengonfirmasi undangan pemindahan kepemilikan Drive di Admin Panel (`/admin/archive`), status database dan UI **langsung diset menjadi `transferred`** tanpa status `transferring` yang menunda.
- **Pembersihan Notifikasi & Dashboard Klien**:
  - Seluruh tombol oranye request & notifikasi permohonan transfer di Admin Panel **langsung hilang bersih**.
  - Pada web tracking klien (`tracking.html`), kotak permohonan kuning langsung hilang total dan digantikan oleh badge bersih **`👤 Hak milik folder Drive telah ditransfer ke: <email_klien>`**.
- **Stabilisasi Suite Pengujian Backend (`npm test`)**:
  - Penambahan bendera `--runInBand` pada skrip pengujian `package.json` untuk mencegah bentrokan kunci SQLite (*database lock collision*) saat pengujian berjalan paralel.
  - **Seluruh 60 unit/integration tests (9 test suites) lulus 100% PASS**.
- **Pembaruan Menyeluruh Suite Dokumentasi (`docs/`)**:
  - Penyelarasan `BUG_REPORT.md`, `MASTER_BLUEPRINT.md`, `TECHNICAL_GUIDE.md`, `WISUDA_WORKFLOW.md`, `PANDUAN_SETUP_GOOGLE_DRIVE.md`, dan `MEDIA_HANDLING.md` ke versi **1.4.4**.

---

## [v1.4.3] — 2026-07-29

### 📚 Pembaruan Menyeluruh Suite Dokumentasi System (`docs/`)
- **Pembaruan Panduan Google Drive (`docs/PANDUAN_SETUP_GOOGLE_DRIVE.md`)**:
  - Dokumentasi resmi alur **3-Step Google OAuth Wizard** (Step 1: Input Kredensial + Mandatory Probe Verification Test ke Google API, Step 2: Tautkan Akun Google Drive, Step 3: Master Root Folder Drive).
  - Dokumentasi sistem **Smart Hybrid Storage** yang mengombinasikan Opsi A (Direct Link Fallback), Opsi B (Web Upload OAuth), dan Service Account Bot 24/7.
- **Pembaruan Master Blueprint (`docs/MASTER_BLUEPRINT.md`)**:
  - Bump versi ke **v1.4.3**. Penyelarasan arsitektur utama dengan validasi kapasitas harian inquiry (`max_daily_capacity`), multi-bank management, EN | ID language switcher, dan developer watermark toggle.
- **Pembaruan Business Workflow (`docs/WISUDA_WORKFLOW.md`)**:
  - Pembaruan diagram Mermaid business flow & state machine. Tambahan step validasi kuota harian pemesanan sebelum inquiry diterima dan penyesuaian SOP DP non-refundable serta retensi Drive.
- **Pembaruan Technical Guide (`docs/TECHNICAL_GUIDE.md`)**:
  - Pembaruan registri tabel `settings` (mencakup `google_oauth_client_id`, `google_oauth_client_secret`, `google_oauth_tokens`, `max_daily_capacity`, `bank_accounts`).
  - Penambahan endpoint REST API Matrix untuk probe verification test (`POST /api/admin/settings/verify-oauth-credentials`), OAuth callback, status Drive, transfer ownership, dan check kapasitas harian.
- **Pembaruan Media Handling (`docs/MEDIA_HANDLING.md`)**:
  - Penyelarasan strategi penyimpanan media Smart Hybrid dengan spesifikasi Sharp WebP compression engine (`fit: inside`, max 1000px, quality 85%).
- **Audit & Bug Report (`docs/BUG_REPORT.md`)**:
  - Penyelarasan status audit sistem dan catatan temuan `BUG-20260729-01`.

---

## [v1.4.2] — 2026-07-29

### 🐛 Dokumentasi Laporan Bug & Audit Scanning Komprehensif (`docs/BUG_REPORT.md`)
- **Penerbitan Dokumen Official Bug Report**: Diterbitkan berkas [`docs/BUG_REPORT.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/BUG_REPORT.md) yang mencatat secara mendalam insiden `BUG-20260729-01` (kebocoran Card Google Drive ke seluruh subtab di `SettingsView.vue` akibat terputusnya tag pembungkus `v-show` pada baris 492).
- **Hasil Comprehensive Scan Audit**:
  - Audit 13 berkas Vue Admin App (`admin-app/src/views/*.vue`): 12 berkas aman dan simetris, 1 berkas teridentifikasi bug `BUG-20260729-01`.
  - Audit 9 berkas Public Portal HTML (`public/*.html`): 9 berkas 100% aman, simetris, dan ter-bind Alpine.js secara terisolasi.
- **Formalisasi 3-Step Agent Operating Protocol**: Penetapan protokol penegakan kualitas ketat (Pre-Edit Scope Audit, Post-Edit Diff Verification, Multi-State Sanity Check) untuk mencegah regresi di seluruh pengerjaan workspace.

---

## [v1.4.1] — 2026-07-28

### 📚 Konsolidasi & Restrukturisasi Dokumentasi Suite (`docs/`)
- **Penyederhanaan File Documentation**: Mengkonsolidasi 14 file `.md` yang sebelumnya terpisah-pisah dan redundan menjadi **5 file utama** yang komprehensif, terstruktur, dan mudah dipelihara:
  1. `MASTER_BLUEPRINT.md`: Master arsitektur sistem, PRD, peta direktori proyek, data flow, dan konsep UI landing page.
  2. `WISUDA_WORKFLOW.md`: End-to-end business workflow, state machine diagram Mermaid, galeri seleksi zero-storage, dan Syarat & Ketentuan (S&K) + SOP booking.
  3. `TECHNICAL_GUIDE.md`: Spesifikasi teknis lengkap meliputi SQLite WAL schema, 16 indexes, REST API reference endpoints, dan panduan deployment produksi PM2/Docker.
  4. `MEDIA_HANDLING.md`: Pengelolaan media, Sharp WebP no-crop compression engine, GDrive background importer resilience (4-tier protection), dan aturan file lifecycle retention.
  5. `CHANGELOG.md`: Catatan rilis dan riwayat versi sistem.

---

## [v1.4.0] — 2026-07-28

### 🌍 Fitur Baru: Dukungan Multibahasa (Default English & EN | ID Switcher)
- **Default Bahasa Inggris International (`EN`)**: Seluruh halaman publik menyajikan copywriting Bahasa Inggris berstandar internasional secara default.
- **Language Switcher Toggle (`EN | ID`)**: Opsi pengalih bahasa instan di navbar seluruh halaman publik dengan persistensi preferensi via `localStorage`.

---

*Wisuda Platform Changelog — Updated 2026-07-29*
