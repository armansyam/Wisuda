-- 002_seed_packages.sql — Default packages

INSERT INTO packages (name, description, price, fg_fee, editor_fee, includes, duration_hours, sort_order) VALUES
  ('Paket Hemat', 'Foto digital saja, cocok untuk budget terbatas', 1500000, 500000, 100000, '{"digital": 50}', 4, 1),
  ('Paket Standar', 'Foto digital + 10 prints 4R', 2500000, 800000, 150000, '{"digital": 80, "prints": 10}', 5, 2),
  ('Paket Lengkap', 'Digital + prints + album fisik + pre-wisuda 1 jam', 4500000, 1500000, 300000, '{"digital": 120, "prints": 20, "album": 1, "prewisuda": 1}', 6, 3),
  ('Paket Premium', 'Full coverage 8 jam + 2 album + video highlight', 7500000, 2500000, 500000, '{"digital": 200, "prints": 30, "album": 2, "video_highlight": 1, "prewisuda": 2}', 8, 4);