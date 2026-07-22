# Wisuda Platform — End-to-End Application Flow

**Version:** 1.1  
**Last Updated:** 2026-07-22  
**Platform:** Luxenary.co Wisuda Management System

---

## 1. Diagram Alur Utama (End-to-End Flow)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  INQUIRY    │────▶│  QUOTATION  │────▶│   BOOKING   │────▶│ ASSIGNMENT  │
│  (Lead)     │     │  (Manual)   │     │  (DP 50%)   │     │  (FG + Cal) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Public Form         Admin buat PDF      Client transfer     Admin assign FG
  → DB: inquiries     + link WA           DP → Verifikasi     → FG konfirmasi
  → Badge Notif       → status=quoted     → status=booked     via wa.me
```

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SHOOT     │────▶│   SELEKSI   │────▶│ DELIVERABLES│────▶│   PAYOUT    │
│  (FG Portal)│     │  (Client)   │     │  (Drive)    │     │  (Payroll)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Check-in/out        Lightbox swipe      Status 'editing'    Tabel 1 baris/FG
  Setor link Drive    pilih foto          / 'delivered'       Modal detail
  → foto diolah       → submit editor     → PIN unlock        → bayar payout
```

---

## 2. Rincian Alur per Modul

### 2.1 Alur Inquiry & Booking Klien
1. **Form Reservasi (`/inquiry.html`)**: Klien mengisi nama, nomor WA, tanggal wisuda, universitas, dan pilihan paket. Data masuk ke tabel `inquiries`.
2. **Quotation & DP (Admin)**: Admin memverifikasi inquiry, membuat penawaran harga, dan mengirimkan pesan WA konfirmasi DP.
3. **Pembayaran DP (50%)**: Klien mentransfer DP dan mengunggah bukti transfer. Admin memverifikasi via `POST /api/admin/bookings/:id/verify-dp`. Status booking berubah menjadi `confirmed`.

### 2.2 Alur Penugasan Fotografer (Freelancer)
1. **Assignment (Admin)**: Admin menentukan fotografer freelance via kalender penugasan (`/admin/schedules`).
2. **Jadwal & Notifikasi WA**: Sistem mengirim notifikasi tugas ke WA fotografer dengan link konfirmasi.
3. **Check-In/Out & Setor File (Portal Freelance)**:
   - Fotografer login ke `/freelance-portal.html?code=FG-XXX`.
   - Mengklik **Mulai Photoshoot** (check-in timestamp) dan **Photoshoot Selesai** (check-out timestamp).
   - Memasukkan link Google Drive hasil foto. Status sesi berubah menjadi `done` / `uploaded`.

### 2.3 Alur Seleksi Foto Klien (`/select-photos.html`)
1. **Akses Galeri Seleksi**: Klien membuka link seleksi foto unik (`/select-photos.html?id=BOOKING_ID`).
2. **Lightbox Touch & Swipe**:
   - Klien dapat menggeser foto (*touch swipe* di HP/tablet), menekan tombol panah (`‹` `›`), atau tombol keyboard (`←` `→` `ESC`).
   - Klien memilih foto favorit dengan menekan tombol **`❤️ Pilih Foto Ini`** di dalam modal zoom.
3. **Submit Seleksi**: Klien mengirim daftar foto terpilih ke tim editor.

### 2.4 Alur Deliverables & PIN Protection (`/tracking.html`)
1. **Progres Editing**: Admin mengunggah berkas teredit / link Google Drive hasil akhir di menu Deliverables (`WHERE status IN ('editing', 'delivered')`).
2. **Pesan WA Konfirmasi Penyelesaian**: Admin mengklik tombol "Kirim WA Konfirmasi" yang menyertakan **PIN Akses Tracking** (`🔑 PIN Akses Tracking: XXXX`).
3. **Status Selesai (`completed`)**:
   - Ketika booking dikonfirmasi selesai, timeline & card perantara di halaman tracking disembunyikan.
   - Halaman tracking menampilkan **Hero Card Selesai** yang meminta masukan PIN untuk membuka kembali link Drive hasil foto.
   - Booking dipindahkan secara otomatis ke menu **Arsip Client**.

### 2.5 Alur Payroll & Keuangan Freelance (`/admin/payroll`)
1. **Tabel Pending Payroll**:
   - Ditampilkan ringkas **1 baris per Fotografer** (Nama FG, Jumlah Client, Total Fee Payout, Status Sesi `X/Y Selesai`, Tombol Detail & Bayar).
2. **Status Sesi Selesai (`getSessionRatio`)**:
   - Menghitung rasio sesi yang sudah diselesaikan fotografer (`assignment.status IN ('done', 'completed', 'uploaded')`). Menampilkan `✓ 2/2 Selesai` jika lunas atau `⏳ 1/3 Selesai`.
3. **Popup Detail & Layering Modal**:
   - Mengklik "Detail & Bayar" membuka Modal Detail Assignment.
   - Mengklik "Bayar Fee" akan menutup modal detail dan membuka Modal Konfirmasi Pembayaran (`z-[70]`) dengan navigasi kembali yang aman.
4. **Arsip Client & Warning Unpaid FG**:
   - Di menu Arsip Client (`FinancesView.vue`), jika fee fotografer belum dibayar, sistem menampilkan badge **`⚠️ Fee FG Belum Dibayar`** di bawah nama klien. Badge disembunyikan total jika sudah lunas.

### 2.6 Alur Pengelolaan Portofolio & Drive API (`/admin/portfolio`)
1. **Pilih Cover Photo**: Admin dapat mengklik salah satu thumbnail foto highlight yang ada untuk mengesetnya sebagai Cover Photo secara instant.
2. **Impor Google Drive API**:
   - Admin memasukkan link folder Google Drive.
   - Sistem backend mengunduh foto via Google Drive API dan mengompresnya secara tajam menggunakan **Sharp** (`1200px` width JPEG quality 85).
3. **Featured Priority Shuffling**:
   - Tampilan Hero Landing Page (`/index.html`) diprioritaskan mengacak foto-foto yang di-mark **`Featured`**. Jika tidak ada item featured, sistem mengacak foto dari seluruh portofolio published.

---

## 3. Matriks Akses & Proteksi Sistem

| Fitur | Akses Publik | Akses Freelancer | Akses Admin | Proteksi Keamanan |
|-------|--------------|------------------|-------------|-------------------|
| Landing Page | Ya | Ya | Ya | Anti Klik Kanan & Save Image |
| Galeri Portfolio | Ya | Ya | Ya | Anti Klik Kanan & Save Image |
| Seleksi Foto | Ya (Via Link) | Tidak | Ya | Lightbox Swipe + Quota Limit |
| Lacak Progres | Ya (Via Token) | Tidak | Ya | Proteksi PIN Akses |
| Portal Freelance | Tidak | Ya (Via Code) | Ya | Authentication Token |
| Dashboard Admin | Tidak | Tidak | Ya | Session Cookie + Bcrypt |

---
*Wisuda Management System Flow Documentation v1.1*