const { getDb } = require('../src/config/database');

async function main() {
  const db = getDb();
  console.log('Resetting database tables...');
  
  // Disable foreign keys temporarily for reset
  db.pragma('foreign_keys = OFF');
  
  db.transaction(() => {
    // Truncate existing client-related data
    db.prepare("DELETE FROM bookings").run();
    db.prepare("DELETE FROM inquiries").run();
    db.prepare("DELETE FROM assignments").run();
    db.prepare("DELETE FROM deliverables").run();
    db.prepare("DELETE FROM payouts").run();
    db.prepare("DELETE FROM fg_schedules").run();
    db.prepare("DELETE FROM booking_tokens").run();
    db.prepare("DELETE FROM notifications").run();
    
    // Reset auto-increment sequences
    const seqTables = ['bookings', 'inquiries', 'assignments', 'deliverables', 'payouts', 'fg_schedules', 'booking_tokens', 'notifications'];
    seqTables.forEach(t => {
      db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(t);
    });
    
    console.log('✓ Database tables cleared.');
    
    // Fetch packages to match valid package_id
    const packages = db.prepare('SELECT id, name FROM packages').all();
    if (packages.length === 0) {
      throw new Error('No packages found in database. Run seed first.');
    }
    console.log('Available packages:', packages);
    
    // Generate 5 complete inquiries
    const mockInquiries = [
      {
        client_name: 'Aditya Pratama',
        client_phone: '628123456701',
        client_email: 'aditya.pratama@mail.com',
        graduation_date: '2026-08-20',
        location: 'Gedung Rektorat Lt. 2, Kampus UI',
        university: 'Universitas Indonesia',
        package_id: packages[0].id,
        notes: 'Minta fg yang sabar ya kak.',
        source: 'web'
      },
      {
        client_name: 'Rian Hidayat',
        client_phone: '628123456702',
        client_email: 'rian.hidayat@mail.com',
        graduation_date: '2026-08-21',
        location: 'Fakultas Teknik, Universitas Hasanuddin',
        university: 'Universitas Hasanuddin',
        package_id: packages[1] ? packages[1].id : packages[0].id,
        notes: 'Sesi foto outdoor bersama keluarga besar.',
        source: 'web'
      },
      {
        client_name: 'Larasati Putri',
        client_phone: '628123456703',
        client_email: 'larasati.putri@mail.com',
        graduation_date: '2026-08-22',
        location: 'Auditorium UNM, Makassar',
        university: 'Universitas Negeri Makassar',
        package_id: packages[2] ? packages[2].id : packages[0].id,
        notes: 'Butuh album fisik premium dicetak cepat.',
        source: 'web'
      },
      {
        client_name: 'Bambang Wijaya',
        client_phone: '628123456704',
        client_email: 'bambang.wijaya@mail.com',
        graduation_date: '2026-08-23',
        location: 'Phinisi Hall, Hotel Claro Makassar',
        university: 'Universitas Islam Negeri Alauddin',
        package_id: packages[1] ? packages[1].id : packages[0].id,
        notes: 'Foto wisuda pasca-sarjana.',
        source: 'web'
      },
      {
        client_name: 'Dewi Lestari',
        client_phone: '628123456705',
        client_email: 'dewi.lestari@mail.com',
        graduation_date: '2026-08-25',
        location: 'Gedung Manggala Wanabakti, Jakarta',
        university: 'Universitas Pancasila',
        package_id: packages[2] ? packages[2].id : packages[0].id,
        notes: 'Ingin tema pre-wedding outdoor style.',
        source: 'web'
      }
    ];
    
    const insertStmt = db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, location, university, package_id, notes, source, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `);
    
    for (const item of mockInquiries) {
      insertStmt.run(
        item.client_name,
        item.client_phone,
        item.client_email,
        item.graduation_date,
        item.location,
        item.university,
        item.package_id,
        item.notes,
        item.source
      );
    }
    
    console.log('✓ Successfully inserted 5 clean mock inquiries.');
  })();
  
  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');
  
  console.log('Database reset and seed complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
