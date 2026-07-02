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
  }
  return db;
}

function migrate() {
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
      statements.forEach(stmt => {
        if (stmt.trim()) {
          try { db.exec(stmt); } catch(e) { if (!e.message.includes('already exists')) throw e; }
        }
      });

      // Ensure default settings exist
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('dp_percentage', '50', 'Persentase DP dari total harga')").run();
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('upload_deadline_days', '1', 'Deadline upload foto setelah shoot (hari)')").run();
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('company_name', 'Sorehari Wisuda', 'Nama perusahaan di kontrak/invoice')").run();
      db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES ('wa_templates', '{}', 'JSON template WA per trigger')").run();
    });
    
    try {
      migration();
      console.log('Database migration completed');
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('UNIQUE constraint')) {
        console.error('Migration error:', err.message);
      }
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