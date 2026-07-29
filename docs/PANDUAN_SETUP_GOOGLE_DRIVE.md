# 📖 Panduan Resmi Setup Google Drive (Smart Hybrid System & 3-Step Wizard)

Selamat datang di Panduan Integrasi Google Drive Platform Wisuda Photography. 
Sistem menggunakan teknologi **Smart Hybrid** yang menggabungkan kemudahan penggunaan bawaan, otorisasi akun Google Drive Studio via **3-Step Wizard**, dan keamanan bot otomatisasi 24/7.

---

## 🎯 1. Memahami 2 Mode Utama Sistem

Aplikasi ini dirancang fleksibel agar **dapat langsung digunakan oleh pengguna awam tanpa setup rumit**:

| Mode | Kapan Digunakan | Cara Kerja untuk Admin |
| :--- | :--- | :--- |
| **Opsi A: Mode Direct Link (Bawaan / Tanpa Setup)** | Aktif otomatis jika belum menautkan akun Google Drive. | Tombol upload di Admin Dashboard akan **langsung membuka tab subfolder Google Drive secara presisi**. Admin tinggal menyeret (*drag & drop*) foto ke tab tersebut. |
| **Opsi B: Mode Direct Web Upload (Tingkat Lanjut)** | Aktif otomatis setelah Admin menyelesaikan **3-Step Wizard Google OAuth** di Settings. | Admin dapat **memilih/menyeret file foto langsung dari layar Web Admin** tanpa perlu membuka tab Google Drive terpisah. File dialirkan otomatis menggunakan kuota penyimpanan akun Gmail Admin. |

---

## 🤖 2. Peran Bot Service Account vs Akun Gmail Admin

Sistem membagi tugas secara adil dan otomatis:

```mermaid
graph TD
    subgraph 🤖 Service Account Bot (Otomatis 24/7 di Latar Belakang)
        B1["1. Membuat Master Folder Client & 3 Subfolder Presisi Saat DP"]
        B2["2. Menjalankan Cron Job Pembersihan Retensi (H+30) Jam 03:00 WITA"]
        B3["3. Mentransfer Akses Kepemilikan & Memindahkan Folder Kadaluwarsa ke Sampah"]
    end

    subgraph 👤 Akun Gmail Admin (Di-oauth dari Web Admin via 3-Step Wizard)
        A1["Menyediakan Kuota Storage Besar (100 GB s/d 5 TB)"]
        A2["Digunakan Saat Admin Mengunggah Foto dari Web (Opsi B)"]
    end
```

---

## 🚀 3. Panduan Langkah Demi Langkah 3-Step Wizard OAuth (Opsi B)

Buka Web Admin di menu **Settings > Google Drive** (`/admin/settings?tab=drive`). Integrasi Google Drive wajib mengikuti alur **3-Step Wizard Resmi**:

### 📋 Pre-Setup: Membuat Credential di Google Cloud Console

1. Buka halaman [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Pilih proyek Anda (atau klik **Create Project**).
3. **Konfigurasi OAuth Consent Screen** (jika belum):
   * Pilih **`Eksternal`** ➔ Klik **Create**.
   * Isi *Email dukungan pengembang* dengan email Gmail Anda.
   * Klik **Save and Continue** sampai selesai.
4. **Buat Kredensial OAuth**:
   * Klik **+ CREATE CREDENTIALS** ➔ Pilih **OAuth client ID**.
   * Pilih Application type: **Web application**.
   * Pada bagian **Authorized redirect URIs**, klik **+ ADD URI** dan masukkan:
     ```text
     http://localhost:8081/api/admin/auth/google/callback
     ```
     *(Catatan: Untuk server produksi/live, tambahkan URL domain Anda: `https://domain-anda.com/api/admin/auth/google/callback`)*.
   * Klik **CREATE**. Salin **Client ID** dan **Client Secret** yang diberikan.

---

### ⚙️ Step 1: Google OAuth Credentials (Mandatory Verification Before Save)

1. Di Admin Settings tab Google Drive, isi form **Client ID** dan **Client Secret**.
2. Klik tombol **`Verifikasi & Simpan Credential`**.
3. **Mekanisme Otomatis Backend**: Sebelum menyimpan ke database, backend akan melakukan *probe verification test* langsung ke endpoint Google (`https://oauth2.googleapis.com/token`).
   - Jika Google merespon `invalid_client` (ID & Secret tidak cocok/salah), proses simpan **HARUS DITOLAK** dan menampilkan pesan error penolakan.
   - Jika verifikasi lolos, Client ID & Secret akan tersimpan aman di sistem.

> ⚠️ **Aturan Ketat**: Step 2 TIDAK AKAN TERBUKA sebelum Step 1 terkonfigurasi 100% dan terverifikasi cocok oleh Google.

---

### 🔗 Step 2: Tautkan Akun Google Drive (Gmail Studio)

1. Setelah Step 1 terverifikasi, bagian **Step 2: Tautkan Akun Google Drive** akan otomatis terbuka.
2. Klik tombol **`🔗 Tautkan Akun Google Drive (OAuth)`**.
3. Jendela popup otorisasi Google akan terbuka. Pilih akun Gmail utama studio Anda dan izinkan (*Allow*).
4. Setelah berhasil, token akses akan tersimpan dan status akan menampilkan akun Gmail yang terhubung beserta sisa kuota storage.

> ⚠️ **Aturan Ketat**: Step 3 TIDAK AKAN TERBUKA sebelum Step 2 berhasil ditautkan ke akun Gmail Studio.

---

### 📁 Step 3: Master Root Folder Drive

1. Setelah Step 2 berhasil ditautkan, bagian **Step 3: Master Root Folder Drive** akan terbuka.
2. Pilih atau masukkan ID Folder Utama Google Drive tempat seluruh folder wisudawan akan disimpan secara terpusat.
3. Klik **`Simpan Konfigurasi Master Folder`**.
4. Indikator status akan berubah menjadi **`🟢 INTEGRASI SELESAI & AKTIF (Mode Opsi B)`**.

---

## ❓ FAQ & Troubleshooting

### Q: Mengapa saat klik Simpan Credential di Step 1 muncul Error "Client ID dan Client Secret tidak cocok"?
* **Jawab**: Backend melakukan tes verifikasi langsung ke server Google. Error ini menandakan pasangan Client ID dan Client Secret yang Anda masukkan tidak cocok atau salah salin dari Google Cloud Console. Periksa kembali karakter dan spasi yang tersalin.

### Q: Apa yang terjadi jika penyimpanan Google Drive saya hampir penuh?
* **Jawab**: Klik tombol **`🔄 Putuskan & Ganti Akun Gmail`** di Admin Settings, lalu jalankan kembali Step 2 menggunakan akun Gmail baru yang masih kosong. Seluruh upload berikutnya otomatis dialirkan ke akun baru.

### Q: Mengapa muncul Error `400: redirect_uri_mismatch` saat otorisasi Step 2?
* **Jawab**: URL di Google Cloud Console belum cocok. Buka Google Cloud Console ➔ Edit Client ID ➔ Pastikan di *Authorized redirect URIs* sudah ada `http://localhost:8081/api/admin/auth/google/callback` (lengkap dengan port `8081`).

### Q: Apakah pengguna awam wajib melakukan setup OAuth ini?
* **Jawab**: **TIDAK WAJIB**. Jika belum menautkan OAuth, aplikasi tetap 100% berjalan normal via **Mode Direct Link (Opsi A)** bawaan tanpa kendala.
