# 📋 Wisuda Platform — Changelog

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

### 🗑️ Penghapusan: Folder Staging Lama
- Folder `DATA/uploads/staging_uploads/` dan seluruh kode terkait upload file fisik dihapus.
- Digantikan dengan sistem zero-storage: hanya simpan `fileId` + `filename` di DB, gambar diambil langsung dari Google Drive via proxy.

### 🔧 Perbaikan
- `retryImage()` tidak lagi set `opacity = 0.4` selama retry — gambar popup tidak redup.
- Retry untuk popup menggunakan URL yang benar (`sz=w800`) bukan fallback ke grid `w400`.
- `ensureBookingToken()` hanya generate `tracking_token` — tidak lagi generate `download_password`.
- Semua endpoint yang sebelumnya menerima PIN sebagai alternatif auth kini hanya menerima tracking token.
- Retention cron tidak lagi clear `download_password` (kolom sudah tidak digunakan).

### 📦 Dependensi Baru
- `googleapis@^173.0.0` — Google Drive API v3 untuk otomasi folder.

### 📄 Dokumentasi Diperbarui
- `WISUDA_WORKFLOW.md` → v1.3: tambah flow otomasi Drive, arsitektur galeri zero-storage, hapus PIN dari alur.
- `WISUDA_FLOW.md` → v1.3: tambah tabel komponen, tabel keamanan, alur galeri.
- `.env.example` → tambah `GOOGLE_SERVICE_ACCOUNT_PATH` dan `GOOGLE_DRIVE_MASTER_FOLDER_ID`.

---

## [v1.2.0] — 2026-07-25 (Sebelumnya)

### Fitur
- Migrasi total dari disk-based staging ke DB-record-based (URL Google Drive).
- Proxy endpoint `/api/proxy/thumb/:fileId` untuk streaming thumbnail Drive.
- Drive Mapping admin: set link folder induk, JPG, Highlight, Final sekali di awal.
- Tombol "Upload Staging" sebagai trigger scraping — tidak auto-trigger saat drive mapping disimpan.
- `@error` handler pada gambar galeri untuk auto-retry.

### Perubahan
- Folder `DATA/uploads/staging_uploads/` dihapus.
- `staging_drive_url` tidak lagi auto-trigger scraping saat disimpan.

---

## [v1.1.x] — Sebelumnya

- Sistem PIN akses untuk client (dihapus di v1.3).
- Upload fisik foto ke server untuk galeri seleksi (dihapus di v1.2).
- Sistem staging berbasis disk dengan Sharp compress untuk galeri (dihapus di v1.2).
