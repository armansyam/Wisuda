# Wisuda Platform — Database Schema & Migrations

**Version:** 1.1  
**Last Updated:** 2026-07-22  
**DB Path:** `./DATA/wisuda.db`  
**Mode:** SQLite WAL (`PRAGMA journal_mode=WAL`)

---

## 1. Complete Schema

```sql
-- ============================================
-- MASTER DATA
-- ============================================

-- Paket Harga (Admin set)
CREATE TABLE packages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,                    -- "Paket Hemat", "Paket Lengkap"
  description TEXT,
  price INTEGER NOT NULL,                -- Harga jual ke client
  fg_fee INTEGER NOT NULL,               -- Fee FG (flat per paket)
  editor_fee INTEGER DEFAULT 0,          -- Fee editor (optional)
  includes TEXT,                         -- JSON: {"prints": 10, "digital": 50, "album": 1}
  duration_hours INTEGER,
  active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Freelance FG / Photographer
CREATE TABLE freelancers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  portfolio_url TEXT,                    -- Link Drive/Instagram
  specialties TEXT,                      -- JSON: ["wisuda", "prewisuda", "studio"]
  rating REAL DEFAULT 5.0,
  active BOOLEAN DEFAULT 1,
  bank_account TEXT,                     -- JSON: {"bank": "BCA", "norek": "123", "atas_nama": "Budi"}
  id_card TEXT,                          -- Path KTP
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kalender FG (Availability)
CREATE TABLE fg_schedules (
  id INTEGER PRIMARY KEY,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'available',       -- 'available', 'booked', 'blocked'
  booking_id INTEGER REFERENCES bookings(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fg_id, date)
);

-- Admin Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',             -- 'admin', 'operator'
  active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRANSACTIONAL DATA
-- ============================================

-- Inquiry / Lead
CREATE TABLE inquiries (
  id INTEGER PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  location TEXT,
  university TEXT,
  package_id INTEGER REFERENCES packages(id),
  source TEXT DEFAULT 'web',             -- 'web', 'wa', 'referral', 'walkin'
  status TEXT DEFAULT 'new',             -- new, quoted, booked, expired, lost, archived
  notes TEXT,
  assigned_admin_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Booking (Confirmed)
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  inquiry_id INTEGER REFERENCES inquiries(id),
  package_id INTEGER NOT NULL REFERENCES packages(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  location TEXT,
  shooting_time TEXT,                    -- "08:00-12:00"
  total_price INTEGER NOT NULL,
  dp_amount INTEGER NOT NULL,
  dp_status TEXT DEFAULT 'unpaid',       -- unpaid, paid, refunded
  dp_verified_by INTEGER REFERENCES users(id),
  dp_verified_at DATETIME,
  dp_bukti_url TEXT,
  balance_amount INTEGER NOT NULL,
  balance_status TEXT DEFAULT 'unpaid',  -- unpaid, paid
  balance_verified_by INTEGER REFERENCES users(id),
  balance_verified_at DATETIME,
  balance_bukti_url TEXT,
  contract_signed BOOLEAN DEFAULT 0,
  contract_url TEXT,
  status TEXT DEFAULT 'confirmed',       -- confirmed, shooting, delivered, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assignment (FG + Editor)
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  editor_id INTEGER REFERENCES freelancers(id),
  status TEXT DEFAULT 'assigned',        -- assigned, confirmed, shooting, uploaded, qc, done
  brief TEXT,                            -- Instruksi khusus client
  fg_confirmed_at DATETIME,
  shoot_start_at DATETIME,
  shoot_end_at DATETIME,
  upload_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deliverables (Hasil Foto)
CREATE TABLE deliverables (
  id INTEGER PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  drive_folder_url TEXT,                 -- Link Google Drive/OneDrive
  preview_url TEXT,                      -- Link preview (Pixieset/Drive)
  total_photos INTEGER DEFAULT 0,
  selected_photos INTEGER DEFAULT 0,
  qc_status TEXT DEFAULT 'pending',      -- pending, approved, revision, rejected
  qc_notes TEXT,
  client_approved BOOLEAN DEFAULT 0,
  client_approved_at DATETIME,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payout ke FG
CREATE TABLE payouts (
  id INTEGER PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  fg_fee INTEGER NOT NULL,
  editor_fee INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  deduction INTEGER DEFAULT 0,
  total_payout INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',         -- pending, paid, failed
  paid_at DATETIME,
  transfer_ref TEXT,                     -- Nomor referensi transfer manual
  slip_url TEXT,                         -- Path slip PDF
  period_start DATE,
  period_end DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Public
CREATE TABLE portfolio_items (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  client_initial TEXT NOT NULL,          -- "A.S."
  graduation_year INTEGER NOT NULL,      -- 2024
  university TEXT,                       -- "Unhas", "UNM", "Poltek"
  cover_photo_url TEXT NOT NULL,         -- Thumbnail utama
  highlight_photos TEXT NOT NULL,        -- JSON array max 10 URL
  fg_name TEXT,                          -- Credit FG
  featured BOOLEAN DEFAULT 0,
  published BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifikasi Log
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_type TEXT NOT NULL,               -- 'admin', 'fg', 'client'
  user_id INTEGER,                       -- fg_id atau client phone hash
  type TEXT NOT NULL,                    -- 'new_inquiry', 'booking_confirmed', etc
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings / Config
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT
);

-- Default settings
INSERT INTO settings (key, value, description) VALUES
  ('dp_percentage', '50', 'Persentase DP dari total harga'),
  ('upload_deadline_days', '1', 'Deadline upload foto setelah shoot (hari)'),
  ('auto_approve_hours', '48', 'Auto approve delivery setelah X jam'),
  ('max_photos_per_fg_per_day', '2', 'Max booking per FG per hari'),
  ('company_name', 'Sorehari Wisuda', 'Nama perusahaan di kontrak/invoice'),
  ('company_address', '', 'Alamat perusahaan'),
  ('company_phone', '', 'Telepon perusahaan'),
  ('bank_accounts', '[]', 'JSON array rekening pembayaran'),
  ('wa_templates', '{}', 'JSON template WA per trigger');

-- Indexes for performance
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_date ON inquiries(graduation_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(graduation_date);
CREATE INDEX idx_assignments_fg_date ON assignments(fg_id, status);
CREATE INDEX idx_deliverables_assignment ON deliverables(assignment_id);
CREATE INDEX idx_payouts_fg_period ON payouts(fg_id, period_start, period_end);
CREATE INDEX idx_portfolio_published ON portfolio_items(published, featured, sort_order);
CREATE INDEX idx_notifications_user ON notifications(user_type, user_id, read);
CREATE INDEX idx_fg_schedules_date ON fg_schedules(date, status);
```

---

## 2. Migration System (Node.js)

### File: `src/config/database.js`

```js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || '/DATA/AppData/wisuda.db';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Migration tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function getAppliedMigrations() {
  return db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(r => r.version);
}

function runMigration(version, sql) {
  const transaction = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
  });
  transaction();
  console.log(`[Migration] Applied: ${version}`);
}

function migrate() {
  const applied = getAppliedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of files) {
    const version = file.replace('.sql', '');
    if (!applied.includes(version)) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      runMigration(version, sql);
    }
  }
  console.log('[Migration] All migrations applied');
}

// Run on startup
migrate();

module.exports = { db, migrate };
```

### Migration Files (in `src/migrations/`)

**001_initial_schema.sql** — All CREATE TABLE statements above

**002_seed_packages.sql**
```sql
INSERT INTO packages (name, description, price, fg_fee, editor_fee, includes, duration_hours, sort_order) VALUES
  ('Paket Hemat', 'Foto digital saja, cocok untuk budget terbatas', 1500000, 500000, 100000, '{"digital": 50}', 4, 1),
  ('Paket Standar', 'Foto digital + 10 prints 4R', 2500000, 800000, 150000, '{"digital": 80, "prints": 10}', 5, 2),
  ('Paket Lengkap', 'Digital + prints + album fisik + pre-wisuda 1 jam', 4500000, 1500000, 300000, '{"digital": 120, "prints": 20, "album": 1, "prewisuda": 1}', 6, 3),
  ('Paket Premium', 'Full coverage 8 jam + 2 album + video highlight', 7500000, 2500000, 500000, '{"digital": 200, "prints": 30, "album": 2, "video_highlight": 1, "prewisuda": 2}', 8, 4);
```

**003_seed_admin.sql**
```sql
-- Password: admin123 (bcrypt hash)
INSERT INTO users (username, password_hash, name, role) VALUES
  ('admin', '$2b$10$X7H5K8vL9mN2pQ3rS4tU5uV6wX7yZ8aB9cD0eF1gH2iJ3kL4mN5oP6', 'Admin Utama', 'admin');
```

**004_seed_settings.sql** — Already in schema (settings table defaults)

---

## 3. Seed Data Script

### File: `scripts/seed.js`

```js
#!/usr/bin/env node
const { db } = require('../src/config/database');

console.log('[Seed] Inserting sample data...');

// Sample freelancers
const freelancers = [
  { name: 'Budi Santoso', phone: '6281234567890', email: 'budi@photo.com', specialties: '["wisuda", "studio"]', bank_account: '{"bank": "BCA", "norek": "1234567890", "atas_nama": "Budi Santoso"}' },
  { name: 'Siti Rahayu', phone: '6281234567891', email: 'siti@photo.com', specialties: '["wisuda", "prewisuda", "outdoor"]', bank_account: '{"bank": "Mandiri", "norek": "0987654321", "atas_nama": "Siti Rahayu"}' },
  { name: 'Ahmad Fauzi', phone: '6281234567892', email: 'ahmad@photo.com', specialties: '["wisuda", "video"]', bank_account: '{"bank": "BRI", "norek": "1122334455", "atas_nama": "Ahmad Fauzi"}' }
];

const insertFg = db.prepare(`INSERT INTO freelancers (name, phone, email, specialties, bank_account) VALUES (?, ?, ?, ?, ?)`);
for (const fg of freelancers) {
  insertFg.run(fg.name, fg.phone, fg.email, fg.specialties, fg.bank_account);
}

// Sample FG schedules for July 2026
const insertSched = db.prepare(`INSERT INTO fg_schedules (fg_id, date, status) VALUES (?, ?, 'available')`);
const start = new Date('2026-07-01');
for (let i = 0; i < 31; i++) {
  const date = new Date(start);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  for (let fgId = 1; fgId <= 3; fgId++) {
    insertSched.run(fgId, dateStr);
  }
}

console.log('[Seed] Done');
```

---

## 4. Integrity Checks

```sql
-- Run periodically via cron
-- 1. Orphaned assignments (no booking)
SELECT a.* FROM assignments a LEFT JOIN bookings b ON a.booking_id = b.id WHERE b.id IS NULL;

-- 2. Bookings without assignment but status=shooting
SELECT b.* FROM bookings b LEFT JOIN assignments a ON b.id = a.booking_id 
WHERE b.status = 'shooting' AND a.id IS NULL;

-- 3. Deliverables without assignment
SELECT d.* FROM deliverables d LEFT JOIN assignments a ON d.assignment_id = a.id WHERE a.id IS NULL;

-- 4. FG double-booked same date
SELECT fg_id, date, COUNT(*) as cnt FROM fg_schedules WHERE status = 'booked' GROUP BY fg_id, date HAVING cnt > 1;

-- 5. Inquiries stuck in quoted > 7 days
SELECT * FROM inquiries WHERE status = 'quoted' AND datetime(created_at) < datetime('now', '-7 days');

-- 6. Deliverables pending QC > 3 days
SELECT d.*, a.fg_id FROM deliverables d JOIN assignments a ON d.assignment_id = a.id 
WHERE d.qc_status = 'pending' AND datetime(d.created_at) < datetime('now', '-3 days');

-- 7. Payouts pending > 14 days
SELECT * FROM payouts WHERE status = 'pending' AND datetime(created_at) < datetime('now', '-14 days');
```

---

## 5. Backup Strategy

```bash
#!/bin/bash
# /root/scripts/backup-wisuda.sh
DATE=$(date +%Y%m%d)
DB_PATH="/DATA/AppData/wisuda.db"
BACKUP_DIR="/DATA/backups"
mkdir -p $BACKUP_DIR

# SQLite backup (online, consistent)
sqlite3 $DB_PATH ".backup $BACKUP_DIR/wisuda_$DATE.db"

# Compress
gzip $BACKUP_DIR/wisuda_$DATE.db

# Keep last 30 days
find $BACKUP_DIR -name "wisuda_*.db.gz" -mtime +30 -delete

echo "Backup saved: $BACKUP_DIR/wisuda_$DATE.db.gz"
```

Cron: `0 2 * * * /root/scripts/backup-wisuda.sh >> /var/log/wisuda-backup.log 2>&1`

---

## 6. Environment Variables

```env
# .env
DB_PATH=/DATA/AppData/wisuda.db
UPLOAD_PATH=/DATA/AppData/wisuda-uploads
PORT=8081
NODE_ENV=production
SESSION_SECRET=your-strong-random-secret-here
BCRYPT_ROUNDS=10
TZ=Asia/Makassar
```

---

## 7. Health Check Query

```js
// GET /health
const checks = {
  db: db.prepare('SELECT 1 as ok').get().ok === 1,
  wal_mode: db.pragma('journal_mode') === 'wal',
  fk_enabled: db.pragma('foreign_keys') === 1,
  tables: db.prepare("SELECT count(*) as cnt FROM sqlite_master WHERE type='table'").get().cnt >= 13
};
const healthy = Object.values(checks).every(v => v === true);
res.status(healthy ? 200 : 503).json({ healthy, checks, timestamp: new Date().toISOString() });
```