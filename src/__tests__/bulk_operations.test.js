const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Admin Bulk Checkbox Operations & Overlap Protection Test Suite', () => {
  let db;
  let adminToken = '';
  let fgId = null;
  let b1Id = null, b2Id = null, b3Id = null, b4Id = null;

  beforeAll(async () => {
    migrate();
    db = getDb();

    // 1. Seed Admin
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'bulkadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('bulkadmin', ?, 'Bulk Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Seed Freelancer
    const fg = db.prepare(`
      INSERT INTO freelancers (name, phone, city, active)
      VALUES ('FG Bulk Test', '6289999000011', 'Makassar', 1)
    `).run();
    fgId = fg.lastInsertRowid;

    // 3. Seed Package
    const pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    const pkgId = pkg ? pkg.id : 1;

    // 4. Seed 4 Bookings
    const ts = Date.now();
    const b1 = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, shooting_time, duration_hours, status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status)
      VALUES ('Bulk Client 1', '62811110001', '2026-12-20', '09:00', 2, 'pending', ?, ?, 500000, 250000, 250000, 'uploaded')
    `).run('TRK-BULK-1-' + ts, pkgId);
    b1Id = b1.lastInsertRowid;

    const b2 = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, shooting_time, duration_hours, status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status)
      VALUES ('Bulk Client 2', '62811110002', '2026-12-20', '13:00', 2, 'pending', ?, ?, 500000, 250000, 250000, 'uploaded')
    `).run('TRK-BULK-2-' + ts, pkgId);
    b2Id = b2.lastInsertRowid;

    // Booking 3 has overlapping time slot with Booking 1 (09:30 vs 09:00-11:00)
    const b3 = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, shooting_time, duration_hours, status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status)
      VALUES ('Bulk Client 3 Overlap', '62811110003', '2026-12-20', '09:30', 2, 'confirmed', ?, ?, 500000, 250000, 250000, 'paid')
    `).run('TRK-BULK-3-' + ts, pkgId);
    b3Id = b3.lastInsertRowid;

    // Booking 4 is a dummy booking to test bulk delete
    const b4 = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, shooting_time, duration_hours, status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status)
      VALUES ('Bulk Client 4 Delete', '62811110004', '2026-12-22', '10:00', 2, 'pending', ?, ?, 500000, 250000, 250000, 'unpaid')
    `).run('TRK-BULK-4-' + ts, pkgId);
    b4Id = b4.lastInsertRowid;
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE username = 'bulkadmin'").run();
      db.prepare("DELETE FROM freelancers WHERE id = ?", fgId).run();
      db.prepare("DELETE FROM bookings WHERE id IN (?, ?, ?, ?)", b1Id, b2Id, b3Id, b4Id).run();
      db.prepare("DELETE FROM assignments WHERE booking_id IN (?, ?, ?, ?)", b1Id, b2Id, b3Id, b4Id).run();
      db.prepare("DELETE FROM fg_schedules WHERE fg_id = ?", fgId).run();
    } catch (e) {}
  });

  describe('Bulk Operations & Time-Slot Overlap Checks', () => {
    test('1. Admin logs in', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'bulkadmin', password: 'password123' });

      expect(res.statusCode).toBe(200);
      adminToken = res.body.token;
    });

    test('2. Bulk Verify DP verifies DP status for selected bookings', async () => {
      const res = await request(app)
        .post('/api/admin/bookings/bulk-verify-dp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [b1Id, b2Id] });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified_count).toBe(2);

      const check1 = db.prepare('SELECT dp_status FROM bookings WHERE id = ?').get(b1Id);
      expect(check1.dp_status).toBe('paid');
    });

    test('3. Bulk Assign FG detects time slot overlap between Booking 1 (09:00) and Booking 3 (09:30) on same date', async () => {
      const res = await request(app)
        .post('/api/admin/bookings/bulk-assign-fg')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ids: [b1Id, b3Id],
          fg_id: fgId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.conflicts).toBeDefined();
      expect(res.body.conflicts.length).toBeGreaterThan(0);
    });

    test('4. Bulk Assign FG succeeds for non-overlapping bookings (Booking 1 at 09:00 & Booking 2 at 13:00)', async () => {
      const res = await request(app)
        .post('/api/admin/bookings/bulk-assign-fg')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ids: [b1Id, b2Id],
          fg_id: fgId
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assigned_count).toBe(2);

      // Verify assignments created
      const asgns = db.prepare("SELECT * FROM assignments WHERE fg_id = ? AND status = 'assigned'").all(fgId);
      expect(asgns.length).toBe(2);
    });

    test('5. Bulk Delete removes selected bookings and linked data completely', async () => {
      const res = await request(app)
        .post('/api/admin/bookings/bulk-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [b4Id] });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deleted_count).toBe(1);

      const check = db.prepare('SELECT * FROM bookings WHERE id = ?').get(b4Id);
      expect(check).toBeUndefined();
    });
  });
});
