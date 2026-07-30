const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config/settings');

describe('Archive & Permanent Client Deletion Test Suite', () => {
  let db;
  let adminToken;
  let sampleBookingId;
  let testPackageId = 1;

  beforeAll(() => {
    migrate();
    db = getDb();

    // Create test package if missing
    const pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    if (pkg) {
      testPackageId = pkg.id;
    } else {
      const res = db.prepare(`
        INSERT INTO packages (name, price, fg_fee) VALUES ('Pkg Delete Test', 1500000, 400000)
      `).run();
      testPackageId = res.lastInsertRowid;
    }

    // Create active admin user & JWT token
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, name, role, active)
      VALUES (1, 'admin_archive_test', 'hash', 'Admin Archive Test', 'admin', 1)
    `).run();

    adminToken = jwt.sign(
      { id: 1, username: 'admin_archive_test', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  test('Should query archive items by tab (completed & cancelled)', async () => {
    // Insert sample completed and cancelled bookings with package_id, dp_amount, & balance_amount
    db.prepare(`
      INSERT INTO bookings (package_id, client_name, client_phone, graduation_date, status, total_price, dp_amount, balance_amount)
      VALUES (?, 'Client Completed Test', '62811111111', '2026-08-10', 'completed', 1500000, 500000, 1000000)
    `).run(testPackageId);

    db.prepare(`
      INSERT INTO bookings (package_id, client_name, client_phone, graduation_date, status, total_price, dp_amount, balance_amount)
      VALUES (?, 'Client Cancelled Test', '62822222222', '2026-08-10', 'cancelled', 1500000, 500000, 1000000)
    `).run(testPackageId);

    const resCompleted = await request(app)
      .get('/api/admin/archive?tab=completed')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resCompleted.statusCode).toBe(200);
    expect(Array.isArray(resCompleted.body.data)).toBe(true);

    const resCancelled = await request(app)
      .get('/api/admin/archive?tab=cancelled')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resCancelled.statusCode).toBe(200);
    expect(Array.isArray(resCancelled.body.data)).toBe(true);
  });

  test('Should perform clean cascade delete of a client booking without residual records', async () => {
    // 1. Insert a booking to delete
    const result = db.prepare(`
      INSERT INTO bookings (package_id, client_name, client_phone, graduation_date, status, total_price, dp_amount, balance_amount)
      VALUES (?, 'Client To Delete', '62833333333', '2026-08-15', 'cancelled', 1200000, 400000, 800000)
    `).run(testPackageId);
    sampleBookingId = result.lastInsertRowid;

    // 2. Create associated freelancer assignment & payout
    const fgRes = db.prepare(`
      INSERT INTO freelancers (name, phone, active, access_code)
      VALUES ('FG Cascade Test', '62844444444', 1, 'FG_CASCADE_CODE_3')
    `).run();
    const fgId = fgRes.lastInsertRowid;

    const assignRes = db.prepare(`
      INSERT INTO assignments (booking_id, fg_id, status)
      VALUES (?, ?, 'assigned')
    `).run(sampleBookingId, fgId);
    const assignId = assignRes.lastInsertRowid;

    db.prepare(`
      INSERT INTO payouts (assignment_id, fg_id, fg_fee, total_payout, status)
      VALUES (?, ?, 300000, 300000, 'pending')
    `).run(assignId, fgId);

    // 3. Execute DELETE endpoint
    const delRes = await request(app)
      .delete(`/api/admin/bookings/${sampleBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.message).toContain('dihapus');

    // 4. Verify cascade deletion in DB
    const checkBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(sampleBookingId);
    expect(checkBooking).toBeUndefined();

    const checkAssignments = db.prepare('SELECT * FROM assignments WHERE booking_id = ?').all(sampleBookingId);
    expect(checkAssignments.length).toBe(0);

    const checkPayouts = db.prepare('SELECT * FROM payouts WHERE assignment_id = ?').all(assignId);
    expect(checkPayouts.length).toBe(0);
  });

  test('Should return 404 when deleting non-existent booking ID', async () => {
    const res = await request(app)
      .delete('/api/admin/bookings/99999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
