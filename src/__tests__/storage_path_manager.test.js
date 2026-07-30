const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Storage & Backup Path Manager API Test Suite', () => {
  let cookie = '';

  beforeAll(async () => {
    migrate();
    const db = getDb();

    // 1. Seed Admin user for test login
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'pathadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('pathadmin', ?, 'Path Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Login to get session cookie
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'pathadmin', password: 'password123' });
    
    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'];
    }
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM users WHERE username = 'pathadmin'").run();
  });

  test('POST /api/admin/settings/verify-path should verify valid path and test write permission', async () => {
    const res = await request(app)
      .post('/api/admin/settings/verify-path')
      .set('Cookie', cookie)
      .send({ target_path: './DATA/uploads' });

    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.writable).toBe(true);
    expect(res.body.resolved_path).toBeDefined();
  });

  test('POST /api/admin/settings/verify-path should reject invalid path gracefully', async () => {
    const res = await request(app)
      .post('/api/admin/settings/verify-path')
      .set('Cookie', cookie)
      .send({ target_path: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('PUT /api/admin/settings should save storage paths to DB settings persistently', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Cookie', cookie)
      .send({
        upload_path: './DATA/uploads',
        backup_path: './DATA/backups'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.upload_path).toBe('./DATA/uploads');
    expect(res.body.backup_path).toBe('./DATA/backups');
  });
});
