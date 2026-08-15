const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config/settings');

describe('Daily Inquiry Capacity Limit Test Suite', () => {
  let db;
  let adminToken;
  let testPackageId = 1;

  beforeAll(() => {
    migrate();
    db = getDb();

    const pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    if (pkg) {
      testPackageId = pkg.id;
    } else {
      const res = db.prepare(`
        INSERT INTO packages (name, price, fg_fee) VALUES ('Pkg Capacity Test', 1500000, 400000)
      `).run();
      testPackageId = res.lastInsertRowid;
    }

    // Create active admin user & JWT token
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, name, role, active)
      VALUES (1, 'admin_capacity_test', 'hash', 'Admin Capacity Test', 'admin', 1)
    `).run();

    adminToken = jwt.sign(
      { id: 1, username: 'admin_capacity_test', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  test('Should set and query max daily capacity in DB settings', async () => {
    // Set max_daily_capacity to 2 in DB settings
    db.prepare(`
      INSERT INTO settings (key, value, description)
      VALUES ('max_daily_capacity', '2', 'Batas maksimal booking per hari')
      ON CONFLICT(key) DO UPDATE SET value = '2'
    `).run();

    const setting = db.prepare("SELECT value FROM settings WHERE key = 'max_daily_capacity'").get();
    expect(setting).toBeDefined();
    expect(setting.value).toBe('2');
  });

  test('Should accept inquiry when under capacity limit', async () => {
    const targetDate = '2026-09-02';

    // Insert 1 booking under limit with dp_amount & balance_amount
    db.prepare(`
      INSERT INTO bookings (package_id, client_name, client_phone, graduation_date, status, total_price, dp_amount, balance_amount)
      VALUES (?, 'Existing Capacity Client', '62855555555', ?, 'dp_verified', 1500000, 500000, 1000000)
    `).run(testPackageId, targetDate);

    // Submit inquiry
    const res = await request(app)
      .post('/api/public/inquiry')
      .send({
        client_name: 'New Inquiry Capacity Client',
        client_phone: '62866666666',
        client_email: 'capacity_client@gmail.com',
        graduation_date: targetDate,
        university: 'UNHAS',
        location: 'Makassar',
        notes: 'Capacity test'
      });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.success).toBe(true);
  });
});
