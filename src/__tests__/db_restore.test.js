const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const config = require('../config/settings');

describe('Database Restore Endpoint Test Suite', () => {
  jest.setTimeout(20000);
  let cookie = '';
  let token = '';
  let sampleSnapshotFilename;

  beforeAll(async () => {
    migrate();
    const db = getDb();

    // 1. Seed Admin user for test login
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'restoreadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('restoreadmin', ?, 'Restore Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Login to get session cookie & token
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'restoreadmin', password: 'password123' });

    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'];
    }
    if (loginRes.body.token) {
      token = loginRes.body.token;
    }

    // 3. Create a valid sample snapshot in DATA/backups
    const backupDir = path.resolve(config.backupPath || './DATA/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    sampleSnapshotFilename = `test_restore_snapshot_${Date.now()}.db`;
    const snapshotPath = path.join(backupDir, sampleSnapshotFilename);
    const activeDbPath = path.resolve(config.dbPath || './DATA/wisuda.db');
    
    // Checkpoint active db so all tables are written to .db
    try {
      getDb().pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {}

    if (fs.existsSync(activeDbPath)) {
      fs.copyFileSync(activeDbPath, snapshotPath);
    } else {
      const Database = require('better-sqlite3');
      const tempDb = new Database(snapshotPath);
      const schemaPath = path.join(__dirname, '../../scripts/schema.sql');
      if (fs.existsSync(schemaPath)) {
        tempDb.exec(fs.readFileSync(schemaPath, 'utf8'));
      }
      tempDb.close();
    }
  });

  afterAll(() => {
    const db = getDb();
    try {
      db.prepare("DELETE FROM users WHERE username = 'restoreadmin'").run();
    } catch (e) {}

    const backupDir = path.resolve(config.backupPath || './DATA/backups');
    const snapshotPath = path.join(backupDir, sampleSnapshotFilename);
    if (fs.existsSync(snapshotPath)) {
      try { fs.unlinkSync(snapshotPath); } catch (e) {}
    }
  });

  test('GET /api/admin/settings/backup-status returns backup_files list', async () => {
    const res = await request(app)
      .get('/api/admin/settings/backup-status')
      .set('Cookie', cookie)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.backup_files).toBeDefined();
    expect(Array.isArray(res.body.backup_files)).toBe(true);
    expect(res.body.backup_files.length).toBeGreaterThan(0);
  });

  test('POST /api/admin/settings/restore-db rejects when password is missing', async () => {
    const res = await request(app)
      .post('/api/admin/settings/restore-db')
      .set('Cookie', cookie)
      .set('Authorization', `Bearer ${token}`)
      .send({ snapshot_filename: sampleSnapshotFilename });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Password admin wajib diisi');
  });

  test('POST /api/admin/settings/restore-db rejects when password is incorrect', async () => {
    const res = await request(app)
      .post('/api/admin/settings/restore-db')
      .set('Cookie', cookie)
      .set('Authorization', `Bearer ${token}`)
      .send({
        snapshot_filename: sampleSnapshotFilename,
        password: 'wrong_admin_password_123'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Password admin salah');
  });

  test('POST /api/admin/settings/restore-db rejects non-existent snapshot file', async () => {
    const res = await request(app)
      .post('/api/admin/settings/restore-db')
      .set('Cookie', cookie)
      .set('Authorization', `Bearer ${token}`)
      .send({
        snapshot_filename: 'non_existent_file_xyz_12345.db',
        password: 'password123'
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('tidak ditemukan');
  });

  test('POST /api/admin/settings/restore-db successfully restores valid snapshot with correct password', async () => {
    const res = await request(app)
      .post('/api/admin/settings/restore-db')
      .set('Cookie', cookie)
      .set('Authorization', `Bearer ${token}`)
      .send({
        snapshot_filename: sampleSnapshotFilename,
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.safety_backup).toBeDefined();
    expect(res.body.message).toContain('berhasil dipulihkan');
  });
});
