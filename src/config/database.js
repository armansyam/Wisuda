const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const config = require('./settings');

let db = null;

function getDb() {
  if (!db) {
    const dbPath = config.dbPath;
    const dir = path.dirname(dbPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -32000'); // 32MB cache
    db.pragma('temp_store = memory');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

function migrate() {
  const dbPath = config.dbPath;

  const db = getDb();
  const schemaPath = path.join(__dirname, '../../scripts/schema.sql');
  
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Filter out DROP statements so data persists across restarts
    const statements = schema.split(';')
      .map(s => s.trim())
      .filter(s => s && !s.toLowerCase().startsWith('drop') && !s.toLowerCase().startsWith('--'))
      .map(s => s.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS '));
    
    const migration = db.transaction(() => {
      // 1. Eksekusi skema dasar dari file schema.sql
      statements.forEach(stmt => {
        if (stmt.trim()) {
          try { db.exec(stmt); } catch(e) { if (!e.message.includes('already exists') && !e.message.includes('no such column')) throw e; }
        }
      });

      // 2. Buat tabel token untuk tautan konfirmasi booking client
      db.exec(`
        CREATE TABLE IF NOT EXISTS booking_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inquiry_id INTEGER NOT NULL REFERENCES inquiries(id),
          token TEXT NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Tambahkan kolom pendukung pada tabel inquiries & bookings (jika belum ada)
      try { db.exec("ALTER TABLE inquiries ADD COLUMN city TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN city TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN university TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN duration_hours INTEGER DEFAULT 2;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN download_url TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN download_password TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN final_invoice_url TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN selected_photos TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN selection_status TEXT DEFAULT 'pending';"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN highlight_drive_url TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN staging_drive_url TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN staging_files TEXT;"); } catch(e) {} // JSON [{fileId, filename}] — zero-storage staging gallery
      try { db.exec("ALTER TABLE bookings ADD COLUMN tracking_token TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN drive_parent_url TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN additional_photos INTEGER DEFAULT 0;"); } catch(e) {}
      try { db.exec("ALTER TABLE bookings ADD COLUMN portfolio_consent TEXT DEFAULT 'pending';"); } catch(e) {}
      try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_tracking_token ON bookings(tracking_token);"); } catch(e) {}

      // Auto-populate tracking_token for legacy bookings
      try {
        const crypto = require('crypto');
        const legacyBookings = db.prepare("SELECT id FROM bookings WHERE tracking_token IS NULL OR tracking_token = ''").all();
        legacyBookings.forEach(b => {
          const token = `TRK-${b.id}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
          db.prepare("UPDATE bookings SET tracking_token = ? WHERE id = ?").run(token, b.id);
        });
      } catch(e) {}

      // 3b. Tambahkan kolom pendukung pada tabel packages (jika belum ada)
      try { db.exec("ALTER TABLE packages ADD COLUMN max_selected_photos INTEGER DEFAULT 15;"); } catch(e) {}
      try { db.exec("ALTER TABLE packages ADD COLUMN highlight_count INTEGER DEFAULT 5;"); } catch(e) {}

      // 4. Tambahkan kolom pendukung pada tabel freelancers (jika belum ada)
      try { db.exec("ALTER TABLE freelancers ADD COLUMN access_code TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE freelancers ADD COLUMN pending_rate INTEGER DEFAULT NULL;"); } catch(e) {}
      try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_freelancers_access_code ON freelancers(access_code);"); } catch(e) {}
      try { db.exec("ALTER TABLE freelancers ADD COLUMN default_rate INTEGER DEFAULT 0;"); } catch(e) {}
      try { db.exec("ALTER TABLE freelancers ADD COLUMN city TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE freelancers ADD COLUMN agree_terms INTEGER DEFAULT 0;"); } catch(e) {}

      // 4b. Tambahkan kolom pendukung pada tabel users (jika belum ada)
      try { db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;"); } catch(e) {}

      // 5. Tambahkan kolom pendukung pada tabel assignments (jika belum ada)
      try { db.exec("ALTER TABLE assignments ADD COLUMN fg_fee INTEGER;"); } catch(e) {}

      // 6. Tambahkan kolom pendukung pada tabel deliverables (jika belum ada)
      try { db.exec("ALTER TABLE deliverables ADD COLUMN delivery_type TEXT DEFAULT 'link';"); } catch(e) {}
      try { db.exec("ALTER TABLE deliverables ADD COLUMN notes TEXT;"); } catch(e) {}
      try { db.exec("ALTER TABLE deliverables ADD COLUMN raw_folder_url TEXT;"); } catch(e) {}

      // 6b. Tambahkan kolom pendukung pada tabel portfolio_items (jika belum ada)
      try { db.exec("ALTER TABLE portfolio_items ADD COLUMN updated_at DATETIME;"); } catch(e) {}
      try { db.exec("ALTER TABLE portfolio_items ADD COLUMN city TEXT;"); } catch(e) {}

      // 6c. Buat tabel untuk tracking pekerjaan impor portfolio (jika belum ada)
      db.exec(`
        CREATE TABLE IF NOT EXISTS portfolio_import_jobs (
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
      `);

      // 6d. Buat tabel untuk penampung rekrutmen freelance (jika belum ada)
      db.exec(`
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
          status TEXT DEFAULT 'pending',
          reviewer_notes TEXT,
          reviewed_by INTEGER REFERENCES users(id),
          reviewed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 7. Seed/masukkan nilai pengaturan default (jika belum ada)
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('dp_percentage', '50', 'Persentase DP dari total harga')").run();
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('upload_deadline_days', '1', 'Deadline upload foto setelah shoot (hari)')").run();
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('company_name', 'AmsDev Wisuda', 'Nama perusahaan di kontrak/invoice')").run();
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('wa_templates', '{}', 'JSON template WA per trigger')").run();
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('supported_cities', '[\"Makassar\", \"Jakarta\", \"Surabaya\", \"Yogyakarta\", \"Bandung\"]', 'Daftar kota layanan operasional (JSON array)')").run();

      // 8. Performance Indexes — mencegah full-table-scan pada query dashboard & operasi bisnis
      //    Sesuai dokumentasi WISUDA_DB.md + tambahan untuk query admin.js yang paling sering dipakai
      const indexes = [
        // Dari dokumentasi WISUDA_DB.md (yang belum terbuat)
        'CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)',
        'CREATE INDEX IF NOT EXISTS idx_inquiries_date ON inquiries(graduation_date)',
        'CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)',
        'CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(graduation_date)',
        'CREATE INDEX IF NOT EXISTS idx_assignments_fg_status ON assignments(fg_id, status)',
        'CREATE INDEX IF NOT EXISTS idx_deliverables_assignment ON deliverables(assignment_id)',
        'CREATE INDEX IF NOT EXISTS idx_payouts_fg_period ON payouts(fg_id, period_start, period_end)',
        'CREATE INDEX IF NOT EXISTS idx_portfolio_published ON portfolio_items(published, featured, sort_order)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_type, user_id, read)',
        'CREATE INDEX IF NOT EXISTS idx_fg_schedules_date ON fg_schedules(date, status)',
        // Tambahan: kolom yang sering di-filter di dashboard admin
        'CREATE INDEX IF NOT EXISTS idx_bookings_dp_status ON bookings(dp_status)',
        'CREATE INDEX IF NOT EXISTS idx_bookings_balance_status ON bookings(balance_status)',
        'CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status)',
        'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_freelancers_city ON freelancers(city)',
        'CREATE INDEX IF NOT EXISTS idx_inquiries_city ON inquiries(city)',
        'CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city)',
      ];
      for (const idx of indexes) {
        try { db.exec(idx); } catch(e) { /* index already exists */ }
      }
    });
    
    try {
      migration();
      console.log('Database migration completed');
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('UNIQUE constraint')) {
        console.error('Migration error:', err.message);
      }
    }

    // Auto-generate access_code for freelancers that don't have one (run after migration)
    try {
      const fgsWithoutCode = db.prepare("SELECT id FROM freelancers WHERE access_code IS NULL OR access_code = ''").all();
      if (fgsWithoutCode.length > 0) {
        const crypto = require('crypto');
        fgsWithoutCode.forEach(fg => {
          const code = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
          try { db.prepare("UPDATE freelancers SET access_code = ? WHERE id = ?").run(code, fg.id); } catch(e) {}
        });
        console.log(`Generated access codes for ${fgsWithoutCode.length} freelancers`);
      }
    } catch(e) {
      console.error('Access code generation error:', e.message);
    }

    // Auto-generate tracking_token for bookings that don't have them
    try {
      const bookingsWithoutToken = db.prepare("SELECT id FROM bookings WHERE tracking_token IS NULL OR tracking_token = ''").all();
      if (bookingsWithoutToken.length > 0) {
        const crypto = require('crypto');
        bookingsWithoutToken.forEach(b => {
          const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
          const tok = `TRK-${b.id}-${hex}`;
          try {
            db.prepare("UPDATE bookings SET tracking_token = ? WHERE id = ?").run(tok, b.id);
          } catch(e) {}
        });
        console.log(`Generated tracking tokens for ${bookingsWithoutToken.length} bookings`);
      }
    } catch(e) {
      console.error('Tracking token generation error:', e.message);
    }

    // Auto-cleanup orphaned portfolio folders on disk
    try {
      const basePorto = path.join(__dirname, '../../DATA/uploads/portfolio');
      if (fs.existsSync(basePorto)) {
        const activePortfolios = db.prepare('SELECT cover_photo_url, highlight_photos FROM portfolio_items').all();
        const activeFolderNames = new Set();

        activePortfolios.forEach(p => {
          const urls = [];
          if (p.cover_photo_url) urls.push(p.cover_photo_url);
          if (p.highlight_photos) {
            try {
              const arr = JSON.parse(p.highlight_photos);
              if (Array.isArray(arr)) urls.push(...arr);
            } catch (e) {}
          }
          urls.forEach(u => {
            if (u && typeof u === 'string' && u.includes('/uploads/portfolio/')) {
              const parts = u.split('/uploads/portfolio/')[1]?.split('/');
              if (parts && parts[0]) activeFolderNames.add(parts[0]);
            }
          });
        });

        const dirsOnDisk = fs.readdirSync(basePorto, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        let cleanedCount = 0;
        dirsOnDisk.forEach(dirName => {
          if (!activeFolderNames.has(dirName)) {
            const fullPath = path.join(basePorto, dirName);
            try {
              fs.rmSync(fullPath, { recursive: true, force: true });
              cleanedCount++;
              console.log(`[Cleaner] Automatically removed orphaned portfolio folder: ${dirName}`);
            } catch (e) {}
          }
        });
        if (cleanedCount > 0) {
          console.log(`[Cleaner] Cleaned up ${cleanedCount} orphaned portfolio folder(s).`);
        }
      }
    } catch(e) {
      console.error('Orphaned portfolio folder cleanup error:', e.message);
    }

  }
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, migrate, closeDb };