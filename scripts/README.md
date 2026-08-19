# 📜 Direktori Skrip Utilitas (`scripts/`) — Wisuda Platform

Direktori ini berisi seluruh skrip otomasi, pemeliharaan database, audit pengujian, dan utilitas dokumentasi untuk **Wisuda Platform (Luxenary.co)**.

---

## 📑 Ringkasan Cepat Skrip

| Nama Skrip | Perintah Eksekusi / NPM | Kategori | Tingkat Risiko | Deskripsi Singkat |
| :--- | :--- | :--- | :---: | :--- |
| **`seed.js`** | `npm run seed` | Database | 🟢 Aman | Menginisialisasi data awal (paket, akun admin default, pengaturan sistem, template WA). |
| **`reset-admin-password.js`** | `npm run reset:admin` | Admin / Auth | 🟢 Aman | Mereset password akun admin tanpa risiko shell error atau karakter unicode. |
| **`reset-db.js`** | `npm run db:reset` | Development | 🔴 Hati-Hati | Mengosongkan data transaksi & booking klien untuk kebutuhan testing lingkungan dev. |
| **`schema.sql`** | `npm run migrate` | Database | 🟢 Aman | Skema dasar DDL SQLite (`CREATE TABLE IF NOT EXISTS`). |
| **`jest-global-teardown.js`** | `npm test` | Testing | 🟢 Aman | Helper teardown Jest untuk menutup koneksi database pasca-pengujian. |
| **`capture_authenticated_screenshots.js`** | `node scripts/capture_authenticated_screenshots.js` | Audit / UI | 🟢 Aman | Mengambil tangkapan layar otomatis halaman dashboard terautentikasi. |
| **`scan_all_pages_deep.js`** | `node scripts/scan_all_pages_deep.js` | Audit / QA | 🟢 Aman | Crawler otomatis untuk memvalidasi respons seluruh endpoint & halaman web. |
| **`ui_audit_scanner.js`** | `node scripts/ui_audit_scanner.js` | Audit / UI | 🟢 Aman | Memvalidasi integritas visual, layout CSS, dan elemen DOM halaman. |
| **`generate_pdf_manual.py`** | `python3 scripts/generate_pdf_manual.py` | Dokumentasi | 🟢 Aman | Meng-generate PDF manual operasional pengguna/klien. |
| **`generate_workflow_pdf.py`** | `python3 scripts/generate_workflow_pdf.py` | Dokumentasi | 🟢 Aman | Meng-generate PDF diagram alur kerja operasional studio. |

---

## 🛠️ Detail & Panduan Penggunaan Skrip

### 1. `seed.js` — Inisialisasi Database
* **Tujuan**: Mengisi database kosong dengan data bawaan yang dibutuhkan agar sistem langsung siap digunakan.
* **Perintah**:
  ```bash
  npm run seed
  # atau
  node scripts/seed.js
  ```
* **Apa yang Dibuat**:
  * Akun Admin Default: username `admin`, password `admin123`.
  * Paket Layanan Fotografi Wisuda Default.
  * Template WhatsApp Default (Inquiry, DP, Pelunasan, Drive Link, dll.).
  * Pengaturan Dasar Sistem (Timezone, DP Percentage, Upload Deadline).

---

### 2. `reset-admin-password.js` — Reset Kata Sandi Admin
* **Tujuan**: Mereset kata sandi akun admin secara aman menggunakan `bcrypt` jika lupa password login.
* **Perintah**:
  ```bash
  # Reset ke password default 'admin123' untuk user 'admin'
  npm run reset:admin

  # Reset ke password kustom untuk user 'admin'
  node scripts/reset-admin-password.js rahasiaBaru123

  # Reset ke password kustom untuk username spesifik
  node scripts/reset-admin-password.js rahasiaBaru123 superadmin
  ```
* **Jaminan Keamanan**:
  * Hanya mengubah 1 baris kolom `password_hash` akun terkait.
  * Seluruh data klien, booking, foto, dan laporan keuangan **100% aman dan tidak tersentuh**.

---

### 3. `reset-db.js` — Pembersihan Data Transaksi (Testing Dev Only)
* **Tujuan**: Mengosongkan data transaksi, booking, foto, dan inquiry untuk menguji ulang alur dari awal.
* **Perintah**:
  ```bash
  npm run db:reset
  # atau
  node scripts/reset-db.js
  ```
* ⚠️ **Peringatan**: Skrip ini **HANYA untuk lingkungan pengujian lokal (Local Development)**. Jangan jalankan di server produksi karena akan menghapus seluruh data booking dan invoice.

---

### 4. `schema.sql` — Skema Database SQLite
* **Tujuan**: Definisi DDL seluruh tabel relasional SQLite (inquiries, bookings, assignments, freelancers, packages, users, settings, audit_logs, qris_transactions, dll.).
* **Perintah**:
  ```bash
  npm run migrate
  ```

---

### 5. `jest-global-teardown.js` — Teardown Runner Jest
* **Tujuan**: Memastikan koneksi SQLite ditutup rapi setelah pengujian selesai agar tidak terjadi *resource leak*.
* **Perintah**: Dijalankan secara otomatis oleh Jest saat mengetik `npm test`.

---

### 6. Skrip Audit & Dokumentasi Visual (`scan_all_pages_deep.js`, `ui_audit_scanner.js`, `capture_authenticated_screenshots.js`)
* **Tujuan**: Rangkaian skrip otomasi penjamin mutu (QA) berbasis Puppeteer untuk melakukan audit navigasi, validasi elemen tampilan, dan pembuatan tangkapan layar otomatis.
* **Prasyarat**: Server lokal harus dalam kondisi menyala (`npm start` di port 8081).
* **Perintah**:
  ```bash
  node scripts/scan_all_pages_deep.js
  node scripts/ui_audit_scanner.js
  node scripts/capture_authenticated_screenshots.js
  ```

---

### 7. Generator PDF (`generate_pdf_manual.py`, `generate_workflow_pdf.py`)
* **Tujuan**: Mengonversi panduan operasional markdown menjadi dokumen PDF resmi berformat cetak.
* **Prasyarat**: Python 3 terpasang dengan library `reportlab`.
* **Perintah**:
  ```bash
  python3 scripts/generate_pdf_manual.py
  python3 scripts/generate_workflow_pdf.py
  ```

---

## 🔒 Standar Keamanan & Praktik Terbaik

1. **Jalankan sebagai User Non-Root**: Seluruh skrip harus dijalankan dengan user biasa (`amsdev` di Linux atau user lokal Anda di macOS), **bukan `sudo`**.
2. **Backup Otomatis**: Sebelum menjalankan skrip manipulasi database besar, pastikan file `DATA/wisuda.db` telah di-backup.
