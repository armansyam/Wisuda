# ⚙️ Wisuda Platform — Technical Guide: DB Schema, REST API & Deployment

**Version:** 1.4.2  
**Last Updated:** 2026-07-31  
**Scope:** Complete Technical Reference (SQLite Database Schema, Settings Registry, Native Better-Sqlite3 Session Store, Full REST API Endpoint Specifications, and Production Deployment Guide)

---

# BAGIAN 1: DATABASE SCHEMA & SETTINGS REGISTRY

## 1. Schema & Engine Setup
- **File DB:** `./DATA/wisuda.db`
- **Engine:** `better-sqlite3` WAL Mode (`PRAGMA journal_mode = WAL`)
- **Auto-migration:** Dijalankan otomatis saat server start via `src/config/database.js`.
- **Session Storage:** Custom Native `BetterSqliteStore` (`src/config/session-store.js`) menggantikan `connect-sqlite3` legacy. Menghindari crash native C++ binding pada Linux PM2 dengan memisahkan statement `.exec()`.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -32000;

-- 1. USERS (Admin & Staff)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT, role TEXT DEFAULT 'admin',
  active BOOLEAN DEFAULT 1, avatar_url TEXT,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 1b. SESSIONS (Native Express Session Table)
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
```

## 2. Settings Registry (`settings` table)
| Key | Default Value | Deskripsi |
|---|---|---|
| `company_name` | `Wisuda Platform` | Nama brand studio / perusahaan |
| `enable_freelance_portal` | `0` | Mode Sakelar Akses Portal Freelance (`0` = Full Admin Mode, `1` = Portal Active) |
| `admin_phone` | `628xxxxxxxxxx` | Nomor WhatsApp Gateway / Admin |
| `dp_percentage` | `50` | Persentase nilai DP standar (%) |
| `session_timeout_minutes` | `1440` | Dynamic Admin Session Timeout (menit) |

-- 2. PACKAGES (Master Paket Foto)
CREATE TABLE IF NOT EXISTS packages (
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

-- 3. FREELANCERS (Mitra Fotografer / Editor)
CREATE TABLE IF NOT EXISTS freelancers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  email TEXT, portfolio_url TEXT, specialties TEXT,
  rating REAL DEFAULT 5.0, active BOOLEAN DEFAULT 1,
  bank_account TEXT, id_card TEXT,
  access_code TEXT UNIQUE,
  pending_rate INTEGER DEFAULT NULL,
  default_rate INTEGER DEFAULT 0,
  city TEXT, agree_terms INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. INQUIRIES (Lead Masuk)
CREATE TABLE IF NOT EXISTS inquiries (
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

-- 5. BOOKINGS (Transaksi & Booking Klien)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER REFERENCES inquiries(id),
  package_id INTEGER NOT NULL REFERENCES packages(id),
  client_name TEXT NOT NULL, client_phone TEXT NOT NULL,
  client_email TEXT, graduation_date DATE NOT NULL,
  location TEXT, university TEXT, duration_hours INTEGER DEFAULT 2,
  shooting_time TEXT, total_price INTEGER NOT NULL,
  dp_amount INTEGER NOT NULL, dp_status TEXT DEFAULT 'unpaid', -- unpaid, uploaded, paid, refunded
  dp_verified_by INTEGER REFERENCES users(id), dp_verified_at DATETIME, dp_bukti_url TEXT,
  balance_amount INTEGER NOT NULL, balance_status TEXT DEFAULT 'unpaid', -- unpaid, uploaded, paid
  balance_verified_by INTEGER REFERENCES users(id), balance_verified_at DATETIME, balance_bukti_url TEXT,
  contract_signed BOOLEAN DEFAULT 0, contract_url TEXT,
  download_url TEXT, download_password TEXT, final_invoice_url TEXT,
  selected_photos TEXT, selection_status TEXT DEFAULT 'pending',
  highlight_drive_url TEXT, staging_drive_url TEXT,
  tracking_token TEXT UNIQUE, drive_parent_url TEXT,
  additional_photos INTEGER DEFAULT 0, portfolio_consent TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'confirmed', -- confirmed, shooting, delivered, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. ASSIGNMENTS (Penugasan Fotografer)
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  editor_id INTEGER REFERENCES freelancers(id),
  fg_fee INTEGER, status TEXT DEFAULT 'assigned', -- assigned, confirmed, shooting, uploaded, qc, done
  brief TEXT, fg_confirmed_at DATETIME, shoot_start_at DATETIME, shoot_end_at DATETIME,
  upload_deadline DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. PORTFOLIO_ITEMS (Galeri Portofolio Publik)
CREATE TABLE IF NOT EXISTS portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, client_initial TEXT,
  graduation_year INTEGER, university TEXT,
  package_id INTEGER REFERENCES packages(id),
  cover_photo_url TEXT NOT NULL, highlight_photos TEXT,
  drive_folder_url TEXT, view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0, featured BOOLEAN DEFAULT 0,
  published BOOLEAN DEFAULT 1, sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. SETTINGS (Sistem Konfigurasi Dinamis)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT
);
```

## 2. Dynamic Settings Registry Table

| Key Setting | Tipe Data | Deskripsi & Fungsi Utama |
|---|---|---|
| `company_name` | String | Nama resmi brand / studio foto |
| `dp_percentage` | Number | Persentase DP default (misal: `50`) |
| `drive_retention_months` | Number | Masa retensi file di Drive dalam bulan (misal: `1`) |
| `max_daily_capacity` | Number | Batas kuota booking harian maksimal per tanggal wisuda |
| `google_oauth_client_id` | String | Google OAuth Client ID (Disimpan setelah probe test lolos) |
| `google_oauth_client_secret` | String | Google OAuth Client Secret (Disimpan setelah probe test lolos) |
| `google_oauth_tokens` | JSON String | Token akses OAuth2 Gmail Studio terenkripsi |
| `google_drive_master_folder_id` | String | ID Master Root Folder Google Drive |
| `bank_accounts` | JSON Array | Daftar opsi rekening bank resmi studio untuk transfer |
| `watermark_enabled` | Boolean | Status penayangan developer watermark bubble |

---

# BAGIAN 2: REST API SPECIFICATION MATRIX

## 1. Base URL & Authentication Mechanisms
- **Base URL:** `http://localhost:8081` (Dev) / `https://wisuda.domain.com` (Prod)
- **Admin Auth:** Session Cookie `wisuda.sid` (`HttpOnly`, `SameSite=Lax`)
- **FG Auth:** `POST /api/freelance-portal/login` via `access_code`
- **Client Auth:** Tracking Token `TRK-xxx` via URL

## 2. Complete REST API Matrix

| Endpoint | Method | Access Role | Fungsi & Respon Utama |
|---|---|---|---|
| `/api/health` | GET | Public | Healthcheck database SQLite & status server |
| `/api/public/packages` | GET | Public | Ambil daftar paket foto aktif |
| `/api/public/inquiry` | POST | Public | Submit form reservasi inquiry (dengan check kapasitas harian) |
| `/api/public/capacity-check` | GET | Public | Cek ketersediaan kuota booking untuk tanggal wisuda |
| `/api/public/tracking/:token` | GET | Public | Ambil status progres & token unlock link Drive foto final |
| `/api/public/selection/:booking_id` | GET | Public | Ambil daftar foto staging untuk Touch Lightbox galeri |
| `/api/public/selection/:booking_id/submit` | POST | Public | Submit daftar foto pilihan client |
| `/api/proxy/thumb/:fileId` | GET | Public | Proxy thumbnail GDrive dengan disk cache (`sz=w400`/`w800`) |
| `/api/admin/dashboard/stats` | GET | Admin | Ambil statistik ringkasan dashboard |
| `/api/admin/bookings` | GET/POST | Admin | Kelola daftar booking & verifikasi DP/Pelunasan |
| `/api/admin/bookings/:id/verify-dp` | POST | Admin | Verifikasi DP & trigger pembuat folder Drive otomatis |
| `/api/admin/bookings/:id/transfer-drive-ownership` | POST | Admin | Transfer kepemilikan folder Drive client |
| `/api/admin/settings` | GET/PUT | Admin | Ambil & perbarui konfigurasi sistem |
| `/api/admin/settings/verify-oauth-credentials` | POST | Admin | Probe verification test Client ID & Secret ke API Google |
| `/api/admin/auth/google` | GET | Admin | Inisiasi alur otorisasi Step 2 Google OAuth |
| `/api/admin/auth/google/callback` | GET | Admin | Callback otorisasi OAuth Google Cloud Console |
| `/api/admin/settings/drive-config` | GET | Admin | Ambil konfigurasi ringkasan Drive |
| `/api/admin/settings/drive-status` | GET | Admin | Comprehensive status Smart Hybrid Drive (OAuth + Bot) |
| `/api/admin/settings/drive-disconnect` | POST | Admin | Putuskan koneksi OAuth Gmail Studio |
| `/api/admin/settings/drive-test` | GET | Admin | Tes koneksi Master Folder ID Google Drive |
| `/api/admin/assignments` | GET/POST | Admin | Penugasan fotografer & jadwal kalender |
| `/api/admin/payouts` | GET/POST | Admin | Eksekusi payroll fee & generate slip PDF FG |
| `/api/admin/portfolio/import-drive` | POST | Admin | Trigger background job import portfolio Drive via Sharp WebP |
| `/api/freelance-portal/login` | POST | FG | Login portal fotografer via `access_code` |
| `/api/freelance-portal/assignments` | GET | FG | Ambil daftar job penugasan FG aktif |
| `/api/freelance-portal/profile` | GET/PUT | FG | Ambil & ajukan perubahan tarif (`pending_rate`) |
| `/api/freelance-portal/checkin` | POST | FG | Check-in / check-out sesi foto hari H |

---

# BAGIAN 3: PRODUCTION DEPLOYMENT GUIDE

## 1. Automated PM2 Deployment Script
Gunakan script [`deploy.sh`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/deploy.sh) untuk deployment otomatis di VPS/Dedicated Server:
```bash
chmod +x deploy.sh
./deploy.sh
```

## 2. Docker Compose Deployment
```bash
# Build & Jalankan Container
docker-compose up -d --build

# Cek Health status
docker-compose ps
```

## 3. Mandatory Environment Variables (`.env`)
```ini
PORT=8081
NODE_ENV=production
SESSION_SECRET=auto_generated_random_64_chars
JWT_SECRET=auto_generated_random_64_chars
CORS_ORIGINS=https://wisuda.id,https://admin.wisuda.id
DB_PATH=./DATA/wisuda.db
UPLOAD_PATH=./DATA/uploads
TZ=Asia/Makassar
GOOGLE_DRIVE_MASTER_FOLDER_ID=1xxx_your_master_folder_id
GOOGLE_SERVICE_ACCOUNT_PATH=./DATA/service-account.json
ENABLE_DEVELOPER_WATERMARK=true
```

## 4. Graceful Shutdown & Log Management
- Express server menangani signal `SIGTERM` / `SIGINT` dengan mengeksekusi `PRAGMA wal_checkpoint(TRUNCATE)` untuk mencegah integritas DB SQLite terganggu.
- Log aplikasi `DATA/wisuda-builder.log` otomatis di-rotate bila mencapai 5MB.

---

*Wisuda Technical Guide v1.4.2 — Updated 2026-07-31*
