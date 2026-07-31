const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Direct-to-Cloud Upload v2.0 Backend Test Suite', () => {
  let db;
  let adminToken = '';
  let bookingId = null;

  beforeAll(async () => {
    migrate();
    db = getDb();

    // 1. Seed Admin User
    const existing = db.prepare("SELECT id FROM users WHERE username = 'uploadadmin'").get();
    if (!existing) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('uploadadmin', ?, 'Upload Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Seed Booking with Drive Subfolders
    const ts = Date.now();
    const pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    const b = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, shooting_time, duration_hours, status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status, staging_drive_url, highlight_drive_url, download_url)
      VALUES ('Direct Upload Client', '628123456789', '2026-12-25', '10:00', 2, 'confirmed', ?, ?, 500000, 250000, 250000, 'paid', ?, ?, ?)
    `).run(
      'TRK-DTC-' + ts,
      pkg ? pkg.id : 1,
      'https://drive.google.com/drive/folders/1test_jpg_folder_id',
      'https://drive.google.com/drive/folders/1test_highlight_folder_id',
      'https://drive.google.com/drive/folders/1test_final_folder_id'
    );
    bookingId = b.lastInsertRowid;
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE username = 'uploadadmin'").run();
      db.prepare("DELETE FROM bookings WHERE id = ?", bookingId).run();
      db.prepare("DELETE FROM staging_files WHERE booking_id = ?", bookingId).run();
    } catch (e) {}
  });

  test('1. Admin logs in to obtain JWT Token', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'uploadadmin', password: 'password123' });

    expect(res.statusCode).toBe(200);
    adminToken = res.body.token;
  });

  test('2. Initiate Direct Upload returns 400 for invalid subfolder_type', async () => {
    const res = await request(app)
      .post('/api/v2/admin/uploads/initiate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        booking_id: bookingId,
        subfolder_type: 'invalid_folder',
        files: [{ name: 'test.jpg', size: 1024, mimeType: 'image/jpeg' }]
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('3. Finalize Direct Upload saves JPG files into staging_files', async () => {
    const res = await request(app)
      .post('/api/v2/admin/uploads/finalize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        booking_id: bookingId,
        subfolder_type: 'jpg',
        files: [
          { drive_file_id: '1drive_file_abc_123', name: 'photo_001.jpg', size: 2048000 },
          { drive_file_id: '1drive_file_def_456', name: 'photo_002.jpg', size: 3072000 }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.processed_count).toBe(2);

    const check = db.prepare('SELECT staging_files FROM bookings WHERE id = ?').get(bookingId);
    const parsed = JSON.parse(check.staging_files || '[]');
    expect(parsed.length).toBe(2);
  });
});
