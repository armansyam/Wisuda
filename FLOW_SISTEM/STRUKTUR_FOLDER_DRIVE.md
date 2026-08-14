# Cetak Biru Spesifikasi Struktur & Penamaan Folder Google Drive Studio

> [!NOTE]
> **Wiki System Flow Hub**: [🗺️ Master Flow System](./MASTER_FLOW.md) | [Tahap 4: Arsip & Retention](./TAHAP4_alur_arsip.md) | [Portofolio Studio](./ALUR_PORTOFOLIO.md) | **Struktur Folder Drive**

Dokumen ini merupakan panduan spesifikasi arsitektur resmi untuk **Struktur Hirarki, Standar Penamaan Folder, Alur Cloud-to-Cloud Copy Portofolio, serta Aturan Pembersihan (Cleanup Policy)** pada Google Drive Cloud Studio Fotografi Wisuda.

> [!IMPORTANT]
> **Prinsip Utama Arsitektur Drive Studio:**
> * **2 Root Folder Utama (Permanen Seumur Hidup)**: Studio memiliki 2 Root Folder Utama yang **TIDAK PERNAH DIHAPUS**.
> * **Struktur Terpisah (Isolasi Portofolio)**: Folder Portofolio dibuat terpisah di Root Portofolio via *Cloud-to-Cloud Copy*, bukan sekadar subfolder sementara.
> * **Pembersihan Spesifik Client**: Pembersihan otomatis saat *expired retention* **HANYA MENGHAPUS FOLDER SPESIFIK CLIENT TERSEBUT**, tanpa menyentuh Root Folder Studio atau Folder Portofolio.

---

## 🏛️ 1. Hirarki Arsitektur Google Drive Studio (2 Root Folder Utama)

```text
 🎓 GOOGLE DRIVE CLOUD STUDIO
 ════════════════════════════════════════════════════════════════════════════════════

 ├── 📁 1. FOLDER MASTER UTAMA CLIENT (Root 1 - PERMANEN STUDIO)
 │      │
 │      ├── 📁 MASTER CLIENT (BudiSantoso_UI_15Okt2026) ──► [ DIHAPUS SAAT EXPIRED CLEANUP ]
 │      │      ├── 📁 JPG/           (Foto Mentah untuk Seleksi)
 │      │      ├── 📁 Highlight/     (Foto Editan Pilihan)
 │      │      ├── 📁 Final Editing/ (Seluruh Berkas Foto Final)
 │      │      └── 📁 Moodboard/     (Referensi Pose & PDF Brief)
 │      │
 │      ├── 📁 MASTER CLIENT (SitiRahma_UGM_20Okt2026) ──► [ DIHAPUS SAAT EXPIRED CLEANUP ]
 │      │      ├── 📁 JPG/
 │      │      ├── 📁 Highlight/
 │      │      ├── 📁 Final Editing/
 │      │      └── 📁 Moodboard/
 │      └── ...
 │
 └── 📁 2. MASTER PORTOFOLIO (Root 2 - Folder Utama Portofolio Studio)
        │
        ├── 📁 BudiSantoso_UI_2026/ ──► [ AKTIF PERMANEN SEUMUR HIDUP ]
        │      └── 🖼️ Berkas Foto Highlight (Hasil Cloud-to-Cloud Copy)
        │
        ├── 📁 SitiRahma_UGM_2026/  ──► [ AKTIF PERMANEN SEUMUR HIDUP ]
        │      └── 🖼️ Berkas Foto Highlight (Hasil Cloud-to-Cloud Copy)
        └── ...

```

---

## 📌 2. Standar Penamaan & Peranan Folder

### 2.1. Root Level 1: FOLDER MASTER UTAMA CLIENT
- **ID Variabel Sistem**: `GOOGLE_DRIVE_ROOT_CLIENT_ID`
- **Sifat Folder**: **PERMANEN SEUMUR HIDUP** (TIDAK PERNAH DIHAPUS).
- **Peranan**: Folder pusat induk tempat menampung seluruh folder transaksi client wisuda yang masuk dari Gate 1.

#### Subfolder Spesifik Client: `MASTER CLIENT ({NamaClient}_{Univ}_{Tanggal})`
- **ID Variabel Sistem**: `drive_parent_url` / `drive_folder_id`
- **Contoh Penamaan**: `MASTER CLIENT (BudiSantoso_UI_15Okt2026)`
- **Waktu Dibuat**: Otomatis di background saat verifikasi DP Gate 1 (`dp_status = 'paid'`).
- **4 Subfolder Didalamnya**:
  1. `📁 JPG/` (`staging_drive_url`) $\rightarrow$ Tempat Admin upload foto mentah untuk dipilih Klien di Galeri Seleksi.
  2. `📁 Highlight/` (`highlight_drive_url`) $\rightarrow$ Tempat Admin upload 3-5 foto editan terbaik.
  3. `📁 Final Editing/` (`download_url`) $\rightarrow$ Tempat Admin upload seluruh foto editan lengkap.
  4. `📁 Moodboard/` (`moodboard_drive_url`) $\rightarrow$ Tempat menyimpan file moodboard pose & PDF briefing sheet FG.
- **Sifat Pembersihan**: **DIHAPUS PERMANEN** saat masa expired retention cleanup tercapai (setelah notifikasi WA H-7 & H-3).

---

### 2.2. Root Level 2: MASTER PORTOFOLIO (Folder Utama Portofolio Studio)
- **ID Variabel Sistem**: `GOOGLE_DRIVE_ROOT_PORTFOLIO_ID`
- **Sifat Folder**: **PERMANEN SEUMUR HIDUP** (TIDAK PERNAH DIHAPUS).
- **Peranan**: Folder induk utama tempat menampung seluruh subfolder portofolio karya studio.

#### Subfolder Spesifik Portofolio: `{NamaClient}_{Universitas}_{Tahun}`
- **ID Variabel Sistem**: `portfolio_url` / `portfolio_drive_id`
- **Contoh Penamaan**: `BudiSantoso_UI_2026`
- **Mekanisme Salin**: **Cloud-to-Cloud Copy** otomatis dari folder `Highlight/` client saat foto di-upload di Tahap 3.
- **Sifat Folder**: **100% PERMANEN SEJAK AWAL & TIDAK PERNAH DIHAPUS**, selama item karya tersebut terdaftar/aktif di Sidetab Portofolio Admin (`PortfolioView.vue`).



---

## 🔄 3. Diagram Alur Cloud-to-Cloud Copy & Eksekusi Cleanup

```mermaid
flowchart TD
    classDef startEnd fill:#1A1A2E,stroke:#C59B63,stroke-width:2px,color:#FFF;
    classDef process fill:#FAF9F6,stroke:#C59B63,stroke-width:1px,color:#1A1A2E;
    classDef decision fill:#FFF0E8,stroke:#D94A3D,stroke-width:2px,color:#2D1B14;
    classDef subStage fill:#EBF5FF,stroke:#1E40AF,stroke-width:1.5px,color:#1E40AF;
    classDef gate fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#2E7D32;

    %% STAGE 1: GATE 1 DP CREATION
    Gate1["✅ VERIFIKASI DP GATE 1"]:::startEnd --> CreateClientFolder["📁 Buat Folder Spesifik Client di Root 1:\n'MASTER CLIENT (NamaClient_Univ_Tanggal)'\n(Lengkap 4 Subfolder: JPG, Highlight, Final Editing, Moodboard)"]:::process

    %% STAGE 2: PORTFOLIO COPY
    CreateClientFolder --> ConsentCheck{"Apakah Klien Mengizinkan\nPublish Portofolio?\n(is_portfolio_allowed = 1)"}:::decision

    ConsentCheck -->|Ya (Disetujui)| PortfolioCopy["✨ Cloud-to-Cloud Copy:\nSalin Foto dari Subfolder 'Highlight/' Client ke:\nRoot 2 'MASTER PORTOFOLIO (NamaClient_Univ_Highlight)'"]:::gate
    ConsentCheck -->|Tidak (Ditolak)| SkipPortfolio["🔒 Privat Only (Tidak Di-copy ke Root 2)"]:::process

    %% STAGE 3: CLEANUP EXECUTION
    PortfolioCopy --> CronCleanup{"Apakah Masa Retention Expired?\n(Notifikasi WA H-7 & H-3 Selesai)"}:::decision
    SkipPortfolio --> CronCleanup

    CronCleanup -->|Masa Simpan Selesai| ExecuteDelete["🔴 EKSEKUSI PEMBERSIHAN CRON:\nHANYA MENGHAPUS 'MASTER CLIENT (NamaClient_Univ_Tanggal)' dari Root 1"]:::startEnd

    ExecuteDelete --> FinalState["✅ HASIL AKHIR PEMBERSIHAN:\n1. Storage Root 1 Client Bebas 100%\n2. Folder 'MASTER PORTOFOLIO' di Root 2 TETAP AKTIF PERMANEN"]:::gate
```

---

## 🗄️ 4. Ringkasan Status Storage & Pembersihan

| Komponen Folder Drive | Lokasi Root Parent | Status Pembersihan saat Expired | Keterangan Akses Permanen |
| :--- | :--- | :--- | :--- |
| `FOLDER MASTER UTAMA CLIENT` | Drive Root 1 | **TIDAK PERNAH DIHAPUS** | Permanent Studio Storage Root 1. |
| `MASTER CLIENT (NamaClient_Univ_Tanggal)` | Di dalam Root 1 | **DIHAPUS TOTAL PERMANEN** | Dihapus setelah Notifikasi WA H-7 & H-3. |
| `FOLDER MASTER UTAMA PORTOFOLIO` | Drive Root 2 | **TIDAK PERNAH DIHAPUS** | Permanent Studio Storage Root 2. |
| `MASTER PORTOFOLIO (NamaClient_Univ_Highlight)` | Di dalam Root 2 | **TIDAK PERNAH DIHAPUS** | **Aktif Permanen Seumur Hidup** (Terpisah dari Client). |

---

*Dokumen cetak biru spesifikasi struktur folder Google Drive ini resmi terkunci dan menjadi panduan arsitektur utama.*
