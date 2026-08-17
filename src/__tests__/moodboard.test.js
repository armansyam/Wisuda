const request = require('supertest');
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const { getDb, migrate } = require('../config/database');
const moodboardRoutes = require('../routes/moodboard');
const { runMoodboardStorageCleanup } = require('../services/cron.service');

const app = express();
app.use(express.json());
app.use(fileUpload({ useTempFiles: false }));
app.use('/api/public/moodboard', moodboardRoutes);

describe('Fitur Moodboard & Referensi Foto Wisuda', () => {
  let db;
  let bookingId;
  const trackingToken = 'tok_test_moodboard_123';

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    migrate();
    db = getDb();

    let pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    let pkgId = pkg ? pkg.id : null;
    if (!pkgId) {
      const pRes = db.prepare("INSERT INTO packages (name, price, active) VALUES ('Paket Test', 1000000, 1)").run();
      pkgId = pRes.lastInsertRowid;
    }

    // Clean up any stale test record
    db.prepare('DELETE FROM bookings WHERE tracking_token = ?').run(trackingToken);

    // Create test booking
    const result = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, university, package_id, total_price, dp_amount, balance_amount, status, tracking_token, moodboard_drive_url)
      VALUES ('Sarah Moodboard Test', '628123456789', '2026-08-15', 'Universitas Indonesia', ?, 1000000, 500000, 500000, 'confirmed', ?, 'https://drive.google.com/drive/folders/1test_moodboard_folder_id')
    `).run(pkgId, trackingToken);
    bookingId = result.lastInsertRowid;

    // Create sample published portfolio item
    db.prepare(`
      INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, published)
      VALUES (?, 'S', 2026, 'Universitas Indonesia', 'Jakarta', '/uploads/portfolio/sample.jpg', '["/uploads/portfolio/p1.jpg", "/uploads/portfolio/p2.jpg"]', 1)
    `).run(bookingId);
  });

  afterAll(() => {
    try {
      db.prepare('DELETE FROM booking_moodboards WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM portfolio_items WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
    } catch (e) { }
  });

  test('GET /api/public/moodboard/:tokenOrId - harus mengembalikan data moodboard & katalog portofolio', async () => {
    const res = await request(app).get(`/api/public/moodboard/${trackingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.booking_id).toBe(bookingId);
    expect(res.body.client_name).toBe('Sarah Moodboard Test');
    expect(res.body.items).toEqual([]);
    expect(Array.isArray(res.body.portfolio_catalog)).toBe(true);
    expect(res.body.portfolio_catalog.length).toBeGreaterThan(0);
  });

  test('POST /api/public/moodboard/:tokenOrId - tambah item dari portofolio vendor', async () => {
    const res = await request(app)
      .post(`/api/public/moodboard/${trackingToken}`)
      .send({
        source: 'portfolio',
        portfolio_url: '/uploads/portfolio/p1.jpg',
        category: 'couple',
        note: 'Mau pose romantic pegang buket'
      });

    expect(res.status).toBe(201);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.source).toBe('portfolio');
    expect(res.body.item.url).toBe('/uploads/portfolio/p1.jpg');
    expect(res.body.item.category).toBe('couple');
    expect(res.body.item.note).toBe('Mau pose romantic pegang buket');

    // Verify DB update
    const record = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(bookingId);
    expect(record).toBeDefined();
    const items = JSON.parse(record.items);
    expect(items.length).toBe(1);
  });

  test('POST /api/public/moodboard/:tokenOrId - unggah berkas foto langsung ke Google Drive Moodboard', async () => {
    const driveFolder = require('../services/drive-folder.service');
    const uploadSpy = jest.spyOn(driveFolder, 'uploadPortfolioPhotoToDrive').mockResolvedValue('https://lh3.googleusercontent.com/d/uploaded_photo_123=s1600');

    const res = await request(app)
      .post(`/api/public/moodboard/${trackingToken}`)
      .field('source', 'upload')
      .field('category', 'solo')
      .field('note', 'Pose solo candid senyum')
      .attach('photo', Buffer.from('fake-image-binary-data'), 'referensi_solo.jpg');

    expect(res.status).toBe(201);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.source).toBe('upload');
    expect(res.body.item.url).toBe('https://lh3.googleusercontent.com/d/uploaded_photo_123=s1600');
    expect(res.body.item.category).toBe('solo');
    expect(res.body.item.note).toBe('Pose solo candid senyum');
    expect(uploadSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^mb_\d+/),
      expect.stringMatching(/image\/(webp|jpeg)/),
      expect.any(Buffer),
      '1test_moodboard_folder_id'
    );

    uploadSpy.mockRestore();
  });

  test('DELETE /api/public/moodboard/:tokenOrId/item/:itemId - hapus referensi', async () => {
    // Get current item ID
    const getRes = await request(app).get(`/api/public/moodboard/${trackingToken}`);
    const itemId = getRes.body.items[0].id;

    const delRes = await request(app).delete(`/api/public/moodboard/${trackingToken}/item/${itemId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.total_items).toBe(1);
  });

  test('GET /api/public/moodboard/:tokenOrId/pdf - stream inline PDF Briefing Sheet', async () => {
    const res = await request(app).get(`/api/public/moodboard/${trackingToken}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('inline');
  });

  test('GET /api/public/moodboard/:tokenOrId/view - tampilkan web view responsive', async () => {
    const res = await request(app).get(`/api/public/moodboard/${trackingToken}/view`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Briefing Moodboard');
    expect(res.text).toContain('Sarah Moodboard Test');
  });

  test('Auto-Cleanup Cron Job - membersihkan folder moodboard untuk booking completed > 7 hari', () => {
    // Set booking status to completed and date 10 days ago
    db.prepare("UPDATE bookings SET status = 'completed', graduation_date = '2026-01-01' WHERE id = ?").run(bookingId);

    // Add moodboard entry
    db.prepare("INSERT OR REPLACE INTO booking_moodboards (booking_id, items, cleaned_up) VALUES (?, '[\"sample\"]', 0)").run(bookingId);

    // Run cleanup
    runMoodboardStorageCleanup();

    const updatedMB = db.prepare('SELECT cleaned_up FROM booking_moodboards WHERE booking_id = ?').get(bookingId);
    expect(updatedMB.cleaned_up).toBe(1);
  });
});
