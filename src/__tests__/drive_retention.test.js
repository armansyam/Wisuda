const { getDb, migrate } = require('../config/database');
const { formatBytes } = require('../services/drive-folder.service');
const { getSettings, setSetting } = require('../config/wa-templates');
const { runDriveRetentionCleanup } = require('../services/cron.service');

describe('Google Drive Retention & Clean-up Unit Test Suite', () => {
  let db;

  beforeAll(() => {
    migrate();
    db = getDb();
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM bookings WHERE client_name LIKE 'Test Drive Retention %'").run();
    } catch (e) {}
  });

  test('1. Helper formatBytes formats file sizes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(3704207196)).toBe('3.45 GB');
  });

  test('2. Default settings for drive_retention_months and drive_auto_trash_enabled exist', () => {
    const settings = getSettings();
    expect(settings.drive_retention_months).toBeDefined();
    expect(String(settings.drive_retention_months)).toBe('3');
    expect(settings.drive_auto_trash_enabled).toBeDefined();
  });

  test('3. setSetting updates drive_retention_months in DB correctly', () => {
    setSetting('drive_retention_months', '4', 'Masa simpan test');
    const settings = getSettings();
    expect(String(settings.drive_retention_months)).toBe('4');
    
    // Reset back to 3
    setSetting('drive_retention_months', '3', 'Masa simpan test');
  });

  test('4. runDriveRetentionCleanup updates drive_expiry_date and processes active bookings', async () => {
    let pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    if (!pkg) {
      const res = db.prepare("INSERT INTO packages (name, price) VALUES ('Test Package', 1000000)").run();
      pkg = { id: res.lastInsertRowid };
    }

    // Insert test booking
    const result = db.prepare(`
      INSERT INTO bookings (
        package_id, client_name, client_phone, client_email, total_price, dp_amount, balance_amount,
        graduation_date, status, drive_parent_url, drive_cleanup_status, created_at, updated_at
      ) VALUES (
        ?, 'Test Drive Retention Client', '628999888777', 'testclient@gmail.com', 1000000, 500000, 500000,
        '2026-08-01', 'completed', 'https://drive.google.com/drive/folders/1testfolderid123456789', 'active',
        '2026-01-01 00:00:00', '2026-01-01 00:00:00'
      )
    `).run(pkg.id);

    const bookingId = result.lastInsertRowid;

    // Run retention cleanup logic (Stage 1: Transfer)
    await runDriveRetentionCleanup();

    // Verify expiry date was calculated and status set to 'transferred'
    let updatedBooking = db.prepare('SELECT drive_expiry_date, drive_cleanup_status FROM bookings WHERE id = ?').get(bookingId);
    expect(updatedBooking.drive_expiry_date).toBeDefined();
    expect(updatedBooking.drive_expiry_date).toContain('2026-04-01'); // 3 months from 2026-01-01
    expect(updatedBooking.drive_cleanup_status).toBe('transferred'); // Stage 1: transferred on day of expiry

    // Run retention cleanup logic again (Stage 2: Trash on H+1)
    await runDriveRetentionCleanup();
    updatedBooking = db.prepare('SELECT drive_cleanup_status FROM bookings WHERE id = ?').get(bookingId);
    expect(updatedBooking.drive_cleanup_status).toBe('trashed'); // Stage 2: trashed on H+1

    // Clean up test booking
    db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
  });

  test('5. GET /api/public/tracking returns retention info, expiry date, and formatted total folder size', async () => {
    const request = require('supertest');
    const { app } = require('../main');

    let pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    if (!pkg) {
      const res = db.prepare("INSERT INTO packages (name, price) VALUES ('Test Package', 1000000)").run();
      pkg = { id: res.lastInsertRowid };
    }

    const token = 'TRK-TEST-RETENTION-99';
    const result = db.prepare(`
      INSERT INTO bookings (
        package_id, client_name, client_phone, tracking_token, total_price, dp_amount, balance_amount,
        graduation_date, status, drive_parent_url, drive_total_bytes, updated_at
      ) VALUES (
        ?, 'Client Retention Test', '628111222333', ?, 1000000, 500000, 500000,
        '2026-08-01', 'completed', 'https://drive.google.com/drive/folders/1testretentionfolder', 3704207196,
        '2026-07-01 00:00:00'
      )
    `).run(pkg.id, token);

    const bId = result.lastInsertRowid;

    const res = await request(app).get(`/api/public/tracking?code=${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.drive_retention_months).toBeDefined();
    expect(res.body.drive_expiry_date_formatted).toBeDefined();
    expect(res.body.drive_total_bytes).toBe(3704207196);
    expect(res.body.drive_total_size_formatted).toBe('3.45 GB');

    db.prepare('DELETE FROM bookings WHERE id = ?').run(bId);
  });
});
