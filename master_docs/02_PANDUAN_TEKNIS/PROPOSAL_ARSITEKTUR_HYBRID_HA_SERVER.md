# 📑 Proposal Teknis: Arsitektur Hybrid Multi-Server (Cloud VPS & Self-Hosted On-Premise)

Dokumen ini merupakan proposal komprehensif mengenai perancangan infrastruktur **Hybrid High-Availability (HA) & Load-Balanced Server** untuk Platform Fotografi Wisuda, yang menggabungkan keunggulan **Cloud VPS (Biznet GIO)**, **Server Lokal Studio (Self-Hosted On-Premise)**, dan **Cloudflare Intelligent Edge**.

---

## 1. Definisi & Jawaban: Apakah Ini Dinamakan "Balanced Server"?

**YA, TEPAT SEKALI.** Dalam rekayasa infrastruktur modern, skema ini disebut sebagai:

> **"Hybrid Multi-Origin Architecture (Active-Active Load Balancing & Automated Failover)"**

Skema ini memiliki 2 mode operasional yang dapat dipilih sesuai kebutuhan:

1. **Mode Active-Standby (Automated Failover / Disaster Recovery):**
   * **Server Utama (Primary):** VPS Cloud melayani seluruh pengunjung 24/7.
   * **Server Cadangan (Standby):** Server Lokal studio memegang database kembar (*mirrored*) secara *real-time*, siap mengambil alih 100% trafik dalam hitungan detik jika VPS mengalami kendala.
2. **Mode Active-Active (True Load Balancing):**
   * Cloudflare membagi beban trafik secara cerdas (*intelligent routing*):
     * **Trafik Publik/Klien (Booking, Galeri, Payment):** Ditangani oleh VPS Cloud yang cepat dan stabil.
     * **Trafik Internal/Admin (Upload Master Foto, Batch Processing):** Ditangani langsung oleh Server Lokal Studio tanpa batas bandwidth.

---

## 2. Alur Visual Berbasis Teks Kotak (Sangat Mudah Dibaca)

Berikut adalah 5 alur sistem yang digambarkan dalam bentuk alur kotak sederhana dan bertahap:

---

### 🌐 GAMBARAN BESAR SISTEM (BIG PICTURE)

```text
[1. KLIEN / PENGUNJUNG]
           │
           ▼ (Akses: wisuda.domainanda.com)
[2. PINTU CLOUDFLARE] ──────────────── (Deteksi Kondisi Server) ─────────┐
           │ (Kondisi Normal)                                            │ (Jika VPS Down)
           ▼                                                             ▼
[3. SERVER 2: CLOUD VPS (BIZNET)]                             [SERVER 1: LOKAL STUDIO]
   - Melayani Booking Klien 24 Jam                               (Cloudflare Tunnel)
   - Memproses Bayar via IP Statis
   - Menulis ke Database Primary
           │
           ▼ (🔄 Replikasi Otomatis Tiap Ada Transaksi ~2 KB)
[4. SERVER 1: LOKAL STUDIO]
   - Salinan Database Selalu Kembar Identik
   - Pusat Upload Ratusan Foto via LAN Studio
           │
           ▼ (🚀 Direct Stream Tanpa Lewat VPS)
[5. GOOGLE DRIVE RESMI STUDIO]
```

---

### 📍 ALUR 1: Klien Buka Web & Booking Paket Wisuda

```text
[Klien di HP / Laptop]
           │
           ▼ (1. Buka wisuda.domainanda.com)
[Pintu Cloudflare]
           │
           ▼ (2. Diteruskan ke Server Utama)
[Server 2: Cloud VPS (Biznet)]
           │
           ▼ (3. Simpan data pesanan baru)
[Database SQLite VPS]
```

---

### 📍 ALUR 2: Pembayaran iPaymu (Keluar Bawa IP Statis & Masuk via Webhook)

```text
A. SAAT KLIEN MAU BAYAR (OUTBOUND):
[Backend di VPS]
           │
           ▼ (1. Kirim Tagihan ke iPaymu menggunakan IP Statis VPS)
[Server iPaymu (my.ipaymu.com)] ──> Validasi IP Statis COCOK ✅ ──> QRIS / VA Muncul


B. SAAT KLIEN SUDAH BAYAR DI HP (INBOUND):
[Server iPaymu]
           │
           ▼ (2. Kirim Notifikasi "Lunas" ke domain wisuda.domainanda.com)
[Pintu Cloudflare]
           │
           ▼ (3. Diteruskan ke Backend VPS)
[Backend di VPS] ──> Update Database: Status = 'PAID' ✅
```

---

### 📍 ALUR 3: Admin Upload Ratusan Foto Wisuda (Jalur Super Cepat di Studio)

```text
[Laptop Admin di Studio]
           │
           ▼ (1. Upload 500 Foto via Jaringan LAN / IP Lokal 192.168.x.x)
[Server 1: Lokal Studio Anda]
           │
           ▼ (2. Direct-to-Drive Stream: Langsung tembak Google Drive)
[Google Drive Studio (Folder Staging / Klien)]

*Catatan: 100% foto TIDAK transit di VPS dan TIDAK lewat Cloudflare, sehingga bebas kuota & super cepat.
```

---

### 📍 ALUR 4: Sinkronisasi Database Real-Time (Litestream Delta Stream)

```text
[Transaksi Baru di VPS]
           │
           ▼ (1. Ditulis ke Database VPS)
[Database SQLite VPS]
           │
           ▼ (2. Litestream otomatis membaca selisih data baru ~2 KB)
[Litestream di VPS] ─────── Encrypted Stream (Internet) ───────> [Litestream di Lokal]
                                                                        │
                                                                        ▼ (3. Gabungkan data)
                                                             [Database SQLite Lokal]

*Hasil: Data di komputer studio Anda otomatis bertambah dalam waktu < 1 detik!
```

---

### 📍 ALUR 5: Kondisi Darurat / Failover (Jika VPS Mati / Perbaikan)

```text
[Klien di HP / Laptop]
           │
           ▼ (1. Akses wisuda.domainanda.com)
[Pintu Cloudflare]
           │
           ├───❌ (Server VPS Mati / Tidak Merespon)
           │
           ▼ (2. ⚡ OTOMATIS DIALIHKAN DALAM 1 DETIK KE JALUR CADANGAN)
[Cloudflare Tunnel]
           │
           ▼ (3. Diterima oleh Komputer Studio)
[Server 1: Lokal Studio Anda] ──> Website tetap hidup normal tanpa gangguan! ✅
```

---

## 3. Rincian Peran Masing-Masing Komponen

### A. Cloudflare (The Intelligent Gateway)
* **Domain & SSL Otomatis:** Mengelola sertifikat SSL/TLS enkripsi kelas enterprise secara cuma-cuma.
* **Edge Caching:** Meng-cache halaman statis, thumbnail, logo, CSS, dan JS agar beban ke server berkurang drastis dan kecepatan akses klien menjadi instan.
* **Health Monitor & Failover:** Memantau ketersediaan Server 2 (VPS). Jika VPS tidak merespon dalam 3 detik, Cloudflare otomatis mengalihkan 100% pengunjung ke Server 1 (Local Server) tanpa ada pesan error di layar pengguna.

### B. Server 2: Cloud VPS (Biznet GIO - Primary Public Node)
* **Tugas Utama:** Melayani transaksi publik, booking klien, dan pembayaran iPaymu 24 jam nonstop dengan *uptime* 99.9%.
* **IP Statis Terdaftar:** Menyediakan 1 IP Publik Statis resmi yang didaftarkan pada whitelist keamanan iPaymu.
* **Database Master:** Menjadi basis data utama yang mencatat setiap aksi transaksi klien.

### C. Server 1: Self-Hosted Studio (Local Standby & Power Node)
* **Tugas Utama:**
  1. Menjadi **Server Cadangan Darurat (Failover)** jika VPS mengalami kendala.
  2. Menjadi **Pusat Pengunggahan Foto Master** tim studio melalui jaringan lokal (LAN Gigabit) tanpa dibatasi kuota upload internet.
* **Database Replica:** Menerima *stream delta* perubahan data secara sub-detik sehingga datanya selalu kembar identik dengan VPS.

---

## 4. Mekanisme Sinkronisasi Database Real-Time (Litestream WAL Delta)

Untuk memastikan kedua server selalu memiliki data yang sinkron tanpa memboroskan kuota internet:

```
[Transaksi Baru di VPS] 
          │
          ▼
   (Write ke SQLite)
          │
          ▼ (Hanya membaca bagian selisih / Delta ~2 KB)
[Litestream Daemon di VPS] ─── Encrypted Stream ───> [Litestream Daemon di Lokal]
                                                              │
                                                              ▼
                                                   (Merge ke SQLite Lokal)
```

1. **Incremental Streaming:** Setiap ada transaksi baru di VPS (misal: Klien membayar DP), hanya file log berukuran **1 KB – 8 KB** yang dikirimkan ke server lokal.
2. **Latensi Sub-Detik (< 500 ms):** Data di server lokal studio ter-update seketika setelah klien menekan tombol bayar di HP mereka.
3. **Zero Data Loss:** Jika terjadi pemadaman listrik di studio atau VPS restart, Litestream otomatis melanjutkan sinkronisasi dari titik *checkpoint* terakhir.

---

## 5. Analisis Biaya & Efisiensi (Cost-Benefit)

| Komponen | Spesifikasi | Estimasi Biaya / Bulan |
| :--- | :--- | :--- |
| **Cloudflare Edge** | Free Plan (DNS, CDN, SSL, Tunnel) | **Rp 0** (Gratis) |
| **Server 2 (Cloud VPS)** | Biznet GIO NEO Lite (1-2 vCPU, 2 GB RAM, 60 GB SSD, 1 IP Statis) | **Rp 80.000 – Rp 109.000** |
| **Server 1 (Local Studio)** | Komputer PC / Mini PC Studio yang sudah ada | **Rp 0** (Memanfaatkan aset studio) |
| **Sistem Sinkronisasi** | Litestream (Open Source) | **Rp 0** (Gratis) |
| **Penyimpanan Foto Master** | Google Drive API (Workspace Studio) | Biaya Google Workspace eksisting |
| **TOTAL ESTIMASI BIAYA INFRASTRUKTUR** | **Multi-Server High Availability Kelas Enterprise** | **± Rp 80.000 – Rp 109.000 / Bulan** |

---

## 6. Keunggulan Arsitektur Ini

1. **Ketahanan Tingkat Tinggi (*Zero Downtime*):** Tidak ada *single point of failure*. Jika salah satu server mati, sistem tetap berjalan normal.
2. **Kepatuhan iPaymu 100% Terpenuhi:** Menggunakan IP publik statis resmi dari VPS Biznet di data center Indonesia.
3. **Kecepatan Upload Foto Maksimal:** Tim studio tidak perlu mengunggah foto master melalui internet publik yang lambat; cukup via jaringan LAN lokal ke server studio, dan biarkan server lokal yang melakukan *direct stream* ke Google Drive.
4. **Data Selalu Aman di Tangan Pemilik:** Anda selalu memiliki salinan fisik seluruh database transaksi di komputer studio Anda secara *offline* & *real-time*.

---

## 7. Tahapan Implementasi (Action Plan)

1. **Tahap 1: Setup VPS Biznet GIO**
   * Deploy Ubuntu Server 22.04 LTS.
   * Konfigurasi Node.js, PM2, dan Nginx Reverse Proxy.
   * Daftarkan IP Publik VPS ke menu *IP Terdaftar* di Dashboard iPaymu.
2. **Tahap 2: Setup Database Mirroring (Litestream)**
   * Pasang service Litestream di VPS dan Server Lokal.
   * Uji coba transaksi di VPS dan pastikan data muncul seketika di database lokal.
3. **Tahap 3: Konfigurasi Cloudflare Routing**
   * Arahkan domain utama `wisuda.domainanda.com` ke IP VPS Biznet.
   * Siapkan konfigurasi fallback Cloudflare Tunnel ke Server Lokal.
4. **Tahap 4: Pengujian Failover & Pembayaran Nyata**
   * Uji coba simulasi matikan VPS: pastikan sistem otomatis berpindah ke server lokal.
   * Uji coba transaksi pembayaran iPaymu di mode Production.
