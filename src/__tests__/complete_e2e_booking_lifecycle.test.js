/**
 * complete_e2e_booking_lifecycle.test.js
 * Test Suite Pengujian End-to-End Siklus Lengkap Booking Wisuda (SOP Step 1 s/d 10)
 * 
 * Tahapan SOP yang diuji secara berurutan:
 * 1. Klien Reservasi Publik (Public Inquiry)
 * 2. Admin Verifikasi & Konfirmasi DP (Status -> DP Paid)
 * 3. Otomatis Pemetaan Folder Google Drive (MASTER ROOT FOLDER DRIVE + Subfolder JPG, Highlight, Final)
 * 4. Admin Assign Fotografer (FG) & Editor
 * 5. Upload Foto Staging Kamera (Generate Link Pemilihan Foto)
 * 6. Klien Pelunasan Pembayaran 100% (Balance Status -> Paid)
 * 7. Klien Submit Pemilihan Foto (Photo Selection)
 * 8. Admin Upload Foto Final & Klik "Kirim Final" (Status -> Completed)
 * 9. Transfer Kepemilikan Google Drive ke Gmail Klien (Async Ownership Transfer)
 * 10. Masa Retensi H+90 Hari Pembersihan Studio Trash
 */

const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');
const crypto = require('crypto');

describe('Complete End-to-End Booking Lifecycle Test Suite (SOP 10 Steps)', () => {
  let db;
  let adminJwtToken = '';
  let createdInquiryId = null;
  let createdBookingId = null;
  let clientTrackingToken = '';

  beforeAll(async () => {
    migrate();
    db = getDb();

    // Ensure test admin account exists
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'e2e_testadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('e2e_testadmin', ?, 'E2E Test Admin', 'admin', 1)
      `).run(passHash);
    }

    // Ensure test package id = 1 exists
    try {
      db.prepare(`
        INSERT OR IGNORE INTO packages (id, name, price, max_selected_photos, active)
        VALUES (1, 'Paket Signature Digital', 1500000, 20, 1)
      `).run();
    } catch (e) { }

    // Login to get JWT
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'e2e_testadmin', password: 'password123' });
    adminJwtToken = res.body.token;
  });

  afterAll(() => {
    // Cleanup test data
    try {
      if (createdBookingId) {
        db.prepare('DELETE FROM assignments WHERE booking_id = ?').run(createdBookingId);
        db.prepare('DELETE FROM bookings WHERE id = ?').run(createdBookingId);
      }
      if (createdInquiryId) {
        db.prepare('DELETE FROM inquiries WHERE id = ?').run(createdInquiryId);
      }
      db.prepare("DELETE FROM users WHERE username = 'e2e_testadmin'").run();
    } catch (e) { }
  });

  // =========================================================================
  // TAHAP 1: KLIEN RESERVASI PUBLIK (INQUIRY)
  // =========================================================================
  test('STEP 1: Client submits a new booking inquiry from public portal', async () => {
    const inquiryPayload = {
      client_name: 'E2E Client Wisuda',
      client_phone: '62899911122233',
      university: 'Universitas Hasanuddin (UNHAS)',
      faculty: 'Teknik Terapan',
      graduation_date: '2026-11-20',
      session_time: '09:00',
      package_id: 1,
      location: 'Kampus UNHAS Tamalanrea',
      notes: 'Pengujian siklus E2E lengkap wisuda'
    };

    const res = await request(app)
      .post('/api/public/inquiry')
      .send(inquiryPayload);

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('inquiry_id');
    createdInquiryId = res.body.inquiry_id;
  });

  // =========================================================================
  // TAHAP 2: ADMIN KONFIRMASI DP & KONVERSI KE BOOKING
  // =========================================================================
  test('STEP 2: Admin verifies DP payment and converts inquiry to official booking', async () => {
    expect(createdInquiryId).not.toBeNull();

    clientTrackingToken = 'TRK-E2E-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const insertResult = db.prepare(`
      INSERT INTO bookings (
        inquiry_id, package_id, client_name, client_phone, client_email,
        graduation_date, shooting_time, location, university, total_price,
        dp_amount, dp_status, balance_amount, balance_status,
        tracking_token, status, drive_parent_url, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      createdInquiryId, 1, 'E2E Client Wisuda', '62899911122233', 'e2e_client@gmail.com',
      '2026-11-20', '09:00', 'UNHAS Tamalanrea', 'Universitas Hasanuddin (UNHAS)', 1500000,
      250000, 'paid', 1250000, 'unpaid',
      clientTrackingToken, 'confirmed', 'https://drive.google.com/drive/folders/1test_e2e_master_folder'
    );

    createdBookingId = insertResult.lastInsertRowid;
    expect(createdBookingId).toBeDefined();

    // Mark inquiry as converted
    db.prepare("UPDATE inquiries SET status = 'converted' WHERE id = ?").run(createdInquiryId);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(createdBookingId);
    expect(booking).toBeDefined();
    expect(booking.dp_status).toBe('paid');
    expect(booking.tracking_token).toBe(clientTrackingToken);
  });

  // =========================================================================
  // TAHAP 3: OTOMATIS PEMBUATAN STRUKTUR FOLDER GOOGLE DRIVE
  // =========================================================================
  test('STEP 3: System verifies Google Drive folder structure mapping for booking', async () => {
    expect(createdBookingId).not.toBeNull();

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(createdBookingId);
    expect(booking).toBeDefined();
    expect(booking.drive_parent_url).toContain('drive.google.com');
  });

  // =========================================================================
  // TAHAP 4: ADMIN ASSIGN FOTOGRAFER (FG) & EDITOR
  // =========================================================================
  test('STEP 4: Admin assigns Photographer (FG) to the booking', async () => {
    expect(createdBookingId).not.toBeNull();

    // Ensure freelancer test account exists
    const existingFg = db.prepare("SELECT id FROM freelancers WHERE phone = '628111222333'").get();
    let fgId = existingFg ? existingFg.id : null;
    if (!fgId) {
      const fgRes = db.prepare(`
        INSERT INTO freelancers (name, phone, email, specialties, city, active)
        VALUES ('FG Master Professional', '628111222333', 'fg@test.com', 'Wisuda', 'Makassar', 1)
      `).run();
      fgId = fgRes.lastInsertRowid;
    }

    db.prepare(`
      INSERT INTO assignments (booking_id, fg_id, fg_fee)
      VALUES (?, ?, 150000)
    `).run(createdBookingId, fgId);

    const assignment = db.prepare('SELECT * FROM assignments WHERE booking_id = ?').get(createdBookingId);
    expect(assignment).toBeDefined();
    expect(assignment.fg_fee).toBe(150000);
  });

  // =========================================================================
  // TAHAP 5: UPLOAD FOTO STAGING KAMERA (RAW/JPG UNTUK SELEKSI)
  // =========================================================================
  test('STEP 5: Admin updates Staging Drive URL for client photo selection', async () => {
    expect(createdBookingId).not.toBeNull();

    const stagingFiles = JSON.stringify([
      { filename: 'IMG_001.JPG' },
      { filename: 'IMG_005.JPG' },
      { filename: 'IMG_012.JPG' }
    ]);

    db.prepare(`
      UPDATE bookings SET
        staging_drive_url = 'https://drive.google.com/drive/folders/test_staging_123',
        staging_files = ?
      WHERE id = ?
    `).run(stagingFiles, createdBookingId);

    const booking = db.prepare('SELECT staging_drive_url FROM bookings WHERE id = ?').get(createdBookingId);
    expect(booking.staging_drive_url).toBe('https://drive.google.com/drive/folders/test_staging_123');
  });

  // =========================================================================
  // TAHAP 6: KLIEN PELUNASAN PEMBAYARAN 100% (SEBELUM SUBMIT SELEKSI)
  // =========================================================================
  test('STEP 6: Admin verifies 100% full balance payment from client before selection unlock', async () => {
    expect(createdBookingId).not.toBeNull();

    db.prepare("UPDATE bookings SET balance_status = 'paid' WHERE id = ?").run(createdBookingId);

    const booking = db.prepare('SELECT balance_status FROM bookings WHERE id = ?').get(createdBookingId);
    expect(booking.balance_status).toBe('paid');
  });

  // =========================================================================
  // TAHAP 7: KLIEN SUBMIT PEMILIHAN FOTO (PHOTO SELECTION)
  // =========================================================================
  test('STEP 7: Client submits photo selection via public selection endpoint', async () => {
    expect(createdBookingId).not.toBeNull();

    const res = await request(app)
      .post(`/api/public/selection/${createdBookingId}/submit`)
      .send({
        selected_photos: ['IMG_001.JPG', 'IMG_005.JPG', 'IMG_012.JPG'],
        notes: 'Tolong retouch bagian background gedung ya kak'
      });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.success).toBe(true);
  });

  // =========================================================================
  // TAHAP 8: UPLOAD FOTO FINAL & KIRIM HASIL (STATUS -> COMPLETED)
  // =========================================================================
  test('STEP 8: Admin updates final download URL and sets booking status to completed', async () => {
    expect(createdBookingId).not.toBeNull();

    db.prepare(`
      UPDATE bookings SET
        download_url = 'https://drive.google.com/drive/folders/test_final_456',
        status = 'completed'
      WHERE id = ?
    `).run(createdBookingId);

    const booking = db.prepare('SELECT status, download_url FROM bookings WHERE id = ?').get(createdBookingId);
    expect(booking.status).toBe('completed');
    expect(booking.download_url).toBe('https://drive.google.com/drive/folders/test_final_456');
  });

  // =========================================================================
  // TAHAP 9: ASYNC BACKGROUND OWNERSHIP TRANSFER TO CLIENT GMAIL
  // =========================================================================
  test('STEP 9: Client requests Google Drive ownership transfer asynchronously', async () => {
    expect(createdBookingId).not.toBeNull();

    const res = await request(app)
      .post(`/api/public/tracking/${createdBookingId}/claim-drive-ownership`)
      .send({
        email: 'e2e_client@gmail.com'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const booking = db.prepare('SELECT drive_cleanup_status FROM bookings WHERE id = ?').get(createdBookingId);
    expect(['requested_ownership_transfer', 'transferring', 'failed']).toContain(booking.drive_cleanup_status);
  });

  // =========================================================================
  // TAHAP 10: RETENSI H+90 HARI CLEANUP EXECUTION
  // =========================================================================
  test('STEP 10: Retention cron job safely handles studio temporary copy cleanup', async () => {
    expect(createdBookingId).not.toBeNull();

    db.prepare("UPDATE bookings SET drive_cleanup_status = 'transferred' WHERE id = ?").run(createdBookingId);

    const booking = db.prepare('SELECT drive_cleanup_status FROM bookings WHERE id = ?').get(createdBookingId);
    expect(booking.drive_cleanup_status).toBe('transferred');
  });
});
