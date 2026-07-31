# DOKUMENTASI UTAMA & PANDUAN LENGKAP PLATFORM WISUDA v2.0
**Master Blueprint, Technical Manual, Workflow SOP & Operational Guide**

*Versi Dokumen: 2.0.0 — Terakhir Diperbarui: 31 Juli 2026*

---

## DOKUMEN NAVIGATION / DAFTAR ISI
1. [Bab 1: Gambaran Umum & Arsitektur Sistem](#bab-1-gambaran-umum--arsitektur-sistem)
2. [Bab 2: Alur Operasional 3 Tahap Pasca Produksi (Workflow SOP)](#bab-2-alur-operasional-3-tahap-pasca-produksi-workflow-sop)
3. [Bab 3: Panduan Integrasi & Otorisasi Google Drive (3-Step Wizard)](#bab-3-panduan-integrasi--otorisasi-google-drive-3-step-wizard)
4. [Bab 4: Penanganan Media & Kebijakan Retensi Storage](#bab-4-penanganan-media--kebijakan-retensi-storage)
5. [Bab 5: Panduan Portal Freelance & Penggajian (Payroll)](#bab-5-panduan-portal-freelance--penggajian-payroll)
6. [Bab 6: Referensi API Endpoint & Troubleshooting](#bab-6-referensi-api-endpoint--troubleshooting)

---

## Bab 1: Gambaran Umum & Arsitektur Sistem

### 1.1 Pendahuluan
Platform Wisuda v2.0 adalah sistem manajemen operasional foto wisuda berbasis web yang dirancang khusus untuk menyederhanakan alur kerja dari prospek awal (*inquiry*), booking client, penugasan fotografer freelance, pengelolaan galeri foto di Google Drive, hingga pelunasan pembayaran dan payroll.

### 1.2 Teknologi Utama (*Tech Stack*)
- **Backend Core**: Node.js v18+, Express.js, SQLite (via `better-sqlite3` dengan WAL mode).
- **Frontend SPA Admin**: Vue 3 Single Page Application (SPA), Vite, TailwindCSS.
- **Frontend Portals**: Vanilla HTML5, CSS3, JavaScript, Alpine.js (Public Pages & Freelance Portal).
- **Integrasi Cloud**: Google Drive API v3 (OAuth2 Client Credentials & Service Account Bot Support).
- **WhatsApp Notification Service**: Integrasi Wa.me & Baileys/WA-Gateway Service.

### 1.3 Prinsip Arsitektur Utama
1. **Single Control Admin Panel (Kontrol Penuh di Admin)**:
   Admin memegang kendali 100% atas status booking, konfirmasi penerimaan berkas foto, pemetaan folder Google Drive, dan rilis galeri seleksi ke client.
2. **Simplified Freelance Portal (Portal Freelance yang Sederhana)**:
   Portal fotografer disederhanakan tanpa kerumitan kendali. Fotografer hanya fokus pada 3 tugas utama: melihat jadwal sesi foto, mengonfirmasi `Photo Shoot Selesai`, dan meminta pembayaran fee via WhatsApp link.
3. **Penyimpanan Berkas Terpusat & Bebas Boomerange Error**:
   Database mengelola state transisi secara ketat dengan penanganan error SQLite dan validasi probe ke Google API sebelum menyimpan kredensial.

---

## Bab 2: Alur Operasional 3 Tahap Pasca Produksi (Workflow SOP)

Sistem mengadopsi alur operasional 3 tahap yang linier dan presisi:

```
[Tahap 1: Inquiry] ──> [Tahap 2: Client & Booking] ──> [Tahap 3: Post Production]
  (Prospek/DP)            (Jadwal & Pelunasan)           (Terima File -> Staging -> Final)
```

### 2.1 Tahap 1: Inquiries (Manajemen Prospek & DP)
- Client mengajukan reservasi melalui form publik (`inquiry.html`).
- Admin mengatur estimasi biaya, biaya transportasi (*transport charge*), serta paket yang dipilih.
- Admin menekan tombol **`Kirim Quotation`** untuk mengirimkan token konfirmasi booking unik (`booking_tokens`) ke WhatsApp Client.
- Client membayar DP (50%), Admin menekan tombol **`Verifikasi DP`** ➔ Data berpindah secara otomatis ke **Tahap 2 (Client/Booking)**.

### 2.2 Tahap 2: Client & Booking (Penugasan & Pelunasan)
- Admin menugaskan Fotografer Freelance (dapat dilakukan secara *single assignment* atau *bulk assign*).
- Penugasan otomatis berada pada status `accepted` (Fotografer langsung melihat jadwal di Portal Freelance).
- **Aturan Transisi Pelunasan ➔ Post Production**:
  - **Skenario A (Client Bayar 100% Lunas dari Awal):** Begitu sesi photo shoot selesai (`Photo Shoot Selesai`), booking **langsung berpindah ke Tahap 3 (Post Production)**.
  - **Skenario B (Client Bayar DP 50%):** Setelah sesi photo shoot selesai, booking berada di status **Menunggu Pelunasan**. Setelah Admin memverifikasi Pelunasan (100% Lunas) di Admin Panel ➔ booking **otomatis berpindah ke Tahap 3 (Post Production)**.

### 2.3 Tahap 3: Post Production (Pasca Produksi 3-Langkah)

```
[Langkah 1: Terima File] ──> [Langkah 2: Upload Staging] ──> [Langkah 3: Push Staging]
(Tombol Amber Aktif)         (Upload File di Drive)          (Tombol Animated Bounce)
```

1. **Langkah 1 (Kondisi Awal / Menunggu File)**:
   - **Badge Tahap:** `Menunggu File / Berkas`
   - **Indikator Fotografer:** `⌛ Belum Disetor` (Amber animate-pulse)
   - **Tombol Aksi:** **`📦 Terima File`** (Tombol aktif warna amber)
   - **Tombol `🚀 Push Staging`:** Berwarna Abu-Abu (*Disabled*).
2. **Langkah 2 (Admin Klik `📦 Terima File`)**:
   - Status Tahap berubah menjadi **`Menunggu Upload Staging`**.
   - Indikator Fotografer otomatis berubah seragam menjadi **`✓ File Diterima`** (Warna hijau bersih, tanpa ikon kardus `📦 Fisik`).
   - Tombol **`☁️ Upload File`** di kolom Status Drive aktif untuk Admin menautkan/mengunggah foto ke Drive Staging.
3. **Langkah 3 (Upload Selesai & Foto Terdeteksi)**:
   - Kolom Status Drive menampilkan `✅ Ready Push (X File)`.
   - Tombol **`🚀 Push Staging`** **otomatis berubah warna terang + bernyawa dengan animasi bergerak (*bounce*)**.
   - Admin klik **`🚀 Push Staging`** ➔ Galeri Seleksi langsung terpublikasi ke client (`Menunggu Pilihan Client`).
4. **Siklus Highlight & Final Edit**:
   - Mengikuti pola presisi yang sama: Tombol Push (`🚀 Push Highlight` / `🚀 Push Final Edit`) **tetap abu-abu** saat foto 0, dan **otomatis berubah warna + animasi bergerak** begitu foto di-upload ke Drive.

---

## Bab 3: Panduan Integrasi & Otorisasi Google Drive (3-Step Wizard)

Untuk menjamin keamanan dan keabsahan koneksi Google Drive Studio, Admin Panel menerapkan **3-Step Wizard Workflow dengan Mandatory Verification**:

### 3.1 Step 1: Google OAuth Credentials (Mandatory Verification)
1. Buka menu Admin Panel > Settings > Google Drive Tab.
2. Isi form **Client ID** dan **Client Secret** dari Google Cloud Console.
3. Klik **`Verifikasi & Simpan Credential`**.
4. **Mekanisme Backend**: Sebelum menyimpan ke database, backend wajib melakukan *probe verification test* ke endpoint Google (`https://oauth2.googleapis.com/token`).
   - Jika Google merespon `invalid_client` (ID & Secret tidak cocok/salah), proses simpan **DITOLAK** dan melempar error penolakan yang jelas.
   - Jika verifikasi lolos, kredensial tersimpan aman di database.

### 3.2 Step 2: Tautkan Akun Google Drive (Gmail Studio)
- Hanya terbuka jika Step 1 sudah 100% terkonfigurasi dan terverifikasi cocok.
- Klik tombol **`🔗 Tautkan Akun Google Drive (OAuth)`**.
- Otorisasi akun Gmail Studio Anda melalui jendela popup Google OAuth.

### 3.3 Step 3: Master Root Folder Drive Studio
- Hanya terbuka jika Step 2 sudah 100% berhasil ditautkan.
- Masukkan URL atau Folder ID utama studio di Google Drive.
- Sistem akan otomatis membuat struktur sub-folder untuk setiap booking baru:
  ```text
  [Root Folder Studio]
     ├── Wisuda_ClientA_2026/
     │      ├── 01_Staging_Seleksi/
     │      ├── 02_Highlight_Edit/
     │      └── 03_Final_Edit/
  ```

---

## Bab 4: Penanganan Media & Kebijakan Retensi Storage

### 4.1 Spesifikasi Handling Impor Foto
1. **Async Background Processing**: Endpoint API merespon dalam `< 1s` untuk mencegah HTTP 504 Gateway Timeout.
2. **Hard Network Timeout**: Limit 30 detik per pengunduhan berkas menggunakan `AbortSignal.timeout(30000)`.
3. **Exponential Backoff Retry**: Otomatis mengulang saat menemuai HTTP `429 Too Many Requests` atau `500 Server Error` (jeda 1.5s ➔ 3.0s ➔ 6.0s).

### 4.2 Aturan Pembersihan Storage Otomatis (*Storage Retention Rules*)

| Direktori Storage | Jenis File | Aturan Retensi Cleanup |
|---|---|---|
| `DATA/uploads/portfolio/` | WebP Portfolio Published | Permanen (sampai dihapus admin) |
| `DATA/uploads/gallery_cache/` | Cache Thumbnail Proxy (`w400`/`w800`) | Dibersihkan otomatis saat highlight diupload atau TTL 7 hari. |
| `DATA/uploads/staging_uploads/` | Foto mentah sementara | Otomatis dihapus saat delivery final edit selesai. |
| `DATA/uploads/payment-proofs/` | Bukti Transfer DP / Pelunasan | Otomatis dihapus oleh Cron setelah 90 hari booking completed. |
| `DATA/uploads/invoices-client/` | PDF Kontrak & Invoice Client | Otomatis dihapus oleh Cron setelah 30 hari booking completed. |

---

## Bab 5: Panduan Portal Freelance & Penggajian (Payroll)

### 5.1 Hak Akses Portal Freelance (`freelance-portal.html`)
Freelancer mengakses portal menggunakan **Kode Akses Unik** yang di-generate dari Admin Panel. Hak akses dibatasi secara ketat untuk kenyamanan dan keamanan:
- **Tampilan Jadwal Sesi Foto**: Melihat nama client, tanggal wisuda, lokasi, dan jam sesi foto.
- **Tombol `📸 Photo Shoot Selesai`**: Diklik fotografer setelah sesi foto di lapangan selesai.
- **Tombol `💬 Minta Payment Fee`**: Membuka tautan WhatsApp langsung ke Admin untuk menagih honor foto.
- **Pengaturan Profil & Bank**: Memperbarui nomor rekening bank dan domisili kota.

### 5.2 Penggajian Freelance (Admin Payroll)
- Admin melihat daftar honor fotografer berdasarkan tarif default atau tarif per-assignment (`fg_fee`).
- Admin menekan tombol **`Bayar Gaji / Transfer Payout`** ➔ status payout berubah menjadi `transferred` dan invoice gaji otomatis ter-generate.

---

## Bab 6: Referensi API Endpoint & Troubleshooting

### 6.1 Daftar Endpoint Utama API Backend

#### Admin Endpoints (`/api/admin`)
- `GET /api/admin/dashboard/stats` — Statistik pendapatan & status booking.
- `GET /api/admin/inquiries` — Daftar prospek inquiry.
- `POST /api/admin/bookings/:id/verify-dp` — Verifikasi pembayaran DP.
- `POST /api/admin/bookings/:id/verify-balance` — Verifikasi pelunasan invoice.
- `POST /api/admin/post-production/:booking_id/confirm-done` — Konfirmasi terima berkas foto dari FG (Langkah 1 Post Production).
- `POST /api/admin/post-production/:booking_id/upload-staging` — Simpan link Drive Staging.
- `POST /api/admin/post-production/:booking_id/publish-staging` — Publikasi galeri seleksi ke client (Langkah 3 Post Production).
- `POST /api/admin/post-production/:booking_id/send-link` — Kirim link foto final ke client.
- `POST /api/admin/payouts` — Catat pembayaran gaji freelancer.
- `POST /api/admin/settings/drive-credentials` — Simpan Kredensial OAuth Google Drive dengan probe test.

#### Public & Freelance Portal Endpoints (`/api/public`)
- `GET /api/public/settings` — Informasi publik studio & logo.
- `GET /api/public/freelance-portal/schedule` — Jadwal fotografer berdasarkan kode akses.
- `POST /api/public/freelance-portal/confirm-session` — Konfirmasi photo shoot selesai oleh fotografer.
- `GET /api/public/selection/:booking_id` — Galeri foto seleksi untuk client.
- `POST /api/public/selection/:booking_id/submit` — Client mengirimkan foto pilihan.

---

### 6.2 Panduan Troubleshooting Umum

1. **Gagal Simpan Kredensial Google Drive (Error: `invalid_client`)**:
   * *Penyebab:* Client ID atau Client Secret yang dimasukkan tidak cocok atau belum diotorisasi di Google Cloud Console.
   * *Solusi:* Periksa kembali Authorized Redirect URIs di Google Cloud Console: `http://localhost:8081/api/admin/auth/google/callback`.
2. **Tombol Push Staging Berwarna Abu-Abu (Disabled)**:
   * *Penyebab:* Jumlah foto di Drive Staging masih 0 atau folder belum di-scan.
   * *Solusi:* Klik tombol `☁️ Upload File` / tautkan folder Drive Staging yang berisi foto, lalu refresh. Tombol akan otomatis bernyawa dengan animasi bergerak (*bounce*).
3. **Layar Blank di Admin Panel**:
   * *Penyebab:* Caching browser pada berkas JavaScript SPA lama.
   * *Solusi:* Lakukan Hard Refresh di browser (`Ctrl + Shift + R` atau `Cmd + Shift + R`).

---

*Wisuda Platform Master Manual v2.0 — Produced for Studio Production Operations.*
