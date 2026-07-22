# Wisuda Platform — Project Map, Data Flow & Architecture Guide

> **Root Path:** `/Users/armansyam/Documents/Project AmsDev/Wisuda`  
> **Tech Stack:** Node.js + Express + SQLite (better-sqlite3) + Vue 3 (admin-app) + HTML5/Alpine.js (public)  
> **Architecture:** Monolith Express Backend + SPA Vue 3 Admin Dashboard + Multi-page Public HTML

---

## 1. STRUKTUR PROYEK (MAP)

```text
Wisuda/
├── package.json                    # Backend entry scripts & dependencies
├── .env.example                    # Template environment variables lengkap dengan deskripsi
├── .gitignore
├── README.md                       # Dokumentasi utama proyek & panduan jalankan
├── PLATFORM_MAP.md                 # Project map, data flow & change guide ini
├── deploy.sh                       # Script deployment otomatis (PM2)
├── docker-compose.yml              # Konfigurasi containerization Docker
│
├── src/                            # BACKEND (Express.js)
│   ├── main.js                     # ➜ Entry point backend: Express setup, session, CORS, & routes
│   │
│   ├── config/
│   │   ├── database.js             # SQLite connection (better-sqlite3) dengan WAL mode
│   │   ├── settings.js             # Default settings (port, dbPath, uploadPath, backupPath)
│   │   └── wa-templates.js         # Loader & cache template WhatsApp (wa.me)
│   │
│   ├── middleware/
│   │   ├── auth.js                 # Session auth, bcrypt password hashing, login lockout
│   │   ├── validation.js           # Input validator per endpoint
│   │   └── rate-limit.js           # Rate limiter middleware
│   │
│   ├── routes/
│   │   ├── admin.js                # ➜ Route admin: inquiry, booking, deliverables, payroll, archive
│   │   ├── public.js               # ➜ Route publik: inquiry, tracking, portfolio, selection
│   │   ├── freelance-portal.js     # ➜ Route portal fotografer freelance
│   │   ├── fg.js                   # ➜ Route API FG portal (checkin/out, upload Drive link)
│   │   ├── webhook.js              # ➜ Webhook & WA trigger links
│   │   └── health.js               # Health check status API (/api/health)
│   │
│   ├── services/
│   │   ├── cron.service.js         # Job scheduler (reminders H-3/H-1, auto-approve, backup)
│   │   ├── backup.service.js       # Auto-backup SQLite database
│   │   └── wa.service.js           # Generator link WhatsApp wa.me
│   │
│   └── utils/
│       └── currency.js             # Formatter rupiah & tanggal
│
├── public/                         # STATIC WEB PUBLIK (served via Express)
│   ├── index.html                  # Landing page (Hero featured priority, anti copy/right-click)
│   ├── inquiry.html                # Form reservasi klien
│   ├── confirm-booking.html        # Konfirmasi booking via token
│   ├── tracking.html               # Tracking progres (PIN unlock link Drive)
│   ├── select-photos.html          # Galeri seleksi foto klien (Lightbox swipe, panah & keyboard nav)
│   ├── portfolio.html              # Galeri karya publik (Filter univ/tahun, modal zoom, anti copy)
│   ├── freelance-portal.html       # Portal khusus fotografer freelance
│   ├── invoice.html                # Invoice viewer
│   ├── payout-invoice.html         # Slip gaji FG viewer
│   ├── ams-logo.png                # Logo Developer Watermark AMS
│   │
│   └── admin/
│       ├── index.html              # Vue 3 SPA Admin production build
│       └── assets/                 # Compiled JS/CSS bundle dari admin-app
│
├── admin-app/                      # FRONTEND ADMIN (Vue 3 + Vite SPA)
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   │
│   └── src/
│       ├── main.js                 # Vue 3 bootstrap
│       ├── App.vue                 # Root layout component
│       ├── router/index.js         # Vue Router config
│       ├── stores/auth.js          # Pinia store auth state
│       │
│       └── views/
│           ├── LoginView.vue
│           ├── DashboardView.vue
│           ├── InquiriesView.vue
│           ├── BookingsView.vue
│           ├── PackagesView.vue
│           ├── FreelancersView.vue
│           ├── DeliverablesView.vue # Post production editing deliverables
│           ├── FinancesView.vue     # Arsip client & warning fee FG belum dibayar
│           ├── PayrollView.vue      # Payroll 1 baris/FG, status X/Y Selesai, modal z-[70]
│           ├── PortfolioView.vue    # Select cover photo & Google Drive API + Sharp import
│           ├── ReportsView.vue
│           └── SettingsView.vue
│
├── scripts/
│   ├── schema.sql                  # Database schema (14 tabel)
│   └── seed.js                     # Inisialisasi data awal
│
└── docs/                           # DOKUMENTASI SISTEM
    ├── PRD.md                      # Product Requirement Document
    ├── WISUDA_API.md               # Spesifikasi API Endpoints
    ├── WISUDA_DB.md                # Skema Database & Relasi
    ├── WISUDA_DEPLOY.md            # Panduan Server Deployment
    └── WISUDA_FLOW.md              # Detail End-to-End Application Flow
```

---

## 2. DATA FLOW & ALUR APLIKASI

```
[KLIEN] ──▶ Form Reservasi (/inquiry.html)
                │
                ▼
[DATABASE] ──▶ Tabel `inquiries` (status: new)
                │
                ▼
[ADMIN] ──▶ Buat Penawaran / Verifikasi DP ──▶ Tabel `bookings` (status: confirmed)
                │
                ▼
[ADMIN] ──▶ Penugasan Fotografer ──▶ Tabel `assignments`
                │
                ▼
[FREELANCER] ──▶ Portal FG (/freelance-portal.html)
                   ├── Check-in / Check-out (timestamp)
                   └── Setor Link Google DriveHasil Shoot
                │
                ▼
[KLIEN] ──▶ Seleksi Foto Favorit (/select-photos.html)
               └── Lightbox Swipe / Panah / Keyboard Nav ──▶ Submit Pilihan
                │
                ▼
[ADMIN] ──▶ Deliverables & QC ──▶ Kirim WA Konfirmasi + PIN Tracking
                │
                ▼
[KLIEN] ──▶ Halaman Tracking (/tracking.html)
               └── Masukkan PIN Akses ──▶ Unlock Link Drive Hasil Foto
                │
                ▼
[ADMIN] ──▶ Payroll & Finances
               ├── Tabel Payroll 1 Baris / FG (Rasio Session X/Y Selesai)
               └── Arsip Client (Warning ⚠️ Fee FG Belum Dibayar)
```

---
*Platform Architecture & Map Reference v1.1*