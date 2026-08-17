# 🛡️ 03 — Pusat Rekam Jejak Laporan Audit Sistem & Keamanan
## Wisuda Photography Platform — Dual-Environment Audit Hub

Direktori ini berfungsi sebagai **satu-satunya pusat penyimpanan laporan audit (*Single Audit Repository*)** untuk proyek Wisuda Platform.

---

## 🧭 Panduan Status Resmi Sistem Saat Ini

> [!IMPORTANT]
> **PENTING UNTUK SELURUH AI AGENT & DEVELOPER:**
> Jangan menggunakan berkas laporan di direktori `arsip_lama/` sebagai daftar masalah aktif.
> Seluruh status bug dan perbaikan yang sudah diselesaikan dirangkum secara resmi di:
> 👉 **[master_docs/SYSTEM_STATE.md](../SYSTEM_STATE.md)**.

---

## 🏷️ Klasifikasi & Struktur Subdirektori Audit

Untuk memisahkan konteks server langsung (*live*) vs lingkungan kode lokal (*development*), seluruh laporan audit dipisahkan ke dalam 3 subfolder:

```text
03_LAPORAN_AUDIT/
├── 📂 deploy_produksi/        # Audit Server Live VPS (Dibuat oleh Hermes / Server Bot)
│   ├── AUDIT_2026-08-16_DEPLOY_PRODUKSI.md
│   └── AUDIT_2026-08-17_DEPLOY_PRODUKSI.md
│
├── 📂 local_development/      # Audit Lingkungan Dev (Dibuat oleh Claude / Antigravity Agent)
│   ├── AUDIT_2026-08-16_LOCAL_DEV.md
│   └── AUDIT_2026-08-17_LOCAL_DEV.md
│
└── 📂 arsip_lama/             # [HISTORICAL ARCHIVE (READ-ONLY)]
    └── Berkas audit lawas (Agustus awal) yang seluruh isinya telah RESOLVED
```

---

## 🔒 Protokol SOP Penulisan Berkas Audit Baru

1. **Audit Server VPS / Live (Hermes / Server Bot)**:
   - Dilarang mengubah kode produksi.
   - Buat berkas baru di: `master_docs/03_LAPORAN_AUDIT/deploy_produksi/AUDIT_YYYY-MM-DD_DEPLOY_PRODUKSI.md`.
   - Lakukan commit & push agar tim developer mendapat notifikasi temuan lapangan.

2. **Audit Local Development (Claude / Antigravity / Dev Agent)**:
   - Buat berkas baru di: `master_docs/03_LAPORAN_AUDIT/local_development/AUDIT_YYYY-MM-DD_LOCAL_DEV.md`.
   - Analisis akar masalah (RCA) murni tanpa jalan pintas (*Zero Workaround*).

3. **Setelah Perbaikan Selesai (Developer Resolution)**:
   - Terbitkan laporan perbaikan di: `master_docs/04_RESPON_MAINTENANCE/RESPON_YYYY-MM-DD_PERBAIKAN_*.md`.
   - Perbarui baris status di **[master_docs/SYSTEM_STATE.md](../SYSTEM_STATE.md)** menjadi `🟢 RESOLVED`.

---
*Kembali ke [Master Documentation Hub](../README.md)*
