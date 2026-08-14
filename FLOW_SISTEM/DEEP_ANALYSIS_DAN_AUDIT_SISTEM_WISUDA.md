# 🔬 LAPORAN DEEP ANALYSIS & AUDIT KODE TOTAL SISTEM WISUDA
**Tanggal Audit:** 14 Agustus 2026  
**Cakupan Audit:** Backend Routes, Database Schema, Cloud Pipelines (Drive & SMTP), Frontend Client/Freelancer, Admin SPA, dan UI/UX  
**Prinsip Laporan:** 100% Transparan, Tanpa Asumsi Manis, Berdasarkan Inspeksi Kode Nyata (*Empirical Code Inspection*)

---

## 📑 DAFTAR ISI
1. [Arsitektur Inti & Pilar yang Terverifikasi Solid](#1-arsitektur-inti--pilar-yang-terverifikasi-solid)
2. [4 Temuan Celah Logika & Edge Cases Nyata di Kode](#2-4-temuan-celah-logika--edge-cases-nyata-di-kode)
3. [Audit Mendalam Database & Relasi Antar Tabel](#3-audit-mendalam-database--relasi-antar-tabel)
4. [Audit Pipeline Google Drive & Zero-Disk Transit](#4-audit-pipeline-google-drive--zero-disk-transit)
5. [Audit Layanan Email SMTP & Otomasi Siklus](#5-audit-layanan-email-smtp--otomasi-siklus)
6. [Audit Antarmuka (UI/UX) & Pengalaman Pengguna](#6-audit-antarmuka-uiux--pengalaman-pengguna)
7. [Blueprint & Solusi Tindakan Perbaikan](#7-blueprint--solusi-tindakan-perbaikan)

---

## 1. Arsitektur Inti & Pilar yang Terverifikasi Solid

Berdasarkan inspeksi statis dan verifikasi alur data, pilar-pilar berikut telah teruji bekerja secara solid sesuai spesifikasi:

### A. Direct-to-Drive Stream Engine (`src/routes/direct-upload.js`)
* **Zero Disk Transit**: Berkas foto mentah resolusi tinggi dan master editing dialirkan (*streamed*) langsung dari antarmuka Admin ke Google Drive Resumable Upload API tanpa pernah disimpan atau ditransitkan pada disk server VPS.
* **Upload Queue Lock**: Tombol eksekusi *Push Staging*, *Push Highlight*, dan *Push Final* di `DeliverablesView.vue` terkunci secara reaktif saat antrean pengunggahan sedang aktif `(x/y) Mengunggah...` untuk mencegah berkas terputus.

### B. Proteksi Financial Gate (Gate 1 & Gate 2)
* **Gate 1 (Verifikasi DP)**: Alur penugasan fotografer diblokir ketat oleh sistem sebelum admin memverifikasi bukti transfer pembayaran uang muka (`dp_status = 'paid'`).
* **Gate 2 (Verifikasi Pelunasan)**: Tautan folder master Google Drive (`drive_parent_url_unlocked` dan `download_url_unlocked`) pada halaman tracking klien terkunci secara otomatis hingga status pelunasan terverifikasi (`balance_status = 'paid'`).

### C. Autentikasi Terisolasi Per-Peran
* **Admin**: Autentikasi berbasis JWT dengan enkripsi `bcrypt` (10 rounds) dan verifikasi status aktif di database.
* **Freelancer**: Autentikasi berbasis `access_code` unik 8-karakter tanpa kerumitan password yang mempermudah akses lapangan dari perangkat mobile.
* **Klien**: Autentikasi berbasis `tracking_token` kriptografis (`TRK-{id}-{hash}`) untuk setiap aksi kritis (approval portofolio, input ulasan rating, permohonan reschedule).

---

## 2. 4 Temuan Celah Logika & Edge Cases Nyata di Kode

Dari penelusuran mendalam baris-per-baris, ditemukan 4 celah logika teknis nyata di dalam kode saat ini:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          4 TEMUAN CELAH LOGIKA SISTEM                                  │
├────┬─────────────────────────────┬──────────────────────────┬──────────────────────────┤
│ No │ Lokasi Kode                 │ Nama Celah               │ Dampak Operasional       │
├────┼─────────────────────────────┼──────────────────────────┼──────────────────────────┤
│ 1  │ src/routes/admin.js:798     │ Reschedule Orphan Sched  │ Jadwal FG terkunci di    │
│    │                             │                          │ tanggal lama             │
│ 2  │ src/utils/timeSlot.js:86    │ Ignore 'unavailable'     │ FG libur mandiri tetap   │
│    │                             │                          │ muncul di rekomendasi    │
│ 3  │ src/services/cron.service.js│ Retention Email Missing  │ Klien tidak dapat email  │
│    │ :830                        │                          │ pengingat batas Drive    │
│ 4  │ src/routes/admin/portfolio. │ One-way Rating Sync      │ Edit rating di admin tak │
│    │ js:109                      │                          │ terupdate di tracking    │
└────┴─────────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

### 🔴 Celah 1: Jadwal Fotografer Menggantung di Tanggal Lama Pasca Reschedule
* **Lokasi Berkas:** [src/routes/admin.js:770–801](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/routes/admin.js#L770-L801) (`POST /reschedule-requests/:id/approve`)
* **Analisis Kode:**
  ```javascript
  // ❌ Kode Saat Ini:
  db.prepare(`
    INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
    VALUES (?, ?, 'booked', ?, 'Rescheduled Booking #' || ?)
  `).run(targetFgId, r.new_graduation_date, r.booking_id, r.booking_id);
  ```
* **Masalah:**  
  Ketika Admin menyetujui jadwal baru (misal pindah dari `2026-08-20` ke `2026-08-28`), sistem memasukkan jadwal baru ke `fg_schedules`. Namun, entri jadwal lama pada tanggal `2026-08-20` untuk `booking_id` tersebut **tidak dihapus**.
* **Dampak Operasional:**  
  Fotografer tetap berstatus `booked` (sibuk) di tanggal lama `2026-08-20`, sehingga Admin tidak bisa menugaskannya ke klien lain di tanggal tersebut meskipun sesi sebenarnya sudah dipindahkan.
* **Solusi Perbaikan:**
  ```javascript
  // Hapus jadwal lama di fg_schedules sebelum mencatat jadwal baru
  db.prepare("DELETE FROM fg_schedules WHERE booking_id = ? AND date = ?").run(r.booking_id, r.old_graduation_date);
  ```

---

### 🔴 Celah 2: Pencarian Ketersediaan FG Mengabaikan Status `unavailable` Manual
* **Lokasi Berkas:** [src/utils/timeSlot.js:86–101](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/utils/timeSlot.js#L86-L101) (`findAvailableFreelancers`)
* **Analisis Kode:**
  ```javascript
  // ❌ Kode Saat Ini:
  let fgQuery = `SELECT id, name, phone, city, rating FROM freelancers WHERE active = 1`;
  // ... hanya difilter berdasarkan checkFgConflict (tabel assignments)
  ```
* **Masalah:**  
  Fungsi `findAvailableFreelancers` hanya memeriksa apakah fotografer memiliki `assignments` bentrok pada tanggal & jam tersebut. Fungsi ini **belum mengecek tabel `fg_schedules`** jika fotografer secara mandiri menandai dirinya libur/izin (`status = 'unavailable'`).
* **Dampak Operasional:**  
  Fotografer yang sedang libur/berhalangan hadir tetap muncul di daftar fotografer yang direkomendasikan sistem saat Admin ingin menetapkan penugasan.
* **Solusi Perbaikan:**
  ```javascript
  // Tambahkan filter eksklusi status unavailable di kueri:
  fgQuery += ` AND id NOT IN (SELECT fg_id FROM fg_schedules WHERE date = ? AND status = 'unavailable')`;
  ```

---

### 🟡 Celah 3: Cron Retensi Drive H-14 & H-3 Belum Mengirim Email Otomatis
* **Lokasi Berkas:** [src/services/cron.service.js:830–860](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/services/cron.service.js#L830-L860) (`runDriveRetentionCleanup`)
* **Analisis Kode:**
  ```javascript
  // ❌ Kode Saat Ini:
  const waLink = `https://wa.me/${b.client_phone}?text=${encodeURIComponent(msg)}`;
  log(`[DriveRetention] H-14 Reminder WA: ${b.client_name} - ${waLink}`);
  // ... hanya mencatat URL WA ke log console server
  ```
* **Masalah:**  
  Cron job background yang berjalan setiap hari pukul 02:00 WITA untuk memeriksa masa simpan Google Drive (H-14 dan H-3) hanya mencatat tautan wa.me ke log console server, tanpa mengirimkan email resmi ke `client_email`.
* **Dampak Operasional:**  
  Klien yang tidak memeriksa WhatsApp secara manual tidak mendapatkan pemberitahuan resmi di kotak masuk email mereka bahwa folder Google Drive akan segera dibersihkan.
* **Solusi Perbaikan:**
  Panggil fungsi `emailService.sendEmail()` dengan template peringatan masa simpan Drive resmi jika `b.client_email` tersedia.

---

### 🟡 Celah 4: Sinkronisasi Satu Arah Rating dari Portofolio ke Booking
* **Lokasi Berkas:** [src/routes/admin/portfolio.js:109–153](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/routes/admin/portfolio.js#L109-L153) (`updatePortfolioHandler`)
* **Analisis Kode:**
  Saat klien mengirim rating di halaman tracking, sistem memperbarui tabel `bookings` dan `portfolio_items` (dua arah).  
  Namun, saat Admin mengoreksi rating/ulasan dari menu Admin Portofolio, pembaruan hanya dijalankan pada tabel `portfolio_items`, tanpa sinkronisasi balik ke kolom `rating` dan `feedback_notes` di tabel `bookings`.
* **Dampak Operasional:**  
  Jika Admin mengubah rating di halaman Portofolio, nilai rating di halaman Tracking klien tetap menampilkan nilai lama.
* **Solusi Perbaikan:**
  Tambahkan sinkronisasi balik: `if (portfolio.booking_id) db.prepare("UPDATE bookings SET rating = ?, feedback_notes = ? WHERE id = ?").run(...)`.

---

## 3. Audit Mendalam Database & Relasi Antar Tabel

| Tabel | Kunci Utama / Relasi | Index Pendukung | Evaluasi Integritas |
| :--- | :--- | :--- | :---: |
| `bookings` | `id` (PK) | `idx_bookings_status`, `idx_bookings_grad_date` | ✅ Sangat Baik (Default rating = NULL) |
| `assignments` | `id` (PK), `booking_id` -> `bookings(id)`, `fg_id` -> `freelancers(id)` | `idx_assignments_booking`, `idx_assignments_fg` | ✅ Sangat Baik |
| `fg_schedules` | `id` (PK), `fg_id` -> `freelancers(id)`, `UNIQUE(fg_id, date)` | `idx_fg_schedules_date` | ⚠️ Perlu perbaikan penghapusan jadwal lama |
| `payouts` | `id` (PK), `assignment_id` -> `assignments(id)`, `fg_id` -> `freelancers(id)` | `idx_payouts_status`, `idx_payouts_ref` | ✅ Sangat Baik |
| `portfolio_items` | `id` (PK), `booking_id` -> `bookings(id)` | `idx_portfolio_published` | ⚠️ Perlu sinkronisasi balik ke bookings |
| `reschedule_requests` | `id` (PK), `booking_id` -> `bookings(id)` | `idx_reschedule_status` | ✅ Sangat Baik |

---

## 4. Audit Pipeline Google Drive & Zero-Disk Transit

1. **Google OAuth 3-Step Wizard**:
   * **Step 1**: Form Kredensial divalidasi via *live probe test* ke endpoint Google Token. Kredensial tidak tersimpan jika Google merespons `invalid_client`.
   * **Step 2**: Penautan akun Google Drive hanya terbuka jika Step 1 terkonfirmasi cocok 100%.
   * **Step 3**: Pemilihan Master Root Folder hanya terbuka setelah Step 2 berhasil.
2. **Kinerja Streaming Berkas**:
   * Menggunakan pipeline *stream piping* Node.js langsung ke Google Drive API tanpa *buffer memory explosion* atau transit disk lokal.
3. **Kalkulasi Ukuran Folder**:
   * Menggunakan pemindaian rekursif dengan dukungan `nextPageToken` untuk folder dengan > 1000 berkas foto.

---

## 5. Audit Layanan Email SMTP & Otomasi Siklus

1. **Palet Desain Email**:
   * Latar Belakang: `#FAF9F6` (Alabaster / Cream Lembut)
   * Kartu Utama: `#FFFFFF` dengan bingkai halus `#E8D5C8`
   * Header: `#111E35` (Midnight Navy) dengan garis aksen emas `#C59B63`
   * Tipografi: Teks utama `#111E35`, label `#7A6E65`, nominal emerald `#059669`
2. **Anti-Spam & Deliverability**:
   * **CID Inline Attachment**: File logo disematkan fisik (`cid:studiologo`) agar tidak pecah di Gmail/Apple Mail.
   * **Fallback Plaintext**: Dilengkapi konverter otomatis `stripHtmlToPlain` untuk kepatuhan RFC email client.
3. **4 Email Otomasi Siklus Freelance**:
   * Pendaftaran Calon Mitra -> Penerimaan / Approval Kode Akses -> Surat Tugas Pemotretan -> E-Slip Invoice Payroll.

---

## 6. Audit Antarmuka (UI/UX) & Pengalaman Pengguna

### A. Portal Klien (`public/tracking.html`)
* **Rating & Testimoni**: Klien dapat memilih bintang 1–5, menulis ulasan, serta mengubah ulasan kapan saja dengan tombol `[ ✏️ Ubah Rating & Ulasan ]`.
* **Masa Retensi Drive**: Menampilkan sisa hari penyimpanan dan tanggal batas pembersihan dengan indikator visual pill.
* **Persetujuan Portofolio**: Opsi *Approved* / *Declined* yang dapat diubah fleksibel oleh klien.

### B. Portal Freelance (`public/freelance-portal.html` & `public/payout-invoice.html`)
* **Aksesibilitas**: Autentikasi instan menggunakan kode akses tanpa perlu mendaftar akun dan mengingat sandi.
* **E-Slip Invoice**: Tampilan tanda terima honor digital resmi dengan nomor referensi transfer asli (`TF-xxxx`) yang siap cetak/simpan PDF.

### C. Admin Dashboard SPA (`admin-app/`)
* **Upload Pasca Produksi**: Proteksi *locking* tombol aksi selama upload aktif mencegah pengiriman data yang belum selesai diunggah.
* **Manajemen Payroll**: Bulk payout transfer dengan pembuatan referensi otomatis dan pengiriman slip email simultan.

---

## 7. Blueprint & Solusi Tindakan Perbaikan

Berikut adalah langkah konkret untuk menyelesaikan 4 temuan celah logika di atas:

1. **Perbaikan Reschedule Jadwal Lama**:
   * Tambahkan `DELETE FROM fg_schedules WHERE booking_id = ? AND date = ?` pada endpoint approve reschedule di `src/routes/admin.js`.
2. **Pengecekan Status Libur FG Mandiri**:
   * Tambahkan klausa `NOT EXISTS` untuk status `unavailable` pada fungsi `findAvailableFreelancers` di `src/utils/timeSlot.js`.
3. **Otomasi Email Retensi Drive**:
   * Tambahkan pemanggilan `emailService.sendEmail()` pada cron harian H-14 dan H-3 di `src/services/cron.service.js`.
4. **Sinkronisasi Dua Arah Rating Portofolio**:
   * Tambahkan kueri pembaruan ke tabel `bookings` saat admin mengedit rating di `src/routes/admin/portfolio.js`.

---
**Status Dokumen:**  
Laporan audit mendalam ini telah disimpan dan diarsipkan sebagai dokumen acuan resmi sistem.
