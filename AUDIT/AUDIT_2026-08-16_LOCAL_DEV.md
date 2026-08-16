# 🛡️ LAPORAN AUDIT LOCAL DEVELOPMENT & CODEBASE ANALYSIS
## Wisuda Photography Platform v2.0 (Developer & Architecture Review)

**Tanggal Audit:** 16 Agustus 2026  
**Auditor Engine:** Antigravity Reasoning Engine / Developer Team  
**Lingkungan / Target:** Local Development & Source Code Repository  
**Status Audit:** Evaluasi Mandiri Selesai — Siap Ditinjau Ulang oleh Claude & Tim Developer

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

Audit ini dilakukan secara independen dari sudut pandang **Tim Pengembang Lokal (Local Development & Codebase Analysis)** untuk melengkapi dan memverifikasi kesehatan seluruh komponen sistem sebelum persiapan perbaikan kode (*maintenance patch*).

Pemeriksaan mencakup seluruh file router Express, middleware autentikasi/validasi, service background (Google Drive, Nodemailer, Cron, iPaymu), konfigurasi SQLite WAL, serta komponen UI Vue SPA di `admin-app/`.

### Ringkasan Status Codebase
- **Total Endpoint Diaudit:** 78 API Endpoints
- **Total File Sumber Diaudit:** 52 File (Backend Router, Services, Config, Frontend Scripts, DB Migrations)
- **Status Unit Test Saat Ini:** 24/24 Suites PASS (111 Tests PASS)

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
  Endpoint ini berada di jalur publik tanpa autentikasi admin atau verifikasi token. Penyerang dapat melakukan scraping seluruh booking dari ID 1 sampai N.
- **Dampak Kebocoran:**
  Mengekspos `client_name`, `client_phone`, `client_email`, `download_url`, `download_password`, `staging_files`, dan bukti transfer.
- **Rekomendasi Perbaikan:**
  Hapus endpoint publik ini atau wajibkan `tracking_token` dan lakukan sanitasi data rahasia.

---

### 3.2. [CRITICAL] Bypass Autentikasi Webhook Pembayaran QRIS (Free Booking Exploit)
- **Lokasi Kode:** `src/routes/public.js:1215-1234`
- **Akar Masalah:**
  ```javascript
  if (incomingSignature) {
    // Verifikasi HMAC Signature
  } else {
    // ⚠️ LOGIKA FATAL: Jika signature tidak dikirim, request tetap diproses!
    console.warn('[iPaymu Webhook] ⚠️ Header signature tidak ditemukan — diproses tanpa verifikasi...');
  }
  ```
- **Vektor Eksploitasi:**
  Penyerang mengirim POST request langsung ke webhook tanpa header signature untuk mengubah status booking menjadi lunas 100% secara gratis.
- **Rekomendasi Perbaikan:**
  Wajibkan header `signature` di mode production (tolak HTTP 401 jika tidak ada/salah).

---

### 3.3. [HIGH] Bypass Tracking Token via Tebakan Sequential ID (`?code=1`)
- **Lokasi Kode:** `src/routes/public.js:1585-1587`
- **Akar Masalah:**
  Pengecekan token mengevaluasi `tokenInput === String(booking.id)` sebagai `true`, sehingga penyerang yang memasukkan `?code=1` dapat membuka file privat Drive.
- **Rekomendasi Perbaikan:**
  Hapus pengecekan `String(booking.id)`. Akses unlock Drive hanya boleh diberikan jika `code === booking.tracking_token`.

---

### 3.4. [HIGH] Bypass Token pada Sub-Aksi Tracking jika Parameter `code` Dikosongkan
- **Lokasi Kode:** `src/routes/public.js:1685, 1748, 1780`
- **Akar Masalah:**
  Kondisi `if (code && code !== booking.tracking_token)` dilewati jika `code` tidak dikirim (string kosong).
- **Rekomendasi Perbaikan:**
  Ubah menjadi `if (!code || code !== booking.tracking_token)`.

---

### 3.5. [HIGH] Mutasi Data & Upload Bukti Liar pada Endpoint `/api/public/booking/:id/*`
- **Lokasi Kode:** `src/routes/public.js:287-424`
- **Akar Masalah:**
  Endpoint notifikasi pembayaran manual menerima ID integer tanpa verifikasi token.
- **Rekomendasi Perbaikan:**
  Tambahkan proteksi token atau alihkan alur melalui endpoint tracking ber-token.

---

### 3.6. [HIGH] Akses & Penimpaan Pilihan Foto Tanpa Token (`/api/public/selection/:id`)
- **Lokasi Kode:** `src/routes/selection.js:8-150`
- **Akar Masalah:**
  Galeri seleksi dan submit pilihan foto dapat diakses dan ditimpa tanpa token.
- **Rekomendasi Perbaikan:**
  Wajibkan parameter token yang dicocokkan dengan `booking.tracking_token`.

---

### 3.7. [MEDIUM] Akses & Manipulasi Moodboard Tanpa Token (`/api/public/moodboard/:id`)
- **Lokasi Kode:** `src/routes/moodboard.js:14-21`
- **Akar Masalah:**
  `findBooking` melakukan fallback ke `WHERE id = ?`.
- **Rekomendasi Perbaikan:**
  Hapus fallback pencarian ID integer untuk request publik.

---

### 3.8. [MEDIUM] Kredensial Akses Freelancer di GET Query String & Ghosting Session Token
- **Lokasi Kode:** `src/routes/freelance-portal.js:62-74, 151-158`
- **Akar Masalah:**
  Kredensial dikirim via query string GET dan session token login tidak divalidasi.
- **Rekomendasi Perbaikan:**
  Gunakan header `X-FG-Token` atau Bearer auth.

---

## 4. Analisis Mendalam Bug Logika, Runtime & Database Failure

---

### 4.1. [HIGH] Runtime `ReferenceError: photoUrl is not defined` pada `ensurePortfolioDraft`
- **Lokasi Kode:** `src/routes/admin/bookings.js:71, 97, 98, 114, 122`
- **Akar Masalah:**
  Parameter fungsi bernama `targetUrl`, namun di dalam badan fungsi memanggil `photoUrl`.
- **Dampak:**
  Auto-curation draft portfolio selalu crash saat admin mengunggah deliverables.
- **Rekomendasi Perbaikan:**
  Ganti semua referensi `photoUrl` menjadi `targetUrl`.

---

### 4.2. [HIGH] Kegagalan Eksekusi Cron Reminder H-3 & H-1 (`no such column: b.tracking_code`)
- **Lokasi Kode:** `src/services/cron.service.js:277, 316, 325, 350, 419, 429`
- **Akar Masalah:**
  Query SQL memanggil kolom `b.tracking_code` yang tidak ada di skema database (`tracking_token`).
- **Dampak:**
  Cron job pengingat H-3 dan H-1 crash saat jam 08:00 dan 09:00 WITA.
- **Rekomendasi Perbaikan:**
  Ganti `b.tracking_code` menjadi `b.tracking_token` pada seluruh query cron.

---

### 4.3. [MEDIUM] Inkonsistensi Status Booking Menjadi `confirmed` Sebelum Verifikasi DP
- **Lokasi Kode:** `src/routes/public.js:761, 775`
- **Akar Masalah:**
  Status booking diset `'confirmed'` saat klien baru mengunggah bukti transfer manual.
- **Rekomendasi Perbaikan:**
  Set status awal menjadi `'pending'` dan hanya ubah menjadi `'confirmed'` setelah diverifikasi admin.

---

### 4.4. [MEDIUM] Kerentanan HTML Injection pada Template Email Transaksional
- **Lokasi Kode:** `src/services/email.service.js`
- **Akar Masalah:**
  Variabel input pengguna diinterpolasi langsung tanpa escaping entitas HTML.
- **Rekomendasi Perbaikan:**
  Terapkan helper `escapeHtml(str)` pada semua variabel teks dinamis.

---

### 4.5. [LOW] Penugasan Variabel Global Liar (`params = []`) pada Query Payroll
- **Lokasi Kode:** `src/routes/admin/payroll.js:79`
- **Akar Masalah:**
  Penulisan `params = []` tanpa deklarasi `let/const`.
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
  Meskipun di backend template wrapper email nomor telepon sudah dihapus, di komponen antarmuka *SettingsView.vue* baris `<p ...>📞 WA Studio: {{ form.companyPhone }}</p>` masih tertinggal dan ter-render pada kartu pratinjau visual.
- **Rekomendasi Perbaikan:**
  Hapus baris `form.companyPhone` di footer preview `SettingsView.vue`.

---

### 5.2. [MEDIUM] Template WA Alur Pembayaran QRIS Belum Terdaftar di Editor Tab Pesan & Notifikasi
- **Lokasi Kode:** `admin-app/src/views/SettingsView.vue:3298` vs `src/config/wa-templates.js:157-195`
- **Akar Masalah:**
  Template WhatsApp bawaan untuk `client_qris_invoice`, `client_qris_expired`, dan `client_overpayment_alert` sudah ada di backend, namun belum dimasukkan ke array `clientWaKeys` dan kamus `templateLabels` di `SettingsView.vue`.
- **Dampak:**
  Admin tidak dapat melihat atau mengedit draf pesan WhatsApp resmi untuk alur pembayaran QRIS di tab *Pesan & Notifikasi*.
- **Rekomendasi Perbaikan:**
  Daftarkan ketiga template tersebut ke dalam `clientWaKeys` dan `templateLabels` di `SettingsView.vue`.

---

### 5.3. [LOW/MEDIUM] Banner Notifikasi QRIS di Dashboard Terlalu Lebar (Rekomendasi Lonceng Notifikasi Navbar)
- **Lokasi Kode:** `admin-app/src/views/DashboardView.vue:58-89` & `admin-app/src/App.vue:105-131`
- **Akar Masalah:**
  Notifikasi pembayaran QRIS saat ini me-render banner besar berukuran penuh di Overview Dashboard yang memakan ruang vertikal.
- **Rekomendasi Solusi UI/UX:**
  Pasang ikon **Lonceng Notifikasi (🔔)** di Header Navbar atas ([App.vue](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/admin-app/src/App.vue)) dengan popover dropdown elegan.

---

## 6. Audit Alur Bisnis, Flow Integritas & Kepatuhan Aturan Sistem

### 6.1. Alur 3-Step Wizard Google OAuth & Direct Stream
- **Evaluasi Kepatuhan:**
  1. **Step 1 (OAuth Credentials):** Terverifikasi aman (Probe test sebelum simpan ke DB).
  2. **Step 2 (Tautkan Akun Google Drive):** Terverifikasi aman (OAuth2 consent screen).
  3. **Step 3 (Master Root Folder):** Terverifikasi aman (Hanya aktif jika Step 1 & 2 terverifikasi).
  4. **Direct Stream Upload:** Terverifikasi aman (Google Resumable Upload API zero disk VPS).

### 6.2. Alur 2-Gate Security Transisi Booking ke Post-Production
- **Gate 1 (DP Terverifikasi):** Folder Google Drive otomatis dibuat saat DP berstatus `paid`.
- **Gate 2 (Pelunasan Terverifikasi):** Galeri seleksi foto terkunci jika `balance_status !== 'paid'`.

### 6.3. Manajemen Storage, Retensi 3 Bulan & Auto-Trash
- Cron job retensi menghitung masa kedaluwarsa 3 bulan dari `updated_at` dan memindahkan folder ke Trash Google Drive saat expired.

---

## 7. Rencana Solusi Teknis & Surgical Code Patches

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

Laporan audit local development ini siap ditinjau secara mendalam bersama Claude untuk memastikan setiap solusi dan patch yang akan dieksekusi benar-benar murni (*zero workaround*).
