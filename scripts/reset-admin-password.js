/**
 * scripts/reset-admin-password.js
 * 
 * Script utilitas CLI untuk mereset kata sandi akun admin secara aman.
 * Penggunaan:
 *   node scripts/reset-admin-password.js [password_baru] [username]
 * 
 * Default:
 *   password_baru : 'admin123'
 *   username      : 'admin'
 */

const bcrypt = require('bcrypt');
const { getDb } = require('../src/config/database');

function resetAdminPassword() {
  const newPassword = process.argv[2] || 'admin123';
  const targetUsername = process.argv[3] || 'admin';

  console.log(`[Admin Reset] Memproses reset password untuk user: '${targetUsername}'...`);

  const db = getDb();

  // Pastikan tabel users ada
  const tableCheck = db.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!tableCheck || tableCheck.c === 0) {
    console.error('[Error] Tabel users belum tersedia di database. Jalankan `npm run seed` terlebih dahulu.');
    process.exit(1);
  }

  // Cek apakah user admin ada
  const user = db.prepare('SELECT id, username, name, role FROM users WHERE username = ?').get(targetUsername);

  const newHash = bcrypt.hashSync(newPassword, 12);

  if (!user) {
    console.warn(`[Warning] User '${targetUsername}' belum ada. Membuat akun admin baru...`);
    db.prepare(`
      INSERT INTO users (username, password_hash, name, role, active)
      VALUES (?, ?, ?, 'admin', 1)
    `).run(targetUsername, newHash, 'Administrator');
    console.log(`[Success] Akun admin baru '${targetUsername}' berhasil dibuat dengan password: ${newPassword}`);
  } else {
    db.prepare('UPDATE users SET password_hash = ?, active = 1 WHERE username = ?').run(newHash, targetUsername);
    console.log(`[Success] Password untuk user '${targetUsername}' berhasil di-reset ke: ${newPassword}`);
  }

  console.log('[Info] Anda sekarang dapat login ke Admin Dashboard menggunakan kredensial tersebut.');
}

try {
  resetAdminPassword();
} catch (err) {
  console.error('[Fatal Error] Gagal mereset password admin:', err.message);
  process.exit(1);
}
