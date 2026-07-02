-- ============================================
-- 001_initial_schema.sql — Wisuda Platform
-- ============================================

-- MASTER DATA

-- Paket Harga
CREATE TABLE packages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  fg_fee INTEGER NOT NULL,
  editor_fee INTEGER DEFAULT 0,
  includes TEXT,
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
  portfolio_url TEXT,
  specialties TEXT,
  rating REAL DEFAULT 5.0,
  active BOOLEAN DEFAULT 1,
  bank_account TEXT,
  id_card TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kalender FG (Availability)
CREATE TABLE fg_schedules (
  id INTEGER PRIMARY KEY,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'available',
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
  role TEXT DEFAULT 'admin',
  active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONAL DATA

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
  source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'new',
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
  shooting_time TEXT,
  total_price INTEGER NOT NULL,
  dp_amount INTEGER NOT NULL,
  dp_status TEXT DEFAULT 'unpaid',
  dp_verified_by INTEGER REFERENCES users(id),
  dp_verified_at DATETIME,
  dp_bukti_url TEXT,
  balance_amount INTEGER NOT NULL,
  balance_status TEXT DEFAULT 'unpaid',
  balance_verified_by INTEGER REFERENCES users(id),
  balance_verified_at DATETIME,
  balance_bukti_url TEXT,
  contract_signed BOOLEAN DEFAULT 0,
  contract_url TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assignment (FG + Editor)
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  editor_id INTEGER REFERENCES freelancers(id),
  status TEXT DEFAULT 'assigned',
  brief TEXT,
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
  drive_folder_url TEXT,
  preview_url TEXT,
  total_photos INTEGER DEFAULT 0,
  selected_photos INTEGER DEFAULT 0,
  qc_status TEXT DEFAULT 'pending',
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
  status TEXT DEFAULT 'pending',
  paid_at DATETIME,
  transfer_ref TEXT,
  slip_url TEXT,
  period_start DATE,
  period_end DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Public
CREATE TABLE portfolio_items (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  client_initial TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  university TEXT,
  cover_photo_url TEXT NOT NULL,
  highlight_photos TEXT NOT NULL,
  fg_name TEXT,
  featured BOOLEAN DEFAULT 0,
  published BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifikasi Log
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_type TEXT NOT NULL,
  user_id INTEGER,
  type TEXT NOT NULL,
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

-- Indexes
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_date ON inquiries(graduation_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(graduation_date);
CREATE INDEX idx_assignments_fg_date ON assignments(fg_id, status);
CREATE INDEX idx_deliverables_assignment ON deliverables(assignment_id);
CREATE INDEX idx_payouts_fg_period ON payouts(fg_id, period_start, period_end);
CREATE INDEX idx_portfolio_published ON portfolio_items(published, featured, sort_order);
CREATE INDEX idx_notifications_user_notifications ON notifications(user_type, user_id, read);
CREATE INDEX idx_fg_schedules_date ON fg_schedules(date, status);