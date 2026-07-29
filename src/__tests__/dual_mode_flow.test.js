const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Dual-Mode Architecture & Multi-Role Simulation Test (Client, Admin, Freelancer)', () => {
  let db;
  let adminJwtToken = '';
  let generatedApiKey = '';

  beforeAll(async () => {
    // Run database migrations first
    migrate();
    db = getDb();
    
    // Seed test admin user if not exists
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'testadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('testadmin', ?, 'Test Admin', 'admin', 1)
      `).run(passHash);
    }
  });

  afterAll(() => {
    // Cleanup test data
    try {
      db.prepare("DELETE FROM users WHERE username = 'testadmin'").run();
      db.prepare("DELETE FROM inquiries WHERE client_name LIKE 'Test Simulasi %'").run();
      db.prepare("DELETE FROM api_keys WHERE name LIKE 'Simulasi API Key%'").run();
      db.prepare("DELETE FROM freelancer_applications WHERE name = 'FG Simulasi Test'").run();
    } catch (e) {}
  });

  // ==========================================
  // 1. CLIENT ROLE SIMULATION
  // ==========================================
  describe('Role 1: Client Flow Simulation', () => {
    test('Client can view active package offerings', async () => {
      const res = await request(app).get('/api/public/packages');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Client submits a new booking inquiry', async () => {
      const inquiryPayload = {
        client_name: 'Test Simulasi Client',
        client_phone: '6289876543210',
        university: 'Universitas Hasanuddin',
        location: 'Makassar',
        graduation_date: '2026-11-15',
        city: 'Makassar',
        package_id: 1,
        notes: 'Simulasi order client baru'
      };

      const res = await request(app)
        .post('/api/public/inquiry')
        .send(inquiryPayload);

      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('inquiry_id');
    });

    test('Client receives static web page when accessing via browser Accept header', async () => {
      const res = await request(app)
        .get('/')
        .set('Accept', 'text/html');

      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('<!DOCTYPE html>');
    });
  });

  // ==========================================
  // 2. ADMIN ROLE SIMULATION (JWT & API Key)
  // ==========================================
  describe('Role 2: Admin Flow Simulation', () => {
    test('Admin logins and receives JWT Token + Session', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('testadmin');

      adminJwtToken = res.body.token;
    });

    test('Admin uses JWT Bearer Token to access protected admin dashboard stats', async () => {
      expect(adminJwtToken).not.toBe('');

      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminJwtToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('revenue_total');
    });

    test('Admin creates an API Key for external integrations', async () => {
      const res = await request(app)
        .post('/api/admin/api-keys')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ name: 'Simulasi API Key Client External', scopes: 'read,write' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('apiKey');

      generatedApiKey = res.body.data.apiKey;
    });

    test('External system authenticates using X-API-Key header', async () => {
      expect(generatedApiKey).not.toBe('');

      const res = await request(app)
        .get('/api/admin/api-keys')
        .set('X-API-Key', generatedApiKey);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 3. FREELANCER ROLE SIMULATION
  // ==========================================
  describe('Role 3: Freelancer Flow Simulation', () => {
    test('Freelancer can submit recruitment application', async () => {
      const payload = {
        name: 'FG Simulasi Test',
        phone: '62811' + Math.floor(10000000 + Math.random() * 90000000),
        email: 'fg_simulasi@test.com',
        portfolio_url: 'https://instagram.com/fg_simulasi',
        specialties: ['Graduation', 'Group'],
        city: 'Makassar',
        gear_info: 'Sony A7IV + 35mm f1.4'
      };

      const res = await request(app)
        .post('/api/public/recruitment/apply')
        .send(payload);

      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('success', true);
    });

    test('Freelancer attempts auto-login with invalid access code', async () => {
      const res = await request(app)
        .post('/api/public/freelance-portal/auto-login')
        .send({ access_code: 'INVALID-CODE-999' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==========================================
  // 4. SMART HYBRID GOOGLE DRIVE TEST SUITE
  // ==========================================
  describe('Role 4: Smart Hybrid Google Drive Integration Tests', () => {
    test('Admin can query drive status endpoint (OAuth + Service Account)', async () => {
      const res = await request(app)
        .get('/api/admin/settings/drive-status')
        .set('Authorization', `Bearer ${adminJwtToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('oauth_connected');
      expect(res.body).toHaveProperty('mode');
      expect(res.body).toHaveProperty('storage_used_gb');
    });

    test('Admin direct file upload via POST /api/admin/bookings/:id/upload-to-drive handles multipart stream without multer conflict', async () => {
      const res = await request(app)
        .post('/api/admin/bookings/1/upload-to-drive?target=staging')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .attach('file', Buffer.from('fake image content'), 'test_image.jpg');

      expect([200, 400, 404]).toContain(res.statusCode);
      expect(res.body.error).not.toBe('Unexpected end of form');
    });

    test('Admin can disconnect OAuth and trigger automatic fallback mode', async () => {
      const res = await request(app)
        .post('/api/admin/settings/drive-disconnect')
        .set('Authorization', `Bearer ${adminJwtToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
