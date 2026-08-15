# Workspace Rules — Wisuda Project

## 1. Strict Google OAuth 3-Step Wizard Workflow
- **Step 1 (Google OAuth Credentials)**: Form pengisian Google OAuth Client ID & Client Secret. Kredensial TIDAK BOLEH tersimpan jika belum terverifikasi cocok dengan API Google.
- **Step 2 (Tautkan Akun Google Drive)**: Hanya terbuka/dapat diakses jika Step 1 sudah 100% terkonfigurasi dan terverifikasi cocok.
- **Step 3 (Master Root Folder Drive)**: Hanya terbuka/dapat diakses jika Step 2 sudah 100% berhasil ditautkan ke akun Gmail Studio.

## 2. Mandatory Verification Before Save
- Sebelum menyimpan Client ID & Client Secret ke database, backend WAJIB melakukan *probe verification test* ke endpoint Google (`https://oauth2.googleapis.com/token`).
- Jika Google merespon `invalid_client` (ID & Secret tidak cocok / salah), proses simpan HARUS DITOLAK dan melempar error penolakan yang jelas.

## 3. Strict Admin-Centric Photo Upload & Storage Pipeline
- **Pengunggahan 100% Terpusat di Admin**: Seluruh proses pengunggahan foto wisuda, pembuatan folder Google Drive, dan penyaluran berkas klien DILAKUKAN SEPENUHNYA OLEH ADMIN STUDIO dari Admin Dashboard.
- **Direct-to-Drive Stream (Zero Disk Transit)**: Pengunggahan berkas master wisuda menggunakan Google Drive Resumable Upload API secara langsung (direct stream). Berkas mentah TIDAK PERNAH disimpan/ditransitkan di disk lokal VPS server.

## 4. Dilarang Merombak Kode Hanya Demi Lulus Test (Zero Blind Test-Driven Regression)
- Jika terdapat perubahan alur sistem atau jika sebuah unit test (`*.test.js`) gagal karena membawa alur lama, **DILARANG KERAS MENGUBAH KODE PRODUKSI HANYA DEMI MEMBUAT TEST LULUS**.
- Agen WAJIB berhenti, menjelaskan ketidaksesuaian yang ditemukan, alasan mengapa hal tersebut terjadi, dan dampak perubahannya kepada user sebelum melakukan modifikasi apapun.
- Unit test yang harus disesuaikan dengan arsitektur resmi yang disetujui user, BUKAN kode produksi yang diacak-acak demi memenuhi test lama.
