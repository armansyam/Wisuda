# 📜 Syarat & Ketentuan (S&K) dan SOP Booking Wisuda

> ⚠️ **Aturan Penting Implementasi Sistem (Dynamic Branding)**:  
> Nama brand/perusahaan (misalnya `{company_name}`) **TIDAK BOLEH di-hardcode** sebagai teks statis pada tampilan web/modal. Semua nama brand, persentase DP, dan masa simpan file wajib diambil secara **dinamis** dari Database Setting Admin (`settings.company_name`, `settings.dp_percentage`, `settings.drive_retention_months`).

---

## 1. Syarat & Ketentuan (S&K)

### A. Pembayaran & Konfirmasi Booking
1. **Down Payment (DP)**: Booking dinyatakan sah dan jadwal di-*lock* setelah klien membayar DP sesuai persentase yang berlaku (diatur pada sistem, default **{dp_percentage}%**) serta mengunggah/mengirimkan bukti pembayaran.
2. **Sifat DP (Non-Refundable)**: DP yang sudah dibayarkan **tidak dapat dikembalikan (non-refundable)** apabila terjadi pembatalan sepihak dari pihak klien.
3. **Pelunasan**: Pelunasan biaya sisa wajib dilakukan maksimal pada **Hari-H setelah sesi foto selesai** atau **H-1** sebelum file *master/preview* dikirimkan.

---

### B. Penjadwalan & Toleransi Keterlambatan
1. **Ketepatan Waktu**: Klien diimbau untuk hadir **15 menit sebelum** jam sesi foto yang telah disepakati.
2. **Toleransi Keterlambatan**: Keterlambatan dari pihak klien akan mengurangi durasi sesi foto yang berlangsung tanpa adanya perpanjangan waktu otomatis (kecuali ada kesepakatan ulang di lokasi jika jadwal fotografer memungkinkan).
3. **Reschedule (Ubah Jadwal)**: Pengajuan pergeseran jadwal maksimal dilakukan **H-3 sebelum acara**, dan tergantung pada ketersediaan (*availability*) fotografer {company_name}.

---

### C. Cuaca Ekstrem (*Force Majeure*)
1. **Kondisi Hujan / Cuaca Buruk**: Apabila terjadi hujan deras atau cuaca buruk pada lokasi sesi outdoor, sesi foto akan dialihkan ke area berteduh (*indoor/covered spot* kampus/venue) atau penyesuaian jam sesi pada hari yang sama selama jadwal fotografer memungkinkan.
2. **Pengembalian Dana**: DP tidak dapat dikembalikan akibat kendala cuaca (*force majeure*), namun tim {company_name} akan mengupayakan opsi lokasi/waktu terbaik di lapangan.

---

### D. Lokasi, Perizinan & Kapasitas Peserta
1. **Biaya Lokasi / Permit**: Biaya tiket masuk lokasi, *charge* izin foto dari pihak kampus/venue, maupun biaya parkir untuk tim fotografer menjadi tanggung jawab penuh klien.
2. **Kapasitas Peserta / Pendamping**: Setiap paket memiliki batas rekomendasi jumlah personil/pendamping (misal: Personal + Max 3 Pendamping). Untuk sesi foto grup besar (>5 orang), mohon mengonfirmasi di awal agar jadwal dan manajemen pose dapat disesuaikan.

---

### E. Hak Cipta, Hak Guna & Keamanan Barang
1. **Hak Cipta (Copyright)**: Hak cipta karya fotografi tetap dipegang oleh {company_name}.
2. **Hak Guna Klien**: Klien mendapatkan hak guna pribadi (*personal license*) untuk cetak, unggah ke media sosial, dan kebutuhan non-komersial.
3. **Portofolio**: {company_name} berhak menggunakan karya foto sebagai bagian dari portofolio (Instagram, Website, Marketing) kecuali ada permintaan privasi khusus (*Privacy Request*) tertulis dari klien sebelum sesi foto dimulai.
4. **Tanggung Jawab Barang Pribadi**: Keamanan barang-barang pribadi (toga, buket bunga, perhiasan, gadget, dan perlengkapan pribadi lainnya) menjadi tanggung jawab penuh klien selama sesi pemotretan berlangsung.

---

### F. Standar Editing & Prosedur Hasil
1. **Standar Editing**: Editing foto standar {company_name} mencakup koreksi warna (*color grading*), penyesuaian pencahayaan (*exposure*), serta kontras khas {company_name}.
2. **Batasan Editing**: Editing {company_name} **tidak mencakup** manipulasi foto ekstrem seperti merubah/menghilangkan objek latar belakang secara besar-besaran, manipulasi bentuk tubuh, atau merubah warna busana. Editing khusus di luar standar dapat dikenakan biaya tambahan per foto.

---

### G. Seleksi Foto & Masa Simpan File (Google Drive)
1. **Batas Waktu Seleksi Foto**: Klien wajib melakukan pemilihan foto favorit melalui portal **`/select-photos.html`** maksimal **14 hari** setelah link diberikan.
2. **Waktu Proses Editing**: Proses edisi foto membutuhkan waktu **7–14 hari kerja** terhitung *setelah* klien selesai mengunci/mengirimkan hasil seleksi foto.
3. **Masa Retensi Google Drive**: File foto di Google Drive disimpankan dan dapat diakses sesuai dengan batas waktu yang diatur pada sistem (variabel `drive_retention_months` di Admin Setting). Klien wajib mengunduh (*download*) seluruh file ke perangkat pribadi sebelum masa retensi berakhir.

---

## 2. Standard Operating Procedure (SOP) Alur Pelayanan Klien

```
[1. Form Booking] ➔ [2. Bayar DP & Lock Schedule] ➔ [3. Briefing H-1] 
                                                               ⬇
[6. Terima Foto Edit] ⬅ [5. Seleksi Foto] ⬅ [4. Sesi Foto Hari-H]
```

1. **Tahap 1: Pengisian Form Booking**
   - Klien memilih paket wisuda, menentukan tanggal, jam, universitas/lokasi, serta data kontak.
   - Klien wajib membaca dan mencentang persetujuan S&K sebelum *submit*.

2. **Tahap 2: Pembayaran DP & Verifikasi**
   - Klien melakukan pembayaran DP via rekening resmi {company_name} dan mengunggah bukti bayar.
   - Admin memverifikasi pembayaran dan menerbitkan **Token Tracking** (`TRK-...`).

3. **Tahap 3: Koordinasi H-1 (Briefing Singkat)**
   - Fotografer/Admin akan menghubungi klien via WhatsApp H-1 untuk konfirmasi *titik kumpul (meet-up point)*, *dresscode*, dan kontak fotografer di lapangan.

4. **Tahap 4: Pelaksanaan Sesi Foto (Hari-H)**
   - Fotografer dan Klien bertemu di titik kumpul sesuai jam booking.
   - Sesi foto berlangsung sesuai durasi paket.

5. **Tahap 5: Seleksi Foto (Portal Klien)**
   - Klien menerima link & token akses portal `/select-photos.html`.
   - Klien memilih foto favorit (*love/bookmark*) sesuai kuota paket.

6. **Tahap 6: Delivery & Pelunasan**
   - Tim editor memproses foto pilihan klien.
   - Klien melakukan pelunasan sisa pembayaran.
   - Link Google Drive foto *high-resolution* hasil akhir diberikan melalui halaman *Tracking*.

---

## 3. Ringkasan Poin Kunci untuk Tampilan Web (Form Booking UI)

Sebelum tombol `Submit Booking` diaktifkan, tampilan web akan menampilkan **ringkasan Poin Kunci (Dinamis dari Admin Setting)**:
- ⚡ **DP {dp_percentage}% Non-Refundable** *(Mengunci jadwal & penugasan fotografer)*
- ⏰ **Hadir 15 Menit Sebelum Jam Sesi** *(Menjaga durasi foto maksimal)*
- 📁 **Masa Simpan Google Drive {drive_retention_months} Bulan** *(Sesuai setting retensi aktif)*
- 🎨 **Editing Standar {company_name}** *(Color grading & pencahayaan khas brand)*
