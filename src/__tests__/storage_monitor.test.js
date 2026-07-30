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

  test('GET /api/admin/settings/storage-status should return total usage and categories breakdown', async () => {
    const res = await request(app)
      .get('/api/admin/settings/storage-status')
      .set('Cookie', cookie)
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.upload_path).toBeDefined();
    expect(res.body.total_usage).toBeDefined();
    expect(res.body.total_usage.size_mb).toBeDefined();
    expect(res.body.categories).toBeDefined();
    expect(res.body.categories.portfolio.policy).toBe('PERMANEN');
    expect(res.body.categories.payment_proofs.policy).toBe('ARSIP AUDIT');
    expect(res.body.categories.moodboards.policy).toBe('AUTO CLEAN H+7');
    expect(res.body.categories.pdf_documents.policy).toBe('PERMANEN');
  });
});
