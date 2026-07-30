const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config/settings');

describe('System Hard Reset Security Test Suite', () => {
  let db;
  let adminToken;

  beforeAll(() => {
    migrate();
    db = getDb();

    // Create active admin user & JWT token
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, name, role, active)
      VALUES (1, 'admin_reset_test', 'hash', 'Admin Reset Test', 'admin', 1)
    `).run();

    adminToken = jwt.sign(
      { id: 1, username: 'admin_reset_test', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  test('Should reject Hard Reset request when password is incorrect', async () => {
    const res = await request(app)
      .post('/api/admin/system/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        password: 'wrong_password_123',
        type: 'all'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBeUndefined();
    expect(res.body).toHaveProperty('error');
  });

  test('Should reject Hard Reset request when no password is provided', async () => {
    const res = await request(app)
      .post('/api/admin/system/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Should execute Hard Reset when valid HARD_RESET_PASSWORD is provided', async () => {
    const validPassword = process.env.HARD_RESET_PASSWORD || 'AmsDev123';

    const res = await request(app)
      .post('/api/admin/system/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        password: validPassword,
        type: 'all'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('berhasil');
  });
});
