const bcrypt = require('bcrypt');
const { getDb, migrate } = require('../src/config/database');
const { getDefaultWaTemplates } = require('../src/config/wa-templates');

async function seed() {
  // 0. Pastikan tabel skema termigrasi terlebih dahulu
  migrate();
  const db = getDb();
  
  console.log('Seeding database...');
  
  // 1. Seed admin user (only if not exists)
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const hash = await bcrypt.hash('admin123', 12);
    db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
      'admin', hash, 'Admin Wisuda', 'admin'
    );
    console.log('✓ Admin user: admin / admin123');
  } else {
    console.log('✓ Admin user already exists');
  }
  
  // 2. Seed packages (Digital Only — Minimal Rp 500.000/jam)
  const existingPackages = db.prepare('SELECT COUNT(*) as c FROM packages').get().c;
  if (existingPackages === 0) {
    const packages = [
      { name: 'Paket Essential Digital', description: 'Sesi foto wisuda 1 jam, output digital album high-res (15 foto teredit + all raw via Google Drive)', price: 500000, fg_fee: 200000, editor_fee: 0, duration_hours: 1, max_selected_photos: 15, highlight_count: 5, includes: '{"digital_edited": 15, "digital_all": true, "google_drive_link": true, "output": "digital_only"}', sort_order: 1 },
      { name: 'Paket Signature Digital', description: 'Sesi foto wisuda 2 jam (wisudawan + keluarga), output digital album high-res (35 foto teredit + all master files)', price: 1000000, fg_fee: 400000, editor_fee: 0, duration_hours: 2, max_selected_photos: 35, highlight_count: 10, includes: '{"digital_edited": 35, "digital_all": true, "google_drive_link": true, "output": "digital_only"}', sort_order: 2 },
      { name: 'Paket Ultimate Digital Group', description: 'Full coverage wisuda 3 jam (grup/alumni/keluarga), output digital album high-res (60 foto teredit + all master files)', price: 1500000, fg_fee: 600000, editor_fee: 100000, duration_hours: 3, max_selected_photos: 60, highlight_count: 15, includes: '{"digital_edited": 60, "digital_all": true, "google_drive_link": true, "output": "digital_only"}', sort_order: 3 },
    ];
    
    const stmt = db.prepare('INSERT INTO packages (name, description, price, fg_fee, editor_fee, duration_hours, max_selected_photos, highlight_count, includes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of packages) {
      stmt.run(p.name, p.description, p.price, p.fg_fee, p.editor_fee || 0, p.duration_hours, p.max_selected_photos, p.highlight_count, p.includes, p.sort_order);
    }
    console.log('✓ 3 seed packages inserted');
  } else {
    console.log('✓ Packages already exist');
  }
  
  // 3. Seed WA templates to DB (so it persists across restarts)
  const existingTemplates = db.prepare("SELECT value FROM settings WHERE key = 'wa_templates'").get();
  if (existingTemplates && (existingTemplates.value === '{}' || !existingTemplates.value)) {
    const defaults = getDefaultWaTemplates();
    db.prepare("UPDATE settings SET value = ? WHERE key = 'wa_templates'")
      .run(JSON.stringify(defaults));
    console.log('✓ WA templates seeded to DB');
  } else if (!existingTemplates) {
    const defaults = getDefaultWaTemplates();
    db.prepare("INSERT INTO settings (key, value, description) VALUES (?, ?, ?)")
      .run('wa_templates', JSON.stringify(defaults), 'WA message templates');
    console.log('✓ WA templates inserted to DB');
  } else {
    console.log('✓ WA templates already exist');
  }
  
  // 4. Ensure adminPhone setting
  const adminPhone = db.prepare("SELECT value FROM settings WHERE key = 'adminPhone'").get();
  if (!adminPhone) {
    db.prepare("INSERT INTO settings (key, value, description) VALUES (?, ?, ?)")
      .run('adminPhone', '', 'Admin phone for WA notifications');
    console.log('✓ Admin phone set');
  } else {
    console.log('✓ Admin phone already set');
  }
  
  // 5. Seed sample FG (optional but good for testing)
  const existingFg = db.prepare('SELECT COUNT(*) as c FROM freelancers').get().c;
  if (existingFg === 0) {
    const fgs = [
      { name: 'Budi Santoso', phone: '628123456789', specialties: '["wisuda", "studio"]', bank_account: '{"bank": "BCA", "norek": "111222333", "atas_nama": "Budi Santoso"}', city: 'Makassar' },
      { name: 'Siti Rahmawati', phone: '628987654321', specialties: '["wisuda", "prewisuda"]', bank_account: '{"bank": "Mandiri", "norek": "444555666", "atas_nama": "Siti Rahmawati"}', city: 'Makassar' },
      { name: 'Hasan Ibrahim', phone: '628555666777', specialties: '["wisuda"]', bank_account: '{"bank": "BNI", "norek": "777888999", "atas_nama": "Hasan Ibrahim"}', city: 'Makassar' },
    ];
    
    const stmt = db.prepare('INSERT INTO freelancers (name, phone, specialties, bank_account, city) VALUES (?, ?, ?, ?, ?)');
    for (const f of fgs) {
      stmt.run(f.name, f.phone, f.specialties, f.bank_account, f.city);
    }
    console.log('✓ 3 seed FG inserted');
  } else {
    console.log('✓ FG already exist');
  }
  
  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});