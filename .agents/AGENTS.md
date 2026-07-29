# Workspace Rules — Wisuda Project

## 1. Strict Google OAuth 3-Step Wizard Workflow
- **Step 1 (Google OAuth Credentials)**: Form pengisian Google OAuth Client ID & Client Secret. Kredensial TIDAK BOLEH tersimpan jika belum terverifikasi cocok dengan API Google.
- **Step 2 (Tautkan Akun Google Drive)**: Hanya terbuka/dapat diakses jika Step 1 sudah 100% terkonfigurasi dan terverifikasi cocok.
- **Step 3 (Master Root Folder Drive)**: Hanya terbuka/dapat diakses jika Step 2 sudah 100% berhasil ditautkan ke akun Gmail Studio.

## 2. Mandatory Verification Before Save
- Sebelum menyimpan Client ID & Client Secret ke database, backend WAJIB melakukan *probe verification test* ke endpoint Google (`https://oauth2.googleapis.com/token`).
- Jika Google merespon `invalid_client` (ID & Secret tidak cocok / salah), proses simpan HARUS DITOLAK dan melempar error penolakan yang jelas.
