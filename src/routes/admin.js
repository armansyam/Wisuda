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

/**
 * Helper: Hapus thumbnail cache galeri (proxy disk cache) dari VPS untuk booking tertentu.
 * Cache ini adalah salinan thumbnail kecil dari Google Drive CDN, dipakai untuk Galeri Seleksi.
 * Dipanggil di setiap tahap di mana galeri sudah tidak diperlukan lagi.
 */
function clearGalleryCache(bookingId) {
  try {
    const booking = db.prepare('SELECT staging_files FROM bookings WHERE id = ?').get(bookingId);
    if (!booking?.staging_files) return;
    const stagingFiles = JSON.parse(booking.staging_files || '[]');
    const activeUpload = getSetting('upload_path', config.uploadPath);
    const cacheDir = path.join(activeUpload, 'gallery_cache');
    stagingFiles.forEach(f => {
      try {
        const cachePath = path.join(cacheDir, `${f.fileId}.jpg`);
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      } catch (e) {
        console.warn(`[GalleryCache] Gagal hapus cache file ${f.fileId}:`, e.message);
      }
    });
  } catch (e) {
    console.warn(`[GalleryCache] Gagal clear cache untuk Booking #${bookingId}:`, e.message);
  }
}

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
    const firstDayPrev = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
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
    stats.inquiries_quoted = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status='booking_link_active'").get().c;
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
    db.prepare("SELECT 'booking_new' as type, id, client_name, status, created_at FROM bookings ORDER BY updated_at DESC LIMIT 4").all().forEach(r => recent.push(r));
    db.prepare("SELECT 'payment' as type, id, client_name, CASE WHEN dp_status='paid' THEN 'dp_paid' WHEN balance_status='paid' THEN 'balance_paid' ELSE status END as status, updated_at as created_at FROM bookings WHERE dp_status IN ('paid','uploaded') OR balance_status IN ('paid','uploaded') ORDER BY updated_at DESC LIMIT 4").all().forEach(p => recent.push(p));
    db.prepare("SELECT 'deliver' as type, id, client_name, status, updated_at as created_at FROM bookings WHERE status IN ('delivered','completed') ORDER BY updated_at DESC LIMIT 4").all().forEach(d => recent.push(d));
    recent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
      SELECT COALESCE(SUM(total_payout),0) as t FROM payouts WHERE status='pending'
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
        waLinkClient = generateWaLink(a.client_phone, 'reminder_h3_client', {
          client_name: a.client_name,
          shooting_time: a.shooting_time || '-',
          location: a.location || '-',
          fg_name: a.fg_name || '-',
          fg_phone: a.fg_phone || '-'
        });
        if (diffDays === 1) waLinkClient = waLinkClient.replace(/H-3/g, 'H-1');
        if (diffDays === 2) waLinkClient = waLinkClient.replace(/H-3/g, 'H-2');
        if (diffDays === 0) waLinkClient = waLinkClient.replace(/H-3/g, 'Hari H');
      }

      // Generate FG link
      let waLinkFg = '';
      if (a.fg_phone) {
        waLinkFg = generateWaLink(a.fg_phone, 'reminder_h3_fg', {
          client_name: a.client_name,
          location: a.location || '-',
          shooting_time: a.shooting_time || '-',
          brief: a.brief || '-',
          admin_phone: settings.admin_phone || settings.adminPhone || ''
        });
        if (diffDays === 1) waLinkFg = waLinkFg.replace(/H-3/g, 'H-1');
        if (diffDays === 2) waLinkFg = waLinkFg.replace(/H-3/g, 'H-2');
        if (diffDays === 0) waLinkFg = waLinkFg.replace(/H-3/g, 'Hari H');
      }

      reminders.push({
        booking_id: a.booking_id,
        client_name: a.client_name,
        client_phone: a.client_phone,
        university: a.university || '-',
        graduation_date: a.graduation_date,
        shooting_time: a.shooting_time || '-',
        location: a.location || '-',
        fg_name: a.fg_name || '-',
        fg_phone: a.fg_phone || '-',
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

// ============ INQUIRIES ============
function checkOutsideMainArea() {
  return false;
}

router.get('/inquiries', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;

  // Auto-mark inquiries older than 15 days as 'lost'
  db.prepare(`
    UPDATE inquiries 
    SET status = 'lost', updated_at = CURRENT_TIMESTAMP 
    WHERE status IN ('new', 'converted', 'expired', 'booking_link_active')
      AND date(created_at) < date('now', '-15 days')
  `).run();

  // Tampilkan inquiry yang:
  // 1. Belum punya booking sama sekali, ATAU
  // 2. Sudah punya booking tapi dp_status masih unpaid/uploaded (belum diverifikasi admin)
  // Inquiry yang bookingnya sudah dp='paid' → sudah menjadi CLIENT, tidak tampil di sini
  let where = `(
    NOT EXISTS (SELECT 1 FROM bookings WHERE bookings.inquiry_id = i.id)
    OR EXISTS (
      SELECT 1 FROM bookings b2
      WHERE b2.inquiry_id = i.id
      AND b2.dp_status IN ('unpaid', 'uploaded')
      AND b2.status != 'cancelled'
    )
  )`;
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
           (SELECT used FROM booking_tokens WHERE inquiry_id = i.id ORDER BY id DESC LIMIT 1) as token_used,
           -- Data booking untuk badge & tombol verifikasi di halaman Inquiry
           (SELECT id FROM bookings WHERE inquiry_id = i.id AND status != 'cancelled' ORDER BY id DESC LIMIT 1) as booking_id,
           (SELECT dp_status FROM bookings WHERE inquiry_id = i.id AND status != 'cancelled' ORDER BY id DESC LIMIT 1) as booking_dp_status,
           (SELECT dp_bukti_url FROM bookings WHERE inquiry_id = i.id AND status != 'cancelled' ORDER BY id DESC LIMIT 1) as booking_dp_bukti_url,
           (SELECT dp_amount FROM bookings WHERE inquiry_id = i.id AND status != 'cancelled' ORDER BY id DESC LIMIT 1) as booking_dp_amount,
           (SELECT total_price FROM bookings WHERE inquiry_id = i.id AND status != 'cancelled' ORDER BY id DESC LIMIT 1) as booking_total_price,
           (SELECT balance_amount FROM bookings WHERE inquiry_id = i.id AND status != 'cancelled' ORDER BY id DESC LIMIT 1) as booking_balance_amount
    FROM inquiries i
    LEFT JOIN packages p ON i.package_id = p.id
    WHERE ${where}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const formattedRows = rows.map(r => ({
    ...r,
    is_outside_main_area: checkOutsideMainArea(r.location, r.university, r.city, r.ignore_transport_charge)
  }));

  res.json({ data: formattedRows, total, page, limit, totalPages: Math.ceil(total / limit) });
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
  inquiry.is_outside_main_area = checkOutsideMainArea(inquiry.location, inquiry.university, inquiry.city, inquiry.ignore_transport_charge);
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

  const waLink = `https://api.whatsapp.com/send?phone=${settings.adminPhone}&text=${encodeURIComponent(waMessage)}`;

  res.status(201).json({ ...inquiry, wa_link: waLink });
});

router.post('/inquiries/:id/status', inquiryStatusValidation, (req, res) => {
  const { status } = req.body;

  db.prepare('UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  res.json(inquiry);
});

router.post('/inquiries/:id/charge', [
  param('id').isInt({ min: 1 }),
  body('transport_charge').optional().isInt({ min: 0 }),
  body('transport_charge_notes').optional().trim(),
  body('ignore_transport_charge').optional().isInt({ min: 0, max: 1 }),
  handleValidation
], (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry tidak ditemukan' });

  const charge = req.body.transport_charge !== undefined ? parseInt(req.body.transport_charge) : (inquiry.transport_charge || 0);
  const notes = req.body.transport_charge_notes !== undefined ? req.body.transport_charge_notes : (inquiry.transport_charge_notes || '');
  const ignoreFlag = req.body.ignore_transport_charge !== undefined ? parseInt(req.body.ignore_transport_charge) : (inquiry.ignore_transport_charge || 0);

  db.prepare('UPDATE inquiries SET transport_charge = ?, transport_charge_notes = ?, ignore_transport_charge = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(charge, notes, ignoreFlag, inquiry.id);

  db.prepare('UPDATE bookings SET transport_charge = ?, transport_charge_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE inquiry_id = ?')
    .run(charge, notes, inquiry.id);

  const updated = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(inquiry.id);
  updated.is_outside_main_area = checkOutsideMainArea(updated.location, updated.university, updated.city, updated.ignore_transport_charge);
  res.json({ success: true, inquiry: updated });
});

// ── POST /inquiries/:id/create-booking-link ──────────────────────────────────
// Endpoint utama untuk Buat Link Booking Terpadu.
// Menggantikan /generate-token dan /quote yang lama.
// TIDAK membuat bookings record — hanya simpan parameter + generate token timer.
// Booking record baru dibuat saat Gate 1 (verify-dp) lulus.
router.post('/inquiries/:id/create-booking-link', [
  param('id').isInt({ min: 1 }),
  body('package_id').isInt({ min: 1 }).withMessage('Paket wajib dipilih'),
  body('payment_type').optional().isIn(['dp', 'full']),
  body('transport_charge').optional().isInt({ min: 0 }),
  body('discount_amount').optional().isInt({ min: 0 }),
  body('duration_hours').optional().isInt({ min: 1, max: 72 }),
  handleValidation
], (req, res) => {
  const { package_id, payment_type = 'dp', transport_charge = 0, discount_amount = 0, duration_hours } = req.body;

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry tidak ditemukan' });

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
  if (!pkg) return res.status(400).json({ error: 'Paket tidak valid atau tidak aktif' });

  // Generate token baru
  const token = crypto.randomBytes(16).toString('hex');
  const defaultHours = parseInt(getSetting('booking_link_expiry_hours', 3));
  const finalDurationHours = parseInt(duration_hours) || defaultHours;
  const expiresAt = new Date(Date.now() + finalDurationHours * 60 * 60 * 1000).toISOString();

  // Hitung nominal DP & pelunasan
  const dpPercentage = parseInt(getSetting('dp_percentage', 50));
  const totalPrice = pkg.price;
  let dpAmount, balanceAmount;
  if (payment_type === 'full') {
    dpAmount = totalPrice - parseInt(discount_amount || 0);
    balanceAmount = 0;
  } else {
    dpAmount = Math.round((totalPrice - parseInt(discount_amount || 0)) * dpPercentage / 100);
    balanceAmount = (totalPrice - parseInt(discount_amount || 0)) - dpAmount;
  }

  db.transaction(() => {
    // Simpan parameter link ke inquiries
    db.prepare(`
      UPDATE inquiries
      SET package_id = ?, transport_charge = ?, discount_amount = ?, payment_type = ?,
          status = 'booking_link_active', booking_link_created_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(package_id, parseInt(transport_charge), parseInt(discount_amount), payment_type, inquiry.id);

    // Hapus token lama yang belum dipakai untuk inquiry ini
    db.prepare('DELETE FROM booking_tokens WHERE inquiry_id = ? AND used = 0').run(inquiry.id);

    // Insert token baru
    db.prepare('INSERT INTO booking_tokens (inquiry_id, token, expires_at) VALUES (?, ?, ?)')
      .run(inquiry.id, token, expiresAt);
  })();

  const confirmUrl = `${getBaseUrl(req)}/confirm-booking.html?token=${token}`;
  const templates = getWaTemplates();
  const settings = getSettings();
  const companyName = settings.company_name || settings.companyName || 'Studio';
  const rawBank = getSetting('bank_accounts', '[]');
  const bankAccounts = typeof rawBank === 'string' ? JSON.parse(rawBank) : (Array.isArray(rawBank) ? rawBank : []);
  const bankList = bankAccounts.map(b => `${b.bank} - ${b.norek} a.n ${b.atas_nama}`).join('\n');

  let waMessage = (templates.client_booking_token || templates.client_quotation || '')
    .replace(/{company_name}/g, companyName)
    .replace('{client_name}', inquiry.client_name)
    .replace('{booking_url}', confirmUrl)
    .replace('{graduation_date}', formatDate(inquiry.graduation_date))
    .replace('{package_name}', pkg.name)
    .replace('{total_price}', formatCurrency(totalPrice))
    .replace('{dp_amount}', formatCurrency(dpAmount))
    .replace('{bank_list}', bankList)
    .replace('{admin_phone}', settings.adminPhone || '');

  const waLink = `https://api.whatsapp.com/send?phone=${inquiry.client_phone}&text=${encodeURIComponent(waMessage)}`;

  res.json({
    success: true,
    message: 'Link booking berhasil dibuat',
    token,
    confirm_booking_url: confirmUrl,
    expires_at: expiresAt,
    expires_hours: finalDurationHours,
    wa_link: waLink,
    dp_amount: dpAmount,
    balance_amount: balanceAmount,
    total_price: totalPrice,
    payment_type
  });
});

// ── POST /inquiries/:id/regenerate-link ──────────────────────────────────────
// Buat ulang token link booking (reset timer). Status tetap 'booking_link_active'.
router.post('/inquiries/:id/regenerate-link', [
  param('id').isInt({ min: 1 }),
  body('duration_hours').optional().isInt({ min: 1, max: 72 }),
  handleValidation
], (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry tidak ditemukan' });

  if (inquiry.status !== 'booking_link_active') {
    return res.status(400).json({ error: 'Inquiry tidak dalam status aktif untuk generate ulang link' });
  }

  const token = crypto.randomBytes(16).toString('hex');
  const defaultHours = parseInt(getSetting('booking_link_expiry_hours', 3));
  const finalDurationHours = parseInt(req.body.duration_hours) || defaultHours;
  const expiresAt = new Date(Date.now() + finalDurationHours * 60 * 60 * 1000).toISOString();

  db.transaction(() => {
    db.prepare('DELETE FROM booking_tokens WHERE inquiry_id = ? AND used = 0').run(inquiry.id);
    db.prepare('INSERT INTO booking_tokens (inquiry_id, token, expires_at) VALUES (?, ?, ?)')
      .run(inquiry.id, token, expiresAt);
    db.prepare("UPDATE inquiries SET status = 'booking_link_active', booking_link_created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(inquiry.id);
  })();

  const confirmUrl = `${getBaseUrl(req)}/confirm-booking.html?token=${token}`;
  const templates = getWaTemplates();
  const settings = getSettings();
  const companyName = settings.company_name || settings.companyName || 'Studio';

  let waMessage = (templates.client_booking_token || '')
    .replace(/{company_name}/g, companyName)
    .replace('{client_name}', inquiry.client_name)
    .replace('{booking_url}', confirmUrl);

  const waLink = `https://api.whatsapp.com/send?phone=${inquiry.client_phone}&text=${encodeURIComponent(waMessage)}`;

  res.json({
    success: true,
    message: 'Link booking berhasil di-generate ulang',
    token,
    confirm_booking_url: confirmUrl,
    expires_at: expiresAt,
    expires_hours: finalDurationHours,
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
        db.prepare('DELETE FROM fg_schedules WHERE booking_id = ?').run(bId);
        db.prepare('DELETE FROM reschedule_requests WHERE booking_id = ?').run(bId);
        db.prepare('DELETE FROM booking_moodboards WHERE booking_id = ?').run(bId);
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
    // Gate 1: Halaman Client hanya menampilkan booking yang DP-nya sudah diverifikasi
    // Booking dengan dp_status='unpaid'/'uploaded' tetap di halaman Inquiry
    where += " AND b.dp_status = 'paid' AND b.status NOT IN ('post_production', 'delivered', 'completed', 'cancelled')";
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM bookings b WHERE ${where}`).get(params).c;
  const rows = db.prepare(`
    SELECT b.*, p.name as package_name,
           (SELECT COUNT(*) FROM booking_moodboards bm WHERE bm.booking_id = b.id AND bm.items != '[]' AND bm.items != '') > 0 AS has_moodboard,
           a.id as assignment_id, f.name as fg_name, a.status as assignment_status,
           f.access_code as fg_code, f.phone as fg_phone,
           d.qc_status as qc_status, d.qc_notes as qc_notes
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    WHERE ${where}
    ORDER BY b.graduation_date ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  rows.forEach(r => ensureBookingToken(r, db));
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

  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });
  ensureBookingToken(booking, db);

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
  ensureBookingToken(updated, db);

  // Generate invoice URL
  const invoiceUrl = `${getBaseUrl(req)}/invoice.html?id=${req.params.id}`;

  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = getTrackingUrl(req, updated);

  let waMessage;
  if (isFullPayment) {
    waMessage = (templates.client_fully_paid || '')
      .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
      .replace('{client_name}', updated.client_name || 'Kak')
      .replace('{booking_id}', updated.id)
      .replace('{invoice_url}', invoiceUrl)
      .replace('{tracking_url}', trackingUrl);
  } else {
    waMessage = (templates.client_dp_verified || '')
      .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
      .replace('{client_name}', updated.client_name || 'Kak')
      .replace('{booking_id}', updated.id)
      .replace('{contract_url}', invoiceUrl)
      .replace('{invoice_url}', invoiceUrl)
      .replace('{tracking_url}', trackingUrl)
      .replace('{admin_phone}', settings.adminPhone);
  }

  const waLink = `https://api.whatsapp.com/send?phone=${updated.client_phone}&text=${encodeURIComponent(waMessage)}`;

  // ── Otomasi: Buat struktur folder Drive di background (tidak blocking response) ──
  // Hanya dibuat jika belum ada drive_parent_url dan master folder sudah dikonfigurasi
  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  if (masterFolderId && !updated.drive_parent_url) {
    driveFolder.createBookingFolderStructure(updated, masterFolderId)
      .then(folderMap => {
        db.prepare(`
          UPDATE bookings
          SET drive_parent_url = ?, staging_drive_url = ?, highlight_drive_url = ?, download_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          folderMap.drive_parent_url,
          folderMap.staging_drive_url,
          folderMap.highlight_drive_url,
          folderMap.download_url,
          updated.id
        );
        console.log(`[DriveFolder] ✓ Folder Drive otomatis dibuat untuk Booking #${updated.id}: ${folderMap.parent_folder_name}`);
      })
      .catch(err => {
        console.error(`[DriveFolder] ✗ Gagal buat folder untuk Booking #${updated.id}:`, err.message);
      });
  }

  res.json({ booking: updated, invoice_url: invoiceUrl, wa_link: waLink });
});

// POST /api/admin/bookings/:id/create-drive — Pemicu pembuatan/pemetaan ulang folder Drive otomatis
router.post('/bookings/:id/create-drive', async (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  if (!masterFolderId) {
    return res.status(400).json({ error: 'Master Folder ID belum dikonfigurasi di Settings Admin.' });
  }

  try {
    const folderMap = await driveFolder.createBookingFolderStructure(booking, masterFolderId);
    db.prepare(`
      UPDATE bookings
      SET drive_parent_url = ?, staging_drive_url = ?, highlight_drive_url = ?, download_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      folderMap.drive_parent_url,
      folderMap.staging_drive_url,
      folderMap.highlight_drive_url,
      folderMap.download_url,
      bookingId
    );
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    res.json({
      success: true,
      message: `✓ Folder Google Drive berhasil digenerate untuk ${updated.client_name}!`,
      booking: updated,
      folderMap
    });
  } catch (err) {
    console.error(`[DriveFolder Error for Booking #${bookingId}]:`, err);
    res.status(500).json({ error: 'Gagal membuat folder Google Drive: ' + err.message });
  }
});

router.post('/bookings/:id/upload-to-drive', async (req, res) => {
  const bookingId = req.params.id;
  const target = (req.query.target || (req.body && req.body.target) || 'staging').toLowerCase();

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan.' });

  // Get file from express-fileupload (req.files) or multer (req.file)
  let fileBuffer = null;
  let fileName = null;
  let mimeType = null;

  if (req.files) {
    const uploadedFile = req.files.file || Object.values(req.files)[0];
    if (uploadedFile) {
      fileName = uploadedFile.name;
      mimeType = uploadedFile.mimetype;
      if (uploadedFile.data && uploadedFile.data.length > 0) {
        fileBuffer = uploadedFile.data;
      } else if (uploadedFile.tempFilePath) {
        const fs = require('fs');
        fileBuffer = fs.readFileSync(uploadedFile.tempFilePath);
      }
    }
  } else if (req.file) {
    fileName = req.file.originalname;
    mimeType = req.file.mimetype;
    fileBuffer = req.file.buffer;
  }

  if (!fileBuffer || !fileName) {
    return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
  }

  let folderUrl = null;
  if (target === 'staging') {
    folderUrl = booking.staging_drive_url;
  } else if (target === 'highlight') {
    folderUrl = booking.highlight_drive_url;
  } else if (target === 'final') {
    folderUrl = booking.download_url;
  } else {
    folderUrl = booking.drive_parent_url;
  }

  if (!folderUrl) {
    return res.status(400).json({ error: `Folder Google Drive ${target} belum ter-mapping untuk booking ini.` });
  }

  try {
    const uploadedDriveFile = await driveFolder.uploadFileToFolder(
      folderUrl,
      fileName,
      mimeType,
      fileBuffer
    );

    // Automation Pipeline Triggers
    if (target === 'staging') {
      let existingFiles = [];
      try { existingFiles = JSON.parse(booking.staging_files || '[]'); } catch (e) { }
      existingFiles.push({ fileId: uploadedDriveFile?.id || String(Date.now()), name: fileName, uploaded_at: new Date().toISOString() });

      db.prepare("UPDATE bookings SET staging_files = ?, selection_status = 'staged', staged_photo_count = COALESCE(staged_photo_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(JSON.stringify(existingFiles), bookingId);

      if (req.query.auto_scrape === 'true') {
        try {
          await driveImporter.scrapeAndStoreFileList(bookingId, booking.staging_drive_url);
        } catch (e) {
          console.warn('[AutoScrape Staging Warn]:', e.message);
        }
      }
    } else if (target === 'highlight') {
      db.prepare("UPDATE bookings SET highlight_photo_count = COALESCE(highlight_photo_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(bookingId);
    } else if (target === 'final') {
      db.prepare("UPDATE bookings SET final_photo_count = COALESCE(final_photo_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(bookingId);
    }

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    res.json({
      success: true,
      message: `✓ ${fileName} berhasil ter-upload ke Google Drive!`,
      file: uploadedDriveFile,
      booking: updatedBooking
    });
  } catch (err) {
    console.error(`[DirectUploadError for Booking #${bookingId}]:`, err);
    res.status(500).json({ error: 'Gagal mengunggah file ke Google Drive: ' + err.message });
  }
});

// GET /api/admin/settings/drive-config — Ambil info status konfigurasi Google Drive
router.get('/settings/drive-config', (req, res) => {
  const serviceAccountEmail = driveFolder.getServiceAccountEmail();
  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  const apiKey = getSetting('google_drive_api_key', '');

  res.json({
    has_service_account: !!serviceAccountEmail,
    service_account_email: serviceAccountEmail,
    master_folder_id: masterFolderId,
    has_master_folder: !!masterFolderId,
    api_key: apiKey,
    has_api_key: !!apiKey
  });
});

// POST /api/admin/settings/drive-upload-sa — Upload Service Account JSON dari Admin UI
router.post('/settings/drive-upload-sa', (req, res) => {
  const { json_content, json_string } = req.body;
  let parsed = json_content;
  if (!parsed && json_string) {
    try {
      parsed = JSON.parse(json_string);
    } catch (e) {
      return res.status(400).json({ error: 'Format JSON file tidak valid.' });
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return res.status(400).json({ error: 'Konten JSON service account tidak ditemukan.' });
  }

  try {
    const result = driveFolder.saveServiceAccountFromUpload(parsed);
    res.json({ success: true, message: 'Service account JSON berhasil disimpan!', service_account_email: result.email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/settings/drive-status — Comprehensive status for Smart Hybrid Drive (OAuth + Bot)
router.get('/settings/drive-status', async (req, res) => {
  const serviceAccountEmail = driveFolder.getServiceAccountEmail();
  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  const oauthEmail = getSetting('google_oauth_email', '');
  const oauthRefreshToken = getSetting('google_oauth_refresh_token', '');
  const oauthTokens = getSetting('google_oauth_tokens', '');
  const oauthConnected = !!(oauthEmail && (oauthRefreshToken || oauthTokens));

  let storageUsedGB = '0.0';
  let storageTotalGB = 'Tanpa Batas';
  let storagePercent = 0;

  if (oauthConnected) {
    try {
      const drive = driveFolder.getDriveClient(true);
      const about = await drive.about.get({ fields: 'storageQuota' });
      if (about.data && about.data.storageQuota) {
        const usageBytes = parseInt(about.data.storageQuota.usage || '0', 10);
        storageUsedGB = (usageBytes / (1024 * 1024 * 1024)).toFixed(1);
        if (about.data.storageQuota.limit) {
          const limitBytes = parseInt(about.data.storageQuota.limit, 10);
          storageTotalGB = (limitBytes / (1024 * 1024 * 1024)).toFixed(1);
          storagePercent = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;
        } else {
          storageTotalGB = 'Tanpa Batas';
          storagePercent = 0;
        }
      }
    } catch (e) {
      console.warn('[DriveStatusWarn]:', e.message);
    }
  }

  res.json({
    oauth_connected: oauthConnected,
    oauth_email: oauthEmail,
    mode: oauthConnected ? 'oauth2_active' : 'oauth2_pending',
    mode_label: oauthConnected ? 'Google Drive OAuth2 Active' : 'Google Drive Belum Terhubung',
    master_folder_id: masterFolderId,
    has_master_folder: !!masterFolderId,
    storage_used_gb: storageUsedGB,
    storage_total_gb: storageTotalGB,
    storage_percent: storagePercent
  });
});



// POST /api/admin/settings/drive-disconnect — Putuskan Tautan OAuth
router.post('/settings/drive-disconnect', (req, res) => {
  setSetting('google_oauth_refresh_token', '', 'Google Drive OAuth Refresh Token');
  setSetting('google_oauth_access_token', '', 'Google Drive OAuth Access Token');
  setSetting('google_oauth_tokens', '', 'Google Drive OAuth Full Tokens Object');
  setSetting('google_oauth_email', '', 'Google Drive OAuth Connected Email');
  res.json({ success: true, message: '✓ Tautan akun Google Drive berhasil diputuskan.' });
});

// GET /api/admin/settings/drive-test — Test koneksi Master Folder ID Google Drive via OAuth2
router.get('/settings/drive-test', async (req, res) => {
  try {
    const masterFolderId = getSetting('google_drive_master_folder_id', '');
    if (!masterFolderId) {
      return res.status(400).json({ ok: false, error: 'Master Folder ID Client belum dikonfigurasi.' });
    }

    const drive = driveFolder.getDriveClient(true);
    const folderRes = await drive.files.get({
      fileId: masterFolderId,
      fields: 'id, name, webViewLink, mimeType'
    });

    let portfolioFolderId = getSetting('google_drive_portfolio_folder_id', '');
    let portfolioFolderName = 'Master Portofolio';
    if (portfolioFolderId) {
      try {
        const pRes = await drive.files.get({
          fileId: portfolioFolderId,
          fields: 'id, name'
        });
        portfolioFolderName = pRes.data.name || 'Master Portofolio';
      } catch (err) {}
    } else {
      try {
        portfolioFolderId = await driveFolder.getOrCreateMasterPortfolioFolder(drive);
      } catch (err) {}
    }

    res.json({
      ok: true,
      success: true,
      folder_name: folderRes.data.name || 'WISUDA CLIENTS',
      folder_id: masterFolderId,
      portfolio_folder_id: portfolioFolderId || '',
      portfolio_folder_name: portfolioFolderName,
      portfolio_folder_url: portfolioFolderId ? `https://drive.google.com/drive/folders/${portfolioFolderId}` : '',
      message: `Terhubung ke folder Client ("${folderRes.data.name || masterFolderId}") & Portofolio`
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Gagal terhubung ke Master Folder Google Drive: ' + e.message });
  }
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

  // Jika sesi foto sudah selesai, otomatis masuk Post Production
  const assignDone = db.prepare("SELECT id FROM assignments WHERE booking_id = ? AND (is_session_done = 1 OR status IN ('done', 'completed', 'accepted'))").get(req.params.id);
  if (assignDone) {
    db.prepare("UPDATE bookings SET status = 'post_production', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  }

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  ensureBookingToken(updated, db);

  // Save static final invoice snapshot archive to /uploads/invoices-client/
  try {
    saveFinalInvoiceSnapshot(updated, db);
  } catch (err) {
    console.error('Failed to save final invoice snapshot archive:', err);
  }

  const invoiceUrl = `${getBaseUrl(req)}/invoice.html?id=${req.params.id}`;

  // WA.me links
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = getTrackingUrl(req, updated);

  let waMessageClient = (templates.client_fully_paid || '')
    .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
    .replace('{client_name}', updated.client_name || 'Kak')
    .replace('{booking_id}', updated.id)
    .replace('{invoice_url}', invoiceUrl)
    .replace('{tracking_url}', trackingUrl);

  const waLinkClient = `https://api.whatsapp.com/send?phone=${updated.client_phone}&text=${encodeURIComponent(waMessageClient)}`;

  // Notify admin
  let waMessageAdmin = `✅ Pelunasan Terverifikasi\nBooking ${updated.id} (${updated.client_name}) SELESAI.`;
  const waLinkAdmin = `https://api.whatsapp.com/send?phone=${settings.adminPhone}&text=${encodeURIComponent(waMessageAdmin)}`;

  res.json({ booking: updated, invoice_url: invoiceUrl, wa_link_client: waLinkClient, wa_link_admin: waLinkAdmin });
});

// ============ DIRECT EDIT BOOKING SCHEDULE & DETAILS ============
router.put('/bookings/:id', [
  param('id').isInt({ min: 1 }),
  body('graduation_date').optional().isISO8601().withMessage('Tanggal tidak valid (YYYY-MM-DD)'),
  body('shooting_time').optional().trim().matches(/^([01]?\d|2[0-3]):[0-5]\d$/).withMessage('Jam mulai tidak valid (HH:MM)'),
  body('location').optional().trim(),
  body('university').optional().trim(),
  body('city').optional().trim(),
  body('duration_hours').optional().isInt({ min: 1, max: 12 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const { graduation_date, shooting_time, location, university, city, duration_hours } = req.body;
  const updates = [];
  const params = [];

  if (graduation_date) { updates.push('graduation_date = ?'); params.push(graduation_date); }
  if (shooting_time) { updates.push('shooting_time = ?'); params.push(shooting_time); }
  if (location !== undefined) { updates.push('location = ?'); params.push(location); }
  if (university !== undefined) { updates.push('university = ?'); params.push(university); }
  if (city !== undefined) { updates.push('city = ?'); params.push(city); }
  if (duration_hours) { updates.push('duration_hours = ?'); params.push(duration_hours); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Tidak ada data yang diubah' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // If graduation_date or shooting_time changed, update linked FG schedule if exists
  const targetDate = graduation_date || booking.graduation_date;
  const targetTime = shooting_time || booking.shooting_time || '09:00';
  const targetDuration = duration_hours || booking.duration_hours || 2;

  const assignment = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(req.params.id);
  let conflictWarning = null;

  if (assignment && assignment.fg_id) {
    // Update FG schedule date
    db.prepare(`
      INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
      VALUES (?, ?, 'booked', ?, 'Booking Updated #' || ?)
    `).run(assignment.fg_id, targetDate, req.params.id, req.params.id);

    // Check if new schedule conflicts with FG's other jobs
    const conflictCheck = checkFgConflict(db, assignment.fg_id, targetDate, targetTime, targetDuration, req.params.id);
    if (conflictCheck.hasConflict) {
      conflictWarning = `Peringatan: FG ID #${assignment.fg_id} memiliki bentrok jadwal di jam tersebut. Pertimbangkan untuk memindahkan ke FG lain.`;
    }
  }

  const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json({
    success: true,
    message: 'Jadwal booking berhasil diperbarui.',
    booking: updatedBooking,
    warning: conflictWarning
  });
});

// ============ BOOKING STATUS UPDATE ============
function handleStatusUpdate(req, res) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const { status } = req.body;

  // Validate transition
  const validTransitions = {
    'confirmed': ['shooting', 'post_production', 'cancelled'],
    'shooting': ['post_production', 'uploaded', 'delivered', 'completed'],
    'post_production': ['uploaded', 'delivered', 'completed', 'cancelled'],
    'uploaded': ['delivered', 'completed', 'cancelled'],
    'delivered': ['completed', 'cancelled']
  };

  if (validTransitions[booking.status] && !validTransitions[booking.status].includes(status)) {
    return res.status(400).json({ error: `Cannot change from ${booking.status} to ${status}` });
  }

  // Gate 2: Tidak bisa masuk Post Production jika pelunasan belum diverifikasi
  if (status === 'post_production') {
    if (booking.balance_amount > 0 && booking.balance_status !== 'paid') {
      return res.status(400).json({
        error: 'Pelunasan harus diverifikasi terlebih dahulu sebelum booking dapat masuk ke Post Produksi.'
      });
    }
  }

  db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  if (status === 'cancelled') {
    try {
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(req.params.id);
      db.prepare("UPDATE assignments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status != 'cancelled'").run(req.params.id);
    } catch (e) {
      console.warn('[StatusUpdate] Gagal cancel assignment/schedule:', e.message);
    }
  }

  if (status === 'completed') {
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    try {
      saveFinalInvoiceSnapshot(updated, db);
    } catch (err) {
      console.error('Failed to save final invoice snapshot archive:', err);
    }
  }

  const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: `Status booking #${req.params.id} berhasil diperbarui ke ${status}.`, booking: updatedBooking });
}

const statusValidationMiddleware = [
  param('id').isInt({ min: 1 }),
  body('status').isIn(['confirmed', 'shooting', 'post_production', 'uploaded', 'delivered', 'completed', 'cancelled']),
  handleValidation
];

router.post('/bookings/:id/status', statusValidationMiddleware, handleStatusUpdate);
router.put('/bookings/:id/status', statusValidationMiddleware, handleStatusUpdate);
router.patch('/bookings/:id/status', statusValidationMiddleware, handleStatusUpdate);

// ============ CANCEL BOOKING ============
router.post('/bookings/:id/cancel', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Data booking / client tidak ditemukan' });

  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'Booking sudah berstatus batal' });
  }

  try {
    db.transaction(() => {
      // 1. Set booking status to cancelled
      db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

      // 2. Free FG schedule entry for this booking
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(bookingId);

      // 3. Mark active assignments as cancelled
      db.prepare("UPDATE assignments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status != 'cancelled'").run(bookingId);
    })();

    res.json({ success: true, message: 'Booking berhasil dibatalkan. Rekam transaksi/DP tetap disimpan untuk keuangan, dan jadwal fotografer telah dibebaskan.', status: 'cancelled' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Gagal membatalkan booking: ' + err.message });
  }
});

// Admin manually marks photo shoot session as completed (Fleksibel: Admin or Freelancer can trigger)
router.post('/bookings/:id/mark-session-done', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const now = new Date().toISOString();

  // Update assignment status if exists
  db.prepare(`
    UPDATE assignments 
    SET status = 'done', shoot_end_at = COALESCE(shoot_end_at, ?), updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = ? AND status IN ('confirmed', 'assigned', 'pending')
  `).run(now, booking.id);

  // Transisi ke post_production jika sesi selesai
  const targetStatus = 'post_production';

  db.prepare(`
    UPDATE bookings 
    SET is_session_done = 1, status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(targetStatus, booking.id);

  res.json({
    success: true,
    message: `Sesi pemotretan untuk Booking #${booking.id} (${booking.client_name}) berhasil ditandai SELESAI oleh Admin ✅`,
    is_session_done: 1,
    status: targetStatus
  });
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

  const waLinkClient = `https://api.whatsapp.com/send?phone=${booking.client_phone || settings.adminPhone}&text=${encodeURIComponent(waClient)}`;

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
  const portalUrl = `${getBaseUrl(req)}/freelance-portal.html?code=${fg.access_code}&assignment=${assignment.id}`;
  const waMessage = (templates.fg_assigned || '')
      .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
      .replace('{client_name}', booking.client_name)
      .replace('{location}', booking.location || '-')
      .replace('{university}', booking.university || '-')
      .replace('{shooting_time}', booking.shooting_time || 'TBD')
      .replace('{duration_hours}', booking.duration_hours || booking.shooting_duration || '-')
      .replace('{admin_phone}', settings.adminPhone || '')
      .replace('{assignment_id}', assignment.id)
      .replace('{portal_url}', portalUrl);

  const waLink = `https://api.whatsapp.com/send?phone=${fg.phone}&text=${encodeURIComponent(waMessage)}`;

  res.status(201).json({ assignment, wa_link: waLink, portal_url: portalUrl, portal_enabled: true });
});

// ============ REASSIGN / SWITCH FG FLEKSIBEL ============
router.post('/bookings/:id/reassign-fg', [
  param('id').isInt({ min: 1 }),
  body('new_fg_id').isInt({ min: 1 }),
  body('shooting_time').optional().trim(),
  body('duration_hours').optional().isInt({ min: 1, max: 12 }),
  body('location').optional().trim().isLength({ max: 200 }),
  body('brief').optional().trim().isLength({ max: 500 }),
  body('fg_fee').optional().isInt({ min: 0 }),
  body('reason').optional().trim(),
  handleValidation
], (req, res) => {
  const { new_fg_id, shooting_time, duration_hours, location, brief, fg_fee, reason } = req.body;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const newFg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND active = 1').get(new_fg_id);
  if (!newFg) return res.status(400).json({ error: 'FG baru tidak ditemukan atau tidak aktif' });

  // Release current assignment
  const oldAssignment = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(req.params.id);
  if (oldAssignment) {
    db.prepare(`
      UPDATE assignments 
      SET status = 'cancelled', offer_status = 'reassigned', decline_reason = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reason || 'Reassigned by Admin', oldAssignment.id);

    // Release old FG schedule
    db.prepare("DELETE FROM fg_schedules WHERE fg_id = ? AND booking_id = ?").run(oldAssignment.fg_id, req.params.id);
  }

  // Calculate FG Fee
  let finalFgFee = 0;
  if (fg_fee !== undefined && fg_fee !== null && fg_fee !== '') {
    finalFgFee = parseInt(fg_fee);
  } else if (newFg.default_rate && newFg.default_rate > 0) {
    finalFgFee = newFg.default_rate;
  } else {
    const pkg = db.prepare('SELECT fg_fee FROM packages WHERE id = ?').get(booking.package_id);
    finalFgFee = pkg ? pkg.fg_fee : 0;
  }

  // Update booking details if provided
  const updates = [];
  const bParams = [];
  if (shooting_time) { updates.push('shooting_time = ?'); bParams.push(shooting_time); }
  if (duration_hours) { updates.push('duration_hours = ?'); bParams.push(duration_hours); }
  if (location) { updates.push('location = ?'); bParams.push(location); }
  if (updates.length > 0) {
    bParams.push(req.params.id);
    db.prepare(`UPDATE bookings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...bParams);
  }

  // Create new assignment with offer_status = 'offered'
  const result = db.prepare(`
    INSERT INTO assignments (booking_id, fg_id, brief, fg_fee, upload_deadline, offer_status, status)
    VALUES (?, ?, ?, ?, date(?, '+1 day'), 'offered', 'assigned')
  `).run(req.params.id, new_fg_id, brief || '', finalFgFee, booking.graduation_date);

  // Lock schedule in fg_schedules for new FG
  db.prepare(`
    INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
    VALUES (?, ?, 'booked', ?, 'Wisuda Booking #' || ?)
  `).run(new_fg_id, booking.graduation_date, req.params.id, req.params.id);

  const newAssignment = db.prepare(`
    SELECT a.*, f.name as fg_name, f.phone as fg_phone
    FROM assignments a
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  const settings = getSettings();
  const portalUrl = `${getBaseUrl(req)}/freelance-portal.html?code=${newFg.access_code}&assignment=${newAssignment.id}`;
  let waMessage = `Halo Kak ${newFg.name}! 👋\n\nAda pengalihan penugasan pemotretan wisuda baru untuk Anda:\n\nClient: ${booking.client_name}\nTanggal: ${booking.graduation_date}\nJam: ${shooting_time || booking.shooting_time || '-'}\nLokasi: ${location || booking.location || '-'}\n\nMohon buka portal untuk menerima/mengonfirmasi penugasan:\n${portalUrl}`;

  const waLink = `https://api.whatsapp.com/send?phone=${newFg.phone}&text=${encodeURIComponent(waMessage)}`;

  res.status(200).json({
    success: true,
    message: `Penugasan berhasil dialihkan ke ${newFg.name}`,
    assignment: newAssignment,
    wa_link: waLink,
    portal_url: portalUrl
  });
});

// ============ BULK CHECKBOX OPERATIONS ============
router.post('/bookings/bulk-delete', [
  body('ids').isArray({ min: 1 }).withMessage('Pilih minimal 1 client untuk dihapus'),
  handleValidation
], (req, res) => {
  const { ids } = req.body;
  let deletedCount = 0;

  const deleteStmt = db.transaction((bookingIds) => {
    for (const id of bookingIds) {
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM deliverables WHERE assignment_id IN (SELECT id FROM assignments WHERE booking_id = ?)").run(id);
      db.prepare("DELETE FROM payouts WHERE assignment_id IN (SELECT id FROM assignments WHERE booking_id = ?)").run(id);
      db.prepare("DELETE FROM assignments WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM portfolio_items WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM reschedule_requests WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM booking_moodboards WHERE booking_id = ?").run(id);
      const res = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
      if (res.changes > 0) deletedCount++;
    }
  });

  try {
    deleteStmt(ids);
    res.json({
      success: true,
      message: `${deletedCount} data client berhasil dihapus bersih!`,
      deleted_count: deletedCount
    });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus massal: ' + e.message });
  }
});

router.post('/bookings/bulk-verify-dp', [
  body('ids').isArray({ min: 1 }).withMessage('Pilih minimal 1 client'),
  handleValidation
], (req, res) => {
  const { ids } = req.body;
  let verifiedCount = 0;

  const verifyStmt = db.transaction((bookingIds) => {
    for (const id of bookingIds) {
      const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
      if (b && b.dp_status !== 'paid') {
        const dpAmt = b.dp_amount || Math.round(b.total_price * 0.5);
        const balAmt = b.total_price - dpAmt;
        db.prepare(`
          UPDATE bookings
          SET dp_status = 'paid', dp_verified_by = ?, dp_verified_at = CURRENT_TIMESTAMP,
              dp_amount = ?, balance_amount = ?, status = 'confirmed',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(req.user.id, dpAmt, balAmt, id);
        ensureBookingToken(b, db);
        verifiedCount++;
      }
    }
  });

  try {
    verifyStmt(ids);
    res.json({
      success: true,
      message: `${verifiedCount} pembayaran DP client berhasil diverifikasi!`,
      verified_count: verifiedCount
    });
  } catch (e) {
    res.status(500).json({ error: 'Gagal memverifikasi DP massal: ' + e.message });
  }
});

router.post('/bookings/bulk-assign-fg', [
  body('ids').isArray({ min: 1 }).withMessage('Pilih minimal 1 client'),
  body('fg_id').isInt({ min: 1 }).withMessage('Pilih fotografer terlebih dahulu'),
  body('fg_fee').optional().isInt({ min: 0 }),
  handleValidation
], (req, res) => {
  const { ids, fg_id, fg_fee } = req.body;

  const fg = db.prepare("SELECT * FROM freelancers WHERE id = ? AND active = 1").get(fg_id);
  if (!fg) return res.status(400).json({ error: 'FG tidak ditemukan atau tidak aktif' });

  // 1. Fetch selected bookings
  const placeholders = ids.map(() => '?').join(',');
  const bookings = db.prepare(`SELECT * FROM bookings WHERE id IN (${placeholders})`).all(...ids);
  if (bookings.length === 0) return res.status(400).json({ error: 'Data booking tidak ditemukan' });

  // 2. DETEKSI BENTROK JAM CERDAS (Internal pairwise overlap check & FG schedule check)
  const conflicts = [];

  // 2a. Pairwise overlap check among selected bookings for the same date
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const b1 = bookings[i];
      const b2 = bookings[j];

      if (b1.graduation_date === b2.graduation_date) {
        const time1 = b1.shooting_time || '09:00';
        const dur1 = b1.duration_hours || 2;
        const time2 = b2.shooting_time || '09:00';
        const dur2 = b2.duration_hours || 2;

        if (checkTimeOverlap(time1, dur1, time2, dur2)) {
          conflicts.push(`Jam tumpang tindih antara ${b1.client_name} (${b1.graduation_date} ${time1}) dan ${b2.client_name} (${b2.graduation_date} ${time2})`);
        }
      }
    }
  }

  // 2b. Check conflict against FG's existing schedules in DB
  for (const b of bookings) {
    const time = b.shooting_time || '09:00';
    const dur = b.duration_hours || 2;
    const cCheck = checkFgConflict(db, fg_id, b.graduation_date, time, dur, b.id);
    if (cCheck.hasConflict) {
      conflicts.push(`FG ${fg.name} sudah memiliki jadwal lain pada ${b.graduation_date} jam ${time} (Booking #${cCheck.conflictingBooking.id} - ${cCheck.conflictingBooking.client_name})`);
    }
  }

  if (conflicts.length > 0) {
    return res.status(400).json({
      error: `Gagal Assign Massal! Terdeteksi ${conflicts.length} bentrok jam:`,
      conflicts
    });
  }

  // 3. Execution — All time slots are clear!
  let assignedCount = 0;

  const assignStmt = db.transaction((targetBookings) => {
    for (const b of targetBookings) {
      // Calculate FG fee
      let finalFee = 0;
      if (fg_fee !== undefined && fg_fee !== null && fg_fee !== '') {
        finalFee = parseInt(fg_fee);
      } else if (fg.default_rate && fg.default_rate > 0) {
        finalFee = fg.default_rate;
      } else {
        const pkg = db.prepare('SELECT fg_fee FROM packages WHERE id = ?').get(b.package_id);
        finalFee = pkg ? pkg.fg_fee : 0;
      }

      // Cancel previous assignment if any
      db.prepare("UPDATE assignments SET status = 'cancelled', offer_status = 'reassigned' WHERE booking_id = ? AND status != 'cancelled'").run(b.id);
      db.prepare("DELETE FROM fg_schedules WHERE fg_id = ? AND booking_id = ?").run(fg_id, b.id);

      // Create assignment
      db.prepare(`
        INSERT INTO assignments (booking_id, fg_id, fg_fee, upload_deadline, offer_status, status)
        VALUES (?, ?, ?, date(?, '+1 day'), 'offered', 'assigned')
      `).run(b.id, fg_id, finalFee, b.graduation_date);

      // Lock schedule
      db.prepare(`
        INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
        VALUES (?, ?, 'booked', ?, 'Wisuda Booking #' || ?)
      `).run(fg_id, b.graduation_date, b.id, b.id);

      assignedCount++;
    }
  });

  try {
    assignStmt(bookings);
    res.json({
      success: true,
      message: `${assignedCount} client berhasil ditugaskan ke FG ${fg.name} secara massal!`,
      assigned_count: assignedCount
    });
  } catch (e) {
    res.status(500).json({ error: 'Gagal Assign Massal: ' + e.message });
  }
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

// PUT /api/admin/bookings/:id/drive-mapping (Map Google Drive folder links in a single setup)
router.put('/bookings/:id/drive-mapping', [
  param('id').isInt({ min: 1 }),
  body('drive_parent_url').optional().trim(),
  body('staging_drive_url').optional().trim(),
  body('highlight_drive_url').optional().trim(),
  body('download_url').optional().trim(),
  handleValidation
], (req, res) => {
  const { id } = req.params;
  const { drive_parent_url, staging_drive_url, highlight_drive_url, download_url } = req.body;

  const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  try {
    db.prepare(`
      UPDATE bookings 
      SET drive_parent_url = ?, 
          staging_drive_url = ?, 
          highlight_drive_url = ?, 
          download_url = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(drive_parent_url || null, staging_drive_url || null, highlight_drive_url || null, download_url || null, id);

    res.json({ success: true, message: 'Google Drive Mapping berhasil disimpan.' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyimpan Drive Mapping: ' + e.message });
  }
});

// POST /api/admin/bookings/:id/transfer-drive-ownership — Manual transfer ownership trigger
router.post('/bookings/:id/transfer-drive-ownership', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking tidak ditemukan' });
    }

    if (booking.drive_cleanup_status === 'trashed') {
      return res.status(400).json({ error: 'Folder sudah dipindahkan ke Trash dan tidak bisa ditransfer lagi' });
    }

    if (!booking.drive_parent_url) {
      return res.status(400).json({ error: 'Booking ini belum memiliki Drive parent folder' });
    }

    const targetEmail = (req.body.email || booking.client_email || '').trim();
    if (!targetEmail) {
      return res.status(400).json({ error: 'Email Google Drive klien belum diisi' });
    }

    const folderMatch = booking.drive_parent_url.match(/\/folders\/([a-zA-Z0-9_-]+)/i) || booking.drive_parent_url.match(/id=([a-zA-Z0-9_-]+)/i);
    const folderId = folderMatch ? folderMatch[1] : null;

    if (!folderId) {
      return res.status(400).json({ error: 'URL Google Drive tidak valid' });
    }

    const driveFolderService = require('../services/drive-folder.service');

    // Update DB status to 'transferred' when Admin confirms invite
    const notes = `Pemindahan kepemilikan folder Google Drive telah diselesaikan oleh Admin ke ${targetEmail}.`;
    db.prepare(`
      UPDATE bookings
      SET drive_cleanup_status = 'transferred', drive_cleanup_notes = ?, client_email = ?
      WHERE id = ?
    `).run(notes, targetEmail, bookingId);

    // Prepare WA notification link
    const templates = getWaTemplates();
    const settings = getSettings();
    let waMsg = (templates.drive_manual_transfer || templates.drive_expired_cleanup || '')
      .replace('{client_name}', booking.client_name || 'Client')
      .replace('{booking_id}', booking.id)
      .replace('{drive_expiry_date}', booking.drive_expiry_date || new Date().toISOString().slice(0, 10))
      .replace('{client_email}', targetEmail)
      .replace('{company_name}', settings.company_name || 'Wisuda Photography');

    let phoneClean = String(booking.client_phone || '').replace(/[^0-9]/g, '');
    if (phoneClean.startsWith('0')) phoneClean = '62' + phoneClean.slice(1);
    const directWaUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(waMsg)}` : null;

    res.json({
      success: true,
      message: `Undangan pemindahan kepemilikan telah ditandai selesai untuk ${targetEmail}`,
      client_email: targetEmail,
      direct_wa_url: directWaUrl
    });
  } catch (err) {
    console.error('Transfer drive ownership error:', err);
    res.status(500).json({ error: 'Gagal mentransfer kepemilikan Drive: ' + err.message });
  }
});

// DELETE /api/admin/bookings/:id (Clean delete client & booking without residual files or records)
router.delete('/bookings/:id', async (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Data booking / client tidak ditemukan' });

  try {
    // 1. Delete associated portfolio files from Google Drive
    const portfolioItems = db.prepare('SELECT * FROM portfolio_items WHERE booking_id = ?').all(bookingId);
    for (const p of portfolioItems) {
      if (p.cover_photo_url) await driveFolder.deleteDriveFile(p.cover_photo_url);
      if (p.highlight_photos) {
        try {
          const arr = JSON.parse(p.highlight_photos);
          if (Array.isArray(arr)) {
            for (const u of arr) await driveFolder.deleteDriveFile(u);
          }
        } catch {}
      }
    }

    db.transaction(() => {
      // 2. Delete associated assignments, deliverables & payouts
      const assignments = db.prepare('SELECT id FROM assignments WHERE booking_id = ?').all(bookingId);
      assignments.forEach(a => {
        db.prepare('DELETE FROM deliverables WHERE assignment_id = ?').run(a.id);
        db.prepare('DELETE FROM payouts WHERE assignment_id = ?').run(a.id);
      });
      db.prepare('DELETE FROM assignments WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM portfolio_items WHERE booking_id = ?').run(bookingId);



      // 4. Delete associated schedule entries, reschedule requests & moodboards
      db.prepare('DELETE FROM fg_schedules WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM reschedule_requests WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM booking_moodboards WHERE booking_id = ?').run(bookingId);

      // 5. Save inquiry ID and delete the booking record first (to respect FK constraint on bookings.inquiry_id)
      const inquiryId = booking.inquiry_id;
      db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);

      // 6. Delete booking tokens & inquiry if inquiry exists
      if (inquiryId) {
        db.prepare('DELETE FROM booking_tokens WHERE inquiry_id = ?').run(inquiryId);
        db.prepare('DELETE FROM inquiries WHERE id = ?').run(inquiryId);
      }
    })();

    res.json({ success: true, message: 'Data client & booking telah dihapus bersih secara permanen.' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Gagal menghapus client: ' + err.message });
  }
});

// ============ FREELANCERS ============
router.get('/freelancers', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, search = '', active, city } = req.query;
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
  if (city && city !== 'all') {
    where += ' AND city = ?';
    params.push(city);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM freelancers WHERE ${where}`).get(params).c;

  // When city is provided as priority (not filter), sort matching city first
  let orderClause = 'name ASC';
  const priorityCity = req.query.priority_city;
  if (priorityCity) {
    orderClause = `CASE WHEN city = '${priorityCity.replace(/'/g, "''")}' THEN 0 ELSE 1 END, name ASC`;
  }

  const rows = db.prepare(`
    SELECT * FROM freelancers WHERE ${where} ORDER BY ${orderClause} LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // Parse JSON fields
  rows.forEach(f => {
    try { f.specialties = JSON.parse(f.specialties || '[]'); } catch { f.specialties = []; }
    try { f.bank_account = JSON.parse(f.bank_account || '{}'); } catch { f.bank_account = {}; }
  });

  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/freelancers', freelancerValidation, (req, res) => {
  const { name, phone, email, portfolio_url, specialties, bank_account, id_card, default_rate, city } = req.body;

  // Auto-generate unique access code
  const crypto = require('crypto');
  const accessCode = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const result = db.prepare(`
    INSERT INTO freelancers (name, phone, email, portfolio_url, specialties, bank_account, id_card, access_code, default_rate, city)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, email || null, portfolio_url || null, JSON.stringify(specialties || []), JSON.stringify(bank_account || {}), id_card || null, accessCode, default_rate || 0, city);

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
  const { name, phone, email, portfolio_url, specialties, bank_account, id_card, active, rating, default_rate, city } = req.body;

  db.prepare(`
    UPDATE freelancers 
    SET name = ?, phone = ?, email = ?, portfolio_url = ?, specialties = ?, bank_account = ?, id_card = ?, active = ?, rating = ?, default_rate = ?, city = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, phone, email || null, portfolio_url || null, JSON.stringify(specialties || []), JSON.stringify(bank_account || {}), id_card || null, active ? 1 : 0, rating || 5.0, default_rate || 0, city, req.params.id);

  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  try { fg.specialties = JSON.parse(fg.specialties); } catch { fg.specialties = []; }
  try { fg.bank_account = JSON.parse(fg.bank_account); } catch { fg.bank_account = {}; }

  res.json(fg);
});

// DELETE freelancer
router.delete('/freelancers/:id', (req, res) => {
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });

  try {
    // Delete linked schedules
    db.prepare("DELETE FROM fg_schedules WHERE fg_id = ?").run(req.params.id);

    // Set assignments status to cancelled or nullify fg_id for deleted FG
    db.prepare("UPDATE assignments SET status = 'cancelled', decline_reason = 'FG Akun Dihapus' WHERE fg_id = ?").run(req.params.id);

    // Delete freelancer record
    db.prepare("DELETE FROM freelancers WHERE id = ?").run(req.params.id);

    res.json({ success: true, message: `Freelancer ${fg.name} berhasil dihapus` });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus freelancer: ' + e.message });
  }
});

// POST /api/admin/freelancers/:id/approve-rate (Approve freelancer rate request)
router.post('/freelancers/:id/approve-rate', (req, res) => {
  const { id } = req.params;
  const fg = db.prepare('SELECT id, pending_rate FROM freelancers WHERE id = ?').get(id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });
  if (fg.pending_rate === null) return res.status(400).json({ error: 'Tidak ada pengajuan rate baru' });

  try {
    db.prepare('UPDATE freelancers SET default_rate = pending_rate, pending_rate = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    res.json({ success: true, message: 'Rate approved successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyetujui rate: ' + e.message });
  }
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

// Regenerate tracking token for a booking
router.post('/bookings/:id/reset-token', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const newToken = `TRK-${booking.id}-${randomHex}`;

  db.prepare("UPDATE bookings SET tracking_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(newToken, req.params.id);

  res.json({ success: true, tracking_token: newToken, message: 'Token tracking berhasil di-reset' });
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
  `).get(fg_id, graduationDate).c;

  if (countToday >= maxPerDay) {
    return res.status(400).json({ error: `FG ini sudah mencapai batas maksimal ${maxPerDay} sesi foto di tanggal tersebut.` });
  }

  // Create assignment
  const uploadDeadlineDays = parseInt(getSetting('upload_deadline_days', 1));
  const uploadDeadline = new Date(graduationDate);
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

  const waLink = `https://api.whatsapp.com/send?phone=${fg.phone}&text=${encodeURIComponent(waMessage)}`;

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

      // Update FG Schedule
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
           b.download_url, b.client_phone, b.tracking_token,
           b.balance_status, b.balance_amount, b.balance_bukti_url,
            b.staging_drive_url, b.selection_status, b.highlight_drive_url, b.selected_photos, b.staging_files,
            b.staged_photo_count, b.highlight_photo_count, b.final_photo_count,
           a.id as assignment_id, a.status as assignment_status, a.fg_id, a.editor_id,
           f.name as fg_name,
           d.id as deliverable_id, d.qc_status, d.notes as delivery_notes
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

  // Clear staging_files dari DB + hapus thumbnail cache disk saat file final dikirim ke klien
  try {
    clearGalleryCache(assignment.booking_id);
    db.prepare('UPDATE bookings SET staging_files = NULL WHERE id = ?').run(assignment.booking_id);
  } catch (e) {
    console.warn(`[Deliver] Gagal clear staging cache Booking #${assignment.booking_id}:`, e.message);
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

  const updated = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(req.params.id);
  res.json({ deliverable: updated, wa_link: waLink });
});

// POST /bookings/:booking_id/activate-gallery — Admin konfirmasi file fisik diterima dari FG & aktifkan galeri seleksi
// Endpoint ini dipanggil setelah Admin menerima SD Card dari FG dan menandai sesi selesai.
// Gate 2 (pelunasan) wajib sudah lulus sebelum galeri dapat diaktifkan.
router.post('/bookings/:booking_id/activate-gallery', (req, res) => {
  try {
    const bookingId = req.params.booking_id;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    // ── Guard Gate 2: Pelunasan harus sudah terverifikasi ─────────────────────
    if (booking.balance_status !== 'paid') {
      return res.status(400).json({
        error: 'Gate 2 belum lulus: Pelunasan (balance_status) belum terverifikasi. Verifikasi pembayaran lunas terlebih dahulu sebelum mengaktifkan galeri.'
      });
    }

    // ── Guard is_session_done: Sesi foto harus sudah selesai ──────────────────
    if (!booking.is_session_done) {
      return res.status(400).json({
        error: 'Sesi pemotretan belum ditandai selesai (is_session_done). Tandai sesi selesai terlebih dahulu.'
      });
    }

    let assignment = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(bookingId);
    if (!assignment) {
      const ins = db.prepare("INSERT INTO assignments (booking_id, status) VALUES (?, 'done')").run(bookingId);
      assignment = { id: ins.lastInsertRowid };
    } else {
      db.prepare("UPDATE assignments SET status = 'done', shoot_end_at = COALESCE(shoot_end_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(assignment.id);
    }

    let del = db.prepare('SELECT * FROM deliverables WHERE assignment_id = ?').get(assignment.id);
    if (!del) {
      db.prepare(`
        INSERT INTO deliverables (assignment_id, delivery_type, notes)
        VALUES (?, 'fisik', 'Diterima oleh Admin')
      `).run(assignment.id);
    } else {
      db.prepare("UPDATE deliverables SET delivery_type = 'fisik', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(del.id);
    }

    // Status resmi: post_production — hanya dicapai setelah Gate 2 lulus + is_session_done
    db.prepare("UPDATE bookings SET status = 'post_production', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

    res.json({ success: true, message: 'File/berkas foto berhasil diterima & galeri seleksi diaktifkan!' });
  } catch (err) {
    console.error('Error activating gallery:', err);
    res.status(500).json({ error: 'Gagal mengaktifkan galeri: ' + err.message });
  }
});


// POST /bookings/:booking_id/upload-raw-photos — Admin upload Drive staging link untuk seleksi klien
// [Menggantikan /post-production/:id/upload-staging]
router.post('/bookings/:booking_id/upload-raw-photos', [
  param('booking_id').isInt({ min: 1 }),
  body('staging_drive_url').isURL().withMessage('Link Drive Staging wajib URL valid'),
  handleValidation
], async (req, res) => {
  const { staging_drive_url } = req.body;
  const bookingId = req.params.booking_id;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status !== 'paid') {
    return res.status(400).json({ error: 'Status pembayaran belum lunas. Pelunasan harus dikonfirmasi terlebih dahulu.' });
  }

  try {
    const files = await driveImporter.scrapeAndStoreFileList(bookingId, staging_drive_url);
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: '⚠️ Folder Google Drive kosong (0 foto). Pastikan folder berisi foto (.jpg/.png).'
      });
    }

    res.json({
      success: true,
      message: `✓ Berhasil memindai ${files.length} foto mentah! Foto siap di-push ke client.`,
      booking: updated
    });
  } catch (err) {
    console.error(`[DriveScraper Error for Booking #${bookingId}]:`, err);
    db.prepare("UPDATE bookings SET selection_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);
    res.status(500).json({ error: 'Gagal memindai folder Google Drive: ' + err.message });
  }
});


// POST /bookings/:booking_id/publish-staging — Admin publishes staging gallery for client selection
router.post('/bookings/:booking_id/publish-staging', [
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


// POST /bookings/:booking_id/unlock-final-editing — Admin kirim link hasil final editing ke klien
router.post('/bookings/:booking_id/unlock-final-editing', [
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
    return res.status(400).json({ error: 'Gate 2 belum lulus: Pelunasan belum terverifikasi. Tidak dapat mengirim link hasil foto.' });
  }

  // ── Guard is_session_done: Sesi foto harus sudah ditandai selesai ─────────
  if (!booking.is_session_done) {
    return res.status(400).json({ error: 'Sesi pemotretan belum ditandai selesai. Tandai sesi selesai terlebih dahulu.' });
  }

  if (!['post_production', 'delivered'].includes(booking.status)) {
    return res.status(400).json({ error: 'Booking belum memasuki tahap post-production. Aktifkan galeri terlebih dahulu.' });
  }

  // Update booking with download link and set status to delivered
  db.prepare('UPDATE bookings SET status = ?, download_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('delivered', download_url, bookingId);

  // Update assignment status if exists
  const assignment = db.prepare('SELECT id FROM assignments WHERE booking_id = ?').get(bookingId);
  if (assignment) {
    db.prepare("UPDATE assignments SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(assignment.id);
  }

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  ensureBookingToken(updated, db);

  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = getTrackingUrl(req, updated);

  const driveParentUrl = updated.drive_parent_url || download_url;
  let waMessage = (templates.delivery_ready || '')
    .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
    .replace('{drive_parent_url}', driveParentUrl)
    .replace('{download_url}', driveParentUrl)
    .replace('{tracking_url}', trackingUrl)
    .replace('{password}', password)
    .replace('{admin_phone}', settings.adminPhone)
    .replace('{booking_id}', updated.id);

  const waLink = `https://api.whatsapp.com/send?phone=${updated.client_phone}&text=${encodeURIComponent(waMessage)}`;

  res.json({
    success: true,
    message: 'Link Drive hasil akhir berhasil dikirim ke client!',
    wa_link_client: waLink,
    status: 'delivered'
  });
});

// POST /bookings/:booking_id/upload-highlight-link — Admin upload Highlight Drive link ke klien
// [Menggantikan /post-production/:id/send-highlight-link]
router.post('/bookings/:booking_id/upload-highlight-link', [
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

  // Clear gallery cache disk — galeri tidak diperlukan setelah admin upload highlight
  clearGalleryCache(bookingId);

  // Auto-create/update entry in portfolio_items table as DRAFT (published = 0) for admin review before publishing
  try {
    const nameParts = (booking.client_name || 'Client').trim().split(/\s+/);
    const initial = nameParts.map(p => p[0]?.toUpperCase() || '').join('').substring(0, 5) || 'CL';
    const year = booking.graduation_date ? new Date(booking.graduation_date).getFullYear() : new Date().getFullYear();
    const fgAssignment = db.prepare('SELECT f.name FROM assignments a JOIN freelancers f ON a.fg_id = f.id WHERE a.booking_id = ?').get(bookingId);

    const existingPorto = db.prepare('SELECT id FROM portfolio_items WHERE booking_id = ?').get(bookingId);
    if (!existingPorto) {
      db.prepare(`
        INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      `).run(
        bookingId,
        initial,
        year,
        booking.university || 'Universitas',
        booking.city || null,
        highlight_drive_url,
        JSON.stringify([highlight_drive_url]),
        fgAssignment?.name || null
      );
    } else {
      db.prepare(`
        UPDATE portfolio_items
        SET cover_photo_url = ?, highlight_photos = ?, published = 0, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ?
      `).run(
        highlight_drive_url,
        JSON.stringify([highlight_drive_url]),
        bookingId
      );
    }

    // Catat ke portfolio_import_jobs agar terpantau di Global Queue Widget
    db.prepare(`
      INSERT INTO portfolio_import_jobs (client_initial, graduation_year, university, drive_url, status, total_photos, processed_photos)
      VALUES (?, ?, ?, ?, 'completed', 1, 1)
    `).run(initial, year, booking.university || 'Universitas', highlight_drive_url);
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
    message: 'Link Highlight tersimpan! Foto highlight sedang diimpor ke Portofolio.',
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
    // Hapus thumbnail cache dari disk sebelum clear DB
    try {
      clearGalleryCache(bookingId);
    } catch (e) {
      console.warn(`[CleanStaging] Gagal clear gallery cache Booking #${bookingId}:`, e.message);
    }

    // Clear staging_files dari DB
    db.prepare("UPDATE bookings SET staging_files = NULL, selection_status = 'cleaned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);
    res.json({ success: true, message: `Staging booking #${bookingId} berhasil dibersihkan.` });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membersihkan folder staging: ' + e.message });
  }
});

// POST /bookings/:id/reopen-selection — Reopen client selection gallery and add photos
router.post('/bookings/:id/reopen-selection', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const bookingId = req.params.id;
  try {
    const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    const additionalPhotos = parseInt(req.body.additional_photos) || 0;
    db.prepare("UPDATE bookings SET selection_status = 'ready', additional_photos = additional_photos + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(additionalPhotos, bookingId);

    res.json({
      success: true,
      message: 'Galeri seleksi berhasil dibuka kembali untuk client!'
    });
  } catch (err) {
    console.error('Reopen selection error:', err);
    res.status(500).json({ error: 'Gagal membuka kembali galeri seleksi: ' + err.message });
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
    let ba = {};
    try { ba = JSON.parse(p.bank_account || '{}'); } catch { ba = {}; }
    p.bank_account = {
      bank: ba.bank || '',
      norek: ba.norek || ba.number || '',
      number: ba.number || ba.norek || '',
      atas_nama: ba.atas_nama || ba.name || '',
      name: ba.name || ba.atas_nama || ''
    };
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

  const waLink = `https://api.whatsapp.com/send?phone=${fgPhone}&text=${encodeURIComponent(waMessage)}`;

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
    .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
    .replace('{period_start}', formatDate(payout.period_start))
    .replace('{period_end}', formatDate(payout.period_end))
    .replace('{total_payout}', formatCurrency(payout.total_payout))
    .replace('{slip_url}', slip_url || '-');

  const waLink = `https://api.whatsapp.com/send?phone=${fg.phone}&text=${encodeURIComponent(waMessage)}`;

  const updated = db.prepare('SELECT * FROM payouts WHERE id = ?').get(req.params.id);
  res.json({ payout: updated, wa_link: waLink });
});

// ============ PORTFOLIO ============
router.get('/portfolio', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, published, featured, city } = req.query;
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
  if (city) {
    where += ' AND city = ?';
    params.push(city);
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
  body('client_initial').trim().isLength({ min: 1, max: 100 }).withMessage('Nama / inisial client wajib (max 100 karakter)'),
  body('graduation_year').optional({ checkFalsy: true }).isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib'),
  body('cover_photo_url').isURL().withMessage('Cover photo URL wajib'),
  body('highlight_photos').isArray({ min: 1, max: 500 }).withMessage('Highlight photos 1-500'),
  body('fg_name').optional().trim().isLength({ max: 100 }).withMessage('Nama FG max 100 karakter'),
  body('featured').optional().isBoolean().withMessage('Featured harus boolean'),
  handleValidation
], (req, res) => {
  const { booking_id, client_initial, graduation_year, university, cover_photo_url, highlight_photos, fg_name, featured } = req.body;
  const finalYear = graduation_year && Number(graduation_year) >= 2020 ? Number(graduation_year) : new Date().getFullYear();

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND status = ?').get(booking_id, 'completed');
  if (!booking) return res.status(400).json({ error: 'Booking tidak ditemukan atau belum completed' });

  const existing = db.prepare('SELECT id FROM portfolio_items WHERE booking_id = ?').get(booking_id);
  if (existing) return res.status(400).json({ error: 'Booking sudah dikurasi ke portfolio' });

  const isPublished = req.body.published === true || req.body.published === 1 ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(booking_id, client_initial, graduation_year, university, booking.city || null, cover_photo_url, JSON.stringify(highlight_photos), fg_name || null, featured ? 1 : 0, isPublished);

  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(result.lastInsertRowid);
  try { portfolio.highlight_photos = JSON.parse(portfolio.highlight_photos); } catch { portfolio.highlight_photos = []; }

  res.status(201).json(portfolio);
});

const updatePortfolioHandler = async (req, res) => {
  const { cover_photo_url, highlight_photos, featured, published, sort_order, client_initial, graduation_year, university, city, fg_name } = req.body;

  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!portfolio) return res.status(404).json({ error: 'Not found' });

  if (published && portfolio.booking_id) {
    const booking = db.prepare('SELECT portfolio_consent FROM bookings WHERE id = ?').get(portfolio.booking_id);
    if (booking && booking.portfolio_consent === 'declined') {
      return res.status(400).json({ error: 'Klien menolak persetujuan publikasi foto ini di portofolio.' });
    }
  }

  const updates = [];
  const params = [];

  const driveFolder = require('../services/drive-folder.service');

  if (cover_photo_url) { updates.push('cover_photo_url = ?'); params.push(cover_photo_url); }
  if (highlight_photos) {
    try {
      const oldList = JSON.parse(portfolio.highlight_photos || '[]');
      const newList = typeof highlight_photos === 'string' ? JSON.parse(highlight_photos) : highlight_photos;
      if (Array.isArray(oldList) && Array.isArray(newList)) {
        const removedPhotos = oldList.filter(oldUrl => !newList.includes(oldUrl));
        for (const oldUrl of removedPhotos) {
          if (oldUrl) {
            await driveFolder.deleteDriveFile(oldUrl);
          }
        }
      }
    } catch (e) { }
    updates.push('highlight_photos = ?');
    params.push(typeof highlight_photos === 'string' ? highlight_photos : JSON.stringify(highlight_photos));
  }
  if (featured !== undefined) { updates.push('featured = ?'); params.push(featured ? 1 : 0); }
  if (published !== undefined) { updates.push('published = ?'); params.push(published ? 1 : 0); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
  if (client_initial) { updates.push('client_initial = ?'); params.push(client_initial); }
  if (graduation_year) { updates.push('graduation_year = ?'); params.push(graduation_year); }
  if (university) { updates.push('university = ?'); params.push(university); }
  if (city !== undefined) { updates.push('city = ?'); params.push(city || null); }
  if (fg_name !== undefined) { updates.push('fg_name = ?'); params.push(fg_name); }
  if (req.body.rating !== undefined) { updates.push('rating = ?'); params.push(Math.min(5.0, Math.max(1.0, parseFloat(req.body.rating) || 5.0))); }
  if (req.body.feedback_notes !== undefined) { updates.push('feedback_notes = ?'); params.push(req.body.feedback_notes || null); }

  // Sync rename subfolder in Google Drive if metadata changed
  const newInitial = client_initial || portfolio.client_initial;
  const newUni = university || portfolio.university;
  const newYear = graduation_year || portfolio.graduation_year;
  if ((client_initial || university || graduation_year) && portfolio.drive_subfolder_id) {
    await driveFolder.renamePortfolioItemSubfolder(portfolio.drive_subfolder_id, newInitial, newUni, newYear);
  }

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
  body('rating').optional().isFloat({ min: 1.0, max: 5.0 }),
  body('feedback_notes').optional().trim(),
  handleValidation
], updatePortfolioHandler);

router.patch('/portfolio/:id', [
  param('id').isInt({ min: 1 }),
  body('cover_photo_url').optional(),
  body('highlight_photos').optional(),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('rating').optional().isFloat({ min: 1.0, max: 5.0 }),
  body('feedback_notes').optional().trim(),
  handleValidation
], updatePortfolioHandler);

// ============ PORTFOLIO UPLOAD & DRIVE IMPORT ============
const sharp = require('sharp');

async function runManualDriveImportInBackground(jobId, folderId, options) {
  const { portfolio_id, booking_id, client_initial, graduation_year, normalizedUniversity, city, fg_name, featured, published } = options;
  const db = getDb();
  const driveFolder = require('../services/drive-folder.service');

  try {
    db.prepare("UPDATE portfolio_import_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);

    const subfolderId = await driveFolder.createPortfolioItemSubfolder(client_initial, normalizedUniversity, graduation_year);
    const highlightUrls = await driveFolder.copyDriveFilesCloudToCloud(folderId, subfolderId, (current, total) => {
      try {
        db.prepare("UPDATE portfolio_import_jobs SET total_photos = ?, processed_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(total, current, jobId);
      } catch (e) {}
    });

    if (!highlightUrls || highlightUrls.length === 0) {
      throw new Error('Gagal menyalin file gambar dari Drive. Pastikan link Drive publik dan memiliki file gambar.');
    }

    const coverPhotoUrl = highlightUrls[0];
    db.prepare("UPDATE portfolio_import_jobs SET total_photos = ?, processed_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(highlightUrls.length, highlightUrls.length, jobId);

    let targetId = portfolio_id;
    if (targetId) {
      db.prepare(`
        UPDATE portfolio_items
        SET client_initial = ?, graduation_year = ?, university = ?, city = ?, cover_photo_url = ?, highlight_photos = ?, fg_name = ?, featured = ?, published = ?, drive_subfolder_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(client_initial, graduation_year, normalizedUniversity, city || null, coverPhotoUrl, JSON.stringify(highlightUrls), fg_name || null, featured ? 1 : 0, published ? 1 : 0, subfolderId, targetId);
    } else {
      const result = db.prepare(`
        INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published, drive_subfolder_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(booking_id || null, client_initial, graduation_year, normalizedUniversity, city || null, coverPhotoUrl, JSON.stringify(highlightUrls), fg_name || null, featured ? 1 : 0, published ? 1 : 0, subfolderId);
      targetId = result.lastInsertRowid;
    }

    db.prepare("UPDATE portfolio_import_jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);
    console.log(`[DriveImporter] Manual portfolio import job #${jobId} completed successfully with ${highlightUrls.length} Google Drive CDN photos.`);
  } catch (err) {
    console.error(`[DriveImporter Manual Import Error, Job #${jobId}]:`, err.message);
    db.prepare("UPDATE portfolio_import_jobs SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(err.message || 'Unknown error', jobId);
  }
}

router.post('/portfolio/import-drive', [
  body('drive_url').trim().isLength({ min: 5 }).withMessage('Link Google Drive wajib'),
  body('client_initial').trim().isLength({ min: 1, max: 100 }).withMessage('Nama / inisial client wajib (max 100 karakter)'),
  body('graduation_year').optional({ checkFalsy: true }).toInt().isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid (2020-2030)'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib (min 2 karakter)'),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('fg_name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('featured').optional({ checkFalsy: true }).isBoolean(),
  body('published').optional({ checkFalsy: true }).isBoolean(),
  body('portfolio_id').optional({ checkFalsy: true }).toInt(),
  body('booking_id').optional({ checkFalsy: true }).toInt(),
  handleValidation
], async (req, res) => {
  try {
    const { drive_url, client_initial, graduation_year, university, city, fg_name, featured, published, portfolio_id, booking_id } = req.body;
    const finalYear = graduation_year && Number(graduation_year) >= 2020 ? Number(graduation_year) : new Date().getFullYear();
    const normalizedUniversity = normalizeUniversity(university);

    const match = drive_url.match(/folders\/([a-zA-Z0-9-_]+)/) || drive_url.match(/[?&]id=([a-zA-Z0-9-_]+)/) || drive_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const folderId = match ? match[1] : drive_url.trim();

    if (!folderId || folderId.length < 10) {
      return res.status(400).json({ error: 'Format link Google Drive folder tidak valid. Gunakan link folder Google Drive.' });
    }

    // Insert job with 'pending' status
    const insertJob = db.prepare(`
      INSERT INTO portfolio_import_jobs (client_initial, graduation_year, university, drive_url, status, total_photos, processed_photos)
      VALUES (?, ?, ?, ?, 'pending', 0, 0)
    `).run(client_initial, finalYear, normalizedUniversity, drive_url);
    const jobId = insertJob.lastInsertRowid;

    // Trigger background processing
    runManualDriveImportInBackground(jobId, folderId, {
      portfolio_id,
      booking_id: booking_id || null,
      client_initial,
      graduation_year,
      normalizedUniversity,
      city,
      fg_name,
      featured,
      published
    }).catch(err => {
      console.error(`[Background Manual Import Error for Job #${jobId}]:`, err);
    });

    res.status(202).json({
      success: true,
      message: 'Proses impor Google Drive berhasil dimulai di latar belakang.',
      jobId
    });
  } catch (err) {
    console.error('Failed to create manual import job:', err);
    res.status(500).json({ error: 'Gagal menginisiasi pekerjaan impor Google Drive: ' + err.message });
  }
});

router.get('/portfolio/import-jobs', (req, res) => {
  try {
    // Auto-mark stale jobs (no update for > 15 mins) as failed
    db.prepare(`
      UPDATE portfolio_import_jobs
      SET status = 'failed', error_message = 'Proses terhenti karena koneksi terputus atau server di-restart', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('pending', 'processing')
        AND datetime(updated_at) < datetime('now', '-15 minutes')
    `).run();

    // Return all pending/processing jobs plus jobs completed/failed in the last 1 hour
    const jobs = db.prepare(`
      SELECT * FROM portfolio_import_jobs
      WHERE status IN ('pending', 'processing')
         OR (status IN ('completed', 'failed') AND datetime(updated_at) >= datetime('now', '-1 hour'))
      ORDER BY created_at DESC
    `).all();
    res.json(jobs);
  } catch (err) {
    console.error('Failed to query import jobs:', err);
    res.status(500).json({ error: 'Internal database error' });
  }
});

router.delete('/portfolio/import-jobs/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM portfolio_import_jobs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete import job:', err);
    res.status(500).json({ error: 'Internal database error' });
  }
});

router.post('/portfolio', [
  body('client_initial').trim().isLength({ min: 1, max: 100 }).withMessage('Nama / inisial client wajib (max 100 karakter)'),
  body('graduation_year').optional({ checkFalsy: true }).isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib'),
  body('city').optional().trim().isLength({ max: 100 }),
  body('cover_photo_url').optional({ checkFalsy: true }).trim(),
  body('highlight_photos').optional(),
  body('fg_name').optional().trim().isLength({ max: 100 }),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('booking_id').optional({ values: 'falsy' }).isInt(),
  handleValidation
], (req, res) => {
  const { client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published, booking_id } = req.body;
  const finalYear = graduation_year && Number(graduation_year) >= 2020 ? Number(graduation_year) : new Date().getFullYear();

  if (published && booking_id) {
    const booking = db.prepare('SELECT portfolio_consent FROM bookings WHERE id = ?').get(booking_id);
    if (booking && booking.portfolio_consent === 'declined') {
      return res.status(400).json({ error: 'Klien menolak persetujuan publikasi foto ini di portofolio.' });
    }
  }

  const normalizedUniversity = normalizeUniversity(university);

  let highlights = [];
  if (Array.isArray(highlight_photos)) highlights = highlight_photos;
  else if (typeof highlight_photos === 'string') {
    try { highlights = JSON.parse(highlight_photos); } catch { highlights = [cover_photo_url]; }
  }
  if (highlights.length === 0 && cover_photo_url) {
    highlights = [cover_photo_url];
  }

  const result = db.prepare(`
    INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    booking_id || null,
    client_initial,
    finalYear,
    normalizedUniversity,
    city || null,
    cover_photo_url || '',
    JSON.stringify(highlights),
    fg_name || null,
    featured ? 1 : 0,
    published ? 1 : 0
  );

  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(result.lastInsertRowid);
  try { portfolio.highlight_photos = JSON.parse(portfolio.highlight_photos); } catch { portfolio.highlight_photos = []; }

  res.status(201).json(portfolio);
});

// ============ PORTFOLIO MANUAL UPLOAD (100% GOOGLE DRIVE DIRECT STREAM) ============
router.post('/portfolio/upload', requireAuth, async (req, res) => {
  let file = null;
  if (req.files && req.files.file) {
    file = req.files.file;
  } else if (req.files && req.files.cover) {
    file = req.files.cover;
  }

  if (Array.isArray(file)) {
    file = file[0];
  }

  if (!file) return res.status(400).json({ error: 'File wajib' });

  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.name).toLowerCase();
  if (!allowed.includes(ext)) {
    return res.status(400).json({ error: 'Format harus jpg/png/webp' });
  }

  try {
    const fileBuffer = (file.data && file.data.length > 0)
      ? file.data
      : (file.tempFilePath && fs.existsSync(file.tempFilePath) ? fs.readFileSync(file.tempFilePath) : null);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'Buffer file upload kosong' });
    }

    const driveFolder = require('../services/drive-folder.service');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const subfolderId = req.query.subfolder_id || req.body?.subfolder_id || null;
    const client = req.query.client || req.body?.client || req.query.client_initial || req.body?.client_initial || '';
    const university = req.query.university || req.body?.university || '';
    const year = req.query.year || req.body?.year || req.query.graduation_year || req.body?.graduation_year || '';

    let url = '';
    if (subfolderId) {
      url = await driveFolder.uploadPortfolioPhotoToDrive(filename, file.mimetype || 'image/jpeg', fileBuffer, subfolderId);
    } else if (client || university) {
      url = await driveFolder.uploadPortfolioPhotoToDrive(filename, file.mimetype || 'image/jpeg', fileBuffer, null, {
        client_initial: client,
        university,
        graduation_year: year
      });
    } else {
      url = await driveFolder.uploadPortfolioPhotoToDrive(filename, file.mimetype || 'image/jpeg', fileBuffer);
    }

    console.log(`[Portfolio] Directly uploaded image stream to Google Drive CDN (${url})`);
    res.json({ url, filename, subfolder_id: subfolderId });
  } catch (e) {
    console.error('Portfolio image upload processing error:', e);
    res.status(500).json({ error: 'Gagal proses gambar: ' + e.message });
  }
});

router.post('/portfolio/create-subfolder', requireAuth, async (req, res) => {
  try {
    const { client_initial, university, graduation_year } = req.body;
    const driveFolder = require('../services/drive-folder.service');
    const normalizedUniv = normalizeUniversity(university || '');
    const subfolderId = await driveFolder.createPortfolioItemSubfolder(client_initial || 'portfolio', normalizedUniv || 'general', graduation_year || new Date().getFullYear());
    res.json({ success: true, subfolder_id: subfolderId });
  } catch (err) {
    console.error('Failed to create portfolio subfolder:', err);
    res.status(500).json({ error: 'Gagal membuat subfolder Google Drive: ' + err.message });
  }
});

// ============ PORTFOLIO DELETE (100% GOOGLE DRIVE API TRASH VIA SUBFOLDER) ============
router.delete('/portfolio/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], async (req, res) => {
  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!portfolio) return res.status(404).json({ error: 'Not found' });

  try {
    const driveFolder = require('../services/drive-folder.service');
    // Jika ada subfolder ID, hapus 1 subfolder utama (menghapus seluruh foto di dalamnya secara otomatis dalam 0.3s)
    if (portfolio.drive_subfolder_id) {
      await driveFolder.deleteDriveFile(portfolio.drive_subfolder_id);
    } else {
      // Fallback untuk portfolio lama tanpa subfolder: hapus per file
      const allUrls = [portfolio.cover_photo_url];
      if (portfolio.highlight_photos) {
        try {
          const parsed = JSON.parse(portfolio.highlight_photos);
          if (Array.isArray(parsed)) allUrls.push(...parsed);
        } catch { }
      }
      for (const u of allUrls) {
        if (u) {
          await driveFolder.deleteDriveFile(u);
        }
      }
    }
  } catch (e) {
    console.warn('Cleanup portfolio drive files error (non-fatal):', e.message);
  }

  db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(req.params.id);
  res.json({ success: true, status: 'deleted' });
});

// ============ BACKUP MONITOR STATUS ============
router.get('/settings/backup-status', (req, res) => {
  try {
    const backupDir = getSetting('backup_path', process.env.BACKUP_PATH || './DATA/backups');
    let resolvedPath = path.resolve(backupDir);

    if (!fs.existsSync(resolvedPath)) {
      try { fs.mkdirSync(resolvedPath, { recursive: true }); } catch (e) {}
    }

    let files = [];
    if (fs.existsSync(resolvedPath)) {
      files = fs.readdirSync(resolvedPath)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const fullPath = path.join(resolvedPath, f);
          const stat = fs.statSync(fullPath);
          return {
            filename: f,
            size_bytes: stat.size,
            size_kb: Math.round(stat.size / 1024),
            size_mb: (stat.size / (1024 * 1024)).toFixed(2),
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime - a.mtime);
    }

    // Fallback: If 0 files found in custom backupDir, also scan default ./DATA/backups
    const defaultResolved = path.resolve('./DATA/backups');
    if (files.length === 0 && resolvedPath !== defaultResolved && fs.existsSync(defaultResolved)) {
      const defaultFiles = fs.readdirSync(defaultResolved)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const fullPath = path.join(defaultResolved, f);
          const stat = fs.statSync(fullPath);
          return {
            filename: f,
            size_bytes: stat.size,
            size_kb: Math.round(stat.size / 1024),
            size_mb: (stat.size / (1024 * 1024)).toFixed(2),
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime - a.mtime);
      if (defaultFiles.length > 0) {
        files = defaultFiles;
        resolvedPath = defaultResolved;
      }
    }

    const latest = files.length > 0 ? files[0] : null;

    const cronHour = getSetting('backup_cron_hour', '02:00');
    const cronEnabled = getSetting('backup_cron_enabled', 'true') === 'true';

    res.json({
      active: cronEnabled,
      backup_path: backupDir,
      resolved_path: resolvedPath,
      total_backups: files.length,
      latest_backup: latest ? {
        filename: latest.filename,
        size_mb: latest.size_mb + ' MB',
        size_kb: latest.size_kb + ' KB',
        mtime: latest.mtime,
        created_at: latest.mtime.toISOString()
      } : null,
      cron_hour: cronHour,
      cron_enabled: cronEnabled,
      cron_schedule: `Setiap Hari Jam ${cronHour} WITA`,
      retention_policy: '30 Hari Retensi Otomatis'
    });
  } catch (err) {
    console.error('Backup status error:', err);
    res.status(500).json({ error: 'Gagal membaca status backup: ' + err.message });
  }
});

// ============ UPDATE BACKUP SCHEDULE ============
router.post('/settings/backup-schedule', (req, res) => {
  try {
    const { cron_hour, cron_enabled } = req.body;
    if (cron_hour !== undefined) {
      setSetting('backup_cron_hour', cron_hour, 'Jam otomatisasi backup database (HH:MM)');
    }
    if (cron_enabled !== undefined) {
      setSetting('backup_cron_enabled', String(cron_enabled), 'Status aktif otomatisasi backup database');
    }
    res.json({
      success: true,
      message: `Jadwal backup otomatis berhasil diperbarui: Jam ${cron_hour || '02:00'} WITA (${cron_enabled !== false ? 'Aktif' : 'Non-Aktif'})`,
      cron_hour: cron_hour || '02:00',
      cron_enabled: cron_enabled !== false
    });
  } catch (err) {
    res.status(400).json({ error: 'Gagal memperbarui jadwal backup: ' + err.message });
  }
});

// ============ DOWNLOAD LATEST BACKUP ============
router.get('/settings/backup-download', (req, res) => {
  try {
    const configSettings = getSettings();
    const backupDir = configSettings.backupPath || './DATA/backups';
    const resolvedPath = path.resolve(backupDir);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Folder backup belum ada' });
    }

    const files = fs.readdirSync(resolvedPath)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        filename: f,
        fullPath: path.join(resolvedPath, f),
        mtime: fs.statSync(path.join(resolvedPath, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return res.status(404).json({ error: 'Belum ada file backup database' });
    }

    const targetFile = req.query.file ? path.join(resolvedPath, path.basename(req.query.file)) : files[0].fullPath;

    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'File backup tidak ditemukan' });
    }

    res.download(targetFile, path.basename(targetFile));
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Gagal mendownload backup: ' + err.message });
  }
});

// ============ GOOGLE DRIVE CLOUD STORAGE MONITOR STATUS ============
router.get('/settings/storage-status', async (req, res) => {
  try {
    const authClient = driveFolder.getOAuth2Client();
    if (!authClient) {
      return res.json({
        is_cloud: true,
        linked: false,
        message: 'Google Drive belum dikonfigurasi. Tautkan Akun Google Studio di Settings.',
        storage: {
          used_bytes: 0,
          limit_bytes: 16106127360,
          used_gb: '0.00 GB',
          used_mb: '0.00 MB',
          limit_gb: '15.00 GB',
          trash_mb: '0.00 MB',
          percent: 0,
          user_email: '-',
          portfolio: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 },
          clients: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 }
        }
      });
    }

    const { google } = require('googleapis');
    const drive = google.drive({ version: 'v3', auth: authClient });
    const about = await drive.about.get({ fields: 'storageQuota, user' });
    const quota = about.data.storageQuota || {};
    const user = about.data.user || {};

    const limitBytes = parseInt(quota.limit || 0, 10);
    const usageBytes = parseInt(quota.usage || 0, 10);
    const usageInTrashBytes = parseInt(quota.usageInDriveTrash || 0, 10);

    const limitGB = limitBytes > 0 ? (limitBytes / (1024 * 1024 * 1024)).toFixed(2) : '15.00';
    const usedGB = usageBytes > 0 ? (usageBytes / (1024 * 1024 * 1024)).toFixed(2) : '0.00';
    const usedMB = usageBytes > 0 ? (usageBytes / (1024 * 1024)).toFixed(2) : '0.00';
    const trashMB = usageInTrashBytes > 0 ? (usageInTrashBytes / (1024 * 1024)).toFixed(2) : '0.00';

    const percent = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;

    // Helper to calculate recursive size and file count for a folder
    const getFolderStats = async (folderId) => {
      if (!folderId) return { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 };
      try {
        let totalSize = 0;
        let totalFiles = 0;
        let pageToken = null;
        do {
          const query = `'${folderId}' in parents and trashed = false`;
          const resFiles = await drive.files.list({
            q: query,
            fields: 'nextPageToken, files(id, size, mimeType)',
            pageSize: 1000,
            pageToken
          });
          const files = resFiles.data.files || [];
          for (const f of files) {
            if (f.mimeType !== 'application/vnd.google-apps.folder') {
              totalSize += parseInt(f.size || 0, 10);
              totalFiles += 1;
            }
          }
          pageToken = resFiles.data.nextPageToken;
        } while (pageToken);

        const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        const sizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
        const sizeFormatted = totalSize >= 1024 * 1024 * 1024 ? `${sizeGB} GB` : `${sizeMB} MB`;

        return {
          size_bytes: totalSize,
          size_formatted: sizeFormatted,
          files_count: totalFiles
        };
      } catch (err) {
        return { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 };
      }
    };

    const portfolioFolderId = getSetting('google_drive_portfolio_folder_id', '');
    const clientsFolderId = getSetting('google_drive_master_folder_id', '');

    const [portfolioStats, clientsStats] = await Promise.all([
      getFolderStats(portfolioFolderId),
      getFolderStats(clientsFolderId)
    ]);

    res.json({
      is_cloud: true,
      linked: true,
      storage: {
        used_bytes: usageBytes,
        limit_bytes: limitBytes,
        used_gb: usedGB + ' GB',
        used_mb: usedMB + ' MB',
        limit_gb: limitGB + ' GB',
        trash_mb: trashMB + ' MB',
        percent: percent,
        user_email: user.emailAddress || 'Gmail Studio Tertaot',
        portfolio: portfolioStats,
        clients: clientsStats
      }
    });
  } catch (err) {
    res.json({
      is_cloud: true,
      linked: false,
      message: 'Gagal membaca kuota Google Drive: ' + err.message,
      storage: {
        used_bytes: 0,
        limit_bytes: 16106127360,
        used_gb: '0.00 GB',
        used_mb: '0.00 MB',
        limit_gb: '15.00 GB',
        trash_mb: '0.00 MB',
        percent: 0,
        user_email: '-',
        portfolio: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 },
        clients: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 }
      }
    });
  }
});

// ============ VERIFY PATH EXISTENCE & ACCESS ============
router.post('/settings/verify-path', [
  body('target_path').trim().notEmpty().withMessage('Path folder wajib diisi'),
  handleValidation
], (req, res) => {
  try {
    const targetPath = req.body.target_path;
    const resolved = path.resolve(targetPath);

    let exists = fs.existsSync(resolved);
    let created = false;

    if (!exists) {
      try {
        fs.mkdirSync(resolved, { recursive: true });
        exists = true;
        created = true;
      } catch (mkdirErr) {
        return res.status(400).json({
          valid: false,
          error: `Folder tidak ada dan gagal dibuat: ${mkdirErr.message}`,
          resolved_path: resolved
        });
      }
    }

    // Test write permission
    const testFile = path.join(resolved, `.write_test_${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test_access', 'utf8');
    fs.unlinkSync(testFile);

    res.json({
      valid: true,
      resolved_path: resolved,
      created: created,
      writable: true,
      message: `✅ Path folder valid & berstatus Writable: ${resolved}`
    });
  } catch (err) {
    res.status(400).json({
      valid: false,
      error: `Path folder tidak dapat diakses atau ditulisi: ${err.message}`,
      resolved_path: req.body.target_path
    });
  }
});

// ============ BROWSE DIRECTORIES FOR FILE EXPLORER MODAL ============
router.get('/settings/browse-directories', (req, res) => {
  try {
    let targetPath = req.query.target_path ? req.query.target_path.trim() : process.cwd();
    let resolved = path.resolve(targetPath);

    if (!fs.existsSync(resolved)) {
      resolved = process.cwd();
    }

    const items = fs.readdirSync(resolved, { withFileTypes: true });
    const directories = [];

    for (const item of items) {
      if (item.isDirectory()) {
        if (item.name.startsWith('.') && item.name !== '.DATA') continue;
        directories.push({
          name: item.name,
          path: path.join(resolved, item.name)
        });
      }
    }

    directories.sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = path.dirname(resolved) !== resolved ? path.dirname(resolved) : null;

    res.json({
      current_path: resolved,
      parent_path: parentPath,
      directories: directories
    });
  } catch (err) {
    console.error('Browse directories error:', err);
    res.status(500).json({ error: 'Gagal menelusuri direktori: ' + err.message });
  }
});

// ============ CREATE NEW DIRECTORY FROM EXPLORER MODAL ============
router.post('/settings/create-directory', [
  body('parent_path').trim().notEmpty().withMessage('Parent path wajib diisi'),
  body('folder_name').trim().notEmpty().withMessage('Nama folder baru wajib diisi'),
  handleValidation
], (req, res) => {
  try {
    const parentPath = path.resolve(req.body.parent_path);
    const folderName = req.body.folder_name.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim();

    if (!fs.existsSync(parentPath)) {
      return res.status(400).json({ error: 'Parent directory tidak ditemukan di server' });
    }

    const newFolderPath = path.join(parentPath, folderName);
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath, { recursive: true });
    }

    res.json({
      success: true,
      new_path: newFolderPath,
      message: `✓ Folder '${folderName}' berhasil dibuat!`
    });
  } catch (err) {
    console.error('Create directory error:', err);
    res.status(500).json({ error: 'Gagal membuat folder baru: ' + err.message });
  }
});

// ============ SETTINGS ============
router.get('/settings', (req, res) => {
  const settings = getSettings();
  const templates = getWaTemplates();

  // Don't expose sensitive
  const { sessionSecret, adminPassword, ...safeSettings } = settings;

  const isUploadPathConfiguredInDb = getSetting('upload_path', null) !== null;
  const isBackupPathConfiguredInDb = getSetting('backup_path', null) !== null;
  safeSettings.storage_needs_setup = !isUploadPathConfiguredInDb || !isBackupPathConfiguredInDb;

  res.json({ settings: safeSettings, wa_templates: templates });
});

const updateSettingsHandler = [
  body('companyName').optional().trim().isLength({ max: 100 }),
  body('companyPhone').optional().trim().isLength({ max: 20 }),
  body('companyAddress').optional().trim().isLength({ max: 200 }),
  body('adminPhone').optional().trim(),
  body('dp_percentage').optional().isInt({ min: 10, max: 100 }),
  body('upload_deadline_days').optional().isInt({ min: 1, max: 30 }),
  body('auto_approve_hours').optional().isInt({ min: 1, max: 168 }),
  body('max_photos_per_fg_per_day').optional().isInt({ min: 1, max: 10 }),
  body('dp_expired_days').optional().isInt({ min: 1, max: 30 }),
  body('bank_accounts').optional().isArray(),
  body('invoice_prefix').optional().trim().isLength({ max: 20 }),
  body('session_timeout_minutes').optional().isInt({ min: 60, max: 1440 }),
  body('portfolio_limit').optional().isInt({ min: 1, max: 10000 }),
  body('seo_domain').optional().trim(),
  body('seo_title').optional().trim(),
  body('seo_description').optional().trim(),
  body('seo_keywords').optional().trim(),
  body('google_site_verification').optional().trim(),
  body('google_drive_master_folder_id').optional().trim(),
  body('google_drive_api_key').optional().trim(),
  // AUD-01 FIX: google_oauth_client_id & google_oauth_client_secret DILARANG diubah via endpoint
  // umum POST/PUT /settings. Wajib melalui POST /settings/verify-oauth-credentials yang menjalankan
  // probe test ke https://oauth2.googleapis.com/token terlebih dahulu.
  // body('google_oauth_client_id').optional().trim(),    // DIBLOKIR — gunakan /verify-oauth-credentials
  // body('google_oauth_client_secret').optional().trim(), // DIBLOKIR — gunakan /verify-oauth-credentials
  body('backup_path').optional().trim(),
  body('supported_cities').optional().isArray(),
  body('drive_retention_months').optional().isInt({ min: 1, max: 12 }),
  body('drive_auto_trash_enabled').optional().isBoolean(),
  body('enable_freelance_portal').optional().custom(v => v === '0' || v === '1' || v === 0 || v === 1 || typeof v === 'boolean'),
  body('smtp_host').optional().trim(),
  body('smtp_port').optional().isInt({ min: 1, max: 65535 }),
  body('smtp_user').optional().trim(),
  body('smtp_pass').optional().trim(),
  body('smtp_secure').optional().custom(v => v === '0' || v === '1' || v === 0 || v === 1 || typeof v === 'boolean'),
  body('smtp_from_name').optional().trim(),
  body('smtp_from_email').optional().trim(),
  handleValidation,
  (req, res) => {
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
      'max_photos_per_fg_per_day', 'dp_expired_days', 'bank_accounts', 'invoice_prefix',
      'session_timeout_minutes', 'portfolio_limit',
      'seo_domain', 'seo_title', 'seo_description', 'seo_keywords',
      'seo_og_image', 'google_site_verification', 'supported_cities',
      'google_drive_master_folder_id', 'google_drive_portfolio_folder_id', 'google_drive_api_key',
      // AUD-01 FIX: 'google_oauth_client_id' dan 'google_oauth_client_secret' DIHAPUS dari allowed.
      // Dua kunci ini HANYA bisa diubah melalui POST /settings/verify-oauth-credentials
      // yang menjalankan mandatory probe test ke Google API sebelum menyimpan.
      'backup_path', 'backupPath',
      'drive_retention_months', 'drive_auto_trash_enabled', 'enable_freelance_portal', 'fg_auto_rotate_tokens_enabled', 'app_url', 'domain_url',
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'smtp_from_name', 'smtp_from_email'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        setSetting(key, req.body[key]);
      }
    }

    res.json(getSettings());
  }];

router.put('/settings', ...updateSettingsHandler);
router.post('/settings', ...updateSettingsHandler);

// POST /api/admin/settings/verify-smtp — Verify SMTP Server Connection
router.post('/settings/verify-smtp', async (req, res) => {
  try {
    const emailService = require('../services/email.service');
    const result = await emailService.verifySmtpConnection(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Gagal terhubung ke Server SMTP: ' + e.message });
  }
});

// POST /api/admin/settings/send-test-email — Send Test Email via SMTP
router.post('/settings/send-test-email', async (req, res) => {
  try {
    const { target_email, ...smtpConfig } = req.body;
    if (!target_email) {
      return res.status(400).json({ ok: false, error: 'Email tujuan wajib diisi.' });
    }
    const emailService = require('../services/email.service');
    const result = await emailService.sendTestEmail(smtpConfig, target_email);
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Gagal mengirim email uji coba: ' + e.message });
  }
});

router.post('/settings/verify-oauth-credentials', [
  body('google_oauth_client_id').trim().isLength({ min: 10 }).withMessage('Client ID wajib diisi'),
  body('google_oauth_client_secret').trim().isLength({ min: 5 }).withMessage('Client Secret wajib diisi'),
  handleValidation
], async (req, res) => {
  try {
    const { google_oauth_client_id, google_oauth_client_secret } = req.body;

    // Send probe test to Google OAuth token endpoint to verify if client_id and client_secret match
    const probeParams = new URLSearchParams({
      client_id: google_oauth_client_id,
      client_secret: google_oauth_client_secret,
      grant_type: 'authorization_code',
      code: 'probe_test_verification'
    });

    const googleRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: probeParams.toString()
    });

    const googleData = await googleRes.json();

    if (googleData.error === 'invalid_client') {
      return res.status(400).json({
        error: '❌ Client ID dan Client Secret tidak cocok / salah. Google menolak kredensial ini. Mohon periksa kembali pasangan Client ID & Secret di Google Cloud Console.'
      });
    }

    // Save to database settings table since verification passed (invalid_grant or token probe response confirms valid matched credentials)
    setSetting('google_oauth_client_id', google_oauth_client_id);
    setSetting('google_oauth_client_secret', google_oauth_client_secret);

    res.json({
      success: true,
      message: '✅ Pasangan Client ID & Client Secret berhasil diverifikasi cocok oleh Google dan disimpan!'
    });
  } catch (err) {
    console.error('Verify OAuth credentials error:', err);
    res.status(500).json({ error: 'Gagal menghubungi server verifikasi Google: ' + err.message });
  }
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
    const user = db.prepare('SELECT id, username, name, role, avatar_url FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (user.avatar_url) {
      try {
        const fs = require('fs');
        const path = require('path');
        const cleanPath = user.avatar_url.split('?')[0];
        const filePath = path.join(__dirname, '../../public', cleanPath);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          user.avatar_url = `${cleanPath}?t=${stats.mtimeMs}`;
        }
      } catch (e) { }
    }

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

    db.prepare('UPDATE users SET name = ?, username = ? WHERE id = ?').run(name, username, req.user.id);
    const updated = db.prepare('SELECT id, username, name, role, avatar_url FROM users WHERE id = ?').get(req.user.id);

    if (updated.avatar_url) {
      try {
        const fs = require('fs');
        const path = require('path');
        const cleanPath = updated.avatar_url.split('?')[0];
        const filePath = path.join(__dirname, '../../public', cleanPath);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          updated.avatar_url = `${cleanPath}?t=${stats.mtimeMs}`;
        }
      } catch (e) { }
    }

    res.json({ user: updated, message: 'Profil berhasil diperbarui' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});

router.post('/profile/avatar', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const avatarsDir = path.join(__dirname, '../../public/uploads/avatars');
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.avatar) {
      fileBuffer = req.files.avatar.data;
    } else if (req.body && req.body.avatar_data) {
      const matches = req.body.avatar_data.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file avatar' });

    const avatarPath = `avatar-${req.user.id}.png`;
    const avatarDest = path.join(avatarsDir, avatarPath);

    await sharp(fileBuffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .png({ quality: 80 })
      .toFile(avatarDest);

    const relativeUrl = `/uploads/avatars/${avatarPath}`;
    const cleanUrl = `${relativeUrl}?t=${Date.now()}`;

    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(relativeUrl, req.user.id);
    res.json({ avatar_url: cleanUrl, message: 'Foto profil berhasil diperbarui!' });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Gagal memperbarui foto profil' });
  }
});

router.delete('/profile/avatar', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');

    const avatarsDir = path.join(__dirname, '../../public/uploads/avatars');
    const avatarPath = `avatar-${req.user.id}.png`;
    const avatarDest = path.join(avatarsDir, avatarPath);

    if (fs.existsSync(avatarDest)) {
      fs.unlinkSync(avatarDest);
    }

    db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(req.user.id);
    res.json({ avatar_url: '', message: 'Foto profil berhasil dihapus!' });
  } catch (err) {
    console.error('Delete avatar error:', err);
    res.status(500).json({ error: 'Gagal menghapus foto profil' });
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

    const valid = await verifyPassword(req.body.current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Password saat ini salah' });

    const hash = await hashPassword(req.body.new_password);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Gagal ubah password' });
  }
});

router.post('/settings/verify-admin-password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password wajib diisi' });

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Password admin salah' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Verify admin password error:', err);
    res.status(500).json({ error: 'Gagal verifikasi password' });
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
    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');

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

    const timestamp = Date.now();
    const logoPath = `/uploads/branding/logo.png?v=${timestamp}`;
    const faviconPath = `/uploads/branding/favicon.png?v=${timestamp}`;
    setSetting('logo_url', logoPath);
    setSetting('favicon_url', faviconPath);
    const updatedSettings = getSettings();
    res.json({ logo_url: updatedSettings.logo_url || logoPath, message: 'Logo dan Favicon berhasil diperbarui!' });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Gagal upload logo' });
  }
});

router.delete('/settings/logo', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../public/uploads/branding');
    const logoDest = path.join(brandingDir, 'logo.png');
    const defaultAmsLogo = path.join(__dirname, '../../public/images/ams-logo.png');
    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');

    // 1. Delete custom logo
    if (fs.existsSync(logoDest)) {
      fs.unlinkSync(logoDest);
    }

    // 2. Restore default favicons from ams-logo.png
    if (fs.existsSync(defaultAmsLogo)) {
      await sharp(defaultAmsLogo)
        .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconPng);

      await sharp(defaultAmsLogo)
        .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconIco);
    } else {
      if (fs.existsSync(faviconPng)) fs.unlinkSync(faviconPng);
      if (fs.existsSync(faviconIco)) fs.unlinkSync(faviconIco);
    }

    setSetting('logo_url', '');
    setSetting('favicon_url', '');
    res.json({ logo_url: '', message: 'Logo berhasil dihapus!' });
  } catch (err) {
    console.error('Delete logo error:', err);
    res.status(500).json({ error: 'Gagal menghapus logo' });
  }
});

// ============ FAVICON UPLOAD ============
router.post('/settings/favicon', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../public/uploads/branding');
    if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.favicon) {
      fileBuffer = req.files.favicon.data;
    } else if (req.body && req.body.favicon_data) {
      const matches = req.body.favicon_data.match(/^data:image\/(png|jpg|jpeg|webp|x-icon|vnd.microsoft.icon);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file favicon' });

    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');

    // 1. Generate Favicon PNG (64x64)
    await sharp(fileBuffer)
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconPng);

    // 2. Generate Favicon ICO (32x32)
    await sharp(fileBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconIco);

    const timestamp = Date.now();
    const faviconPath = `/uploads/branding/favicon.png?v=${timestamp}`;
    setSetting('favicon_url', faviconPath);

    res.json({ favicon_url: faviconPath, message: 'Favicon berhasil diperbarui!' });
  } catch (err) {
    console.error('Favicon upload error:', err);
    res.status(500).json({ error: 'Gagal upload favicon' });
  }
});

router.delete('/settings/favicon', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../public/uploads/branding');
    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');
    const defaultAmsLogo = path.join(__dirname, '../../public/images/ams-logo.png');

    // Restore default favicons from ams-logo.png if logo settings is empty, or from current logo if logo exists
    const currentLogoUrl = getSetting('logo_url', '');
    let sourceImage = defaultAmsLogo;

    if (currentLogoUrl) {
      const logoBasePath = currentLogoUrl.split('?')[0];
      const logoFullPath = path.join(__dirname, '../../public', logoBasePath);
      if (fs.existsSync(logoFullPath)) {
        sourceImage = logoFullPath;
      }
    }

    if (fs.existsSync(sourceImage)) {
      await sharp(sourceImage)
        .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconPng);

      await sharp(sourceImage)
        .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconIco);

      const timestamp = Date.now();
      setSetting('favicon_url', `/uploads/branding/favicon.png?v=${timestamp}`);
    } else {
      if (fs.existsSync(faviconPng)) fs.unlinkSync(faviconPng);
      if (fs.existsSync(faviconIco)) fs.unlinkSync(faviconIco);
      setSetting('favicon_url', '');
    }

    const updatedSettings = getSettings();
    res.json({ success: true, favicon_url: updatedSettings.favicon_url, message: 'Favicon berhasil di-reset!' });
  } catch (err) {
    console.error('Delete favicon error:', err);
    res.status(500).json({ error: 'Gagal menghapus favicon' });
  }
});

router.put('/settings/wa-templates', [
  body('templates').isObject().withMessage('Templates harus object'),
  handleValidation
], (req, res) => {
  const { templates } = req.body;
  const defaults = getDefaultWaTemplates();
  const validKeys = Object.keys(defaults);

  const filtered = {};
  for (const key of validKeys) {
    if (templates[key] !== undefined) {
      filtered[key] = templates[key];
    }
  }

  setSetting('wa_templates', filtered);
  res.json(getWaTemplates());
});

router.post('/settings/reset-wa-templates', (req, res) => {
  const { key } = req.body || {};
  const defaults = getDefaultWaTemplates();

  if (key && defaults[key] !== undefined) {
    const current = getWaTemplates();
    current[key] = defaults[key];
    setSetting('wa_templates', current);
    return res.json({ success: true, message: `Template '${key}' berhasil direset ke default!`, wa_templates: getWaTemplates(), default: defaults[key] });
  }

  setSetting('wa_templates', defaults);
  res.json({ success: true, message: 'Seluruh template WA berhasil direset ke default!', wa_templates: getWaTemplates() });
});

router.post('/settings/reset-defaults', (req, res) => {
  const { category } = req.body || {};

  const defaults = {
    general: {
      company_name: '',
      companyName: '',
      company_phone: '',
      companyPhone: '',
      company_address: '',
      companyAddress: '',
      admin_phone: '',
      adminPhone: '',
      dp_percentage: 50,
      upload_deadline_days: 1,
      auto_approve_hours: 24,
      max_photos_per_fg_per_day: 5,
      invoice_prefix: 'INV',
      session_timeout_minutes: 1440,
      portfolio_limit: 50,
      supported_cities: ["Makassar"]
    },
    seo: {
      seo_domain: '',
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      google_site_verification: ''
    }
  };

  const targetCategory = category || 'all';
  const toReset = targetCategory === 'seo' ? defaults.seo : (targetCategory === 'general' ? defaults.general : { ...defaults.general, ...defaults.seo });

  for (const [key, value] of Object.entries(toReset)) {
    setSetting(key, value);
  }

  res.json({ success: true, message: `Pengaturan ${targetCategory} berhasil direset ke default bawaan sistem!`, settings: getSettings() });
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
  let retentionTransferred = 0;
  try {
    pendingRetention = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_parent_url IS NOT NULL AND (drive_cleanup_status IS NULL OR drive_cleanup_status NOT IN ('trashed'))").get()?.c || 0;
    retentionH14 = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_cleanup_status = 'reminded_h14'").get()?.c || 0;
    retentionH3 = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_cleanup_status = 'reminded_h3'").get()?.c || 0;
    retentionTransferred = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE drive_cleanup_status = 'transferred'").get()?.c || 0;
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

  // Count expired inquiries to check
  let expiredInquiries = 0;
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - dpExpiredDays);
    const cutoffStr = cutoff.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    expiredInquiries = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'booking_link_active' AND date(created_at) < date(?)").get(cutoffStr)?.c || 0;
  } catch (e) { }

  const jobs = [
    {
      id: 'reminder_h3',
      name: `Pengingat WA Awal (H-${reminder1Days})`,
      icon: '📅',
      description: `Kirim WA reminder ke Client & Fotografer ${reminder1Days} hari sebelum jadwal pemotretan`,
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
      name: `Pengingat WA Utama (H-${reminder2Days})`,
      icon: '⏰',
      description: `Kirim WA reminder ke Client & Fotografer ${reminder2Days} hari sebelum jadwal pemotretan`,
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
      name: 'Pengecekan Quotation Kadaluarsa',
      icon: '🗓️',
      description: `Tandai inquiry berstatus "quoted" sebagai expired jika sudah lebih dari ${dpExpiredDays} hari tanpa konfirmasi`,
      schedule: 'Setiap hari jam 00:00 WITA',
      cron: '0 0 * * *',
      category: 'automation',
      config_key: 'dp_expired_days',
      config_value: dpExpiredDays,
      config_type: 'number',
      pendingCount: expiredInquiries,
      pendingLabel: expiredInquiries > 0 ? `${expiredInquiries} inquiry akan di-expire` : 'Tidak ada inquiry kadaluarsa',
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
      description: `Kirim reminder H-14 & H-3 ke klien, transfer ownership, dan trash folder yang sudah expired (${driveRetentionMonths} bulan retensi)`,
      schedule: `Setiap hari jam ${driveRetentionHour} WITA`,
      cron: `0 ${parseInt(driveRetentionHour.split(':')[0], 10)} * * *`,
      category: 'storage',
      config_key: 'drive_retention_hour',
      config_value: driveRetentionHour,
      config_type: 'time',
      pendingCount: pendingRetention,
      pendingLabel: `Active: ${pendingRetention} | H-14: ${retentionH14} | H-3: ${retentionH3} | Transferred: ${retentionTransferred}`,
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
  const allowedJobs = ['reminder_h3', 'reminder_h1', 'auto_approve', 'dp_expired', 'payout_run', 'backup_db', 'drive_retention', 'db_maintenance', 'stale_import'];

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
        const assignments = db.prepare(`SELECT a.*, b.total_price, p.fg_fee as package_fg_fee, p.editor_fee as package_editor_fee, f.name as fg_name, f.phone as fg_phone, f.default_rate as fg_default_rate, COALESCE(a.fg_fee, f.default_rate, p.fg_fee, 0) as final_fg_fee FROM assignments a JOIN bookings b ON a.booking_id = b.id JOIN packages p ON b.package_id = p.id JOIN freelancers f ON a.fg_id = f.id WHERE a.status = 'done' AND b.status = 'completed' AND date(a.updated_at) BETWEEN date(?) AND date(?) AND NOT EXISTS (SELECT 1 FROM payouts WHERE assignment_id = a.id)`).all(periodStart, periodEnd);
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
        const configSettings2 = require('../config/settings');
        const pathLib2 = require('path');
        const fs2 = require('fs');
        const backupDir = configSettings2.backupPath || './DATA/backups';
        if (!fs2.existsSync(backupDir)) fs2.mkdirSync(backupDir, { recursive: true });
        const dateStr = new Date().toISOString().replace(/[-:.TZ]/g, '').substring(0, 15);
        const backupPath = pathLib2.join(backupDir, `wisuda_manual_${dateStr}.db`);
        await dbInstance.backup(backupPath);
        const stats = fs2.statSync(backupPath);
        appendLog(`Backup DB: created ${backupPath} (${Math.round(stats.size / 1024)} KB)`);
        return res.json({ success: true, message: `Backup berhasil: ${pathLib2.basename(backupPath)} (${Math.round(stats.size / 1024)} KB)`, file: pathLib2.basename(backupPath), size_kb: Math.round(stats.size / 1024) });
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

module.exports = router;