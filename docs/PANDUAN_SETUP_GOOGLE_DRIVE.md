# 📖 Panduan Resmi Setup Google Drive (Smart Hybrid System)

Selamat datang di Panduan Integrasi Google Drive Platform Wisuda Photography. 
Sistem kita menggunakan teknologi **Smart Hybrid** yang menggabungkan kemudahan pengguna awam, keamanan bot otomatisation 24/7, dan kapasitas penyimpanan besar.

---

## 🎯 1. Memahami 2 Mode Utama Sistem

Aplikasi ini dirancang pintar agar **dapat langsung digunakan oleh pengguna awam tanpa setup rumit**:

| Mode | Kapan Digunakan | Cara Kerja untuk Admin |
| :--- | :--- | :--- |
| **Opsi A: Mode Direct Link (Bawaan / Tanpa Setup)** | Aktif otomatis jika belum menautkan akun Google Drive. | Tombol upload di Admin Dashboard akan **langsung membuka tab subfolder Google Drive secara presisi**. Admin tinggal menyeret (*drag & drop*) foto ke tab tersebut. |
| **Opsi B: Mode Direct Web Upload (Tingkat Lanjut)** | Aktif otomatis setelah Admin menautkan akun Google Drive di Settings. | Admin dapat **memilih/menyeret file foto langsung dari layar Web Admin** tanpa perlu membuka tab Google Drive terpisah. File dialirkan otomatis menggunakan kuota penyimpan akun Gmail Admin. |

---

## 🤖 2. Peran Bot Service Account vs Akun Gmail Admin

Sistem membagi tugas secara adil dan otomatis:

```mermaid
graph TD
    subgraph 🤖 Service Account Bot (Otomatis 24/7 di Latar Belakang)
        B1["1. Membuat Folder Induk Client & 3 Subfolder Presisi Saat DP"]
        B2["2. Menjalankan Cron Job Pembersihan Retensi (H+30) Jam 00:00"]
        B3["3. Mentransfer Akses Kepemilikan & Memindahkan Folder Kadaluwarsa ke Sampah"]
    end

    subgraph 👤 Akun Gmail Admin (Di-oauth dari Web Admin)
        A1["Menyediakan Kuota Storage Besar (100 GB s/d 5 TB)"]
        A2["Digunakan Saat Admin Mengunggah Foto dari Web (Opsi B)"]
    end
```

---

## 🚀 3. Panduan Langkah Demi Langkah Otorisasi OAuth (Opsi B)

Bagi Anda yang ingin mengaktifkan **Mode Direct Web Upload (Opsi B)** dari Web Admin:

### Langkah A: Membuat Credential di Google Cloud Console (Cukup 1x di Awal)

1. Buka halaman [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Jika diminta memilih proyek, pilih proyek Anda (atau klik **Create Project**).
3. **Konfigurasi OAuth Consent Screen** (jika belum):
   * Pilih **`Eksternal`** ➔ Klik **Create**.
   * Isi *Email dukungan pengembang* dengan email Gmail Anda.
   * Klik **Save and Continue** sampai selesai.
4. **Buat Kredensial OAuth**:
   * Klik **+ CREATE CREDENTIALS** di bagian atas ➔ Pilih **OAuth client ID**.
   * Pilih Application type: **Web application**.
   * Pada bagian **Authorized redirect URIs**, klik **+ ADD URI** dan masukkan:
     ```text
     http://localhost:8081/api/admin/auth/google/callback
     ```
     *(Catatan: Jika sudah di-deploy di server live, tambahkan juga URL domain Anda: `https://domain-anda.com/api/admin/auth/google/callback`)*.
   * Klik **CREATE**. Salin **Client ID** dan **Client Secret** yang diberikan.

---

### Langkah B: Menautkan Akun di Web Admin Panel

1. Buka Web Admin di menu **Settings > Google Drive** (`/admin/settings?tab=drive`).
2. Di bagian **⚙️ Google OAuth Credentials**, klik **`✏️ Ubah Credential`**:
   * Tempelkan **Client ID** yang disalin tadi.
   * Tempelkan **Client Secret** yang disalin tadi.
   * Klik **`Simpan Credential OAuth`**.
3. Klik tombol kuning **`🔗 Tautkan Akun Google Drive (OAuth)`**.
4. Jendela otorisasi Google akan terbuka. Pilih akun Gmail utama studio Anda dan izinkan (*Allow*).
5. Selesai! Indikator status akan berubah menjadi **`🟢 Mode Web Upload (Opsi B Aktif)`** dan menampilkan sisa kuota storage Anda secara *real-time*.

---

## ❓ FAQ & Troubleshooting (Tanya Jawab Masalah)

### Q: Apa yang terjadi jika penyimpanan Google Drive saya hampir penuh?
* **Jawab**: Tinggal klik tombol **`🔄 Ganti Akun Gmail`** di Admin Settings, lalu login menggunakan akun Gmail baru yang masih kosong. Seluruh upload berikutnya akan otomatis dialirkan ke akun baru tanpa merusak file pemesanan lama.

### Q: Mengapa muncul Error `400: redirect_uri_mismatch` saat login?
* **Jawab**: URL di Google Cloud Console belum cocok. Buka Google Cloud Console ➔ Edit Client ID ➔ Pastikan di *Authorized redirect URIs* sudah ada `http://localhost:8081/api/admin/auth/google/callback` (lengkap dengan port `8081`).

### Q: Apakah pengguna awam wajib melakukan setup OAuth ini?
* **Jawab**: **TIDAK WAJIB**. Jika pengguna awam belum memasukkan Client ID, aplikasi tetap 100% berjalan normal via **Mode Direct Link (Opsi A)** bawaan tanpa kendala.
