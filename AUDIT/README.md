# 🛡️ Direktori Laporan Audit & Panduan Verifikasi Server
## Wisuda Photography Platform — Production Quality & Security Assurance

Direktori ini berisi seluruh arsip laporan audit mendalam (*Deep Technical Audit & Security Analysis*), rekam jejak pemeriksaan integritas alur (Path, API, Flow, Kode, Keamanan, Database, Integrasi Pihak Ketiga), serta panduan wajib bagi seluruh **Developer & AI Agent (AGY / Claude / Dev Team)** setelah melakukan `git pull` atau deployment di server produksi.

---

## 📑 Rekam Jejak Laporan Audit (Audit History Index)

| Tanggal Audit | Berkas Laporan | Auditor | Target Lingkungan | Status & Catatan |
| :--- | :--- | :--- | :--- | :--- |
| **2026-08-16** | [📄 AUDIT_2026-08-16_DEPLOY_PRODUKSI.md](./AUDIT_2026-08-16_DEPLOY_PRODUKSI.md) | Antigravity Reasoning Engine | Deploy Produksi v2.0 | Menemukan 8 Temuan Keamanan (IDOR, Webhook Bypass) & 5 Bug Runtime (Portfolio ReferenceError, Cron SQL Column). Menunggu review & patch. |

---

## 📌 SOP Wajib Pasca-Pull / Pasca-Deploy (Audit Protocol)

Setiap kali pengembang atau AI Agent melakukan `git pull` dari branch `main` atau merilis pembaruan baru ke VPS/Docker:

### 1. Jalankan Pengujian Unit & Integrasi
```bash
npm test
```
*Catatan: Pastikan seluruh 24 test suites lulus (`100% PASS`).*

### 2. Lakukan Pemeriksaan Validasi 4 Pilar Utama
1. **Google OAuth 3-Step Wizard & Direct Stream**:
   - Pastikan Client ID & Secret memiliki proteksi probe verification sebelum tersimpan.
   - Pastikan pengunggahan file foto master menggunakan Google Resumable Direct Stream tanpa transit disk VPS.
2. **Keamanan Gateway Pembayaran & Webhook**:
   - Pastikan webhook iPaymu (`/api/public/payment/ipaymu/notify`) menolak request tanpa HMAC signature yang valid di mode produksi.
3. **Pemberian Hak Akses Token Tracking & Galeri Klien**:
   - Pastikan URL download Google Drive privat tidak dapat dibuka hanya dengan menebak parameter `?code=1` (harus `tracking_token` asli).
4. **Kesehatan Otomatisasi Background (Cron & Worker)**:
   - Pastikan query cron job tidak memanggil kolom usang (`tracking_token` vs `tracking_code`).
   - Pastikan auto-curation portfolio tidak melempar `ReferenceError`.

### 3. Buat Berkas Audit Baru Jika Ada Perubahan Arsitektur / Deploy
Jika Anda melakukan perombakan alur atau deployment versi mayor:
1. Buat berkas baru di direktori ini dengan format penamaan:  
   `AUDIT_YYYY-MM-DD_DEPLOY_PRODUKSI.md` (atau `AUDIT_YYYY-MM-DD_<TOPIK>.md`).
2. Masukkan analisis teknis lengkap: Matriks Keparahan, Alur Eksploitasi, Akar Masalah, Solusi Kode Diff, dan Status Terakhir.
3. Perbarui tabel indeks pada berkas `AUDIT/README.md` ini.
4. Lakukan `git commit` dan `git push` agar seluruh tim dan AI Agent lain memiliki visibilitas penuh terhadap kondisi server.

---

## 🔍 Cara Membaca Laporan Audit Terbaru

Untuk membaca laporan audit paling mutakhir yang berlaku saat ini, buka:  
➡️ [AUDIT_2026-08-16_DEPLOY_PRODUKSI.md](./AUDIT_2026-08-16_DEPLOY_PRODUKSI.md)

---
*Wisuda Photography Platform — Security & Quality Protocol*
