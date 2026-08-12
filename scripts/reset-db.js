const { getDb } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

function resetDatabase() {
  const db = getDb();
  console.log('Cleaning client, transaction, and portfolio data...');

  // Temporarily disable foreign keys for clean cascading truncate
  db.pragma('foreign_keys = OFF');

  const transaction = db.transaction(() => {
    // Client, transaction, & portfolio tables to clear (child tables first)
    const tables = [
      'payouts',
      'deliverables',
      'assignments',
      'booking_tokens',
      'booking_moodboards',
      'reschedule_requests',
      'bookings',
      'inquiries',
      'notifications',
      'portfolio_items',
      'portfolio_import_jobs'
    ];

    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
      try {
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
      } catch (e) {
        // Table might not have autoincrement sequence entry yet
      }
    }
  });

  transaction();
  db.pragma('foreign_keys = ON');
  console.log('✓ Database tables cleared & sequence IDs reset to 1.');

  // Clean temporary upload cache in DATA/tmp
  const tmpDir = path.join(__dirname, '../DATA/tmp');
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    let count = 0;
    for (const file of files) {
      if (file !== '.gitkeep' && file !== '.DS_Store') {
        fs.rmSync(path.join(tmpDir, file), { recursive: true, force: true });
        count++;
      }
    }
    console.log(`✓ Cleaned ${count} temporary files in DATA/tmp.`);
  }

  console.log('Reset complete!');
}

resetDatabase();
