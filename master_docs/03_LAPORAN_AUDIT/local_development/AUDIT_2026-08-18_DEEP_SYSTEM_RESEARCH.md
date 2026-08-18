# 📋 LAPORAN AUDIT DEEP RESEARCH SISTEM & ANALISIS DEPLOYMENT VPS
**Proyek:** Wisuda Photography Platform (Luxenary.co Guide & Documentation)  
**Tanggal Audit:** 18 Agustus 2026  
**Status Kode:** READ-ONLY AUDIT (Tidak ada kode produksi yang dimodifikasi sesuai instruksi user)  
**Auditor:** Deep Research AI Engine  

---

## 📌 RINGKASAN EKSEKUTIF

Audit mendalam dilakukan terhadap seluruh arsitektur sistem Wisuda Photography Platform, mencakup:
1. **Analisis Akar Masalah Modul Pengaturan (Settings)**: Kegagalan tombol simpan pada beberapa bagian di lingkungan produksi.
2. **Audit & Solusi Script Deployment (`deploy.sh`)**: Identifikasi kegagalan first-time setup pada VPS server, manajemen Node.js LTS, kompilasi SPA Vite, dan persistensi PM2.
3. **Deep Research Codebase Menyeluruh**: Pemeriksaan 100% rute API (`/api/admin`, `/api/public`, `/api/fg`, `/api/webhook`), middleware otentikasi/keamanan, cron scheduler, database engine SQLite WAL, dan performa frontend SPA Admin.

---

## 🔍 HIGHLIGHT MASALAH 1: ANALISIS TOMBOL SIMPAN PENGATURAN (SETTINGS)

Berdasarkan penelusuran kode frontend (`admin-app/src/views/SettingsView.vue`) dan backend (`src/routes/admin/settings.js`), ditemukan **3 akar masalah utama (Root Causes)** yang menyebabkan tombol simpan tidak berjalan atau gagal berfungsi di produksi:

```
                                  MASALAH TOMBOL SIMPAN
                                             │
    ┌────────────────────────────────────────┼────────────────────────────────────────┐
    ▼                                        ▼                                        ▼
[1. Logic Flaw isDirty]             [2. Backend Whitelist Drop]            [3. OAuth Endpoint Mismatch]
Logic operator precedence pada      src/routes/admin/settings.js           SettingsView.vue memanggil
isGeneralDirty & isSeoDirty         tidak memasukkan `upload_path`         POST /settings (diabaikan backend)
membuat tombol disabled permanen    ke dalam array `allowed`.              alih-alih /verify-oauth-credentials
```

---

### 1.1. Logic Flaw & Operator Precedence pada `isGeneralDirty` dan `isSeoDirty` (Frontend)
* **File Terdampak:** `admin-app/src/views/SettingsView.vue` (Baris 3698–3707 & 3750–3758)
* **Status Tombol UI:** Tombol "Simpan Profil & Identitas" dan "Simpan Pengaturan SEO" **ter-disabled secara permanen** (`disabled: opacity-60 cursor-not-allowed`).

#### Bukti Kode Sumber:
```javascript
// Baris 3698 - SettingsView.vue
const isGeneralDirty = computed(() => {
  if (!initialForm.value || !initialForm.value.companyName && !initialForm.value.companyPhone && !initialForm.value.companyAddress && !initialForm.value.adminPhone && !initialForm.value.app_url) return false
  return (
    form.companyName !== initialForm.value.companyName ||
    form.companyPhone !== initialForm.value.companyPhone ||
    form.companyAddress !== initialForm.value.companyAddress ||
    form.adminPhone !== initialForm.value.adminPhone ||
    form.app_url !== initialForm.value.app_url
  )
})
```

#### Mekanisme Terjadinya Bug:
1. Pada instalasi VPS baru atau saat data awal bernilai string kosong `""`:
   - `!initialForm.value.companyName` bernilai `true` (karena `!"" === true`).
   - `!initialForm.value.companyPhone` bernilai `true`.
   - `!initialForm.value.companyAddress` bernilai `true`.
   - `!initialForm.value.adminPhone` bernilai `true`.
   - `!initialForm.value.app_url` bernilai `true`.
2. Akibatnya, blok `if (...) return false` **selalu dieksekusi pertama kali**, sehingga fungsi langsung mengembalikan `false` tanpa pernah mengevaluasi perbandingan perubahan nilai input (`form.companyName !== initialForm.value.companyName`).
3. Tombol simpan yang terikat pada `:disabled="saving || !isGeneralDirty"` tidak akan pernah berubah menjadi aktif (`enabled`), meskipun admin telah mengetik data baru di form.
4. Pola bug yang identik terjadi pada `isSeoDirty` (Baris 3750).

---

### 1.2. Backend Whitelist Mengabaikan `upload_path` & `upload_path_secondary` (Backend)
* **File Terdampak:** `src/routes/admin/settings.js` (Baris 623–640)
* **Status Tombol UI:** Tombol "Simpan Lokasi Storage" di tab Sistem & Storage tampak berhasil diklik, namun data **tidak pernah tersimpan di database**.

#### Bukti Kode Sumber:
```javascript
// Baris 623 - src/routes/admin/settings.js
const allowed = [
  'companyName', 'companyPhone', 'companyAddress', 'adminPhone', 'companyEmail',
  'company_name', 'company_phone', 'company_address', 'admin_phone', 'company_email',
  'dp_percentage', 'upload_deadline_days', 'auto_approve_hours', 'booking_link_expiry_hours',
  'max_photos_per_fg_per_day', 'dp_expired_days', 'bank_accounts', 'invoice_prefix',
  'session_timeout_minutes', 'portfolio_limit',
  'seo_domain', 'seo_title', 'seo_description', 'seo_keywords',
  'seo_og_image', 'google_site_verification', 'supported_cities',
  'google_drive_master_folder_id', 'google_drive_portfolio_folder_id', 'google_drive_api_key',
  // 'upload_path' dan 'upload_path_secondary' HILANG DARI ARRAY INI!
  'backup_path', 'backupPath',
  'drive_retention_months', 'drive_auto_trash_enabled', 'enable_freelance_portal', 'fg_auto_rotate_tokens_enabled', 'app_url', 'domain_url',
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'smtp_from_name', 'smtp_from_email',
  'ipaymu_enabled', 'ipaymu_env', 'ipaymu_qris_expiry_minutes'
];
```

#### Mekanisme Terjadinya Bug:
1. Saat admin menekan tombol simpan path storage di UI, payload JSON dikirimkan:
   `{ upload_path: "./DATA/uploads", upload_path_secondary: "", backup_path: "./DATA/backups" }`.
2. Backend melakukan filtering melalui loop `for (const key of allowed)`.
3. Karena `upload_path` dan `upload_path_secondary` tidak ada dalam array `allowed`, backend **mengabaikan field tersebut secara diam-diam**.
4. Hanya `backup_path` yang tersimpan ke tabel `settings`.
5. Di baris 552 `src/routes/admin/settings.js`, terdapat pengecekan:
   `const isUploadPathConfiguredInDb = getSetting('upload_path', null) !== null;`
   Karena `upload_path` tidak pernah tersimpan di DB, `safeSettings.storage_needs_setup` selalu bernilai `true`, sehingga sistem terus meminta konfigurasi ulang storage.

---

### 1.3. Mismatch Endpoint Penyimpanan Kredensial Google OAuth (Arsitektur)
* **File Terdampak:** `admin-app/src/views/SettingsView.vue` (Baris 3347–3356) vs `src/routes/admin/settings.js` (Baris 581–585 & 749–791)
* **Status Tombol UI:** Tombol "2. Simpan Kredensial" di Wizard Google OAuth tampak loading namun data Client ID & Secret tidak masuk ke DB jika verifikasi probe terpisah.

#### Bukti Kode Sumber:
* Di `src/routes/admin/settings.js` baris 581–585, `google_oauth_client_id` dan `google_oauth_client_secret` **sengaja diblokir dari endpoint umum `POST /api/admin/settings`** untuk menjamin *probe verification test* ke server Google sebelum data disimpan. Kredensial hanya boleh disimpan via `POST /api/admin/settings/verify-oauth-credentials`.
* Namun di `SettingsView.vue` baris 3347, fungsi `saveOAuthCredentials()` mengirim `POST` ke `${API}/settings` (`/api/admin/settings`), yang langsung mengabaikan kedua field tersebut.
* **Solusi Alur:** Tombol "1. Verifikasi Kredensial" sebenarnya sudah otomatis menyimpan kredensial ke DB saat probe sukses (`setSetting('google_oauth_client_id', ...)` di baris 780). Tombol "2. Simpan" di UI menjadi redundan dan mengirim ke endpoint yang salah.

---

## 🚀 HIGHLIGHT MASALAH 2: AUDIT & PENYEMPURNAAN `deploy.sh` (VPS FIRST-TIME SETUP)

Skrip `deploy.sh` saat ini dirancang untuk pembaruan cepat (deploy update), namun memiliki celah signifikan saat dijalankan pertama kali (**first-time setup**) pada server VPS baru (Fresh OS Ubuntu/Debian):

```
                                      DIAGNOSA DEPLOY.SH PADA FRESH VPS
                                                     │
     ┌───────────────────┬───────────────────────────┼───────────────────────────┬───────────────────┐
     ▼                   ▼                           ▼                           ▼                   ▼
[1. Node.js Versi]  [2. Native Addons]        [3. Memory/OOM]            [4. PM2 Setup]       [5. Git Dubious]
Tidak ada auto-     Crash ABI module jika     Vite build crash di        Hanya warning jika   Gagal git pull jika
install/update Node  Node diupdate tanpa      VPS RAM 1GB-2GB tanpa      PM2 belum ada; tidak beda owner file
ke v20 LTS          `npm rebuild`             swap memory                auto-install         (root vs non-root)
```

---

### 2.1. Daftar Masalah Teknis pada `deploy.sh` Saat Setup Baru

| No | Masalah Teknis | Dampak pada Server VPS | Solusi Otomatis yang Diperlukan |
| :--- | :--- | :--- | :--- |
| **1** | **Ketiadaan Pengecekan & Instalasi Node.js LTS (v20.x / v22.x)** | Ubuntu default `apt install nodejs` sering menginstal Node.js versi lama (Node 12, 14, atau 18 tanpa npm). `Vite 6` di `admin-app` mewajibkan Node.js >= 18.0.0. Deployment langsung gagal saat build SPA. | Tambahkan deteksi versi Node.js. Jika Node.js belum terpasang atau versinya `< 20`, skrip otomatis mengunduh & memasang Node.js 20 LTS via official NodeSource repository. |
| **2** | **Ketiadaan C/C++ Build Essentials (`gcc`, `g++`, `make`, `python3`)** | Module `better-sqlite3 ^12.11.1` dan `sharp ^0.35.3` adalah native C++ bindings. Pada minimal image VPS, ketiadaan build tools menyebabkan `npm install` gagal mengompilasi module. | Tambahkan perintah otomatis `apt-get install -y build-essential python3` pada fase inisialisasi server Debian/Ubuntu. |
| **3** | **Crash ABI Native Module Pasca Update Node.js (`NODE_MODULE_VERSION mismatch`)** | Jika admin memperbarui versi Node.js VPS, binary `better-sqlite3.node` yang sudah ada akan crash saat server start. | Tambahkan perintah `npm rebuild better-sqlite3 sharp bcrypt` setelah instalasi dependensi. |
| **4** | **OOM Killer (Out Of Memory) saat Kompilasi Vite SPA di VPS RAM 1GB–2GB** | Proses build SPA (`npm run build` Vite + Tailwind + Vue) membutuhkan alokasi memori besar. Pada VPS kecil tanpa Swap, kernel Linux langsung me-kill proses (`Killed: 9`). | Tambahkan auto-check Swap Memory. Jika total RAM < 2GB dan Swap = 0, skrip otomatis membuat dan mengaktifkan `2GB swapfile` (`/swapfile`). |
| **5** | **PM2 Tidak Diinstal Otomatis (Hanya Menampilkan Warning Manual)** | Baris 208 `deploy.sh` hanya memberikan warning teks merah jika PM2 belum ada, memaksa user keluar dan menjalankan manual. | Tambahkan auto-install PM2 secara global (`npm install -g pm2`), inisialisasi `pm2 startup`, dan jalankan service secara mandiri. |
| **6** | **Konflik Kepemilikan Git (`fatal: detected dubious ownership`)** | Terjadi saat script dijalankan menggunakan `sudo` atau perpindahan user deploy. | Tambahkan perintah `git config --global --add safe.directory "$PWD"`. |
| **7** | **Izin Akses Direktori Runtime (`DATA/`, `DATA/uploads/`, `logs/`)** | Izin file database SQLite terkadang terkunci jika dibuat oleh user yang berbeda. | Pastikan `chmod -R 755 DATA logs` diterapkan secara konsisten. |

---

## 🔬 DEEP RESEARCH CODEBASE: AUDIT TOTAL MENYELURUH SISTEM

Berikut adalah hasil audit mendalam terhadap seluruh modul dan file dalam sistem:

### 1. Modul Webhook (`src/routes/webhook.js`)
* **Temuan Runtime Bug (Line 74):**
  Pada endpoint `POST /api/webhook/inquiry`, kode memanggil:
  `let msg = templates.admin_new_inquiry.replace(...)`
  Di dalam `getDefaultWaTemplates()`, template tersebut bernama `client_new_inquiry` (tidak ada key `admin_new_inquiry`). Pemanggilan ini akan melempar `TypeError: Cannot read properties of undefined (reading 'replace')` saat ada request webhook inquiry masuk.

### 2. Modul Background Cron Scheduler (`src/services/cron.service.js`)
* **Kondisi Aktif:**
  - 10 Task Cron (Reminder H-3, Reminder H-1, Auto-Approve 24 jam, QRIS Expired Check setiap 2 menit, Google Drive Retention H-90, Backup DB harian, dll) beroperasi dengan baik dan aman berbasis zona waktu `Asia/Makassar` (WITA).
  - Penanganan rotasi log (`wisuda-builder.log`) memiliki mekanisme auto-rotate pada ukuran 5 MB.
* **Catatan Teardown:**
  - Timer internal `node-cron` tetap mempertahankan event loop aktif. Pada eksekusi unit test Jest, flag `--forceExit` diperlukan agar proses test worker dapat selesai secara sempurna.

### 3. Keamanan & Proteksi Data (IDOR & Token Isolation)
* **Kondisi Keamanan:**
  - Seluruh akses publik (`/api/public/booking/:id`, `/api/public/selection/:id`, `/api/public/moodboard/:id`) telah diproteksi ketat menggunakan `tracking_token` (SHA-256 random token). Tidak ada kebocoran IDOR berbasis sequential ID.
  - Endpoint Webhook QRIS iPaymu telah diverifikasi signature keamanannya pada mode produksi.

### 4. Database Engine & Migration Integrity (`src/config/database.js`)
* **Kondisi Database:**
  - Menggunakan `better-sqlite3` sinkron dengan WAL Mode (`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`).
  - Indexing Foreign Keys dan migrasi skema tabel berjalan otomatis saat startup tanpa merusak data yang sudah ada.

### 5. Kompilasi Frontend Admin SPA (`admin-app`)
* **Hasil Uji Kompilasi:**
  - Berhasil di-build dengan `vite v6.4.3` ke dalam `public/admin/` (Ukuran Bundle: JS 1,069 kB, CSS 117 kB).
  - Terdapat warning optimasi chunking (> 500 kB) yang dapat ditingkatkan di masa mendatang menggunakan manualChunks code-splitting.

---

## 📊 TABEL REKOMENDASI TINDAKAN (ACTION PLAN MATRIX)

> [!NOTE]
> Seluruh perbaikan di bawah ini telah dipetakan dan siap dieksekusi setelah mendapatkan persetujuan resmi dari user.

| ID | Komponen / File | Masalah Teridentifikasi | Rekomendasi Solusi Teknis |
| :--- | :--- | :--- | :--- |
| **ACT-01** | `admin-app/src/views/SettingsView.vue` | Tombol Simpan Profil & SEO ter-disabled permanen karena logic flaw `isGeneralDirty` & `isSeoDirty`. | Perbaiki computed property dirty check agar tidak langsung `return false` saat nilai awal kosong. |
| **ACT-02** | `src/routes/admin/settings.js` | `upload_path` & `upload_path_secondary` hilang dari whitelist `allowed`. | Tambahkan `upload_path` dan `upload_path_secondary` ke array `allowed` dan body validator. |
| **ACT-03** | `admin-app/src/views/SettingsView.vue` | `saveOAuthCredentials` memanggil endpoint `/settings` yang memblokir key OAuth. | Satukan alur verifikasi & simpan Google OAuth langsung ke `/verify-oauth-credentials`. |
| **ACT-04** | `deploy.sh` | Setup VPS gagal jika Node.js usang (< v20), tidak ada build-essential, PM2 tidak auto-install, atau RAM < 2GB tanpa Swap. | Rombak `deploy.sh` menjadi single-command bulletproof script: auto-install Node 20 LTS, auto-swap 2GB, auto-rebuild native modules, dan auto-setup PM2. |
| **ACT-05** | `src/routes/webhook.js` | `TypeError` pada `templates.admin_new_inquiry`. | Sesuaikan key template menjadi `templates.client_new_inquiry || templates.admin_new_inquiry`. |

---
*Laporan Audit Deep Research Selesai — Tidak ada kode produksi yang dimodifikasi selama audit berlangsung.*
