# BUKU PANDUAN MASTER ENSIKLOPEDIS PLATFORM WISUDA v2.0
**Spesifikasi Lengkap Arsitektur, Skema Database, Workflow SOP, Integrasi Drive, Media Handling, API Endpoints, Matriks Tombol UI, & Troubleshooting**

*Versi Dokumen: 2.0.0 — Terakhir Diperbarui: 31 Juli 2026*

---

## DOKUMEN NAVIGATION / DAFTAR ISI
1. [Bab 1: Gambaran Umum, Arsitektur Sistem & Arsitektur Kode](#bab-1-gambaran-umum-arsitektur-sistem--arsitektur-kode)
2. [Bab 2: Spesifikasi Skema Database SQLite (12 Tabel Lengkap)](#bab-2-spesifikasi-skema-database-sqlite-12-tabel-lengkap)
3. [Bab 3: SOP Alur Operasional 3-Tahap Pasca Produksi (End-to-End Workflow)](#bab-3-sop-alur-operasional-3-tahap-pasca-produksi-end-to-end-workflow)
4. [Bab 4: Panduan Integrasi Google Drive 3-Step Wizard](#bab-4-panduan-integrasi-google-drive-3-step-wizard)
5. [Bab 5: Penanganan Media, Background Worker & Kebijakan Retensi Storage](#bab-5-penanganan-media-background-worker--kebijakan-retensi-storage)
6. [Bab 6: Panduan Portal Freelance & Sistem Penggajian (Payroll)](#bab-6-panduan-portal-freelance--sistem-penggajian-payroll)
7. [Bab 7: Panduan Seluruh Halaman Publik Client](#bab-7-panduan-seluruh-halaman-publik-client)
8. [Bab 8: Matriks Lengkap Seluruh Tombol Aksi UI & Endpoint Backend](#bab-8-matriks-lengkap-seluruh-tombol-aksi-ui--endpoint-backend)
9. [Bab 9: Katalog Template Notifikasi WhatsApp & Otomatisasi Cron Jobs](#bab-9-katalog-template-notifikasi-whatsapp--otomatisasi-cron-jobs)
10. [Bab 10: Troubleshooting, Pemeliharaan & Developer Watermark](#bab-10-troubleshooting-pemeliharaan--developer-watermark)

---

## Bab 1: Gambaran Umum, Arsitektur Sistem & Arsitektur Kode

### 1.1 Pendahuluan
Platform Wisuda v2.0 adalah sistem manajemen operasional foto wisuda berbasis web yang terintegrasi secara utuh untuk mengelola siklus operasional bisnis fotografi wisuda dari prospek awal (*inquiry*), konfirmasi booking client, penugasan fotografer freelance, pengolahan media pasca produksi di Google Drive, hingga pelunasan pembayaran dan payroll.

### 1.2 Struktur Folder Proyek
```text
/Wisuda/
  ├── admin-app/                 # SPA Admin Panel (Vue 3, Vite, TailwindCSS)
  │     ├── src/
  │     │    ├── views/          # 11 Modul Tampilan Admin SPA
  │     │    ├── stores/         # Pinia Auth & Global State Stores
  │     │    └── router/         # Vue Router Configuration
  │     └── package.json
  ├── src/                       # Backend Application Core (Node.js & Express)
  │     ├── config/              # Database (`database.js`), Env (`env.js`), WA Config
  │     ├── routes/              # Route Handlers (`admin.js`, `public.js`, `freelance-portal.js`)
  │     ├── services/            # Business Logic Services (Drive Importer, OAuth, WA Service, Cron)
  │     └── main.js              # Application Entry Point
  ├── public/                    # Static Assets & Public Client HTML Pages
  │     ├── admin/               # Compiled SPA Production Assets
  │     ├── index.html           # Landing Page & Dynamic Portfolio
  │     ├── inquiry.html         # Public Booking Reservation Form
  │     ├── confirm-booking.html # Client Token Confirmation Page
  │     ├── freelance-portal.html# Simplified Freelance Portal
  │     ├── select-photos.html   # Client Selection Photo Gallery
  │     ├── tracking.html        # Order Progress Tracker Page
  │     └── moodboard.html       # Inspiration Moodboard Collection Page
  ├── DATA/                      # Storage Directory
  │     ├── wisuda.db            # SQLite Database File
  │     ├── uploads/             # Media & Documents Storage
  │     └── backups/             # Automatic Database Backups
  └── package.json               # Root Dependencies & Scripts
```

### 1.3 Keamanan & Auth Policy
- **Admin Session Auth**: Menggunakan Cookie HTTP-Only Session (`express-session`) yang diamankan dengan `SESSION_SECRET` dinamis.
- **Freelancer Auth**: Menggunakan Kode Akses Unik 8-karakter (*Access Code*) yang diverifikasi pada setiap request API portal.
- **Client Auth**: Menggunakan Token Pelacakan Unik (`tracking_token`) dan `booking_token` ber-expiring date.

---

## Bab 2: Spesifikasi Skema Database SQLite (12 Tabel Lengkap)

Database SQLite (`DATA/wisuda.db`) berjalan menggunakan driver `better-sqlite3` dengan mode **Write-Ahead Logging (WAL)** untuk performa konkuensi tinggi. Berikut adalah spesifikasi lengkap 12 tabel database:

### 2.1 Tabel `bookings`
Tabel utama penyimpan data transaksi reservasi wisuda.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `inquiry_id` INTEGER (FK references `inquiries.id`)
- `package_id` INTEGER (FK references `packages.id`)
- `client_name` TEXT NOT NULL
- `client_phone` TEXT NOT NULL
- `graduation_date` DATE NOT NULL
- `shooting_time` TEXT DEFAULT '09:00'
- `location` TEXT
- `university` TEXT
- `city` TEXT
- `total_price` INTEGER DEFAULT 0
- `dp_amount` INTEGER DEFAULT 0
- `dp_status` TEXT DEFAULT 'pending' ('pending', 'paid')
- `dp_verified_by` INTEGER (FK references `users.id`)
- `dp_verified_at` DATETIME
- `dp_bukti_url` TEXT
- `balance_amount` INTEGER DEFAULT 0
- `balance_status` TEXT DEFAULT 'pending' ('pending', 'uploaded', 'paid')
- `balance_verified_by` INTEGER (FK references `users.id`)
- `balance_verified_at` DATETIME
- `balance_bukti_url` TEXT
- `status` TEXT DEFAULT 'confirmed' ('confirmed', 'editing', 'delivered', 'completed', 'cancelled')
- `selection_status` TEXT DEFAULT 'pending' ('pending', 'importing', 'staged', 'ready', 'submitted', 'cleaned', 'failed')
- `drive_parent_url` TEXT
- `staging_drive_url` TEXT
- `highlight_drive_url` TEXT
- `download_url` TEXT
- `tracking_token` TEXT UNIQUE
- `staged_photo_count` INTEGER DEFAULT 0
- `highlight_photo_count` INTEGER DEFAULT 0
- `final_photo_count` INTEGER DEFAULT 0

### 2.2 Tabel `assignments`
Tabel penugasan fotografer freelance.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `booking_id` INTEGER NOT NULL (FK references `bookings.id` ON DELETE CASCADE)
- `fg_id` INTEGER NOT NULL (FK references `freelancers.id`)
- `status` TEXT DEFAULT 'accepted' ('accepted', 'done', 'completed', 'cancelled')
- `fg_fee` INTEGER DEFAULT 0
- `offer_status` TEXT DEFAULT 'accepted'
- `fg_confirmed_at` DATETIME
- `shoot_start_at` DATETIME
- `shoot_end_at` DATETIME
- `upload_deadline` DATETIME

### 2.3 Tabel `deliverables`
Tabel penerimaan berkas foto dan kualitas pasca produksi.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `assignment_id` INTEGER (FK references `assignments.id` ON DELETE CASCADE)
- `booking_id` INTEGER (FK references `bookings.id`)
- `delivery_type` TEXT DEFAULT 'link' ('link', 'fisik')
- `drive_folder_url` TEXT
- `raw_folder_url` TEXT
- `qc_status` TEXT DEFAULT 'pending' ('pending', 'approved', 'rejected')
- `notes` TEXT

### 2.4 Tabel `inquiries`
Tabel prospek calon client.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `client_name` TEXT NOT NULL
- `client_phone` TEXT NOT NULL
- `graduation_date` DATE NOT NULL
- `shooting_time` TEXT DEFAULT '09:00'
- `location` TEXT
- `university` TEXT
- `city` TEXT
- `transport_charge` INTEGER DEFAULT 0
- `status` TEXT DEFAULT 'new' ('new', 'quoted', 'dealt', 'cancelled')

### 2.5 Tabel `freelancers`
Tabel data fotografer freelance.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `phone` TEXT NOT NULL
- `city` TEXT
- `access_code` TEXT UNIQUE
- `default_rate` INTEGER DEFAULT 0
- `active` INTEGER DEFAULT 1 (1=Aktif, 0=Nonaktif)

### 2.6 Tabel `packages`
Tabel katalog paket foto wisuda.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `price` INTEGER NOT NULL
- `max_selected_photos` INTEGER DEFAULT 15
- `highlight_count` INTEGER DEFAULT 5
- `category` TEXT DEFAULT 'Standard'

### 2.7 Tabel `portfolio_items`
Tabel galeri foto portofolio publik.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `booking_id` INTEGER (FK references `bookings.id`)
- `client_initial` TEXT
- `university` TEXT
- `graduation_year` INTEGER
- `cover_image_url` TEXT
- `published` INTEGER DEFAULT 1

### 2.8 Tabel `portfolio_import_jobs`
Tabel pelacakan impor otomatis portofolio dari Google Drive.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `booking_id` INTEGER NOT NULL
- `folder_id` TEXT NOT NULL
- `status` TEXT DEFAULT 'pending' ('pending', 'processing', 'completed', 'failed')
- `imported_count` INTEGER DEFAULT 0

### 2.9 Tabel `booking_tokens`
Tabel token konfirmasi reservasi client.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `inquiry_id` INTEGER NOT NULL
- `token` TEXT UNIQUE NOT NULL
- `expires_at` DATETIME NOT NULL
- `used` INTEGER DEFAULT 0

### 2.10 Tabel `payouts`
Tabel pencatatan pembayaran honor fotografer.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `fg_id` INTEGER NOT NULL (FK references `freelancers.id`)
- `amount` INTEGER NOT NULL
- `transfer_ref` TEXT UNIQUE NOT NULL
- `status` TEXT DEFAULT 'transferred' ('pending', 'transferred')
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### 2.11 Tabel `fg_schedules`
Tabel ketersediaan dan blackout date fotografer.
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `fg_id` INTEGER NOT NULL
- `date` DATE NOT NULL
- `status` TEXT DEFAULT 'available' ('available', 'busy')

### 2.12 Tabel `settings`
Tabel konfigurasi global sistem & kredensial Google Drive.
- `key` TEXT PRIMARY KEY
- `value` TEXT

---

## Bab 3: SOP Alur Operasional 3-Tahap Pasca Produksi (End-to-End Workflow)

```
[Tahap 1: Inquiry] ──> [Tahap 2: Client & Booking] ──> [Tahap 3: Post Production]
  (Prospek/DP)            (Jadwal & Pelunasan)           (Terima File -> Staging -> Final)
```

### 3.1 Tahap 1: Inquiries (Manajemen Prospek & DP)
1. Form Reservasi Publik (`inquiry.html`) diisi oleh calon client.
2. Admin mengecek ketersediaan tanggal dan menghitung biaya transportasi (*transport charge*).
3. Admin menekan tombol **`Kirim Quotation`** di Admin Panel (`InquiriesView.vue`). Sistem membentuk token unik `booking_tokens` dan membuka link WhatsApp dengan template quote otomatis.
4. Client melakukan transfer DP (50%) dan mengunggah bukti transfer.
5. Admin memverifikasi DP (**`Verifikasi DP`**) ➔ Sistem membuat record di `bookings` dan memindahkan data ke **Tahap 2**.

### 3.2 Tahap 2: Client & Booking (Penugasan & Pelunasan)
1. Admin menugaskan fotografer (**`Assign FG`**). Penugasan otomatis berada pada status `accepted` dan langsung muncul di Portal Freelance.
2. Sesi foto dilaksanakan di lapangan. Fotografer menekan **`📸 Photo Shoot Selesai`** di Portal Freelance.
3. **Aturan Transisi Pelunasan ➔ Post Production**:
   - **Client Bayar 100% Lunas Sejak Awal:** Begitu photo shoot selesai, booking **LANGSUNG berpindah ke Tahap 3 (Post Production)**.
   - **Client Baru Bayar DP (50%):** Booking berada di status **Menunggu Pelunasan**. Setelah Admin mengonfirmasi pelunasan (**`Verifikasi Pelunasan`**) ➔ booking **otomatis berpindah ke Tahap 3 (Post Production)**.

### 3.3 Tahap 3: Post Production (Pasca Produksi 3-Langkah)

```
[Langkah 1: Terima File] ──> [Langkah 2: Upload Staging] ──> [Langkah 3: Push Staging]
(Tombol Amber Aktif)         (Upload File di Drive)          (Tombol Animated Bounce)
```

1. **Langkah 1 (Kondisi Awal / Menunggu File)**:
   - **Badge Tahap:** `Menunggu File / Berkas`
   - **Indikator Fotografer:** `⌛ Belum Disetor` (Amber animate-pulse)
   - **Tombol Aksi Utama:** **`📦 Terima File`** (Tombol aktif warna amber)
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

## Bab 4: Panduan Integrasi Google Drive 3-Step Wizard

Untuk menjamin keamanan dan keabsahan koneksi Google Drive Studio, Admin Panel menerapkan **3-Step Wizard Workflow dengan Mandatory Verification**:

### 4.1 Step 1: Google OAuth Credentials (Mandatory Verification)
1. Buka menu Admin Panel > Settings > Google Drive Tab.
2. Isi form **Client ID** dan **Client Secret** dari Google Cloud Console.
3. Klik **`Verifikasi & Simpan Credential`**.
4. **Mekanisme Backend**: Sebelum menyimpan ke database, backend wajib melakukan *probe verification test* ke endpoint Google (`https://oauth2.googleapis.com/token`).
   - Jika Google merespon `invalid_client` (ID & Secret tidak cocok/salah), proses simpan **DITOLAK** dan melempar error penolakan yang jelas.
   - Jika verifikasi lolos, kredensial tersimpan aman di database.

### 4.2 Step 2: Tautkan Akun Google Drive (Gmail Studio)
- Hanya terbuka jika Step 1 sudah 100% terkonfigurasi dan terverifikasi cocok.
- Klik tombol **`🔗 Tautkan Akun Google Drive (OAuth)`**.
- Otorisasi akun Gmail Studio Anda melalui jendela popup Google OAuth.

### 4.3 Step 3: Master Root Folder Drive Studio
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

## Bab 5: Penanganan Media, Background Worker & Kebijakan Retensi Storage

### 5.1 Spesifikasi Handling Impor Foto
1. **Async Background Processing**: Endpoint API merespon dalam `< 1s` untuk mencegah HTTP 504 Gateway Timeout.
2. **Hard Network Timeout**: Limit 30 detik per pengunduhan berkas menggunakan `AbortSignal.timeout(30000)`.
3. **Exponential Backoff Retry**: Otomatis mengulang saat menemui HTTP `429 Too Many Requests` atau `500 Server Error` (jeda 1.5s ➔ 3.0s ➔ 6.0s).

### 5.2 Aturan Pembersihan Storage Otomatis (*Storage Retention Rules*)

| Direktori Storage | Jenis File | Aturan Retensi Cleanup |
|---|---|---|
| `DATA/uploads/portfolio/` | WebP Portfolio Published | Permanen (sampai dihapus admin) |
| `DATA/uploads/gallery_cache/` | Cache Thumbnail Proxy (`w400`/`w800`) | Dibersihkan otomatis saat highlight diupload atau TTL 7 hari. |
| `DATA/uploads/staging_uploads/` | Foto mentah sementara | Otomatis dihapus saat delivery final edit selesai. |
| `DATA/uploads/payment-proofs/` | Bukti Transfer DP / Pelunasan | Otomatis dihapus oleh Cron setelah 90 hari booking completed. |
| `DATA/uploads/invoices-client/` | PDF Kontrak & Invoice Client | Otomatis dihapus oleh Cron setelah 30 hari booking completed. |

---

## Bab 6: Panduan Portal Freelance & Sistem Penggajian (Payroll)

### 6.1 Hak Akses Portal Freelance (`freelance-portal.html`)
Freelancer mengakses portal menggunakan **Kode Akses Unik** yang di-generate dari Admin Panel. Hak akses dibatasi secara ketat untuk kenyamanan dan keamanan:
- **Tampilan Jadwal Sesi Foto**: Melihat nama client, tanggal wisuda, lokasi, dan jam sesi foto.
- **Tombol `📸 Photo Shoot Selesai`**: Diklik fotografer setelah sesi foto di lapangan selesai.
- **Tombol `💬 Minta Payment Fee`**: Membuka tautan WhatsApp langsung ke Admin untuk menagih honor foto.
- **Pengaturan Profil & Bank**: Memperbarui nomor rekening bank dan domisili kota.

### 6.2 Penggajian Freelance (Admin Payroll)
- Admin melihat daftar honor fotografer berdasarkan tarif default atau tarif per-assignment (`fg_fee`).
- Admin menekan tombol **`Bayar Gaji / Transfer Payout`** ➔ status payout berubah menjadi `transferred` dan invoice gaji otomatis ter-generate.

---

## Bab 7: Panduan Seluruh Halaman Publik Client

1. **`index.html` (Landing Page & Portofolio)**:
   Menampilkan profil studio, katalog paket wisuda, dan galeri portofolio interaktif yang dapat difilter berdasarkan universitas dan tahun.
2. **`inquiry.html` (Form Reservasi Wisuda)**:
   Formulir reservasi publik untuk calon client mengajukan tanggal, lokasi, jam, dan paket wisuda.
3. **`confirm-booking.html` (Konfirmasi Token Reservasi Client)**:
   Halaman tempat client mengonfirmasi rincian reservasi dan mengunggah bukti transfer DP setelah menerima quotation.
4. **`select-photos.html` (Galeri Seleksi Foto Client)**:
   Antarmuka bagi client untuk memilih foto terbaik dari galeri Staging Drive sesuai dengan batas kuota foto paket.
5. **`tracking.html` (Pelacakan Pesanan Real-Time)**:
   Halaman pelacakan progres pesanan client menggunakan `tracking_token` (menampilkan status real-time dari booking hingga pengiriman foto final).
6. **`moodboard.html` (Koleksi Moodboard Client)**:
   Halaman galeri ide pose dan inspirasi foto wisuda bagi client.
7. **`invoice.html` & `payout-invoice.html`**:
   Tampilan invoice digital resmi untuk client dan kwitansi transfer honor fotografer.

---

## Bab 8: Matriks Lengkap Seluruh Tombol Aksi UI & Endpoint Backend

| Halaman UI | Tombol / Aksi | Endpoint Backend API | Dampak Query SQL / Perubahan Data |
|---|---|---|---|
| **InquiriesView** | Kirim Quotation | `POST /api/admin/inquiries/:id/quote` | Update `inquiries.status = 'quoted'`, buat `booking_tokens`. |
| **BookingsView** | Assign FG | `POST /api/admin/bookings/:id/assign-fg` | Insert/Update `assignments` dengan `status = 'accepted'`. |
| **BookingsView** | Verifikasi DP | `POST /api/admin/bookings/:id/verify-dp` | Update `bookings.dp_status = 'paid'`, buat `bookings` record. |
| **BookingsView** | Verifikasi Pelunasan | `POST /api/admin/bookings/:id/verify-balance` | Update `bookings.balance_status = 'paid'`, jika shoot done ➔ `status = 'editing'`. |
| **DeliverablesView** | **`📦 Terima File`** | `POST /api/admin/post-production/:id/confirm-done` | Update `assignments.status = 'done'`, insert `deliverables.delivery_type = 'fisik'`, update `bookings.status = 'editing'`. |
| **DeliverablesView** | **`☁️ Upload File`** | `POST /api/admin/post-production/:id/upload-staging` | Update `bookings.staging_drive_url`. |
| **DeliverablesView** | **`🚀 Push Staging`** | `POST /api/admin/post-production/:id/publish-staging` | Update `bookings.selection_status = 'ready'`. |
| **DeliverablesView** | **`🚀 Push Highlight`** | `POST /api/admin/post-production/:id/send-highlight-link` | Update `bookings.highlight_drive_url_unlocked`. |
| **DeliverablesView** | **`🚀 Push Final Edit`** | `POST /api/admin/post-production/:id/send-link` | Update `bookings.status = 'delivered'`, `download_url`. |
| **PayrollView** | Bayar Gaji | `POST /api/admin/payouts` | Insert `payouts` dengan `status = 'transferred'`. |
| **Freelance Portal** | `📸 Photo Shoot Selesai` | `POST /api/public/freelance-portal/confirm-session` | Update `assignments.status = 'done'`, jika paid ➔ `bookings.status = 'editing'`. |
| **SettingsView** | Verifikasi Google OAuth | `POST /api/admin/settings/drive-credentials` | Probe test ke Google Token API & insert ke `settings`. |

---

## Bab 9: Katalog Template Notifikasi WhatsApp & Otomatisasi Cron Jobs

### 9.1 Variabel Template WhatsApp
Sistem mendukung penyesuaian template notifikasi WhatsApp yang tersimpan di tabel `settings`:
- `{client_name}` — Nama Client
- `{shooting_time}` — Jam Sesi Foto
- `{location}` — Lokasi Sesi Foto
- `{fg_name}` — Nama Fotografer
- `{fg_phone}` — Nomor WhatsApp Fotografer
- `{tracking_url}` — Link Pelacakan Pesanan
- `{download_url}` — Link Drive Foto Final

### 9.2 Spesifikasi Cron Maintenance Jobs
- **Daily Capacity Cleanup (Tiap 00:00 WITA)**: Pembersihan token kadaluarsa dan reset kuota harian.
- **Drive Retention Cleanup (Tiap 02:00 WITA)**: Pemindahan folder Drive yang melewati batas retensi ke Google Trash.
- **Database Auto Backup (Tiap 04:00 WITA)**: Pembuatan cadangan database SQLite otomatis ke `DATA/backups/wisuda_auto_{timestamp}.db`.

---

## Bab 10: Troubleshooting, Pemeliharaan & Developer Watermark

### 10.1 Troubleshooting Perbaikan Masalah Umum

1. **Modal Error `Gagal mengonfirmasi file diterima`**:
   * *Penyebab:* Query SQL menyentuh kolom yang tidak ada (`is_session_done`).
   * *Solusi:* Pastikan backend menggunakan `UPDATE assignments SET status = 'done', shoot_end_at = CURRENT_TIMESTAMP WHERE id = ?`.
2. **Tombol Push Staging Warna Abu-Abu (*Disabled*)**:
   * *Penyebab:* Jumlah foto di Drive Staging 0 atau folder belum di-scan.
   * *Solusi:* Tautkan folder Drive Staging yang berisi foto via tombol `☁️ Upload File`. Tombol Push akan otomatis bernyawa dengan animasi bergerak (*bounce*).
3. **Google OAuth Error `invalid_client`**:
   * *Penyebab:* Client ID & Client Secret salah atau belum didaftarkan Authorized Redirect URI.
   * *Solusi:* Tambahkan `http://localhost:8081/api/admin/auth/google/callback` di Google Cloud Console.

### 10.2 Developer Watermark (`AMS`)
Sistem dilengkapi dengan **Floating Developer Credit Bubble (`AMS`)** di sudut kanan bawah setiap antarmuka web, yang mengintegrasikan versi komitmen Git dinamis dan notifikasi pembaharuan rilis.

---

*Wisuda Platform Master Encyclopedic Manual v2.0 — Fully Verified for Production Operations.*
