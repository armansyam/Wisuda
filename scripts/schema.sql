DROP TABLE IF EXISTS packages;
DROP TABLE IF EXISTS freelancers;
DROP TABLE IF EXISTS fg_schedules;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS inquiries;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS booking_tokens;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS deliverables;
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS portfolio_items;
DROP TABLE IF EXISTS portfolio_import_jobs;
DROP TABLE IF EXISTS freelancer_applications;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS reschedule_requests;
DROP TABLE IF EXISTS booking_moodboards;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS settings;

CREATE TABLE packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  fg_fee INTEGER NOT NULL,
  editor_fee INTEGER DEFAULT 0,
  includes TEXT,
  duration_hours INTEGER,
  max_selected_photos INTEGER DEFAULT 15,
  highlight_count INTEGER DEFAULT 5,
  category TEXT DEFAULT 'Standard',
  active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE freelancers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  portfolio_url TEXT,
  specialties TEXT,
  city TEXT,
  rating REAL DEFAULT NULL,
  active BOOLEAN DEFAULT 1,
  bank_account TEXT,
  id_card TEXT,
  access_code TEXT UNIQUE,
  default_rate INTEGER DEFAULT 0,
  pending_rate INTEGER DEFAULT NULL,
  agree_terms INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fg_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'available',
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fg_id, date)
);

CREATE TABLE users (
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

CREATE TABLE inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  shooting_time TEXT DEFAULT '09:00',
  city TEXT,
  location TEXT,
  university TEXT,
  transport_charge INTEGER DEFAULT 0,
  transport_charge_notes TEXT,
  ignore_transport_charge INTEGER DEFAULT 0,
  package_id INTEGER REFERENCES packages(id),
  source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'new',
  notes TEXT,
  assigned_admin_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
  package_id INTEGER NOT NULL REFERENCES packages(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  city TEXT,
  location TEXT,
  shooting_time TEXT,
  university TEXT,
  duration_hours INTEGER DEFAULT 2,
  transport_charge INTEGER DEFAULT 0,
  transport_charge_notes TEXT,
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
  download_url TEXT,
  download_password TEXT,
  final_invoice_url TEXT,
  selected_photos TEXT,
  selection_status TEXT DEFAULT 'pending',
  highlight_drive_url TEXT,
  highlight_drive_url_unlocked TEXT,
  staging_drive_url TEXT,
  moodboard_drive_url TEXT,
  staging_files TEXT,
  tracking_token TEXT,
  drive_parent_url TEXT,
  additional_photos INTEGER DEFAULT 0,
  portfolio_consent TEXT DEFAULT 'pending',
  drive_total_bytes INTEGER DEFAULT 0,
  folder_total_size_formatted TEXT,
  drive_expiry_date DATE,
  drive_cleanup_status TEXT DEFAULT 'active',
  drive_cleanup_notes TEXT,
  client_confirmed_at DATETIME,
  max_selected_photos INTEGER,
  staged_photo_count INTEGER DEFAULT 0,
  highlight_photo_count INTEGER DEFAULT 0,
  final_photo_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  editor_id INTEGER REFERENCES freelancers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'assigned',
  brief TEXT,
  fg_fee INTEGER,
  offer_status TEXT DEFAULT 'accepted',
  decline_reason TEXT,
  fg_confirmed_at DATETIME,
  shoot_start_at DATETIME,
  shoot_end_at DATETIME,
  upload_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  drive_folder_url TEXT,
  raw_folder_url TEXT,
  preview_url TEXT,
  total_photos INTEGER DEFAULT 0,
  selected_photos INTEGER DEFAULT 0,
  qc_status TEXT DEFAULT 'pending',
  qc_notes TEXT,
  client_approved BOOLEAN DEFAULT 0,
  client_approved_at DATETIME,
  delivered_at DATETIME,
  delivery_type TEXT DEFAULT 'link',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
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

CREATE TABLE portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  client_initial TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  university TEXT,
  city TEXT,
  drive_subfolder_id TEXT,
  cover_photo_url TEXT NOT NULL,
  highlight_photos TEXT NOT NULL,
  fg_name TEXT,
  rating REAL DEFAULT NULL,
  feedback_notes TEXT,
  featured BOOLEAN DEFAULT 0,
  published BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portfolio_import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_initial TEXT,
  graduation_year INTEGER,
  university TEXT,
  drive_url TEXT,
  total_photos INTEGER DEFAULT 0,
  processed_photos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE freelancer_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  portfolio_url TEXT NOT NULL,
  specialties TEXT NOT NULL,
  city TEXT NOT NULL,
  gear_info TEXT,
  ktp_photo_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT DEFAULT 'read',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  active INTEGER DEFAULT 1
);

CREATE TABLE reschedule_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by TEXT DEFAULT 'client',
  old_graduation_date DATE NOT NULL,
  old_shooting_time TEXT,
  new_graduation_date DATE NOT NULL,
  new_shooting_time TEXT NOT NULL,
  reason TEXT,
  fg_conflict_status TEXT DEFAULT 'unknown',
  status TEXT DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_moodboards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  items TEXT NOT NULL DEFAULT '[]',
  cleaned_up INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL,
  user_id INTEGER,
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT
);

-- default settings
INSERT INTO settings (key, value, description) VALUES
  ('dp_percentage', '50', 'Persentase DP dari total harga'),
  ('upload_deadline_days', '1', 'Deadline upload foto setelah shoot (hari)'),
  ('auto_approve_hours', '48', 'Auto approve delivery setelah X jam'),
  ('max_photos_per_fg_per_day', '2', 'Max booking per FG per hari'),
  ('company_name', 'AmsDev Wisuda', 'Nama perusahaan di kontrak/invoice'),
  ('company_address', '', 'Alamat perusahaan'),
  ('company_phone', '', 'Telepon perusahaan'),
  ('bank_accounts', '[{"bank":"BCA","norek":"1234567890","atas_nama":"AmsDev Wisuda"},{"bank":"Mandiri","norek":"0987654321","atas_nama":"AmsDev Wisuda"}]', 'JSON array rekening pembayaran'),
  ('wa_templates', '{}', 'JSON template WA per trigger'),
  ('supported_cities', '["Makassar", "Jakarta", "Surabaya", "Yogyakarta", "Bandung"]', 'Daftar kota layanan operasional (JSON array)');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_city ON inquiries(city);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dp_status ON bookings(dp_status);
CREATE INDEX IF NOT EXISTS idx_bookings_balance_status ON bookings(balance_status);
CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_tracking_token ON bookings(tracking_token);
CREATE INDEX IF NOT EXISTS idx_freelancers_city ON freelancers(city);
CREATE UNIQUE INDEX IF NOT EXISTS idx_freelancers_access_code ON freelancers(access_code);
CREATE INDEX IF NOT EXISTS idx_assignments_booking_id ON assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_assignments_fg_id ON assignments(fg_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_type, user_id);
