# WORKFLOW OPERASIONAL STUDIO FOTOGRAFI WISUDA v2.0
**Panduan Ringkas, Visual SOP & Presentasi Eksekutif Sistem Operasional Wisuda**

> [!IMPORTANT]
> **Pusat Acuan Flow Sistem (Source of Truth)**: Rincian spesifikasi alur operasional 4 Tahap, Sub-Sistem Freelance, Portofolio, dan Drive terpusat pada [🗺️ FLOW_SISTEM/MASTER_FLOW.md](../FLOW_SISTEM/MASTER_FLOW.md).

---

## EXECUTIVE OVERVIEW: MENGAPA WISUDA PLATFORM UNGGUL?

Platform Wisuda v2.0 diciptakan untuk menyelesaikan masalah utama bisnis studio foto wisuda: **kekacauan komunikasi dengan fotografer freelance, keterlambatan pengiriman foto, dan pengeluaran biaya penyimpanan server yang membengkak**.

### 🌟 3 Pilar Keunggulan Utama Platform:

1. **Single-Control Admin Panel (100% Kontrol di Admin)**:
   Admin Studio memiliki wewenang penuh dalam memverifikasi pembayaran, mengonfirmasi penerimaan berkas foto dari fotografer, menautkan folder Google Drive, hingga mempublikasikan galeri seleksi/final ke client.

2. **Simplified Freelance Portal (Fotografer Bebas Ribet)**:
   Fotografer freelance di lapangan **tidak lagi dibebani** tugas rumit mengunggah/menyetor file di portal. Fotografer hanya memiliki 2 aksi utama:
   - Melihat jadwal sesi foto & brief di portal mobile (`freelance.html`) serta menandai selesai pemotretan.
   - Mengeklik **`💬 Request Payment`** untuk menagih honor foto via WhatsApp direct link.

3. **Zero Local Storage & Google Drive Automation**:
   Foto mentah (*JPG*) langsung disalurkan ke Google Drive Studio secara direct-stream (Zero Disk Transit) tanpa mengendap di server lokal.

---

## 🔄 ALUR KERJA 4-TAHAP (STEP-BY-STEP OPERATIONAL SOP)

```text
[Tahap 1: Inquiry] ── Gate 1 DP ──► [Tahap 2: Client Deal] ── Gate 2 Lunas ──► [Tahap 3: Post-Produksi] ──► [Tahap 4: Arsip & Retention]
```

- **[Tahap 1: Inquiry & Reservasi Client](../FLOW_SISTEM/TAHAP1_alur_inqury.md)**: Registrasi 1-pintu (`inquiry.html`), Link Booking Terpadu (Transport & Diskon), Timer 3 Jam Dinamis, & Gate 1 Verifikasi DP.
- **[Tahap 2: Client Deal & Shooting](../FLOW_SISTEM/TAHAP2_alur_client.md)**: Assign FG di Sidetab Client, Sesi Foto Hari H (Zero Upload FG), Cron 30m Auto-Complete, & Gate 2 Pelunasan.
- **[Tahap 3: Pasca Produksi & Closing](../FLOW_SISTEM/TAHAP3_alur_postproduksi.md)**: Direct Upload Admin, Galeri Seleksi Foto Klien (`tracking.html`), Highlight Portofolio Copy, & Closing Statement (`completed`).
- **[Tahap 4: Kearsipan & Retention Cleanup](../FLOW_SISTEM/TAHAP4_alur_arsip.md)**: Sidetab Arsip (Completed & Cancelled), Cron WA Reminder H-7/H-3, & Drive Expired Retention Cleanup.

### 📍 TAHAP 1: INQUIRY & RESERVASI CLIENT
1. Client mengisi formulir reservasi online di `inquiry.html`.
2. Admin menghitung biaya transportasi (*transport charge*) dan mengecek jadwal.
3. Admin mengeklik **`🔗 Buat Link Booking`** (Input paket, transport charge, diskon, & timer 3j) ➔ Sistem menghasilkan 1 Link Booking Terpadu dan pesan WhatsApp otomatis.
4. Client melakukan transfer DP (50%), Admin mengeklik **`Verifikasi DP`** ➔ Data otomatis berpindah ke **Tahap 2**.

---

### 📍 TAHAP 2: CLIENT BOOKING & PENUGASAN FOTOGRAFER
1. Admin menugaskan fotografer (**`Assign FG`**). Penugasan otomatis berada pada status `accepted` dan muncul di Portal Freelance.
2. Fotografer mengeksekusi sesi foto di lapangan, lalu menandai selesai (**`📸 Photo Shoot Selesai`** / Auto Cron +30m `is_session_done = 1`).
3. **Transisi Pelunasan & Gate 2 ➔ Post Production**:
   - **Gate 2 Lulus (Sesi Selesai + Payment 100% Lunas Sejak Awal):** Booking **langsung dapat berpindah ke Tahap 3 (`post_production`)**.
   - **Pembayaran Masih DP 50%:** Booking berada di status `Menunggu Pelunasan`. Setelah Admin mengeklik **`Verifikasi Pelunasan`** ➔ Gate 2 Lulus & booking **berpindah ke Tahap 3 (`post_production`)**.

---

### 📍 TAHAP 3: PASCA PRODUKSI 3-LANGKAH (POST PRODUCTION SOP)

```
[Langkah 1: Terima File] ──> [Langkah 2: Upload Staging] ──> [Langkah 3: Push Staging]
(Tombol Amber Aktif)         (Upload File di Drive)          (Tombol Animated Bounce)
```

1. **Langkah 1: Konfirmasi Penerimaan Berkas Foto**:
   - Admin mengeklik tombol **`📦 Terima File`** (`/bookings/:id/activate-gallery`).
   - Indikator Fotografer berubah seragam menjadi **`✓ File Diterima`** (Hijau bersih).
   - Status Tahap berpindah ke **`post_production`**.
2. **Langkah 2: Unggah Foto ke Google Drive Staging**:
   - Admin mengeklik tombol **`☁️ Upload File`** (`/bookings/:id/upload-raw-photos`) untuk menautkan folder Drive Staging yang berisi foto seleksi.
3. **Langkah 3: Publikasi Galeri Seleksi (Push Staging)**:
   - Begitu foto terdeteksi di Drive, tombol **`🚀 Push Staging`** (`/bookings/:id/publish-staging`) **otomatis berubah terang dan bernyawa dengan animasi bergerak (*bounce*)**.
   - Admin mengeklik **`🚀 Push Staging`** ➔ Client menerima link galeri seleksi (`select-photos.html`) untuk memilih foto favorit sesuai kuota paket.
4. **Pengiriman Foto Final Edit**:
   - Admin mengeklik **`🚀 Push Final Edit`** (`/bookings/:id/unlock-final-editing`) ➔ Link download foto final terkirim ke client via WhatsApp (`status = 'delivered'`).

---

## 👥 MATRIKS PERAN & TANGGUNG JAWAB (WHO DOES WHAT?)

| Peran (Actor) | Tugas Utama di Lapangan / Sistem | Antarmuka Yang Digunakan |
|---|---|---|
| **Client** | Form Reservasi ➔ Transfer DP/Lunas ➔ Pilih Foto ➔ Download Foto Final | `inquiry.html`, `confirm-booking.html`, `select-photos.html`, `tracking.html` |
| **Fotografer Freelance** | Cek Jadwal ➔ Pemotretan ➔ Klik `Shoot Selesai` ➔ Klik `Minta Fee` | `freelance-portal.html` |
| **Admin Studio** | Link Booking Terpadu ➔ Verifikasi Pembayaran ➔ Assign FG ➔ Terima File ➔ Push Galeri ➔ Pay Payroll | Admin Panel SPA (`/admin/*`) |

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
