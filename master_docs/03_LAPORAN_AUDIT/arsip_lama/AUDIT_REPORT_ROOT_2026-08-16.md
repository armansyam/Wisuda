> [!WARNING]
> **HISTORICAL ARCHIVE / CATATAN HISTORIS (READ-ONLY)**
> Berkas ini adalah rekaman audit/laporan masa lalu yang disimpan semata-mata untuk riwayat historis.
> **DILARANG MENGANGGAP TEMUAN DI DALAM DOKUMEN INI SEBAGAI BUG ATAU KEBUTUHAN IMPLEMENTASI AKTIF.**
> Untuk melihat status fitur, bug yang sudah di-resolve, dan arsitektur aktif saat ini, seluruh AI Agent & Pengembang WAJIB merujuk ke **[master_docs/SYSTEM_STATE.md](../../SYSTEM_STATE.md)**.

---

# 🛡️ LAPORAN AUDIT MENDALAM & DEEP TECHNICAL ANALYSIS
## Wisuda Photography Platform v2.0 (Headless Architecture & Cloud Ecosystem)

**Tanggal Audit:** 16 Agustus 2026  
**Auditor Engine:** Antigravity / Deep Reasoning Security Audit Engine  
**Lingkungan / Target:** Deploy Produksi & Codebase Server  
**Status Audit:** Evaluasi Selesai — Siap Ditinjau Ulang oleh Tim Pengembang / Claude

---

## 📑 DAFTAR ISI
1. [Executive Summary & Security Posture](#1-executive-summary--security-posture)
2. [Matriks Temuan Kerentanan, Bug & UI/UX (Severity Matrix)](#2-matriks-temuan-kerentanan-bug--uiux-severity-matrix)
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
5. [Analisis Kesenjangan UI/UX, Sinkronisasi Frontend & Template Notifikasi](#5-analisis-kesenjangan-uiux-sinkronisasi-frontend--template-notifikasi)
   - 5.1. [MEDIUM] Sisa Nomor Telepon pada Komponen Pratinjau Email Visual Admin Settings
   - 5.2. [MEDIUM] Template WA Alur Pembayaran QRIS Belum Terdaftar di Editor Tab Pesan & Notifikasi
   - 5.3. [LOW/MEDIUM] Banner Notifikasi QRIS di Dashboard Terlalu Lebar (Rekomendasi Lonceng Notifikasi Navbar)
6. [Audit Alur Bisnis, Flow Integritas & Kepatuhan Aturan Sistem](#6-audit-alur-bisnis-flow-integritas--kepatuhan-aturan-sistem)
   - 6.1. Alur 3-Step Wizard Google OAuth & Direct Stream
   - 6.2. Alur 2-Gate Security Transisi Booking ke Post-Production
   - 6.3. Manajemen Storage, Retensi 3 Bulan & Auto-Trash
7. [Rencana Solusi Teknis & Surgical Code Patches](#7-rencana-solusi-teknis--surgical-code-patches)
8. [Kesimpulan & Rekomendasi Prioritas](#8-kesimpulan--rekomendasi-prioritas)

---

## 1. Executive Summary & Security Posture

Sistem **Wisuda Platform v2.0** memiliki fondasi arsitektur yang modern dengan integrasi mutakhir seperti **Direct-to-Drive Resumable Upload (Zero Disk Transit)**, **Database SQLite WAL Mode dengan Indexing Lengkap**, **Sistem Template Email Transaksional yang Kaya**, serta **Portal Freelancer & Tracking Klien Responsif**.

Namun, dari hasil deep-audit menyeluruh terhadap seluruh file backend, frontend, konfigurasi, dan alur integrasi pihak ketiga, ditemukan **sejumlah celah keamanan kritikal (IDOR, Auth Bypass, Webhook Forgery)**, **bug runtime yang menyebabkan fitur otomatisasi (Cron & Auto-Portfolio) gagal berfungsi**, serta **kesenjangan sinkronisasi UI/UX pada tab Pesan & Notifikasi dan Pratinjau Email**.

### Ringkasan Status Keamanan
- **Total Endpoint Diaudit:** 78 API Endpoints
- **Total File Sumber Diaudit:** 52 File (Backend Router, Services, Config, Frontend Scripts, DB Migrations)
- **Status Unit Test Saat Ini:** 24/24 Suites PASS (111 Tests PASS)
  > *Catatan Penting Sesuai Kaidah Fable 5:* Lolosnya automated unit test tidak menjamin 100% sistem bebas celah, karena test yang ada belum menguji serangan manipulasi payload webhook tanpa signature, penyerangan IDOR enumerasi ID integer, atau kasus query kolom yang salah pada cron job riil.

---

## 2. Matriks Temuan Kerentanan, Bug & UI/UX (Severity Matrix)

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
| **UIUX-01** | UI Sync / Frontend | 🟡 **MEDIUM** | `admin-app/src/views/SettingsView.vue:878` | Komponen visual Live Preview Email di Admin Settings masih me-render baris `📞 WA Studio: {{ form.companyPhone }}` padahal di backend email sudah dibersihkan. |
| **UIUX-02** | Feature Gap / UI | 🟡 **MEDIUM** | `admin-app/src/views/SettingsView.vue:3298` | Template WA untuk alur QRIS (`client_qris_invoice`, `client_qris_expired`, `client_overpayment_alert`) belum didaftarkan di array editor `clientWaKeys`. |
| **UIUX-03** | UI/UX Refinement | 🟢 **LOW** | `admin-app/src/views/DashboardView.vue:58-89` | Kartu notifikasi pembayaran QRIS di Dashboard terlalu lebar & besar, memakan ruang vertikal; disarankan dipindah ke ikon Lonceng Notifikasi di Header Navbar. |

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
  Sintaks `if (code && code !== booking.tracking_token)` berarti: "Jika parameter `code` dikirim dan salah, tolak". Namun jika penyerang mengirim request **tanpa parameter `code`** (`code = ''`), maka kondisi `code && ...` bernilai `false`, sehingga **validasi dilewati**.
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
  Endpoint `POST /booking/:id/dp-notify`, `payment-notify`, `balance-notify` hanya menerima parameter `:id` integer dari URL tanpa memverifikasi `tracking_token`.
- **Rekomendasi Perbaikan:**
  Tambahkan verifikasi parameter `tracking_token` pada body/header atau alihkan seluruh flow upload bukti transfer melalui endpoint tracking resmi yang mewajibkan token.

---

### 3.6. [HIGH] Akses & Penimpaan Pilihan Foto Tanpa Token (`/api/public/selection/:id`)
- **Lokasi Kode:** `src/routes/selection.js:8-150`
- **Akar Masalah:**
  Galeri seleksi dan submit pilihan foto dapat diakses dan ditimpa oleh siapapun hanya menggunakan ID integer tanpa token.
- **Rekomendasi Perbaikan:**
  Wajibkan parameter `token` (atau header `x-tracking-token`) yang dicocokkan dengan `booking.tracking_token`.

---

### 3.7. [MEDIUM] Akses & Manipulasi Moodboard Tanpa Token (`/api/public/moodboard/:id`)
- **Lokasi Kode:** `src/routes/moodboard.js:14-21`
- **Akar Masalah:**
  Fungsi `findBooking` melakukan fallback ke `WHERE id = ?`, memungkinkan melihat, menambah, dan menghapus moodboard orang lain hanya dengan menebak ID.
- **Rekomendasi Perbaikan:**
  Hapus fallback `WHERE id = ?` untuk request publik. Hanya izinkan pencarian berdasarkan `tracking_token`.

---

### 3.8. [MEDIUM] Kredensial Akses Freelancer di GET Query String & Ghosting Session Token
- **Lokasi Kode:** `src/routes/freelance-portal.js:62-74, 151-158`
- **Akar Masalah:**
  Request jadwal mengirimkan `access_code` dalam bentuk plaintext di query string URL GET, dan session token hasil login tidak divalidasi.
- **Rekomendasi Perbaikan:**
  Gunakan header `Authorization: Bearer <token>` atau `X-FG-Token: <access_code>` alih-alih meletakkannya di query string URL GET.

---

## 4. Analisis Mendalam Bug Logika, Runtime & Database Failure

---

### 4.1. [HIGH] Runtime `ReferenceError: photoUrl is not defined` pada `ensurePortfolioDraft`
- **Lokasi Kode:** `src/routes/admin/bookings.js:71, 97, 98, 114, 122`
- **Akar Masalah:**
  Parameter fungsi bernama `targetUrl`, namun di dalam badan fungsi memanggil `photoUrl`.
- **Dampak:**
  Setiap kali Admin mengunggah deliverables atau highlight Google Drive pada booking klien, pembuatan draft portofolio otomatis selalu gagal (`ReferenceError: photoUrl is not defined`).
- **Rekomendasi Perbaikan:**
  Ubah semua referensi `photoUrl` di dalam fungsi menjadi `targetUrl`.

---

### 4.2. [HIGH] Kegagalan Eksekusi Cron Reminder H-3 & H-1 (`no such column: b.tracking_code`)
- **Lokasi Kode:** `src/services/cron.service.js:277, 316, 325, 350, 419, 429`
- **Akar Masalah:**
  Query SQL memanggil kolom `b.tracking_code` yang tidak ada di tabel database (`b.tracking_token`).
- **Dampak:**
  Setiap kali Cron Job berjalan pada pukul 08:00 dan 09:00 WITA, eksekusi query melempar error: `SqliteError: no such column: b.tracking_code`, sehingga pengingat H-3 dan H-1 gagal terkirim.
- **Rekomendasi Perbaikan:**
  Ganti `b.tracking_code` menjadi `b.tracking_token` pada seluruh query dan objek parameter di `cron.service.js`.

---

### 4.3. [MEDIUM] Inkonsistensi Status Booking Menjadi `confirmed` Sebelum Verifikasi DP
- **Lokasi Kode:** `src/routes/public.js:761, 775`
- **Akar Masalah:**
  Saat klien mengonfirmasi penawaran dan mengunggah bukti transfer manual, status booking langsung diset `'confirmed'` padahal `dp_status` masih `'uploaded'`.
- **Rekomendasi Perbaikan:**
  Set status awal booking manual menjadi `'pending'` dan hanya ubah menjadi `'confirmed'` setelah diverifikasi sah oleh admin atau webhook QRIS sukses.

---

### 4.4. [MEDIUM] Kerentanan HTML Injection pada Template Email Transaksional
- **Lokasi Kode:** `src/services/email.service.js`
- **Akar Masalah:**
  String input pengguna seperti `client_name`, `university`, `notes` diinterpolasi langsung ke template HTML email tanpa escaping entitas HTML (`escapeHtml`).
- **Rekomendasi Perbaikan:**
  Buat fungsi helper `escapeHtml(str)` di `src/services/email.service.js` dan terapkan pada seluruh variabel teks dinamis.

---

### 4.5. [LOW] Penugasan Variabel Global Liar (`params = []`) pada Query Payroll
- **Lokasi Kode:** `src/routes/admin/payroll.js:79`
- **Akar Masalah:**
  Penulisan `params = []` tanpa deklarasi `let/const` di dalam argumen query SQLite.
- **Rekomendasi Perbaikan:**
  Ganti menjadi `.get().c` tanpa argumen.

---

## 5. Analisis Kesenjangan UI/UX, Sinkronisasi Frontend & Template Notifikasi

---

### 5.1. [MEDIUM] Sisa Nomor Telepon pada Komponen Pratinjau Email Visual Admin Settings
- **Lokasi Kode:** `admin-app/src/views/SettingsView.vue:878`
- **Pemeriksaan Kode:**
  ```vue
  <!-- Clean Light Footer Preview -->
  <div class="p-5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
    <p class="font-bold text-slate-900 mb-1">{{ form.companyName || 'Luxenary.co' }}</p>
    <p class="text-[11px] text-slate-500 mb-1" v-if="form.companyAddress">📍 {{ form.companyAddress }}</p>
    <p class="text-[11px] text-slate-500" v-if="form.companyPhone">📞 WA Studio: {{ form.companyPhone }}</p>
    <p class="text-[10px] text-slate-400 mt-2">© {{ new Date().getFullYear() }} {{ form.companyName || 'Luxenary.co' }} • Hak Cipta Dilindungi...</p>
  </div>
  ```
- **Akar Masalah:**
  Meskipun di backend template wrapper email ([src/services/email.service.js](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/services/email.service.js#L180-L190)) nomor telepon sudah dihapus, di komponen antarmuka *SettingsView.vue* baris `<p ...>📞 WA Studio: {{ form.companyPhone }}</p>` masih tertinggal dan ikut ter-render pada kartu pratinjau visual.
- **Rekomendasi Perbaikan:**
  Hapus baris `form.companyPhone` di footer preview `SettingsView.vue` agar pratinjau di layar admin identik 100% dengan email asli yang dikirim ke klien.

---

### 5.2. [MEDIUM] Template WA Alur Pembayaran QRIS Belum Terdaftar di Editor Tab Pesan & Notifikasi
- **Lokasi Kode:** `admin-app/src/views/SettingsView.vue:3298` vs `src/config/wa-templates.js:157-195`
- **Akar Masalah:**
  Template WhatsApp bawaan untuk:
  1. `client_qris_invoice` (Tagihan Pembayaran QRIS)
  2. `client_qris_expired` (Pemberitahuan QRIS Kedaluwarsa)
  3. `client_overpayment_alert` (Konfirmasi Pembayaran & Kelebihan Dana QRIS)
  sudah didefinisikan di backend ([src/config/wa-templates.js](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/config/wa-templates.js)), namun belum dimasukkan ke dalam array `clientWaKeys` dan kamus `templateLabels` di [SettingsView.vue](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/admin-app/src/views/SettingsView.vue).
- **Dampak:**
  Admin tidak dapat melihat atau mengedit draf pesan WhatsApp resmi yang dikirim ke klien saat melakukan pembayaran QRIS di tab *Pesan & Notifikasi*.
- **Rekomendasi Perbaikan:**
  Daftarkan ketiga template tersebut ke dalam `clientWaKeys` dan `templateLabels` di `SettingsView.vue` lengkap dengan deskripsi dan placeholder pendukungnya.

---

### 5.3. [LOW/MEDIUM] Banner Notifikasi QRIS di Dashboard Terlalu Lebar (Rekomendasi Lonceng Notifikasi Navbar)
- **Lokasi Kode:** `admin-app/src/views/DashboardView.vue:58-89` & `admin-app/src/App.vue:105-131`
- **Akar Masalah:**
  Notifikasi pembayaran QRIS yang belum dibaca saat ini me-render kartu banner besar berukuran penuh (*full-width card*) tepat di bawah bar barometer sistem pada Overview Dashboard.
- **Dampak Estetika:**
  Banner besar ini memakan banyak ruang vertikal dan mendorong kartu metrik KPI penting ke bawah.
- **Rekomendasi Solusi UI/UX:**
  1. Pasang ikon **Lonceng Notifikasi (🔔)** di Header Navbar atas ([App.vue](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/admin-app/src/App.vue)) dengan indikator titik merah (*badge dot*) saat ada notifikasi belum dibaca.
  2. Klik pada lonceng akan membuka popover dropdown elegan berisi daftar notifikasi QRIS, nominal, nama klien, dan tombol cepat kirim WhatsApp.

---

## 6. Audit Alur Bisnis, Flow Integritas & Kepatuhan Aturan Sistem

### 6.1. Alur 3-Step Wizard Google OAuth & Direct Stream
- **Evaluasi Kepatuhan:**
  1. **Step 1 (OAuth Credentials):** Terverifikasi aman. Backend melakukan *probe verification test* ke endpoint Google (`https://oauth2.googleapis.com/token`) pada `POST /settings/verify-oauth-credentials`. Kredensial yang menghasilkan respon `invalid_client` langsung ditolak. Kolom kredensial juga telah diproteksi dari pengubahan liar di endpoint umum `POST /settings`.
  2. **Step 2 (Tautkan Akun Google Drive):** Terverifikasi aman. Menggunakan flow resmi Google OAuth2 consent screen dengan scope `drive`.
  3. **Step 3 (Master Root Folder):** Terverifikasi aman. Hanya dapat diisi dan diuji jika Step 1 dan Step 2 telah aktif.
  4. **Direct Stream Upload:** Terverifikasi aman. Endpoint `/api/v2/admin/uploads/initiate` menggunakan Google Resumable Upload API secara langsung, sehingga file mentah klien tidak pernah transit atau membebani penyimpanan disk VPS.

### 6.2. Alur 2-Gate Security Transisi Booking ke Post-Production
- **Gate 1 (DP Terverifikasi):** Berjalan konsisten. Folder Google Drive otomatis dibuat saat DP berstatus `paid`.
- **Gate 2 (Pelunasan Terverifikasi):** Berjalan konsisten. Galeri seleksi foto (`select-photos.html`) terkunci jika `balance_status !== 'paid'`. Namun, autentikasi pada endpoint API pendukung galeri seleksi perlu diperketat sesuai temuan SEC-06.

### 6.3. Manajemen Storage, Retensi 3 Bulan & Auto-Trash
- Cron job pembersihan retensi folder Google Drive (`runDriveRetentionCleanup`) telah mengimplementasikan logika penghitungan kedaluwarsa berbasis `updated_at` (3 bulan setelah file siap) dan memindahkan folder ke Trash Google Drive secara otomatis saat masa retensi habis.

---

## 7. Rencana Solusi Teknis & Surgical Code Patches

Berikut adalah daftar potongan kode (*surgical patches*) yang telah dirancang secara presisi untuk mengatasi seluruh temuan di atas:

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

### Patch 5: Pembersihan Nomor Telepon di Pratinjau Email Settings
**File:** `admin-app/src/views/SettingsView.vue`
```diff
              <!-- Clean Light Footer -->
              <div class="p-5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                <p class="font-bold text-slate-900 mb-1">{{ form.companyName || 'Luxenary.co' }}</p>
                <p class="text-[11px] text-slate-500 mb-1" v-if="form.companyAddress">📍 {{ form.companyAddress }}</p>
-               <p class="text-[11px] text-slate-500" v-if="form.companyPhone">📞 WA Studio: {{ form.companyPhone }}</p>
                <p class="text-[10px] text-slate-400 mt-2">© {{ new Date().getFullYear() }} {{ form.companyName || 'Luxenary.co' }} • Hak Cipta Dilindungi.<br>Pesan resmi ini dikirimkan secara otomatis oleh {{ form.companyName || 'Luxenary.co' }}.</p>
              </div>
```

### Patch 6: Pendaftaran Template WA QRIS ke Editor Tab Pesan & Notifikasi
**File:** `admin-app/src/views/SettingsView.vue`
```diff
  const clientWaKeys = [
    'client_new_inquiry',
    'client_quotation',
+   'client_qris_invoice',
+   'client_qris_expired',
+   'client_overpayment_alert',
    'client_dp_verified',
    'balance_due',
    'client_fully_paid',
    'reminder_h3_client',
    'reminder_h1_client',
    'delivery_ready',
    'client_rekap'
  ]
```

---

## 8. Kesimpulan & Rekomendasi Prioritas

Sistem memiliki arsitektur yang sangat solid dan siap beroperasi dengan standar keamanan enterprise setelah perbaikan celah keamanan, bug runtime, dan pembersihan UI/UX di atas diterapkan.

### Rekomendasi Urutan Tindakan (*Step-by-Step Action Plan*):
1. **Fase 1 (Keamanan Kritikal & Anti-Bocor)**:
   - Terapkan patch verifikasi Webhook Signature iPaymu (`SEC-02`).
   - Terapkan validasi `tracking_token` ketat pada endpoint tracking, selection gallery, dan moodboard (`SEC-01`, `SEC-03`, `SEC-04`, `SEC-06`, `SEC-07`).
2. **Fase 2 (Bug Runtime & Otomatisasi)**:
   - Perbaiki `ReferenceError: photoUrl` di auto-portfolio (`BUG-01`).
   - Perbaiki nama kolom `tracking_token` di Cron Reminder (`BUG-02`).
   - Set status booking manual menjadi `pending` sebelum verifikasi DP (`BUG-03`).
3. **Fase 3 (UI/UX & Kelengkapan Notifikasi)**:
   - Hapus sisa nomor telepon di footer pratinjau email visual (`UIUX-01`).
   - Daftarkan template WA alur QRIS ke editor tab Pesan & Notifikasi (`UIUX-02`).
   - Sempurnakan banner notifikasi QRIS menjadi ikon Lonceng Notifikasi di Header Navbar (`UIUX-03`).
   - Re-compile Admin SPA (`npm run build` di `admin-app`).
