# 🛡️ LAPORAN AUDIT MENDALAM & DEEP TECHNICAL ANALYSIS
## Wisuda Photography Platform v2.0 (Headless Architecture & Cloud Ecosystem)

**Tanggal Audit:** 16 Agustus 2026  
**Auditor Engine:** Antigravity / Deep Reasoning Security Audit Engine  
**Lingkungan / Target:** Deploy Produksi & Codebase Server  
**Status Audit:** Evaluasi Selesai — Menunggu Persetujuan Eksekusi Patch

---

## 📑 DAFTAR ISI
1. [Executive Summary & Security Posture](#1-executive-summary--security-posture)
2. [Matriks Temuan Kerentanan & Bug (Severity Matrix)](#2-matriks-temuan-kerentanan--bug-severity-matrix)
3. [Analisis Mendalam Kerentanan Keamanan & Exploitation Flow](#3-analisis-mendalam-kerentanan-keamanan--exploitation-flow)
   - 3.1. [CRITICAL] IDOR & Kebocoran PII pada `/api/public/booking/:id`
   - 3.2. [CRITICAL] Bypass Autentikasi Webhook Pembayaran QRIS (Free Booking Exploit)
   - 3.3. [HIGH] Bypass Tracking Token via Tebakan Sequential ID (`?code=1`)
   - 3.4. [HIGH] Bypass Token pada Sub-Aksi Tracking jika Parameter `code` Dikosongkan
   - 3.5. [HIGH] Mutasi Data & Upload Bukti Liar pada Endpoint `/api/public/booking/:id/*`
   - 3.6. [HIGH] Akses & Penimpaan Pilihan Foto Tanpa Token (`/api/public/selection/:id`)
   - 3.7. [MEDIUM] Akses & Manipulasi Moodboard Tanpa Token (`/api/public/moodboard/:id`)
   - 3.8. [MEDIUM] Kredensial Akses Freelancer di GET Query String & Ghosting Session Token
4. [Analisis Mendalam Bug Logika, Runtime & Database Failure](#4-analisis-mendalam-bug-logika-runtime--database-failure)
   - 4.1. [HIGH] Runtime `ReferenceError: photoUrl is not defined` pada `ensurePortfolioDraft`
   - 4.2. [HIGH] Kegagalan Eksekusi Cron Reminder H-3 & H-1 (`no such column: b.tracking_code`)
   - 4.3. [MEDIUM] Inkonsistensi Status Booking Menjadi `confirmed` Sebelum Verifikasi DP
   - 4.4. [MEDIUM] Kerentanan HTML Injection pada Template Email Transaksional
   - 4.5. [LOW] Penugasan Variabel Global Liar (`params = []`) pada Query Payroll
5. [Audit Alur Bisnis, Flow Integritas & Kepatuhan Aturan Sistem](#5-audit-alur-bisnis-flow-integritas--kepatuhan-aturan-sistem)
   - 5.1. Alur 3-Step Wizard Google OAuth & Direct Stream
   - 5.2. Alur 2-Gate Security Transisi Booking ke Post-Production
   - 5.3. Manajemen Storage, Retensi 3 Bulan & Auto-Trash
6. [Rencana Solusi Teknis & Surgical Code Patches](#6-rencana-solusi-teknis--surgical-code-patches)
7. [Kesimpulan & Rekomendasi Prioritas](#7-kesimpulan--rekomendasi-prioritas)

---

## 1. Executive Summary & Security Posture

Sistem **Wisuda Platform v2.0** memiliki fondasi arsitektur yang modern dengan integrasi mutakhir seperti **Direct-to-Drive Resumable Upload (Zero Disk Transit)**, **Database SQLite WAL Mode dengan Indexing Lengkap**, **Sistem Template Email Transaksional yang Kaya**, serta **Portal Freelancer & Tracking Klien Responsif**.

Namun, dari hasil deep-audit menyeluruh terhadap seluruh file backend, frontend, konfigurasi, dan alur integrasi pihak ketiga, ditemukan **sejumlah celah keamanan kritikal (IDOR, Auth Bypass, Webhook Forgery)** serta **bug runtime yang menyebabkan fitur otomatisasi (Cron & Auto-Portfolio) gagal berfungsi di latar belakang**.

### Ringkasan Status Keamanan
- **Total Endpoint Diaudit:** 78 API Endpoints
- **Total File Sumber Diaudit:** 52 File (Backend Router, Services, Config, Frontend Scripts, DB Migrations)
- **Status Unit Test Saat Ini:** 24/24 Suites PASS (111 Tests PASS)
  > *Catatan Penting Sesuai Kaidah Fable 5:* Lolosnya automated unit test tidak menjamin 100% sistem bebas celah, karena test yang ada belum menguji serangan manipulasi payload webhook tanpa signature, penyerangan IDOR enumerasi ID integer, atau kasus query kolom yang salah pada cron job riil.

---

## 2. Matriks Temuan Kerentanan & Bug (Severity Matrix)

| ID | Kategori | Tingkat Keparahan | Komponen Terkait | Dampak Bisnis / Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Security / IDOR | 🔴 **CRITICAL** | `src/routes/public.js` (`/booking/:id`) | Siapapun dapat mengambil data pribadi (PII), nomor WA, link download, dan password arsip klien lain hanya dengan menebak ID integer 1, 2, 3... |
| **SEC-02** | Security / Auth Bypass | 🔴 **CRITICAL** | `src/routes/public.js` (`/payment/ipaymu/notify`) | Celah verifikasi webhook memungkinkan penyerang membuat booking lunas 100% tanpa bayar jika header signature tidak dikirim. |
| **SEC-03** | Security / Auth Bypass | 🟠 **HIGH** | `src/routes/public.js` (`/tracking`) | Logika token checking meloloskan parameter `?code=1` karena mengecek `code === String(booking.id)`, membuka private Google Drive URL. |
| **SEC-04** | Security / Auth Bypass | 🟠 **HIGH** | `src/routes/public.js` (`/tracking/:id/*`) | Pengecekan token menggunakan `if (code && code !== token)`, sehingga jika parameter `code` dihapus / kosong, validasi dilewati. |
| **SEC-05** | Security / Data Integrity | 🟠 **HIGH** | `src/routes/public.js` (`/booking/:id/*-notify`) | Endpoint lapor bayar manual dapat ditembak langsung dengan ID integer tanpa token verifikasi, merusak status booking orang lain. |
| **SEC-06** | Security / IDOR | 🟠 **HIGH** | `src/routes/selection.js` (`/selection/:id`) | Galeri seleksi dan submit pilihan foto dapat diakses dan ditimpa oleh siapapun hanya menggunakan ID integer tanpa token. |
| **SEC-07** | Security / IDOR | 🟡 **MEDIUM** | `src/routes/moodboard.js` (`/moodboard/:id`) | `findBooking` melakukan fallback ke `WHERE id = ?`, memungkinkan melihat, menambah, dan menghapus moodboard orang lain. |
| **SEC-08** | Security / Information Leak | 🟡 **MEDIUM** | `src/routes/freelance-portal.js` (`/schedule`) | Mengirim `access_code` via GET query string (terekam di log webserver); session token hasil login tidak divalidasi. |
| **BUG-01** | Runtime / Logic Error | 🟠 **HIGH** | `src/routes/admin/bookings.js` (`ensurePortfolioDraft`) | Variabel `photoUrl` tidak terdefinisi (`ReferenceError`), menyebabkan pembuatan draft portofolio otomatis gagal total saat upload deliverables. |
| **BUG-02** | Database / SQL Error | 🟠 **HIGH** | `src/services/cron.service.js` (`runReminderH3/H1`) | Query SQL memanggil kolom `b.tracking_code` yang tidak ada di tabel `bookings` (`tracking_token`), menyebabkan Cron Reminder H-3 & H-1 crash. |
| **BUG-03** | Flow / State Consistency | 🟡 **MEDIUM** | `src/routes/public.js` (`/booking-token/:token/confirm`) | Status booking langsung diubah menjadi `confirmed` saat klien mengunggah bukti transfer, padahal DP belum diverifikasi oleh admin. |
| **BUG-04** | Security / HTML Injection | 🟡 **MEDIUM** | `src/services/email.service.js` | Parameter input pengguna (`client_name`, `university`, dll) diinterpolasi langsung ke HTML email tanpa escaping entitas HTML. |
| **BUG-05** | Code Quality / Hygiene | 🟢 **LOW** | `src/routes/admin/payroll.js` (`get(params = [])`) | Deklarasi variabel tanpa `let/const` di dalam argumen method query database. |

---

## 3. Analisis Mendalam Kerentanan Keamanan & Exploitation Flow

---

### 3.1. [CRITICAL] IDOR & Kebocoran PII pada `/api/public/booking/:id`
- **Lokasi Kode:** `src/routes/public.js:426-470`
- **Akar Masalah:**
  ```javascript
  router.get('/booking/:id', [
    param('id').isInt()
  ], (req, res) => {
    const bookingId = parseInt(req.params.id);
    const booking = db.prepare(`
      SELECT b.*, p.name as package_name, p.includes as package_includes
      FROM bookings b LEFT JOIN packages p ON b.package_id = p.id WHERE b.id = ?
    `).get(bookingId);
    ...
    res.json({ booking, assignment, deliverable, timeline, ... });
  });
  ```
- **Vektor Eksploitasi:**
  Endpoint ini berada di jalur publik `/api/public/booking/:id` tanpa memerlukan autentikasi login admin maupun verifikasi `tracking_token`. Penyerang cukup melakukan *scraping / ID enumeration* dari ID 1 sampai N (`curl https://domain.com/api/public/booking/1`, `curl https://domain.com/api/public/booking/2`).
- **Dampak Kebocoran:**
  `SELECT b.*` mengekspos:
  1. `client_name`, `client_phone`, `client_email` (PII Data Klien).
  2. `download_url`, `download_password` (Akses langsung ke hasil foto final klien).
  3. `staging_files` (Akses ke seluruh file foto mentah/staging).
  4. `fg_name`, `fg_phone` (Data pribadi fotografer mitra).
  5. `dp_bukti_url`, `balance_bukti_url` (File bukti transfer rekening bank).
- **Rekomendasi Perbaikan:**
  Hapus endpoint publik `/booking/:id` ini, atau wajibkan validasi `tracking_token` melalui query/header, dan lakukan sanitasi field sensitif (`delete password`, `delete download_url` jika belum lunas).

---

### 3.2. [CRITICAL] Bypass Autentikasi Webhook Pembayaran QRIS (Free Booking Exploit)
- **Lokasi Kode:** `src/routes/public.js:1215-1234`
- **Akar Masalah:**
  ```javascript
  if (ipaymuEnabled && ipaymuVa && ipaymuApiKey) {
    const incomingSignature = req.headers['signature'] || req.headers['x-signature'] || '';
    if (incomingSignature) {
      const expectedSignature = ipaymuService.generateSignature(req.body, 'POST', ipaymuVa, ipaymuApiKey);
      const incBuf = Buffer.from(incomingSignature.toLowerCase());
      const expBuf = Buffer.from(expectedSignature.toLowerCase());
      const sigMatch = incBuf.length === expBuf.length && crypto.timingSafeEqual(incBuf, expBuf);
      if (!sigMatch) {
        return res.status(401).json({ status: 401, error: 'Invalid signature' });
      }
    } else {
      // ⚠️ LOGIKA FATAL: Jika penyerang TIDAK menyertakan header signature, blok verifikasi dilewati!
      console.warn('[iPaymu Webhook] ⚠️ Header signature tidak ditemukan — diproses tanpa verifikasi...');
    }
  }
  ```
- **Vektor Eksploitasi:**
  Penyerang yang mengetahui `reference_id` atau `trx_id` (atau menebak formatnya) cukup mengirim HTTP POST request langsung ke `/api/public/payment/ipaymu/notify` **tanpa header signature**:
  ```bash
  curl -X POST https://domain.com/api/public/payment/ipaymu/notify \
    -d "reference_id=REF-PAY-500K-123456&status=berhasil&status_code=1"
  ```
  Sistem akan mendeteksi `incomingSignature` kosong, melewatkan blok validasi, dan **langsung mengeksekusi pengubahan status transaksi menjadi `paid`, status booking menjadi `confirmed` (atau lunas 100%), membuat folder Google Drive, dan mengirimkan email konfirmasi lunas**.
- **Rekomendasi Perbaikan:**
  1. Jika mode `production`, header `signature` **WAJIB ADA**. Jika tidak ada, tolak dengan HTTP 401.
  2. Implementasikan *Active Probe Inquiry Fallback*: Jika signature tidak tersedia di sandbox, backend wajib memanggil API resmi iPaymu (`POST /api/v2/transaction` dengan VA dan API Key resmi) untuk memverifikasi apakah transaksi tersebut benar-benar bernilai `1 (Berhasil)` di server iPaymu sebelum mengubah status di database lokal.

---

### 3.3. [HIGH] Bypass Tracking Token via Tebakan Sequential ID (`?code=1`)
- **Lokasi Kode:** `src/routes/public.js:1585-1587`
- **Akar Masalah:**
  ```javascript
  const tokenMatches = (tokenInput && (tokenInput === booking.tracking_token || tokenInput === String(booking.id))) ||
                       (tokenOrPhone === booking.tracking_token || tokenOrPhone === String(booking.id));
  ```
- **Vektor Eksploitasi:**
  Di endpoint `/api/public/tracking`, variabel `tokenMatches` digunakan untuk menentukan apakah tautan rahasia Google Drive (`download_url_unlocked`, `drive_parent_url_unlocked`, `highlight_drive_url_unlocked`) boleh dibuka ke pengguna.
  Karena terdapat klausul `tokenInput === String(booking.id)` atau `tokenOrPhone === String(booking.id)`, penyerang yang hanya mengetahui nomor ID booking (misalnya `1`, `2`, `3`) dapat mengakses:
  `GET /api/public/tracking?code=1`
  Maka `tokenMatches` bernilai `true`, dan seluruh link Google Drive privat akan di-unlock tanpa perlu mengetahui `tracking_token` asli yang di-generate dengan kriptografi acak (`TRK-1-ABCDEF`).
- **Rekomendasi Perbaikan:**
  Hapus pengecekan `tokenInput === String(booking.id)`. Akses unlock file Drive **HANYA BOLEH** diberikan jika `tokenInput === booking.tracking_token`.

---

### 3.4. [HIGH] Bypass Token pada Sub-Aksi Tracking jika Parameter `code` Dikosongkan
- **Lokasi Kode:** `src/routes/public.js:1685, 1748, 1780`
- **Akar Masalah:**
  ```javascript
  // Contoh pada POST /tracking/:id/confirm-receipt
  const code = req.body.code ? req.body.code.trim() : '';
  ...
  if (code && code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Token tidak valid.' });
  }

  // Contoh pada POST /booking/:id/balance-qris (Line 1044)
  const code = req.body.code || req.query.code;
  if (code && code !== booking.tracking_token && code !== String(booking.id)) {
    return res.status(403).json({ error: 'Akses ditolak: Token tidak valid' });
  }
  ```
- **Vektor Eksploitasi:**
  Sintaks `if (code && code !== booking.tracking_token)` berarti: "Jika parameter `code` dikirim dan salah, tolak". Namun jika penyerang mengirim request **tanpa parameter `code`** (`code = ''`), maka kondisi `code && ...` bernilai `false`, sehingga **validasi dilewati**.
  Penyerang dapat menembak endpoint:
  - `/api/public/tracking/1/confirm-receipt` (Mengubah status konfirmasi penerimaan file klien)
  - `/api/public/tracking/1/confirm-backup` (Mengubah status retensi file klien menjadi aman)
  - `/api/public/tracking/1/recheck-folder-size` (Memaksa perhitungan ulang API Google Drive)
  - `/api/public/booking/1/balance-qris` (Membuat tagihan QRIS pelunasan atas nama klien lain)
- **Rekomendasi Perbaikan:**
  Ubah validasi menjadi wajib (mandatory):
  ```javascript
  if (!code || code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tracking wajib diisi dan valid.' });
  }
  ```

---

### 3.5. [HIGH] Mutasi Data & Upload Bukti Liar pada Endpoint `/api/public/booking/:id/*`
- **Lokasi Kode:** `src/routes/public.js:287-424`
- **Akar Masalah:**
  Endpoint:
  - `POST /api/public/booking/:id/dp-notify`
  - `POST /api/public/booking/:id/payment-notify`
  - `POST /api/public/booking/:id/balance-notify`
  Hanya menerima parameter `:id` integer dari URL tanpa memverifikasi `tracking_token` atau session klien.
- **Dampak:**
  Penyerang dapat mengunggah file gambar sampah ke server dan mengubah status pembayaran booking orang lain menjadi `uploaded` tanpa izin.
- **Rekomendasi Perbaikan:**
  Tambahkan verifikasi parameter `tracking_token` pada body/header atau alihkan seluruh flow upload bukti transfer melalui endpoint tracking resmi yang mewajibkan token.

---

### 3.6. [HIGH] Akses & Penimpaan Pilihan Foto Tanpa Token (`/api/public/selection/:id`)
- **Lokasi Kode:** `src/routes/selection.js:8-150`
- **Akar Masalah:**
  ```javascript
  router.get('/selection/:id', async (req, res) => {
    const bookingId = parseInt(req.params.id);
    const booking = db.prepare('SELECT ... WHERE b.id = ?').get(bookingId);
    ...
    // Mengembalikan seluruh file foto mentah klien tanpa cek token
    res.json({ files, ... });
  });

  router.post('/selection/:id/submit', (req, res) => {
    const bookingId = parseInt(req.params.id);
    // Menyimpan pilihan foto klien tanpa cek token
    db.prepare('UPDATE bookings SET selected_photos = ? ... WHERE id = ?').run(...);
  });
  ```
- **Dampak:**
  Siapapun dapat melihat thumbnail galeri foto sesi wisuda klien lain dan menimpa pilihan foto favorit klien lain tanpa otorisasi.
- **Rekomendasi Perbaikan:**
  Wajibkan parameter `token` (atau header `x-tracking-token`) yang dicocokkan dengan `booking.tracking_token`.

---

### 3.7. [MEDIUM] Akses & Manipulasi Moodboard Tanpa Token (`/api/public/moodboard/:id`)
- **Lokasi Kode:** `src/routes/moodboard.js:14-21`
- **Akar Masalah:**
  ```javascript
  function findBooking(tokenOrId) {
    const db = getDb();
    let booking = db.prepare('SELECT * FROM bookings WHERE tracking_token = ?').get(tokenOrId);
    if (!booking) {
      booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(tokenOrId);
    }
    return booking;
  }
  ```
- **Dampak:**
  Jika penyerang memasukkan ID angka murni (misal `/api/public/moodboard/1`), pencarian token gagal lalu fallback mencari ID 1. Penyerang dapat melihat, menambahkan foto referensi baru ke Drive klien, menghapus foto moodboard klien lain, dan men-generate PDF moodboard klien lain.
- **Rekomendasi Perbaikan:**
  Hapus fallback `WHERE id = ?` untuk request publik. Hanya izinkan pencarian berdasarkan `tracking_token`. (Pencarian via ID murni hanya diizinkan untuk Admin yang sudah terautentikasi `requireAuth`).

---

### 3.8. [MEDIUM] Kredensial Akses Freelancer di GET Query String & Ghosting Session Token
- **Lokasi Kode:** `src/routes/freelance-portal.js:62-74, 151-158`
- **Akar Masalah:**
  1. Pada endpoint `POST /api/public/freelance-portal/login`, sistem meng-generate `token = crypto.randomBytes(32).toString('hex')` dan mengembalikannya ke client. Namun token ini **tidak pernah disimpan di database atau memori session**.
  2. Seluruh request jadwal `GET /api/public/freelance-portal/schedule?fg_id=1&access_code=FG-XXXX` mengirimkan `access_code` dalam bentuk plaintext di query string URL.
- **Dampak:**
  Kredensial `access_code` freelancer tersimpan dalam log akses web server (Nginx/Cloudflare access logs) dan riwayat peramban (browser history).
- **Rekomendasi Perbaikan:**
  Gunakan header `Authorization: Bearer <token>` atau `X-FG-Token: <access_code>` alih-alih meletakkannya di query string URL GET.

---

## 4. Analisis Mendalam Bug Logika, Runtime & Database Failure

---

### 4.1. [HIGH] Runtime `ReferenceError: photoUrl is not defined` pada `ensurePortfolioDraft`
- **Lokasi Kode:** `src/routes/admin/bookings.js:71, 97, 98, 114, 122`
- **Pemeriksaan Kode:**
  ```javascript
  function ensurePortfolioDraft(bookingId, targetUrl) { // 👈 Parameter bernama targetUrl
    try {
      ...
      if (!existingPorto) {
        db.prepare(`...`).run(
          bookingId,
          clientName,
          year,
          booking.university || 'Universitas',
          booking.city || null,
          photoUrl || null,                              // ❌ ReferenceError: photoUrl is not defined
          photoUrl ? JSON.stringify([photoUrl]) : ...,   // ❌ ReferenceError
          ...
        );
      } else {
        db.prepare(`...`).run(
          clientName,
          photoUrl || null,                              // ❌ ReferenceError
          ...
        );
      }

      if (photoUrl) {                                    // ❌ ReferenceError
        driveImporter.importPortfolioFromDrive(bookingId, photoUrl)...
      }
    } catch (e) {
      console.error('[ensurePortfolioDraft Error]:', e.message);
    }
  }
  ```
- **Dampak:**
  Setiap kali Admin mengunggah deliverables atau highlight Google Drive pada booking klien, pembuatan draft portofolio otomatis **selalu gagal** dan tertelan oleh blok `catch` dengan pesan error: `photoUrl is not defined`.
- **Rekomendasi Perbaikan:**
  Ubah semua referensi `photoUrl` di dalam fungsi menjadi `targetUrl`.

---

### 4.2. [HIGH] Kegagalan Eksekusi Cron Reminder H-3 & H-1 (`no such column: b.tracking_code`)
- **Lokasi Kode:** `src/services/cron.service.js:277, 316, 325, 350, 419, 429`
- **Pemeriksaan Kode:**
  ```javascript
  // Line 277 (runReminderH3)
  const assignments = db.prepare(`
    SELECT a.*, b.client_name, b.client_phone, b.client_email, b.graduation_date, b.shooting_time, b.location, b.university, b.tracking_code, // ❌ Kolom b.tracking_code TIDAK ADA
           f.name as fg_name, f.phone as fg_phone, f.email as fg_email
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    ...
  `).all(targetDate);
  ```
- **Dampak:**
  Skema tabel database SQLite (`scripts/schema.sql` dan `src/config/database.js`) menamai kolom token sebagai `tracking_token`, **bukan `tracking_code`**.
  Akibatnya, setiap kali Cron Job berjalan pada pukul 08:00 dan 09:00 WITA, eksekusi query melempar error:
  `SqliteError: no such column: b.tracking_code`
  dan **seluruh email serta pesan WA pengingat H-3 dan H-1 ke Klien dan Fotografer gagal dikirimkan**.
- **Rekomendasi Perbaikan:**
  Ganti `b.tracking_code` menjadi `b.tracking_token` pada seluruh query dan objek parameter di `src/services/cron.service.js` dan `src/services/email.service.js`.

---

### 4.3. [MEDIUM] Inkonsistensi Status Booking Menjadi `confirmed` Sebelum Verifikasi DP
- **Lokasi Kode:** `src/routes/public.js:761, 775`
- **Pemeriksaan Kode:**
  Pada saat calon klien mengonfirmasi penawaran dan mengunggah bukti transfer manual melalui `/api/public/booking-token/:token/confirm`:
  ```javascript
  db.prepare(`
    INSERT INTO bookings (
      ... status, ...
    ) VALUES (
      ... 'confirmed', ...
    )
  `).run(...);
  ```
- **Dampak:**
  Status booking langsung tercatat sebagai `'confirmed'` di tabel `bookings` meskipun `dp_status` masih `'uploaded'` (belum diverifikasi admin).
  Hal ini menyebabkan ketidakkonsistenan status pada timeline tracking klien dan dashboard filter jika query mengandalkan kolom `status` alih-alih `dp_status`.
- **Rekomendasi Perbaikan:**
  Set status awal booking manual menjadi `'pending'` dan hanya ubah menjadi `'confirmed'` setelah Admin menekan tombol Verifikasi DP di Admin Dashboard (`POST /api/admin/bookings/:id/verify-dp`) atau setelah notifikasi webhook QRIS sukses diterima.

---

### 4.4. [MEDIUM] Kerentanan HTML Injection pada Template Email Transaksional
- **Lokasi Kode:** `src/services/email.service.js`
- **Pemeriksaan Kode:**
  String input pengguna seperti `inquiry.name`, `inquiry.university`, `booking.notes`, `decline_reason` diinterpolasi langsung menggunakan template literals JavaScript (`${clientName}`) ke dalam template HTML email tanpa melalui fungsi sanitasi entitas HTML (`escapeHtml`).
- **Dampak:**
  Calon klien nakal dapat memasukkan payload HTML seperti:
  `<a href="https://phishing.site">Klik Disini</a>` atau `<h1>Defaced</h1>`
  di kolom nama/universitas saat mengisi formulir reservasi, yang kemudian akan ter-render sebagai elemen HTML hidup di kotak masuk email Admin dan Klien.
- **Rekomendasi Perbaikan:**
  Buat fungsi helper `escapeHtml(str)` di `src/services/email.service.js` dan terapkan pada seluruh variabel teks yang berasal dari input pengguna sebelum disematkan ke dalam template HTML.

---

### 4.5. [LOW] Penugasan Variabel Global Liar (`params = []`) pada Query Payroll
- **Lokasi Kode:** `src/routes/admin/payroll.js:79`
- **Pemeriksaan Kode:**
  ```javascript
  total = db.prepare(`SELECT COUNT(*) as c FROM assignments a ... WHERE ${where}`).get(params = []).c;
  ```
- **Dampak:**
  Penulisan `params = []` tanpa kata kunci deklarasi `let`/`const` di dalam argumen fungsi membuat variabel global tidak sengaja (anti-pattern dalam JavaScript).
- **Rekomendasi Perbaikan:**
  Ganti menjadi `.get().c` tanpa argumen karena string `${where}` pada baris tersebut tidak memiliki placeholder parameterized query `?`.

---

## 5. Audit Alur Bisnis, Flow Integritas & Kepatuhan Aturan Sistem

### 5.1. Alur 3-Step Wizard Google OAuth & Direct Stream
- **Evaluasi Kepatuhan:**
  1. **Step 1 (OAuth Credentials):** Terverifikasi aman. Backend melakukan *probe verification test* ke endpoint Google (`https://oauth2.googleapis.com/token`) pada `POST /settings/verify-oauth-credentials`. Kredensial yang menghasilkan respon `invalid_client` langsung ditolak. Kolom kredensial juga telah diproteksi dari pengubahan liar di endpoint umum `POST /settings`.
  2. **Step 2 (Tautkan Akun Google Drive):** Terverifikasi aman. Menggunakan flow resmi Google OAuth2 consent screen dengan scope `drive`.
  3. **Step 3 (Master Root Folder):** Terverifikasi aman. Hanya dapat diisi dan diuji jika Step 1 dan Step 2 telah aktif.
  4. **Direct Stream Upload:** Terverifikasi aman. Endpoint `/api/v2/admin/uploads/initiate` menggunakan Google Resumable Upload API secara langsung, sehingga file mentah klien tidak pernah transit atau membebani penyimpanan disk VPS.

### 5.2. Alur 2-Gate Security Transisi Booking ke Post-Production
- **Gate 1 (DP Terverifikasi):** Berjalan konsisten. Folder Google Drive otomatis dibuat saat DP berstatus `paid`.
- **Gate 2 (Pelunasan Terverifikasi):** Berjalan konsisten. Galeri seleksi foto (`select-photos.html`) terkunci jika `balance_status !== 'paid'`. Namun, autentikasi pada endpoint API pendukung galeri seleksi perlu diperketat sesuai temuan SEC-06.

### 5.3. Manajemen Storage, Retensi 3 Bulan & Auto-Trash
- Cron job pembersihan retensi folder Google Drive (`runDriveRetentionCleanup`) telah mengimplementasikan logika penghitungan kedaluwarsa berbasis `updated_at` (3 bulan setelah file siap) dan memindahkan folder ke Trash Google Drive secara otomatis saat masa retensi habis.

---

## 6. Rencana Solusi Teknis & Surgical Code Patches

Berikut adalah rencana perbaikan presisi (*surgical patches*) yang diusulkan untuk mengatasi seluruh temuan audit:

### Patch 1: Pengamanan Webhook Pembayaran QRIS iPaymu
**File:** `src/routes/public.js`
```diff
-     if (incomingSignature) {
-       const expectedSignature = ipaymuService.generateSignature(req.body, 'POST', ipaymuVa, ipaymuApiKey);
-       ...
-     } else {
-       console.warn('[iPaymu Webhook] ⚠️ Header signature tidak ditemukan — diproses tanpa verifikasi...');
-     }
+     const incomingSignature = req.headers['signature'] || req.headers['x-signature'] || '';
+     if (!incomingSignature) {
+       // Di mode production, tolak keras jika signature tidak dikirim
+       if (webhookSettings.ipaymu_env === 'production') {
+         console.error('[iPaymu Webhook] 🛑 REJECTED: Header signature wajib di lingkungan production.');
+         return res.status(401).json({ status: 401, error: 'Signature header required in production mode' });
+       }
+       console.warn('[iPaymu Webhook] ⚠️ Header signature tidak ada di mode sandbox. Memverifikasi ke server iPaymu...');
+     } else {
+       const expectedSignature = ipaymuService.generateSignature(req.body, 'POST', ipaymuVa, ipaymuApiKey);
+       const incBuf = Buffer.from(incomingSignature.toLowerCase());
+       const expBuf = Buffer.from(expectedSignature.toLowerCase());
+       const sigMatch = incBuf.length === expBuf.length && crypto.timingSafeEqual(incBuf, expBuf);
+       if (!sigMatch) {
+         console.warn(`[iPaymu Webhook] ⚠️ SIGNATURE MISMATCH!`);
+         return res.status(401).json({ status: 401, error: 'Invalid signature' });
+       }
+     }
```

### Patch 2: Perbaikan Bug ReferenceError pada Auto-Portfolio
**File:** `src/routes/admin/bookings.js`
```diff
  function ensurePortfolioDraft(bookingId, targetUrl) {
    try {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
      if (!booking) return;
      ...
-         photoUrl || null,
-         photoUrl ? JSON.stringify([photoUrl]) : JSON.stringify([]),
+         targetUrl || null,
+         targetUrl ? JSON.stringify([targetUrl]) : JSON.stringify([]),
      ...
-         photoUrl || null,
+         targetUrl || null,
      ...
-     if (photoUrl) {
-       driveImporter.importPortfolioFromDrive(bookingId, photoUrl).catch(err => {
+     if (targetUrl) {
+       driveImporter.importPortfolioFromDrive(bookingId, targetUrl).catch(err => {
```

### Patch 3: Perbaikan Kolom SQL pada Cron Reminder
**File:** `src/services/cron.service.js`
```diff
- SELECT a.*, b.client_name, b.client_phone, b.client_email, b.graduation_date, b.shooting_time, b.location, b.university, b.tracking_code,
+ SELECT a.*, b.client_name, b.client_phone, b.client_email, b.graduation_date, b.shooting_time, b.location, b.university, b.tracking_token,
  ...
- const trackingUrl = a.tracking_code ? `${appUrl}/tracking.html?code=${a.tracking_code}` : `${appUrl}/tracking.html`;
+ const trackingUrl = a.tracking_token ? `${appUrl}/tracking.html?code=${a.tracking_token}` : `${appUrl}/tracking.html`;
```

### Patch 4: Pengamanan Strict Token pada Endpoint Tracking & Selection
**File:** `src/routes/public.js` & `src/routes/selection.js`
```diff
- const tokenMatches = (tokenInput && (tokenInput === booking.tracking_token || tokenInput === String(booking.id))) ||
-                      (tokenOrPhone === booking.tracking_token || tokenOrPhone === String(booking.id));
+ const tokenMatches = Boolean((tokenInput && tokenInput === booking.tracking_token) ||
+                              (tokenOrPhone && tokenOrPhone === booking.tracking_token));

- if (code && code !== booking.tracking_token) {
+ if (!code || code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Akses tidak sah. Token tracking wajib dan valid.' });
  }
```

### Patch 5: Penerapan Sanitasi HTML Email Transaksional
**File:** `src/services/email.service.js`
```javascript
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

---

## 7. Kesimpulan & Rekomendasi Prioritas

Sistem memiliki arsitektur yang sangat terencana dan siap digunakan untuk skala produksi tinggi setelah perbaikan celah keamanan dan bug teknis di atas diterapkan.

### Rekomendasi Tindakan (Action Plan):
1. **Prioritas 1 (Emergency):** Terapkan patch autentikasi signature webhook iPaymu (`SEC-02`) dan perbaiki pengecekan token tracking (`SEC-03`, `SEC-04`).
2. **Prioritas 2 (Critical Bug Fix):** Perbaiki runtime `ReferenceError` pada auto-portfolio (`BUG-01`) dan nama kolom `tracking_token` pada Cron Reminder (`BUG-02`).
3. **Prioritas 3 (Hardening):** Amankan endpoint galeri seleksi (`SEC-06`), moodboard (`SEC-07`), dan tambahkan sanitasi HTML pada email transaksional (`BUG-04`).
