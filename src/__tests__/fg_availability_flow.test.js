const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('FG Availability & Flexible Re-assign Engine Test Suite', () => {
  let db;
  let adminToken = '';
  let fg1Id = null;
  let fg2Id = null;
  let fg1Code = 'FG-TEST-AVAIL-1-' + Date.now();
  let fg2Code = 'FG-TEST-AVAIL-2-' + Date.now();
  let bookingId = null;
  let assignmentId = null;
  let fg2SessionToken = null; // SEC-08: session token untuk fg2 confirm-session

  beforeAll(async () => {
    migrate();
    db = getDb();

    // 1. Seed Admin
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'fgavailadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('fgavailadmin', ?, 'FG Avail Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Seed 2 Freelancers
    const res1 = db.prepare(`
      INSERT INTO freelancers (name, phone, city, access_code, active)
      VALUES ('FG Alpha', '6287771112223', 'Makassar', ?, 1)
    `).run(fg1Code);
    fg1Id = res1.lastInsertRowid;

    const res2 = db.prepare(`
      INSERT INTO freelancers (name, phone, city, access_code, active)
      VALUES ('FG Beta', '6287771112224', 'Makassar', ?, 1)
    `).run(fg2Code);
    fg2Id = res2.lastInsertRowid;

    // 3. Seed Package
    const pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    const pkgId = pkg ? pkg.id : 1;

    // 4. Seed Booking
    const trackingToken = 'TRK-TEST-FGAVAIL-' + Date.now();
    const b = db.prepare(`
      INSERT INTO bookings (
        client_name, client_phone, graduation_date, shooting_time, duration_hours,
        status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status
      ) VALUES ('Client FG Avail Test', '6285554443332', '2026-12-15', '09:00', 2, 'confirmed', ?, ?, 600000, 300000, 300000, 'paid')
    `).run(trackingToken, pkgId);
    bookingId = b.lastInsertRowid;

    // Initial Direct Assign to FG Alpha (100% Admin-Centric)
    const asgn = db.prepare(`
      INSERT INTO assignments (booking_id, fg_id, status, offer_status)
      VALUES (?, ?, 'confirmed', 'accepted')
    `).run(bookingId, fg1Id);
    assignmentId = asgn.lastInsertRowid;
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE username = 'fgavailadmin'").run();
      db.prepare("DELETE FROM freelancers WHERE id IN (?, ?)", fg1Id, fg2Id).run();
      db.prepare("DELETE FROM bookings WHERE id = ?", bookingId).run();
      db.prepare("DELETE FROM assignments WHERE booking_id = ?", bookingId).run();
      db.prepare("DELETE FROM fg_schedules WHERE fg_id IN (?, ?)", fg1Id, fg2Id).run();
    } catch (e) {}
  });

  describe('1. FG Availability Calendar Management', () => {
    // NOTE: /availability endpoints dihapus saat cleanup dead code (TST-260817-02)
    // Test ini diskip sampai fitur availability diimplementasi ulang jika diperlukan
    test.skip('FG Alpha marks a date as busy_external with time slot [SKIPPED: endpoint removed]', async () => {
      const res = await request(app)
        .post('/api/public/freelance-portal/availability')
        .send({
          code: fg1Code,
          date: '2026-12-15',
          status: 'busy_external',
          start_time: '08:00',
          end_time: '12:00',
          notes: 'Job Vendor X'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const sched = db.prepare('SELECT * FROM fg_schedules WHERE fg_id = ? AND date = ?').get(fg1Id, '2026-12-15');
      expect(sched).toBeDefined();
      expect(sched.status).toBe('busy_external');
    });

    test.skip('FG fetches schedule availability via GET /api/public/freelance-portal/availability [SKIPPED: endpoint removed]', async () => {
      const res = await request(app)
        .get(`/api/public/freelance-portal/availability?code=${fg1Code}&month=2026-12`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('2. Direct Assignment Verification (100% Admin-Centric)', () => {
    test('Assigned task is immediately active without requiring freelance confirmation', async () => {
      const asgn = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
      expect(asgn.status).toBe('confirmed');
      expect(asgn.offer_status).toBe('accepted');
    });
  });

  describe('3. Admin Flexible Re-assign / Switch FG Endpoint', () => {
    test('Admin logs in and switches FG assignment from FG Alpha to FG Beta', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .send({ username: 'fgavailadmin', password: 'password123' });

      expect(loginRes.statusCode).toBe(200);
      adminToken = loginRes.body.token;

      const res = await request(app)
        .post(`/api/admin/bookings/${bookingId}/reassign-fg`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_fg_id: fg2Id,
          shooting_time: '14:00',
          reason: 'FG1 bentrok job luar, beralih ke FG Beta'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assignment.fg_id).toBe(fg2Id);
      expect(res.body.wa_link).toContain('api.whatsapp.com');

      // Verify new assignment in DB
      const newAsgn = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status IN ('assigned', 'confirmed')").get(bookingId);
      expect(newAsgn).toBeDefined();
      expect(newAsgn.fg_id).toBe(fg2Id);

      // Verify old assignment cancelled
      const oldAsgn = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND fg_id = ?").get(bookingId, fg1Id);
      expect(oldAsgn.status).toBe('cancelled');
    });

    test('FG Beta can confirm session completed on portal', async () => {
      const activeAsgn = db.prepare("SELECT id FROM assignments WHERE booking_id = ? AND status IN ('assigned', 'confirmed')").get(bookingId);

      // SEC-08 fix: Login FG Beta dulu untuk mendapat session_token (bukan access_code langsung)
      const loginRes = await request(app)
        .post('/api/public/freelance-portal/login')
        .send({
          phone: '6287771112224',
          access_code: fg2Code
        });
      expect(loginRes.statusCode).toBe(200);
      fg2SessionToken = loginRes.body.token;
      expect(fg2SessionToken).toBeDefined();

      const res = await request(app)
        .post('/api/public/freelance-portal/confirm-session')
        .send({
          session_token: fg2SessionToken, // SEC-08: gunakan session_token bukan access_code
          assignment_id: activeAsgn.id
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.is_session_done).toBe(1);
    });
  });
});
