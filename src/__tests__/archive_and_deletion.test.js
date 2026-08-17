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

    // Insert sample inquiries (lost, expired, archived)
    db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, graduation_date, status, university)
      VALUES ('Calon Lost Test', '62855555555', '2026-08-20', 'lost', 'Universitas Test')
    `).run();

    db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, graduation_date, status, university)
      VALUES ('Calon Expired Test', '62866666666', '2026-08-20', 'expired', 'Universitas Test')
    `).run();

    const resInquiries = await request(app)
      .get('/api/admin/archive?tab=inquiries')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resInquiries.statusCode).toBe(200);
    expect(Array.isArray(resInquiries.body.data)).toBe(true);
    expect(resInquiries.body.inquiriesCount).toBeGreaterThanOrEqual(2);
    expect(resInquiries.body.data.some(i => i.client_name === 'Calon Lost Test')).toBe(true);
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

  test('Should restore archived inquiry to active inquiry status with date validation', async () => {
    // 1. Inquiry dengan tanggal wisuda masa depan
    const inqFutureRes = db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, graduation_date, status, university)
      VALUES ('Calon Restore Valid', '62877777777', '2026-12-01', 'lost', 'Universitas Masa Depan')
    `).run();
    const inqFutureId = inqFutureRes.lastInsertRowid;

    const resValid = await request(app)
      .post(`/api/admin/inquiries/${inqFutureId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resValid.statusCode).toBe(200);
    expect(resValid.body.success).toBe(true);
    expect(resValid.body.inquiry.status).toBe('new');

    // 2. Inquiry dengan tanggal wisuda masa lalu (sudah lewat) tanpa tanggal baru
    const inqPastRes = db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, graduation_date, status, university)
      VALUES ('Calon Restore Past', '62888888888', '2020-01-01', 'archived', 'Universitas Masa Lalu')
    `).run();
    const inqPastId = inqPastRes.lastInsertRowid;

    const resPastWithoutDate = await request(app)
      .post(`/api/admin/inquiries/${inqPastId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resPastWithoutDate.statusCode).toBe(400);
    expect(resPastWithoutDate.body.requires_new_date).toBe(true);

    // 3. Restore dengan tanggal baru di masa lalu -> harus ditolak
    const resPastWithPastDate = await request(app)
      .post(`/api/admin/inquiries/${inqPastId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ graduation_date: '2020-05-05' });

    expect(resPastWithPastDate.statusCode).toBe(400);

    // 4. Restore dengan tanggal baru di masa depan -> berhasil
    const resPastWithFutureDate = await request(app)
      .post(`/api/admin/inquiries/${inqPastId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ graduation_date: '2026-11-20' });

    expect(resPastWithFutureDate.statusCode).toBe(200);
    expect(resPastWithFutureDate.body.success).toBe(true);
    expect(resPastWithFutureDate.body.inquiry.status).toBe('new');
    expect(resPastWithFutureDate.body.inquiry.graduation_date).toBe('2026-11-20');
  });

  test('Should clean up old draft bookings and expired QRIS transactions when generating/regenerating link', async () => {
    // 1. Create inquiry
    const inqRes = db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, graduation_date, status, university)
      VALUES ('QRIS Clean Reset Test', '62899999999', '2026-12-10', 'booking_link_active', 'Universitas Bersih')
    `).run();
    const inqId = inqRes.lastInsertRowid;

    // 2. Create unpaid draft booking and expired QRIS transaction
    const bRes = db.prepare(`
      INSERT INTO bookings (inquiry_id, package_id, client_name, client_phone, graduation_date, status, dp_status, total_price, dp_amount, balance_amount)
      VALUES (?, ?, 'QRIS Clean Reset Test', '62899999999', '2026-12-10', 'waiting_dp', 'unpaid', 1000000, 500000, 500000)
    `).run(inqId, testPackageId);
    const bId = bRes.lastInsertRowid;

    db.prepare(`
      INSERT INTO qris_transactions (booking_id, trx_id, reference_id, amount, payment_type, status, expired_at)
      VALUES (?, 'TRX-STALE-1', 'REF-STALE-1', 500000, 'dp', 'expired', '2026-08-01 00:00:00')
    `).run(bId);

    // 3. Regenerate booking link
    const regenRes = await request(app)
      .post(`/api/admin/inquiries/${inqId}/regenerate-link`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(regenRes.statusCode).toBe(200);
    expect(regenRes.body.success).toBe(true);

    // 4. Verify old unpaid booking and QRIS transaction are wiped clean
    const checkBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bId);
    expect(checkBooking).toBeUndefined();

    const checkQris = db.prepare('SELECT * FROM qris_transactions WHERE booking_id = ?').all(bId);
    expect(checkQris.length).toBe(0);

    // 5. Verify GET /api/public/booking-token/:token returns clean inquiry state without old QRIS
    const publicTokenRes = await request(app)
      .get(`/api/public/booking-token/${regenRes.body.token}`);

    expect(publicTokenRes.statusCode).toBe(200);
    expect(publicTokenRes.body.is_qris_active).toBeFalsy();
    expect(publicTokenRes.body.is_qris_expired).toBeFalsy();
    expect(publicTokenRes.body.booking).toBeUndefined();
  });
});


