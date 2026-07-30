const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config/settings');

describe('Google OAuth 3-Step Wizard Probe Verification Test Suite', () => {
  let db;
  let adminToken;

  beforeAll(() => {
    migrate();
    db = getDb();

    // Create active admin user & JWT token
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, password_hash, name, role, active)
      VALUES (1, 'admin_oauth_test', 'hash', 'Admin OAuth Test', 'admin', 1)
    `).run();

    adminToken = jwt.sign(
      { id: 1, username: 'admin_oauth_test', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  test('Should reject invalid OAuth credentials during probe verification test', async () => {
    const res = await request(app)
      .post('/api/admin/settings/verify-oauth-credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: 'invalid-client-id-test.apps.googleusercontent.com',
        client_secret: 'invalid-client-secret-test'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Should reject verification request when Client ID or Secret is missing', async () => {
    const res = await request(app)
      .post('/api/admin/settings/verify-oauth-credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: '',
        client_secret: ''
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Should return Google Drive status & connection wizard state', async () => {
    const res = await request(app)
      .get('/api/admin/settings/drive-status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('oauth_connected');
    expect(res.body).toHaveProperty('master_folder_id');
  });
});
