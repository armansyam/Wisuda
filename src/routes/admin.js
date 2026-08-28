const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const config = require('../config/settings');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates, getSetting, setSetting, getDefaultWaTemplates } = require('../config/wa-templates');
const { requireAuth, requireRole, generateToken, hashPassword, verifyPassword, checkLockout, recordLoginAttempt } = require('../middleware/auth');
const { handleValidation, paginationValidation, inquiryValidation, inquiryStatusValidation, bookingDpValidation, bookingBalanceValidation, freelancerValidation, assignmentValidation, deliverableQcValidation } = require('../middleware/validation');
const { formatCurrency, formatDate, formatDateTime } = require('../utils/currency');
const { normalizeUniversity } = require('../utils/university');
const { saveFinalInvoiceSnapshot } = require('../utils/invoice');
const driveImporter = require('../services/drive-importer.service');
const driveFolder = require('../services/drive-folder.service');
const { generateWaLink } = require('../services/wa.service');
const multer = require('multer');
const { getBaseUrl } = require('../utils/url');
const { checkTimeOverlap, checkFgConflict, findAvailableFreelancers } = require('../utils/timeSlot');
const sseService = require('../services/sse.service');

const crypto = require('crypto');
const router = express.Router();
const db = getDb();




function ensureBookingToken(booking, database) {
  if (!booking) return booking;
  const targetDb = database || db;
  if (!booking.tracking_token) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    booking.tracking_token = `TRK-${booking.id}-${randomHex}`;
    try {
      targetDb.prepare('UPDATE bookings SET tracking_token = ? WHERE id = ?')
        .run(booking.tracking_token, booking.id);
    } catch (e) { }
  }
  return booking;
}

function getTrackingUrl(req, booking) {
  if (!booking) return '';
  ensureBookingToken(booking, db);
  const host = req.get('host');
  const token = booking.tracking_token || `TRK-${booking.id}`;
  return `${getBaseUrl(req)}/tracking.html?code=${encodeURIComponent(token)}`;
}

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
    const token = generateToken(user);
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate error:', err);
        return res.status(500).json({ error: 'Session error' });
      }
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save error' });
        }
        res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
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

// GET /api/admin/auth/google — Generate OAuth Auth URL
router.get('/auth/google', (req, res) => {
  try {
    const dynamicRedirectUri = `${getBaseUrl(req)}/api/admin/auth/google/callback`;
    const oauth2Client = driveFolder.getOAuth2Client(dynamicRedirectUri);
    if (!oauth2Client) {
      return res.status(400).json({ error: 'Client ID & Client Secret Google OAuth belum dikonfigurasi di Settings.' });
    }
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive']
    });
    res.json({ url: authUrl });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat URL OAuth: ' + err.message });
  }
});

// GET /api/admin/auth/google/callback — OAuth Callback to store tokens
router.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Kode otorisasi Google tidak ditemukan.');
  }

  try {
    const dynamicRedirectUri = `${getBaseUrl(req)}/api/admin/auth/google/callback`;
    const oauth2Client = driveFolder.getOAuth2Client(dynamicRedirectUri);
    if (!oauth2Client) {
      return res.status(400).send('OAuth client tidak dikonfigurasi.');
    }
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    setSetting('google_oauth_tokens', JSON.stringify(tokens), 'Google Drive OAuth Full Tokens Object');
    if (tokens.refresh_token) {
      setSetting('google_oauth_refresh_token', tokens.refresh_token, 'Google Drive OAuth Refresh Token');
    }
    if (tokens.access_token) {
      setSetting('google_oauth_access_token', tokens.access_token, 'Google Drive OAuth Access Token');
    }

    const drive = driveFolder.getDriveClient(true);
    const about = await drive.about.get({ fields: 'user' });
    const userEmail = about.data?.user?.emailAddress || 'connected_google_account';
    setSetting('google_oauth_email', userEmail, 'Google Drive OAuth Connected Email');

    // Direct redirect back to admin settings system & storage tab
    return res.redirect('/admin/settings?tab=cron');
  } catch (err) {
    console.error('[OAuthCallbackError]:', err);
    res.status(500).send('Gagal otorisasi Google OAuth: ' + err.message);
  }
});

// Apply auth to all remaining admin routes
router.use(requireAuth);

// ============ MOUNT SUB-ROUTERS (Modular) ============
const settingsRouter = require('./admin/settings');
router.use('/settings', settingsRouter);
// Forward /profile/* → settingsRouter at /profile/* (backward-compatible)
router.use('/profile', (req, res, next) => {
  req.url = '/profile' + (req.url === '/' ? '' : req.url);
  settingsRouter(req, res, next);
});

const portfolioRouter = require('./admin/portfolio');
router.use('/portfolio', portfolioRouter);

const inquiriesRouter = require('./admin/inquiries');
router.use('/inquiries', inquiriesRouter);

const freelancersRouter = require('./admin/freelance');
router.use('/freelancers', freelancersRouter);

const payoutsRouter = require('./admin/payroll');
router.use('/payouts', payoutsRouter);

const bookingsRouter = require('./admin/bookings');
router.use('/bookings', bookingsRouter);

const promoRouter = require('./admin/promo');
router.use('/promo', promoRouter);

const partnersRouter = require('./admin/partners');
router.use('/partners', partnersRouter);

const expensesRouter = require('./admin/expenses');
router.use('/expenses', expensesRouter);

// ============ DASHBOARD ============
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {};
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${y}-${m}-01`;
    const nextY = now.getMonth() === 11 ? y + 1 : y;
    const nextM = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
    const lastDay = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
    const prevM = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevY = now.getMonth() === 0 ? y - 1 : y;
    const firstDayPrev = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    const prevEnd = `${y}-${m}-01`;

    // Revenue
    const revThis = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM bookings WHERE dp_status='paid' AND created_at>=? AND created_at<?`).get(firstDay, lastDay);
    const revLast = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM bookings WHERE dp_status='paid' AND created_at>=? AND created_at<?`).get(firstDayPrev, prevEnd);
    stats.revenue_this_month = revThis.t;
    stats.revenue_last_month = revLast.t;
    stats.revenue_trend = revLast.t > 0 ? Math.round((revThis.t - revLast.t) / revLast.t * 100) : (revThis.t > 0 ? 100 : 0);

    // Expenses & Net Profit
    const expThis = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE expense_date>=? AND expense_date<?`).get(firstDay, lastDay);
    const expLast = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE expense_date>=? AND expense_date<?`).get(firstDayPrev, prevEnd);
    stats.expenses_this_month = expThis.t;
    stats.expenses_last_month = expLast.t;
    stats.expenses_trend = expLast.t > 0 ? Math.round((expThis.t - expLast.t) / expLast.t * 100) : (expThis.t > 0 ? 100 : 0);

    stats.net_profit_this_month = stats.revenue_this_month - stats.expenses_this_month;
    stats.net_profit_last_month = stats.revenue_last_month - stats.expenses_last_month;
    stats.net_profit_trend = stats.net_profit_last_month > 0 
      ? Math.round((stats.net_profit_this_month - stats.net_profit_last_month) / stats.net_profit_last_month * 100) 
      : (stats.net_profit_this_month > 0 ? 100 : 0);

    // All-time revenue & profit
    stats.revenue_total = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM bookings WHERE dp_status='paid'`).get().t;
    stats.expenses_total = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses`).get().t;
    stats.net_profit_total = stats.revenue_total - stats.expenses_total;

    // Inquiries (Tahap 1: Inquiry)
    stats.inquiries_all_time = db.prepare('SELECT COUNT(*) as c FROM inquiries').get().c;
    stats.inquiries_total = db.prepare(`
      SELECT COUNT(*) as c FROM inquiries i
      WHERE (
        NOT EXISTS (SELECT 1 FROM bookings WHERE bookings.inquiry_id = i.id)
        OR EXISTS (
          SELECT 1 FROM bookings b2
          WHERE b2.inquiry_id = i.id
          AND b2.dp_status IN ('unpaid', 'uploaded')
          AND b2.status != 'cancelled'
        )
      )
    `).get().c;
    stats.inquiries_new = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='new'").get().c;
    stats.inquiries_quoted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='booking_link_active'").get().c;
    stats.inquiries_converted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='converted' OR EXISTS (SELECT 1 FROM bookings WHERE bookings.inquiry_id = inquiries.id AND bookings.dp_status='paid')").get().c;
    stats.inquiries_this_month = db.prepare(`SELECT COUNT(*) as c FROM inquiries WHERE created_at>=? AND created_at<?`).get(firstDay, lastDay).c;

    // Booking Pipeline (Master 4 Stages Architecture)
    stats.bookings_total = db.prepare('SELECT COUNT(*) as c FROM bookings').get().c;
    // Tahap 2: Client Aktif (DP Lunas s/d Sesi Selesai Menunggu Pelunasan)
    stats.clients_active = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE dp_status='paid' AND status NOT IN ('post_production', 'delivered', 'completed', 'cancelled')").get().c;
    stats.bookings_confirmed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='confirmed'").get().c;
    stats.bookings_shooting = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='shooting'").get().c;
    // Tahap 3: Post Production (Seleksi & Editing)
    stats.post_production_total = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status IN ('post_production', 'delivered')").get().c;
    stats.bookings_delivered = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='delivered'").get().c;
    // Tahap 4: Selesai / Arsip
    stats.bookings_completed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='completed'").get().c;
    stats.bookings_completed_this_month = db.prepare(`
      SELECT COUNT(*) as c FROM bookings 
      WHERE status='completed' 
      AND (
        (client_confirmed_at IS NOT NULL AND client_confirmed_at>=? AND client_confirmed_at<?)
        OR (client_confirmed_at IS NULL AND updated_at>=? AND updated_at<?)
      )
    `).get(firstDay, lastDay, firstDay, lastDay).c;
    stats.bookings_cancelled = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='cancelled'").get().c;
    stats.bookings_this_month = db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE created_at>=? AND created_at<?`).get(firstDay, lastDay).c;

    // Conversion rates & Stage Progress Metrics
    const totalInqBase = stats.inquiries_all_time || stats.inquiries_total;
    stats.conversion_rate = totalInqBase > 0 
      ? Math.min(100, Math.round(((stats.inquiries_converted || stats.bookings_total) / totalInqBase) * 100)) 
      : (stats.bookings_total > 0 ? 100 : 0);
    stats.production_rate = stats.bookings_total > 0 
      ? Math.round(((stats.clients_active + stats.post_production_total + stats.bookings_completed) / stats.bookings_total) * 100) 
      : 0;
    stats.post_prod_rate = stats.bookings_total > 0 
      ? Math.round(((stats.post_production_total + stats.bookings_completed) / stats.bookings_total) * 100) 
      : 0;
    stats.completion_rate = stats.bookings_total > 0 
      ? Math.round((stats.bookings_completed / stats.bookings_total) * 100) 
      : 0;
    stats.shooting_rate = stats.post_prod_rate;
    stats.delivery_rate = stats.bookings_total > 0 
      ? Math.round(((stats.bookings_delivered + stats.bookings_completed) / stats.bookings_total) * 100) 
      : 0;

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
      WHERE graduation_date IS NOT NULL AND date(graduation_date)>=date('now') AND date(graduation_date)<=date('now','+7 days')
      AND status IN ('confirmed','shooting')
    `).get().c;
    stats.next_week_shoots = db.prepare(`
      SELECT COUNT(*) as c FROM bookings
      WHERE graduation_date IS NOT NULL AND date(graduation_date)>=date('now','+8 days') AND date(graduation_date)<=date('now','+14 days')
      AND status IN ('confirmed')
    `).get().c;

    const upcoming = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.shooting_time, b.graduation_date, b.location, b.status,
             b.total_price, b.dp_status, b.balance_status,
             f.name as fg_name, f.phone as fg_phone
      FROM bookings b
      LEFT JOIN assignments a ON a.booking_id=b.id AND a.status IN ('assigned','confirmed')
      LEFT JOIN freelancers f ON a.fg_id=f.id
      WHERE b.graduation_date IS NOT NULL AND date(b.graduation_date)>=date('now') AND date(b.graduation_date)<=date('now','+7 days')
      AND b.status IN ('confirmed','shooting')
      ORDER BY date(b.graduation_date) ASC, b.shooting_time ASC LIMIT 8
    `).all();
    stats.upcoming_shoots = upcoming;

    // Recent activity
    const recent = [];
    db.prepare("SELECT 'booking_new' as type, id, client_name, status, created_at FROM bookings ORDER BY updated_at DESC LIMIT 10").all().forEach(r => recent.push(r));
    db.prepare("SELECT 'payment' as type, id, client_name, CASE WHEN dp_status='paid' THEN 'dp_paid' WHEN balance_status='paid' THEN 'balance_paid' ELSE status END as status, updated_at as created_at FROM bookings WHERE dp_status IN ('paid','uploaded') OR balance_status IN ('paid','uploaded') ORDER BY updated_at DESC LIMIT 10").all().forEach(p => recent.push(p));
    db.prepare("SELECT 'deliver' as type, id, client_name, status, updated_at as created_at FROM bookings WHERE status IN ('delivered','completed') ORDER BY updated_at DESC LIMIT 10").all().forEach(d => recent.push(d));
    recent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    stats.recent_activity = recent.slice(0, 20);

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
    stats.payout_pending = db.prepare(`
      SELECT COUNT(*) as c 
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      JOIN freelancers f ON a.fg_id = f.id
      LEFT JOIN payouts py ON py.assignment_id = a.id
      WHERE a.status IN ('done', 'completed', 'uploaded') AND (py.status IS NULL OR py.status != 'paid')
    `).get().c;
    try {
      stats.portfolio_draft = db.prepare("SELECT COUNT(*) as c FROM portfolio_items WHERE published = 0").get().c;
      stats.portfolio_total = db.prepare("SELECT COUNT(*) as c FROM portfolio_items").get().c;
    } catch (e) {
      stats.portfolio_draft = 0;
      stats.portfolio_total = 0;
    }

    // Unassigned confirmed bookings (paid DP, but no photographer assignment active)
    stats.unassigned_bookings = db.prepare(`
      SELECT COUNT(*) as c FROM bookings b
      WHERE b.status='confirmed' AND b.dp_status='paid'
      AND NOT EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.booking_id=b.id AND a.status IN ('assigned','confirmed')
      )
    `).get().c;

    // Photos selected by client, waiting for editor processing
    stats.client_selected = db.prepare(`
      SELECT COUNT(*) as c FROM bookings
      WHERE status='post_production' AND selection_status='submitted'
    `).get().c;

    // Package popularity
    stats.package_popularity = db.prepare(`
      SELECT p.name, COUNT(b.id) as total FROM packages p
      LEFT JOIN bookings b ON b.package_id=p.id
      GROUP BY p.id ORDER BY total DESC LIMIT 5
    `).all();

    // Sesi Foto Hari Ini & Besok
    stats.today_shoots = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.shooting_time, b.graduation_date, b.location, b.status,
             f.name as fg_name, f.phone as fg_phone
      FROM bookings b
      LEFT JOIN assignments a ON a.booking_id=b.id AND a.status IN ('assigned','confirmed')
      LEFT JOIN freelancers f ON a.fg_id=f.id
      WHERE b.graduation_date IS NOT NULL AND date(b.graduation_date)>=date('now') AND date(b.graduation_date)<=date('now','+1 day')
      AND b.status IN ('confirmed','shooting')
      ORDER BY date(b.graduation_date) ASC, b.shooting_time ASC
    `).all();

    // Ringkasan Piutang & Unpaid Fees
    stats.unpaid_balances_total = db.prepare(`
      SELECT COALESCE(SUM(balance_amount),0) as t FROM bookings 
      WHERE balance_status!='paid' AND dp_status='paid' AND status!='cancelled'
    `).get().t;

    stats.unpaid_fg_fees_total = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(py.total_payout, a.fg_fee, f.default_rate, p.fg_fee, 0)), 0) as t 
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      JOIN packages p ON b.package_id = p.id
      JOIN freelancers f ON a.fg_id = f.id
      LEFT JOIN payouts py ON py.assignment_id = a.id
      WHERE a.status IN ('done', 'completed', 'uploaded') AND (py.status IS NULL OR py.status != 'paid')
    `).get().t;

    // Fetch upcoming reminders (H-3 and H-1 / Hari H)
    const activeAssignments = db.prepare(`
      SELECT a.id as assignment_id, a.brief,
             b.id as booking_id, b.client_name, b.client_phone, b.graduation_date, b.shooting_time, b.location, b.university,
             f.name as fg_name, f.phone as fg_phone
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      LEFT JOIN freelancers f ON a.fg_id = f.id
      WHERE a.status IN ('assigned', 'confirmed')
      AND b.status != 'cancelled'
      AND (
        date(b.graduation_date) = date('now')
        OR date(b.graduation_date) = date('now', '+1 day')
        OR date(b.graduation_date) = date('now', '+2 days')
        OR date(b.graduation_date) = date('now', '+3 days')
      )
      ORDER BY date(b.graduation_date) ASC
    `).all();

    const { getSettings } = require('../config/wa-templates');
    const settings = getSettings();
    const reminders = [];
    activeAssignments.forEach(a => {
      // Calculate days diff between graduation_date and today (WITA)
      const gradDate = new Date(a.graduation_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = gradDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let typeLabel = '';
      if (diffDays === 3) typeLabel = 'H-3 Sesi Foto';
      else if (diffDays === 2) typeLabel = 'H-2 Sesi Foto';
      else if (diffDays === 1) typeLabel = 'H-1 Sesi Foto';
      else if (diffDays === 0) typeLabel = 'Hari H Sesi Foto';
      else typeLabel = `H-${diffDays} Sesi Foto`;

      // Generate client link
      let waLinkClient = '';
      if (a.client_phone) {
        const clientTemplateKey = diffDays === 1 ? 'reminder_h1_client' : 'reminder_h3_client';
        waLinkClient = generateWaLink(a.client_phone, clientTemplateKey, {
          client_name: a.client_name,
          graduation_date: a.graduation_date || '-',
          university: a.university || '-',
          shooting_time: a.shooting_time || '-',
          location: a.location || '-',
          fg_name: a.fg_name || '-',
          fg_phone: a.fg_phone || '-'
        });
      }

      // Generate FG link
      let waLinkFg = '';
      if (a.fg_phone) {
        const fgTemplateKey = diffDays === 1 ? 'reminder_h1_fg' : 'reminder_h3_fg';
        waLinkFg = generateWaLink(a.fg_phone, fgTemplateKey, {
          client_name: a.client_name,
          client_phone: a.client_phone || '-',
          university: a.university || '-',
          location: a.location || '-',
          shooting_time: a.shooting_time || '-',
          brief: a.brief || '-',
          admin_phone: settings.admin_phone || settings.adminPhone || ''
        });
      }

      reminders.push({
        booking_id: a.booking_id,
        client_name: a.client_name,
        client_phone: a.client_phone,
        university: a.university || '-',
        graduation_date: a.graduation_date,
        shooting_time: a.shooting_time || '-',
        location: a.location || '-',
        fg_name: a.fg_name || null,
        fg_phone: a.fg_phone || null,  // null bukan '-' agar frontend bisa cek truthiness dengan benar
        days_left: diffDays,
        type_label: typeLabel,
        wa_link_client: waLinkClient,
        wa_link_fg: waLinkFg
      });
    });
    stats.reminders = reminders;

    // Fetch upcoming Google Drive retention warnings (expiring within 30 days or expired)
    try {
      const driveService = require('../services/drive-folder.service');
      const templates = getWaTemplates();

      // Ensure expiry dates are calculated for bookings with drive_parent_url
      db.prepare(`
        UPDATE bookings
        SET drive_expiry_date = date(created_at, '+' || ? || ' month')
        WHERE drive_parent_url IS NOT NULL
        AND (drive_expiry_date IS NULL OR drive_expiry_date = '')
      `).run(parseInt(settings.drive_retention_months || '3', 10));

      const expiringBookings = db.prepare(`
        SELECT id, client_name, client_phone, client_email, drive_parent_url, drive_total_bytes, drive_expiry_date, drive_cleanup_status, tracking_token
        FROM bookings
        WHERE drive_parent_url IS NOT NULL
        AND (drive_cleanup_status IS NULL OR drive_cleanup_status != 'trashed')
        AND drive_expiry_date IS NOT NULL
        AND date(drive_expiry_date) <= date('now', '+30 days')
        ORDER BY drive_expiry_date ASC
        LIMIT 10
      `).all();

      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
      const todayObj = new Date(todayStr);

      stats.drive_retention_alerts = expiringBookings.map(b => {
        const expiryObj = new Date(b.drive_expiry_date);
        const diffDays = Math.ceil((expiryObj - todayObj) / (1000 * 60 * 60 * 24));
        const formattedSize = driveService.formatBytes(b.drive_total_bytes || 0);
        const trackingUrl = b.tracking_token
          ? `${settings.seo_domain || 'https://wisudaphotography.com'}/track/${b.tracking_token}`
          : b.drive_parent_url;

        const templateStr = (diffDays <= 3) ? (templates.drive_reminder_h3 || '') : (templates.drive_reminder_h14 || '');
        const waMsg = templateStr
          .replace('{client_name}', b.client_name || 'Client')
          .replace('{booking_id}', b.id)
          .replace('{drive_expiry_date}', b.drive_expiry_date)
          .replace('{drive_total_size}', formattedSize)
          .replace('{tracking_url}', trackingUrl)
          .replace('{company_name}', settings.company_name || 'Wisuda Photography');

        let phoneClean = String(b.client_phone || '').replace(/[^0-9]/g, '');
        if (phoneClean.startsWith('0')) phoneClean = '62' + phoneClean.slice(1);

        const directWaUrl = phoneClean
          ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(waMsg)}`
          : null;

        return {
          id: b.id,
          client_name: b.client_name,
          client_phone: b.client_phone,
          client_email: b.client_email,
          drive_parent_url: b.drive_parent_url,
          formatted_size: formattedSize,
          drive_expiry_date: b.drive_expiry_date,
          days_remaining: diffDays,
          drive_cleanup_status: b.drive_cleanup_status || 'active',
          direct_wa_url: directWaUrl
        };
      });
    } catch (dErr) {
      stats.drive_retention_alerts = [];
    }

    // 🎓 University Distribution
    stats.university_distribution = db.prepare(`
      SELECT COALESCE(NULLIF(university, ''), 'Universitas Lain') as university, COUNT(*) as count
      FROM bookings
      WHERE status != 'cancelled'
      GROUP BY university
      ORDER BY count DESC LIMIT 5
    `).all();

    // 🟢 System Health Status
    const gdActive = !!(settings.google_oauth_refresh_token || settings.google_oauth_email || settings.google_drive_refresh_token || settings.google_drive_connected);
    const smtpActive = !!(settings.smtp_host && settings.smtp_user);
    stats.system_health = {
      drive_active: gdActive,
      drive_email: settings.google_oauth_email || settings.google_drive_account_email || (gdActive ? 'Google Drive Terhubung' : 'Belum Ditautkan'),
      smtp_active: smtpActive,
      smtp_user: settings.smtp_user || (smtpActive ? 'SMTP Aktif' : 'Belum Dikonfigurasi'),
      backup_schedule: 'Setiap 02:00 WIB'
    };

    // ☁️ Status Upload Berkas Google Drive & Seleksi Klien (5 Tahapan Runtut)
    // Berurutan: Hanya klien yang SESI FOTO SUDAH SELESAI (status = 'post_production')

    // 1. Terima File dari FG (Belum dikonfirmasi terima file & belum ada staging)
    const receiveFilePendingList = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.graduation_date, b.shooting_time, b.location
      FROM bookings b
      LEFT JOIN assignments a ON a.booking_id = b.id
      LEFT JOIN deliverables d ON d.assignment_id = a.id
      WHERE b.status = 'post_production'
      AND d.id IS NULL
      AND (b.staged_photo_count IS NULL OR b.staged_photo_count = 0)
      AND (b.staging_files IS NULL OR b.staging_files = '[]' OR b.staging_files = '')
      AND (b.selection_status IS NULL OR b.selection_status = 'pending')
      ORDER BY date(b.graduation_date) ASC LIMIT 8
    `).all();

    // 2. Unggah Semua JPG (Sudah terima file dari FG, menunggu upload JPG mentah ATAU belum diklik Push Staging)
    const jpgPendingList = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.graduation_date, b.shooting_time, b.location
      FROM bookings b
      LEFT JOIN assignments a ON a.booking_id = b.id
      LEFT JOIN deliverables d ON d.assignment_id = a.id
      WHERE b.status = 'post_production'
      AND d.id IS NOT NULL
      AND (b.selection_status IN ('staged', 'pending', 'scanning', 'importing', 'failed') OR b.selection_status IS NULL)
      ORDER BY date(b.graduation_date) ASC LIMIT 8
    `).all();

    // 3. Belum Memilih Foto (Galeri sudah resmi dibuka/di-push ke klien, sekarang giliran klien memilih foto)
    const selectionPendingList = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.graduation_date, b.staged_photo_count, b.updated_at
      FROM bookings b
      WHERE b.status = 'post_production'
      AND b.selection_status = 'ready'
      ORDER BY b.updated_at ASC LIMIT 8
    `).all();

    // 4. Highlight (Klien sudah submit seleksi foto, menunggu Admin edit & push highlight)
    const highlightPendingList = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.graduation_date, b.shooting_time, b.location
      FROM bookings b
      WHERE b.status = 'post_production'
      AND b.selection_status = 'submitted'
      ORDER BY date(b.graduation_date) ASC LIMIT 8
    `).all();

    // 5. Final Editing (Highlight selesai/cleaned, menunggu Admin review & push final edit ke klien)
    const finalEditPendingList = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.graduation_date, b.selected_photos, b.final_photo_count, b.updated_at
      FROM bookings b
      WHERE b.status = 'post_production'
      AND b.selection_status = 'cleaned'
      ORDER BY b.updated_at ASC LIMIT 8
    `).all();

    const totalPostProductionClients = db.prepare(`
      SELECT COUNT(*) as c FROM bookings b
      WHERE b.status = 'post_production'
    `).get().c;

    stats.drive_upload_pipeline = {
      total_clients: totalPostProductionClients,
      receive_file: {
        count: receiveFilePendingList.length,
        list: receiveFilePendingList
      },
      jpg: {
        count: jpgPendingList.length,
        list: jpgPendingList
      },
      selection_pending: {
        count: selectionPendingList.length,
        list: selectionPendingList
      },
      highlight: {
        count: highlightPendingList.length,
        list: highlightPendingList
      },
      final_editing: {
        count: finalEditPendingList.length,
        list: finalEditPendingList
      }
    };

    // ☁️ Google Drive Storage Breakdown (Master Client, Portofolio, Sampah)
    const clientFoldersCount = db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE status != 'cancelled'`).get().c;
    let portfolioFoldersCount = 0;
    try {
      portfolioFoldersCount = db.prepare(`SELECT COUNT(*) as c FROM portfolio_items`).get().c;
    } catch (e) { }
    const trashFoldersCount = db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE status = 'archived' OR (status = 'delivered' AND date(graduation_date) <= date('now', '-30 days'))`).get().c;

    let totalClientStorageMB = 0;
    const clientStorageRows = db.prepare(`
      SELECT staged_photo_count, highlight_photo_count, final_photo_count
      FROM bookings WHERE status != 'cancelled'
    `).all();
    for (const row of clientStorageRows) {
      const stagedCount = row.staged_photo_count || 0;
      const highlightCount = row.highlight_photo_count || 0;
      const finalCount = row.final_photo_count || 0;
      totalClientStorageMB += (stagedCount * 3.5) + (highlightCount * 4.0) + (finalCount * 5.0);
    }
    const clientStorageGB = (totalClientStorageMB / 1024).toFixed(1);

    stats.drive_storage_overview = {
      total_used_gb: clientStorageGB,
      master_client: {
        folder_count: clientFoldersCount,
        size_gb: clientStorageGB
      },
      master_portfolio: {
        folder_count: portfolioFoldersCount,
        size_gb: '0.0'
      },
      drive_trash: {
        folder_count: trashFoldersCount,
        size_gb: '0.0'
      }
    };

    // 📬 Recent Sent Emails (Client & System Email Log)
    try {
      stats.recent_sent_emails = db.prepare(`
        SELECT id, recipient_email, recipient_name, subject, template_type, category, status, error_message, created_at
        FROM email_logs
        ORDER BY created_at DESC LIMIT 20
      `).all();
    } catch (emErr) {
      stats.recent_sent_emails = [];
    }

    // Format currency
    Object.keys(stats).forEach(key => {
      if (key.includes('revenue') || key === 'revenue_total' || (!isNaN(Number(stats[key])) && key.includes('total') && !['bookings_total', 'inquiries_total', 'bookings_this_month', 'inquiries_this_month'].includes(key))) {
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

// ============ INQUIRIES — Dipindahkan ke src/routes/admin/inquiries.js ============
// ============ BOOKINGS (PRIMARY) — Dipindahkan ke src/routes/admin/bookings.js ============

// ============ FREELANCERS — Dipindahkan ke src/routes/admin/freelance.js ============
router.get('/packages', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as c FROM packages').get().c;
  const data = db.prepare('SELECT * FROM packages ORDER BY sort_order ASC, price ASC LIMIT ? OFFSET ?').all(limit, offset);
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/packages', (req, res) => {
  const { name, description, price, includes, duration_hours, sort_order, active, fg_fee, editor_fee, max_selected_photos, highlight_count, category } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Nama dan harga wajib' });
  const r = db.prepare(`INSERT INTO packages (name, description, price, includes, duration_hours, sort_order, active, fg_fee, editor_fee, max_selected_photos, highlight_count, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, description || '', price, includes || '', duration_hours || null, sort_order || 0, active !== false ? 1 : 0, fg_fee || 0, editor_fee || 0, max_selected_photos || 15, highlight_count || 5, category || 'Standard');
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(pkg);
});

router.put('/packages/:id', (req, res) => {
  const { name, description, price, includes, duration_hours, sort_order, active, fg_fee, editor_fee, max_selected_photos, highlight_count, category } = req.body;
  const existing = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Paket tidak ditemukan' });
  db.prepare(`UPDATE packages SET name=?, description=?, price=?, includes=?, duration_hours=?, sort_order=?, active=?, fg_fee=?, editor_fee=?, max_selected_photos=?, highlight_count=?, category=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name || existing.name, description !== undefined ? description : existing.description, price !== undefined ? price : existing.price,
      includes !== undefined ? includes : existing.includes, duration_hours !== undefined ? duration_hours : existing.duration_hours,
      sort_order !== undefined ? sort_order : existing.sort_order, active !== undefined ? (active ? 1 : 0) : existing.active,
      fg_fee !== undefined ? fg_fee : existing.fg_fee, editor_fee !== undefined ? editor_fee : existing.editor_fee,
      max_selected_photos !== undefined ? max_selected_photos : existing.max_selected_photos,
      highlight_count !== undefined ? highlight_count : existing.highlight_count,
      category !== undefined ? category : existing.category, req.params.id);
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

  // Check max bookings per day dynamically from settings
  const maxPerDay = parseInt(getSetting('max_photos_per_fg_per_day', 2));
  const countToday = db.prepare(`
    SELECT COUNT(*) as c FROM assignments a 
    JOIN bookings b ON a.booking_id = b.id 
    WHERE a.fg_id = ? AND b.graduation_date = ? AND a.status != 'cancelled'
  `).get(fg_id, booking.graduation_date).c;

  if (countToday >= maxPerDay) {
    return res.status(400).json({ error: `FG ini sudah mencapai batas maksimal ${maxPerDay} sesi foto di tanggal tersebut.` });
  }

  // Create assignment
  const uploadDeadlineDays = parseInt(getSetting('upload_deadline_days', 1));
  const uploadDeadline = new Date(booking.graduation_date);
  uploadDeadline.setDate(uploadDeadline.getDate() + uploadDeadlineDays);
  uploadDeadline.setHours(23, 59, 59, 999);

  const result = db.prepare(`
    INSERT INTO assignments (booking_id, fg_id, editor_id, brief, upload_deadline, status)
    VALUES (?, ?, ?, ?, ?, 'accepted')
  `).run(booking_id, fg_id, editor_id || null, brief || null, uploadDeadline.toISOString());

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);

  // Update FG schedule
  db.prepare(`
    INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
    VALUES (?, ?, 'booked', ?, 'Assignment #' || ?)
  `).run(fg_id, booking.graduation_date, booking_id, result.lastInsertRowid);

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

  const waLink = `https://api.whatsapp.com/send?phone=${fg.phone}&text=${encodeURIComponent(waMessage)}`;

  // SSE: real-time update ke tracking page klien (FG sudah di-assign, status booking → shooting)
  sseService.notifyBookingUpdate(booking_id);

  res.status(201).json({ assignment, wa_link: waLink });
});

// ============ RESCHEDULE REQUEST MANAGEMENT ============
router.get('/reschedule-requests', (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    let whereClause = "WHERE 1=1";
    const params = [];

    if (status && status !== 'all') {
      whereClause += " AND r.status = ?";
      params.push(status);
    }

    const requests = db.prepare(`
      SELECT 
        r.*, 
        b.client_name, b.client_phone, b.university, b.city, b.duration_hours,
        a.fg_id, f.name as fg_name, f.phone as fg_phone,
        u.name as reviewer_name
      FROM reschedule_requests r
      JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN assignments a ON a.booking_id = b.id AND a.status != 'cancelled'
      LEFT JOIN freelancers f ON a.fg_id = f.id
      LEFT JOIN users u ON r.reviewed_by = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `).all(...params);

    // Re-verify current conflict status & find available FG candidates for each request
    const dataWithCandidates = requests.map(r => {
      let availableFgs = [];
      let isStillConflicting = false;

      if (r.fg_id) {
        const conflictCheck = checkFgConflict(
          db, r.fg_id, r.new_graduation_date, r.new_shooting_time, r.duration_hours || 2, r.booking_id
        );
        isStillConflicting = conflictCheck.hasConflict;
      }

      if (isStillConflicting || !r.fg_id || r.fg_conflict_status === 'conflict') {
        availableFgs = findAvailableFreelancers(
          db, r.new_graduation_date, r.new_shooting_time, r.duration_hours || 2, r.city, r.booking_id
        );
      }

      return {
        ...r,
        is_conflicting: isStillConflicting,
        available_fgs: availableFgs
      };
    });

    res.json({ success: true, data: dataWithCandidates });
  } catch (err) {
    console.error('Error fetching reschedule requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reschedule-requests/:id/approve', (req, res) => {
  try {
    const requestId = req.params.id;
    const { new_fg_id } = req.body;

    const r = db.prepare('SELECT * FROM reschedule_requests WHERE id = ?').get(requestId);
    if (!r) return res.status(404).json({ error: 'Permohonan reschedule tidak ditemukan' });
    if (r.status !== 'pending') {
      return res.status(400).json({ error: 'Permohonan ini sudah diproses sebelumnya' });
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(r.booking_id);
    if (!booking) return res.status(404).json({ error: 'Booking terkait tidak ditemukan' });

    // Update booking schedule
    db.prepare(`
      UPDATE bookings 
      SET graduation_date = ?, shooting_time = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(r.new_graduation_date, r.new_shooting_time, r.booking_id);

    // Update or Re-assign FG Assignment
    const assignment = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(r.booking_id);
    const targetFgId = new_fg_id ? parseInt(new_fg_id) : (assignment ? assignment.fg_id : null);

    if (targetFgId) {
      if (assignment) {
        db.prepare('UPDATE assignments SET fg_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(targetFgId, assignment.id);
      } else {
        const uploadDeadlineDays = parseInt(getSetting('upload_deadline_days', 1));
        const uploadDeadline = new Date(r.new_graduation_date);
        uploadDeadline.setDate(uploadDeadline.getDate() + uploadDeadlineDays);
        uploadDeadline.setHours(23, 59, 59, 999);

        db.prepare(`
          INSERT INTO assignments (booking_id, fg_id, upload_deadline)
          VALUES (?, ?, ?)
        `).run(r.booking_id, targetFgId, uploadDeadline.toISOString());
      }

      // Clean up previous FG Schedule for this booking to prevent orphan schedules
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(r.booking_id);

      // Update FG Schedule with new date
      db.prepare(`
        INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
        VALUES (?, ?, 'booked', ?, 'Rescheduled Booking #' || ?)
      `).run(targetFgId, r.new_graduation_date, r.booking_id, r.booking_id);
    }

    // Mark request approved
    db.prepare(`
      UPDATE reschedule_requests 
      SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(req.user ? req.user.id : null, requestId);

    // Build WA notification text
    const templates = getWaTemplates();
    const settings = getSettings();
    const waMessage = `Halo ${booking.client_name}, permohonan perubahan jadwal foto wisuda Anda telah DISETUJUI oleh Admin ${settings.companyName || 'AmsDev'}.\n\n📅 Tanggal Baru: ${r.new_graduation_date}\n⏰ Jam Baru: ${r.new_shooting_time} WITA\n\nTerima kasih!`;
    const waLink = `https://api.whatsapp.com/send?phone=${booking.client_phone}&text=${encodeURIComponent(waMessage)}`;

    res.json({
      success: true,
      message: 'Permohonan perubahan jadwal berhasil disetujui.',
      wa_link: waLink
    });
  } catch (err) {
    console.error('Error approving reschedule request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reschedule-requests/:id/reject', (req, res) => {
  try {
    const requestId = req.params.id;
    const { reason } = req.body;

    const r = db.prepare('SELECT * FROM reschedule_requests WHERE id = ?').get(requestId);
    if (!r) return res.status(404).json({ error: 'Permohonan reschedule tidak ditemukan' });

    db.prepare(`
      UPDATE reschedule_requests 
      SET status = 'rejected', reason = COALESCE(?, reason), reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reason || null, req.user ? req.user.id : null, requestId);

    res.json({ success: true, message: 'Permohonan perubahan jadwal telah ditolak.' });
  } catch (err) {
    console.error('Error rejecting reschedule request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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
    SELECT COUNT(*) as c FROM bookings b WHERE b.status IN ('post_production', 'delivered')
  `).get().c;

  const rows = db.prepare(`
    SELECT b.id as booking_id, b.client_name, b.graduation_date, b.university, b.status as booking_status, b.portfolio_consent,
           b.download_url, b.client_phone, b.tracking_token, b.is_session_done,
           b.balance_status, b.balance_amount, b.balance_bukti_url,
            b.staging_drive_url, b.selection_status, b.highlight_drive_url, b.selected_photos, b.staging_files,
            b.staged_photo_count, b.highlight_photo_count, b.final_photo_count,
           a.id as assignment_id, a.status as assignment_status, a.fg_id, a.editor_id,
           f.name as fg_name,
           d.id as deliverable_id, d.delivery_type, d.qc_status, d.notes as delivery_notes
    FROM bookings b
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    WHERE b.status IN ('post_production', 'delivered')
    ORDER BY b.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  // Determine post-production sub-status for each row
  const data = rows.map(r => {
    let pp_status = 'Menunggu File dari FG';
    if (r.booking_status === 'delivered' || r.booking_status === 'completed') {
      pp_status = 'Terkirim ke Client (Final)';
    } else if (r.selection_status === 'cleaned') {
      pp_status = 'Highlight Siap';
    } else if (r.selection_status === 'submitted') {
      pp_status = 'Proses Edit Highlight';
    } else if (r.selection_status === 'ready') {
      pp_status = 'Menunggu Pilihan Client';
    } else if (r.selection_status === 'staged') {
      pp_status = 'Menunggu Push Staging';
    } else if (r.selection_status === 'scanning' || r.selection_status === 'importing' || (r.staging_drive_url && !r.selection_status)) {
      pp_status = 'Memindai Folder Drive';
    } else if (r.selection_status === 'failed') {
      pp_status = 'Staging Gagal (0 Foto)';
    } else if (r.deliverable_id || r.assignment_status === 'uploaded' || r.delivery_type) {
      pp_status = 'Menunggu Staging Upload';
    } else {
      pp_status = 'Menunggu File dari FG';
    }

    let parsedSelected = [];
    try { parsedSelected = JSON.parse(r.selected_photos || '[]'); } catch { parsedSelected = []; }

    let staged_photo_count = r.staged_photo_count || 0;
    if (!staged_photo_count && r.staging_files) {
      try {
        const parsedStaging = JSON.parse(r.staging_files);
        if (Array.isArray(parsedStaging)) staged_photo_count = parsedStaging.length;
      } catch (e) { }
    }

    const highlight_photo_count = r.highlight_photo_count || 0;
    const final_photo_count = r.final_photo_count || 0;

    return { ...r, selected_photos: parsedSelected, pp_status, staged_photo_count, highlight_photo_count, final_photo_count };
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

  // Update assignment & booking status, plus save download_url to bookings table
  db.prepare('UPDATE assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('done', deliverable.assignment_id);
  const assignment = db.prepare('SELECT booking_id FROM assignments WHERE id = ?').get(deliverable.assignment_id);
  db.prepare('UPDATE bookings SET status = ?, download_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('delivered', download_url, assignment.booking_id);

  // Clear staging_files dari DB saat file final dikirim ke klien
  try {
    db.prepare('UPDATE bookings SET staging_files = NULL WHERE id = ?').run(assignment.booking_id);
  } catch (e) {
    console.warn(`[Deliver] Gagal clear staging DB Booking #${assignment.booking_id}:`, e.message);
  }

  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(assignment.booking_id);
  ensureBookingToken(booking, db);
  const trackingUrl = getTrackingUrl(req, booking);

  const driveParentUrl = booking.drive_parent_url || download_url;
  let waMessage = (templates.delivery_ready || '')
    .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
    .replace('{client_name}', booking.client_name || 'Kak')
    .replace('{drive_parent_url}', driveParentUrl)
    .replace('{download_url}', driveParentUrl)
    .replace('{tracking_url}', trackingUrl)
    .replace('{tracking_token}', booking.tracking_token || `TRK-${booking.id}`)
    .replace('{password}', password)
    .replace('{admin_phone}', settings.adminPhone)
    .replace(/{booking_id}/g, booking.id);

  const waLink = `https://api.whatsapp.com/send?phone=${booking.client_phone}&text=${encodeURIComponent(waMessage)}`;

  // SSE: real-time update ke tracking page klien (foto dikirim, status → delivered)
  sseService.notifyBookingUpdate(assignment.booking_id);

  const updated = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(req.params.id);
  res.json({ deliverable: updated, wa_link: waLink });
});

// ============ BOOKINGS (POST-PROD / STAGING) — Dipindahkan ke src/routes/admin/bookings.js ============
// ============ PAYOUTS — Dipindahkan ke src/routes/admin/payroll.js ============
// ============ SETTINGS (BACKUP + MAIN) — Dipindahkan ke src/routes/admin/settings.js ============
// ============ PROFILE — Dipindahkan ke src/routes/admin/settings.js ============

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
  const quoted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status IN ('booking_link_active', 'quoted')").get().c;
  const booked = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'converted' OR EXISTS (SELECT 1 FROM bookings WHERE bookings.inquiry_id = inquiries.id AND bookings.dp_status = 'paid')").get().c;
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

  const completedCount = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'completed'").get().c;
  const cancelledCount = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'cancelled'").get().c;
  const inquiriesCount = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status IN ('archived', 'lost', 'expired')").get().c;

  if (tab === 'inquiries') {
    const total = inquiriesCount;
    const rows = db.prepare(`
      SELECT i.id, i.client_name, i.client_phone, i.client_email, i.university, i.graduation_date, i.location,
             i.status, i.notes, i.transport_charge, i.created_at, i.updated_at,
             p.name as package_name, p.price as package_price,
             (SELECT token FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as booking_token,
             (SELECT expires_at FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as token_expires_at,
             (SELECT used FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as token_used
      FROM inquiries i
      LEFT JOIN packages p ON i.package_id = p.id
      WHERE i.status IN ('archived', 'lost', 'expired')
      ORDER BY i.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return res.json({
      data: rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      completedCount,
      cancelledCount,
      inquiriesCount
    });
  }

  let where;
  if (tab === 'cancelled') {
    where = "b.status = 'cancelled'";
  } else {
    where = "b.status = 'completed'";
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM bookings b WHERE ${where}`).get().c;

  const rows = db.prepare(`
    SELECT b.id, b.client_name, b.client_phone, b.client_email, b.university, b.graduation_date, b.location,
           b.total_price, b.dp_amount, b.balance_amount, b.dp_status, b.balance_status, b.status,
           b.shooting_time, b.duration_hours,
           b.dp_bukti_url, b.balance_bukti_url,
           b.download_url, b.tracking_token, b.final_invoice_url,
           b.drive_parent_url, b.drive_cleanup_status, b.drive_expiry_date,
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
    ensureBookingToken(r, db);
    r.fg_payout_status = r.fg_id ? (r.payout_status === 'paid' ? 'paid' : 'unpaid') : 'none';
    if (r.status === 'completed' && !r.final_invoice_url) {
      try {
        r.final_invoice_url = saveFinalInvoiceSnapshot(r, db);
      } catch (err) { }
    }
  });

  res.json({
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
    completedCount,
    cancelledCount,
    inquiriesCount
  });
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
  const quoted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status IN ('booking_link_active', 'quoted')").get().c;
  const booked = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'converted' OR EXISTS (SELECT 1 FROM bookings WHERE bookings.inquiry_id = inquiries.id AND bookings.dp_status = 'paid')").get().c;
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

// ============ REPORTS ANALYTICS ============
router.get('/reports/analytics', (req, res) => {
  try {
    // 1. Top Locations (case-insensitive grouped, capitalized)
    const locations = db.prepare(`
      SELECT LOWER(TRIM(location)) as name, COUNT(*) as count
      FROM bookings
      WHERE location IS NOT NULL AND location != '' AND status != 'cancelled'
      GROUP BY name ORDER BY count DESC LIMIT 5
    `).all();
    locations.forEach(l => {
      l.name = l.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    });

    // 2. Top Universities
    const universities = db.prepare(`
      SELECT TRIM(university) as name, COUNT(*) as count
      FROM bookings
      WHERE university IS NOT NULL AND university != '' AND status != 'cancelled'
      GROUP BY name ORDER BY count DESC LIMIT 5
    `).all();

    // 3. Hours Distribution (based on HH:MM strings)
    const hours = db.prepare(`
      SELECT SUBSTR(TRIM(shooting_time), 1, 2) as hr, COUNT(*) as count
      FROM bookings
      WHERE shooting_time IS NOT NULL AND shooting_time != '' AND status != 'cancelled'
      GROUP BY hr ORDER BY hr ASC
    `).all();

    // 4. Monthly Trend (last 6 months)
    const trend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM bookings
      WHERE status != 'cancelled' AND created_at IS NOT NULL
      GROUP BY month ORDER BY month DESC LIMIT 6
    `).all();
    trend.reverse();

    res.json({ locations, universities, hours, trend });
  } catch (err) {
    console.error('Failed to load reports analytics:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// ============ REPORTS: DRIVE STORAGE & PHOTO ASSET ANALYTICS ============
router.get('/reports/storage', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT b.id, b.client_name, b.university, b.graduation_date, b.shooting_time, b.status,
             COALESCE(b.staged_photo_count, 0) as jpg_count,
             COALESCE(b.highlight_photo_count, 0) as highlight_count,
             COALESCE(b.final_photo_count, 0) as final_count,
             (COALESCE(b.staged_photo_count, 0) + COALESCE(b.highlight_photo_count, 0) + COALESCE(b.final_photo_count, 0)) as total_photos,
             COALESCE(b.drive_total_bytes, 0) as total_bytes,
             b.drive_parent_url, b.drive_expiry_date, b.drive_cleanup_status
      FROM bookings b
      WHERE b.status != 'cancelled'
      ORDER BY date(COALESCE(b.graduation_date, b.created_at)) ASC, b.id ASC
    `).all();

    let totalJpg = 0;
    let totalHighlight = 0;
    let totalFinal = 0;
    let totalAllPhotos = 0;
    let totalDriveBytes = 0;

    clients.forEach(c => {
      totalJpg += c.jpg_count;
      totalHighlight += c.highlight_count;
      totalFinal += c.final_count;
      totalAllPhotos += c.total_photos;
      const estBytes = c.total_bytes > 0 ? c.total_bytes : ((c.jpg_count * 3.5 + c.highlight_count * 4.0 + c.final_count * 5.0) * 1024 * 1024);
      totalDriveBytes += estBytes;
      c.formatted_size = (estBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      if (estBytes < 1024 * 1024 * 1024) {
        c.formatted_size = (estBytes / (1024 * 1024)).toFixed(1) + ' MB';
      }
    });

    const totalDriveGB = (totalDriveBytes / (1024 * 1024 * 1024)).toFixed(2);
    const avgPhotosPerClient = clients.length > 0 ? Math.round(totalAllPhotos / clients.length) : 0;
    const avgJpgPerClient = clients.length > 0 ? Math.round(totalJpg / clients.length) : 0;
    const selectionRate = totalJpg > 0 ? ((totalFinal / totalJpg) * 100).toFixed(1) : '0.0';

    // Client timeline points for Line Chart
    const clientTimeline = clients.map(c => ({
      id: c.id,
      client_name: c.client_name,
      short_name: c.client_name.split(' ')[0],
      graduation_date: c.graduation_date || '-',
      shooting_time: c.shooting_time || '-',
      university: c.university || '-',
      jpg_count: c.jpg_count,
      highlight_count: c.highlight_count,
      final_count: c.final_count,
      total_photos: c.total_photos,
      formatted_size: c.formatted_size
    }));

    // Weekly aggregate timeline
    const weeklyTimeline = db.prepare(`
      SELECT strftime('%Y-W%W', COALESCE(graduation_date, created_at)) as week_key,
             COUNT(*) as client_count,
             COALESCE(SUM(staged_photo_count), 0) as total_jpg,
             COALESCE(SUM(highlight_photo_count), 0) as total_highlight,
             COALESCE(SUM(final_photo_count), 0) as total_final,
             (COALESCE(SUM(staged_photo_count), 0) + COALESCE(SUM(highlight_photo_count), 0) + COALESCE(SUM(final_photo_count), 0)) as total_photos
      FROM bookings
      WHERE status != 'cancelled'
      GROUP BY week_key
      ORDER BY week_key ASC LIMIT 12
    `).all();

    // Monthly aggregate timeline
    const monthlyTimeline = db.prepare(`
      SELECT strftime('%Y-%m', COALESCE(graduation_date, created_at)) as month_key,
             COUNT(*) as client_count,
             COALESCE(SUM(staged_photo_count), 0) as total_jpg,
             COALESCE(SUM(highlight_photo_count), 0) as total_highlight,
             COALESCE(SUM(final_photo_count), 0) as total_final,
             (COALESCE(SUM(staged_photo_count), 0) + COALESCE(SUM(highlight_photo_count), 0) + COALESCE(SUM(final_photo_count), 0)) as total_photos
      FROM bookings
      WHERE status != 'cancelled'
      GROUP BY month_key
      ORDER BY month_key ASC LIMIT 12
    `).all();

    res.json({
      summary: {
        total_clients: clients.length,
        total_all_photos: totalAllPhotos,
        total_jpg: totalJpg,
        total_highlight: totalHighlight,
        total_final: totalFinal,
        total_drive_gb: totalDriveGB,
        avg_photos_per_client: avgPhotosPerClient,
        avg_jpg_per_client: avgJpgPerClient,
        selection_rate: selectionRate
      },
      client_timeline: clientTimeline,
      weekly_timeline: weeklyTimeline,
      monthly_timeline: monthlyTimeline,
      clients_list: clients
    });
  } catch (err) {
    console.error('Failed to load storage report:', err);
    res.status(500).json({ error: 'Failed to load storage analytics' });
  }
});

// ============ SYSTEM HARD RESET ============
router.post('/system/reset', requireRole('superadmin', 'admin'), async (req, res) => {
  const { password, type } = req.body;

  // 1. Verify environment variable is set (fallback to 'AmsDev123' if not explicitly defined in .env)
  const envPassword = process.env.HARD_RESET_PASSWORD || 'AmsDev123';

  // 2. Verify password input matches env password
  if (password !== envPassword) {
    return res.status(400).json({ error: 'Sandi reset salah. Silakan coba lagi.' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const bcrypt = require('bcrypt');
    const config = require('../config/settings');
    const { getDefaultWaTemplates } = require('../config/wa-templates');

    // Helper to clean directory contents
    const deleteFolderContents = (dir) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          const curPath = path.join(dir, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            fs.rmSync(curPath, { recursive: true, force: true });
          } else {
            try { fs.unlinkSync(curPath); } catch (e) { }
          }
        });
      }
    };

    // 3. System Reset Complete (Zero-Local Storage)

    // 4. Clean database based on reset type
    db.transaction(() => {
      // Common tables to delete for both Type A and Type B
      db.prepare("DELETE FROM bookings").run();
      db.prepare("DELETE FROM inquiries").run();
      db.prepare("DELETE FROM assignments").run();
      db.prepare("DELETE FROM deliverables").run();
      db.prepare("DELETE FROM payouts").run();
      db.prepare("DELETE FROM fg_schedules").run();
      db.prepare("DELETE FROM booking_tokens").run();
      db.prepare("DELETE FROM notifications").run();
      db.prepare("DELETE FROM portfolio_items").run();

      // Reset auto-increment sequences
      const seqTables = ['bookings', 'inquiries', 'assignments', 'deliverables', 'payouts', 'fg_schedules', 'booking_tokens', 'notifications', 'portfolio_items'];
      seqTables.forEach(t => {
        db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(t);
      });

      if (type === 'full') {
        // Complete Factory Reset (Opsi B)
        db.prepare("DELETE FROM freelancers").run();
        db.prepare("DELETE FROM packages").run();
        db.prepare("DELETE FROM settings").run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('freelancers', 'packages', 'settings')").run();

        // Seed packages (Digital Only — Minimal Rp 500.000/jam)
        const packages = [
          { name: 'Paket Essential Digital', description: 'Sesi foto wisuda 1 jam, output digital album high-res (15 foto teredit + all raw via Google Drive)', price: 500000, fg_fee: 200000, editor_fee: 0, duration_hours: 1, max_selected_photos: 15, highlight_count: 5, includes: '{"digital_edited": 15, "digital_all": true, "google_drive_link": true, "output": "digital_only"}', sort_order: 1 },
          { name: 'Paket Signature Digital', description: 'Sesi foto wisuda 2 jam (wisudawan + keluarga), output digital album high-res (35 foto teredit + all master files)', price: 1000000, fg_fee: 400000, editor_fee: 0, duration_hours: 2, max_selected_photos: 35, highlight_count: 10, includes: '{"digital_edited": 35, "digital_all": true, "google_drive_link": true, "output": "digital_only"}', sort_order: 2 },
          { name: 'Paket Ultimate Digital Group', description: 'Full coverage wisuda 3 jam (grup/alumni/keluarga), output digital album high-res (60 foto teredit + all master files)', price: 1500000, fg_fee: 600000, editor_fee: 100000, duration_hours: 3, max_selected_photos: 60, highlight_count: 15, includes: '{"digital_edited": 60, "digital_all": true, "google_drive_link": true, "output": "digital_only"}', sort_order: 3 },
        ];
        const packageStmt = db.prepare('INSERT INTO packages (name, description, price, fg_fee, editor_fee, duration_hours, max_selected_photos, highlight_count, includes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        packages.forEach(p => {
          packageStmt.run(p.name, p.description, p.price, p.fg_fee, p.editor_fee || 0, p.duration_hours, p.max_selected_photos, p.highlight_count, p.includes, p.sort_order);
        });

        // Seed WA templates
        const defaults = getDefaultWaTemplates();
        db.prepare("INSERT INTO settings (key, value, description) VALUES (?, ?, ?)")
          .run('wa_templates', JSON.stringify(defaults), 'WA message templates');

        // Seed adminPhone setting
        db.prepare("INSERT INTO settings (key, value, description) VALUES (?, ?, ?)")
          .run('adminPhone', '', 'Admin phone for WA notifications');

        // Reset non-admin users, and reset admin password to admin123
        db.prepare("DELETE FROM users WHERE username != 'admin'").run();
        const hash = bcrypt.hashSync('admin123', 12);
        db.prepare("UPDATE users SET password_hash = ? WHERE username = 'admin'").run(hash);
      }
    })();

    res.json({ success: true, message: type === 'full' ? 'Sistem berhasil di-reset total ke setelan bawaan pabrik.' : 'Data transaksi dan media berhasil dibersihkan.' });
  } catch (err) {
    console.error('System reset error:', err);
    res.status(500).json({ error: 'Gagal melakukan reset sistem. Hubungi administrator.' });
  }
});

// ============ FREELANCE RECRUITMENT OPERATIONS ============
router.get('/recruitment/applications', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM freelancer_applications ORDER BY created_at DESC').all();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil data pendaftaran: ' + e.message });
  }
});

router.patch('/recruitment/applications/:id/status', [
  param('id').isInt({ min: 1 }),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('default_rate').optional().isInt({ min: 0 }),
  body('reviewer_notes').optional().trim(),
  handleValidation
], (req, res) => {
  const { id } = req.params;
  const { status, default_rate, reviewer_notes } = req.body;
  const userId = req.session.userId;

  const app = db.prepare('SELECT * FROM freelancer_applications WHERE id = ?').get(id);
  if (!app) return res.status(404).json({ error: 'Data pendaftaran tidak ditemukan' });
  if (app.status !== 'pending') return res.status(400).json({ error: 'Pendaftaran ini sudah diproses sebelumnya' });

  const templates = getWaTemplates();
  const settings = getSettings();
  const companyName = settings.company_name || settings.companyName || 'Studio';

  const transaction = db.transaction(() => {
    // Update application status
    db.prepare(`
      UPDATE freelancer_applications 
      SET status = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, reviewer_notes || null, userId || null, id);

    let waLink = '';
    let accessCode = '';

    if (status === 'approved') {
      // Periksa apakah nomor handphone sudah terdaftar di freelancers
      const existingFg = db.prepare('SELECT id FROM freelancers WHERE phone = ?').get(app.phone);
      if (existingFg) {
        throw new Error('Nomor WhatsApp ini sudah terdaftar sebagai freelancer aktif.');
      }

      // Generate access code
      const crypto = require('crypto');
      accessCode = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();

      // Copy data to freelancers table
      db.prepare(`
        INSERT INTO freelancers (name, phone, email, portfolio_url, specialties, city, default_rate, access_code, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        app.name,
        app.phone,
        app.email || null,
        app.portfolio_url,
        app.specialties,
        app.city,
        default_rate || 0,
        accessCode
      );

      // Generate WhatsApp link for Approval
      const portalUrl = `${getBaseUrl(req)}/freelance-portal.html?code=${accessCode}`;
      let waMessage = (templates.fg_recruitment_approved || "Selamat! Pendaftaran Anda sebagai partner freelance di {company_name} telah DISETUJUI. Domisili: {city}.\n\nSilakan akses Portal Freelance Anda melalui link berikut:\n{portal_url}\n\nKode Akses Anda: {access_code}")
        .replace(/{company_name}/g, companyName)
        .replace(/{city}/g, app.city)
        .replace(/{portal_url}/g, portalUrl)
        .replace(/{access_code}/g, accessCode);

      waLink = `https://api.whatsapp.com/send?phone=${app.phone}&text=${encodeURIComponent(waMessage)}`;

      // Send official approval email to Freelancer
      if (app.email) {
        try {
          const emailService = require('../services/email.service');
          emailService.sendFreelancerApprovalEmail({
            name: app.name,
            email: app.email,
            accessCode,
            portalUrl,
            city: app.city,
            defaultRate: default_rate || 0
          }).catch(err => {
            console.warn('[FreelancerApproveEmail Warn]:', err.message);
          });
        } catch (e) {}
      }
    } else {
      // Generate WhatsApp link for Rejection
      let specs = [];
      try { specs = JSON.parse(app.specialties); } catch { specs = []; }
      const mainSpec = specs.join('/') || 'Freelancer';

      let waMessage = (templates.fg_recruitment_rejected || "Halo {client_name},\n\nTerima kasih atas ketertarikan Anda untuk bergabung sebagai partner freelance di {company_name}.\n\nSaat ini kuota pendaftaran untuk spesialisasi {specialty} di domisili {city} sedang penuh. Kami akan menyimpan data portofolio Anda dan menghubungi Anda jika ada kebutuhan di masa mendatang.")
        .replace(/{client_name}/g, app.name)
        .replace(/{company_name}/g, companyName)
        .replace(/{specialty}/g, mainSpec)
        .replace(/{city}/g, app.city);

      waLink = `https://api.whatsapp.com/send?phone=${app.phone}&text=${encodeURIComponent(waMessage)}`;

      // Send polite rejection email to applicant if email is provided
      if (app.email) {
        try {
          const emailService = require('../services/email.service');
          emailService.sendFreelancerRejectionEmail({
            name: app.name,
            email: app.email,
            city: app.city
          }).catch(err => {
            console.warn('[FreelancerRejectEmail Warn]:', err.message);
          });
        } catch (e) {}
      }
    }

    return { wa_link: waLink, access_code: accessCode };
  });

  try {
    const result = transaction();
    res.json({ success: true, message: `Pendaftaran berhasil di-${status}`, wa_link: result.wa_link, access_code: result.access_code });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ============ CRON JOB MANAGEMENT ============

/**
 * GET /api/admin/cron/status
 * Returns status & schedule info for all registered cron jobs
 */
router.get('/cron/status', requireAuth, (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const configSettings = require('../config/settings');
  const baseDir = path.dirname(configSettings.dbPath);
  const PROGRESS_PATH = path.join(baseDir, 'wisuda-builder-progress.json');
  const LOG_PATH = path.join(baseDir, 'wisuda-builder.log');

  let lastRun = null;
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      lastRun = p.lastRun || null;
    }
  } catch (e) { }

  let logSize = 0;
  let logModified = null;
  try {
    if (fs.existsSync(LOG_PATH)) {
      const stats = fs.statSync(LOG_PATH);
      logSize = stats.size;
      logModified = stats.mtime.toISOString();
    }
  } catch (e) { }

  // Count pending retention bookings
  let pendingRetention = 0;
  let retentionH14 = 0;
  let retentionH3 = 0;
  let retentionTrashed = 0;
  try {
    pendingRetention = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_parent_url IS NOT NULL AND (drive_cleanup_status IS NULL OR drive_cleanup_status NOT IN ('trashed'))").get()?.c || 0;
    retentionH14 = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_cleanup_status = 'reminded_h14'").get()?.c || 0;
    retentionH3 = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_cleanup_status = 'reminded_h3'").get()?.c || 0;
    retentionTrashed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_cleanup_status = 'trashed'").get()?.c || 0;
  } catch (e) { }

  // Fetch dynamic settings for cron schedules & parameters
  const settings = getSettings();
  const reminder1Days = parseInt(settings.reminder_1_days || '3', 10);
  const reminder2Days = parseInt(settings.reminder_2_days || '1', 10);
  const reminderH3Time = settings.reminder_h3_time || '09:00';
  const reminderH1Time = settings.reminder_h1_time || '08:00';
  const autoApproveHours = parseInt(settings.auto_approve_hours || '48', 10);
  const dpExpiredDays = parseInt(settings.dp_expired_days || '7', 10);
  const driveRetentionMonths = parseInt(settings.drive_retention_months || '3', 10);
  const driveRetentionHour = settings.drive_retention_hour || '02:00';
  const dbMaintenanceHour = settings.db_maintenance_hour || '03:00';

  // Count assignments for reminder dynamically
  let upcomingH3 = 0;
  let upcomingH1 = 0;
  try {
    const todayPlusR1 = new Date(); todayPlusR1.setDate(todayPlusR1.getDate() + reminder1Days);
    const todayPlusR2 = new Date(); todayPlusR2.setDate(todayPlusR2.getDate() + reminder2Days);
    const fmtR1 = todayPlusR1.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    const fmtR2 = todayPlusR2.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    upcomingH3 = db.prepare("SELECT COUNT(*) as c FROM assignments a JOIN bookings b ON a.booking_id = b.id WHERE a.status IN ('assigned','confirmed') AND date(b.graduation_date) = date(?)").get(fmtR1)?.c || 0;
    upcomingH1 = db.prepare("SELECT COUNT(*) as c FROM assignments a JOIN bookings b ON a.booking_id = b.id WHERE a.status IN ('assigned','confirmed') AND date(b.graduation_date) = date(?)").get(fmtR2)?.c || 0;
  } catch (e) { }

  // Count pending auto-approve
  let pendingAutoApprove = 0;
  try {
    pendingAutoApprove = db.prepare(`SELECT COUNT(*) as c FROM deliverables d JOIN assignments a ON d.assignment_id = a.id WHERE d.client_approved = 0 AND d.delivered_at IS NOT NULL AND datetime(d.delivered_at, '+' || ? || ' hours') <= datetime('now')`).get(autoApproveHours)?.c || 0;
  } catch (e) { }

  // Count pending payouts
  let pendingPayouts = 0;
  try {
    const periodEnd = new Date().toISOString().split('T')[0];
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    pendingPayouts = db.prepare(`SELECT COUNT(*) as c FROM assignments a JOIN bookings b ON a.booking_id = b.id WHERE a.status = 'done' AND b.status = 'completed' AND date(a.updated_at) BETWEEN date(?) AND date(?) AND NOT EXISTS (SELECT 1 FROM payouts WHERE assignment_id = a.id)`).get(periodStart, periodEnd)?.c || 0;
  } catch (e) { }

  // Count past event inquiries to auto-archive
  let expiredInquiries = 0;
  try {
    expiredInquiries = db.prepare(`
      SELECT COUNT(*) as c FROM inquiries
      WHERE status IN ('new', 'booking_link_active', 'quoted', 'expired')
        AND date(graduation_date) < date('now', 'localtime')
    `).get()?.c || 0;
  } catch (e) { }

  const inquiryReminderDays = parseInt(settings.inquiry_reminder_days || '7', 10);
  const inquiryReminderTime = settings.inquiry_reminder_time || '09:00';

  // Count pending inquiry follow-up reminders
  let pendingInquiryReminders = 0;
  try {
    const inqTargetDate = new Date(); inqTargetDate.setDate(inqTargetDate.getDate() + inquiryReminderDays);
    const fmtInqTarget = inqTargetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    pendingInquiryReminders = db.prepare(`
      SELECT COUNT(*) as c FROM inquiries
      WHERE status IN ('new', 'booking_link_active', 'quoted')
        AND date(graduation_date) = date(?)
        AND client_email IS NOT NULL AND TRIM(client_email) != ''
        AND reminded_inquiry_at IS NULL
    `).get(fmtInqTarget)?.c || 0;
  } catch (e) { }

  const jobs = [
    {
      id: 'inquiry_reminder',
      name: `Follow-Up Email Inquiry (H-${inquiryReminderDays})`,
      icon: '🎓',
      description: `Kirim email pengingat otomatis ke calon klien yang belum booking ${inquiryReminderDays} hari sebelum tanggal wisuda`,
      schedule: `Setiap hari jam ${inquiryReminderTime} WITA`,
      cron: `0 ${parseInt(inquiryReminderTime.split(':')[0], 10)} * * *`,
      category: 'email',
      config_key: 'inquiry_reminder_time',
      config_value: inquiryReminderTime,
      config_days_key: 'inquiry_reminder_days',
      config_days_value: inquiryReminderDays,
      config_type: 'time',
      pendingCount: pendingInquiryReminders,
      pendingLabel: pendingInquiryReminders > 0 ? `${pendingInquiryReminders} calon wisudawan H-${inquiryReminderDays}` : `Tidak ada inquiry H-${inquiryReminderDays}`,
    },
    {
      id: 'reminder_h3',
      name: `Pengingat H-${reminder1Days} (Briefing & Penugasan FG)`,
      icon: '📅',
      description: `Kirim WA & Email reminder otomatis ke Klien (jadwal, penugasan FG, moodboard, tracking) & Fotografer ${reminder1Days} hari sebelum pemotretan`,
      schedule: `Setiap hari jam ${reminderH3Time} WITA`,
      cron: `0 ${parseInt(reminderH3Time.split(':')[0], 10)} * * *`,
      category: 'notification',
      config_key: 'reminder_h3_time',
      config_value: reminderH3Time,
      config_days_key: 'reminder_1_days',
      config_days_value: reminder1Days,
      config_type: 'time',
      pendingCount: upcomingH3,
      pendingLabel: upcomingH3 > 0 ? `${upcomingH3} assignment H-${reminder1Days}` : `Tidak ada jadwal H-${reminder1Days}`,
    },
    {
      id: 'reminder_h1',
      name: `Pengingat H-${reminder2Days} (Final Call & Kontak FG)`,
      icon: '⏰',
      description: `Kirim WA & Email reminder otomatis ke Klien (jadwal besok, kontak WA fotografer) & Fotografer (checklist gear) ${reminder2Days} hari sebelum pemotretan`,
      schedule: `Setiap hari jam ${reminderH1Time} WITA`,
      cron: `0 ${parseInt(reminderH1Time.split(':')[0], 10)} * * *`,
      category: 'notification',
      config_key: 'reminder_h1_time',
      config_value: reminderH1Time,
      config_days_key: 'reminder_2_days',
      config_days_value: reminder2Days,
      config_type: 'time',
      pendingCount: upcomingH1,
      pendingLabel: upcomingH1 > 0 ? `${upcomingH1} assignment H-${reminder2Days}` : `Tidak ada jadwal H-${reminder2Days}`,
    },
    {
      id: 'auto_approve',
      name: 'Auto-Approve Pengiriman Hasil',
      icon: '✅',
      description: `Otomatis approve deliverable yang belum dikonfirmasi klien setelah ${autoApproveHours} jam dari waktu pengiriman`,
      schedule: 'Setiap jam (Hourly)',
      cron: '0 * * * *',
      category: 'automation',
      config_key: 'auto_approve_hours',
      config_value: autoApproveHours,
      config_type: 'number',
      pendingCount: pendingAutoApprove,
      pendingLabel: pendingAutoApprove > 0 ? `${pendingAutoApprove} deliverable siap di-approve` : 'Tidak ada yang perlu di-approve',
    },
    {
      id: 'dp_expired',
      name: 'Auto-Arsip Jadwal Wisuda Lewat',
      icon: '🗓️',
      description: 'Otomatis memindahkan calon klien yang tanggal wisudanya sudah lewat ke "Arsip Batal" jika belum menyelesaikan booking.',
      schedule: 'Setiap hari jam 00:00 WITA',
      cron: '0 0 * * *',
      category: 'automation',
      pendingCount: expiredInquiries,
      pendingLabel: expiredInquiries > 0 ? `${expiredInquiries} inquiry lewat tanggal wisuda` : 'Tidak ada jadwal wisuda lewat',
    },
    {
      id: 'payout_run',
      name: 'Proses Payout Mingguan Fotografer',
      icon: '💰',
      description: 'Buat catatan payout otomatis untuk assignment yang sudah selesai & booking completed dalam 7 hari terakhir',
      schedule: 'Setiap Minggu jam 20:00 WITA',
      cron: '0 20 * * 0',
      category: 'finance',
      pendingCount: pendingPayouts,
      pendingLabel: pendingPayouts > 0 ? `${pendingPayouts} payout siap diproses` : 'Tidak ada payout minggu ini',
    },
    {
      id: 'drive_retention',
      name: 'Pembersihan Folder Google Drive',
      icon: '📁',
      description: `Kirim reminder WA & Email H-14 & H-3 ke klien untuk mengamankan & unduh file master, dan bersihkan folder yang sudah expired (${driveRetentionMonths} bulan retensi)`,
      schedule: `Setiap hari jam ${driveRetentionHour} WITA`,
      cron: `0 ${parseInt(driveRetentionHour.split(':')[0], 10)} * * *`,
      category: 'storage',
      config_key: 'drive_retention_hour',
      config_value: driveRetentionHour,
      config_type: 'time',
      pendingCount: pendingRetention,
      pendingLabel: `Active: ${pendingRetention} | H-14: ${retentionH14} | H-3: ${retentionH3} | Trashed: ${retentionTrashed}`,
    },
    {
      id: 'db_maintenance',
      name: 'Pemeliharaan Database (Maintenance)',
      icon: '🛠️',
      description: 'Bersihkan notifikasi lama (>90 hari), token booking kadaluarsa, data proses booking lama (>30 hari), dan optimasi index database',
      schedule: `Setiap hari jam ${dbMaintenanceHour} WITA`,
      cron: `0 ${parseInt(dbMaintenanceHour.split(':')[0], 10)} * * *`,
      category: 'maintenance',
      config_key: 'db_maintenance_hour',
      config_value: dbMaintenanceHour,
      config_type: 'time',
      pendingCount: null,
      pendingLabel: 'Database terindeks & optimal',
    }
  ];

  res.json({
    jobs,
    log_size_kb: Math.round(logSize / 1024),
    log_modified: logModified,
    last_builder_run: lastRun,
  });
});

/**
 * GET /api/admin/cron/log
 * Returns last N lines of the cron log file
 */
router.get('/cron/log', requireAuth, (req, res) => {
  const pathLib = require('path');
  const fs = require('fs');
  const configSettings = require('../config/settings');
  const baseDir = pathLib.dirname(configSettings.dbPath);
  const LOG_PATH = pathLib.join(baseDir, 'wisuda-builder.log');
  const lines = parseInt(req.query.lines || 100);

  if (!fs.existsSync(LOG_PATH)) {
    return res.json({ log: '', lines: 0 });
  }

  try {
    const content = fs.readFileSync(LOG_PATH, 'utf8');
    const allLines = content.split('\n').filter(Boolean);
    const tail = allLines.slice(-Math.min(lines, 500));
    res.json({ log: tail.join('\n'), lines: tail.length, total_lines: allLines.length });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membaca log: ' + e.message });
  }
});

/**
 * POST /api/admin/cron/config
 * Save dynamic schedule/parameter for a cron job
 */
router.post('/cron/config', requireAuth, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key pengaturan wajib diisi' });
    setSetting(key, String(value), 'Pengaturan jam/parameter otomatisasi cron job');
    res.json({
      success: true,
      message: `Pengaturan ${key} berhasil diperbarui menjadi: ${value}`,
      key,
      value
    });
  } catch (err) {
    res.status(400).json({ error: 'Gagal menyimpan pengaturan cron: ' + err.message });
  }
});

/**
 * POST /api/admin/cron/trigger/:jobId
 * Manually trigger a specific cron job
 */
router.post('/cron/trigger/:jobId', requireAuth, async (req, res) => {
  const { jobId } = req.params;
  const allowedJobs = ['inquiry_reminder', 'reminder_h3', 'reminder_h1', 'auto_approve', 'dp_expired', 'payout_run', 'backup_db', 'drive_retention', 'db_maintenance', 'stale_import'];

  if (!allowedJobs.includes(jobId)) {
    return res.status(400).json({ error: 'Job ID tidak valid' });
  }

  try {
    const cronService = require('../services/cron.service');
    const { formatCurrency, formatDate } = require('../utils/currency');
    const pathLib = require('path');
    const fs = require('fs');
    const configSettings = require('../config/settings');
    const baseDir = pathLib.dirname(configSettings.dbPath);
    const LOG_PATH = pathLib.join(baseDir, 'wisuda-builder.log');

    function appendLog(msg) {
      const timestamp = new Date().toISOString();
      const line = `[${timestamp}] [MANUAL] ${msg}\n`;
      try { fs.appendFileSync(LOG_PATH, line); } catch (e) { }
      console.log(line.trim());
    }

    appendLog(`Admin manually triggered job: ${jobId}`);

    switch (jobId) {
      case 'inquiry_reminder': {
        const result = await cronService.runInquiryFollowUpReminder();
        appendLog(`Inquiry Reminder: ${result.sentCount || 0} emails sent from ${result.totalCandidates || 0} candidates`);
        return res.json({ 
          success: true, 
          message: `Pengingat email inquiry selesai: ${result.sentCount || 0} email terkirim`, 
          sent: result.sentCount || 0,
          total: result.totalCandidates || 0 
        });
      }
      case 'reminder_h3': {
        const { getLocalDateStr } = { getLocalDateStr: (n) => { const d = new Date(); if (n) d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); } };
        const targetDate = getLocalDateStr(3);
        const assignments = db.prepare(`SELECT a.*, b.client_name, b.client_phone, b.graduation_date, b.shooting_time, b.location, f.name as fg_name, f.phone as fg_phone FROM assignments a JOIN bookings b ON a.booking_id = b.id LEFT JOIN freelancers f ON a.fg_id = f.id WHERE a.status IN ('assigned', 'confirmed') AND date(b.graduation_date) = date(?)`).all(targetDate);
        appendLog(`H-3 Reminder: found ${assignments.length} assignments for ${targetDate}`);
        return res.json({ success: true, message: `H-3 Reminder: ditemukan ${assignments.length} assignment untuk tanggal ${targetDate}`, details: assignments.map(a => ({ id: a.id, client: a.client_name, fg: a.fg_name })) });
      }
      case 'reminder_h1': {
        const getLocalDateStr = (n) => { const d = new Date(); if (n) d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); };
        const targetDate = getLocalDateStr(1);
        const assignments = db.prepare(`SELECT a.*, b.client_name, b.client_phone, b.graduation_date, b.shooting_time, b.location, f.name as fg_name, f.phone as fg_phone FROM assignments a JOIN bookings b ON a.booking_id = b.id LEFT JOIN freelancers f ON a.fg_id = f.id WHERE a.status IN ('assigned', 'confirmed') AND date(b.graduation_date) = date(?)`).all(targetDate);
        appendLog(`H-1 Reminder: found ${assignments.length} assignments for ${targetDate}`);
        return res.json({ success: true, message: `H-1 Reminder: ditemukan ${assignments.length} assignment untuk tanggal ${targetDate}`, details: assignments.map(a => ({ id: a.id, client: a.client_name, fg: a.fg_name })) });
      }
      case 'auto_approve': {
        const settings = getSettings();
        const autoApproveHours = parseInt(settings.auto_approve_hours || 48);
        const deliverables = db.prepare(`SELECT d.*, a.booking_id, b.client_name FROM deliverables d JOIN assignments a ON d.assignment_id = a.id JOIN bookings b ON a.booking_id = b.id WHERE d.client_approved = 0 AND d.delivered_at IS NOT NULL AND datetime(d.delivered_at, '+' || ? || ' hours') <= datetime('now')`).all(autoApproveHours);
        let approved = 0;
        for (const d of deliverables) {
          db.prepare('UPDATE deliverables SET client_approved = 1, client_approved_at = CURRENT_TIMESTAMP WHERE id = ?').run(d.id);
          db.prepare("UPDATE bookings SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(d.booking_id);
          approved++;
        }
        appendLog(`Auto-approve: ${approved} deliverable approved`);
        return res.json({ success: true, message: `Auto-approve selesai: ${approved} deliverable di-approve`, approved });
      }
      case 'dp_expired': {
        const getLocalDateStr = (n) => { const d = new Date(); if (n) d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); };
        const cutoffDate = getLocalDateStr(-7);
        const inquiries = db.prepare("SELECT * FROM inquiries WHERE status IN ('booking_link_active') AND date(created_at) < date(?)").all(cutoffDate);
        for (const i of inquiries) {
          db.prepare("UPDATE inquiries SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(i.id);
        }
        appendLog(`DP Expired: ${inquiries.length} inquiries expired`);
        return res.json({ success: true, message: `Pengecekan selesai: ${inquiries.length} inquiry ditandai expired`, expired: inquiries.length });
      }
      case 'payout_run': {
        const periodEnd = new Date().toISOString().split('T')[0];
        const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const assignments = db.prepare(`SELECT a.*, b.total_price, p.fg_fee as package_fg_fee, p.editor_fee as package_editor_fee, f.name as fg_name, f.phone as fg_phone, f.default_rate as fg_default_rate, COALESCE(a.fg_fee, f.default_rate, p.fg_fee, 0) as final_fg_fee FROM assignments a JOIN bookings b ON a.booking_id = b.id JOIN packages p ON b.package_id = p.id JOIN freelancers f ON a.fg_id = f.id WHERE a.status = 'done' AND date(a.updated_at) BETWEEN date(?) AND date(?) AND NOT EXISTS (SELECT 1 FROM payouts WHERE assignment_id = a.id)`).all(periodStart, periodEnd);
        let created = 0;
        for (const a of assignments) {
          const fgFee = a.final_fg_fee;
          const editorFee = a.package_editor_fee || 0;
          db.prepare(`INSERT INTO payouts (assignment_id, fg_id, fg_fee, editor_fee, total_payout, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(a.id, a.fg_id, fgFee, editorFee, fgFee + editorFee, periodStart, periodEnd);
          created++;
        }
        appendLog(`Payout run: ${created} payouts created (${periodStart} → ${periodEnd})`);
        return res.json({ success: true, message: `Payout run selesai: ${created} payout dibuat untuk periode ${periodStart} s/d ${periodEnd}`, created, period: { start: periodStart, end: periodEnd } });
      }
      case 'backup_db': {
        const dbInstance = getDb();
        const { getSetting } = require('../config/wa-templates');
        const pathLib2 = require('path');
        const fs2 = require('fs');
        const configuredPath = getSetting('backup_path', process.env.BACKUP_PATH || './DATA/backups');
        let backupDir = pathLib2.resolve(configuredPath);
        
        try {
          if (!fs2.existsSync(backupDir)) fs2.mkdirSync(backupDir, { recursive: true });
        } catch (err) {
          backupDir = pathLib2.resolve('./DATA/backups');
          if (!fs2.existsSync(backupDir)) {
            try { fs2.mkdirSync(backupDir, { recursive: true }); } catch (e) {}
          }
        }
        if (!fs2.existsSync(backupDir)) {
          backupDir = pathLib2.resolve('./DATA/backups');
          if (!fs2.existsSync(backupDir)) {
            try { fs2.mkdirSync(backupDir, { recursive: true }); } catch (e) {}
          }
        }

        const dateStr = new Date().toISOString().replace(/[-:.TZ]/g, '').substring(0, 15);
        const backupPath = pathLib2.join(backupDir, `wisuda_manual_${dateStr}.db`);
        try {
          dbInstance.pragma('wal_checkpoint(TRUNCATE)');
        } catch (e) {}
        await dbInstance.backup(backupPath);
        const stats = fs2.statSync(backupPath);
        appendLog(`Backup DB: created ${backupPath} (${Math.round(stats.size / 1024)} KB)`);
        return res.json({ 
          success: true, 
          message: `Backup berhasil: ${pathLib2.basename(backupPath)} (${Math.round(stats.size / 1024)} KB)`, 
          file: pathLib2.basename(backupPath), 
          size_kb: Math.round(stats.size / 1024),
          backup_path: backupDir
        });
      }
      case 'drive_retention': {
        appendLog('Drive Retention: starting manual run...');
        const { runDriveRetentionCleanup } = require('../services/cron.service');
        await runDriveRetentionCleanup();
        appendLog('Drive Retention: manual run completed');
        const activeCount = db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE drive_parent_url IS NOT NULL AND (drive_cleanup_status IS NULL OR drive_cleanup_status != 'trashed')").get()?.cnt || 0;
        return res.json({
          success: true,
          message: `Pengecekan retensi selesai: ${activeCount} folder Drive klien berstatus AKTIF & AMAN (belum ada folder kadaluarsa hari ini).`
        });
      }
      case 'db_maintenance': {
        const getLocalDateStr2 = (n = 0) => { const d = new Date(); if (n) d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); };
        const today = getLocalDateStr2();
        let changes = {};
        const purgedNotif = db.prepare("DELETE FROM notifications WHERE date(sent_at) < date(?, '-90 days')").run(today);
        changes.notifications = purgedNotif.changes;
        const purgedTokens = db.prepare("DELETE FROM booking_tokens WHERE (used = 1 OR expires_at < datetime(?)) AND date(created_at) < date(?, '-30 days')").run(today, today);
        changes.tokens = purgedTokens.changes;
        try {
          // M6 FIX: Status yang benar adalah 'completed' dan 'failed', bukan 'done' dan 'error'
          const purgedJobs = db.prepare("DELETE FROM portfolio_import_jobs WHERE status IN ('completed', 'failed') AND date(updated_at) < date(?, '-30 days')").run(today);
          changes.import_jobs = purgedJobs.changes;
        } catch (e) { changes.import_jobs = 0; }
        db.pragma('optimize');
        appendLog(`DB Maintenance: notif=${changes.notifications}, tokens=${changes.tokens}, import_jobs=${changes.import_jobs}`);
        return res.json({ success: true, message: `Maintenance selesai`, changes });
      }
      case 'stale_import': {
        const driveImporter = require('../services/drive-importer.service');
        driveImporter.cleanStaleImportingBookings();
        appendLog('Stale import cleanup: done');
        return res.json({ success: true, message: 'Cleanup import macet selesai dijalankan.' });
      }
      default:
        return res.status(400).json({ error: 'Job tidak dikenali' });
    }
  } catch (err) {
    console.error(`[CronTrigger] Error running job ${jobId}:`, err);
    res.status(500).json({ error: `Gagal menjalankan job: ${err.message}` });
  }
});

// ============ ADMIN NOTIFICATIONS ============
router.get('/notifications', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, type, title, message, data, read, sent_at 
      FROM notifications 
      WHERE user_type = 'admin' 
      ORDER BY id DESC 
      LIMIT 30
    `).all();

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_type = 'admin' AND (read = 0 OR read IS NULL)
    `).get().count;

    const notifications = rows.map(r => {
      let parsedData = null;
      try { parsedData = typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch (e) {}
      return { ...r, data: parsedData };
    });

    res.json({ success: true, unread_count: unreadCount, notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/:id/read', (req, res) => {
  try {
    db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/read-all', (req, res) => {
  try {
    db.prepare("UPDATE notifications SET read = 1 WHERE user_type = 'admin'").run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;