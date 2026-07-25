# 📦 Wisuda Platform — Database Schema & Maintenance Guide

**Version:** 1.2  
**Last Updated:** 2026-07-25  
**DB Path:** `./DATA/wisuda.db`  
**Engine:** `better-sqlite3`  
**Mode:** SQLite WAL (`PRAGMA journal_mode = WAL`)

---

## 1. Schema & Structure Overview

Database disetup secara otomatis saat server dinyalakan melalui fungsi `migrate()` di [`src/config/database.js`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/config/database.js).

```sql
-- ============================================
-- MASTER DATA
-- ============================================

-- Admin & System Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  active BOOLEAN DEFAULT 1,
  avatar_url TEXT,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Master Paket Foto
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  fg_fee INTEGER NOT NULL,
  editor_fee INTEGER DEFAULT 0,
  includes TEXT,
  duration_hours INTEGER,
  active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  max_selected_photos INTEGER DEFAULT 15,
  highlight_count INTEGER DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Master Freelancer (Fotografer / Editor)
CREATE TABLE IF NOT EXISTS freelancers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  portfolio_url TEXT,
  specialties TEXT,
  rating REAL DEFAULT 5.0,
  active BOOLEAN DEFAULT 1,
  bank_account TEXT,
  id_card TEXT,
  access_code TEXT UNIQUE,
  pending_rate INTEGER DEFAULT NULL,
  default_rate INTEGER DEFAULT 0,
  city TEXT,
  agree_terms INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jadwal Ketersediaan FG
CREATE TABLE IF NOT EXISTS fg_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'available',
  booking_id INTEGER REFERENCES bookings(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fg_id, date)
);

-- System Settings & Configurations
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT
);

-- ============================================
-- TRANSACTIONAL DATA
-- ============================================

-- Inquiry / Lead Masuk
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  location TEXT,
  university TEXT,
  package_id INTEGER REFERENCES packages(id),
  source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'new', -- new, quoted, booked, expired, lost, archived
  notes TEXT,
  assigned_admin_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Token Akses Pilihan Paket Client
CREATE TABLE IF NOT EXISTS booking_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id),
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Data Booking
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER REFERENCES inquiries(id),
  package_id INTEGER NOT NULL REFERENCES packages(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  location TEXT,
  university TEXT,
  duration_hours INTEGER DEFAULT 2,
  shooting_time TEXT,
  total_price INTEGER NOT NULL,
  dp_amount INTEGER NOT NULL,
  dp_status TEXT DEFAULT 'unpaid', -- unpaid, uploaded, paid, refunded
  dp_verified_by INTEGER REFERENCES users(id),
  dp_verified_at DATETIME,
  dp_bukti_url TEXT,
  balance_amount INTEGER NOT NULL,
  balance_status TEXT DEFAULT 'unpaid', -- unpaid, uploaded, paid
  balance_verified_by INTEGER REFERENCES users(id),
  balance_verified_at DATETIME,
  balance_bukti_url TEXT,
  contract_signed BOOLEAN DEFAULT 0,
  contract_url TEXT,
  download_url TEXT,
  download_password TEXT,
  final_invoice_url TEXT,
  selected_photos TEXT,
  selection_status TEXT DEFAULT 'pending',
  highlight_drive_url TEXT,
  staging_drive_url TEXT,
  tracking_token TEXT UNIQUE,
  drive_parent_url TEXT,
  additional_photos INTEGER DEFAULT 0,
  portfolio_consent TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'confirmed', -- confirmed, shooting, delivered, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Penugasan Freelancer
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  editor_id INTEGER REFERENCES freelancers(id),
  fg_fee INTEGER,
  status TEXT DEFAULT 'assigned', -- assigned, confirmed, shooting, uploaded, qc, done
  brief TEXT,
  fg_confirmed_at DATETIME,
  shoot_start_at DATETIME,
  shoot_end_at DATETIME,
  upload_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deliverables (Hasil Foto)
CREATE TABLE IF NOT EXISTS deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  drive_folder_url TEXT,
  preview_url TEXT,
  raw_folder_url TEXT,
  delivery_type TEXT DEFAULT 'link',
  notes TEXT,
  total_photos INTEGER DEFAULT 0,
  selected_photos INTEGER DEFAULT 0,
  qc_status TEXT DEFAULT 'pending', -- pending, approved, revision, rejected
  qc_notes TEXT,
  client_approved BOOLEAN DEFAULT 0,
  client_approved_at DATETIME,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payout Fee Freelancer
CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  fg_fee INTEGER NOT NULL,
  editor_fee INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  deduction INTEGER DEFAULT 0,
  total_payout INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, failed
  paid_at DATETIME,
  transfer_ref TEXT,
  slip_url TEXT,
  period_start DATE,
  period_end DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Publik
CREATE TABLE IF NOT EXISTS portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id),
  client_initial TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  university TEXT,
  city TEXT,
  cover_photo_url TEXT NOT NULL,
  highlight_photos TEXT NOT NULL,
  fg_name TEXT,
  featured BOOLEAN DEFAULT 0,
  published BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

-- Tracking Pekerjaan Import Google Drive
CREATE TABLE IF NOT EXISTS portfolio_import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_initial TEXT,
  graduation_year INTEGER,
  university TEXT,
  drive_url TEXT,
  total_photos INTEGER DEFAULT 0,
  processed_photos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, importing, done, error
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Penampung Pendaftaran Freelancer Baru
CREATE TABLE IF NOT EXISTS freelancer_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  portfolio_url TEXT NOT NULL,
  specialties TEXT NOT NULL,
  city TEXT NOT NULL,
  gear_info TEXT,
  ktp_photo_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewer_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifikasi Log
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL, -- admin, fg, client
  user_id INTEGER,
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. ⚡ 16 Active B-Tree Performance Indexes

Seluruh index kritis telah aktif untuk menjamin query `dashboard`, `filter tanggal`, `payout`, dan `public portfolio` diproses di bawah **1 milidetik**:

```sql
CREATE UNIQUE INDEX idx_freelancers_access_code ON freelancers(access_code);
CREATE UNIQUE INDEX idx_bookings_tracking_token ON bookings(tracking_token);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_date ON inquiries(graduation_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(graduation_date);
CREATE INDEX idx_bookings_dp_status ON bookings(dp_status);
CREATE INDEX idx_bookings_balance_status ON bookings(balance_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_assignments_fg_status ON assignments(fg_id, status);
CREATE INDEX idx_deliverables_assignment ON deliverables(assignment_id);
CREATE INDEX idx_payouts_fg_period ON payouts(fg_id, period_start, period_end);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_portfolio_published ON portfolio_items(published, featured, sort_order);
CREATE INDEX idx_notifications_user ON notifications(user_type, user_id, read);
CREATE INDEX idx_fg_schedules_date ON fg_schedules(date, status);
```

---

## 3. ⚙️ Konfigurasi SQLite Pragma (High-Performance Settings)

Dipasang otomatis di `src/config/database.js`:

```javascript
db.pragma('journal_mode = WAL');       // Concurrent Read/Write tanpa blocking
db.pragma('synchronous = NORMAL');     // Kecepatan I/O optimal & aman dari crash
db.pragma('cache_size = -32000');      // 32MB Memory Cache untuk SQLite
db.pragma('temp_store = memory');      // Temporary tables di RAM
db.pragma('foreign_keys = ON');        // Integritas Relasi antar tabel
db.pragma('busy_timeout = 5000');      // Tunggu hingga 5 detik jika file teruji lock
```

---

## 4. 🧹 Maintenance Cron & Kebijakan Data Retention

Dijalankan secara otomatis setiap hari pada **03:00 WITA** via [`src/services/cron.service.js`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/services/cron.service.js):

| Sasaran Cleanup | Retensi | Tindakan |
|---|---|---|
| `notifications` | > 90 hari | Hapus log tua |
| `booking_tokens` | > 30 hari | Hapus token expired/terpakai |
| `portfolio_import_jobs` | > 30 hari | Hapus log pekerjaan impor yang selesai/error |
| **Data Layanan Client** (`bookings`) | > 30 hari setelah `completed` | Clear `tracking_token`, `download_password`, `selected_photos`, contract & invoice URLs. **Identitas & Data Keuangan TETAP Permanen**. |
| **Data Deliverables** | > 30 hari setelah `completed` | Clear link folder temporary `drive_folder_url`, `preview_url`, `raw_folder_url`. |
| **Bukti Transfer** (`payment_proofs/`) | > 90 hari setelah `completed` | Hapus berkas fisik gambar dari disk & set NULL `dp_bukti_url`/`balance_bukti_url`. |
| **SQLite Index Maintenance** | Setiap Hari 03:00 | Menjalankan `PRAGMA optimize` untuk merefresh statistik B-Tree index. |

---

*Wisuda Platform Database Architecture Specification v1.2*