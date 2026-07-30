# Laporan Audit & Rekomendasi Optimasi Kode Frontend

**Tanggal:** 30 Juli 2026
**Disusun oleh:** Hermes Agent

## 1. Ringkasan Eksekutif

Analisis ini dilakukan untuk mengidentifikasi kode sisa, logika yang tidak efisien, dan potensi masalah performa pada halaman-halaman publik aplikasi. Investigasi ini dipicu oleh keluhan *loading* yang terasa lambat pada halaman `tracking.html` dan ditemukannya pemanggilan aset yang sudah usang (favicon).

**Kesimpulan Utama:** Ditemukan beberapa masalah konsisten di seluruh file HTML publik yang menyebabkan request jaringan yang tidak perlu, ketergantungan pada CDN eksternal, dan perilaku fallback yang tidak ideal. Perbaikan pada isu-isu ini akan secara signifikan meningkatkan kecepatan muat halaman, mengurangi ketergantungan, dan membuat kode lebih bersih.

---

## 2. Temuan Kritis & Rekomendasi

### 2.1. Pemanggilan Favicon Hardcoded (Beban Performa)

- **Masalah:** Setiap halaman HTML (`index.html`, `inquiry.html`, `tracking.html`, `moodboard.html`, `portfolio.html`) memuat favicon secara manual menggunakan tag `<link>` di dalam `<head>`.
    ```html
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="shortcut icon" href="/favicon.ico">
    ```
- **Analisis Logika:** Logika ini adalah sisa dari pengembangan versi lama. Sistem saat ini sudah memiliki mekanisme untuk mengatur favicon secara dinamis melalui JavaScript yang datanya diambil dari database (via Admin Panel). Kode *hardcoded* ini tidak hanya mubazir, tetapi juga bertentangan dengan logika dinamis tersebut.
- **Dampak pada Sistem:**
    - **Beban Jaringan:** Menambahkan 2 request HTTP yang tidak perlu pada setiap pemuatan halaman.
    - **Inkonsistensi:** Menyebabkan browser mencoba memuat `/favicon.png`, meskipun Anda sudah mengunggah logo atau favicon yang berbeda di admin panel.
    - **Memperlambat Render Awal:** Setiap request, sekecil apa pun, menambah latensi pada *initial page load*.
- **Rekomendasi:** **HAPUS** kedua baris kode di atas dari **semua file HTML publik**. Biarkan JavaScript yang menangani pemuatan favicon secara dinamis.

### 2.2. Inkonsistensi Pemuatan Tailwind CSS (Ketergantungan Eksternal)

- **Masalah:** Ada dua metode berbeda yang digunakan untuk memuat library Tailwind CSS.
    - **Metode Lokal (Baik):** `index.html` dan `tracking.html` menggunakan `<link rel="stylesheet" href="/css/tailwind.min.css">`.
    - **Metode CDN (Kurang Optimal):** `inquiry.html`, `moodboard.html`, dan `portfolio.html` menggunakan `<script src="https://cdn.tailwindcss.com"></script>`.
- **Analisis Logika:** Menggunakan CDN untuk library fundamental seperti Tailwind CSS menciptakan ketergantungan eksternal yang tidak perlu, padahal file CSS yang sudah di-*bundle* dan di-*purge* (dioptimalkan) sudah tersedia secara lokal.
- **Dampak pada Sistem:**
    - **Ketergantungan Eksternal:** Jika CDN `tailwindcss.com` mengalami gangguan, tiga halaman penting akan rusak total.
    - **Performa Buruk:** Memuat dari CDN memerlukan DNS lookup tambahan ke domain pihak ketiga, yang lebih lambat daripada memuat aset dari domain yang sama.
    - **Ukuran File Lebih Besar:** Versi CDN umumnya tidak dioptimalkan (unpurged), sehingga ukurannya jauh lebih besar daripada file `tailwind.min.css` lokal Anda.
- **Rekomendasi:** **SERAGAMKAN** metode pemuatan. Ganti tag `<script src="...cdn.tailwindcss.com"...>` di ketiga file tersebut dengan tag `<link rel="stylesheet" href="/css/tailwind.min.css">`.

### 2.3. Fallback Gambar yang Tidak Elegan (Pengalaman Pengguna)

- **Masalah:** Pada halaman `moodboard.html` dan `portfolio.html`, jika sebuah gambar gagal dimuat, elemen `<img>` akan menampilkan `favicon.png` sebagai gambar pengganti.
    ```javascript
    @error="$event.target.src='/favicon.png'"
    ```
- **Analisis Logika:** Ini adalah solusi darurat yang fungsional tetapi tidak memberikan pengalaman pengguna yang baik. Menampilkan logo kecil di tempat yang seharusnya berisi foto portofolio akan terlihat seperti bug atau error.
- **Dampak pada Sistem:** Estetika halaman rusak ketika ada gambar yang hilang atau *broken link*.
- **Rekomendasi:** Ganti logika fallback. Pilihan yang lebih baik:
    - **Sembunyikan Elemen:** Gunakan `@error="$event.target.style.display='none'"` untuk menyembunyikan gambar yang rusak.
    - **Gunakan Placeholder Netral:** Ganti dengan URL ke gambar placeholder abu-abu atau netral yang menandakan "gambar tidak tersedia".

### 2.4. Isu Performa Halaman `tracking.html`

- **Masalah:** Pengguna melaporkan `tracking.html` terasa lambat saat pertama kali diakses.
- **Analisis & Debug:**
    1.  Investigasi awal saya mengonfirmasi bahwa halaman tersebut tidak langsung menampilkan timeline, menimbulkan kecurigaan adanya *blocking request*.
    2.  Analisis kode `tracking.html` menunjukkan **tidak ada panggilan langsung ke API Google Drive pada tahap awal**.
    3.  Penyebab kelambatan kemungkinan besar adalah **akumulasi dari masalah-masalah kecil** yang disebutkan di atas: 2 request favicon + 1 request font Google + beberapa request aset lainnya yang terjadi secara bersamaan. Halaman ini juga memiliki banyak sekali CSS (116KB) dan JavaScript (lebih dari 1MB jika semua digabungkan), yang membutuhkan waktu untuk di-parse oleh browser.
- **Rekomendasi:**
    - **Terapkan Poin 2.1 dan 2.2:** Menghilangkan request favicon dan menyatukan pemuatan CSS akan memberikan peningkatan performa yang paling terasa.
    - **Pertimbangkan Lazy Loading:** Untuk gambar atau komponen yang tidak terlihat di viewport awal, pertimbangkan untuk menunda pemuatannya (*lazy loading*) hingga pengguna scroll ke bawah.

---

## 3. Kesimpulan & Langkah Selanjutnya

Sistem frontend publik saat ini dalam kondisi fungsional, tetapi membawa beban teknis dari versi pengembangan sebelumnya. Kode sisa ini secara kumulatif menurunkan performa dan keandalan.

**Prioritas Perbaikan:**
1.  **Hapus pemanggilan favicon hardcoded (Poin 2.1).** Ini adalah *low-hanging fruit* dengan dampak terbesar.
2.  **Seragamkan pemuatan Tailwind CSS (Poin 2.2).** Ini akan menghilangkan ketergantungan eksternal dan meningkatkan kecepatan.
3.  Perbaiki logika fallback gambar (Poin 2.3) untuk pengalaman pengguna yang lebih profesional.

Dengan menerapkan rekomendasi ini, aplikasi akan menjadi lebih ringan, lebih cepat, dan lebih mudah dipelihara.
