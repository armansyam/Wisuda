const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('SMTP Settings Integration Tests', () => {
  let db;
  let adminJwtToken = '';

  beforeAll(async () => {
    migrate();
    db = getDb();

    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'smtp_testadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('smtp_testadmin', ?, 'Test SMTP Admin', 'admin', 1)
      `).run(passHash);
    }

    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'smtp_testadmin', password: 'password123' });
    adminJwtToken = res.body.token;
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE username = 'smtp_testadmin'").run();
    } catch (e) {}
  });

  it('should allow saving SMTP settings via PUT /api/admin/settings', async () => {
    const smtpPayload = {
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: 'testadmin@gmail.com',
      smtp_pass: 'secretpass123',
      smtp_secure: '0',
      smtp_from_name: 'Wisuda Official Test',
      smtp_from_email: 'no-reply@testwisuda.com'
    };

    const res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send(smtpPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.smtp_host).toBe('smtp.gmail.com');
    expect(res.body.smtp_user).toBe('testadmin@gmail.com');
    expect(res.body.smtp_from_name).toBe('Wisuda Official Test');
  });

  it('should return error when verifying invalid SMTP host', async () => {
    const res = await request(app)
      .post('/api/admin/settings/verify-smtp')
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send({
        smtp_host: 'invalid-smtp-server-xyz-12345.com',
        smtp_port: 587,
        smtp_user: 'fake@invalid.com',
        smtp_pass: 'wrongpass'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Gagal terhubung');
  });

  it('should return error when target_email is missing in send-test-email', async () => {
    const res = await request(app)
      .post('/api/admin/settings/send-test-email')
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send({
        smtp_host: 'smtp.gmail.com',
        smtp_user: 'test@gmail.com'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Email tujuan wajib diisi.');
  });
});
