const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { parseTimeToMinutes, checkTimeOverlap, checkFgConflict } = require('../utils/timeSlot');
const { hashPassword } = require('../middleware/auth');

describe('Time-Slot Overlap Engine & Reschedule Feature Test', () => {
  let db;
  let adminToken = '';
  let testFgId = null;
  let bookingId1 = null;
  let bookingId2 = null;
  let trackingToken1 = 'TRK-TEST-RESCHEDULE-1-' + Date.now();
  let trackingToken2 = 'TRK-TEST-RESCHEDULE-2-' + Date.now();

  beforeAll(async () => {
    migrate();
    db = getDb();

    // Clean any prior test leftovers
    try {
      db.prepare("DELETE FROM bookings WHERE tracking_token LIKE 'TRK-TEST-RESCHEDULE-%'").run();
      db.prepare("DELETE FROM freelancers WHERE phone = '6289999888877'").run();
      db.prepare("DELETE FROM users WHERE username = 'rescheduleadmin'").run();
    } catch (e) {}

    // 1. Seed admin user
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'rescheduleadmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('rescheduleadmin', ?, 'Reschedule Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Seed test freelancer
    const fgRes = db.prepare(`
      INSERT INTO freelancers (name, phone, city, active)
      VALUES ('FG Test Reschedule', '6289999888877', 'Makassar', 1)
    `).run();
    testFgId = fgRes.lastInsertRowid;

    // 3. Seed package
    const pkg = db.prepare('SELECT id FROM packages LIMIT 1').get();
    const pkgId = pkg ? pkg.id : 1;

    // 4. Seed booking 1 (Existing booking assigned to FG on 2026-12-01 at 09:00 - 11:00)
    const b1 = db.prepare(`
      INSERT INTO bookings (
        client_name, client_phone, graduation_date, shooting_time, duration_hours,
        status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status
      ) VALUES ('Client Existing', '6281111111111', '2026-12-01', '09:00', 2, 'shooting', ?, ?, 500000, 250000, 250000, 'paid')
    `).run(trackingToken1, pkgId);
    bookingId1 = b1.lastInsertRowid;

    // Assign FG to Booking 1
    db.prepare(`
      INSERT INTO assignments (booking_id, fg_id, status)
      VALUES (?, ?, 'assigned')
    `).run(bookingId1, testFgId);

    // 5. Seed booking 2 (Booking requesting reschedule)
    const b2 = db.prepare(`
      INSERT INTO bookings (
        client_name, client_phone, graduation_date, shooting_time, duration_hours,
        status, tracking_token, package_id, total_price, dp_amount, balance_amount, dp_status
      ) VALUES ('Client Rescheduling', '6282222222222', '2026-12-05', '14:00', 2, 'confirmed', ?, ?, 500000, 250000, 250000, 'paid')
    `).run(trackingToken2, pkgId);
    bookingId2 = b2.lastInsertRowid;

    // Assign FG to Booking 2
    db.prepare(`
      INSERT INTO assignments (booking_id, fg_id, status)
      VALUES (?, ?, 'assigned')
    `).run(bookingId2, testFgId);
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE username = 'rescheduleadmin'").run();
      db.prepare("DELETE FROM freelancers WHERE id = ?", testFgId).run();
      db.prepare("DELETE FROM bookings WHERE id IN (?, ?)", bookingId1, bookingId2).run();
      db.prepare("DELETE FROM assignments WHERE booking_id IN (?, ?)", bookingId1, bookingId2).run();
      db.prepare("DELETE FROM reschedule_requests WHERE booking_id IN (?, ?)", bookingId1, bookingId2).run();
    } catch (e) {}
  });

  // ==========================================
  // 1. TIME-SLOT OVERLAP ENGINE UNIT TESTS
  // ==========================================
  describe('Unit Test: Time-Slot Overlap Calculation', () => {
    test('parseTimeToMinutes converts HH:MM strings accurately', () => {
      expect(parseTimeToMinutes('09:00')).toBe(540);
      expect(parseTimeToMinutes('09:30')).toBe(570);
      expect(parseTimeToMinutes('14:15')).toBe(855);
    });

    test('checkTimeOverlap detects overlapping time slots correctly', () => {
      // Sesi A: 09:00 - 11:00, Sesi B: 10:00 - 12:00 -> OVERLAP (true)
      expect(checkTimeOverlap('09:00', 2, '10:00', 2)).toBe(true);

      // Sesi A: 09:00 - 11:00, Sesi B: 11:00 - 13:00 -> NO OVERLAP (false)
      expect(checkTimeOverlap('09:00', 2, '11:00', 2)).toBe(false);

      // Sesi A: 09:00 - 11:00, Sesi B: 07:00 - 08:30 -> NO OVERLAP (false)
      expect(checkTimeOverlap('09:00', 2, '07:00', 1.5)).toBe(false);

      // Sesi A: 09:00 - 12:00, Sesi B: 11:30 - 13:30 -> OVERLAP (true)
      expect(checkTimeOverlap('09:00', 3, '11:30', 2)).toBe(true);
    });

    test('checkFgConflict correctly identifies FG schedule collision', () => {
      // Test FG on 2026-12-01 at 09:30 (overlaps with 09:00 - 11:00)
      const conflictResult = checkFgConflict(db, testFgId, '2026-12-01', '09:30', 2, bookingId2);
      expect(conflictResult.hasConflict).toBe(true);
      expect(conflictResult.conflictingBooking.id).toBe(bookingId1);

      // Test FG on 2026-12-01 at 13:00 (no overlap with 09:00 - 11:00)
      const noConflictResult = checkFgConflict(db, testFgId, '2026-12-01', '13:00', 2, bookingId2);
      expect(noConflictResult.hasConflict).toBe(false);
    });
  });

  // ==========================================
  // 2. END-TO-END RESCHEDULE FLOW INTEGRATION
  // ==========================================
  describe('Integration Test: Client Reschedule Request & Conflict Detection', () => {
    test('Client submits reschedule request for conflicting time slot -> returns fg_conflict_status: conflict', async () => {
      // Booking 2 tries to move to 2026-12-01 at 10:00 (conflicts with Booking 1 at 09:00-11:00)
      const res = await request(app)
        .post(`/api/public/tracking/${bookingId2}/reschedule`)
        .send({
          code: trackingToken2,
          new_graduation_date: '2026-12-01',
          new_shooting_time: '10:00',
          reason: 'Ada acara keluarga pagi'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fg_conflict_status).toBe('conflict');
    });

    test('Admin logs in and views reschedule requests list with conflict details', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .send({ username: 'rescheduleadmin', password: 'password123' });

      expect(loginRes.statusCode).toBe(200);
      adminToken = loginRes.body.token;

      const res = await request(app)
        .get('/api/admin/reschedule-requests?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const reqRecord = res.body.data.find(r => r.booking_id === bookingId2);
      expect(reqRecord).toBeDefined();
      expect(reqRecord.is_conflicting).toBe(true);
    });

    test('Admin approves reschedule request and updates booking schedule', async () => {
      const reqRecord = db.prepare("SELECT id FROM reschedule_requests WHERE booking_id = ? AND status = 'pending'").get(bookingId2);
      expect(reqRecord).toBeDefined();

      const res = await request(app)
        .post(`/api/admin/reschedule-requests/${reqRecord.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify booking schedule was updated
      const updatedBooking = db.prepare('SELECT graduation_date, shooting_time FROM bookings WHERE id = ?').get(bookingId2);
      expect(updatedBooking.graduation_date).toBe('2026-12-01');
      expect(updatedBooking.shooting_time).toBe('10:00');
    });

    test('Admin can directly edit booking schedule via PUT /api/admin/bookings/:id', async () => {
      const res = await request(app)
        .put(`/api/admin/bookings/${bookingId2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          graduation_date: '2026-12-10',
          shooting_time: '15:00',
          duration_hours: 2,
          location: 'Gedung Manunggal Makassar'
        });

      expect([200, 201]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });
});
