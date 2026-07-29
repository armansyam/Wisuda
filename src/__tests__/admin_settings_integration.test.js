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
          company_name: 'Luxenary Wisuda Photography Test',
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
      const bankList = [
        { bank_name: 'BCA Test', account_number: '9999888777', account_name: 'PT Luxenary Studio', is_active: 1 }
      ];

      const res = await request(app)
        .post('/api/admin/settings')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ bank_accounts: bankList });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('bank_accounts');
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
            client_booking_token: 'Halo {client_name}, ini link konfirmasi booking wisuda Kakak.'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('client_booking_token');
    });
  });
});
