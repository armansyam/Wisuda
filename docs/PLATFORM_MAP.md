# 🗺️ Wisuda Platform — Project Architecture & File Map

> **Root Directory:** `/Users/armansyam/Documents/Project AmsDev/Wisuda`  
> **Tech Stack:** Node.js Express + SQLite (`better-sqlite3` WAL) + Vue 3 SPA Admin (`admin-app/`) + HTML5/Vanilla JS Public Web (`public/`)  
> **Version:** 1.2 (Updated 2026-07-25)

---

## 1. STRUKTUR PROYEK (PROJECT DIRECTORY MAP)

```text
Wisuda/
├── package.json                    # Dependencies backend Express & npm scripts
├── .env.example                    # Template environment variables (PORT, DB_PATH, TZ, etc)
├── README.md                       # Dokumentasi utama & panduan eksekusi
├── deploy.sh                       # Script deployment otomatis PM2
├── docker-compose.yml              # Konfigurasi containerization Docker
│
├── src/                            # BACKEND CORE (Express.js)
│   ├── main.js                     # ➜ Server Entry Point (CORS, Rate Limiter, Graceful Shutdown)
│   │
│   ├── config/
│   │   ├── database.js             # SQLite WAL setup, 16 Indexes, Pragmas, & Migration
│   │   ├── settings.js             # Configurations & Environment Fail-fast Validator (TZ: Asia/Makassar)
│   │   └── wa-templates.js         # Cache & Loader Template Pesan WA (wa.me)
│   │
│   ├── middleware/
│   │   ├── auth.js                 # Session Authenticator, Bcrypt Password Lockout
│   │   ├── validation.js           # Request Payload Input Validator
│   │   └── rate-limit.js           # Express Rate Limiter Middleware (Max 200 req / 15m)
│   │
│   ├── routes/
│   │   ├── admin.js                # Route Admin: Stats, Bookings, Payroll, Portfolio, Packages
│   │   ├── public.js               # Route Publik: Inquiry, Tracking, Portfolio, Selection
│   │   ├── freelance-portal.js     # Route Portal Freelancer (Checkin/out, Setor File)
│   │   ├── fg.js                   # Route API FG Operations
│   │   ├── selection.js            # Route API Seleksi Foto Lightbox Client
│   │   ├── webhook.js              # Route Webhook & Backup Trigger
│   │   └── health.js               # Healthcheck API Endpoint (/api/health)
│   │
│   ├── services/
│   │   ├── cron.service.js         # Daily Maintenance Cron 03:00 WITA, Reminders, Data Retention, Log Rotation
│   │   ├── drive-importer.service.js # Resilient GDrive Background Importer Engine + Sharp WebP
│   │   ├── backup.service.js       # Auto Backup Engine SQLite
│   │   └── wa.service.js           # Generator Link WhatsApp wa.me
│   │
│   └── utils/
│       ├── currency.js             # Formatter Rupiah, Date WITA, Timezone Helpers
│       ├── invoice.js              # PDF Invoice Generator
│       └── university.js           # Normalisasi & Helper Data Kampus
│
├── public/                         # PUBLIC FRONTEND & ASSETS
│   ├── index.html                  # Landing Page Publik (Hero Featured Priority, Anti-copy)
│   ├── inquiry.html                # Form Reservasi Client
│   ├── confirm-booking.html        # Konfirmasi Booking via Token
│   ├── tracking.html               # Tracking Progres Client (Token unlock Drive)
│   ├── select-photos.html          # Galeri Seleksi Foto (Touch Lightbox Swipe)
│   ├── portfolio.html              # Galeri Portfolio Publik (Filter Univ/Tahun)
│   ├── freelance-portal.html       # Portal Akses Fotografer Freelance
│   ├── invoice.html                # Contract & Invoice Viewer
│   ├── payout-invoice.html         # Slip Fee Payout FG Viewer
│   │
│   └── admin/                      # Compiled Vue 3 SPA Admin Dashboard
│       ├── index.html
│       └── assets/
│
├── admin-app/                      # ADMIN DASHBOARD FRONTEND (Vue 3 + Vite SPA)
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router/index.js
│       ├── stores/auth.js
│       └── views/                  # Dashboard Views (Bookings, Payroll, Portfolio, Finances, etc.)
│
├── DATA/                           # LOCAL PERSISTENT STORAGE
│   ├── wisuda.db                   # SQLite Main Database File (WAL Mode)
│   ├── wisuda-builder.log          # System Log (Max 5MB dengan Auto-Rotation)
│   ├── uploads/                    # Upload Directory (Portfolio, Staging, Payment Proofs)
│   └── backups/                    # Backup SQLite Files (.db)
│
└── docs/                           # COMPREHENSIVE DOCUMENTATION
    ├── PRD.md                      # Product Requirements Document
    ├── WISUDA_DB.md                # Full DB Schema, 16 Indexes, Retention Policy
    ├── WISUDA_API.md               # Complete REST API Specifications
    ├── WISUDA_WORKFLOW.md          # End-to-End Business Flow & State Machine
    ├── WISUDA_DEPLOY.md            # Server Deployment, PM2, Graceful Shutdown
    ├── PLATFORM_MAP.md             # Project Architecture & Codebase Map (File ini)
    ├── MEDIA_HANDLING.md           # Sharp WebP Engine & GDrive Importer Standard
    ├── SHARP_KOMPRESI_GAMBAR_PORTOFOLIO.md # Sharp WebP Quick Guide
    └── PENANGANAN_TIMEOUT_DAN_RATE_LIMIT_GDRIVE.md # GDrive Resilience Quick Guide
```

---

## 2. DATA FLOW ARCHITECTURE

```
[CLIENT] ──▶ Form Reservasi (/inquiry.html)
                │
                ▼
[DATABASE] ──▶ Tabel `inquiries` (status: new)
                │
                ▼
[ADMIN] ──▶ Buat Penawaran / Verifikasi DP ──▶ Tabel `bookings` (status: confirmed, generate TRK Token)
                │
                ▼
[ADMIN] ──▶ Penugasan Fotografer ──▶ Tabel `assignments` & Notif WA
                │
                ▼
[FREELANCER] ──▶ Portal FG (/freelance-portal.html)
                    ├── Check-in / Check-out (timestamp)
                    └── Setor Link Google Drive / Upload Staging
                │
                ▼
[CLIENT] ──▶ Seleksi Foto Favorit (/select-photos.html)
                └── Touch Lightbox Swipe / Panah / Keyboard Nav ──▶ Submit Pilihan
                │
                ▼
[ADMIN] ──▶ QC Deliverables & Kirim WA Konfirmasi + Token Tracking
                │
                ▼
[CLIENT] ──▶ Halaman Tracking (/tracking.html) ──▶ Unlock Link Drive Output Foto
                │
                ▼
[ADMIN] ──▶ Payroll & Maintenance
                ├── Payroll Summary (Rasio Session X/Y Selesai, Slip PDF)
                └── Daily Maintenance Cron 03:00 WITA (Data Retention 30d/90d)
```

---

*Wisuda Platform Architecture & Directory Map v1.2*