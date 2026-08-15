/**
 * admin_settings_integration.test.js
 * Test suite khusus untuk pengujian awal setup & integrasi Admin Settings
 * Memastikan Google Drive, WA Templates, Bank Account, Retention, dan Profil terkonfigurasi & terintegrasi.
 */

const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Admin Settings & System Integrations Setup Test Suite', () => {
  let db;
  let adminJwtToken = '';

  beforeAll(async () => {
    migrate();
    db = getDb();

    // Ensure test admin account exists
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'settings_testadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('settings_testadmin', ?, 'Test Settings Admin', 'admin', 1)
      `).run(passHash);
    }

    // Login to get JWT
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'settings_testadmin', password: 'password123' });
    adminJwtToken = res.body.token;
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE username = 'settings_testadmin'").run();
    } catch (e) {}
  });

  // ==========================================
  // 1. GENERAL ADMIN SETTINGS & PROFILES
  // ==========================================
  describe('1. General Settings & Admin Profile', () => {
    test('Admin can fetch all system settings and wa templates', async () => {
      const res = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${adminJwtToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('settings');
      expect(res.body).toHaveProperty('wa_templates');
      expect(res.body.settings).toHaveProperty('drive_retention_months');
    });

    test('Admin can update general system settings (Retention, Brand Name, Drive Folder ID)', async () => {
      const res = await request(app)
        .post('/api/admin/settings')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({
          company_name: 'AmsDev Wisuda Photography Test',
          drive_retention_months: 3,
          drive_auto_trash_enabled: 1,
          google_drive_master_folder_id: '1fh9xnNNW66tuvCbKLC0hd1TDK6H3cnyT',
          google_drive_api_key: 'AIzaSyFakeTestApiKey123456789'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('drive_retention_months');
    });
  });

  // ==========================================
  // 2. GOOGLE DRIVE MASTER INTEGRATION
  // ==========================================
  describe('2. Google Drive Master Integration Setup', () => {
    test('Admin can query Google Drive status & connected OAuth account', async () => {
      const res = await request(app)
        .get('/api/admin/settings/drive-status')
        .set('Authorization', `Bearer ${adminJwtToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('oauth_connected');
      expect(res.body).toHaveProperty('master_folder_id');
    });

    test('Admin can update Master Root Folder ID via settings endpoint', async () => {
      const res = await request(app)
        .post('/api/admin/settings')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ google_drive_master_folder_id: '1fh9xnNNW66tuvCbKLC0hd1TDK6H3cnyT' });

      expect(res.statusCode).toBe(200);
      expect(res.body.google_drive_master_folder_id).toBe('1fh9xnNNW66tuvCbKLC0hd1TDK6H3cnyT');
    });
  });

  // ==========================================
  // 3. PAYMENT BANK ACCOUNTS INTEGRATION
  // ==========================================
  describe('3. Payment Bank Accounts Management', () => {
    test('Admin can update bank accounts list inside settings', async () => {
      const bankAccounts = [
        { bank: 'BCA', norek: '1234567890', atas_nama: 'AmsDev Studio' },
        { bank: 'Mandiri', norek: '0987654321', atas_nama: 'AmsDev Studio' }
      ];

      const res = await request(app)
        .post('/api/admin/settings')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ bank_accounts: bankAccounts });

      expect(res.statusCode).toBe(200);
      expect(res.body.bank_accounts).toHaveLength(2);
      expect(res.body.bank_accounts[0].bank).toBe('BCA');
    });

    test('PUT /settings rejects activating QRIS when credentials are unverified', async () => {
      const { setSetting } = require('../config/wa-templates');
      setSetting('ipaymu_verified', '0');
      
      const res = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ ipaymu_enabled: '1' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('tidak dapat diaktifkan');
    });

    test('Admin can update iPaymu QRIS payment gateway settings when verified', async () => {
      const { setSetting } = require('../config/wa-templates');
      setSetting('ipaymu_va', '1179000899');
      setSetting('ipaymu_api_key', 'SANDBOX-TEST-API-KEY-12345');
      setSetting('ipaymu_verified', '1');

      const res = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({
          ipaymu_enabled: '1',
          ipaymu_env: 'sandbox'
        });

      expect(res.statusCode).toBe(200);
      expect(String(res.body.ipaymu_enabled)).toBe('1');
      expect(res.body.ipaymu_env).toBe('sandbox');
      expect(String(res.body.ipaymu_va)).toBe('1179000899');
      expect(res.body.ipaymu_api_key).toBe('SANDBOX-TEST-API-KEY-12345');
    });

    test('POST /verify-ipaymu returns 400 when VA or API Key is missing', async () => {
      const res = await request(app)
        .post('/api/admin/settings/verify-ipaymu')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ ipaymu_va: '', ipaymu_api_key: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ==========================================
  // 4. WHATSAPP TEMPLATES & AUTOMATION SETUP
  // ==========================================
  describe('4. WhatsApp Notification Templates Setup', () => {
    test('Admin can update WhatsApp message templates via PUT endpoint', async () => {
      const res = await request(app)
        .put('/api/admin/settings/wa-templates')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({
          templates: {
            client_quotation: 'Halo {client_name}, ini link penawaran foto wisuda Kakak.'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('client_quotation');
    });
  });
});
