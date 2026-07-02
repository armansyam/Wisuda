-- 003_seed_admin.sql — Default admin user
-- Password: admin123 (bcrypt hash)

INSERT INTO users (username, password_hash, name, role) VALUES
  ('admin', '$2b$10$sDE0le/xlpujFURIHwrqjOSFlPFSCoKwyV120SxrAk2tonjnP8.M6', 'Admin Utama', 'admin');