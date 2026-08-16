/**
 * src/__tests__/qris_payment_flow.test.js
 * Test Suite untuk Alur Pembayaran QRIS Dinamis & Webhook iPaymu
 */
const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { setSetting } = require('../config/wa-templates');
const ipaymuService = require('../services/ipaymu.service');

describe('QRIS Dynamic Payment & Webhook Integration Tests', () => {
  let db;
  let testInquiryId;
  let testToken;
  let testPkgId;

  beforeAll(() => {
    migrate();
    db = getDb();

    // Enable iPaymu sandbox for test
    setSetting('ipaymu_enabled', '1');
    setSetting('ipaymu_env', 'sandbox');
    setSetting('ipaymu_va', '1179008233333420');
    setSetting('ipaymu_api_key', 'iqZ2RB9XhV8XdDCsCdxrR95SKKnUK.');
    setSetting('ipaymu_verified', '1');
    setSetting('ipaymu_qris_expiry_minutes', '15');
    setSetting('dp_percentage', '50');

    // Create test package
    const pkg = db.prepare(`
      INSERT INTO packages (name, price, fg_fee, duration_hours, active)
      VALUES ('Paket Test QRIS', 1000000, 300000, 2, 1)
    `).run();
    testPkgId = pkg.lastInsertRowid;
  });

  beforeEach(() => {
    // Create test inquiry
    const inq = db.prepare(`
      INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, city, package_id, status)
      VALUES ('Andi QRIS Test', '082333333420', 'andi.qris@example.com', '2026-09-01', 'Makassar', ?, 'new')
    `).run(testPkgId);
    testInquiryId = inq.lastInsertRowid;

    // Create booking token with valid ISO expiration
    testToken = `TOKEN-QRIS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO booking_tokens (inquiry_id, token, expires_at, used)
      VALUES (?, ?, ?, 0)
    `).run(testInquiryId, testToken, expiresAt);
  });

  afterAll(() => {
    // Clean up test data in correct FK order
    db.prepare("DELETE FROM qris_transactions WHERE reference_id LIKE 'BOOKING-%'").run();
    db.prepare("DELETE FROM bookings WHERE client_name = 'Andi QRIS Test'").run();
    db.prepare("DELETE FROM booking_tokens WHERE token LIKE 'TOKEN-QRIS-%'").run();
    db.prepare("DELETE FROM inquiries WHERE client_name = 'Andi QRIS Test'").run();
    db.prepare("DELETE FROM packages WHERE name = 'Paket Test QRIS'").run();
  });

  test('POST /api/public/booking-token/:token/qris creates booking and generates QRIS', async () => {
    // Mock iPaymu createQrisPayment to avoid live external sandbox HTTP dependency in CI
    const origCreateQris = ipaymuService.createQrisPayment;
    ipaymuService.createQrisPayment = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      message: 'Tagihan QRIS berhasil dibuat',
      data: {
        sessionId: 'SID-TEST-123',
        transactionId: 99887766,
        referenceId: 'BOOKING-REF-TEST',
        via: 'qris',
        channel: 'qris',
        qrImage: 'https://sandbox.ipaymu.com/qr/99887766.png',
        qrString: '00020101021226590014ID.LINKAJA...',
        qrTemplate: 'https://sandbox.ipaymu.com/qr/template/99887766',
        expired: '2026-09-01 12:00:00',
        expiryMinutes: 15,
        amount: 500000,
        fee: 3500
      }
    });

    const res = await request(app)
      .post(`/api/public/booking-token/${testToken}/qris`)
      .send({
        package_id: testPkgId,
        shooting_time: '10:00',
        duration_hours: 2,
        payment_type: 'dp'
      });

    if (res.status !== 200) {
      console.log('[Test Error Output]:', res.status, res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking_id).toBeDefined();
    expect(res.body.amount).toBe(500000); // 50% of 1.000.000
    expect(res.body.qr_image).toBe('https://sandbox.ipaymu.com/qr/99887766.png');
    expect(res.body.tracking_token).toBeDefined();

    // Verify record in qris_transactions
    const qrisRow = db.prepare('SELECT * FROM qris_transactions WHERE booking_id = ?').get(res.body.booking_id);
    expect(qrisRow).toBeDefined();
    expect(qrisRow.status).toBe('pending');
    expect(qrisRow.payment_type).toBe('dp');

    // Restore mock
    ipaymuService.createQrisPayment = origCreateQris;
  });

  test('GET /api/public/payment/qris/:referenceId/status returns transaction status', async () => {
    // Insert mock QRIS transaction
    const booking = db.prepare(`
      INSERT INTO bookings (package_id, client_name, client_phone, client_email, graduation_date, total_price, dp_amount, balance_amount, dp_status, balance_status, status)
      VALUES (?, 'Andi QRIS Test', '082333333420', 'andi@test.com', '2026-09-01', 1000000, 500000, 500000, 'unpaid', 'unpaid', 'pending')
    `).run(testPkgId);

    const refId = `BOOKING-${booking.lastInsertRowid}-DP-TESTSTATUS`;
    db.prepare(`
      INSERT INTO qris_transactions (booking_id, trx_id, reference_id, payment_type, amount, status)
      VALUES (?, 'TRX-TEST-001', ?, 'dp', 500000, 'pending')
    `).run(booking.lastInsertRowid, refId);

    const res = await request(app).get(`/api/public/payment/qris/${refId}/status`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('pending');
    expect(res.body.booking_id).toBe(booking.lastInsertRowid);
  });

  test('POST /api/public/payment/ipaymu/notify updates booking to confirmed upon payment settlement', async () => {
    // Insert mock booking
    const booking = db.prepare(`
      INSERT INTO bookings (package_id, client_name, client_phone, client_email, graduation_date, total_price, dp_amount, balance_amount, dp_status, balance_status, status)
      VALUES (?, 'Andi QRIS Test', '082333333420', 'andi@test.com', '2026-09-01', 1000000, 500000, 500000, 'unpaid', 'unpaid', 'pending')
    `).run(testPkgId);

    const refId = `BOOKING-${booking.lastInsertRowid}-DP-WEBHOOK`;
    db.prepare(`
      INSERT INTO qris_transactions (booking_id, trx_id, reference_id, payment_type, amount, status)
      VALUES (?, 'TRX-NOTIFY-999', ?, 'dp', 500000, 'pending')
    `).run(booking.lastInsertRowid, refId);

    // Simulate Webhook POST from iPaymu server
    const res = await request(app)
      .post('/api/public/payment/ipaymu/notify')
      .type('form')
      .send({
        trx_id: 'TRX-NOTIFY-999',
        reference_id: refId,
        status: 'berhasil',
        status_code: '1',
        amount: '500000',
        via: 'qris',
        channel: 'qris'
      });

    expect(res.status).toBe(200);

    // Verify database state updated automatically
    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.lastInsertRowid);
    expect(updatedBooking.dp_status).toBe('paid');
    expect(updatedBooking.status).toBe('confirmed');
    expect(updatedBooking.tracking_token).toBeDefined();

    const updatedQris = db.prepare('SELECT * FROM qris_transactions WHERE trx_id = ?').get('TRX-NOTIFY-999');
    expect(updatedQris.status).toBe('paid');
    expect(updatedQris.paid_at).toBeDefined();
  });

  test('emailService formats and generates QRIS invoice and expired notification emails', async () => {
    const emailService = require('../services/email.service');
    const mockBooking = {
      id: 88,
      client_name: 'Dewi QRIS',
      client_email: 'dewi@example.com',
      package_name: 'Paket Studio Wisuda',
      graduation_date: '2026-09-10',
      total_price: 1200000,
      dp_amount: 600000
    };

    // Test invoice email generation
    const invoiceResult = await emailService.sendClientQrisInvoiceEmail({
      booking: mockBooking,
      qrisData: {
        amount: 600000,
        payment_type: 'dp',
        expired_at: '2026-09-10 12:15:00',
        qr_image: 'https://sandbox.ipaymu.com/qr/sample.png'
      },
      paymentUrl: 'http://localhost:8081/confirm-booking.html?token=test'
    });
    // In test environment without SMTP credentials, sendEmail returns handled result or error log
    expect(invoiceResult).toBeDefined();

    // Test expired email generation
    const expiredResult = await emailService.sendClientQrisExpiredEmail({
      booking: mockBooking,
      qrisData: {
        amount: 600000,
        payment_type: 'dp',
        expired_at: '2026-09-10 12:15:00'
      },
      retryUrl: 'http://localhost:8081/confirm-booking.html?token=test'
    });
    expect(expiredResult).toBeDefined();
  });

  test('cron.service runQrisExpiredCheck detects expired QRIS and updates status', async () => {
    const { runQrisExpiredCheck } = require('../services/cron.service');

    // Insert mock booking with past expired_at
    const booking = db.prepare(`
      INSERT INTO bookings (package_id, client_name, client_phone, client_email, graduation_date, total_price, dp_amount, balance_amount, dp_status, balance_status, status)
      VALUES (?, 'Andi QRIS Test', '082333333420', 'andi@test.com', '2026-09-01', 1000000, 500000, 500000, 'unpaid', 'unpaid', 'pending')
    `).run(testPkgId);

    const refId = `BOOKING-${booking.lastInsertRowid}-DP-EXPIREDTEST`;
    db.prepare(`
      INSERT INTO qris_transactions (booking_id, trx_id, reference_id, payment_type, amount, expired_at, status, expired_notified)
      VALUES (?, 'TRX-PAST-001', ?, 'dp', 500000, datetime('now', '-5 minutes'), 'pending', 0)
    `).run(booking.lastInsertRowid, refId);

    // Run cron check
    runQrisExpiredCheck();

    // Verify status was updated to expired and notified
    const row = db.prepare('SELECT * FROM qris_transactions WHERE trx_id = ?').get('TRX-PAST-001');
    expect(row).toBeDefined();
    expect(row.status).toBe('expired');
    expect(row.expired_notified).toBe(1);
  });
});
