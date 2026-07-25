const request = require('supertest');
const { app } = require('../main');
const { getDb } = require('../config/database');

describe('System Health & Public API Integration Test', () => {
  beforeAll(() => {
    // Ensure database is initialized
    getDb();
  });

  test('GET /api/health should return success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/public/packages should return packages list', async () => {
    const res = await request(app).get('/api/public/packages');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  test('POST /api/admin/system/reset without authentication should return 401', async () => {
    const res = await request(app)
      .post('/api/admin/system/reset')
      .send({ password: 'wrongpassword', type: 'transactions' });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/public/tracking/:id/portfolio-consent should update consent', async () => {
    const db = getDb();
    const pkg = db.prepare("SELECT id FROM packages LIMIT 1").get();
    const pkgId = pkg ? pkg.id : 1;
    const token = 'TEST-TRK-' + Math.random().toString(36).substring(7).toUpperCase();
    const result = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, status, tracking_token, package_id, total_price, dp_amount, balance_amount)
      VALUES ('Test Consent Client', '081234567890', '2026-08-30', 'completed', ?, ?, 0, 0, 0)
    `).run(token, pkgId);
    const bookingId = result.lastInsertRowid;

    // Token salah → harus 401
    const resFail = await request(app)
      .post(`/api/public/tracking/${bookingId}/portfolio-consent`)
      .send({ consent: 'approved', code: 'WRONG-TOKEN' });
    expect(resFail.statusCode).toBe(401);

    const resSuccess = await request(app)
      .post(`/api/public/tracking/${bookingId}/portfolio-consent`)
      .send({ consent: 'approved', code: token });
    expect(resSuccess.statusCode).toBe(200);
    expect(resSuccess.body.success).toBe(true);

    const updated = db.prepare('SELECT portfolio_consent FROM bookings WHERE id = ?').get(bookingId);
    expect(updated.portfolio_consent).toBe('approved');

    db.exec('PRAGMA foreign_keys = OFF;');
    db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
    db.exec('PRAGMA foreign_keys = ON;');
  });
});
