const request = require('supertest');
const { app } = require('../main');
const { getDb, migrate } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

describe('Cancellation & Hard Delete Flow Test Suite', () => {
  let bookingId = null;
  let pkgId = 1;
  let fgId = null;
  let cookie = '';

  beforeAll(async () => {
    migrate();
    const db = getDb();

    // 1. Seed Admin user for test login
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'canceladmin'").get();
    if (!existingAdmin) {
      const passHash = await hashPassword('password123');
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, active)
        VALUES ('canceladmin', ?, 'Cancel Admin', 'admin', 1)
      `).run(passHash);
    }

    // 2. Get or create package
    const pkg = db.prepare("SELECT id FROM packages LIMIT 1").get();
    if (pkg) pkgId = pkg.id;

    // 3. Create dummy freelancer
    const fgRes = db.prepare(`
      INSERT INTO freelancers (name, phone, city, active)
      VALUES ('FG Test Cancel', '08999998888', 'Makassar', 1)
    `).run();
    fgId = fgRes.lastInsertRowid;

    // 4. Create dummy booking
    const bRes = db.prepare(`
      INSERT INTO bookings (client_name, client_phone, graduation_date, city, package_id, total_price, dp_amount, balance_amount, dp_status, status)
      VALUES ('Client Test Batal', '08111222333', '2026-09-15', 'Makassar', ?, 1500000, 750000, 750000, 'paid', 'confirmed')
    `).run(pkgId);
    bookingId = bRes.lastInsertRowid;

    // 5. Create assignment & schedule entry
    db.prepare(`
      INSERT INTO assignments (booking_id, fg_id, status)
      VALUES (?, ?, 'assigned')
    `).run(bookingId, fgId);

    db.prepare(`
      INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id)
      VALUES (?, '2026-09-15', 'booked', ?)
    `).run(fgId, bookingId);

    // 6. Login to get session cookie
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'canceladmin', password: 'password123' });
    
    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'];
    }
  });

  afterAll(() => {
    const db = getDb();
    if (bookingId) {
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(bookingId);
      db.prepare("DELETE FROM assignments WHERE booking_id = ?").run(bookingId);
      db.prepare("DELETE FROM bookings WHERE id = ?").run(bookingId);
    }
    if (fgId) {
      db.prepare("DELETE FROM freelancers WHERE id = ?").run(fgId);
    }
    db.prepare("DELETE FROM users WHERE username = 'canceladmin'").run();
  });

  test('POST /api/admin/bookings/:id/cancel should mark status = cancelled and release FG schedule', async () => {
    const res = await request(app)
      .post(`/api/admin/bookings/${bookingId}/cancel`)
      .set('Cookie', cookie)
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('cancelled');

    const db = getDb();
    // Verify booking status is cancelled
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    expect(booking.status).toBe('cancelled');
    expect(booking.dp_amount).toBe(750000); // Finance DP retained!

    // Verify schedule entry is freed
    const sched = db.prepare("SELECT * FROM fg_schedules WHERE booking_id = ?").get(bookingId);
    expect(sched).toBeUndefined();
  });

  test('DELETE /api/admin/bookings/:id on cancelled booking should clean delete permanently', async () => {
    const res = await request(app)
      .delete(`/api/admin/bookings/${bookingId}`)
      .set('Cookie', cookie)
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const db = getDb();
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    expect(booking).toBeUndefined();
    bookingId = null; // Prevent double cleanup in afterAll
  });
});
