DROP TABLE IF EXISTS packages;
DROP TABLE IF EXISTS freelancers;
DROP TABLE IF EXISTS fg_schedules;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS inquiries;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS deliverables;
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS portfolio_items;
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
  rating REAL DEFAULT 5.0,
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
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'available',
  booking_id INTEGER REFERENCES bookings(id),
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

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER REFERENCES inquiries(id),
  package_id INTEGER NOT NULL REFERENCES packages(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  location TEXT,
  shooting_time TEXT,
  university TEXT,
  duration_hours INTEGER DEFAULT 2,
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
  staging_drive_url TEXT,
  tracking_token TEXT,
  drive_parent_url TEXT,
  additional_photos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id),
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  editor_id INTEGER REFERENCES freelancers(id),
  status TEXT DEFAULT 'assigned',
  brief TEXT,
  fg_fee INTEGER,
  fg_confirmed_at DATETIME,
  shoot_start_at DATETIME,
  shoot_end_at DATETIME,
  upload_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
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

CREATE TABLE portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

