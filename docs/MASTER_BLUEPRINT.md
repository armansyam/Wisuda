# 📋 MASTER BLUEPRINT — Wisuda Platform
## Dokumen Rekonstruksi & Arsitektur Utama v1.4.3

> Dokumen ini berisi **seluruh informasi arsitektur, visi sistem, peta proyek, dan spesifikasi produk** untuk platform manajemen bisnis studio foto wisuda end-to-end.  
> Versi: 1.4.3 | Diperbarui: 2026-07-29 | Author: Antigravity AI & Arman Syam

---

## 1. VISI SISTEM & DIFFERENSIASI PRODUK

**Wisuda Platform** adalah platform manajemen operasional end-to-end untuk bisnis agensi fotografi wisuda (*graduation photography*). Platform ini menghubungkan wisudawan (klien) dengan fotografer freelance (FG) melalui kontrol terpusat oleh Admin/Operator:
- Penerimaan inquiry dari calon client via web public dengan **Validasi Kapasitas Harian Pemesanan**
- Manajemen booking & verifikasi pembayaran DP/pelunasan manual via **Multi-Bank Transfer**
- Integrasi Google Drive **Smart Hybrid & Strict 3-Step OAuth Wizard** dengan Probe Verification Test otomatis
- Penugasan fotografer freelance (FG) berbasis kalender, slot waktu, dan persetujuan usulan tarif
- Otomasi pembuatan folder Google Drive saat DP terverifikasi (OAuth Gmail Studio / Service Account Bot)
- Galeri seleksi foto *zero-storage Touch Lightbox Swipe* untuk client dengan disk caching WebP
- Delivery hasil edit & tracking progres via token unik WA (tanpa PIN rumit)
- Payout fee fotografer + generator slip PDF otomatis
- Portofolio publik auto-import dari Google Drive via Sharp WebP Engine
- Dukungan **Multibahasa (Default EN | ID Toggle)**, **Neutral Light Theme (`#FAF9F6`)**, dan **Developer Watermark Toggle** via `.env`.

### Keunggulan Utama
- **Model Agensi Terkontrol**: Klien memilih paket harga tetap; Admin menentukan assignment FG sesuai lokasi, rating, dan jadwal.
- **Strict 3-Step Google OAuth Wizard**: Pengisian Client ID & Secret dilindungi probe verification test otomatis ke API Google (`invalid_client` ditolak sebelum disimpan). Step 2 (Tautkan Drive) dan Step 3 (Master Folder) terikat secara ketat.
- **Output Digital Only**: Seluruh penyerahan hasil foto menggunakan berkas digital resolusi tinggi via Google Drive (tanpa media cetak fisik/album), mempercepat distribusi & menghemat biaya operasional.
- **Standar Tarif Rp 500.000/Jam**: Penetapan harga paket premium terpola berdasarkan durasi pemotretan jam (mulai Rp 500k/1 jam hingga Rp 1.5M/3 jam).
- **Tanpa Payment Gateway Fee**: Pembayaran menggunakan sistem transfer langsung dengan verifikasi manual admin yang cepat dan opsi multi-rekening bank yang dapat dikelola dengan konfirmasi aman.
- **Performa & Responsivitas Tinggi**: Database SQLite WAL dengan 16 B-Tree Indexes (< 1ms query time) dan aset gambar WebP terkompresi Sharp Engine (~40KB).
- **Desain Touch-Friendly & International Standards**: Halaman seleksi foto Touch-Lightbox Swipe di HP/Tablet, halaman tracking tanpa PIN, serta switcher bahasa EN | ID.
- **Otomatisasi Maintenance & Retention**: Pembersihan data proses 30 hari & bukti transfer 90 hari secara otomatis menjaga server tetap hemat ruang disk.
- **Proteksi Multi-Timezone**: Server locked ke timezone WITA (`Asia/Makassar`) untuk kesiapan operasional nasional.

---

## 2. TECH STACK

### Backend
| Komponen | Teknologi | Versi | Fungsi Utama |
|---|---|---|---|
| Runtime | Node.js | v20.x LTS | Server Runtime |
| Framework | Express.js | ^5.2.1 | REST API Engine |
| Database | SQLite (better-sqlite3) | ^12.11.1 | Database Engine WAL Mode |
| Session Store | connect-sqlite3 | ^0.9.16 | Admin Session Storage |
| Auth | express-session + bcrypt | ^1.19.0 / ^6.0.0 | Authentication & Password Hashing |
| Validation | express-validator | ^7.3.2 | Request Payload Input Sanitization |
| File Upload | express-fileupload + multer | ^1.5.2 / ^2.2.0 | Multipart File Handlers |
| Rate Limiting | express-rate-limit | ^7.5.1 | Anti-Bruteforce & API Rate Limiter |
| Cron Jobs | node-cron | ^4.5.0 | Maintenance Daily 03:00 WITA |
| PDF Generator | pdfkit | ^0.19.1 | Generator Invoice & Slip Payout FG |
| Image Processing | sharp | ^0.35.3 | Compress WebP No-Crop Engine |
| Google Drive API | googleapis | ^173.0.0 | Drive Folder & Importer Service Account / OAuth2 |
| Env Config | dotenv | ^16.6.1 | Environment Variable Manager |

### Frontend
| Halaman | Teknologi | Keterangan |
|---|---|---|
| Admin Dashboard | Vue 3 + Vite + TailwindCSS | SPA Dashboard (source di `admin-app/`, compiled to `public/admin`) |
| Public Web | HTML5 + Alpine.js + Vanilla CSS/JS | Landing page, inquiry form, tracking, photo selection, EN/ID language toggle |

### DevDependencies & Tooling
| Tool | Versi | Kegunaan |
|---|---|---|
| jest | ^29.7.0 | Automated Unit Testing |
| supertest | ^7.2.2 | API Endpoint Integration Testing |
| vite | ^5.x | Vue 3 SPA Bundler |
| pm2 | Latest | Production Process Manager |

---

## 3. STRUKTUR FOLDER PROYEK (PROJECT MAP)

```text
Wisuda/
├── .env                            # WAJIB dibuat dari .env.example
├── .env.example                    # Template environment variables
├── .gitignore
├── package.json                    # Backend dependencies & npm scripts
├── deploy.sh                       # Script deployment otomatis (PM2)
├── docker-compose.yml              # Containerization setup
├── ecosystem.config.js             # PM2 production config
├── README.md
│
├── src/                            # BACKEND CORE (Express.js)
│   ├── main.js                     # Entry point server (CORS, Rate Limit, Graceful Shutdown)
│   ├── config/
│   │   ├── database.js             # SQLite WAL, migration, 16 indexes
│   │   ├── settings.js             # Env validator (fail-fast, TZ: Asia/Makassar)
│   │   └── wa-templates.js         # WA message templates loader
│   ├── middleware/
│   │   ├── auth.js                 # Session & FG access code auth
│   │   ├── validation.js           # Request payload validator
│   │   └── rate-limit.js           # Express rate limiter (Max 200 req / 15m)
│   ├── routes/
│   │   ├── admin.js                # Route Admin: Stats, Bookings, Payroll, Portfolio, Settings (3-Step OAuth)
│   │   ├── public.js               # Route Publik: Inquiry, Capacity Check, Tracking, Portfolio, Selection
│   │   ├── freelance-portal.js     # Route Portal FG (Checkin/out, Rate Proposal, Setor File)
│   │   ├── fg.js                   # Route API FG operations
│   │   ├── selection.js            # Route API galeri seleksi lightbox
│   │   ├── proxy.js                # Thumbnail proxy + disk cache
│   │   ├── webhook.js              # WA webhook & cron trigger
│   │   └── health.js               # Health check endpoint (/api/health)
│   ├── services/
│   │   ├── drive-folder.service.js # Auto-create Drive folder structure (Smart Hybrid)
│   │   ├── drive-importer.service.js # Resilient GDrive Importer + Sharp WebP
│   │   ├── cron.service.js         # Daily maintenance 03:00 WITA
│   │   ├── backup.service.js       # Auto backup SQLite database
│   │   └── wa.service.js           # WA link generator
│   ├── utils/
│   │   ├── currency.js             # Format Rupiah, timezone WITA helpers
│   │   ├── invoice.js              # PDF invoice generator
│   │   └── university.js           # Normalisasi nama universitas
│   └── __tests__/                  # Unit & integration tests
│
├── public/                         # PUBLIC FRONTEND & ASSETS (served static)
│   ├── index.html                  # Landing page publik (EN|ID Toggle, Masonry Portfolio)
│   ├── inquiry.html                # Form reservasi client (Capacity check & 5-step wizard)
│   ├── confirm-booking.html        # Booking token link sekali pakai
│   ├── tracking.html               # Tracking progres client (token unlock)
│   ├── select-photos.html          # Galeri seleksi foto (Touch Lightbox Swipe)
│   ├── portfolio.html              # Galeri portofolio publik (Filter Univ/Tahun)
│   ├── freelance-portal.html       # Portal fotografer FG (Profile, Rate proposal, Check-in/out)
│   ├── freelancer-register.html    # Pendaftaran FG baru
│   ├── invoice.html                # Contract & invoice client viewer
│   ├── payout-invoice.html         # Slip fee payout FG viewer
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker
│   ├── js/watermark.js             # Developer watermark bubble (AMS credit link)
│   ├── images/                     # Graphic assets & logos
│   └── admin/                      # Compiled Vue 3 SPA Admin Output
│
├── admin-app/                      # ADMIN DASHBOARD SOURCE (Vue 3 + Vite)
│   ├── vite.config.js              # outDir: ../public/admin
│   ├── tailwind.config.js
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router/index.js
│       ├── stores/auth.js
│       └── views/                  # Dashboard Views (Bookings, Settings 3-Step Wizard, Payroll, Portfolio, dsb)
│
├── DATA/                           # LOCAL PERSISTENT STORAGE (Ignored in Git)
│   ├── wisuda.db                   # SQLite main database (WAL Mode)
│   ├── wisuda-builder.log          # System log (max 5MB, auto-rotate)
│   ├── service-account.json        # Google Drive Service Account key
│   ├── uploads/
│   │   ├── gallery_cache/          # Thumbnail cache (TTL 7 hari)
│   │   ├── portfolio/              # WebP portfolio hasil Sharp
│   │   ├── invoices-client/        # Generated client invoices
│   │   ├── invoices-freelance/     # Generated payout slips
│   │   └── payment-proofs/         # Bukti transfer DP/pelunasan
│   └── backups/                    # SQLite database backups
│
├── scripts/
│   ├── schema.sql                  # Referensi schema SQLite
│   └── seed.js                     # Seed data development
│
└── docs/                           # DOKUMENTASI TERKONSOLIDASI
    ├── MASTER_BLUEPRINT.md         # Master Architecture & Product Blueprint (File ini)
    ├── PANDUAN_SETUP_GOOGLE_DRIVE.md # Guide 3-Step OAuth Wizard & Smart Hybrid Drive
    ├── WISUDA_WORKFLOW.md          # Business Workflow, State Machine & SOP Booking
    ├── TECHNICAL_GUIDE.md          # Database Schema, REST API & Deployment Guide
    ├── MEDIA_HANDLING.md           # Media Storage, Sharp Engine & GDrive Integration
    ├── BUG_REPORT.md               # Laporan Bug & Comprehensive Audit Log
    └── CHANGELOG.md                # Catatan Rilis & History Versi
```

---

## 4. ARSITEKTUR ALUR DATA (DATA FLOW ARCHITECTURE)

```
[CLIENT] ──▶ Form Reservasi (/inquiry.html)
                │ (Cek Kapasitas Harian max_daily_capacity)
                ▼
[DATABASE] ──▶ Tabel `inquiries` (status: new)
                │
                ▼
[ADMIN] ──▶ Buat Penawaran / Verifikasi DP ──▶ Tabel `bookings` (status: confirmed, generate TRK Token)
                │
                ├──⚡ AUTO: Smart Hybrid Drive Folder Creation (OAuth Gmail Studio / SA Bot)
                │
                ▼
[ADMIN] ──▶ Penugasan Fotografer ──▶ Tabel `assignments` & Notifikasi WA
                │
                ▼
[FREELANCER] ──▶ Portal FG (/freelance-portal.html)
                    ├── Check-in / Check-out (timestamp)
                    └── Setor Link Google Drive / Upload Staging
                │
                ▼
[CLIENT] ──▶ Seleksi Foto Favorit (/select-photos.html)
                └── Touch Lightbox Swipe ──▶ Proxy /api/proxy/thumb/:fileId ──▶ Submit Pilihan
                │
                ▼
[ADMIN] ──▶ QC Deliverables & Kirim WA Konfirmasi + Token Tracking
                │
                ▼
[CLIENT] ──▶ Halaman Tracking (/tracking.html) ──▶ Unlock Link Drive Output Foto Final
                │
                ▼
[ADMIN] ──▶ Payroll & Maintenance
                ├── Payroll Summary (Rasio Session X/Y Selesai, Slip PDF)
                └── Daily Maintenance Cron 03:00 WITA (Data Retention 30d/90d)
```

---

## 5. PERAN PENGGUNA & HAK AKSES (USER ROLES)

| Peran (Role) | Otentikasi | Tanggung Jawab & Fitur Utama |
|---|---|---|
| **Client / Wisudawan** | Tracking Token (`TRK-xxx`) via URL | Mengisi form reservasi, mengecek ketersediaan tanggal, memilih paket, upload bukti transfer, memilih foto via Touch Lightbox, melacak progres di `/tracking.html`, serta switch bahasa EN | ID. |
| **Freelance Photographer (FG)** | Access Code Unik (`FG-XXX`) | Login portal di `/freelance-portal.html`, update profil, pengajuan perubahan rate fee (`pending_rate`), check-in/out lokasi, setor link hasil foto Drive, dan memantau slip fee payout. |
| **Admin / Operator** | Username + Password (bcrypt) + Session Cookie | Mengelola dashboard stats, verifikasi DP & pelunasan multi-bank, penawaran harga (*quote*), **3-Step Google OAuth Wizard**, *assignment* FG via kalender, review QC hasil foto, kelola portofolio, serta eksekusi payroll FG. |

---

*Wisuda Platform Master Blueprint v1.4.3 — Updated 2026-07-29*
