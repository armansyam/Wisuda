# 📋 MASTER BLUEPRINT — Wisuda Platform
## Dokumen Rekonstruksi & Arsitektur Utama v1.3.0

> Dokumen ini berisi **seluruh informasi arsitektur, visi sistem, peta proyek, dan spesifikasi produk** untuk platform manajemen bisnis studio foto wisuda end-to-end.
> Versi: 1.3.0 | Diperbarui: 2026-07-28 | Author: AmsDev

---

## 1. VISI SISTEM & DIFFERENSIASI PRODUK

**Wisuda Platform** adalah platform manajemen operasional end-to-end untuk bisnis agensi fotografi wisuda (*graduation photography*). Platform ini menghubungkan wisudawan (klien) dengan fotografer freelance (FG) melalui kontrol terpusat oleh Admin/Operator:
- Penerimaan inquiry dari calon client via web public
- Manajemen booking & verifikasi pembayaran DP/pelunasan manual
- Penugasan fotografer freelance (FG) berbasis kalender & slot waktu
- Otomasi pembuatan folder Google Drive saat DP terverifikasi
- Galeri seleksi foto *zero-storage Touch Lightbox Swipe* untuk client
- Delivery hasil edit & tracking progres via token unik WA
- Payout fee fotografer + generator slip PDF otomatis
- Portofolio publik auto-import dari Google Drive via Sharp WebP Engine

### Keunggulan Utama
- **Model Agensi Terkontrol**: Klien memilih paket harga tetap; Admin menentukan assignment FG sesuai lokasi, rating, dan jadwal.
- **Output Digital Only**: Seluruh penyerahan hasil foto menggunakan berkas digital resolusi tinggi via Google Drive (tanpa media cetak fisik/album), mempercepat distribusi & menghemat biaya operasional.
- **Standar Tarif Rp 500.000/Jam**: Penetapan harga paket premium terpola berdasarkan durasi pemotretan jam (mulai Rp 500k/1 jam hingga Rp 1.5M/3 jam).
- **Tanpa Payment Gateway Fee**: Pembayaran menggunakan sistem transfer langsung dengan verifikasi manual admin yang cepat.
- **Performa & Responsivitas Tinggi**: Database SQLite WAL dengan 16 B-Tree Indexes (< 1ms query time) dan aset gambar WebP terkompresi Sharp Engine (~40KB).
- **Desain Touch-Friendly**: Halaman seleksi foto Touch-Lightbox Swipe di HP/Tablet & halaman tracking tanpa PIN rumit.
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
| Google Drive API | googleapis | ^173.0.0 | Drive Folder & Importer Service Account |
| Env Config | dotenv | ^16.6.1 | Environment Variable Manager |

### Frontend
| Halaman | Teknologi | Keterangan |
|---|---|---|
| Admin Dashboard | Vue 3 + Vite + TailwindCSS | SPA Dashboard (source di `admin-app/`, compiled to `public/admin`) |
| Public Web | HTML5 + Alpine.js + Vanilla CSS/JS | Landing page, inquiry form, tracking, photo selection |

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
│   │   ├── admin.js                # Route Admin: Stats, Bookings, Payroll, Portfolio
│   │   ├── public.js               # Route Publik: Inquiry, Tracking, Portfolio, Selection
│   │   ├── freelance-portal.js     # Route Portal FG (Checkin/out, Setor File)
│   │   ├── fg.js                   # Route API FG operations
│   │   ├── selection.js            # Route API galeri seleksi lightbox
│   │   ├── proxy.js                # Thumbnail proxy + disk cache
│   │   ├── webhook.js              # WA webhook & cron trigger
│   │   └── health.js               # Health check endpoint (/api/health)
│   ├── services/
│   │   ├── drive-folder.service.js # Auto-create Drive folder structure
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
│   ├── index.html                  # Landing page publik (Hero Featured, Masonry Portfolio)
│   ├── inquiry.html                # Form reservasi client
│   ├── confirm-booking.html        # Booking token link sekali pakai
│   ├── tracking.html               # Tracking progres client (token unlock)
│   ├── select-photos.html          # Galeri seleksi foto (Touch Lightbox Swipe)
│   ├── portfolio.html              # Galeri portofolio publik (Filter Univ/Tahun)
│   ├── freelance-portal.html       # Portal fotografer FG
│   ├── freelancer-register.html    # Pendaftaran FG baru
│   ├── invoice.html                # Contract & invoice client viewer
│   ├── payout-invoice.html         # Slip fee payout FG viewer
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker
│   ├── js/watermark.js             # Developer watermark bubble
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
│       └── views/                  # Dashboard Views (Bookings, Payroll, Portfolio, dsb)
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
    ├── WISUDA_WORKFLOW.md          # Business Workflow, State Machine & SOP Booking
    ├── TECHNICAL_GUIDE.md          # Database Schema, REST API & Deployment Guide
    ├── MEDIA_HANDLING.md           # Media Storage, Sharp Engine & GDrive Integration
    └── CHANGELOG.md                # Catatan Rilis & History Versi
```

---

## 4. ARSITEKTUR ALUR DATA (DATA FLOW ARCHITECTURE)

```
[CLIENT] ──▶ Form Reservasi (/inquiry.html)
                │
                ▼
[DATABASE] ──▶ Tabel `inquiries` (status: new)
                │
                ▼
[ADMIN] ──▶ Buat Penawaran / Verifikasi DP ──▶ Tabel `bookings` (status: confirmed, generate TRK Token)
                │
                ├──⚡ AUTO: Background Service Account buat 4 Folder Google Drive
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
| **Client / Wisudawan** | Tracking Token (`TRK-xxx`) via URL | Mengisi form reservasi, memilih paket via token, upload bukti transfer, memilih foto via Touch Lightbox, melacak progres di `/tracking.html`, serta konfirmasi persetujuan portofolio. |
| **Freelance Photographer (FG)** | Access Code Unik (`FG-XXX`) | Login portal di `/freelance-portal.html`, konfirmasi penugasan, check-in/out lokasi, setor link hasil foto Drive, dan memantau rincian fee payout. |
| **Admin / Operator** | Username + Password (bcrypt) + Session Cookie | Mengelola dashboard stats, verifikasi DP & pelunasan, penawaran harga (*quote*), *assignment* FG via kalender, review QC hasil foto, kelola portofolio, serta eksekusi payroll FG. |

---

*Wisuda Platform Master Blueprint v1.3.0 — Updated 2026-07-28*
