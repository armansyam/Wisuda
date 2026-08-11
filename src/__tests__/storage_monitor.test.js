const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Local Upload Storage Monitor API Test Suite', () => {
  let cookie = '';

  beforeAll(async () => {
    migrate();
    const db = getDb();

    // 1. Seed Admin user for test login
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'storageadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('storageadmin', ?, 'Storage Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Login to get session cookie
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'storageadmin', password: 'password123' });
    
    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'];
    }
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM users WHERE username = 'storageadmin'").run();
  });

  test('GET /api/admin/settings/storage-status should return Google Drive cloud storage status', async () => {
    const res = await request(app)
      .get('/api/admin/settings/storage-status')
      .set('Cookie', cookie)
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(res.body.is_cloud).toBe(true);
    expect(res.body.storage).toBeDefined();
    expect(res.body.storage.used_gb).toBeDefined();
    expect(res.body.storage.limit_gb).toBeDefined();
  });
});
