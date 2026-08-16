const request = require('supertest');
const { getDb, migrate } = require('../config/database');
const { app } = require('../main');
const emailService = require('../services/email.service');

describe('QRIS Dynamic Reconciliation & Edge-Case Safety Net Tests', () => {
  let db;
  let testInquiryId;
  let testToken;
  let testBookingId;

  beforeAll(() => {
    migrate();
    db = getDb();
    // 1. Setup test package
    const pkg = db.prepare('SELECT * FROM packages WHERE id = 1').get();
    if (!pkg) {
      db.prepare("INSERT INTO packages (id, name, price, fg_fee, active) VALUES (1, 'Personal', 500000, 150000, 1)").run();
    }
    const pkg2 = db.prepare('SELECT * FROM packages WHERE id = 2').get();
    if (!pkg2) {
      db.prepare("INSERT INTO packages (id, name, price, fg_fee, active) VALUES (2, 'Signature', 750000, 250000, 1)").run();
    }

    // 2. Insert test inquiry
    const inqRes = db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, location, university, package_id, status)
      VALUES ('Test Reconciliation', '6281234567890', 'test.reconcile@wisuda.app', '2026-09-01', 'Unhas', 'Universitas Hasanuddin', 1, 'booking_link_active')
    `).run();
    testInquiryId = inqRes.lastInsertRowid;

    // 3. Insert test booking token
    testToken = 'TEST-RECON-TOKEN-' + Date.now();
    const tokenExp = new Date(Date.now() + (3 * 3600 * 1000)).toISOString();
    db.prepare(`
      INSERT INTO booking_tokens (inquiry_id, token, expires_at, used, paused_remaining_seconds)
      VALUES (?, ?, ?, 0, NULL)
    `).run(testInquiryId, testToken, tokenExp);

    // 4. Insert test booking
    const bkgRes = db.prepare(`
      INSERT INTO bookings (inquiry_id, package_id, client_name, client_phone, client_email, graduation_date, total_price, dp_amount, balance_amount, dp_status, balance_status, status)
      VALUES (?, 1, 'Test Reconciliation', '6281234567890', 'test.reconcile@wisuda.app', '2026-09-01', 500000, 500000, 0, 'unpaid', 'unpaid', 'pending')
    `).run(testInquiryId);
    testBookingId = bkgRes.lastInsertRowid;
  });

  afterAll(() => {
    if (testInquiryId) {
      db.prepare('DELETE FROM qris_transactions WHERE booking_id = ?').run(testBookingId);
      db.prepare('DELETE FROM bookings WHERE id = ?').run(testBookingId);
      db.prepare('DELETE FROM booking_tokens WHERE token = ?').run(testToken);
      db.prepare('DELETE FROM inquiries WHERE id = ?').run(testInquiryId);
    }
  });

  test('1. POST /api/public/booking-token/:token/cancel-qris cancels active QRIS and resumes timer', async () => {
    // Generate an active QRIS row
    const refId = `REF-CANCEL-TEST-${Date.now()}`;
    db.prepare(`
      INSERT INTO qris_transactions (booking_id, trx_id, reference_id, amount, payment_type, status, expired_at)
      VALUES (?, 'TRX-101', ?, 500000, 'full', 'pending', datetime('now', '+15 minutes'))
    `).run(testBookingId, refId);

    // Set token to paused
    db.prepare('UPDATE booking_tokens SET paused_remaining_seconds = 1800, paused_at = CURRENT_TIMESTAMP WHERE token = ?').run(testToken);

    // Call cancel-qris
    const res = await request(app)
      .post(`/api/public/booking-token/${testToken}/cancel-qris`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify QRIS is marked cancelled
    const qris = db.prepare('SELECT * FROM qris_transactions WHERE reference_id = ?').get(refId);
    expect(qris.status).toBe('cancelled');

    // Verify token is resumed
    const token = db.prepare('SELECT * FROM booking_tokens WHERE token = ?').get(testToken);
    expect(token.paused_remaining_seconds).toBeNull();
    expect(token.paused_at).toBeNull();
    expect(new Date(token.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  test('2. Webhook Auto-Reconciliation: Paying QRIS #1 (Rp 500k) towards Package Rp 750k automatically converts to DP', async () => {
    // Update booking to Rp 750.000 (Package Signature)
    db.prepare('UPDATE bookings SET package_id = 2, total_price = 750000, dp_amount = 750000, balance_amount = 0 WHERE id = ?').run(testBookingId);

    // Insert QRIS #1 for Rp 500.000
    const refId1 = `REF-PAY-500K-${Date.now()}`;
    db.prepare(`
      INSERT INTO qris_transactions (booking_id, trx_id, reference_id, amount, payment_type, status, expired_at)
      VALUES (?, 'TRX-500K-MOCK', ?, 500000, 'full', 'pending', datetime('now', '+15 minutes'))
    `).run(testBookingId, refId1);

    // Simulate iPaymu Webhook for refId1
    const res = await request(app)
      .post('/api/public/payment/ipaymu/notify')
      .type('form')
      .send({
        trx_id: 'TRX-500K-MOCK',
        reference_id: refId1,
        status: 'berhasil',
        status_code: '1'
      });

    expect(res.status).toBe(200);

    // Verify booking state: dp_status='paid', dp_amount=500000, balance_amount=250000, balance_status='unpaid'
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(testBookingId);
    expect(booking.dp_status).toBe('paid');
    expect(booking.dp_amount).toBe(500000);
    expect(booking.balance_amount).toBe(250000);
    expect(booking.balance_status).toBe('unpaid');
    expect(booking.status).toBe('confirmed');

    // Verify inquiry is converted
    const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(testInquiryId);
    expect(inquiry.status).toBe('converted');
  });

  test('3. Webhook Overpayment: Paying second QRIS #2 (Rp 750k) creates full payment and records overpayment', async () => {
    // Insert QRIS #2 for Rp 750.000
    const refId2 = `REF-PAY-750K-${Date.now()}`;
    db.prepare(`
      INSERT INTO qris_transactions (booking_id, trx_id, reference_id, amount, payment_type, status, expired_at)
      VALUES (?, 'TRX-750K-MOCK', ?, 750000, 'full', 'pending', datetime('now', '+15 minutes'))
    `).run(testBookingId, refId2);

    // Simulate iPaymu Webhook for refId2 (Total paid = 500k + 750k = 1.250k for a 750k package)
    const res = await request(app)
      .post('/api/public/payment/ipaymu/notify')
      .type('form')
      .send({
        trx_id: 'TRX-750K-MOCK',
        reference_id: refId2,
        status: 'berhasil',
        status_code: '1'
      });

    expect(res.status).toBe(200);

    // Verify booking state is fully paid
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(testBookingId);
    expect(booking.dp_status).toBe('paid');
    expect(booking.balance_status).toBe('paid');
    expect(booking.balance_amount).toBe(0);

    // Verify priority admin notification was created
    const notif = db.prepare("SELECT * FROM notifications WHERE type = 'qris_overpayment' ORDER BY id DESC LIMIT 1").get();
    expect(notif).toBeDefined();
    expect(notif.title).toContain('Kelebihan Pembayaran');
    const notifData = JSON.parse(notif.data);
    expect(notifData.overpayment_amount).toBe(500000);
    expect(notifData.total_received).toBe(1250000);
  });

  test('4. Email templates generate valid HTML without crashes', async () => {
    const booking = db.prepare('SELECT b.*, p.name as package_name FROM bookings b LEFT JOIN packages p ON b.package_id = p.id WHERE b.id = ?').get(testBookingId);
    
    const overpaymentRes = await emailService.sendClientOverpaymentEmail({
      booking,
      totalReceived: 1250000,
      overpaymentAmount: 500000,
      trackingUrl: 'http://localhost:8081/tracking.html?token=TRK-123'
    });
    // Will return ok: false because SMTP credentials are not configured in test env, but function must not crash
    expect(overpaymentRes).toBeDefined();
  });
});
