const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Database Backup Monitor & Download API Test Suite', () => {
  let cookie = '';

  beforeAll(async () => {
    migrate();
    const db = getDb();

    // 1. Seed Admin user for test login
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'backupadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('backupadmin', ?, 'Backup Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Login to get session cookie
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'backupadmin', password: 'password123' });
    
    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'];
    }
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM users WHERE username = 'backupadmin'").run();
  });

  test('GET /api/admin/settings/backup-status should return active backup status metadata', async () => {
    const res = await request(app)
      .get('/api/admin/settings/backup-status')
      .set('Cookie', cookie)
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.backup_path).toBeDefined();
    expect(typeof res.body.total_backups).toBe('number');
  });

  test('POST /api/admin/cron/trigger/backup_db should create a new backup .db snapshot', async () => {
    const res = await request(app)
      .post('/api/admin/cron/trigger/backup_db')
      .set('Cookie', cookie)
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify backup status now sees the new snapshot
    const statusRes = await request(app)
      .get('/api/admin/settings/backup-status')
      .set('Cookie', cookie)
      .set('Accept', 'application/json');

    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.body.latest_backup).not.toBeNull();
    expect(statusRes.body.latest_backup.filename).toContain('.db');
  });

  test('GET /api/admin/settings/backup-download should download the latest .db file', async () => {
    const res = await request(app)
      .get('/api/admin/settings/backup-download')
      .set('Cookie', cookie);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment; filename=');
  });
});
