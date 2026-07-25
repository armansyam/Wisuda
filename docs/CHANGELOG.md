# 📋 Wisuda Platform — Changelog

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
