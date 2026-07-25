# 📄 Wisuda Platform — Product Requirements Document (PRD)

**Version:** 1.2  
**Date:** 2026-07-25  
**Author:** AmsDev Team  
**Status:** ✅ Approved & Fully Implemented in Production

---

## 1. Executive Summary

### 1.1 Product Vision
**Wisuda Platform** adalah platform manajemen operasional end-to-end untuk bisnis agensi fotografi wisuda (graduation photography). Platform ini menghubungkan wisudawan (klien) dengan fotografer freelance (FG) melalui kontrol terpusat oleh Admin/Operator: mulai dari formulir *inquiry*, penawaran harga (*quotation*), *booking*, verifikasi DP/Pelunasan manual, *assignment* FG, *shoot day*, *QC deliverables*, *lightbox photo selection*, pelacakan status (*client tracking*), hingga penggajian *payout* freelance.

### 1.2 Key Differentiator & Advantages
- **Model Agensi Terkontrol**: Klien memilih paket harga tetap; Admin menentukan assignment FG sesuai lokasi, rating, dan jadwal.
- **Output Digital Only**: Seluruh penyerahan hasil foto menggunakan berkas digital resolusi tinggi via Google Drive (tanpa media cetak fisik/album), mempercepat distribusi & menghemat biaya operasional.
- **Standar Tarif Minimal Rp 500.000/Jam**: Penetapan harga paket premium terpola berdasarkan durasi pemotretan jam (mulai dari Rp 500k/1 jam hingga Rp 1.5M/3 jam).
- **Tanpa Payment Gateway Fee**: Pembayaran menggunakan sistem transfer langsung dengan verifikasi manual admin yang cepat.
- **Performa & Responsivitas Tinggi**: Database SQLite WAL dengan 16 B-Tree Indexes (< 1ms query time) dan aset gambar WebP terkompresi Sharp Engine (~40KB).
- **Desain Touch-Friendly**: Halaman seleksi foto Touch-Lightbox Swipe di HP/Tablet & halaman tracking tanpa ribet.
- **Otomatisasi Maintenance & Retention**: Pembersihan data proses 30 hari & bukti transfer 90 hari secara otomatis menjaga server tetap aman dan hemat ruang disk.
- **Proteksi Multi-Timezone**: Server locked ke timezone WITA (`Asia/Makassar`) untuk kesiapan operasional nasional.

---

## 2. System Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      WISUDA PLATFORM STACK                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Public : HTML5, Vanilla JS, CSS3, Touch Lightbox      │
│  Frontend Admin  : Vue 3 (Vite SPA) + Tailwind CSS + Pinia      │
│  Backend Core    : Node.js + Express.js                         │
│  Database Engine : SQLite 3 (better-sqlite3) WAL Mode           │
│  Media Engine    : Sharp (WebP 85% Quality, Width 1000px Max)  │
│  Background Jobs : Node-Cron + Resilient GDrive Importer        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed User Roles & Capabilities

| Role | Tanggung Jawab & Fitur Utama |
|---|---|
| **Client / Wisudawan** | Mengisi form reservasi, memilih paket via token, mengunggah bukti DP/pelunasan, melakukan seleksi foto favorit via Touch Lightbox Swipe, melacak status foto via PIN Tracking, serta memberikan persetujuan portofolio. |
| **Freelance Photographer (FG)** | Login portal via *access code* unik (`FG-XXX`), mengonfirmasi tugas pemotretan, melakukan *check-in / check-out* hari H, mengunggah link Google Drive / foto mentah, dan memantau rincian fee payout. |
| **Admin / Operator** | Mengelola *dashboard stats*, verifikasi DP/pelunasan, membuat penawaran harga (*quotation*), melakukan *assignment* FG via kalender, review QC hasil foto, *trigger WA notification*, mengelola portofolio publik, serta memproses pembayaran payroll FG. |

---

## 4. Operational Requirements & Feature Specifications

### 4.1 Inquiry & Quotation Module
- **Form Reservasi (`/inquiry.html`)**: Mengumpulkan nama, WA, email, tanggal wisuda, universitas, lokasi, dan paket minat.
- **Token Akses Paket (`/confirm-booking.html`)**: Generasi token unik `booking_tokens` dengan batas kadaluarsa 7 hari untuk pilihan mandiri klien.

### 4.2 Booking & Contract Module
- **Verifikasi DP (50%)**: Admin mengecek bukti transfer, memasukkan nominal, dan mengubah status menjadi `confirmed`.
- **Auto Kontrak PDF & Tracking Token**: Menerbitkan file PDF kontrak serta `tracking_token` unik (`TRK-XXX`) secara otomatis.

### 4.3 Assignment & Scheduling Module
- **Kalender Penugasan**: Menghindari *double-booking* FG pada tanggal yang sama.
- **Fee Override Flexibility**: Mendukung penentuan fee kustom per-assignment atau menggunakan `default_rate` FG / `fg_fee` paket.

### 4.4 Shoot & Deliverables QC Module
- **Portal Freelancer (`/freelance-portal.html`)**: Otentikasi berbasis kode akses tanpa registrasi rumit.
- **QC Gatekeeper**: Admin meninjau berkas foto yang diunggah FG (status: `approved` / `revision`).

### 4.5 Client Photo Selection Module (`/select-photos.html`)
- **Touch-Swipe Lightbox Gallery**: Dukungan *gesture swipe* di HP/tablet, tombol navigasi keyboard (`←`, `→`, `ESC`), dan proteksi kuota foto sesuai paket.
- **Staging Auto-Cleanup**: Folder foto staging sementara otomatis dihapus dari server saat hasil foto akhir dikirimkan (*delivered*).

### 4.6 Payroll & Payout Module (`/admin/payroll`)
- **Ringkasan 1 Baris / FG**: Menampilkan rasio sesi selesai (`✓ X/Y Selesai`), kalkulasi total fee, modal detail pembayaran `z-[70]`, dan cetak slip gaji PDF.

### 4.7 Portfolio & Media Engine
- **Sharp WebP Engine**: Mengompres foto hingga hemat 93% data (~40KB) tanpa *cropping* (`fit: inside`).
- **Resilient GDrive Background Importer**: Penarikan berkas di background dengan *hard timeout* 30s, *base throttle* 250ms, dan *exponential backoff retry* (1.5s ➔ 3s ➔ 6s).

---

## 5. Non-Functional Requirements & Security Standards

1. **Kecepatan Query**: Seluruh query utama didukung 16 B-Tree Indexes (< 1ms execution time).
2. **Keamanan Rate Limiting**: Diproteksi `express-rate-limit` (Max 200 req / 15 menit per IP).
3. **Graceful Shutdown**: Handler `SIGTERM`/`SIGINT` menjalankan `PRAGMA wal_checkpoint(TRUNCATE)` untuk mencegah kerusakan data SQLite.
4. **Log Rotation**: File log `wisuda-builder.log` dibatasi maksimum 5MB.
5. **Data Retention**: Pembersihan data proses layanan completed (>30 hari) dan bukti transfer (>90 hari) secara otomatis pada jam 03:00 WITA.

---

*Wisuda Platform Product Requirements Document v1.2*