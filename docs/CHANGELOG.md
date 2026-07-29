# 📋 Wisuda Platform — Changelog

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
