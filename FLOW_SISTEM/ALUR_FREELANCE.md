# Blueprint Spesifikasi Teknikal & Alur Kerja Sistem Freelance Studio (Fotografer & Tim Lapangan)

> [!NOTE]
> **Wiki System Flow Hub**: [🗺️ Master Flow System](./MASTER_FLOW.md) | **Freelance Overview** | [Freelance Tahap 1: Onboarding](./FREELANCE_TAHAP1_list_freelance.md) | [Freelance Tahap 2: Portal HP](./FREELANCE_TAHAP2_portal_freelance.md) | [Freelance Tahap 3: Payroll](./FREELANCE_TAHAP3_payroll_freelance.md)

Dokumen ini merupakan panduan spesifikasi arsitektur teknis dan alur kerja (*workflow*) resmi untuk **Sistem Pengelolaan Freelance / Fotografer Studio (Pendaftaran, Kode Akses, Penugasan Job, Eksekusi Pemotretan, & Payout Honorarium)**.

---

## 🏛️ 1. Tahapan Utama Alur Kerja Sistem Freelance

```text
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ TAHAP A: ONBOARDING & INPUT FREELANCE BARU (2 JALUR INPUT)                       │
 │ • Jalur 1: Pendaftaran Mandiri via Form Public (Status: pending_approval)        │
 │ • Jalur 2: Tambah Manual oleh Admin di Admin Panel (Status: active)              │
 └──────────────────────────────────────┬───────────────────────────────────────────┘
                                        │
                                        ▼
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ TAHAP B: VERIFIKASI ADMIN & PENERBITAN KODE AKSES UNIK (Access Code)            │
 │ • Admin menyetujui Pendaftaran Mandiri ──► System Generate Kode Akses Unik      │
 │ • Admin klik [ 💬 Kirim Kode Akses WA ] via Direct Link api.whatsapp.com        │
 └──────────────────────────────────────┬───────────────────────────────────────────┘
                                        │
                                        ▼
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ TAHAP C: PENUGASAN JOB & CRON REMINDER (H-3 & H-1)                              │
 │ • Admin menugaskan FG di Sidetab CLIENT ──► Status: Ready to Shooting           │
 │ • Admin kirim notifikasi penugasan via Direct WA Link (api.whatsapp.com)        │
 │ • Cron Worker Jalankan Reminder H-3 & H-1 (Kontak WA Client Terbuka saat H-1)    │
 └──────────────────────────────────────┬───────────────────────────────────────────┘
                                        │
                                        ▼
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ TAHAP D: EKSEKUSI HARI PEMOTRETAN (Shooting Day & Zero Upload Rule)              │
 │ • FG membuka Portal HP: Cek Teks Lokasi Pemotretan & PDF Moodboard Pose          │
 │ • Zero Upload FG: FG HANYA serahkan SD Card/File ke Admin (Tanpa Upload Drive)   │
 │ • Selesai Pemotretan Fleksibel (3 Pintu): FG Klik / Admin Klik / Auto Cron +30m  │
 │ • Job otomatis BERPINDAH ke Tab [ 📸 Selesai Sesi Pemotretan ] di Portal HP FG  │
 │ • FG klik tombol [ 💳 Request Payment ] ──► Buka WA Direct Admin penagihan honor │
 └──────────────────────────────────────┬───────────────────────────────────────────┘
                                        │
                                        ▼
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ TAHAP E: ALUR PELUNASAN (GATE 2) & REKAP HONORARIUM                              │
 │ • Sesi Selesai (is_session_done = 1) ──► Tetap di Sidetab Client (Menunggu DP)   │
 │ • Client Upload Pelunasan di tracking.html ──► Admin Verifikasi ──► Lulus Gate 2 │
 │ • Rekap Honorarium FG (fg_fee) tercatat di Portal Freelance (Status: Unpaid)     │
 │ • Admin mentransfer Honor ──► Status berubah [ 🟢 Honor Lunas Ditransfer ]        │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📥 2. Detail Rincian Tahap A: Onboarding 2 Jalur Input Freelance Baru

### 2.1. Jalur 1: Pendaftaran Mandiri via Form Public (`freelance-register.html`)
- **Pintu Masuk**: Calon Freelancer mendaftar mandiri via form publik di internet.
- **Form Parameter yang Diisi Calon Freelancer**:
  1. **Nama Lengkap** (`name`)
  2. **Nomor WhatsApp Active** (`phone`)
  3. **Kota Domisili / Base Operasional** (`city`)
  4. **Spesialisasi Role** (`role`: *📸 Fotografer / 🎥 Videografer / ✂️ Editor*) — *Pemotretan wisuda 100% menggunakan 1 FG tunggal saja (tanpa FG 2 / tanpa Drone).*

  5. **Daftar Alat / Equipment Gear List** (`gear_list`: *Kamera, Lensa, Lighting, dll.*)
  6. **Link Portofolio Karya** (`portfolio_url`: *Drive / Instagram / Website*)
- **Status Awal**: **`pending_approval`** (Belum bisa login, menunggu verifikasi Admin).

### 2.2. Jalur 2: Tambah Manual oleh Admin di Admin Panel (`FreelancersView.vue`)
- **Pintu Masuk**: Admin menambah tim freelance internal secara langsung di Admin Panel.
- **Form Parameter yang Diisi Admin**:
  1. **Nama Lengkap** (`name`)
  2. **Nomor WhatsApp** (`phone`)
  3. **Kota Domisili** (`city`)
  4. **Spesialisasi Role** (`role`)
  5. **Besaran Tarif Standar Honor** (`default_fee`)
  6. **Kode Akses Unik Custom / Auto-Generate** (`access_code`)
- **Status Awal**: **`active`** (Langsung aktif dan siap ditugaskan).

---

## 🔄 3. Diagram Alur Kerja Visual Tahap A (Onboarding 2 Jalur Input)

```mermaid
flowchart TD
    classDef startEnd fill:#1A1A2E,stroke:#C59B63,stroke-width:2px,color:#FFF;
    classDef process fill:#FAF9F6,stroke:#C59B63,stroke-width:1px,color:#1A1A2E;
    classDef decision fill:#FFF0E8,stroke:#D94A3D,stroke-width:2px,color:#2D1B14;
    classDef subStage fill:#EBF5FF,stroke:#1E40AF,stroke-width:1.5px,color:#1E40AF;
    classDef gate fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#2E7D32;

    %% JALUR 1: PENDAFTARAN MANDIRI
    Jalur1["📝 JALUR 1: Pendaftaran Mandiri Public\n(freelance-register.html)\n• Isi Nama, WA, Domisili, Role, Gear List, & Link Portofolio"]:::startEnd --> PendingState["⏳ Status Awal: 'pending_approval'\n(Menunggu Verifikasi & Persetujuan Admin)"]:::decision

    PendingState --> AdminReview{"Admin Meninjau Portofolio & Gear List"}:::decision
    AdminReview -->|Approve / Disetujui| GenerateCode["✨ Admin Klik 'Setujui & Terbitkan Kode Akses':\n• Status berubah menjadi 'active'\n• System Generate Kode Akses Unik\n• Admin klik tombol Direct WA (api.whatsapp.com) untuk kirim kode ke HP FG"]:::gate
    AdminReview -->|Reject / Ditolak| RejectState["❌ Status: 'rejected' (TIDAK DAPAT KODE AKSES)"]:::process

    %% JALUR 2: TAMBAH MANUAL ADMIN
    Jalur2["➕ JALUR 2: Tambah Manual Admin Panel\n(FreelancersView.vue)\n• Admin Isi Nama, WA, Role, Tarif Standard, & Kode Akses"]:::startEnd --> DirectActive["🟢 Status Langsung: 'active'\n(Siap langsung ditugaskan pada Booking Client)"]:::gate

    %% BOTH PATHS LEAD TO PORTAL LOGIN
    GenerateCode --> PortalLogin["🔐 FREELANCER PORTAL LOGIN (freelance.html):\nLogin menggunakan Nomor WA + Kode Akses Unik"]:::subStage
    DirectActive --> PortalLogin
```

---

## 🗄️ 4. Ringkasan Status State Freelancer (Tabel `freelancers`)

| Status State | Sumber Input | Akses Login Portal | Status Kesiapan Job |
| :--- | :--- | :--- | :--- |
| **`pending_approval`** | Jalur 1 (Form Mandiri) | 🔴 Ditolak (Belum Disetujui) | Belum Bisa Ditugaskan |
| **`rejected`** | Jalur 1 (Ditolak Admin) | 🔴 Ditolak | Tidak Aktif |
| **`active`** | Jalur 1 (Disetujui) / Jalur 2 (Direct Admin) | 🟢 Diizinkan (WA + Access Code) | **Siap Ditugaskan ke Booking** |
| **`inactive`** | Non-Aktifkan oleh Admin | 🔴 Dibatasi Sementara | Ditinggalkan |

---

*Dokumen cetak biru spesifikasi tahap onboarding sistem Freelance ini resmi tersimpan sebagai panduan arsitektur utama.*
