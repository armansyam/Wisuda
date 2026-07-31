# WORKFLOW OPERASIONAL STUDIO FOTOGRAFI WISUDA v2.0
**Panduan Ringkas, Visual SOP & Presentasi Eksekutif Sistem Operasional Wisuda**

*Dokumen Resmi Peninjauan Lapangan & Presentasi Vendor Studio — Edisi Juli 2026*

---

##  EXECUTIVE OVERVIEW: MENGAPA WISUDA PLATFORM UNGGUL?

Platform Wisuda v2.0 diciptakan untuk menyelesaikan masalah utama bisnis studio foto wisuda: **kekacauan komunikasi dengan fotografer freelance, keterlambatan pengiriman foto, dan pengeluaran biaya penyimpanan server yang membengkak**.

### 🌟 3 Pilar Keunggulan Utama Platform:

1. **Single-Control Admin Panel (100% Kontrol di Admin)**:
   Admin Studio memiliki wewenang penuh dalam memverifikasi pembayaran, mengonfirmasi penerimaan berkas foto dari fotografer, menautkan folder Google Drive, hingga mempublikasikan galeri seleksi/final ke client.

2. **Simplified Freelance Portal (Fotografer Bebas Ribet)**:
   Fotografer freelance di lapangan **tidak lagi dibebani** tugas rumit mengunggah/menyetor file di portal. Fotografer hanya memiliki 2 aksi utama:
   - Melihat jadwal sesi foto & mengeklik **`📸 Photo Shoot Selesai`** setelah pemotretan.
   - Mengeklik **`💬 Minta Payment Fee`** untuk menagih honor foto via WhatsApp.

3. **Zero-Storage Staging Gallery & Google Drive Automation**:
   Foto mentah (*RAW/JPG*) langsung disimpan di Google Drive Studio secara gratis tanpa membebani kapasitas server lokal. Sistem secara otomatis memindai dan menghitung jumlah foto staging.

---

## 🔄 ALUR KERJA 3-TAHAP (STEP-BY-STEP OPERATIONAL SOP)

```
[Tahap 1: Inquiry & DP] ──> [Tahap 2: Booking & Shoot] ──> [Tahap 3: Pasca Produksi]
   (Client Reservasi)          (Assign FG & Pelunasan)       (Terima File -> Push Drive)
```

### 📍 TAHAP 1: INQUIRY & RESERVASI CLIENT
1. Client mengisi formulir reservasi online di `inquiry.html`.
2. Admin menghitung biaya transportasi (*transport charge*) dan mengecek jadwal.
3. Admin mengeklik **`Kirim Quotation`** ➔ Sistem menghasilkan token unik dan pesan WhatsApp otomatis.
4. Client melakukan transfer DP (50%), Admin mengeklik **`Verifikasi DP`** ➔ Data otomatis berpindah ke **Tahap 2**.

---

### 📍 TAHAP 2: CLIENT BOOKING & PENUGASAN FOTOGRAFER
1. Admin menugaskan fotografer (**`Assign FG`**). Penugasan otomatis berada pada status `accepted` dan muncul di Portal Freelance.
2. Fotografer mengeksekusi sesi foto di lapangan, lalu mengeklik **`📸 Photo Shoot Selesai`**.
3. **Transisi Pelunasan ➔ Post Production**:
   - **Client Bayar 100% Lunas Sejak Awal:** Booking **langsung berpindah ke Tahap 3 (Post Production)**.
   - **Client Bayar DP 50%:** Booking berada di status Menunggu Pelunasan. Setelah Admin mengeklik **`Verifikasi Pelunasan`** ➔ booking **otomatis berpindah ke Tahap 3 (Post Production)**.

---

### 📍 TAHAP 3: PASCA PRODUKSI 3-LANGKAH (POST PRODUCTION SOP)

```
[Langkah 1: Terima File] ──> [Langkah 2: Upload Staging] ──> [Langkah 3: Push Staging]
(Tombol Amber Aktif)         (Upload File di Drive)          (Tombol Animated Bounce)
```

1. **Langkah 1: Konfirmasi Penerimaan Berkas Foto**:
   - Admin mengeklik tombol **`📦 Terima File`** di Admin Panel (`/admin/deliverables`).
   - Indikator Fotografer berubah seragam menjadi **`✓ File Diterima`** (Hijau bersih).
   - Status Tahap berpindah ke **`Menunggu Upload Staging`**.
2. **Langkah 2: Unggah Foto ke Google Drive Staging**:
   - Admin mengeklik tombol **`☁️ Upload File`** untuk menautkan folder Drive Staging yang berisi foto seleksi.
3. **Langkah 3: Publikasi Galeri Seleksi (Push Staging)**:
   - Begitu foto terdeteksi di Drive, tombol **`🚀 Push Staging`** **otomatis berubah terang dan bernyawa dengan animasi bergerak (*bounce*)**.
   - Admin mengeklik **`🚀 Push Staging`** ➔ Client menerima link galeri seleksi (`select-photos.html`) untuk memilih foto favorit sesuai kuota paket.
4. **Pengiriman Foto Final Edit**:
   - Admin mengeklik **`🚀 Push Final Edit`** ➔ Link download foto final terkirim ke client via WhatsApp.

---

## 👥 MATRIKS PERAN & TANGGUNG JAWAB (WHO DOES WHAT?)

| Peran (Actor) | Tugas Utama di Lapangan / Sistem | Antarmuka Yang Digunakan |
|---|---|---|
| **Client** | Form Reservasi ➔ Transfer DP/Lunas ➔ Pilih Foto ➔ Download Foto Final | `inquiry.html`, `confirm-booking.html`, `select-photos.html`, `tracking.html` |
| **Fotografer Freelance** | Cek Jadwal ➔ Pemotretan ➔ Klik `Shoot Selesai` ➔ Klik `Minta Fee` | `freelance-portal.html` |
| **Admin Studio** | Quotation ➔ Verifikasi Pembayaran ➔ Assign FG ➔ Terima File ➔ Push Galeri ➔ Pay Payroll | Admin Panel SPA (`/admin/*`) |

---

## 🔒 INTEGRASI GOOGLE DRIVE 3-STEP WIZARD

1. **Step 1 (Credentials & Mandatory Probe Test)**:
   Form Client ID & Client Secret wajib lolos tes koneksi langsung ke Google API (`https://oauth2.googleapis.com/token`) sebelum disimpan.
2. **Step 2 (Penautan Gmail Studio OAuth2)**:
   Otorisasi satu klik untuk menghubungkan akun Google Drive resmi studio.
3. **Step 3 (Struktur Folder Otomatis)**:
   Sistem membuat folder otomatis per booking:
   ```text
   Wisuda_ClientA_2026/
      ├── 01_Staging_Seleksi/
      ├── 02_Highlight_Edit/
      └── 03_Final_Edit/
   ```

---

## ⚡ KEBIJAKAN RETENSI STORAGE & GARANSI OTOMATISASI

| Jenis Storage | Aturan Pembersihan Otomatis (*Auto Cleanup*) |
|---|---|
| `DATA/uploads/gallery_cache/` | Cache Thumbnail Lightbox dibersihkan otomatis saat final edit rilis (Max TTL 7 hari). |
| `DATA/uploads/payment-proofs/` | Bukti Transfer DP/Pelunasan otomatis dihapus Cron setelah 90 hari. |
| `DATA/uploads/invoices-client/` | PDF Invoice & Kontrak otomatis dihapus Cron setelah 30 hari. |
| `DATA/backups/` | Cadangan database SQLite otomatis dibuat setiap hari pukul 04:00 WITA. |

---

*Dokumen Workflow Operasional Wisuda Platform v2.0 — Diterbitkan untuk Review Lapangan Vendor Studio.*
