> [!WARNING]
> **HISTORICAL ARCHIVE / CATATAN HISTORIS (READ-ONLY)**
> Berkas ini adalah rekaman audit/laporan masa lalu yang disimpan semata-mata untuk riwayat historis.
> **DILARANG MENGANGGAP TEMUAN DI DALAM DOKUMEN INI SEBAGAI BUG ATAU KEBUTUHAN IMPLEMENTASI AKTIF.**
> Untuk melihat status fitur, bug yang sudah di-resolve, dan arsitektur aktif saat ini, seluruh AI Agent & Pengembang WAJIB merujuk ke **[master_docs/SYSTEM_STATE.md](../../SYSTEM_STATE.md)**.

---

# 📋 Laporan Audit Mendalam: Penelusuran Path Kedalaman & Inline Require Sub-Router Backend

**Versi Laporan**: 1.0  
**Tanggal Audit**: 13 Agustus 2026  
**Lokasi Dokumen**: `FLOW_SISTEM/AUDIT_PATH_DAN_SUBROUTER.md`  
**Status Eksekusi**: AUDIT & LAPORAN ONLY — *Tanpa Perubahan Kode Aplikasi (Zero Code Edit)*

---

## 📊 1. Ringkasan Eksekutif & Akar Masalah (*Root Cause Analysis*)

Setelah dilakukan pemisahan file monolitik `admin.js` menjadi 6 sub-router modular yang berlokasi di direktori baru `src/routes/admin/`:

1. **Struktur Kedalaman Folder Berubah (+1 Level)**:
   - **Sebelum Modularisasi**: `src/routes/admin.js` (Kedalaman 2 folder dari root proyek).
   - **Setelah Modularisasi**: `src/routes/admin/settings.js`, `portfolio.js`, `bookings.js`, dll. (Kedalaman 3 folder dari root proyek).

2. **Dampak Pergeseran Path**:
   - Impor bagian paling atas (*top-level require*) yang diekstrak sudah menggunakan `../../` (Berhasil & Valid).
   - **Namun**, pemanggilan impor di dalam badan fungsi (*inline require*) yang dipanggil saat fungsi tertentu dieksekusi masih mengacu pada path lama `../services/...` (single level).
   - Ketika fungsi tersebut dipanggil pada *runtime*, Node.js akan melempar error:  
     `Error: Cannot find module '../services/email.service'` atau `'../services/drive-folder.service'`.

---

## 🔍 2. Rincian Temuan Audit per-File Sub-Router

### 📄 2.1. File `src/routes/admin/settings.js` (2 Titik Inline Require)

| No | Lokasi Baris | Kode Aktual (Bermasalah) | Dampak Runtime Error | Target Perbaikan |
|---|---|---|---|---|
| 1 | **Baris 638** | `require('../services/email.service')` | Gagal saat Admin melakukan pengujian koneksi SMTP email (`POST /settings/verify-smtp`) | `require('../../services/email.service')` |
| 2 | **Baris 653** | `require('../services/email.service')` | Gagal saat Admin mengirim email uji coba (`POST /settings/send-test-email`) | `require('../../services/email.service')` |

---

### 📄 2.2. File `src/routes/admin/portfolio.js` (5 Titik Inline Require)

| No | Lokasi Baris | Kode Aktual (Bermasalah) | Dampak Runtime Error | Target Perbaikan |
|---|---|---|---|---|
| 3 | **Baris 105** | `require('../services/drive-folder.service')` | Gagal saat impor otomatis portofolio dari data booking | `require('../../services/drive-folder.service')` |
| 4 | **Baris 184** | `require('../services/drive-folder.service')` | Gagal saat pengunggahan gambar portofolio latar belakang | `require('../../services/drive-folder.service')` |
| 5 | **Baris 406** | `require('../services/drive-folder.service')` | Gagal saat eksekusi worker job impor manual Drive | `require('../../services/drive-folder.service')` |
| 6 | **Baris 438** | `require('../services/drive-folder.service')` | Gagal saat pembuatan subfolder portofolio baru | `require('../../services/drive-folder.service')` |
| 7 | **Baris 457** | `require('../services/drive-folder.service')` | Gagal saat penghapusan berkas portofolio di Google Drive | `require('../../services/drive-folder.service')` |

---

### 📄 2.3. File `src/routes/admin/bookings.js` (1 Titik Inline Require)

| No | Lokasi Baris | Kode Aktual (Bermasalah) | Dampak Runtime Error | Target Perbaikan |
|---|---|---|---|---|
| 8 | **Baris 1097** | `require('../services/drive-folder.service')` | Gagal saat Admin melakukan transfer kepemilikan folder Drive client (`POST /bookings/:id/transfer-drive-ownership`) | `require('../../services/drive-folder.service')` |

---

## 🛠️ 3. Matriks Jalur Direktori Statis & Assets (`__dirname`)

Pemeriksaan kedalaman direktori statis untuk aset logo, favicon, dan avatar:

```text
       ┌─────────────────────────────────────────────────────────┐
       │                 PETA KEDALAMAN STRUKTUR FOLDER          │
       ├─────────────────────────────────────────────────────────┤
       │ Proyek Root/                                            │
       │ ├── public/                                             │
       │ │   └── uploads/branding/                               │
       │ └── src/                                                │
       │     └── routes/                                         │
       │         └── admin/                                      │
       │             ├── settings.js  <-- __dirname (Level 3)    │
       │             ├── portfolio.js                            │
       │             └── bookings.js                             │
       └─────────────────────────────────────────────────────────┘
```

- **Tindakan yang Telah Diidentifikasi**:
  - Semua path statis yang mengacu ke folder publik dari `src/routes/admin/*.js` wajib menggunakan **`../../../public`** (naik 3 tingkat) agar file terunggah presisi ke folder `/public/uploads/` yang disajikan oleh Express.

---

## 🎯 4. Kesimpulan & Status Proposal Perbaikan

> [!IMPORTANT]
> **Status Tindakan**:  
> Laporan audit ini disusun **murni sebagai analisis teknis**. Belum ada eksekusi perbaikan kode yang dilakukan pada 8 titik teridentifikasi di atas (Zero Code Edit).

Setelah laporan audit ini disetujui, perbaikan presisi pada 8 titik `require` inline di atas dapat dieksekusi sekaligus dalam 1 tahap perbaikan aman (*single atomic fix*).
