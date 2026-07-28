# Laporan Investigasi: Kegagalan Akses & Performa Buruk Admin Panel

**Tanggal:** 29 Juli 2026
**Platform:** Wisuda Platform v1.3.0+

## 1. Ringkasan Masalah

Setelah proses `pull` dan `deploy` terbaru, Halaman Admin (`/admin`) tidak dapat diakses. Gejala yang teramati adalah:
1.  Halaman hanya menampilkan latar belakang gelap (dari CSS body `bg-[#0f0f0f]`) tanpa konten interaktif seperti form login.
2.  Browser menjadi sangat lambat dan tidak responsif (penggunaan CPU tinggi), menandakan adanya *infinite loop* atau *retry storm*.
3.  Log di sisi server (`pm2 logs`) dipenuhi dengan error `Error: Not allowed by CORS`.

## 2. Analisis & Temuan Teknis

Investigasi menemukan dua akar masalah utama yang saling berhubungan.

### Temuan #1: Kesalahan Konfigurasi Build Path pada Vite (Frontend)

Ini adalah masalah **kritis** yang menjadi penyebab utama halaman kosong.

-   **Lokasi File:** `public/admin/index.html` (hasil build dari `admin-app/`)
-   **Masalah:** File HTML yang di-generate oleh Vite memiliki path yang salah untuk aset JavaScript dan CSS utamanya.
    ```html
    <!-- Path yang salah -->
    <script type="module" crossorigin src="/admin/assets/index-WEHjHcXA.js"></script>
    <link rel="stylesheet" crossorigin href="/admin/assets/index-Cf7ICEkq.css">
    ```
-   **Dampak:** Browser mencoba memuat file dari `http://<domain>/admin/assets/...` padahal seharusnya path tersebut relatif terhadap lokasi `index.html`. Karena file JS utama gagal dimuat, aplikasi Vue.js tidak pernah diinisialisasi (`<div id="app"></div>` tetap kosong).

### Temuan #2: Konfigurasi CORS yang Terlalu Ketat (Backend)

Ini adalah masalah sekunder yang muncul setelah masalah pertama, dan menjadi penyebab error di log server.

-   **Lokasi File:** `src/main.js`
-   **Masalah:** Log server menunjukkan bahwa setiap permintaan API dari luar server itu sendiri ditolak.
    ```log
    Error: Error: Not allowed by CORS
        at origin (/DATA/AppData/wisuda-platform/src/main.js:36:16)
    ```
-   **Dampak:** Bahkan jika frontend berhasil dimuat, semua panggilan API untuk otentikasi, memuat data dashboard, dll., akan gagal total. Kegagalan ini kemungkinan besar memicu mekanisme *retry* di frontend, yang menyebabkan *CPU load* tinggi dan membuat browser terasa berat.

## 3. Rekomendasi Perbaikan

### Prioritas 1: Perbaiki Konfigurasi Build Vite

Perbaikan ini akan mengatasi masalah halaman admin yang kosong.

-   **Tindakan:** Edit file `admin-app/vite.config.js`. Atur opsi `base` untuk memastikan path aset yang dihasilkan sudah benar untuk lingkungan produksi yang berjalan di subdirektori.
-   **Contoh Kode:**
    ```javascript
    // admin-app/vite.config.js
    import { defineConfig } from 'vite';

    export default defineConfig({
      // ...konfigurasi lain
      base: '/admin/', // Pastikan nilainya adalah '/admin/'
      // ...
    });
    ```

### Prioritas 2: Pindahkan Konfigurasi CORS ke `.env` (Best Practice)

Perbaikan ini akan membuat konfigurasi lebih fleksibel, aman, dan mudah dikelola tanpa mengubah kode sumber.

-   **Tindakan:**
    1.  Definisikan daftar origin yang diizinkan di dalam file `.env` sebagai string yang dipisahkan koma.
    2.  Ubah kode di `src/main.js` untuk membaca variabel lingkungan ini.

-   **Contoh Kode:**

    **1. File `.env`:**
    ```env
    # .env
    CORS_ALLOWED_ORIGINS=http://localhost:8081,http://192.168.100.254:8084,http://192.168.100.207,http://192.168.100.207:8081
    ```

    **2. File `src/main.js`:**
    ```javascript
    // src/main.js
    // Pastikan dotenv.config() sudah dipanggil di awal file
    
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
      ? process.env.CORS_ALLOWED_ORIGINS.split(',') 
      : [];

    const corsOptions = {
      origin: (origin, callback) => {
        // Izinkan request tanpa origin (misal: dari Postman, curl, atau mobile apps)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      // ...
    };
    ```

Dengan menerapkan kedua perbaikan ini, Admin Panel seharusnya dapat kembali berfungsi dengan normal dan stabil.
