# 🛡️ Direktori Laporan Audit & Panduan Verifikasi Sistem
## Wisuda Photography Platform — Dual-Environment Quality & Security Assurance

Direktori ini berisi seluruh arsip laporan audit mendalam (*Deep Technical Audit & Security Analysis*), rekam jejak pemeriksaan integritas alur (Path, API, Flow, Kode, Keamanan, Database, Integrasi Pihak Ketiga), serta panduan wajib yang membedakan secara tegas antara **Audit Server Produksi** dan **Audit Local Development**.

---

## 🏷️ Klasifikasi & Format Penamaan Berkas Audit

Untuk mencegah kebingungan antar tim dan memisahkan temuan lingkungan live vs lingkungan lokal pengembang, berkas audit diklasifikasikan menjadi 2 jenis:

| Jenis Audit | Lingkungan Target | Format Penamaan Berkas | Dibuat Oleh | Fokus Analisis Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Audit Server Produksi** | VPS Live / Docker / Nginx | `AUDIT_YYYY-MM-DD_SERVER_PRODUKSI.md` (atau `_HERMES.md`) | Server Deploy / Hermes / Live Bot | Live Webhook IP/Domain, SSL HTTPS, Reverse Proxy Nginx, Cron PM2 di VPS, Real Storage Cloud. |
| **Audit Local Development** | Komputer Dev / Git Workspace | `AUDIT_YYYY-MM-DD_LOCAL_DEV.md` | Tim Dev (AMS & AGY / Claude) | Logika Kode, Test Suites (`npm test`), Validasi Router & Middleware, SQL Migration, Data Flow. |

---

## 📑 Rekam Jejak Laporan Audit (Audit History Index)

| Tanggal Audit | Jenis / Lingkungan | Berkas Laporan | Auditor | Target Lingkungan | Status Respon Maintenance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2026-08-16** | 🌐 **Produksi** | [📄 AUDIT_2026-08-16_DEPLOY_PRODUKSI.md](./AUDIT_2026-08-16_DEPLOY_PRODUKSI.md) | Antigravity Reasoning Engine | Deploy Produksi v2.0 | Menemukan 8 Temuan Keamanan & 5 Bug Runtime. Menunggu respon di `MAINTENANCE_AUDIT/`. |

---

## 🔒 Protokol Tata Kelola Audit Dua Arah (Two-Way Governance Protocol)

Untuk menjaga stabilitas kode server produksi dan mencegah konflik commit (*merge conflict*), diberlakukan aturan ketat sebagai berikut:

### 1. Aturan untuk Server Deploy / Hermes / Auditor Lapangan
- 🚫 **DILARANG MENGUBAH KODE PRODUKSI**: Server Deploy / Hermes hanya bertugas melakukan scanning, testing, dan auditing. Dilarang keras memodifikasi file kode (`*.js`, `*.vue`, `*.html`, `*.css`, dll) secara sepihak.
- 🚫 **DILARANG MENIMPA LAPORAN LAMA**: Jangan pernah mengedit atau menghapus berkas MD audit yang sudah ada.
- 📝 **HANYA MEMBUAT BERKAS MD AUDIT BARU**: Jika ada temuan baru atau rekomendasi setelah pengujian di server live, buat berkas laporan baru di folder `AUDIT/` dengan format:  
  `AUDIT_YYYY-MM-DD_SERVER_PRODUKSI.md` (atau `AUDIT_YYYY-MM-DD_HERMES.md`).
- 🚀 **LANGSUNG GIT PUSH**: Setelah membuat berkas laporan MD baru, lakukan `git add AUDIT/`, `git commit`, dan `git push` agar commit bersih dan tim pengembang segera mendapat visibilitas.

### 2. Aturan untuk Tim Pengembang (AMS & AGY / Claude / Dev Agent)
- 📖 **MENJAGA KEASLIAN LAPORAN AUDIT**: Tim Pengembang tidak akan mengubah atau merekayasa isi laporan audit yang dikirimkan oleh server.
- 🔍 **VERIFIKASI & ROOT CAUSE ANALYSIS**: Tim Pengembang mempelajari temuan server, melakukan verifikasi mendalam, dan menyusun rencana perbaikan terstruktur tanpa jalan pintas (*Zero Workaround*).
- 🛠️ **EKSEKUSI PERBAIKAN DI LINGKUNGAN DEV**: Menerapkan perbaikan kode murni di lokal dan memastikan seluruh unit test lulus (`100% PASS`).
- 📑 **WAJIB MEMBUAT LAPORAN BALASAN (MAINTENANCE REPORT)**: Setelah perbaikan selesai, Tim Pengembang wajib menerbitkan berkas dokumentasi respon balik di direktori [📁 MAINTENANCE_AUDIT/](../MAINTENANCE_AUDIT/README.md) dengan format:  
  `RESPON_YYYY-MM-DD_PERBAIKAN_SERVER_PRODUKSI.md` (atau `_LOCAL_DEV.md`).

---

## 🔍 Cara Membaca Alur Lengkap Audit & Maintenance

1. **Laporan Audit Server Lapangan & Local:** Buka [📁 Direktori AUDIT/](./README.md)
2. **Laporan Respon Balik Developer:** Buka [📁 Direktori MAINTENANCE_AUDIT/](../MAINTENANCE_AUDIT/README.md)

---
*Wisuda Photography Platform — Dual-Environment Security & Quality Protocol*
