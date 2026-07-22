const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const config = require('../config/settings');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates, getSetting, setSetting } = require('../config/wa-templates');
const { requireAuth, requireRole, hashPassword, verifyPassword, checkLockout, recordLoginAttempt } = require('../middleware/auth');
const { handleValidation, paginationValidation, inquiryValidation, inquiryStatusValidation, quoteValidation, bookingDpValidation, bookingBalanceValidation, freelancerValidation, assignmentValidation, deliverableQcValidation } = require('../middleware/validation');
const { formatCurrency, formatDate, formatDateTime } = require('../utils/currency');
const { normalizeUniversity } = require('../utils/university');
const { saveFinalInvoiceSnapshot } = require('../utils/invoice');
const driveImporter = require('../services/drive-importer.service');

const router = express.Router();
const db = getDb();

// ============ AUTH (no auth required) ============
router.post('/login', [
  body('username').trim().isLength({ min: 1, max: 50 }).withMessage('Username wajib'),
  body('password').trim().isLength({ min: 1 }).withMessage('Password wajib'),
  handleValidation
], async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check lockout
    const lockout = checkLockout(username);
    if (lockout.locked) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit.' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    
    if (!user) {
      recordLoginAttempt(username, false);
      return res.status(401).json({ error: 'Username atau password salah' });
    }
    
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      recordLoginAttempt(username, false);
      return res.status(401).json({ error: 'Username atau password salah' });
    }
    
    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    recordLoginAttempt(username, true);
    
    // Regenerate session
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Session save error' });
        res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout gagal' });
    res.clearCookie('wisuda.sid');
    res.json({ success: true });
  });
});

// Apply auth to all remaining admin routes
router.use(requireAuth);

// ============ DASHBOARD ============
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {};
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${y}-${m}-01`;
    const lastDay = new Date(y, now.getMonth() + 1, 1).toISOString().slice(0, 10);
    const prevM = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevY = now.getMonth() === 0 ? y - 1 : y;
    const firstDayPrev = `${prevY}-${String(prevM).padStart(2,'0')}-01`;
    const prevEnd = `${y}-${m}-01`;

    // Revenue
    const revThis = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM bookings WHERE dp_status='paid' AND created_at>=? AND created_at<?`).get(firstDay, lastDay);
    const revLast = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM bookings WHERE dp_status='paid' AND created_at>=? AND created_at<?`).get(firstDayPrev, prevEnd);
    stats.revenue_this_month = revThis.t;
    stats.revenue_last_month = revLast.t;
    stats.revenue_trend = revLast.t > 0 ? Math.round((revThis.t - revLast.t) / revLast.t * 100) : (revThis.t > 0 ? 100 : 0);

    // All-time revenue
    stats.revenue_total = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM bookings WHERE dp_status='paid'`).get().t;

    // Inquiries
    stats.inquiries_total = db.prepare('SELECT COUNT(*) as c FROM inquiries').get().c;
    stats.inquiries_new = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='new'").get().c;
    stats.inquiries_quoted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='quoted'").get().c;
    stats.inquiries_booked = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='booked'").get().c;
    stats.inquiries_this_month = db.prepare(`SELECT COUNT(*) as c FROM inquiries WHERE created_at>=? AND created_at<?`).get(firstDay, lastDay).c;

    // Booking pipeline
    stats.bookings_total = db.prepare('SELECT COUNT(*) as c FROM bookings').get().c;
    stats.bookings_confirmed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='confirmed'").get().c;
    stats.bookings_shooting = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='shooting'").get().c;
    stats.bookings_delivered = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='delivered'").get().c;
    stats.bookings_completed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='completed'").get().c;
    stats.bookings_cancelled = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='cancelled'").get().c;
    stats.bookings_this_month = db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE created_at>=? AND created_at<?`).get(firstDay, lastDay).c;

    // Conversion rates
    stats.conversion_rate = stats.inquiries_total > 0 ? Math.round(stats.inquiries_booked / stats.inquiries_total * 100) : 0;
    stats.shooting_rate = stats.bookings_total > 0 ? Math.round(stats.bookings_shooting / stats.bookings_total * 100) : 0;
    stats.delivery_rate = stats.bookings_total > 0 ? Math.round(stats.bookings_delivered / stats.bookings_total * 100) : 0;
    stats.completion_rate = stats.bookings_total > 0 ? Math.round(stats.bookings_completed / stats.bookings_total * 100) : 0;

    // Pending verifications
    stats.dp_pending = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE dp_status='unpaid' AND status!='cancelled'").get().c;
    stats.dp_uploaded = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE dp_status='uploaded' AND status!='cancelled'").get().c;
    stats.balance_pending = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE balance_status='unpaid' AND dp_status='paid' AND status!='cancelled'").get().c;
    stats.balance_uploaded = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE balance_status='uploaded' AND status!='cancelled'").get().c;

    // Monthly revenue chart (last 6)
    const monthlyRev = db.prepare(`
      SELECT strftime('%m',created_at) as m, strftime('%Y',created_at) as y, COALESCE(SUM(total_price),0) as total
      FROM bookings WHERE dp_status='paid' AND created_at>=date('now','-6 months')
      GROUP BY y,m ORDER BY y,m
    `).all();
    stats.monthly_revenue = monthlyRev.map(r => ({ month: `${r.y}-${r.m}`, total: r.total }));

    // Weekly revenue (this month weeks)
    const weeklyRev = db.prepare(`
      SELECT CAST(strftime('%W',created_at) AS INTEGER) as wk, COALESCE(SUM(total_price),0) as total
      FROM bookings WHERE dp_status='paid' AND created_at>=? AND created_at<?
      GROUP BY wk ORDER BY wk
    `).all(firstDay, lastDay);
    stats.weekly_revenue = weeklyRev;

    // Upcoming shoots (next 14 days)
    stats.this_week_shoots = db.prepare(`
      SELECT COUNT(*) as c FROM bookings
      WHERE shooting_time IS NOT NULL AND shooting_time>=date('now') AND shooting_time<=date('now','+7 days')
      AND status IN ('confirmed','shooting')
    `).get().c;
    stats.next_week_shoots = db.prepare(`
      SELECT COUNT(*) as c FROM bookings
      WHERE shooting_time IS NOT NULL AND shooting_time>=date('now','+8 days') AND shooting_time<=date('now','+14 days')
      AND status IN ('confirmed')
    `).get().c;

    const upcoming = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.shooting_time, b.location, b.status,
             b.total_price, b.dp_status, b.balance_status,
             f.name as fg_name, f.phone as fg_phone
      FROM bookings b
      LEFT JOIN assignments a ON a.booking_id=b.id AND a.status IN ('assigned','confirmed')
      LEFT JOIN freelancers f ON a.fg_id=f.id
      WHERE b.shooting_time IS NOT NULL AND b.shooting_time>=date('now') AND b.shooting_time<=date('now','+7 days')
      AND b.status IN ('confirmed','shooting')
      ORDER BY b.shooting_time ASC LIMIT 8
    `).all();
    stats.upcoming_shoots = upcoming;

    // Recent activity
    const recent = [];
    db.prepare("SELECT 'booking_new' as type, id, client_name, status, created_at FROM bookings ORDER BY updated_at DESC LIMIT 4").all().forEach(r => recent.push(r));
    db.prepare("SELECT 'payment' as type, id, client_name, CASE WHEN dp_status='paid' THEN 'dp_paid' WHEN balance_status='paid' THEN 'balance_paid' ELSE status END as status, updated_at as created_at FROM bookings WHERE dp_status IN ('paid','uploaded') OR balance_status IN ('paid','uploaded') ORDER BY updated_at DESC LIMIT 4").all().forEach(p => recent.push(p));
    db.prepare("SELECT 'deliver' as type, id, client_name, status, updated_at as created_at FROM bookings WHERE status IN ('delivered','completed') ORDER BY updated_at DESC LIMIT 4").all().forEach(d => recent.push(d));
    recent.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    stats.recent_activity = recent.slice(0, 8);

    // Top FG
    const topFg = db.prepare(`
      SELECT f.id, f.name, f.phone, COUNT(a.id) as total_shoots, SUM(CASE WHEN a.status='done' THEN 1 ELSE 0 END) as completed
      FROM freelancers f JOIN assignments a ON a.fg_id=f.id
      WHERE a.created_at>=? AND a.created_at<?
      GROUP BY f.id ORDER BY total_shoots DESC LIMIT 5
    `).all(firstDay, lastDay);
    stats.top_fg = topFg.length ? topFg : db.prepare(`
      SELECT f.id, f.name, f.phone, COUNT(a.id) as total_shoots, SUM(CASE WHEN a.status='done' THEN 1 ELSE 0 END) as completed
      FROM freelancers f JOIN assignments a ON a.fg_id=f.id
      GROUP BY f.id ORDER BY total_shoots DESC LIMIT 5
    `).all();
    stats.fg_active = db.prepare("SELECT COUNT(*) as c FROM freelancers WHERE active=1").get().c;
    stats.assignments_pending = db.prepare("SELECT COUNT(*) as c FROM assignments WHERE status IN ('assigned','confirmed')").get().c;
    stats.payout_pending = db.prepare("SELECT COUNT(*) as c FROM payouts WHERE status='pending'").get().c;

    // Package popularity
    stats.package_popularity = db.prepare(`
      SELECT p.name, COUNT(b.id) as total FROM packages p
      LEFT JOIN bookings b ON b.package_id=p.id
      GROUP BY p.id ORDER BY total DESC LIMIT 5
    `).all();

    // Format currency
    Object.keys(stats).forEach(key => {
      if (key.includes('revenue') || key === 'revenue_total' || (!isNaN(Number(stats[key])) && key.includes('total') && !['bookings_total','inquiries_total','bookings_this_month','inquiries_this_month'].includes(key))) {
        if (typeof stats[key] === 'number' && key.includes('revenue')) stats[key] = formatCurrency(stats[key]);
      }
    });
    if (stats.monthly_revenue) stats.monthly_revenue.forEach(r => { r.total = formatCurrency(r.total); });
    if (stats.weekly_revenue) stats.weekly_revenue.forEach(r => { r.total = formatCurrency(r.total); });
    if (stats.upcoming_shoots) stats.upcoming_shoots.forEach(b => { if (b.total_price) b.total_price = formatCurrency(b.total_price); });
    if (stats.package_popularity) stats.package_popularity.forEach(p => { p.total = Number(p.total); });

    res.json(stats);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ============ INQUIRIES ============
router.get('/inquiries', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;
  
  // Auto-mark inquiries older than 15 days as 'lost'
  db.prepare(`
    UPDATE inquiries 
    SET status = 'lost', updated_at = CURRENT_TIMESTAMP 
    WHERE status IN ('new', 'converted', 'expired', 'quoted')
      AND date(created_at) < date('now', '-15 days')
  `).run();

  let where = 'NOT EXISTS (SELECT 1 FROM bookings WHERE bookings.inquiry_id = i.id)';
  const params = [];
  
  if (search) {
    where += ' AND (i.client_name LIKE ? OR i.client_phone LIKE ? OR i.university LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (status) {
    where += ' AND i.status = ?';
    params.push(status);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as c FROM inquiries i WHERE ${where}`).get(params).c;
  const rows = db.prepare(`
    SELECT i.*, p.name as package_name,
           (SELECT token FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as booking_token,
           (SELECT expires_at FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as token_expires_at,
           (SELECT used FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as token_used
    FROM inquiries i
    LEFT JOIN packages p ON i.package_id = p.id
    WHERE ${where}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get('/inquiries/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const inquiry = db.prepare(`
    SELECT i.*, p.name as package_name, p.price as package_price, p.fg_fee as package_fg_fee,
           (SELECT token FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as booking_token,
           (SELECT expires_at FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as token_expires_at,
           (SELECT used FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as token_used
    FROM inquiries i
    LEFT JOIN packages p ON i.package_id = p.id
    WHERE i.id = ?
  `).get(req.params.id);
  
  if (!inquiry) return res.status(404).json({ error: 'Not found' });
  res.json(inquiry);
});

router.post('/inquiries', inquiryValidation, (req, res) => {
  const { client_name, client_phone, client_email, graduation_date, location, university, package_id, notes } = req.body;
  
  const result = db.prepare(`
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email, graduation_date, location, university, package_id || null, notes || '');
  
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(result.lastInsertRowid);
  
  // Generate WA.me link for admin notification
  const templates = getWaTemplates();
  const settings = getSettings();
  const pkg = package_id ? db.prepare('SELECT name FROM packages WHERE id = ?').get(package_id) : null;
  
  let waMessage = templates.admin_new_inquiry
    .replace('{client_name}', client_name)
    .replace('{graduation_date}', formatDate(graduation_date))
    .replace('{location}', location)
    .replace('{package_name}', pkg?.name || '-')
    .replace('{client_phone}', client_phone);
  
  const waLink = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(waMessage)}`;
  
  res.status(201).json({ ...inquiry, wa_link: waLink });
});

router.post('/inquiries/:id/status', inquiryStatusValidation, (req, res) => {
  const { status } = req.body;
  
  db.prepare('UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  res.json(inquiry);
});

router.post('/inquiries/:id/generate-token', (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  
  const crypto = require('crypto');
  const token = crypto.randomBytes(16).toString('hex');
  
  const durationHours = req.body.duration_hours || 24;
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  
  // Clean up older unused tokens
  db.prepare('DELETE FROM booking_tokens WHERE inquiry_id = ? AND used = 0').run(req.params.id);
  
  db.prepare(`
    INSERT INTO booking_tokens (inquiry_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(inquiry.id, token, expiresAt);

  // Update inquiry status to 'converted'
  db.prepare("UPDATE inquiries SET status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(inquiry.id);
  
  const settings = getSettings();
  const link = `http://${req.get('host')}/confirm-booking.html?token=${token}`;
  const waMessage = `Halo ${inquiry.client_name}, silakan pilih paket foto wisuda kamu dari ${settings.companyName || 'Luxenary.co'} dan selesaikan booking melalui link berikut ini (berlaku ${durationHours} jam):\n${link}`;
  const waLink = `https://wa.me/${inquiry.client_phone}?text=${encodeURIComponent(waMessage)}`;
  
  res.json({
    token,
    expires_at: expiresAt,
    booking_url: link,
    wa_link: waLink
  });
});

// DELETE /api/admin/inquiries/:id (Clean delete inquiry)
router.delete('/inquiries/:id', (req, res) => {
  const inquiryId = req.params.id;
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(inquiryId);
  if (!inquiry) return res.status(404).json({ error: 'Data inquiry tidak ditemukan' });

  try {
    db.transaction(() => {
      // Check if inquiry was converted to a booking
      const booking = db.prepare('SELECT id FROM bookings WHERE inquiry_id = ?').get(inquiryId);
      if (booking) {
        const bId = booking.id;
        const assignments = db.prepare('SELECT id FROM assignments WHERE booking_id = ?').all(bId);
        assignments.forEach(a => {
          db.prepare('DELETE FROM deliverables WHERE assignment_id = ?').run(a.id);
          db.prepare('DELETE FROM payouts WHERE assignment_id = ?').run(a.id);
        });
        db.prepare('DELETE FROM assignments WHERE booking_id = ?').run(bId);
        db.prepare('DELETE FROM portfolio_items WHERE booking_id = ?').run(bId);
        db.prepare('DELETE FROM bookings WHERE id = ?').run(bId);
      }

      db.prepare('DELETE FROM booking_tokens WHERE inquiry_id = ?').run(inquiryId);
      db.prepare('DELETE FROM inquiries WHERE id = ?').run(inquiryId);
    })();

    res.json({ success: true, message: 'Data inquiry berhasil dihapus bersih.' });
  } catch (err) {
    console.error('Delete inquiry error:', err);
    res.status(500).json({ error: 'Gagal menghapus inquiry: ' + err.message });
  }
});

router.post('/inquiries/:id/quote', quoteValidation, (req, res) => {
  const { package_id } = req.body;
  
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
  if (!pkg) return res.status(400).json({ error: 'Paket tidak valid atau tidak aktif' });
  
  const dpPercentage = parseInt(getSetting('dp_percentage', 50));
  const totalPrice = pkg.price;
  const dpAmount = Math.round(totalPrice * dpPercentage / 100);
  const balanceAmount = totalPrice - dpAmount;
  
  // Update inquiry status
  db.prepare('UPDATE inquiries SET package_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(package_id, 'quoted', req.params.id);
  
  // Create booking record
  const r = db.prepare(`INSERT INTO bookings 
    (inquiry_id, package_id, client_name, client_phone, client_email, graduation_date, location, university, duration_hours, total_price, dp_amount, balance_amount, dp_status, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending')`)
    .run(inquiry.id, package_id, inquiry.client_name, inquiry.client_phone, inquiry.client_email, inquiry.graduation_date, inquiry.location, inquiry.university || '', pkg.duration_hours || 2, totalPrice, dpAmount, balanceAmount);
  
  const bookingId = r.lastInsertRowid;
  const bookingUrl = `http://${req.get('host')}/tracking.html?id=${bookingId}`;
  
  // Generate WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const bankAccounts = JSON.parse(getSetting('bank_accounts', '[]'));
  const bankList = bankAccounts.map(b => `${b.bank} - ${b.norek} a.n ${b.atas_nama}`).join('\n');
  
  let waMessage = (templates.client_quotation || '')
    .replace(/{company_name}/g, settings.companyName || 'Luxenary.co')
    .replace('{client_name}', inquiry.client_name)
    .replace('{graduation_date}', formatDate(inquiry.graduation_date))
    .replace('{package_name}', pkg.name)
    .replace('{total_price}', formatCurrency(totalPrice))
    .replace('{dp_amount}', formatCurrency(dpAmount))
    .replace('{bank_list}', bankList)
    .replace('{admin_phone}', settings.adminPhone) + '\n\n✅ Link Booking: ' + bookingUrl;
  
  const waLink = `https://wa.me/${inquiry.client_phone}?text=${encodeURIComponent(waMessage)}`;
  
  res.json({ 
    inquiry: { ...inquiry, package_id, status: 'quoted' }, 
    booking: { id: bookingId },
    wa_link: waLink, 
    booking_url: bookingUrl,
    dp_amount: dpAmount, 
    total_price: totalPrice 
  });
});

// ============ BOOKINGS ============
router.get('/bookings', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;
  
  let where = '1=1';
  const params = [];
  
  if (search) {
    where += ' AND (b.client_name LIKE ? OR b.client_phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }
  if (status) {
    where += ' AND b.status = ?';
    params.push(status);
  } else {
    where += " AND b.status NOT IN ('editing', 'delivered', 'completed', 'cancelled')";
  }
  
  const total = db.prepare(`SELECT COUNT(*) as c FROM bookings b WHERE ${where}`).get(params).c;
  const rows = db.prepare(`
    SELECT b.*, p.name as package_name,
           a.id as assignment_id, f.name as fg_name, a.status as assignment_status,
           f.access_code as fg_code, f.phone as fg_phone,
           d.qc_status as qc_status, d.drive_folder_url as fg_drive_url, d.delivery_type as delivery_type
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    WHERE ${where}
    ORDER BY b.graduation_date ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get('/bookings/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, p.name as package_name, p.fg_fee as package_fg_fee,
           a.id as assignment_id, a.fg_id, a.status as assignment_status,
           f.name as fg_name, f.phone as fg_phone, f.access_code as fg_code
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE b.id = ?
  `).get(req.params.id);
  
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  // Get deliverables
  const deliverables = db.prepare(`
    SELECT d.*, a.fg_id
    FROM deliverables d
    JOIN assignments a ON d.assignment_id = a.id
    WHERE a.booking_id = ?
  `).all(req.params.id);
  
  // Get payouts
  const payouts = db.prepare(`
    SELECT p.*
    FROM payouts p
    JOIN assignments a ON p.assignment_id = a.id
    WHERE a.booking_id = ?
  `).all(req.params.id);
  
  res.json({ ...booking, deliverables, payouts });
});

router.post('/bookings/:id/verify-dp', bookingDpValidation, (req, res) => {
  const { dp_amount, dp_bukti_url } = req.body;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  
  // Verify amount matches
  if (dp_amount !== booking.dp_amount) {
    return res.status(400).json({ error: `Nominal DP harus ${formatCurrency(booking.dp_amount)}` });
  }
  
  const isFullPayment = booking.balance_status === 'uploaded' && booking.dp_status === 'uploaded';
  
  if (isFullPayment) {
    db.prepare(`
      UPDATE bookings 
      SET dp_status = 'paid', 
          balance_status = 'paid',
          dp_verified_by = ?, 
          dp_verified_at = CURRENT_TIMESTAMP, 
          balance_verified_by = ?,
          balance_verified_at = CURRENT_TIMESTAMP,
          dp_bukti_url = ?, 
          balance_bukti_url = ?,
          status = 'confirmed', 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.user.id, dp_bukti_url || '', dp_bukti_url || '', req.params.id);
  } else {
    db.prepare(`
      UPDATE bookings 
      SET dp_status = 'paid', dp_verified_by = ?, dp_verified_at = CURRENT_TIMESTAMP, dp_bukti_url = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, dp_bukti_url || '', req.params.id);
  }
  
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  
  // Generate invoice URL
  const invoiceUrl = `http://${req.get('host')}/invoice.html?id=${req.params.id}`;
  
  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = `http://${req.get('host')}/tracking.html?id=${booking.id}`;
  
  let waMessage;
  if (isFullPayment) {
    waMessage = (templates.client_fully_paid || '')
      .replace(/{company_name}/g, settings.companyName || 'Luxenary.co')
      .replace('{client_name}', booking.client_name || 'Kak')
      .replace('{booking_id}', booking.id)
      .replace('{invoice_url}', invoiceUrl)
      .replace('{tracking_url}', trackingUrl);
  } else {
    waMessage = (templates.client_dp_verified || '')
      .replace(/{company_name}/g, settings.companyName || 'Luxenary.co')
      .replace('{client_name}', booking.client_name || 'Kak')
      .replace('{booking_id}', booking.id)
      .replace('{contract_url}', invoiceUrl)
      .replace('{invoice_url}', invoiceUrl)
      .replace('{tracking_url}', trackingUrl)
      .replace('{admin_phone}', settings.adminPhone);
  }
  
  const waLink = `https://wa.me/${booking.client_phone}?text=${encodeURIComponent(waMessage)}`;
  
  res.json({ booking: updated, invoice_url: invoiceUrl, wa_link: waLink });
});

router.post('/bookings/:id/verify-balance', bookingBalanceValidation, (req, res) => {
  const { balance_bukti_url } = req.body;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  
  if (booking.balance_status === 'paid') {
    return res.status(400).json({ error: 'Sudah lunas' });
  }
  
  db.prepare(`
    UPDATE bookings 
    SET balance_status = 'paid', balance_verified_by = ?, balance_verified_at = CURRENT_TIMESTAMP, balance_bukti_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user.id, balance_bukti_url || '', req.params.id);
  
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  
  // Save static final invoice snapshot archive to /uploads/invoices-client/
  try {
    saveFinalInvoiceSnapshot(updated, db);
  } catch (err) {
    console.error('Failed to save final invoice snapshot archive:', err);
  }

  const invoiceUrl = `http://${req.get('host')}/invoice.html?id=${req.params.id}`;
  
  // WA.me links
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = `http://${req.get('host')}/tracking.html?id=${booking.id}`;
  
  let waMessageClient = (templates.client_fully_paid || '')
    .replace(/{company_name}/g, settings.companyName || 'Luxenary.co')
    .replace('{client_name}', booking.client_name || 'Kak')
    .replace('{booking_id}', booking.id)
    .replace('{invoice_url}', invoiceUrl)
    .replace('{tracking_url}', trackingUrl);
  
  const waLinkClient = `https://wa.me/${booking.client_phone}?text=${encodeURIComponent(waMessageClient)}`;
  
  // Notify admin
  let waMessageAdmin = `✅ Pelunasan Terverifikasi\nBooking ${booking.id} (${booking.client_name}) SELESAI.`;
  const waLinkAdmin = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(waMessageAdmin)}`;
  
  res.json({ booking: updated, invoice_url: invoiceUrl, wa_link_client: waLinkClient, wa_link_admin: waLinkAdmin });
});

// ============ BOOKING STATUS UPDATE ============
router.post('/bookings/:id/status', [
  param('id').isInt({ min: 1 }),
  body('status').isIn(['pending', 'confirmed', 'shooting', 'delivered', 'completed', 'cancelled']),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  
  const { status } = req.body;
  
  // Validate transition
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['shooting', 'cancelled'],
    'shooting': ['delivered', 'completed'],
    'delivered': ['completed', 'cancelled']
  };
  
  if (validTransitions[booking.status] && !validTransitions[booking.status].includes(status)) {
    return res.status(400).json({ error: `Cannot change from ${booking.status} to ${status}` });
  }
  
  db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  if (status === 'completed') {
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    try {
      saveFinalInvoiceSnapshot(updated, db);
    } catch (err) {
      console.error('Failed to save final invoice snapshot archive:', err);
    }
  }

  res.json({ status: 'ok', booking_status: status });
});

  // ============ DELIVER ============
  router.post('/bookings/:id/deliver', [
    param('id').isInt({ min: 1 }),
    body('download_url').trim().notEmpty().withMessage('Link download wajib'),
    body('password').optional().trim().isLength({ max: 20 }),
    handleValidation
  ], (req, res) => {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });
    if (booking.status !== 'shooting') return res.status(400).json({ error: 'Booking harus status shooting' });
    if (booking.balance_status !== 'paid') return res.status(400).json({ error: 'Pelunasan harus diverifikasi dulu' });

    const password = req.body.password || Math.random().toString(36).slice(2, 8).toUpperCase();
    const downloadUrl = req.body.download_url;

    // Save as deliverable - match actual database schema
    const assignment = db.prepare('SELECT id, fg_id FROM assignments WHERE booking_id = ?').get(req.params.id);
    if (!assignment) return res.status(400).json({ error: 'Assignment tidak ditemukan' });

    const delResult = db.prepare(`
      INSERT INTO deliverables (assignment_id, preview_url, total_photos, qc_status, delivered_at)
      VALUES (?, ?, 0, 'pending', CURRENT_TIMESTAMP)
    `).run(assignment.id, downloadUrl);

    // Update booking status
    db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('delivered', req.params.id);
    db.prepare("UPDATE assignments SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status != 'done'").run(req.params.id);

    // WA notification - handle missing templates gracefully
    const templates = getWaTemplates() || {};
    const settings = getSettings() || { companyName: 'Wisuda.', adminPhone: '+628****7890', client_phone: booking?.client_phone || '' };

    let waClient = templates?.client_delivered
      ? templates.client_delivered
          .replace('{booking_id}', booking.id)
          .replace('{download_url}', downloadUrl)
          .replace('{company_name}', settings.companyName)
      : `📸 Hasil foto Booking #${booking.id} (${booking.client_name}) sudah dikirim`;

    const waLinkClient = `https://wa.me/${booking.client_phone || settings.adminPhone}?text=${encodeURIComponent(waClient)}`;

    res.json({
      status: 'delivered',
      download_url: downloadUrl,
      password,
      wa_link_client: waLinkClient
    });
  });

router.post('/bookings/:id/assign-fg', [
  param('id').isInt({ min: 1 }),
  body('fg_id').isInt({ min: 1 }),
  body('shooting_time').optional().trim(),
  body('duration_hours').optional().isInt({ min: 1, max: 12 }),
  body('location').optional().trim().isLength({ max: 200 }),
  body('brief').optional().trim().isLength({ max: 500 }),
  body('fg_fee').optional().isInt({ min: 0 }),
  handleValidation
], (req, res) => {
  const { fg_id, shooting_time, duration_hours, location, brief, fg_fee } = req.body;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.dp_status !== 'paid') {
    return res.status(400).json({ error: 'DP pembayaran harus diverifikasi lunas oleh admin sebelum Assign FG' });
  }
  
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND active = 1').get(fg_id);
  if (!fg) return res.status(400).json({ error: 'FG tidak ditemukan atau tidak aktif' });
  
  // Check existing assignment
  const existing = db.prepare('SELECT * FROM assignments WHERE booking_id = ?').get(req.params.id);
  if (existing) return res.status(400).json({ error: 'Booking sudah punya FG assignment' });
  
  // Calculate FG Fee based on priority hierarchy
  let finalFgFee = 0;
  if (fg_fee !== undefined && fg_fee !== null && fg_fee !== '') {
    finalFgFee = parseInt(fg_fee);
  } else if (fg.default_rate && fg.default_rate > 0) {
    finalFgFee = fg.default_rate;
  } else {
    const pkg = db.prepare('SELECT fg_fee FROM packages WHERE id = ?').get(booking.package_id);
    finalFgFee = pkg ? pkg.fg_fee : 0;
  }

  // Update booking with shooting details
  const updates = [];
  const bParams = [];
  if (shooting_time) { updates.push('shooting_time = ?'); bParams.push(shooting_time); }
  if (duration_hours) { updates.push('duration_hours = ?'); bParams.push(duration_hours); }
  if (location) { updates.push('location = ?'); bParams.push(location); }
  if (updates.length > 0) {
    bParams.push(req.params.id);
    db.prepare(`UPDATE bookings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...bParams);
  }
  
  const result = db.prepare(`
    INSERT INTO assignments (booking_id, fg_id, brief, fg_fee, upload_deadline, status)
    VALUES (?, ?, ?, ?, date(?, '+1 day'), 'assigned')
  `).run(req.params.id, fg_id, brief || '', finalFgFee, booking.graduation_date);
  
  const assignment = db.prepare(`
    SELECT a.*, f.name as fg_name, f.phone as fg_phone
    FROM assignments a
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);
  
  // Generate WA.me link for FG
  const templates = getWaTemplates();
  const settings = getSettings();
  const portalUrl = `http://${req.get('host')}/freelance-portal.html?code=${fg.access_code}&assignment=${assignment.id}`;
  let waMessage = (templates.fg_assigned || '')
    .replace(/{company_name}/g, settings.companyName || 'Luxenary.co')
    .replace('{client_name}', booking.client_name)
    .replace('{location}', booking.location || '-')
    .replace('{university}', booking.university || '-')
    .replace('{shooting_time}', booking.shooting_time || 'TBD')
    .replace('{duration_hours}', booking.duration_hours || booking.shooting_duration || '-')
    .replace('{admin_phone}', settings.adminPhone)
    .replace('{assignment_id}', assignment.id)
    .replace('{portal_url}', portalUrl);

  const waLink = `https://wa.me/${fg.phone}?text=${encodeURIComponent(waMessage)}`;
  
  res.status(201).json({ assignment, wa_link: waLink, portal_url: portalUrl });
});

router.post('/bookings/:id/contract', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  
  // Placeholder - PDF generation will be in service
  const contractUrl = path.join(config.uploadPath, 'contracts', `contract_${booking.id}.pdf`);
  
  db.prepare('UPDATE bookings SET contract_url = ?, contract_signed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(contractUrl, req.params.id);
  
  res.json({ contract_url: contractUrl });
});

// DELETE /api/admin/bookings/:id (Clean delete client & booking without residual files or records)
router.delete('/bookings/:id', (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Data booking / client tidak ditemukan' });

  try {
    db.transaction(() => {
      // 1. Delete associated assignments, deliverables & payouts
      const assignments = db.prepare('SELECT id FROM assignments WHERE booking_id = ?').all(bookingId);
      assignments.forEach(a => {
        db.prepare('DELETE FROM deliverables WHERE assignment_id = ?').run(a.id);
        db.prepare('DELETE FROM payouts WHERE assignment_id = ?').run(a.id);
      });
      db.prepare('DELETE FROM assignments WHERE booking_id = ?').run(bookingId);

      // 2. Delete associated portfolio items & remove portfolio files from disk
      const portfolioItems = db.prepare('SELECT * FROM portfolio_items WHERE booking_id = ?').all(bookingId);
      portfolioItems.forEach(p => {
        if (p.cover_photo_url && p.cover_photo_url.includes('/uploads/portfolio/')) {
          const parts = p.cover_photo_url.split('/uploads/portfolio/')[1]?.split('/');
          if (parts && parts[0]) {
            const folderPath = path.join(config.uploadPath, 'portfolio', parts[0]);
            if (fs.existsSync(folderPath)) {
              try { fs.rmSync(folderPath, { recursive: true, force: true }); } catch {}
            }
          }
        }
      });
      db.prepare('DELETE FROM portfolio_items WHERE booking_id = ?').run(bookingId);

      // 3. Clean up physical upload files (DP proof, Balance proof, Invoice, Contract)
      const filesToClean = [booking.dp_bukti_url, booking.balance_bukti_url, booking.final_invoice_url, booking.contract_url];
      filesToClean.forEach(relPath => {
        if (relPath && typeof relPath === 'string' && relPath.startsWith('/uploads/')) {
          const relativeSub = relPath.replace('/uploads/', '');
          const absPath = path.join(config.uploadPath, relativeSub);
          if (fs.existsSync(absPath)) {
            try { fs.unlinkSync(absPath); } catch {}
          }
        }
      });

      // 4. Delete booking tokens if inquiry exists
      if (booking.inquiry_id) {
        db.prepare('DELETE FROM booking_tokens WHERE inquiry_id = ?').run(booking.inquiry_id);
        db.prepare('DELETE FROM inquiries WHERE id = ?').run(booking.inquiry_id);
      }

      // 5. Delete the booking record itself
      db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
    })();

    res.json({ success: true, message: 'Data client & booking telah dihapus bersih secara permanen.' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Gagal menghapus client: ' + err.message });
  }
});

// ============ FREELANCERS ============
router.get('/freelancers', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, search = '', active } = req.query;
  const offset = (page - 1) * limit;
  
  let where = '1=1';
  const params = [];
  
  if (search) {
    where += ' AND (name LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }
  if (active !== undefined) {
    const activeVal = (active === 'true' || active === '1') ? 1 : 0;
    where += ' AND active = ?';
    params.push(activeVal);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as c FROM freelancers WHERE ${where}`).get(params).c;
  const rows = db.prepare(`
    SELECT * FROM freelancers WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  
  // Parse JSON fields
  rows.forEach(f => {
    try { f.specialties = JSON.parse(f.specialties || '[]'); } catch { f.specialties = []; }
    try { f.bank_account = JSON.parse(f.bank_account || '{}'); } catch { f.bank_account = {}; }
  });
  
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/freelancers', freelancerValidation, (req, res) => {
  const { name, phone, email, portfolio_url, specialties, bank_account, id_card, default_rate } = req.body;
  
  // Auto-generate unique access code
  const crypto = require('crypto');
  const accessCode = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  
  const result = db.prepare(`
    INSERT INTO freelancers (name, phone, email, portfolio_url, specialties, bank_account, id_card, access_code, default_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, email || null, portfolio_url || null, JSON.stringify(specialties || []), JSON.stringify(bank_account || {}), id_card || null, accessCode, default_rate || 0);
  
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(result.lastInsertRowid);
  try { fg.specialties = JSON.parse(fg.specialties); } catch { fg.specialties = []; }
  try { fg.bank_account = JSON.parse(fg.bank_account); } catch { fg.bank_account = {}; }
  
  res.status(201).json(fg);
});

router.patch('/freelancers/:id/active', [
  body('active').isBoolean().withMessage('Active must be boolean'),
  handleValidation
], (req, res) => {
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });

  db.prepare("UPDATE freelancers SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.body.active ? 1 : 0, req.params.id);

  const updated = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  try { updated.specialties = JSON.parse(updated.specialties); } catch { updated.specialties = []; }
  try { updated.bank_account = JSON.parse(updated.bank_account); } catch { updated.bank_account = {}; }
  res.json(updated);
});

router.put('/freelancers/:id', freelancerValidation, (req, res) => {
  const { name, phone, email, portfolio_url, specialties, bank_account, id_card, active, rating, default_rate } = req.body;
  
  db.prepare(`
    UPDATE freelancers 
    SET name = ?, phone = ?, email = ?, portfolio_url = ?, specialties = ?, bank_account = ?, id_card = ?, active = ?, rating = ?, default_rate = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, phone, email || null, portfolio_url || null, JSON.stringify(specialties || []), JSON.stringify(bank_account || {}), id_card || null, active ? 1 : 0, rating || 5.0, default_rate || 0, req.params.id);
  
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  try { fg.specialties = JSON.parse(fg.specialties); } catch { fg.specialties = []; }
  try { fg.bank_account = JSON.parse(fg.bank_account); } catch { fg.bank_account = {}; }
  
  res.json(fg);
});

// DELETE freelancer
router.delete('/freelancers/:id', (req, res) => {
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });

  db.prepare("UPDATE freelancers SET active = 0 WHERE id = ?").run(req.params.id);

  res.json({ success: true, message: 'FG dinonaktifkan' });
});

// Regenerate access code for a freelancer
router.post('/freelancers/:id/regenerate-code', (req, res) => {
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });

  const crypto = require('crypto');
  const newCode = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare("UPDATE freelancers SET access_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(newCode, req.params.id);

  res.json({ success: true, access_code: newCode, message: 'Kode akses berhasil diperbarui' });
});

// ============ PACKAGES ============
router.get('/packages', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as c FROM packages').get().c;
  const data = db.prepare('SELECT * FROM packages ORDER BY sort_order ASC, price ASC LIMIT ? OFFSET ?').all(limit, offset);
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/packages', (req, res) => {
  const { name, description, price, includes, duration_hours, sort_order, active, fg_fee, editor_fee, max_selected_photos, highlight_count } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Nama dan harga wajib' });
  const r = db.prepare(`INSERT INTO packages (name, description, price, includes, duration_hours, sort_order, active, fg_fee, editor_fee, max_selected_photos, highlight_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, description||'', price, includes||'', duration_hours||null, sort_order||0, active!==false?1:0, fg_fee||0, editor_fee||0, max_selected_photos||15, highlight_count||5);
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(pkg);
});

router.put('/packages/:id', (req, res) => {
  const { name, description, price, includes, duration_hours, sort_order, active, fg_fee, editor_fee, max_selected_photos, highlight_count } = req.body;
  const existing = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Paket tidak ditemukan' });
  db.prepare(`UPDATE packages SET name=?, description=?, price=?, includes=?, duration_hours=?, sort_order=?, active=?, fg_fee=?, editor_fee=?, max_selected_photos=?, highlight_count=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name||existing.name, description!==undefined?description:existing.description, price||existing.price,
      includes||existing.includes, duration_hours!==undefined?duration_hours:existing.duration_hours,
      sort_order!==undefined?sort_order:existing.sort_order, active!==undefined?(active?1:0):existing.active,
      fg_fee!==undefined?fg_fee:existing.fg_fee, editor_fee!==undefined?editor_fee:existing.editor_fee,
      max_selected_photos!==undefined?max_selected_photos:existing.max_selected_photos,
      highlight_count!==undefined?highlight_count:existing.highlight_count, req.params.id);
  res.json(db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id));
});

router.delete('/packages/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Paket tidak ditemukan' });
  db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ ASSIGNMENTS ============
router.get('/assignments', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, status = '', fg_id = '' } = req.query;
  const offset = (page - 1) * limit;
  
  let where = '1=1';
  const params = [];
  
  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }
  if (fg_id) {
    where += ' AND a.fg_id = ?';
    params.push(fg_id);
  }
  
  const total = db.prepare(`
    SELECT COUNT(*) as c FROM assignments a WHERE ${where}
  `).get(params).c;
  
  const rows = db.prepare(`
    SELECT a.*, b.client_name, b.graduation_date, b.shooting_time, b.location, b.total_price,
           f.name as fg_name, f.phone as fg_phone,
           e.name as editor_name
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN freelancers e ON a.editor_id = e.id
    WHERE ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/assignments', assignmentValidation, (req, res) => {
  const { booking_id, fg_id, editor_id, brief } = req.body;
  
  // Check booking exists and is confirmed
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND dp_status = ?').get(booking_id, 'paid');
  if (!booking) return res.status(400).json({ error: 'Booking tidak ditemukan atau DP belum lunas' });
  
  // Check FG exists and active
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND active = 1').get(fg_id);
  if (!fg) return res.status(400).json({ error: 'FG tidak ditemukan atau tidak aktif' });
  
  // Check FG schedule conflict
  const graduationDate = booking.graduation_date;
  const conflict = db.prepare(`
    SELECT * FROM fg_schedules WHERE fg_id = ? AND date = ? AND status = 'booked'
  `).get(fg_id, graduationDate);
  
  if (conflict) return res.status(400).json({ error: 'FG sudah booked di tanggal tersebut' });
  
  // Check max bookings per day
  const maxPerDay = parseInt(getSetting('max_photos_per_fg_per_day', 2));
  const countToday = db.prepare(`
    SELECT COUNT(*) as c FROM fg_schedules WHERE fg_id = ? AND date = ? AND status = 'booked'
  `).get(fg_id, graduationDate).c;
  
  if (countToday >= maxPerDay) {
    return res.status(400).json({ error: `FG sudah max ${maxPerDay} booking di hari itu` });
  }
  
  // Create assignment
  const uploadDeadlineDays = parseInt(getSetting('upload_deadline_days', 1));
  const uploadDeadline = new Date(graduationDate);
  uploadDeadline.setDate(uploadDeadline.getDate() + uploadDeadlineDays);
  uploadDeadline.setHours(23, 59, 59, 999);
  
  const result = db.prepare(`
    INSERT INTO assignments (booking_id, fg_id, editor_id, brief, upload_deadline)
    VALUES (?, ?, ?, ?, ?)
  `).run(booking_id, fg_id, editor_id || null, brief || null, uploadDeadline.toISOString());
  
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);
  
  // Update FG schedule
  db.prepare(`
    INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
    VALUES (?, ?, 'booked', ?, 'Assignment #' || ?)
  `).run(fg_id, graduationDate, booking_id, result.lastInsertRowid);
  
  // Update booking status
  db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('shooting', booking_id);
  
  // WA.me link for FG
  const templates = getWaTemplates();
  const settings = getSettings();
  
  let waMessage = templates.fg_assigned
    .replace('{client_name}', booking.client_name)
    .replace('{location}', booking.location)
    .replace('{university}', booking.university || '-')
    .replace('{shooting_time}', booking.shooting_time || '-')
    .replace('{duration_hours}', db.prepare('SELECT duration_hours FROM packages WHERE id = ?').get(booking.package_id)?.duration_hours || '-')
    .replace('{admin_phone}', settings.adminPhone)
    .replace('{assignment_id}', assignment.id);
  
  const waLink = `https://wa.me/${fg.phone}?text=${encodeURIComponent(waMessage)}`;
  
  res.status(201).json({ assignment, wa_link: waLink });
});

router.put('/assignments/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const { status, brief, editor_id } = req.body;
  
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  
  const updates = [];
  const params = [];
  
  if (status) { updates.push('status = ?'); params.push(status); }
  if (brief !== undefined) { updates.push('brief = ?'); params.push(brief); }
  if (editor_id !== undefined) { updates.push('editor_id = ?'); params.push(editor_id); }
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada data untuk diupdate' });
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  
  db.prepare(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// ============ DELIVERABLES & QC ============
router.get('/deliverables', paginationValidation, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const total = db.prepare(`
    SELECT COUNT(*) as c FROM bookings b WHERE b.status IN ('editing', 'delivered')
  `).get().c;
  
  const rows = db.prepare(`
    SELECT b.id as booking_id, b.client_name, b.graduation_date, b.university, b.status as booking_status,
           b.download_url, b.download_password, b.client_phone,
           b.balance_status, b.balance_amount, b.balance_bukti_url,
           b.dp_status, b.dp_amount, b.dp_bukti_url,
           b.staging_drive_url, b.selection_status, b.highlight_drive_url, b.selected_photos,
           a.id as assignment_id, a.status as assignment_status, a.fg_id,
           f.name as fg_name,
           d.id as deliverable_id, d.drive_folder_url, d.delivery_type, d.qc_status, d.notes as delivery_notes
    FROM bookings b
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    WHERE b.status IN ('editing', 'delivered')
    ORDER BY b.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  
  // Determine post-production sub-status for each row
  const data = rows.map(r => {
    let pp_status = 'Menunggu File dari FG';
    if (r.booking_status === 'delivered' || r.booking_status === 'completed') {
      pp_status = 'Terkirim ke Client (Final)';
    } else if (r.highlight_drive_url) {
      pp_status = 'Highlight Siap';
    } else if (r.selection_status === 'submitted' || r.selection_status === 'cleaned') {
      pp_status = 'Client Sudah Memilih';
    } else if (r.selection_status === 'ready') {
      pp_status = 'Menunggu Pilihan Client';
    } else if (r.selection_status === 'importing' || (r.staging_drive_url && r.selection_status !== 'ready')) {
      pp_status = 'Proses Import Staging';
    } else if (r.deliverable_id || r.assignment_status === 'uploaded' || r.delivery_type) {
      pp_status = 'Menunggu Staging Upload';
    } else {
      pp_status = 'Menunggu File dari FG';
    }

    // Auto-generate 6-digit download_password PIN if missing
    if (!r.download_password) {
      r.download_password = String(Math.floor(100000 + Math.random() * 900000));
      db.prepare('UPDATE bookings SET download_password = ? WHERE id = ?').run(r.download_password, r.booking_id);
    }

    let parsedSelected = [];
    try { parsedSelected = JSON.parse(r.selected_photos || '[]'); } catch { parsedSelected = []; }

    return { ...r, selected_photos: parsedSelected, pp_status };
  });
  
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/deliverables/:id/qc', deliverableQcValidation, (req, res) => {
  const { qc_status, qc_notes } = req.body;
  
  const deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(req.params.id);
  if (!deliverable) return res.status(404).json({ error: 'Not found' });
  
  db.prepare('UPDATE deliverables SET qc_status = ?, qc_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(qc_status, qc_notes || null, req.params.id);
  
  // Update assignment status
  let assignmentStatus = 'qc';
  if (qc_status === 'approved') assignmentStatus = 'done';
  else if (qc_status === 'revision') assignmentStatus = 'uploaded'; // back to uploaded for re-upload
  else if (qc_status === 'rejected') assignmentStatus = 'assigned'; // reassign
  
  db.prepare('UPDATE assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(assignmentStatus, deliverable.assignment_id);
  
  const updated = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/deliverables/:id/deliver', [
  param('id').isInt({ min: 1 }),
  body('download_url').isURL().withMessage('Download URL wajib'),
  body('password').trim().isLength({ min: 4, max: 50 }).withMessage('Password 4-50 karakter'),
  handleValidation
], (req, res) => {
  const { download_url, password } = req.body;
  
  const deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(req.params.id);
  if (!deliverable) return res.status(404).json({ error: 'Not found' });
  
  db.prepare('UPDATE deliverables SET preview_url = ?, delivered_at = CURRENT_TIMESTAMP WHERE id = ?').run(download_url, req.params.id);
  
  // Update assignment & booking status, plus save download_url and download_password to bookings table
  db.prepare('UPDATE assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('done', deliverable.assignment_id);
  const assignment = db.prepare('SELECT booking_id FROM assignments WHERE id = ?').get(deliverable.assignment_id);
  db.prepare('UPDATE bookings SET status = ?, download_url = ?, download_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('delivered', download_url, password, assignment.booking_id);
  
  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(assignment.booking_id);
  
  let waMessage = templates.delivery_ready
    .replace('{download_url}', download_url)
    .replace('{password}', password)
    .replace('{admin_phone}', settings.adminPhone)
    .replace('{booking_id}', booking.id);
  
  const waLink = `https://wa.me/${booking.client_phone}?text=${encodeURIComponent(waMessage)}`;
  
  const updated = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(req.params.id);
  res.json({ deliverable: updated, wa_link: waLink });
});

// POST /post-production/:booking_id/upload-staging — Admin uploads Drive staging link for client selection
router.post('/post-production/:booking_id/upload-staging', [
  param('booking_id').isInt({ min: 1 }),
  body('staging_drive_url').isURL().withMessage('Link Drive Staging wajib URL valid'),
  handleValidation
], (req, res) => {
  const { staging_drive_url } = req.body;
  const bookingId = req.params.booking_id;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status !== 'paid') {
    return res.status(400).json({ error: 'Status pembayaran belum lunas. Pelunasan harus dikonfirmasi terlebih dahulu.' });
  }

  // Set selection_status = 'importing' immediately and trigger background importer
  db.prepare(`
    UPDATE bookings 
    SET staging_drive_url = ?, selection_status = 'importing', status = 'editing', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(staging_drive_url, bookingId);

  // Trigger background import & sharp compression
  driveImporter.startImport(bookingId, staging_drive_url).catch(err => {
    console.error(`[DriveImporter Error for Booking #${bookingId}]:`, err);
  });

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  res.json({ 
    success: true, 
    message: 'Proses import & kompresi foto dari Drive telah dimulai di background. Status beralih ke Proses Import Staging.',
    booking: updated 
  });
});

// POST /post-production/:booking_id/publish-staging — Admin publishes staging gallery for client selection
router.post('/post-production/:booking_id/publish-staging', [
  param('booking_id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const bookingId = req.params.booking_id;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  db.prepare(`
    UPDATE bookings 
    SET selection_status = 'ready', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(bookingId);

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  res.json({ 
    success: true, 
    message: 'Galeri seleksi telah dipublikasikan dan siap dipilih oleh client!',
    booking: updated 
  });
});

// POST /post-production/:booking_id/send-link — Admin sends Final Drive link to client (Post Production flow)
router.post('/post-production/:booking_id/send-link', [
  param('booking_id').isInt({ min: 1 }),
  body('download_url').isURL().withMessage('Download URL wajib'),
  body('password').trim().isLength({ min: 4, max: 50 }).withMessage('Password 4-50 karakter'),
  handleValidation
], (req, res) => {
  const { download_url, password } = req.body;
  const bookingId = req.params.booking_id;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status !== 'paid') {
    return res.status(400).json({ error: 'Pelunasan belum terverifikasi. Tidak dapat mengirim link hasil foto.' });
  }
  
  if (!['editing', 'delivered', 'completed'].includes(booking.status)) {
    return res.status(400).json({ error: 'Booking belum memasuki tahap post-production' });
  }
  
  // Update booking with download link and set status to delivered
  db.prepare('UPDATE bookings SET status = ?, download_url = ?, download_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('delivered', download_url, password, bookingId);
  
  // Update assignment status if exists
  const assignment = db.prepare('SELECT id FROM assignments WHERE booking_id = ?').get(bookingId);
  if (assignment) {
    db.prepare("UPDATE assignments SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(assignment.id);
  }
  
  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = `http://${req.get('host')}/tracking.html?id=${booking.id}`;
  
  let waMessage = (templates.delivery_ready || '')
    .replace(/{company_name}/g, settings.companyName || 'Luxenary.co')
    .replace('{download_url}', download_url)
    .replace('{tracking_url}', trackingUrl)
    .replace('{password}', password)
    .replace('{admin_phone}', settings.adminPhone)
    .replace('{booking_id}', booking.id);
  
  const waLink = `https://wa.me/${booking.client_phone}?text=${encodeURIComponent(waMessage)}`;
  
  res.json({ 
    success: true, 
    message: 'Link Drive hasil akhir berhasil dikirim ke client!',
    wa_link_client: waLink,
    status: 'delivered'
  });
});

// POST /post-production/:booking_id/send-highlight-link — Admin sends Highlight Drive link
router.post('/post-production/:booking_id/send-highlight-link', [
  param('booking_id').isInt({ min: 1 }),
  body('highlight_drive_url').isURL().withMessage('Highlight Drive URL wajib'),
  handleValidation
], (req, res) => {
  const { highlight_drive_url } = req.body;
  const bookingId = req.params.booking_id;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status !== 'paid') {
    return res.status(400).json({ error: 'Pelunasan belum terverifikasi. Tidak dapat mengirim highlight link.' });
  }
  
  db.prepare('UPDATE bookings SET highlight_drive_url = ?, selection_status = \'cleaned\', updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(highlight_drive_url, bookingId);

  // Automatically clean staging files from disk when highlight link is submitted
  try {
    const stagingDir = path.join(__dirname, '../../DATA/uploads/staging_uploads', String(bookingId));
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
      console.log(`[CleanStaging] Automatically cleaned staging folder for Booking #${bookingId}`);
    }
  } catch (e) {
    console.error(`[CleanStaging Error for Booking #${bookingId}]:`, e);
  }

  // Auto-create/update entry in portfolio_items table (published = 1 so it automatically appears in portfolio)
  try {
    const nameParts = (booking.client_name || 'Client').trim().split(/\s+/);
    const initial = nameParts.map(p => p[0]?.toUpperCase() || '').join('').substring(0, 5) || 'CL';
    const year = booking.graduation_date ? new Date(booking.graduation_date).getFullYear() : new Date().getFullYear();
    const fgAssignment = db.prepare('SELECT f.name FROM assignments a JOIN freelancers f ON a.fg_id = f.id WHERE a.booking_id = ?').get(bookingId);
    
    const existingPorto = db.prepare('SELECT id FROM portfolio_items WHERE booking_id = ?').get(bookingId);
    if (!existingPorto) {
      db.prepare(`
        INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, cover_photo_url, highlight_photos, fg_name, featured, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
      `).run(
        bookingId,
        initial,
        year,
        booking.university || 'Universitas',
        highlight_drive_url,
        JSON.stringify([highlight_drive_url]),
        fgAssignment?.name || null
      );
    } else {
      db.prepare(`
        UPDATE portfolio_items
        SET cover_photo_url = ?, highlight_photos = ?, published = 1, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ?
      `).run(
        highlight_drive_url,
        JSON.stringify([highlight_drive_url]),
        bookingId
      );
    }
  } catch (e) {
    console.error('Auto portfolio error (non-fatal):', e);
  }

  // Trigger background import of highlight drive photos for Portfolio
  driveImporter.importPortfolioFromDrive(bookingId, highlight_drive_url).catch(err => {
    console.error(`[DriveImporter Portfolio Error for Booking #${bookingId}]:`, err);
  });

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  res.json({ 
    success: true, 
    message: 'Link Highlight tersimpan! Folder staging telah dibersihkan & foto highlight sedang diimpor & dikompresi ke Portofolio di background.',
    booking: updated 
  });
});

// POST /bookings/:id/clean-staging — Manually/automatically clean staging uploads folder
router.post('/bookings/:id/clean-staging', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const bookingId = req.params.id;
  try {
    const stagingDir = path.join(__dirname, '../../DATA/uploads/staging_uploads', String(bookingId));
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    db.prepare("UPDATE bookings SET selection_status = 'cleaned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);
    res.json({ success: true, message: `Folder staging booking #${bookingId} berhasil dibersihkan dari server disk.` });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membersihkan folder staging: ' + e.message });
  }
});

// ============ PAYOUTS ============
router.get('/payouts', paginationValidation, (req, res) => {
  const { page = 1, limit = 100, status = '' } = req.query;
  const offset = (page - 1) * limit;
  
  let total;
  let rows;
  
  if (status === 'paid') {
    // Grouped by transfer_ref and fg_id when paid
    total = db.prepare(`
      SELECT COUNT(DISTINCT py.transfer_ref) as c
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      JOIN freelancers f ON a.fg_id = f.id
      JOIN payouts py ON py.assignment_id = a.id
      WHERE py.status = 'paid'
    `).get().c;
    
    rows = db.prepare(`
      SELECT 
        MIN(a.id) as id,
        MIN(a.id) as assignment_id, 
        a.fg_id, 
        f.name as fg_name, 
        f.phone as fg_phone, 
        f.bank_account,
        MIN(a.booking_id) as booking_id, 
        GROUP_CONCAT(b.client_name, CHAR(10)) as client_name,
        GROUP_CONCAT(b.graduation_date, CHAR(10)) as graduation_date,
        b.location,
        SUM(COALESCE(py.total_payout, a.fg_fee, f.default_rate, p.fg_fee, 0)) as total_payout,
        py.status as status,
        MIN(py.id) as payout_id,
        py.transfer_ref,
        py.slip_url,
        py.paid_at,
        MIN(COALESCE(py.created_at, a.created_at)) as created_at
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      JOIN packages p ON b.package_id = p.id
      JOIN freelancers f ON a.fg_id = f.id
      JOIN payouts py ON py.assignment_id = a.id
      WHERE py.status = 'paid'
      GROUP BY py.transfer_ref, a.fg_id
      ORDER BY py.paid_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  } else {
    // Normal query for pending/all
    let where = "a.status IN ('done', 'completed', 'uploaded')";
    if (status === 'pending') {
      where += " AND (py.status IS NULL OR py.status != 'paid')";
    }
    
    total = db.prepare(`
      SELECT COUNT(*) as c 
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      JOIN freelancers f ON a.fg_id = f.id
      LEFT JOIN payouts py ON py.assignment_id = a.id
      WHERE ${where}
    `).get(params = []).c;
    
    rows = db.prepare(`
      SELECT 
        a.id as assignment_id, 
        a.id as id,
        a.fg_id, 
        a.status as assignment_status,
        f.name as fg_name, 
        f.phone as fg_phone, 
        f.bank_account,
        a.booking_id, 
        b.client_name, 
        b.graduation_date,
        b.location,
        b.status as booking_status,
        COALESCE(py.total_payout, a.fg_fee, f.default_rate, p.fg_fee, 0) as total_payout,
        COALESCE(py.status, 'pending') as status,
        py.id as payout_id,
        py.transfer_ref,
        py.slip_url,
        py.paid_at,
        COALESCE(py.created_at, a.created_at) as created_at
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      JOIN packages p ON b.package_id = p.id
      JOIN freelancers f ON a.fg_id = f.id
      LEFT JOIN payouts py ON py.assignment_id = a.id
      WHERE ${where}
      ORDER BY b.graduation_date ASC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }
  
  rows.forEach(p => {
    try { p.bank_account = JSON.parse(p.bank_account || '{}'); } catch { p.bank_account = {}; }
  });
  
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/payouts/run', [
  body('period_start').isISO8601().withMessage('Period start wajib'),
  body('period_end').isISO8601().withMessage('Period end wajib'),
  handleValidation
], (req, res) => {
  const { period_start, period_end } = req.body;
  
  // Find completed assignments in period (where deliverables are QC Approved)
  const assignments = db.prepare(`
    SELECT a.*, b.total_price, COALESCE(a.fg_fee, f.default_rate, p.fg_fee, 0) as final_fg_fee, 
           p.editor_fee as package_editor_fee, f.name as fg_name, f.phone as fg_phone, f.bank_account
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    JOIN packages p ON b.package_id = p.id
    JOIN freelancers f ON a.fg_id = f.id
    JOIN deliverables d ON d.assignment_id = a.id
    WHERE d.qc_status = 'approved'
    AND a.updated_at BETWEEN ? AND ?
    AND NOT EXISTS (SELECT 1 FROM payouts WHERE assignment_id = a.id)
  `).all(period_start, period_end);
  
  const results = [];
  
  for (const a of assignments) {
    const fgFee = a.final_fg_fee;
    const editorFee = a.package_editor_fee || 0;
    const bonus = 0;
    const deduction = 0;
    const totalPayout = fgFee + editorFee + bonus - deduction;
    
    const result = db.prepare(`
      INSERT INTO payouts (assignment_id, fg_id, fg_fee, editor_fee, bonus, deduction, total_payout, period_start, period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(a.id, a.fg_id, fgFee, editorFee, bonus, deduction, totalPayout, period_start, period_end);
    
    results.push({ assignment_id: a.id, payout_id: result.lastInsertRowid, total_payout: totalPayout });
  }
  
  res.json({ created: results.length, payouts: results });
});

router.post('/payouts/complete-bulk', [
  body('assignment_ids').isArray({ min: 1 }).withMessage('Pilih minimal 1 tugas untuk dibayar'),
  handleValidation
], (req, res) => {
  const { assignment_ids, slip_url } = req.body;
  const transfer_ref = req.body.transfer_ref || `TF-${Date.now().toString().slice(-8)}`;
  
  let fgPhone = '';
  let fgName = '';
  let totalPaid = 0;
  let clientNames = [];
  
  try {
    db.transaction(() => {
      for (const assignmentId of assignment_ids) {
        const assignment = db.prepare(`
          SELECT a.*, b.client_name, b.graduation_date,
                 COALESCE(a.fg_fee, f.default_rate, p.fg_fee, 0) as final_fg_fee,
                 f.name as fg_name, f.phone as fg_phone
          FROM assignments a
          JOIN bookings b ON a.booking_id = b.id
          JOIN packages p ON b.package_id = p.id
          JOIN freelancers f ON a.fg_id = f.id
          WHERE a.id = ?
        `).get(assignmentId);
        
        if (!assignment) continue;
        
        fgPhone = assignment.fg_phone;
        fgName = assignment.fg_name;
        totalPaid += assignment.final_fg_fee;
        clientNames.push(`${assignment.client_name} (${assignment.graduation_date})`);
        
        // Check if payout already exists
        let payout = db.prepare('SELECT * FROM payouts WHERE assignment_id = ?').get(assignmentId);
        
        if (payout) {
          db.prepare(`
            UPDATE payouts 
            SET status = 'paid', paid_at = CURRENT_TIMESTAMP, transfer_ref = ?, slip_url = ?, total_payout = ?
            WHERE id = ?
          `).run(transfer_ref, slip_url || null, assignment.final_fg_fee, payout.id);
        } else {
          const today = new Date().toISOString().split('T')[0];
          db.prepare(`
            INSERT INTO payouts (assignment_id, fg_id, fg_fee, editor_fee, bonus, deduction, total_payout, status, paid_at, transfer_ref, slip_url, period_start, period_end)
            VALUES (?, ?, ?, 0, 0, 0, ?, 'paid', CURRENT_TIMESTAMP, ?, ?, ?, ?)
          `).run(assignmentId, assignment.fg_id, assignment.final_fg_fee, assignment.final_fg_fee, transfer_ref, slip_url || null, today, today);
        }
        
        // Update assignment status to completed
        db.prepare("UPDATE assignments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(assignmentId);
      }
    })();
  } catch (err) {
    console.error('Bulk payout error:', err);
    return res.status(500).json({ error: 'Gagal memproses transaksi ganti status gajihan' });
  }
  
  // Send WA receipt
  const templates = getWaTemplates();
  const settings = getSettings();
  
  const appUrl = `${req.protocol}://${req.get('host')}`;
  
  let waMessage = `Halo ${fgName}, pembayaran fee untuk tugas kamu telah berhasil ditransfer.\n\n` +
                  `Rincian Tugas:\n` +
                  clientNames.map(c => `- ${c}`).join('\n') + `\n\n` +
                  `Total Transfer: Rp ${totalPaid.toLocaleString('id-ID')}\n` +
                  `No. Referensi: ${transfer_ref}\n\n` +
                  `Detail Invoice Payroll:\n${appUrl}/payout-invoice.html?ref=${encodeURIComponent(transfer_ref)}\n\n` +
                  `Terima kasih atas kerja samanya!`;
                  
  const waLink = `https://wa.me/${fgPhone}?text=${encodeURIComponent(waMessage)}`;
  
  res.json({ success: true, message: 'Pembayaran berhasil dicatat!', wa_link: waLink });
});

router.post('/payouts/:id/complete', [
  param('id').isInt({ min: 1 }),
  body('transfer_ref').trim().isLength({ min: 5 }).withMessage('Transfer ref wajib'),
  body('slip_url').optional().isURL().withMessage('Slip URL tidak valid'),
  handleValidation
], (req, res) => {
  const { transfer_ref, slip_url } = req.body;
  
  const payout = db.prepare('SELECT * FROM payouts WHERE id = ?').get(req.params.id);
  if (!payout) return res.status(404).json({ error: 'Not found' });
  
  db.prepare('UPDATE payouts SET status = ?, paid_at = CURRENT_TIMESTAMP, transfer_ref = ?, slip_url = ? WHERE id = ?').run('paid', transfer_ref, slip_url || null, req.params.id);
  
  // WA.me to FG
  const templates = getWaTemplates();
  const settings = getSettings();
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(payout.fg_id);
  
  let waMessage = (templates.fg_payout_sent || '')
    .replace(/{company_name}/g, settings.companyName || 'Luxenary.co')
    .replace('{period_start}', formatDate(payout.period_start))
    .replace('{period_end}', formatDate(payout.period_end))
    .replace('{total_payout}', formatCurrency(payout.total_payout))
    .replace('{slip_url}', slip_url || '-');
  
  const waLink = `https://wa.me/${fg.phone}?text=${encodeURIComponent(waMessage)}`;
  
  const updated = db.prepare('SELECT * FROM payouts WHERE id = ?').get(req.params.id);
  res.json({ payout: updated, wa_link: waLink });
});

// ============ PORTFOLIO ============
router.get('/portfolio', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, published, featured } = req.query;
  const offset = (page - 1) * limit;
  
  let where = '1=1';
  const params = [];
  
  if (published !== undefined) {
    where += ' AND published = ?';
    params.push(published === 'true' ? 1 : 0);
  }
  if (featured !== undefined) {
    where += ' AND featured = ?';
    params.push(featured === 'true' ? 1 : 0);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as c FROM portfolio_items WHERE ${where}`).get(params).c;
  const rows = db.prepare(`
    SELECT * FROM portfolio_items WHERE ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  
  rows.forEach(p => {
    try { p.highlight_photos = JSON.parse(p.highlight_photos || '[]'); } catch { p.highlight_photos = []; }
  });
  
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/portfolio/from-booking', [
  body('booking_id').isInt({ min: 1 }).withMessage('Booking ID wajib'),
  body('client_initial').trim().isLength({ min: 1, max: 10 }).withMessage('Inisial client wajib'),
  body('graduation_year').isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib'),
  body('cover_photo_url').isURL().withMessage('Cover photo URL wajib'),
  body('highlight_photos').isArray({ min: 1, max: 10 }).withMessage('Highlight photos 1-10'),
  body('fg_name').optional().trim().isLength({ max: 100 }).withMessage('Nama FG max 100 karakter'),
  body('featured').optional().isBoolean().withMessage('Featured harus boolean'),
  handleValidation
], (req, res) => {
  const { booking_id, client_initial, graduation_year, university, cover_photo_url, highlight_photos, fg_name, featured } = req.body;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND status = ?').get(booking_id, 'completed');
  if (!booking) return res.status(400).json({ error: 'Booking tidak ditemukan atau belum completed' });
  
  const existing = db.prepare('SELECT id FROM portfolio_items WHERE booking_id = ?').get(booking_id);
  if (existing) return res.status(400).json({ error: 'Booking sudah dikurasi ke portfolio' });
  
  const result = db.prepare(`
    INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, cover_photo_url, highlight_photos, fg_name, featured, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(booking_id, client_initial, graduation_year, university, cover_photo_url, JSON.stringify(highlight_photos), fg_name || null, featured ? 1 : 0);
  
  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(result.lastInsertRowid);
  try { portfolio.highlight_photos = JSON.parse(portfolio.highlight_photos); } catch { portfolio.highlight_photos = []; }
  
  res.status(201).json(portfolio);
});

const updatePortfolioHandler = (req, res) => {
  const { cover_photo_url, highlight_photos, featured, published, sort_order, client_initial, graduation_year, university, fg_name } = req.body;
  
  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!portfolio) return res.status(404).json({ error: 'Not found' });
  
  const updates = [];
  const params = [];
  
  if (cover_photo_url) { updates.push('cover_photo_url = ?'); params.push(cover_photo_url); }
  if (highlight_photos) { updates.push('highlight_photos = ?'); params.push(typeof highlight_photos === 'string' ? highlight_photos : JSON.stringify(highlight_photos)); }
  if (featured !== undefined) { updates.push('featured = ?'); params.push(featured ? 1 : 0); }
  if (published !== undefined) { updates.push('published = ?'); params.push(published ? 1 : 0); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
  if (client_initial) { updates.push('client_initial = ?'); params.push(client_initial); }
  if (graduation_year) { updates.push('graduation_year = ?'); params.push(graduation_year); }
  if (university) { updates.push('university = ?'); params.push(university); }
  if (fg_name !== undefined) { updates.push('fg_name = ?'); params.push(fg_name); }
  
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada data untuk diupdate' });
  
  params.push(req.params.id);
  db.prepare(`UPDATE portfolio_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updated = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  try { updated.highlight_photos = JSON.parse(updated.highlight_photos); } catch { updated.highlight_photos = []; }
  
  res.json(updated);
};

router.put('/portfolio/:id', [
  param('id').isInt({ min: 1 }),
  body('cover_photo_url').optional(),
  body('highlight_photos').optional(),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('sort_order').optional().isInt({ min: 0 }),
  handleValidation
], updatePortfolioHandler);

router.patch('/portfolio/:id', [
  param('id').isInt({ min: 1 }),
  body('cover_photo_url').optional(),
  body('highlight_photos').optional(),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('sort_order').optional().isInt({ min: 0 }),
  handleValidation
], updatePortfolioHandler);

// ============ PORTFOLIO UPLOAD & DRIVE IMPORT ============
const multer = require('multer');
const sharp = require('sharp');

const portfolioUploadDir = path.join(config.uploadPath, 'portfolio');
if (!fs.existsSync(portfolioUploadDir)) fs.mkdirSync(portfolioUploadDir, { recursive: true });

router.post('/portfolio/import-drive', [
  body('drive_url').trim().isLength({ min: 5 }).withMessage('Link Google Drive wajib'),
  body('client_initial').trim().isLength({ min: 1, max: 10 }).withMessage('Inisial client wajib'),
  body('graduation_year').isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib'),
  body('fg_name').optional().trim().isLength({ max: 100 }),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('portfolio_id').optional().isInt(),
  handleValidation
], async (req, res) => {
  const { drive_url, client_initial, graduation_year, university, fg_name, featured, published, portfolio_id } = req.body;
  const normalizedUniversity = normalizeUniversity(university);
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'GOOGLE_DRIVE_API_KEY tidak dikonfigurasi di file .env' });
  }

  const match = drive_url.match(/folders\/([a-zA-Z0-9-_]+)/) || drive_url.match(/[?&]id=([a-zA-Z0-9-_]+)/) || drive_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const folderId = match ? match[1] : drive_url.trim();

  if (!folderId || folderId.length < 10) {
    return res.status(400).json({ error: 'Format link Google Drive folder tidak valid. Gunakan link folder Google Drive.' });
  }

  let targetDir = '';
  let oldAbsDirToDelete = null;

  try {
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false&fields=files(id,name,mimeType)&key=${apiKey}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();
    if (!listRes.ok) {
      let errorMsg = listData.error?.message || 'Error tidak diketahui';
      if (listRes.status === 400 && errorMsg.includes('API key')) {
        errorMsg = 'GOOGLE_DRIVE_API_KEY di file .env server tidak valid atau belum diaktifkan di Google Cloud Console.';
      } else if (listRes.status === 404 || errorMsg.includes('File not found')) {
        errorMsg = 'Folder Google Drive tidak ditemukan / Akses ditolak. Pastikan akses folder sudah diset "Siapa saja yang memiliki link" (Public).';
      }
      return res.status(400).json({ error: 'Gagal membaca folder Google Drive: ' + errorMsg });
    }

    const files = listData.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'Tidak ditemukan file gambar di dalam folder Google Drive tersebut' });
    }

    files.sort((a, b) => a.name.localeCompare(b.name));

    // If editing existing portfolio item, identify old folder for cleanup
    let existingItem = null;
    if (portfolio_id) {
      existingItem = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(portfolio_id);
      if (existingItem && existingItem.cover_photo_url && existingItem.cover_photo_url.includes('/uploads/portfolio/')) {
        const parts = existingItem.cover_photo_url.split('/uploads/portfolio/')[1]?.split('/');
        if (parts && parts[0]) {
          oldAbsDirToDelete = path.join(portfolioUploadDir, parts[0]);
        }
      }
    }

    const sanitizeFolder = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const subFolderName = `${sanitizeFolder(client_initial)}_${sanitizeFolder(university)}_${Date.now()}`;
    targetDir = path.join(portfolioUploadDir, subFolderName);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const highlightUrls = [];
    let coverPhotoUrl = '';

    const limit = Math.min(files.length, 10);
    for (let i = 0; i < limit; i++) {
      const file = files[i];
      try {
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
        const imgRes = await fetch(downloadUrl);
        if (!imgRes.ok) {
          console.warn(`[Warning] Skip image ${file.name} (HTTP ${imgRes.status})`);
          continue;
        }

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const filename = `${i + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        
        await sharp(buffer)
          .resize(1200, undefined, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toFile(path.join(targetDir, filename));

        const relativeUrl = `/uploads/portfolio/${subFolderName}/${filename}`;
        highlightUrls.push(relativeUrl);
        if (!coverPhotoUrl) {
          coverPhotoUrl = relativeUrl;
        }
      } catch (fileErr) {
        console.warn(`[Warning] Skip image ${file.name}:`, fileErr.message);
      }
    }

    if (highlightUrls.length === 0) {
      if (targetDir && fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      return res.status(400).json({ error: 'Gagal mengunduh gambar dari Google Drive. Pastikan file gambar dapat diakses publik.' });
    }

    let targetId = portfolio_id;
    if (targetId && existingItem) {
      db.prepare(`
        UPDATE portfolio_items
        SET client_initial = ?, graduation_year = ?, university = ?, cover_photo_url = ?, highlight_photos = ?, fg_name = ?, featured = ?, published = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(client_initial, graduation_year, normalizedUniversity, coverPhotoUrl, JSON.stringify(highlightUrls), fg_name || null, featured ? 1 : 0, published ? 1 : 0, targetId);

      // Clean up old folder on disk now that new import replaced it
      if (oldAbsDirToDelete && oldAbsDirToDelete !== targetDir && fs.existsSync(oldAbsDirToDelete)) {
        try {
          fs.rmSync(oldAbsDirToDelete, { recursive: true, force: true });
          console.log(`[Portfolio] Cleaned up old replaced portfolio folder: ${oldAbsDirToDelete}`);
        } catch (rmErr) {
          console.error('Failed to clean old portfolio folder:', rmErr.message);
        }
      }
    } else {
      const result = db.prepare(`
        INSERT INTO portfolio_items (client_initial, graduation_year, university, cover_photo_url, highlight_photos, fg_name, featured, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(client_initial, graduation_year, normalizedUniversity, coverPhotoUrl, JSON.stringify(highlightUrls), fg_name || null, featured ? 1 : 0, published ? 1 : 0);
      targetId = result.lastInsertRowid;
    }

    const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(targetId);
    try { portfolio.highlight_photos = JSON.parse(portfolio.highlight_photos); } catch { portfolio.highlight_photos = []; }

    res.status(201).json(portfolio);
  } catch (err) {
    if (targetDir && fs.existsSync(targetDir)) {
      try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
    }
    console.error('Import drive error:', err);
    res.status(500).json({ error: 'Gagal mengimpor gambar dari Google Drive: ' + err.message });
  }
});

// ============ PORTFOLIO MANUAL UPLOAD ============
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Format harus jpg/png/webp'));
    cb(null, true);
  }
});

router.post('/portfolio/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File wajib' });

  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const sanitizeFolder = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const folderParam = req.query.folder ? sanitizeFolder(req.query.folder) : `manual_${Date.now()}`;
  const clientDir = path.join(portfolioUploadDir, folderParam);

  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }

  try {
    // Resize to 1200px width, maintain aspect ratio
    await sharp(req.file.buffer)
      .resize(1200, undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(path.join(clientDir, filename));

    const url = `/uploads/portfolio/${folderParam}/${filename}`;
    res.json({ url, filename });
  } catch (e) {
    res.status(500).json({ error: 'Gagal proses gambar: ' + e.message });
  }
});

// ============ PORTFOLIO DELETE ============
router.delete('/portfolio/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!portfolio) return res.status(404).json({ error: 'Not found' });

  try {
    const allUrls = [portfolio.cover_photo_url];
    if (portfolio.highlight_photos) {
      try {
        const parsed = JSON.parse(portfolio.highlight_photos);
        if (Array.isArray(parsed)) allUrls.push(...parsed);
      } catch {}
    }
    
    const foldersToCheck = new Set();
    for (const u of allUrls) {
      if (u && u.startsWith('/uploads/portfolio/')) {
        const relPath = u.replace('/uploads/portfolio/', '');
        const fullPath = path.join(portfolioUploadDir, relPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        const dirPath = path.dirname(fullPath);
        if (dirPath !== portfolioUploadDir && fs.existsSync(dirPath)) {
          foldersToCheck.add(dirPath);
        }
      }
    }
    for (const dirPath of foldersToCheck) {
      if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath);
      }
    }
  } catch (e) {
    console.warn('Cleanup portfolio files error:', e);
  }

  db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(req.params.id);
  res.json({ status: 'deleted' });
});

// ============ SETTINGS ============
router.get('/settings', (req, res) => {
  const settings = getSettings();
  const templates = getWaTemplates();
  
  // Don't expose sensitive
  const { sessionSecret, adminPassword, ...safeSettings } = settings;
  
  res.json({ settings: safeSettings, wa_templates: templates });
});

router.put('/settings', [
  body('companyName').optional().trim().isLength({ max: 100 }),
  body('companyPhone').optional().trim().isLength({ max: 20 }),
  body('companyAddress').optional().trim().isLength({ max: 200 }),
  body('adminPhone').optional().trim(),
  body('dp_percentage').optional().isInt({ min: 10, max: 100 }),
  body('upload_deadline_days').optional().isInt({ min: 1, max: 30 }),
  body('auto_approve_hours').optional().isInt({ min: 1, max: 168 }),
  body('max_photos_per_fg_per_day').optional().isInt({ min: 1, max: 10 }),
  body('bank_accounts').optional().isArray(),
  body('invoice_prefix').optional().trim().isLength({ max: 20 }),
  body('operational_hours').optional().trim().isLength({ max: 50 }),
  body('session_timeout_minutes').optional().isInt({ min: 60, max: 1440 }),
  body('seo_domain').optional().trim(),
  body('seo_title').optional().trim(),
  body('seo_description').optional().trim(),
  body('seo_keywords').optional().trim(),
  body('google_site_verification').optional().trim(),
  handleValidation
], (req, res) => {
  if (req.body.adminPhone !== undefined) {
    let p = String(req.body.adminPhone).replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    req.body.adminPhone = p;
    req.body.admin_phone = p;
  }

  const allowed = [
    'companyName', 'companyPhone', 'companyAddress', 'adminPhone',
    'company_name', 'company_phone', 'company_address', 'admin_phone',
    'dp_percentage', 'upload_deadline_days', 'auto_approve_hours',
    'max_photos_per_fg_per_day', 'bank_accounts', 'invoice_prefix',
    'operational_hours', 'session_timeout_minutes',
    'seo_domain', 'seo_title', 'seo_description', 'seo_keywords',
    'seo_og_image', 'google_site_verification'
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      setSetting(key, req.body[key]);
    }
  }

  res.json(getSettings());
});

// ============ OG IMAGE UPLOAD ============
router.post('/settings/og-image', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../public/uploads/branding');
    if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.og_image) {
      fileBuffer = req.files.og_image.data;
    } else if (req.body && req.body.image_data) {
      const matches = req.body.image_data.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
      if (matches) fileBuffer = Buffer.from(matches[2], 'base64');
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file banner OG' });

    const ogDest = path.join(brandingDir, 'og_banner.png');
    await sharp(fileBuffer)
      .resize(1200, 630, { fit: 'cover' })
      .png({ quality: 85 })
      .toFile(ogDest);

    const ogUrl = '/uploads/branding/og_banner.png';
    setSetting('seo_og_image', ogUrl);
    res.json({ og_image_url: ogUrl, message: 'Banner SEO Social Share berhasil diunggah!' });
  } catch (err) {
    console.error('OG Upload error:', err);
    res.status(500).json({ error: 'Gagal mengunggah banner OG' });
  }
});

// ============ USER PROFILE ============
router.get('/profile', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/profile', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Nama wajib diisi'),
  body('username').trim().isLength({ min: 1, max: 50 }).withMessage('Username wajib diisi'),
  handleValidation
], (req, res) => {
  try {
    const { name, username } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
    if (existing) return res.status(400).json({ error: 'Username sudah digunakan oleh pengguna lain' });

    db.prepare('UPDATE users SET name = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, username, req.user.id);
    const updated = db.prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updated, message: 'Profil berhasil diperbarui' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});

// ============ CHANGE PASSWORD ============
router.post('/settings/change-password', [
  body('current_password').trim().isLength({ min: 1 }),
  body('new_password').trim().isLength({ min: 6, max: 100 }),
  handleValidation
], async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await authMiddleware.verifyPassword(req.body.current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Password saat ini salah' });

    const hash = await authMiddleware.hashPassword(req.body.new_password);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Gagal ubah password' });
  }
});

// ============ LOGO UPLOAD ============
router.post('/settings/logo', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../public/uploads/branding');
    if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.logo) {
      fileBuffer = req.files.logo.data;
    } else if (req.body && req.body.logo_data) {
      const matches = req.body.logo_data.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file logo' });

    const logoDest = path.join(brandingDir, 'logo.png');
    const faviconPng = path.join(__dirname, '../../public/favicon.png');
    const faviconIco = path.join(__dirname, '../../public/favicon.ico');

    // 1. Save compressed logo (max 512x512)
    await sharp(fileBuffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(logoDest);

    // 2. Generate Favicon PNG (64x64)
    await sharp(fileBuffer)
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconPng);

    // 3. Generate Favicon ICO (32x32)
    await sharp(fileBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconIco);

    const logoPath = '/uploads/branding/logo.png';
    setSetting('logo_url', logoPath);
    res.json({ logo_url: logoPath, message: 'Logo dan Favicon berhasil diperbarui!' });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Gagal upload logo' });
  }
});

router.put('/settings/wa-templates', [
  body('templates').isObject().withMessage('Templates harus object'),
  handleValidation
], (req, res) => {
  const { templates } = req.body;
  
  const validKeys = [
    'admin_new_inquiry', 'client_quotation', 'client_dp_verified', 'fg_assigned',
    'reminder_h3_fg', 'reminder_h3_client', 'fg_upload_ready', 'delivery_ready',
    'balance_due', 'client_fully_paid', 'fg_payout_sent'
  ];
  
  const filtered = {};
  for (const key of validKeys) {
    if (templates[key] !== undefined) {
      filtered[key] = templates[key];
    }
  }
  
  setSetting('wa_templates', filtered);
  res.json(getWaTemplates());
});

// ============ REPORTS ============
router.get('/reports/revenue', [
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Period tidak valid'),
  query('start').optional().isISO8601(),
  query('end').optional().isISO8601(),
  handleValidation
], (req, res) => {
  const { period = 'monthly', start, end } = req.query;
  
  let dateFormat, groupBy;
  switch (period) {
    case 'daily': dateFormat = '%Y-%m-%d'; groupBy = 'date(created_at)'; break;
    case 'weekly': dateFormat = '%Y-W%W'; groupBy = "strftime('%Y-W%W', created_at)"; break;
    case 'yearly': dateFormat = '%Y'; groupBy = "strftime('%Y', created_at)"; break;
    default: dateFormat = '%Y-%m'; groupBy = "strftime('%Y-%m', created_at)";
  }
  
  let where = "dp_status = 'paid'";
  const params = [];
  
  if (start) { where += ' AND date(created_at) >= date(?)'; params.push(start); }
  if (end) { where += ' AND date(created_at) <= date(?)'; params.push(end); }
  
  const rows = db.prepare(`
    SELECT ${groupBy} as period, COUNT(*) as bookings, SUM(total_price) as revenue
    FROM bookings
    WHERE ${where}
    GROUP BY ${groupBy}
    ORDER BY period DESC
  `).all(...params);
  
  rows.forEach(r => { r.revenue = formatCurrency(r.revenue); });
  
  res.json({ period, data: rows });
});

router.get('/reports/conversion', (req, res) => {
  const totalInquiries = db.prepare('SELECT COUNT(*) as c FROM inquiries').get().c;
  const quoted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'quoted'").get().c;
  const booked = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'booked'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'completed'").get().c;
  
  res.json({
    total_inquiries: totalInquiries,
    quoted,
    booked,
    completed,
    quote_rate: totalInquiries ? ((quoted / totalInquiries) * 100).toFixed(1) : 0,
    booking_rate: quoted ? ((booked / quoted) * 100).toFixed(1) : 0,
    completion_rate: booked ? ((completed / booked) * 100).toFixed(1) : 0,
  });
});

router.get('/reports/fg-performance', (req, res) => {
  const rows = db.prepare(`
    SELECT f.id, f.name, f.rating,
           COUNT(a.id) as total_assignments,
           SUM(CASE WHEN a.status = 'done' THEN 1 ELSE 0 END) as completed_assignments,
           COALESCE(SUM(p.total_payout), 0) as total_payout
    FROM freelancers f
    LEFT JOIN assignments a ON f.id = a.fg_id
    LEFT JOIN payouts p ON a.id = p.assignment_id AND p.status = 'paid'
    WHERE f.active = 1
    GROUP BY f.id
    ORDER BY completed_assignments DESC
  `).all();
  
  rows.forEach(r => { r.total_payout = formatCurrency(r.total_payout); });
  
  res.json(rows);
});

// ============ ARCHIVE ============
router.get('/archive', paginationValidation, (req, res) => {
  const { page = 1, limit = 50, tab = 'completed' } = req.query;
  const offset = (page - 1) * limit;
  
  let where;
  if (tab === 'cancelled') {
    where = "b.status = 'cancelled'";
  } else {
    where = "b.status = 'completed'";
  }
  
  const completedCount = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'completed'").get().c;
  const cancelledCount = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'cancelled'").get().c;
  const total = db.prepare(`SELECT COUNT(*) as c FROM bookings b WHERE ${where}`).get().c;
  
  const rows = db.prepare(`
    SELECT b.id, b.client_name, b.client_phone, b.university, b.graduation_date, b.location,
           b.total_price, b.dp_amount, b.balance_amount, b.dp_status, b.balance_status, b.status,
           b.shooting_time, b.duration_hours,
           b.dp_bukti_url, b.balance_bukti_url,
           b.download_url, b.download_password, b.final_invoice_url,
           p.name as package_name, p.fg_fee as package_fg_fee,
           f.name as fg_name, a.id as assignment_id, a.fg_id,
           py.status as payout_status,
           b.created_at, b.updated_at
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN payouts py ON py.assignment_id = a.id
    WHERE ${where}
    ORDER BY b.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  
  rows.forEach(r => {
    r.fg_payout_status = r.fg_id ? (r.payout_status === 'paid' ? 'paid' : 'unpaid') : 'none';
    if (r.status === 'completed' && !r.final_invoice_url) {
      try {
        r.final_invoice_url = saveFinalInvoiceSnapshot(r, db);
      } catch (err) {}
    }
  });

  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit), completedCount, cancelledCount });
});

// ============ FINANCES ============
router.get('/finances', (req, res) => {
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as rev FROM bookings WHERE dp_status = 'paid'").get().rev;
  const dpPending = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE dp_status NOT IN ('paid', 'verified', 'waived')").get().c;
  const payoutPending = db.prepare(`
    SELECT COUNT(*) as c 
    FROM assignments a
    LEFT JOIN payouts py ON py.assignment_id = a.id
    WHERE a.status IN ('done', 'completed', 'uploaded')
      AND (py.status IS NULL OR py.status != 'paid')
  `).get().c;
  res.json({ totalRevenue: formatCurrency(totalRevenue), dpPending, payoutPending });
});

// ============ REPORTS SUMMARY ============
router.get('/reports', (req, res) => {
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as rev FROM bookings WHERE dp_status = 'paid'").get().rev;
  const totalDpPaid = db.prepare("SELECT COALESCE(SUM(dp_amount), 0) as dp FROM bookings WHERE dp_status = 'paid'").get().dp;
  const totalBalancePaid = db.prepare("SELECT COALESCE(SUM(total_price - dp_amount), 0) as bal FROM bookings WHERE balance_status = 'paid'").get().bal;
  const totalReceivables = db.prepare("SELECT COALESCE(SUM(total_price - dp_amount), 0) as rec FROM bookings WHERE dp_status = 'paid' AND balance_status != 'paid'").get().rec;
  
  const totalFgPayoutPaid = db.prepare("SELECT COALESCE(SUM(total_payout), 0) as p FROM payouts WHERE status = 'paid'").get().p;
  const totalFgPayoutPending = db.prepare(`
    SELECT COALESCE(SUM(
      COALESCE(a.fg_fee, f.default_rate, pk.fg_fee, 0)
    ), 0) as p
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    JOIN packages pk ON b.package_id = pk.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN payouts py ON py.assignment_id = a.id
    WHERE (py.status IS NULL OR py.status != 'paid')
      AND b.status != 'cancelled'
  `).get().p;

  const totalInquiries = db.prepare('SELECT COUNT(*) as c FROM inquiries').get().c;
  const quoted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'quoted'").get().c;
  const booked = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'booked'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'completed'").get().c;

  res.json({
    revenue: totalRevenue,
    revenueLabel: formatCurrency(totalRevenue),
    total_dp_paid: totalDpPaid,
    total_dp_paid_label: formatCurrency(totalDpPaid),
    total_balance_paid: totalBalancePaid,
    total_balance_paid_label: formatCurrency(totalBalancePaid),
    total_receivables: totalReceivables,
    total_receivables_label: formatCurrency(totalReceivables),
    total_fg_payout_paid: totalFgPayoutPaid,
    total_fg_payout_paid_label: formatCurrency(totalFgPayoutPaid),
    total_fg_payout_pending: totalFgPayoutPending,
    total_fg_payout_pending_label: formatCurrency(totalFgPayoutPending),
    conversionRate: totalInquiries ? ((booked / totalInquiries) * 100).toFixed(1) : 0,
    totalInquiries, quoted, booked, completed
  });
});

module.exports = router;