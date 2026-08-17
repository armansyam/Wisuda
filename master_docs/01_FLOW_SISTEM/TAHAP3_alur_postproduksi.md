# Blueprint Spesifikasi Teknikal & Alur Kerja Post-Produksi & Portofolio (Tahap 3)

> [!NOTE]
> **Wiki System Flow Hub**: [🗺️ Master Flow System](./MASTER_FLOW.md) | [Tahap 1: Inquiry](./TAHAP1_alur_inqury.md) | [Tahap 2: Client Deal](./TAHAP2_alur_client.md) | **Tahap 3: Post-Produksi** | [Tahap 4: Arsip](./TAHAP4_alur_arsip.md) | [Portofolio Studio](./ALUR_PORTOFOLIO.md)

Dokumen ini merupakan panduan spesifikasi arsitektur teknis dan alur kerja (*workflow*) resmi untuk **Tahap 3: Pengolahan Foto di Sidetab Post-Produksi / Deliverables, Galeri Seleksi Foto Klien, Upload File Editan Final & Highlight Portofolio Master Studio, hingga Konfirmasi Penerimaan & Status Completed**.

> [!IMPORTANT]
> **Prinsip Operasional Post-Produksi (Terpusat di Admin Studio):**
> * **Direct Stream Upload Admin**: Seluruh proses pengunggahan foto mentah (JPG), foto highlight, dan foto editan final dilakukan **100% OLEH ADMIN STUDIO** langsung ke subfolder Google Drive Klien (Zero Local Server Disk Transit).
> * **Fotografer (FG) Zero Upload**: FG tidak mengunggah file foto apapun.
> * **Otomasi Portofolio Master Studio**: Foto yang diunggah Admin ke subfolder `Highlight/` Drive secara otomatis ter-import ke Katalog Portofolio Master Studio (`portofolio.html`).

---

## 🏛️ 1. Rincian 6 Langkah Urutan Operasional Tahap 3 (Post-Produksi)

Tahap 3 terbagi menjadi **6 Langkah Urutan Berurutan**:

| No | Nama Langkah | Deskripsi Operasional & Urutan Sistem |
| :---: | :--- | :--- |
| **1** | **Terima Berkas Foto (Konfirmasi Admin)** | Admin menerima & mengonfirmasi berkas foto hasil shooting dari kamera (Lulus Gate 2: `is_session_done = 1` & `balance_status = 'paid'`). *(Status Booking: `post_production`)*. |
| **2** | **Upload Foto Mentah (JPG)** | Admin mengunggah berkas foto mentah JPG ke subfolder `JPG/` Drive Klien (`staging_drive_url`), lalu mengaktifkan Galeri Seleksi Klien. |
| **3** | **Seleksi Foto Klien di Galeri Seleksi** | Klien membuka Galeri Seleksi di tracking link (`tracking.html`) dan memilih foto terbaik sesuai kuota paket (`max_selected_photos`). Klien men-submit pilihan foto agar Admin/Editor mulai memproses editan. |

| **4** | **Upload Highlight (Master Portofolio)** | Admin mengunggah 3-5 foto editan terbaik ke subfolder `Highlight/` Drive (`highlight_drive_url`). Berkas di `Highlight/` **otomatis ter-import ke Portofolio Master Studio**. |
| **5** | **Upload Final Editing** | Admin mengunggah seluruh berkas foto editan lengkap yang sudah dirapi/retouch ke subfolder `Final Editing/` Drive (`download_url`). |
| **6** | **Tunggu Konfirmasi Client & Completed** | Klien mengecek & mengunduh foto final via `tracking.html`. Klien mengonfirmasi penerimaan $\rightarrow$ Admin menandai booking **`completed`** (Selesai 100%). |

---

## 🔄 2. Diagram Alur Kerja Visual Tahap 3 (Post-Production Flowchart)

```text

               [LULUS GATE 2: STATUS BOOKING = 'post_production']
                                     │
                                     ▼
                  [LANGKAH 1: TERIMA BERKAS FOTO KAMERA]
                 Admin Terima & Cek Berkas Foto dari Kamera
                                     │
                                     ▼
                [LANGKAH 2: UPLOAD FOTO MENTAH (JPG) OLEH ADMIN]
               Admin Upload File JPG ke Subfolder 📁 JPG/ Drive
                     Admin Klik "Aktifkan Galeri Seleksi"
                                     │
                                     ▼
            [LANGKAH 3: PROSES SELEKSI FOTO MANDIRI OLEH KLIEN]
           • Klien Buka Galeri Seleksi di tracking.html
           • Klien Pilih Foto Sesuai Kuota (max_selected_photos)
           • Klien Klik "Submit Pilihan Foto" ke Admin/Editor
                                     │
                                     ▼
                [LANGKAH 4: UPLOAD HIGHLIGHT PORTOFOLIO]
            Admin Upload 3-5 Foto Pilihan ke 📁 Highlight/ Drive
                                     │
                                     ▼
                      [Otomasi Portofolio Master Studio]
             Auto-Import Foto Highlight ke Katalog Portofolio Master
                             (portofolio.html)
                                     │
                                     ▼
                [LANGKAH 5: UPLOAD FOTO FINAL EDITING]
         Admin Upload Seluruh File Editan ke 📁 Final Editing/ Drive
                                     │
                                     ▼
            [LANGKAH 6: KONFIRMASI TIMELINE & TAMPILAN CLOSING STATEMENT]
           • Admin Upload Editan Final ke 📁 Final Editing/ Drive
           • Klien Klik "✓ Konfirmasi Foto Final Diterima & Selesai"
             di Paling Bawah Timeline (atau Auto-Approve 48j)
                                     │
                                     ▼
                     [CLOSING TIMELINE & STATUS COMPLETED]
           Timeline Ditutup → Bertransisi ke Tampilan Halaman
           Closing Statement Selesai (Rangkuman Transaksi Lengkap,
           Resi Lunas 100%, Button Direct Link Master Drive, & Rating)
```

```mermaid
flowchart TD
    classDef startEnd fill:#1A1A2E,stroke:#C59B63,stroke-width:2px,color:#FFF;
    classDef process fill:#FAF9F6,stroke:#C59B63,stroke-width:1px,color:#1A1A2E;
    classDef decision fill:#FFF0E8,stroke:#D94A3D,stroke-width:2px,color:#2D1B14;
    classDef subStage fill:#EBF5FF,stroke:#1E40AF,stroke-width:1.5px,color:#1E40AF;
    classDef gate fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#2E7D32;

    %% ENTRY & LANGKAH 1
    Gate2["✅ LULUS GATE 2: status = 'post_production'"]:::startEnd --> Step1["📥 LANGKAH 1: TERIMA BERKAS FOTO KAMERA\nAdmin Terima & Cek Berkas Foto dari Kamera"]:::process

    %% LANGKAH 2
    Step1 --> Step2["📸 LANGKAH 2: UPLOAD FOTO MENTAH (JPG)\nDirect Stream Upload Admin ke Subfolder 📁 JPG/ Drive\nAdmin Klik 'Aktifkan Galeri Seleksi'"]:::subStage

    %% LANGKAH 3: PROSES SELEKSI FOTO KLIEN
    Step2 --> Step3["🎨 LANGKAH 3: PROSES SELEKSI FOTO MANDIRI OLEH KLIEN\n• Klien Buka Galeri Seleksi di tracking.html\n• Klien Pilih Foto Sesuai Kuota Paket (max_selected_photos)\n• Klien Klik 'Submit Pilihan Foto'"]:::subStage

    %% LANGKAH 4 & OTOMASI PORTOFOLIO MASTER
    Step3 --> Step4["✨ LANGKAH 4: UPLOAD HIGHLIGHT (MASTER PORTOFOLIO)\nAdmin Upload Foto Terbaik ke Subfolder 📁 Highlight/ Drive"]:::subStage
    Step4 --> CheckConsent{"Apakah Klien Mengizinkan\nPublish Portofolio?\n(is_portfolio_allowed)"}:::decision

    CheckConsent -->|Ya (Disetujui)| AutoPortfolio["🌟 OTOMASI PORTOFOLIO MASTER STUDIO:\nFoto Highlight Otomatis Ter-Import & Tampil di\nKatalog Portofolio Master Studio (portofolio.html)"]:::gate
    CheckConsent -->|Tidak (Ditolak)| PrivateHighlight["🔒 PRIVAT ONLY:\nFoto Highlight Disimpan Privat\n(Tidak Dipublikasikan ke Web Studio)"]:::process

    %% LANGKAH 5
    AutoPortfolio --> Step5["🖼️ LANGKAH 5: UPLOAD FOTO FINAL EDITING\nAdmin Upload Seluruh File Editan ke Subfolder 📁 Final Editing/ Drive"]:::subStage
    PrivateHighlight --> Step5

    %% LANGKAH 6: KONFIRMASI TIMELINE & CLOSING STATEMENT
    Step5 --> Step6["📦 LANGKAH 6: KONFIRMASI TIMELINE & CLOSING TIMELINE\n• Klien Klik '✓ Konfirmasi Foto Final Diterima' di Paling Bawah Timeline\n• Progres Terkonfirmasi 100% → Timeline Ditutup (Closing Timeline)\n• Status Booking = 'completed' (Selesai 100%)"]:::process

    Step6 --> ClosingPage["🌸 PENAYANGAN HALAMAN CLOSING STATEMENT:\nHalaman tracking.html Bertransisi Menampilkan:\n• Status: ✅ COMPLETED / TRANSAKSI SELESAI 100%\n• Ucapan Terima Kasih Studio\n• Rangkuman Data Lengkap & Resi Status 🟢 LUNAS 100%\n• 1 Button Direct Link Master Drive Client (drive_parent_url)\n• Form Konfirmasi Izin Publish Portofolio (is_portfolio_allowed)\n• Form Testimoni & Rating Bintang 5"]:::startEnd
```






---

## 📌 3. Detail Operasional 6 Langkah Tahap 3

### 3.1. Langkah 1: Terima Berkas Foto & Konfirmasi Admin
- **Pintu Masuk**: Booking lulus Gate 2 (`is_session_done = 1` DAN `balance_status = 'paid'`). Status booking bertransisi menjadi **`post_production`**.
- **Tindakan Admin**: Admin menerima berkas foto kamera dari lapangan dan memeriksa keutuhan file foto.

### 3.2. Langkah 2: Upload Foto Mentah (JPG) & Aktifkan Galeri Seleksi
- **Upload Direct Stream**: Admin mengunggah berkas foto mentah berformat JPG/PNG/WEBP/HEIC langsung ke subfolder `JPG/` Google Drive Klien (`staging_drive_url`).
- **Aktifkan Galeri**: Admin mengeklik tombol **`🚀 Aktifkan Galeri Seleksi`**. Status galeri seleksi berubah menjadi `ready`.

### 3.3. Langkah 3: Client Melakukan Seleksi Foto di Galeri Seleksi (`tracking.html`)
- **Notifikasi Klien**: Setelah Galeri Seleksi diaktifkan oleh Admin, Klien menerima notifikasi WA / pemberitahuan bahwa foto mentah (JPG) sudah siap dipilih.
- **Proses Seleksi di Galeri Seleksi (`tracking.html`)**:
  - Klien membuka link `tracking.html` $\rightarrow$ mengeklik **`🎨 Buka Galeri Seleksi Foto Wisuda`**.
  - Klien melihat seluruh foto mentah (JPG) di antarmuka galeri responsive interaktif.
- **Enforcement Kuota Maksimal (`max_selected_photos`)**:
  - Sistem membatasi jumlah foto yang dapat dipilih sesuai paket (misal: 10 foto).
  - Klien menandai foto favorit hingga batas kuota tercapai.
- **Submit Pilihan Foto**: Klien mengeklik **`✓ Submit Pilihan Foto`** $\rightarrow$ status seleksi berubah menjadi `submitted`. Editor Studio langsung menerima daftar nama file foto pilihan klien untuk masuk proses retouching / editing editan final.

### 3.4. Langkah 4: Upload Highlight & Konfirmasi Izin Publish Portofolio Master Studio
- **Upload Highlight oleh Admin**: Admin mengunggah 3-5 foto editan pilihan terbaik ke subfolder `Highlight/` Drive (`highlight_drive_url`).
- **Konfirmasi Izin Publish oleh Klien (`is_portfolio_allowed`)**:
  - Pada halaman `tracking.html` / Closing Statement, Klien memberikan **Konfirmasi Izin Publikasi Portofolio**:
    - **Jika Klien Mengizinkan (`is_portfolio_allowed = 1`)**: Backend secara otomatis meng-import & mempublikasikan URL foto dari subfolder `Highlight/` Drive ke **Katalog Portofolio Master Studio** (`portfolio_items` table) yang tampil di `portofolio.html`.
    - **Jika Klien Menolak (`is_portfolio_allowed = 0`)**: Foto di subfolder `Highlight/` disimpan secara privat dan **TIDAK DIPUBLIKASIKAN** ke katalog publik studio demi menjaga privasi klien.


### 3.5. Langkah 5: Upload Final Editing
- **Upload File Final**: Admin mengunggah seluruh berkas foto editan yang telah selesai di-retouch ke subfolder `Final Editing/` Drive (`download_url`).

### 3.6. Langkah 6: Konfirmasi Akhir Timeline & Penayangan Halaman Closing Statement (`completed`)

- **Kondisi Awal (Timeline Masih Aktif)**:
  Klien melihat timeline di `tracking.html` yang menampilkan link Master Drive Client (`drive_parent_url`). Di bagian paling bawah timeline, terdapat tombol utama:  
  **`✓ Konfirmasi Foto Final Diterima & Selesai`**.

- **Aksi Konfirmasi Klien (Closing Timeline)**:
  Begitu Klien mengeklik tombol konfirmasi tersebut (atau auto-approve 48 jam jika klien tidak merespon):
  1. **Progres Kerja Terkonfirmasi 100%**: Sistem mencatat bahwa hasil pekerjaan foto telah diterima dengan sempurna oleh klien.
  2. **Timeline Ditutup (Closing Timeline)**: Tampilan timeline alur kerja ditutup/di-archive.
  3. **Status Booking = `completed`** (Selesai 100%).

### 3.7. Mockup Tampilan Halaman Closing Statement (`tracking.html` Completed)

Ketika timeline ditutup (setelah Klien mengonfirmasi terima foto), tampilan antarmuka `tracking.html` secara otomatis berganti menjadi **Halaman Closing Statement**:

```text
 🎓 STUDIO FOTOGRAFI WISUDA - CLOSING STATEMENT & RESI SELESAI
 ════════════════════════════════════════════════════════════════════════════════════

                      ✅ COMPLETED / TRANSAKSI SELESAI 100%
                "Momen Berharga Anda Telah Sempurna Abadi Bersama Kami"

 🌸 UCAPAN TERIMA KASIH:
 Terima kasih banyak Kak {client_name}! Selamat atas gelar dan kelulusan wisudanya.
 Suatu kehormatan bagi kami telah dipercaya mengabadikan momen istimewa Kakak.

 📋 RANGKUMAN DATA TRANSAKSI LENGKAP:
 ────────────────────────────────────────────────────────────────────────────────────
 • Kode Tracking    : TRK-2026-0812-99
 • Nama Wisudawan   : Budi Santoso
 • Nomor WhatsApp   : 0812-3456-7890
 • Tanggal Wisuda   : 15 Oktober 2026
 • Kampus & Lokasi  : Universitas Indonesia (Balairung UI Depok)
 • Fotografer       : Dimas Prasetyo (FG-01)
 • Paket Layanan    : Paket Wisuda Personal Premium
 • Total Pembayaran : Rp 750.000 (Terbilang: Tujuh Ratus Lima Puluh Ribu Rupiah)
 • Status Pembayaran: 🟢 LUNAS 100% (Resi Terverifikasi)
 ────────────────────────────────────────────────────────────────────────────────────

 📂 AKSES PERMANEN MASTER GOOGLE DRIVE ARSIP FOTO CLIENT:
 [ 📁 Buka Master Google Drive Foto Wisuda Saya (Wisuda_BudiSantoso_15Okt) ]
   📊 Total Ukuran Berkas Arsip: 2.4 GB | Total Foto: 145 Berkas Foto
   (Di dalam folder ini berisi subfolder JPG Mentah, Highlight, Final Editing, & Moodboard)

 📄 DOKUMEN TRANSAKSI:
 [ 🖨️ Cetak / Unduh Resi Invoice PDF Lunas 100% ]

 📸 KONFIRMASI IZIN PUBLIKASI PORTOFOLIO STUDIO:
 Apakah Kakak mengizinkan foto editan pilihan dipublikasikan di Web Portofolio Studio?
 [✔] YA, SAYA MENGIZINKAN (Foto Highlight Ter-Publish di Katalog Portofolio Master)
 [  ] TIDAK (Simpan Foto Secara Privat / Private Only)

 ⭐ FORM RATING & ULASAN KEBAHAGIAAN:
 Berikan Penilaian Pengalaman Anda:
 [ ★ ★ ★ ★ ★ ] (5 Bintang)
 Catatan Testimoni: [ Tulis ulasan Anda untuk studio kami... ]
 [ ✉️ Kirim Ulasan & Rating ]
```

### 3.8. Aturan Keamanan & Pengelolaan Testimoni / Rating (Admin Dynamic Control)

> [!IMPORTANT]
> **Kebijakan Keamanan Reputasi Studio (`PortfolioView.vue`):**
> 1. **Web Portofolio Publik (`portofolio.html`)**:
>    - Halaman portofolio publik **HANYA MENAMPILKAN RATING BINTANG SAJA** (misal: `★ 4.9 / 5.0`).
>    - Catatan teks testimoni **TIDAK PERNAH DITAYANGKAN OTOMATIS KE PUBLIK** demi keamanan & reputasi studio.
> 2. **Privasi Catatan Testimoni (Khusus Dibaca Admin)**:
>    - Klien tetap dapat menuliskan catatan ulasan/testimoni di halaman Closing Statement.
>    - Catatan testimoni teks tersebut **HANYA BISA DIBACA & DI-EDIT SECARA DINAMIS OLEH ADMIN** melalui Sidetab **Portofolio Admin Panel** (`PortfolioView.vue`).
> 3. **Kendali Penuh Admin**:
>    - Admin bebas menyunting, menyetujui, atau menyembunyikan testimoni jika ada masukan internal yang sifatnya privat.

---

## 🗄️ 4. Ringkasan Status State Khusus Tahap 3 (Tabel `bookings` & `deliverables`)

| Status State | Tampilan UI Admin | Keterangan Operasional |
| :--- | :--- | :--- |
| **`post_production`** | `🎬 Post-Produksi` | Booking berada di Tahap 3 Pasca-Produksi (Upload Mentah & Seleksi Foto Klien). |
| **`delivered`** | `📦 Foto Final Terkirim` | Admin telah mengunggah editan ke subfolder `Final Editing/` Drive. |
| **`completed`** | `✅ Transaksi Selesai` | Klien telah mengonfirmasi terima foto dan transaksi dinyatakan selesai 100%. |

---

*Dokumen blueprint spesifikasi alur Post-Produksi & Portofolio Tahap 3 ini resmi disajikan untuk didiskusikan.*
