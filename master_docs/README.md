# 🧭 Master Documentation & Architectural Hub
## Wisuda Photography Platform — Luxenary.co Ecosystem

Selamat datang di **Pusat Dokumentasi Utama (*Single Source of Truth*)** untuk platform manajemen dokumentasi wisuda Luxenary.co.

Direktori ini menyatukan seluruh spesifikasi alur sistem, panduan teknis operasional, rekam jejak audit keamanan, dan bukti penyelesaian maintenance dalam satu struktur yang modular, bersih, dan terstandarisasi.

---

## 🧠 Memory Hub & Status Resmi Sistem

> [!IMPORTANT]
> **PANDUAN UTAMA BAGI SELURUH AI AGENT & DEVELOPER (CLAUDE, GEMINI, ANTIGRAVITY, HERMES):**
> Sebelum melakukan analisis, audit, atau perubahan kode apapun, seluruh Developer dan AI Agent **WAJIB** membaca dokumen berikut:
> 👉 **[SYSTEM_STATE.md](./SYSTEM_STATE.md)** — *Living Single Source of Truth & Master Resolution Ledger*.

---

## 📜 ATURAN BAKU & TUGAS MASING-MASING FOLDER MARKDOWN (`.md`)

Setiap folder di dalam `master_docs/` memiliki **tanggung jawab spesifik dan aturan pembuatan file** agar tidak terjadi tumpang tindih atau miskomunikasi:

```text
master_docs/
├── 🧠 SYSTEM_STATE.md             # [LIVING TRUTH] Otak Memori Sistem & Ledger Resolusi
│
├── 📁 01_FLOW_SISTEM/             # [BUSINESS LOGIC] Alur Operasional, State Machine & Diagram
│
├── 📁 02_PANDUAN_TEKNIS/          # [TECHNICAL GUIDE] Manual Developer, Arsitektur, Setup VPS & API
│
├── 📁 03_LAPORAN_AUDIT/           # [AUDIT TRAIL] Hasil Inspeksi Sistem & Keamanan
│   ├── 📂 deploy_produksi/        # Laporan Audit Server Live / VPS (Hermes / Server Bot)
│   ├── 📂 local_development/      # Laporan Audit Lingkungan Dev (Claude / Antigravity Agent)
│   └── 📂 arsip_lama/             # [READ-ONLY] Arsip historis audit masa lalu
│
└── 📁 04_RESPON_MAINTENANCE/      # [MAINTENANCE RESOLUTION] Bukti Perbaikan & Patch Developer
```

---

### 📌 Panduan Rinci per Folder: Tugas, Format & Kapan Membuat File Baru

| Folder Target | Fungsi & Tanggung Jawab | Kapan Membuat File Baru? | Format Penamaan File | Hal yang Dilarang |
| :--- | :--- | :--- | :--- | :--- |
| **`master_docs/SYSTEM_STATE.md`** | Otak memori sistem, versi aktif, dan rangkuman status seluruh bug/fitur. | **TIDAK DIBUAT BARU**. Hanya diperbarui saat ada rilis versi atau perbaikan audit selesai. | `SYSTEM_STATE.md` (Tunggal) | Dilarang membuat duplikat memori di folder lain. |
| **`01_FLOW_SISTEM/`** | Dokumentasi alur kerja bisnis, logika tahap 1-4, portal freelance, portofolio, dan Google Drive. | HANYA jika ada penambahan **Fitur / Alur Bisnis Baru** dari sisi user/klien/studio. | `ALUR_<FITUR>.md` atau `TAHAP<N>_<nama>.md` | Dilarang menaruh catatan bug, audit, atau error log di folder ini. |
| **`02_PANDUAN_TEKNIS/`** | Manual teknis developer: Deployment Ubuntu/PM2, Nginx, SQLite schema, dan OpenAPI 3.0 Swagger. | HANYA jika ada infrastruktur, setup server baru, atau dokumentasi arsitektur baru. | `<NAMA_PANDUAN_TEKNIS>.md` (UPPERCASE) | Dilarang menaruh laporan bug / insiden perbaikan di sini. |
| **`03_LAPORAN_AUDIT/deploy_produksi/`** | Rekam jejak audit di server VPS live (SSL, domain, live webhook, Nginx reverse proxy). | Saat Server / Hermes / Bot melakukan pengujian di VPS. | `AUDIT_YYYY-MM-DD_DEPLOY_PRODUKSI.md` | Dilarang mengubah kode produksi dari lingkungan ini. |
| **`03_LAPORAN_AUDIT/local_development/`** | Rekam jejak deep audit kode lokal (IDOR, test suites, validasi router, database query). | Saat Developer / AI Agent melakukan audit mendalam pada codebase lokal. | `AUDIT_YYYY-MM-DD_LOCAL_DEV.md` | Dilarang menimpa file audit tanggal sebelumnya. |
| **`03_LAPORAN_AUDIT/arsip_lama/`** | Arsip laporan masa lalu (Agustus awal). Seluruh isu di sini sudah `RESOLVED`. | **READ-ONLY**. Tidak boleh ditambah secara manual kecuali pengarsipan resmi. | Sesuai berkas arsip historis. | **DILARANG** menganggap isi berkas di sini sebagai bug aktif saat ini. |
| **`04_RESPON_MAINTENANCE/`** | Laporan respon perbaikan resmi (*Root Cause Analysis*, *Surgical Patches*, & Bukti Test). | **WAJIB dibuat oleh Agent/Dev** setelah menyelesaikan perbaikan temuan dari `03_LAPORAN_AUDIT/`. | `RESPON_YYYY-MM-DD_PERBAIKAN_*.md` | Dilarang menyatakan perbaikan selesai tanpa membuat dokumen respon ini. |

---

## 🗺️ Peta Navigasi File Aktif

### 📂 1. [01_FLOW_SISTEM/](./01_FLOW_SISTEM/README.md)
- **[MASTER_FLOW.md](./01_FLOW_SISTEM/MASTER_FLOW.md)**: 🗺️ Peta makro alur end-to-end, isolasi state, dan indeks navigasi seluruh tahapan.
- **[TAHAP1_alur_inqury.md](./01_FLOW_SISTEM/TAHAP1_alur_inqury.md)**: Tahap 1: Booking mandiri client 1-pintu, timer 3 jam dinamis, dan Gate 1 DP.
- **[TAHAP2_alur_client.md](./01_FLOW_SISTEM/TAHAP2_alur_client.md)**: Tahap 2: Client deal, penugasan Fotografer Freelance, sesi foto, dan Gate 2 Pelunasan.
- **[TAHAP3_alur_postproduksi.md](./01_FLOW_SISTEM/TAHAP3_alur_postproduksi.md)**: Tahap 3: Direct-to-Drive stream admin, Galeri Seleksi Klien, dan Highlight Portofolio.
- **[TAHAP4_alur_arsip.md](./01_FLOW_SISTEM/TAHAP4_alur_arsip.md)**: Tahap 4: Sidetab Arsip, retensi 3 bulan Google Drive, dan auto-trash cleanup.
- **[ALUR_FREELANCE.md](./01_FLOW_SISTEM/ALUR_FREELANCE.md)**: Sistem Freelance: Onboarding 2 jalur, Access Code, portal `freelance.html`, & Payroll.
- **[ALUR_PORTOFOLIO.md](./01_FLOW_SISTEM/ALUR_PORTOFOLIO.md)**: Sistem Portofolio: Consent `is_portfolio_allowed`, Cloud-to-Cloud copy Root 2.
- **[ALUR_TRACKING_CLIENT.md](./01_FLOW_SISTEM/ALUR_TRACKING_CLIENT.md)**: Portal Tracking Klien: `tracking.html`, kalkulator ukuran Drive, dan closing card.
- **[ALUR_EMAIL_SMTP.md](./01_FLOW_SISTEM/ALUR_EMAIL_SMTP.md)**: Gateway Email Transaksional: Nodemailer SMTP, luxury styling template engine.
- **[STRUKTUR_FOLDER_DRIVE.md](./01_FLOW_SISTEM/STRUKTUR_FOLDER_DRIVE.md)**: Arsitektur Dual-Root Google Drive (Root 1 Client Storage vs Root 2 Master Portofolio).

---

### 📂 2. [02_PANDUAN_TEKNIS/](./02_PANDUAN_TEKNIS/README.md)
- **[DOKUMENTASI_UTAMA_PLATFORM_WISUDA.md](./02_PANDUAN_TEKNIS/DOKUMENTASI_UTAMA_PLATFORM_WISUDA.md)**: Arsitektur lengkap sistem, database schema, dan struktur kode.
- **[TECHNICAL_GUIDE.md](./02_PANDUAN_TEKNIS/TECHNICAL_GUIDE.md)**: Panduan deployment server Ubuntu (PM2, Nginx Reverse Proxy, SSL Certbot, Docker).
- **[WORKFLOW_OPERASIONAL_STUDIO_WISUDA.md](./02_PANDUAN_TEKNIS/WORKFLOW_OPERASIONAL_STUDIO_WISUDA.md)**: SOP operasional harian tim admin studio, manajemen jadwal, dan FG.
- **[ARSITEKTUR_PAYMENT_IPAYMU_HYBRID.md](./02_PANDUAN_TEKNIS/ARSITEKTUR_PAYMENT_IPAYMU_HYBRID.md)**: 💳 Arsitektur Integrasi iPaymu (Cloudflare Tunnel + VPS Egress Proxy).
- **[PROPOSAL_ARSITEKTUR_HYBRID_HA_SERVER.md](./02_PANDUAN_TEKNIS/PROPOSAL_ARSITEKTUR_HYBRID_HA_SERVER.md)**: ⚖️ Proposal Arsitektur Hybrid Multi-Server (HA & Active-Active Load Balancer).
- **[CHANGELOG.md](./02_PANDUAN_TEKNIS/CHANGELOG.md)**: Riwayat versi, pembaruan fitur, dan catatan breaking changes.
- **[swagger.json](./02_PANDUAN_TEKNIS/swagger.json)**: Spesifikasi OpenAPI 3.0 Headless API Engine (`/api/v1/*`).

---

### 📂 3. [03_LAPORAN_AUDIT/](./03_LAPORAN_AUDIT/README.md)
- 🌐 **[deploy_produksi/](./03_LAPORAN_AUDIT/deploy_produksi/)**: Laporan audit server live / VPS (Hermes / Production Bot).
- 💻 **[local_development/](./03_LAPORAN_AUDIT/local_development/)**: Laporan audit kode lokal (Claude / Antigravity Engine).
- 📦 **[arsip_lama/](./03_LAPORAN_AUDIT/arsip_lama/)**: Catatan historis lawas dengan status `RESOLVED`.

---

### 📂 4. [04_RESPON_MAINTENANCE/](./04_RESPON_MAINTENANCE/README.md)
- **[RESPON_2026-08-16_PERBAIKAN_LOCAL_DEV.md](./04_RESPON_MAINTENANCE/RESPON_2026-08-16_PERBAIKAN_LOCAL_DEV.md)**: Respon audit keamanan & runtime 16 Agustus (`RESOLVED`).
- **[RESPON_2026-08-17_PERBAIKAN_LOCAL_DEV.md](./04_RESPON_MAINTENANCE/RESPON_2026-08-17_PERBAIKAN_LOCAL_DEV.md)**: Respon token edge cases & sync test suite 17 Agustus (`RESOLVED`).

---
*Wisuda Platform — Central Documentation Architecture*
