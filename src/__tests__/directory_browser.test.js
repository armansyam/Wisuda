const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

describe('Directory Explorer Modal API Test Suite', () => {
  let token = '';

  beforeAll(async () => {
    migrate();
    const db = getDb();

    // 1. Seed Admin user for test login
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'browseradmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('browseradmin', ?, 'Browser Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Login to get token & cookie
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'browseradmin', password: 'password123' });
    
    token = loginRes.body.token || '';
    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'];
    }
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM users WHERE username = 'browseradmin'").run();
  });

  test('GET /api/admin/settings/browse-directories should list directories at target_path', async () => {
    const reqBuilder = request(app)
      .get('/api/admin/settings/browse-directories?target_path=./DATA')
      .set('Accept', 'application/json');
    if (token) reqBuilder.set('Authorization', `Bearer ${token}`);
    if (cookie) reqBuilder.set('Cookie', cookie);

    const res = await reqBuilder;

    expect(res.statusCode).toBe(200);
    expect(res.body.current_path).toBeDefined();
    expect(res.body.directories).toBeInstanceOf(Array);
  });

  test('POST /api/admin/settings/create-directory should create new directory safely', async () => {
    const testDirName = `test_folder_${Date.now()}`;
    const reqBuilder = request(app)
      .post('/api/admin/settings/create-directory')
      .send({
        parent_path: './DATA/backups',
        folder_name: testDirName
      });
    if (token) reqBuilder.set('Authorization', `Bearer ${token}`);
    if (cookie) reqBuilder.set('Cookie', cookie);

    const res = await reqBuilder;

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.new_path).toContain(testDirName);

    // Clean up created folder
    if (fs.existsSync(res.body.new_path)) {
      fs.rmdirSync(res.body.new_path);
    }
  });
});
