# 📋 MASTER BLUEPRINT — Wisuda Platform
## Dokumen Rekonstruksi Lengkap v1.3

> Dokumen ini berisi **semua informasi yang dibutuhkan** untuk membangun ulang sistem dari nol.
> Versi: 1.3.0 | Diperbarui: 2026-07-25 | Author: AmsDev

---

## 1. TUJUAN SISTEM

Platform manajemen bisnis **studio foto wisuda** end-to-end, mencakup:
- Penerimaan inquiry dari calon client
- Manajemen booking & verifikasi pembayaran DP/pelunasan
- Penugasan fotografer freelance (FG)
- Galeri seleksi foto untuk client
- Delivery hasil edit & tracking progres
- Payout fee fotografer + slip PDF
- Portofolio publik auto-import dari Google Drive
- **Otomasi pembuatan folder Google Drive** saat DP terverifikasi

---

## 2. TECH STACK

### Backend
| Komponen | Teknologi | Versi |
|---|---|---|
| Runtime | Node.js | v20.x LTS |
| Framework | Express.js | ^5.2.1 |
| Database | SQLite (better-sqlite3) | ^12.11.1 |
| Session Store | connect-sqlite3 | ^0.9.16 |
| Auth | express-session + bcrypt | ^1.19.0 / ^6.0.0 |
| Validation | express-validator | ^7.3.2 |
| File Upload | express-fileupload + multer | ^1.5.2 / ^2.2.0 |
| Rate Limiting | express-rate-limit | ^7.5.1 |
| Cron Jobs | node-cron | ^4.5.0 |
| PDF Generator | pdfkit | ^0.19.1 |
| Image Processing | sharp | ^0.35.3 |
| Google Drive API | googleapis | ^173.0.0 |
| Env Config | dotenv | ^16.6.1 |

### Frontend
| Halaman | Teknologi |
|---|---|
| Admin Dashboard | Vue 3 + Vite + TailwindCSS (SPA, source di admin-app/) |
| Public Pages | HTML5 + Alpine.js + Vanilla CSS/JS |

### DevDependencies
| Tool | Versi |
|---|---|
| jest | ^29.7.0 |
| supertest | ^7.2.2 |

---

## 3. STRUKTUR FOLDER LENGKAP

```
Wisuda/
├── .env                            # ← WAJIB dibuat dari .env.example
├── .env.example                    # Template environment variables
├── .gitignore
├── package.json
├── deploy.sh                       # Script deployment otomatis (PM2)
├── docker-compose.yml
├── ecosystem.config.js             # PM2 config
├── README.md
│
├── src/                            # BACKEND CORE
│   ├── main.js                     # Entry point server
│   ├── config/
│   │   ├── database.js             # SQLite WAL, migration, 16 indexes
│   │   ├── settings.js             # Env validator (fail-fast)
│   │   └── wa-templates.js         # WA message templates loader
│   ├── middleware/
│   │   ├── auth.js                 # Session auth
│   │   ├── validation.js           # Request validator
│   │   └── rate-limit.js           # Rate limiter
│   ├── routes/
│   │   ├── admin.js                # Semua route admin
│   │   ├── public.js               # Route publik client
│   │   ├── freelance-portal.js     # Portal FG
│   │   ├── fg.js                   # FG operations
│   │   ├── selection.js            # Galeri seleksi
│   │   ├── proxy.js                # Thumbnail proxy + disk cache
│   │   ├── webhook.js              # WA webhook & cron trigger
│   │   └── health.js               # Health check
│   ├── services/
│   │   ├── drive-folder.service.js # Auto-create Drive folders
│   │   ├── drive-importer.service.js # Scan & import Drive portfolio
│   │   ├── cron.service.js         # Daily maintenance 03:00 WITA
│   │   ├── backup.service.js       # Auto backup SQLite
│   │   └── wa.service.js           # WA link generator
│   ├── utils/
│   │   ├── currency.js             # Format Rupiah, timezone WITA
│   │   ├── invoice.js              # PDF invoice generator
│   │   └── university.js           # Normalisasi nama universitas
│   └── __tests__/
│       └── system.test.js
│
├── public/                         # FRONTEND (served static)
│   ├── index.html                  # Landing page publik
│   ├── inquiry.html                # Form reservasi client
│   ├── confirm-booking.html        # Booking link sekali pakai (token)
│   ├── tracking.html               # Tracking progres client
│   ├── select-photos.html          # Galeri seleksi foto (lightbox)
│   ├── portfolio.html              # Galeri portofolio publik
│   ├── freelance-portal.html       # Portal fotografer FG
│   ├── freelancer-register.html    # Pendaftaran FG baru
│   ├── invoice.html                # Invoice client viewer
│   ├── payout-invoice.html         # Slip payout FG viewer
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service Worker
│   ├── js/watermark.js             # Developer watermark
│   ├── images/
│   ├── uploads/avatars/ & branding/
│   └── admin/                      # BUILD OUTPUT dari admin-app/
│       └── assets/
│
├── admin-app/                      # ADMIN DASHBOARD SOURCE (Vue 3 + Vite)
│   ├── vite.config.js              # outDir: ../public/admin
│   ├── tailwind.config.js
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router/index.js
│       ├── stores/auth.js
│       └── views/
│
├── DATA/                           # ← TIDAK MASUK GIT
│   ├── wisuda.db                   # SQLite database
│   ├── wisuda-builder.log          # App log (max 5MB, auto-rotate)
│   ├── service-account.json        # Google Drive Service Account
│   ├── uploads/
│   │   ├── gallery_cache/          # Thumbnail cache (TTL 7 hari)
│   │   ├── portfolio/              # Hasil kompres Sharp (WebP)
│   │   ├── invoices-client/
│   │   ├── invoices-freelance/
│   │   └── payment-proofs/
│   └── backups/
│
├── scripts/
│   ├── schema.sql                  # Referensi schema (dokumentasi)
│   └── seed.js                     # Seed data development
│
└── docs/
    ├── MASTER_BLUEPRINT.md         # ← File ini
    ├── CHANGELOG.md
    ├── WISUDA_WORKFLOW.md
    ├── WISUDA_FLOW.md
    ├── WISUDA_DB.md
    ├── WISUDA_API.md
    ├── WISUDA_DEPLOY.md
    ├── PLATFORM_MAP.md
    ├── PRD.md
    └── MEDIA_HANDLING.md
```

---

## 4. DATABASE SCHEMA (Semua Tabel)

Database: **SQLite WAL mode** — auto-migrate saat server start via `src/config/database.js`.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -32000;

-- 1. USERS (Admin)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT, role TEXT DEFAULT 'admin',
  active BOOLEAN DEFAULT 1, avatar_url TEXT,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. PACKAGES
CREATE TABLE packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, description TEXT,
  price INTEGER NOT NULL, fg_fee INTEGER NOT NULL,
  editor_fee INTEGER DEFAULT 0, includes TEXT,
  duration_hours INTEGER, active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  max_selected_photos INTEGER DEFAULT 15,
  highlight_count INTEGER DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. FREELANCERS
CREATE TABLE freelancers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  email TEXT, portfolio_url TEXT, specialties TEXT,
  rating REAL DEFAULT 5.0, active BOOLEAN DEFAULT 1,
  bank_account TEXT, id_card TEXT,
  access_code TEXT UNIQUE,    -- FG-XXXXXXXX login portal
  pending_rate INTEGER, default_rate INTEGER DEFAULT 0,
  city TEXT, agree_terms INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. SETTINGS
CREATE TABLE settings (
  key TEXT PRIMARY KEY, value TEXT, description TEXT
);

-- 5. INQUIRIES
CREATE TABLE inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL, client_phone TEXT NOT NULL,
  client_email TEXT, graduation_date DATE NOT NULL,
  location TEXT, university TEXT,
  package_id INTEGER REFERENCES packages(id),
  source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'new', -- new, quoted, booked, expired, lost, archived
  notes TEXT, assigned_admin_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. BOOKING_TOKENS (Link Sekali Pakai)
CREATE TABLE booking_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id),
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. BOOKINGS (Tabel Utama)
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER REFERENCES inquiries(id),
  package_id INTEGER NOT NULL REFERENCES packages(id),
  client_name TEXT NOT NULL, client_phone TEXT NOT NULL,
  client_email TEXT, graduation_date DATE NOT NULL,
  location TEXT, university TEXT,
  duration_hours INTEGER DEFAULT 2, shooting_time TEXT,
  total_price INTEGER NOT NULL,
  dp_amount INTEGER NOT NULL,
  dp_status TEXT DEFAULT 'unpaid',      -- unpaid, uploaded, paid, refunded
  dp_verified_by INTEGER REFERENCES users(id),
  dp_verified_at DATETIME, dp_bukti_url TEXT,
  balance_amount INTEGER NOT NULL,
  balance_status TEXT DEFAULT 'unpaid', -- unpaid, uploaded, paid
  balance_verified_by INTEGER REFERENCES users(id),
  balance_verified_at DATETIME, balance_bukti_url TEXT,
  contract_signed BOOLEAN DEFAULT 0, contract_url TEXT,
  download_url TEXT,                    -- Link folder "All File Edited"
  final_invoice_url TEXT,
  selected_photos TEXT,                 -- JSON [{fileId, filename}]
  selection_status TEXT DEFAULT 'pending', -- pending, scanning, ready, submitted, cleaned
  staging_files TEXT,                   -- JSON [{fileId, filename}] dari scan
  highlight_drive_url TEXT,             -- Folder Highlight Drive
  staging_drive_url TEXT,              -- Folder JPG Drive
  tracking_token TEXT UNIQUE,          -- TRK-{id}-{HEX}
  drive_parent_url TEXT,               -- Folder induk client
  additional_photos INTEGER DEFAULT 0,
  portfolio_consent TEXT DEFAULT 'pending', -- pending, approved, rejected
  status TEXT DEFAULT 'confirmed',     -- confirmed, shooting, editing, delivered, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. ASSIGNMENTS
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  editor_id INTEGER REFERENCES freelancers(id),
  status TEXT DEFAULT 'assigned',      -- assigned, confirmed, shooting, uploaded, qc, done
  brief TEXT, fg_fee INTEGER,
  checkin_at DATETIME, checkout_at DATETIME,
  drive_url TEXT,
  qc_status TEXT DEFAULT 'pending',    -- pending, approved, revision
  qc_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. DELIVERABLES
CREATE TABLE deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  preview_url TEXT, delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. PAYOUTS
CREATE TABLE payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  fg_fee INTEGER NOT NULL,
  bonus INTEGER DEFAULT 0, deduction INTEGER DEFAULT 0,
  total_payout INTEGER,
  status TEXT DEFAULT 'pending',       -- pending, paid, failed
  transfer_ref TEXT, paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. PORTFOLIO_ITEMS
CREATE TABLE portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id),
  client_initial TEXT, graduation_year INTEGER,
  university TEXT, cover_photo_url TEXT,
  highlight_photos TEXT,               -- JSON array WebP paths
  featured INTEGER DEFAULT 0, published INTEGER DEFAULT 0,
  portfolio_consent TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. PORTFOLIO_IMPORT_JOBS
CREATE TABLE portfolio_import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_initial TEXT, graduation_year INTEGER,
  university TEXT, drive_url TEXT,
  status TEXT DEFAULT 'pending',       -- pending, processing, completed, failed
  total_photos INTEGER DEFAULT 0,
  processed_photos INTEGER DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. NOTIFICATIONS
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, title TEXT, message TEXT,
  reference_id INTEGER, reference_type TEXT,
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. FG_SCHEDULES
CREATE TABLE fg_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'available',
  booking_id INTEGER REFERENCES bookings(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fg_id, date)
);

-- 15. FREELANCER_APPLICATIONS
CREATE TABLE freelancer_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  email TEXT, portfolio_url TEXT, specialties TEXT,
  city TEXT, gear_info TEXT,
  status TEXT DEFAULT 'pending',       -- pending, approved, rejected
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. ENVIRONMENT VARIABLES (.env)

```env
PORT=8081
NODE_ENV=production
TZ=Asia/Makassar
DB_PATH=./DATA/wisuda.db

# Security (generate random 32+ char)
SESSION_SECRET=
JWT_SECRET=
Hardresetsistem=

# Storage
UPLOAD_PATH=./DATA/uploads
BACKUP_PATH=./DATA/backups

# Google Drive — Read (portfolio import)
GOOGLE_DRIVE_API_KEY=

# Google Drive — Write (auto-create folder saat DP verified)
GOOGLE_SERVICE_ACCOUNT_PATH=./DATA/service-account.json
GOOGLE_DRIVE_MASTER_FOLDER_ID=
```

---

## 6. INSTALASI & SETUP (Dari Nol)

### Step 1 — Clone & Install
```bash
git clone https://github.com/armansyam/Wisuda.git
cd Wisuda
cp .env.example .env
# Edit .env (isi semua variabel)

npm install
cd admin-app && npm install && npm run build && cd ..
```

### Step 2 — Google Drive Setup
1. Google Cloud Console → aktifkan **Google Drive API**
2. Buat **API Key** → isi `GOOGLE_DRIVE_API_KEY`
3. Buat **Service Account** → download JSON → simpan ke `DATA/service-account.json`
4. Buat folder **"WISUDA CLIENTS"** di Google Drive pribadi
5. Share folder ke email service account dengan role **Editor**
6. Copy folder ID dari URL → isi `GOOGLE_DRIVE_MASTER_FOLDER_ID`

### Step 3 — Jalankan
```bash
# Development
npm run dev

# Production (PM2)
./deploy.sh
# atau
pm2 start ecosystem.config.js && pm2 save
```

### Step 4 — Setup Awal
```bash
npm run seed              # Buat paket default + akun admin awal
# Login admin → ganti password segera
```

---

## 7. SELURUH ENDPOINT API

### System
```
GET  /api/health
POST /api/admin/login        { username, password }
POST /api/admin/logout
GET  /api/admin/me
```

### Public (Client)
```
GET  /api/public/packages
POST /api/public/inquiry
GET  /api/public/booking-token/:token
POST /api/public/booking-token/:token/confirm
POST /api/public/booking/:id/upload-dp
POST /api/public/booking/:id/upload-balance
GET  /api/public/tracking/:token
POST /api/public/tracking/:id/portfolio-consent  { consent, code: tracking_token }
GET  /api/public/portfolio?university=&year=&featured=
POST /api/public/freelancer-recruitment
GET  /api/public/settings
```

### Proxy (Thumbnail Cache)
```
GET  /api/proxy/thumb/:fileId?sz=w400   → grid thumbnail (cached disk)
GET  /api/proxy/thumb/:fileId?sz=w800   → popup HD (on-demand)
```

### Selection (Galeri Seleksi)
```
GET  /api/public/selection/:booking_id?token=
POST /api/public/selection/:booking_id/submit  { selected_photos, token }
```

### Admin — Dashboard & Notifikasi
```
GET  /api/admin/dashboard/stats
GET  /api/admin/notifications
POST /api/admin/notifications/mark-read
```

### Admin — Inquiries
```
GET    /api/admin/inquiries?status=&search=&page=&limit=
GET    /api/admin/inquiries/:id
POST   /api/admin/inquiries/:id/quote    { package_id, custom_price }
POST   /api/admin/inquiries/:id/status   { status }
DELETE /api/admin/inquiries/:id
```

### Admin — Bookings
```
GET    /api/admin/bookings?status=&search=
GET    /api/admin/bookings/:id
POST   /api/admin/bookings/:id/verify-dp       { dp_amount, dp_bukti_url }
POST   /api/admin/bookings/:id/verify-balance  { balance_bukti_url }
POST   /api/admin/bookings/:id/cancel
DELETE /api/admin/bookings/:id
```

### Admin — Post-Production (Staging & Highlight)
```
GET    /api/admin/post-production
POST   /api/admin/post-production/:id/upload-staging   { drive_url }
POST   /api/admin/post-production/:id/upload-highlight { highlight_url }
POST   /api/admin/post-production/:id/clean-staging
```

### Admin — Assignments & Calendar
```
GET    /api/admin/assignments
POST   /api/admin/assignments            { booking_id, fg_id, fg_fee, brief }
PUT    /api/admin/assignments/:id
DELETE /api/admin/assignments/:id
GET    /api/admin/calendar?month=YYYY-MM
```

### Admin — Deliverables & QC
```
GET    /api/admin/deliverables
POST   /api/admin/deliverables/:id/qc      { qc_status, qc_notes }
POST   /api/admin/deliverables/:id/deliver { download_url }
```

### Admin — Payouts & Payroll
```
GET    /api/admin/payouts?status=&fg_id=
POST   /api/admin/payouts/complete-bulk    { assignment_ids }
GET    /api/admin/payroll/summary
GET    /api/admin/finances
```

### Admin — Portfolio
```
GET    /api/admin/portfolio
POST   /api/admin/portfolio
PUT    /api/admin/portfolio/:id
DELETE /api/admin/portfolio/:id
POST   /api/admin/portfolio/import-drive  { drive_url, client_initial, graduation_year, university }
GET    /api/admin/portfolio/import-jobs
```

### Admin — Master Data
```
GET    /api/admin/packages
POST   /api/admin/packages
PUT    /api/admin/packages/:id
GET    /api/admin/freelancers
POST   /api/admin/freelancers
PUT    /api/admin/freelancers/:id
GET    /api/admin/recruitment/applications
POST   /api/admin/recruitment/applications/:id/review
```

### Admin — Settings & Drive
```
GET    /api/admin/settings
POST   /api/admin/settings
GET    /api/admin/settings/drive-test    ← test koneksi Service Account
POST   /api/admin/system/reset           { type: 'transactions'|'full' }
```

### Freelance Portal (FG)
```
POST /api/public/freelance-portal/login          { access_code }
GET  /api/public/freelance-portal/schedule
POST /api/public/freelance-portal/accept-assignment
POST /api/public/freelance-portal/confirm-session
POST /api/public/freelance-portal/submit-file    { drive_url }
GET  /api/public/freelance-portal/payout-invoice/:ref

GET  /api/fg/profile
PUT  /api/fg/profile
GET  /api/fg/assignments
POST /api/fg/assignments/:id/checkin
POST /api/fg/assignments/:id/checkout
POST /api/fg/assignments/:id/upload
POST /api/fg/agree-terms
GET  /api/fg/payouts
```

### Webhooks
```
POST /api/webhook/wa/fg-confirm
POST /api/webhook/wa/client-approve
POST /api/webhook/inquiry
POST /api/webhook/cron/reminder-h3
POST /api/webhook/cron/reminder-h1
POST /api/webhook/cron/auto-approve
POST /api/webhook/cron/dp-expired
POST /api/webhook/cron/backup
```

---

## 8. ALUR BISNIS END-TO-END

```
1. INQUIRY → Client isi /inquiry.html → DB: inquiries.status='new'

2. BOOKING LINK → Admin generate token → kirim link WA
   Client buka /confirm-booking.html?token=XXX
   → lihat paket + upload bukti DP

3. DP VERIFIED → Admin verifikasi
   → tracking_token = TRK-{id}-{HEX} dibuat
   → [BACKGROUND] drive-folder.service.js buat folder Drive:
     WISUDA CLIENTS/Wisuda_NamaClient_YYYY-MM-DD/
       JPG/ + Highlight/ + All File Edited/
   → DB: staging_drive_url, highlight_drive_url, download_url terisi otomatis

4. ASSIGNMENT → Admin assign FG
   FG login portal → konfirmasi → check-in → shoot → check-out
   FG setor drive link hasil foto

5. UPLOAD STAGING → Admin scan folder JPG
   → fileId list disimpan ke DB (bukan file fisik)
   → selection_status = 'ready'

6. SELEKSI FOTO → Client buka /select-photos.html
   Proxy /api/proxy/thumb/:fileId (cache disk w400)
   Popup w800 on-demand
   Submit pilihan foto → selection_status = 'submitted'

7. HIGHLIGHT → Admin upload highlight link
   → drive-importer.service.js scan + download + Sharp WebP
   → portfolio_items auto-create
   → gallery_cache dihapus

8. DELIVER → Admin kirim download_url ke client
   → status = 'delivered'
   → gallery_cache dihapus

9. COMPLETED → Client konfirmasi terima
   → status = 'completed'
   → gallery_cache dihapus

10. PAYOUT → Admin bayar fee FG
    → Slip PDF auto-generate
    → WA ke FG
```

---

## 9. SISTEM KEAMANAN

| Role | Auth Method | Detail |
|---|---|---|
| Admin | Session cookie `wisuda.sid` | bcrypt, HttpOnly, SameSite=Lax |
| Client Tracking | Token `TRK-{id}-{HEX}` | Via WA link, tidak ada PIN |
| Client Seleksi | bookingId + tracking_token | Validasi per request |
| Portal FG | access_code `FG-XXXXXXXX` | JWT session |
| Booking Link | One-time token | Expire 24-48 jam |
| Drive Automation | Service Account JSON | Disimpan di DATA/ |

> **Tidak ada PIN** — sistem PIN dihapus total di v1.3. Semua akses client via tracking token.

---

## 10. GOOGLE DRIVE — DUA JENIS INTEGRASI

### A. Read-Only (Portfolio Import)
- Key: `GOOGLE_DRIVE_API_KEY`
- Service: `drive-importer.service.js`
- Flow: Admin paste URL highlight → scan file → download → Sharp WebP → portfolio_items

### B. Write (Auto-Create Folder)
- Auth: Service Account JSON
- Service: `drive-folder.service.js`
- Trigger: Saat `POST /api/admin/bookings/:id/verify-dp` sukses
- Config: Folder master di-share ke service account (Editor)
- Test: `GET /api/admin/settings/drive-test`

---

## 11. GALERI — PROXY ARCHITECTURE

```
Scan → fileId list di DB (tidak download file)
     ↓
Client request → /api/proxy/thumb/:fileId?sz=w400
     ├── HIT  → serve dari gallery_cache/
     └── MISS → fetch Google CDN → cache → serve
     ↓
Auto-retry: 3x (0.8s / 2.5s / 5s) — silent, no visual dimming
     ↓
Cache dihapus: highlight upload / deliver / clean-staging / client confirmed
```

---

## 12. CRON JOBS (03:00 WITA)

| Job | Fungsi |
|---|---|
| Data Retention | Purge notif >90h, token >30h, payment proof >90h |
| Auto Backup | Copy wisuda.db ke backups/ |
| Log Rotation | wisuda-builder.log max 5MB → rename .old |
| DB Optimize | PRAGMA optimize weekly |

---

## 13. DEPLOYMENT

```bash
# Clone
git clone https://github.com/armansyam/Wisuda.git && cd Wisuda

# Setup
cp .env.example .env  # edit sesuai kebutuhan
./deploy.sh           # install + build admin + start PM2

# Nginx + SSL
sudo certbot --nginx -d wisuda.domainanda.com

# PM2 Commands
pm2 logs wisuda-api
pm2 restart wisuda-api
pm2 status
```

---

## 14. CHECKLIST REKONSTRUKSI

- [ ] Clone repo dari GitHub
- [ ] `npm install` di root
- [ ] `cd admin-app && npm install && npm run build`
- [ ] Buat `.env` dari `.env.example` — isi semua variabel
- [ ] Buat folder `DATA/uploads/` dan `DATA/backups/`
- [ ] Google Drive API Key → `GOOGLE_DRIVE_API_KEY`
- [ ] Service Account JSON → `DATA/service-account.json`
- [ ] Buat folder "WISUDA CLIENTS" di Drive → share ke service account (Editor)
- [ ] Copy folder ID → `GOOGLE_DRIVE_MASTER_FOLDER_ID`
- [ ] `npm run seed` → data awal + admin default
- [ ] Login admin → **ganti password segera**
- [ ] Test Drive: `GET /api/admin/settings/drive-test`
- [ ] Setup Nginx + SSL Certbot
- [ ] `pm2 start ecosystem.config.js && pm2 save && pm2 startup`
- [ ] Verifikasi: `curl http://localhost:8081/api/health`

---

## 15. KEPUTUSAN ARSITEKTUR

| Keputusan | Alasan |
|---|---|
| SQLite bukan PostgreSQL | Cukup skala studio, zero config, self-contained |
| Zero-storage gallery | Hemat storage, cache thumbnail kecil (<50KB) |
| Service Account bukan OAuth2 | Fully automated 24/7, tidak perlu login ulang |
| Token-only (tidak ada PIN) | Satu mekanisme auth, tidak ada fallback exploitable |
| Proxy server thumbnail | Bebas CORS + disk cache terpusat |
| Sharp WebP portfolio | Kualitas terjaga <100KB, loading cepat |
| WAL mode SQLite | Read tidak blocking write, concurrency lebih baik |

---

*Wisuda Platform Master Blueprint v1.3.0 — AmsDev — 2026-07-25*
