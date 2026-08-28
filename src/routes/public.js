const express = require('express');
const { body, param, validationResult } = require('express-validator');
const config = require('../config/settings');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates, getSetting } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('../utils/currency');
const { getBaseUrl } = require('../utils/url');

const { normalizeUniversity, getOfficialUniversityList } = require('../utils/university');
const emailService = require('../services/email.service');
const ipaymuService = require('../services/ipaymu.service');
const crypto = require('crypto');
const sseService = require('../services/sse.service');

const { execSync } = require('child_process');

const router = express.Router();
const db = getDb();

// ─── SSE: Real-time tracking stream endpoint ──────────────────────────────────
// GET /api/public/booking/stream?token=TRK-xxx
// Browser klien buka koneksi ini sekali, server push 'refresh' kapanpun booking berubah.
router.get('/booking/stream', (req, res) => {
  const token = req.query.token || '';
  if (!token) return res.status(400).end();

  const booking = db.prepare(
    'SELECT id FROM bookings WHERE tracking_token = ?'
  ).get(token);
  if (!booking) return res.status(404).end();

  const bookingId = booking.id;

  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // penting untuk Nginx
  res.flushHeaders();

  // Heartbeat setiap 30 detik agar koneksi tidak di-timeout proxy/browser
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (e) { clearInterval(heartbeat); }
  }, 30000);

  // Daftarkan koneksi
  sseService.registerStream(bookingId, res);

  // Cleanup saat browser disconnect / tab ditutup
  req.on('close', () => {
    clearInterval(heartbeat);
    sseService.unregisterStream(bookingId, res);
  });
});
// ─────────────────────────────────────────────────────────────────────────────

let cachedGitInfo = null;
function getGitBuildInfo() {
  if (cachedGitInfo) return cachedGitInfo;
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    cachedGitInfo = { hash, count };
    return cachedGitInfo;
  } catch (e) {
    return { hash: '', count: '' };
  }
}

function resolveAppBaseUrl(settings = {}, req) {
  const customUrl = settings.app_url || settings.domain_url || settings.seo_domain;
  if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
    let clean = customUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean;
  }
  return getBaseUrl(req);
}

const { getUpdateStatus } = require('../utils/github-update');
const { saveFinalInvoiceSnapshot } = require('../utils/invoice');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Helper to save and compress payment proof images (JPG/PNG/WEBP) to lightweight high-clarity WebP
 * Reduces 5MB-10MB mobile uploads down to ~40-80KB while keeping receipt text and numbers razor-sharp.
 */
async function saveAndOptimizePaymentProof({ file, prefix, recordId, uploadDir }) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileExt = path.extname(file.name || '').toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  if (!allowedExts.includes(fileExt)) {
    throw new Error('Format file tidak diijinkan. Gunakan JPG, PNG, atau PDF.');
  }

  // If PDF, save directly
  if (fileExt === '.pdf') {
    const fileName = `${prefix}_${Date.now()}_id_${recordId}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    await file.mv(filePath);
    return `/uploads/payment_proofs/${fileName}`;
  }

  // Image processing: Convert to clean web-optimized WebP (max-width 1200px, quality 82, sharp text clarity)
  const fileName = `${prefix}_${Date.now()}_id_${recordId}.webp`;
  const filePath = path.join(uploadDir, fileName);

  try {
    const inputBuffer = file.data && file.data.length > 0
      ? file.data
      : (file.tempFilePath ? fs.readFileSync(file.tempFilePath) : null);

    if (inputBuffer) {
      await sharp(inputBuffer)
        .rotate() // Auto-orient based on EXIF
        .resize({ width: 1200, height: 1800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(filePath);
    } else {
      await file.mv(filePath);
    }
  } catch (err) {
    console.warn('[ImageCompressFallback] Sharp compression warning, falling back to direct save:', err.message);
    await file.mv(filePath);
  }

  return `/uploads/payment_proofs/${fileName}`;
}

// ============ PUBLIC SYSTEM VERSION ============
router.get('/version', (req, res) => {
  try {
    const pkg = require('../../package.json');
    const git = getGitBuildInfo();
    const updateInfo = getUpdateStatus();
    
    res.json({
      version: pkg.version,
      hash: git.hash,
      build: git.count,
      release: `v${pkg.version}`,
      updateAvailable: updateInfo.updateAvailable || false,
      latestGitHubHash: updateInfo.latestHash || '',
      latestCommitMessage: updateInfo.latestMessage || ''
    });
  } catch (e) {
    res.json({ version: '1.3.1', release: 'v1.3.1', updateAvailable: false });
  }
});

// ============ PUBLIC INQUIRY (no package required) ============
router.post('/inquiry', [
  body('client_name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('client_phone')
    .customSanitizer(v => {
      if (!v) return '';
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      else if (p.length >= 9 && !p.startsWith('62')) p = '62' + p;
      return p;
    })
    .matches(/^62\d{9,12}$/).withMessage('Format WA: 628xxxxxxxxxx'),
  body('client_email').trim().notEmpty().withMessage('Email Gmail aktif wajib diisi').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('graduation_date').isISO8601().withMessage('Tanggal tidak valid (YYYY-MM-DD)'),
  body('city').optional().trim().isLength({ max: 100 }),
  body('location').trim().isLength({ min: 2, max: 200 }).withMessage('Lokasi 2-200 karakter'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas 2-100 karakter'),
  body('package_id').optional().isInt({ min: 1 }).withMessage('Paket tidak valid'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Catatan max 1000 karakter'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    }
    next();
  }
], (req, res) => {
  const { client_name, client_phone, client_email, graduation_date, city, location, university, package_id, notes } = req.body;
  const normalizedUniversity = normalizeUniversity(university);
  const eventCity = city || 'Makassar';

  let pkg = null;
  if (package_id) {
    pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
    if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan atau tidak aktif' });
  }

  const result = db.prepare(`
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, city, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email, graduation_date, eventCity, location, normalizedUniversity, package_id || null, notes || '');

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(result.lastInsertRowid);

  // 📧 Trigger email konfirmasi penerimaan reservasi otomatis
  try {
    emailService.sendClientInquiryReceivedEmail({
      inquiry: {
        name: client_name,
        email: client_email,
        graduation_date,
        university: normalizedUniversity,
        package_name: pkg ? pkg.name : '-'
      }
    }).catch(e => console.error('[EmailService] Inquiry email dispatch error:', e.message));
  } catch (e) { }

  const templates = getWaTemplates();
  const settings = getSettings();
  const companyName = settings.company_name || settings.companyName || 'Studio';

  let waMessage = (templates.client_new_inquiry || '')
    .replace(/{company_name}/g, companyName)
    .replace('{client_name}', client_name)
    .replace('{graduation_date}', formatDate(graduation_date))
    .replace('{location}', location)
    .replace('{university}', normalizedUniversity || '-')
    .replace('{notes}', notes || '-')
    .replace('{package_name}', pkg?.name || '-');

  const waLink = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(waMessage)}`;

  res.status(201).json({
    success: true,
    message: 'Inquiry terkirim. Admin akan menghubungi via WA 1x24 jam.',
    inquiry_id: inquiry.id,
    wa_link: waLink
  });
});

// ============ PUBLIC INQUIRY WITH AUTO-BOOKING (with package) ============
router.post('/inquiry-book', [
  body('client_name').trim().isLength({ min: 2, max: 100 }),
  body('client_phone')
    .customSanitizer(v => {
      if (!v) return '';
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      else if (p.length >= 9 && !p.startsWith('62')) p = '62' + p;
      return p;
    })
    .matches(/^62\d{9,12}$/),
  body('client_email').trim().notEmpty().withMessage('Email Gmail aktif wajib diisi').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('graduation_date').isISO8601(),
  body('location').trim().isLength({ min: 2, max: 200 }),
  body('university').trim().isLength({ min: 2, max: 100 }),
  body('package_id').isInt({ min: 1 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    next();
  }
], (req, res) => {
  const { client_name, client_phone, client_email, graduation_date, location, university, package_id, notes } = req.body;

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
  if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan' });

  // ── Prinsip 1-Pintu: Hanya buat Inquiry ────────────────────────────────────
  // Booking record TIDAK dibuat di sini. Booking dibuat saat Gate 1 (verify-dp)
  // setelah admin generate link booking & client mengisi form confirm-booking.html.
  const result = db.prepare(`
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, city, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email, graduation_date, req.body.city || '', location, university || '', package_id, notes || '');

  const inquiryId = result.lastInsertRowid;

  // 📧 Trigger email konfirmasi penerimaan reservasi otomatis
  try {
    emailService.sendClientInquiryReceivedEmail({
      inquiry: {
        name: client_name,
        email: client_email,
        graduation_date,
        university,
        package_name: pkg ? pkg.name : '-'
      }
    }).catch(e => console.error('[EmailService] Inquiry-book email dispatch error:', e.message));
  } catch (e) { }

  const settings = getSettings();
  const companyName = settings.company_name || settings.companyName || 'Studio';

  const templates = getWaTemplates();
  const dpPercentage = parseInt(getSetting('dp_percentage', 50));
  const dpAmount = Math.round(pkg.price * dpPercentage / 100);
  const dpAmountStr = 'Rp ' + dpAmount.toLocaleString('id-ID');
  const totalStr = 'Rp ' + pkg.price.toLocaleString('id-ID');

  // WA ke Admin: notif inquiry baru masuk
  const waMsgAdmin = `📋 Inquiry Baru Masuk!\n👤 Client: ${client_name}\n📦 Paket: ${pkg.name}\n💰 Total: ${totalStr}\n📅 Tgl Wisuda: ${formatDate(graduation_date)}\n📍 Lokasi: ${location}\n\n➡️ Buka Admin Panel untuk diskusi & generate Link Booking.`;
  const waAdmin = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(waMsgAdmin)}`;

  // WA ke Client: konfirmasi inquiry diterima
  let waMsgClient = (templates.client_new_inquiry || `Hai {client_name}, terima kasih sudah menghubungi {company_name}! Inquiry Anda telah kami terima. Tim kami akan segera menghubungi Anda via WhatsApp untuk mendiskusikan detail dan mengirimkan Link Booking resmi.`)
    .replace(/{company_name}/g, companyName)
    .replace('{client_name}', client_name)
    .replace('{graduation_date}', formatDate(graduation_date))
    .replace('{location}', location)
    .replace('{university}', university || '-')
    .replace('{notes}', notes || '-')
    .replace('{package_name}', pkg?.name || '-');

  const waClient = `https://wa.me/${client_phone}?text=${encodeURIComponent(waMsgClient)}`;

  res.status(201).json({
    success: true,
    message: 'Inquiry berhasil dikirim! Admin akan menghubungi via WhatsApp untuk konfirmasi & Link Booking.',
    inquiry_id: inquiryId,
    wa_link_admin: waAdmin,
    wa_link_client: waClient
  });
});

// ============ DP NOTIFY (client lapor sudah transfer via WA) ============
router.post('/booking/:id/dp-notify', [
  param('id').isInt()
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // SEC-05 fix: validasi tracking_token — mencegah spam dan mutasi booking orang lain
  const notifyToken = req.body.tracking_token || req.query.token || '';
  if (!notifyToken || notifyToken !== booking.tracking_token) {
    return res.status(401).json({ error: 'Token tracking tidak valid. Silakan buka ulang halaman tracking Anda.' });
  }

  db.prepare("UPDATE bookings SET dp_status = 'uploaded', updated_at = datetime('now') WHERE id = ?")
    .run(req.params.id);

  const settings = getSettings();
  const msg = `📸 Klien ${booking.client_name} mengirim bukti DP\nBooking #${booking.id}\nCek & verifikasi: ${getBaseUrl(req)}/admin`;
  const waAdmin = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(msg)}`;

  res.json({
    success: true,
    message: 'Notifikasi terkirim ke admin.',
    dp_status: 'uploaded',
    wa_link_admin: waAdmin
  });
});

// ============ PAYMENT NOTIFY (client uploads DP/Full payment proof for quote) ============
router.post('/booking/:id/payment-notify', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.dp_status === 'paid') {
    return res.status(400).json({ error: 'Pembayaran DP/Awal sudah diverifikasi' });
  }

  // SEC-05 fix: validasi tracking_token
  const notifyToken = req.body.tracking_token || req.query.token || '';
  if (!notifyToken || notifyToken !== booking.tracking_token) {
    return res.status(401).json({ error: 'Token tracking tidak valid. Silakan buka ulang halaman tracking Anda.' });
  }

  // Check file upload
  if (!req.files || !req.files.payment_proof) {
    return res.status(400).json({ error: 'Upload bukti transfer terlebih dahulu' });
  }

  const file = req.files.payment_proof;
  const { getSetting } = require('../config/wa-templates');
  const activeUpload = getSetting('upload_path', config.uploadPath);
  const uploadDir = path.join(activeUpload, 'payment_proofs');

  let dbPath;
  try {
    dbPath = await saveAndOptimizePaymentProof({
      file,
      prefix: 'proof_dp',
      recordId: booking.id,
      uploadDir
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Gagal mengupload bukti transfer' });
  }

  // If balance_amount is 0 (Full Payment), mark both dp and balance as uploaded
  if (booking.balance_amount === 0) {
    db.prepare(`
      UPDATE bookings 
      SET dp_status = 'uploaded', 
          balance_status = 'uploaded', 
          dp_bukti_url = ?, 
          balance_bukti_url = ?, 
          updated_at = datetime('now') 
      WHERE id = ?
    `).run(dbPath, dbPath, bookingId);
  } else {
    db.prepare(`
      UPDATE bookings 
      SET dp_status = 'uploaded', 
          dp_bukti_url = ?, 
          updated_at = datetime('now') 
      WHERE id = ?
    `).run(dbPath, bookingId);
  }

  const settings = getSettings();
  const paymentTypeLabel = booking.balance_amount === 0 ? 'Lunas 100%' : 'DP';
  const msg = `💰 Klien ${booking.client_name} mengirim bukti transfer Pembayaran ${paymentTypeLabel}\nBooking #${booking.id}\nCek & verifikasi: ${getBaseUrl(req)}/admin`;
  const waAdmin = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(msg)}`;

  res.json({
    success: true,
    message: 'Bukti transfer berhasil diunggah! Menunggu konfirmasi admin.',
    wa_link_admin: waAdmin
  });
});

// ============ BALANCE NOTIFY (client lapor sudah bayar pelunasan) ============
router.post('/booking/:id/balance-notify', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status === 'paid') {
    return res.status(400).json({ error: 'Pelunasan sudah diverifikasi' });
  }

  // SEC-05 fix: validasi tracking_token
  const notifyToken = req.body.tracking_token || req.query.token || '';
  if (!notifyToken || notifyToken !== booking.tracking_token) {
    return res.status(401).json({ error: 'Token tracking tidak valid. Silakan buka ulang halaman tracking Anda.' });
  }

  // Check file upload
  if (!req.files || !req.files.payment_proof) {
    return res.status(400).json({ error: 'Upload bukti transfer terlebih dahulu' });
  }

  const file = req.files.payment_proof;
  const { getSetting } = require('../config/wa-templates');
  const activeUpload = getSetting('upload_path', config.uploadPath);
  const uploadDir = path.join(activeUpload, 'payment_proofs');

  let dbPath;
  try {
    dbPath = await saveAndOptimizePaymentProof({
      file,
      prefix: 'proof_balance',
      recordId: booking.id,
      uploadDir
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Gagal mengupload bukti transfer' });
  }

  db.prepare("UPDATE bookings SET balance_status = 'uploaded', balance_bukti_url = ?, updated_at = datetime('now') WHERE id = ?")
    .run(dbPath, bookingId);

  const settings = getSettings();
  const msg = `💰 Klien ${booking.client_name} mengirim bukti pelunasan\nBooking #${booking.id}\nCek & verifikasi: ${getBaseUrl(req)}/admin`;
  const waAdmin = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(msg)}`;

  res.json({
    success: true,
    message: 'Notifikasi pelunasan terkirim ke admin.',
    balance_status: 'uploaded',
    balance_bukti_url: dbPath,
    wa_link_admin: waAdmin
  });
});

// ============ BOOKING STATUS (client cek booking) ============
router.get('/booking/:id', [
  param('id').isInt()
], (req, res) => {
  const bookingId = parseInt(req.params.id);
  const booking = db.prepare(`
    SELECT b.*, p.name as package_name, p.includes as package_includes
    FROM bookings b LEFT JOIN packages p ON b.package_id = p.id WHERE b.id = ?
  `).get(bookingId);

  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const assignment = db.prepare(`
    SELECT a.*, f.name as fg_name, f.phone as fg_phone
    FROM assignments a LEFT JOIN freelancers f ON a.fg_id = f.id WHERE a.booking_id = ?
  `).get(bookingId);

  let deliverable = null;
  if (assignment) {
    deliverable = db.prepare('SELECT * FROM deliverables WHERE assignment_id = ?').get(assignment.id);
    if (deliverable) {
      try { deliverable.highlight_photos = JSON.parse(deliverable.highlight_photos || '[]'); } catch { deliverable.highlight_photos = []; }
    }
  }

  const timeline = [
    { step: 'inquiry', label: 'Inquiry', status: 'completed', date: booking.created_at },
    { step: 'quotation', label: 'Quotation', status: 'completed', date: booking.created_at },
    { step: 'dp', label: 'DP', status: booking.dp_status === 'paid' ? 'completed' : (booking.dp_status === 'uploaded' ? 'pending' : 'pending'), date: booking.dp_verified_at },
    { step: 'assign', label: 'FG Assigned', status: assignment ? 'completed' : 'pending', date: assignment?.created_at },
    { step: 'shoot', label: 'Shooting', status: ['shooting', 'delivered', 'completed'].includes(booking.status) ? 'completed' : 'pending', date: assignment?.shoot_start_at },
    { step: 'balance', label: 'Pelunasan', status: booking.balance_status === 'paid' ? 'completed' : (booking.balance_status === 'uploaded' ? 'pending' : 'pending'), date: booking.balance_verified_at },
    { step: 'delivery', label: 'Delivery', status: booking.status === 'delivered' || booking.status === 'completed' ? 'completed' : 'pending', date: (booking.status === 'delivered' || booking.status === 'completed') ? booking.updated_at : null },
    { step: 'completed', label: 'Selesai', status: booking.status === 'completed' ? 'completed' : 'pending', date: booking.balance_verified_at },
  ];

  // SEC-01 fix: Strip field sensitif sebelum response ke publik
  // Field ini hanya boleh diakses lewat endpoint tracking yang sudah ter-token-kan
  const safeBooking = { ...booking };
  delete safeBooking.download_url;
  delete safeBooking.download_password;
  delete safeBooking.dp_bukti_url;
  delete safeBooking.balance_bukti_url;
  delete safeBooking.staging_files;
  delete safeBooking.tracking_token; // SEC-260817-01: jangan bocorkan token via IDOR integer ID

  // fg_phone dikembalikan hanya jika shooting sudah selesai (klien perlu kontak fotografer)
  if (assignment && !['post_production', 'delivered', 'completed'].includes(booking.status)) {
    delete assignment.fg_phone;
  }

  res.json({
    booking: safeBooking,
    assignment,
    deliverable,
    timeline,
    can_download: booking.status === 'delivered' || booking.status === 'completed',
    admin_phone: getSettings()?.adminPhone || getSettings()?.admin_phone || ''
  });
});

// ============ PACKAGES (PUBLIC) ============
router.get('/packages', (req, res) => {
  const packages = db.prepare('SELECT id, name, description, price, includes, duration_hours, category FROM packages WHERE active = 1 ORDER BY sort_order ASC, price ASC').all();
  res.json(packages);
});

// ============ PORTFOLIO (PUBLIC) ============
router.get('/portfolio', (req, res) => {
  const settings = getSettings();
  const defaultLimit = parseInt(settings.portfolio_limit || 200);
  const { year, university, city, search, booking_id, limit = defaultLimit, offset = 0 } = req.query;
  let where = 'published = 1';
  const params = [];

  if (year) { where += ' AND graduation_year = ?'; params.push(parseInt(year)); }
  if (university) { where += ' AND university LIKE ?'; params.push(`%${university}%`); }
  if (city) { where += ' AND city = ?'; params.push(city); }
  if (search) { where += ' AND client_initial LIKE ?'; params.push(`%${search}%`); }

  let orderBy = 'graduation_year DESC, RANDOM()';
  if (booking_id) {
    orderBy = `(CASE WHEN booking_id = ${parseInt(booking_id)} THEN 1 ELSE 0 END) DESC, ` + orderBy;
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM portfolio_items WHERE ${where}`).get(params).c;
  const rows = db.prepare(`SELECT * FROM portfolio_items WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), parseInt(offset));
  rows.forEach(p => { try { p.highlight_photos = JSON.parse(p.highlight_photos || '[]'); } catch { p.highlight_photos = []; } });

  res.json({ data: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// GET /api/public/universities (Dynamic self-learning university list with acronym hints)
router.get('/universities', (req, res) => {
  const defaultUnis = getOfficialUniversityList();

  try {
    const dbUnis = db.prepare(`
      SELECT DISTINCT university FROM (
        SELECT university FROM inquiries WHERE university IS NOT NULL AND TRIM(university) != ''
        UNION
        SELECT university FROM bookings WHERE university IS NOT NULL AND TRIM(university) != ''
        UNION
        SELECT university FROM portfolio_items WHERE university IS NOT NULL AND TRIM(university) != ''
      ) ORDER BY university ASC
    `).all().map(r => normalizeUniversity(r.university));

    const combined = Array.from(new Set([...defaultUnis, ...dbUnis]));
    res.json({ success: true, data: combined });
  } catch (e) {
    res.json({ success: true, data: defaultUnis });
  }
});

router.get('/portfolio/filters', (req, res) => {
  const years = db.prepare('SELECT DISTINCT graduation_year FROM portfolio_items WHERE published = 1 ORDER BY graduation_year DESC').all();
  const universities = db.prepare('SELECT DISTINCT university FROM portfolio_items WHERE published = 1 AND university IS NOT NULL ORDER BY university').all();
  const cities = db.prepare('SELECT DISTINCT city FROM portfolio_items WHERE published = 1 AND city IS NOT NULL AND TRIM(city) != \'\'  ORDER BY city').all();
  res.json({ years: years.map(y => y.graduation_year), universities: universities.map(u => u.university), cities: cities.map(c => c.city) });
});

router.get('/portfolio/:id', [
  (req, res, next) => { if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' }); next(); }
], (req, res) => {
  const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ? AND published = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  try { item.highlight_photos = JSON.parse(item.highlight_photos || '[]'); } catch { item.highlight_photos = []; }
  res.json(item);
});

router.get('/booking-token/:token', (req, res) => {
  const settings = getSettings();
  const meta = {
    company_name: settings.company_name || settings.companyName || '',
    logo_url: settings.logo_url || '',
    admin_phone: settings.admin_phone || settings.adminPhone || ''
  };

  const tokenRow = db.prepare('SELECT * FROM booking_tokens WHERE token = ?').get(req.params.token);
  if (!tokenRow) return res.status(404).json({ error: 'Link booking tidak valid', ...meta });

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(tokenRow.inquiry_id);
  if (!inquiry) return res.status(404).json({ error: 'Data inquiry tidak ditemukan', ...meta });

  const existingBooking = db.prepare('SELECT * FROM bookings WHERE inquiry_id = ? ORDER BY id DESC LIMIT 1').get(tokenRow.inquiry_id);

  if (existingBooking) {
    ensureTrackingToken(existingBooking, db);
    // 1. Jika pembayaran DP sudah diverifikasi / lunas
    if (existingBooking.dp_status === 'paid' || (existingBooking.status === 'confirmed' && existingBooking.dp_verified_at)) {
      return res.json({
        success: true,
        is_already_paid: true,
        tracking_token: existingBooking.tracking_token,
        booking: existingBooking,
        inquiry,
        ...meta
      });
    }

    // 2. Cek apakah ada transaksi QRIS pending
    const activeQris = db.prepare("SELECT * FROM qris_transactions WHERE booking_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1").get(existingBooking.id);
    if (activeQris) {
      const isQrisActive = new Date(activeQris.expired_at) > new Date();

      if (isQrisActive) {
        // QRIS masih aktif: token dalam status PAUSED murni
        const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(existingBooking.package_id);
        return res.json({
          success: true,
          is_qris_active: true,
          is_qris_expired: false,
          is_token_paused: true,
          paused_remaining_seconds: tokenRow.paused_remaining_seconds,
          qris_data: {
            booking_id: existingBooking.id,
            payment_type: activeQris.payment_type,
            amount: activeQris.amount,
            total_price: existingBooking.total_price,
            qr_image: activeQris.qr_image,
            reference_id: activeQris.reference_id,
            expired_at: activeQris.expired_at,
            expiry_minutes: parseInt(settings.ipaymu_qris_expiry_minutes || 15, 10)
          },
          booking: existingBooking,
          package: pkg,
          inquiry,
          expires_at: tokenRow.expires_at,
          bank_accounts: settings.bank_accounts || [],
          ipaymu_enabled: String(settings.ipaymu_enabled) === '1' && String(settings.ipaymu_verified) === '1',
          ipaymu_qris_expiry_minutes: parseInt(settings.ipaymu_qris_expiry_minutes || 15, 10),
          ...meta
        });
      } else {
        // QRIS sudah expired: Lakukan RESUME token jika sebelumnya sedang di-pause
        if (tokenRow.paused_remaining_seconds != null) {
          const resumedExpiresAt = new Date(Date.now() + (tokenRow.paused_remaining_seconds * 1000)).toISOString();
          db.prepare('UPDATE booking_tokens SET expires_at = ?, paused_remaining_seconds = NULL, paused_at = NULL WHERE id = ?').run(resumedExpiresAt, tokenRow.id);
          tokenRow.expires_at = resumedExpiresAt;
          tokenRow.paused_remaining_seconds = null;
        }

        // Cek apakah masa berlaku token setelah di-resume sudah habis total
        if (new Date(tokenRow.expires_at) <= new Date()) {
          return res.status(400).json({ error: 'Link booking sudah kedaluwarsa (expired)', ...meta });
        }

        const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(existingBooking.package_id);
        return res.json({
          success: true,
          is_qris_active: true,
          is_qris_expired: true,
          is_token_paused: false,
          qris_data: {
            booking_id: existingBooking.id,
            payment_type: activeQris.payment_type,
            amount: activeQris.amount,
            total_price: existingBooking.total_price,
            qr_image: activeQris.qr_image,
            reference_id: activeQris.reference_id,
            expired_at: activeQris.expired_at,
            expiry_minutes: parseInt(settings.ipaymu_qris_expiry_minutes || 15, 10)
          },
          booking: existingBooking,
          package: pkg,
          inquiry,
          expires_at: tokenRow.expires_at,
          bank_accounts: settings.bank_accounts || [],
          ipaymu_enabled: String(settings.ipaymu_enabled) === '1' && String(settings.ipaymu_verified) === '1',
          ipaymu_qris_expiry_minutes: parseInt(settings.ipaymu_qris_expiry_minutes || 15, 10),
          ...meta
        });
      }
    }

    // 3. Jika klien sudah mengunggah bukti transfer manual (menunggu verifikasi)
    if (existingBooking.dp_bukti_url && existingBooking.dp_status === 'uploaded') {
      return res.json({
        success: true,
        is_submitted_manual: true,
        tracking_token: existingBooking.tracking_token,
        booking: existingBooking,
        inquiry,
        ...meta
      });
    }
  }

  // Token expiration check (jika belum pernah ada booking yang dibuat)
  if (tokenRow.used && !existingBooking) {
    return res.status(400).json({ error: 'Link booking sudah pernah digunakan', ...meta });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link booking sudah kedaluwarsa (expired)', ...meta });
  }

  res.json({
    inquiry,
    expires_at: tokenRow.expires_at,
    bank_accounts: settings.bank_accounts || [],
    ipaymu_enabled: String(settings.ipaymu_enabled) === '1' && String(settings.ipaymu_verified) === '1',
    ipaymu_qris_expiry_minutes: parseInt(settings.ipaymu_qris_expiry_minutes || 15, 10),
    ...meta
  });
});

router.post('/booking-token/:token/confirm', async (req, res) => {
  const tokenRow = db.prepare('SELECT * FROM booking_tokens WHERE token = ?').get(req.params.token);
  if (!tokenRow) return res.status(404).json({ error: 'Link booking tidak valid' });

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(tokenRow.inquiry_id);
  if (!inquiry) return res.status(404).json({ error: 'Data inquiry tidak ditemukan' });

  const existingBooking = db.prepare("SELECT * FROM bookings WHERE inquiry_id = ? AND status = 'pending' AND dp_status = 'unpaid' ORDER BY id DESC LIMIT 1").get(tokenRow.inquiry_id);

  if (tokenRow.used && !existingBooking) return res.status(400).json({ error: 'Link booking sudah pernah digunakan' });

  if (!existingBooking && new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link booking sudah kedaluwarsa (expired)' });
  }

  const { package_id, shooting_time, payment_type } = req.body;
  if (!package_id) return res.status(400).json({ error: 'Pilih paket terlebih dahulu' });

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
  if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan' });

  // Check file upload
  if (!req.files || !req.files.payment_proof) {
    return res.status(400).json({ error: 'Upload bukti transfer terlebih dahulu' });
  }

  const file = req.files.payment_proof;
  const { getSetting } = require('../config/wa-templates');
  const activeUpload = getSetting('upload_path', config.uploadPath);
  const uploadDir = path.join(activeUpload, 'payment_proofs');

  let dbPath;
  try {
    dbPath = await saveAndOptimizePaymentProof({
      file,
      prefix: 'proof_confirm',
      recordId: inquiry.id,
      uploadDir
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Gagal mengupload bukti transfer' });
  }

  const dpPercentage = parseInt(getSettings().dp_percentage || 50);
  const durationHours = parseInt(req.body.duration_hours) || pkg.duration_hours || 2;
  const baseHours = pkg.duration_hours || 1;
  let totalPrice = pkg.price;
  if (durationHours !== baseHours) {
    totalPrice = Math.round((pkg.price / baseHours) * durationHours);
  }

  // Include transport charge and discount set by admin in total price
  const transportCharge = Number(inquiry.transport_charge || 0);
  const discountAmount = Number(inquiry.discount_amount || 0);
  totalPrice = Math.max(0, totalPrice + transportCharge - discountAmount);
  
  let dpAmount = 0;
  let balanceAmount = 0;
  let dpStatus = 'unpaid';
  let balanceStatus = 'unpaid';
  let dpBuktiUrl = null;
  let balanceBuktiUrl = null;

  if (payment_type === 'full') {
    dpAmount = totalPrice;
    balanceAmount = 0;
    dpStatus = 'uploaded';
    balanceStatus = 'uploaded';
    dpBuktiUrl = dbPath;
    balanceBuktiUrl = dbPath;
  } else {
    dpAmount = Math.round(totalPrice * dpPercentage / 100);
    balanceAmount = totalPrice - dpAmount;
    dpStatus = 'uploaded';
    dpBuktiUrl = dbPath;
  }

  let bookingId;
  if (existingBooking) {
    bookingId = existingBooking.id;
    // BUG-03 fix: transfer manual → 'pending_verification', bukan langsung 'confirmed'
    // QRIS tidak masuk sini — pakai endpoint /qris yang diverifikasi otomatis iPaymu
    db.prepare(`
      UPDATE bookings 
      SET package_id = ?, shooting_time = ?, duration_hours = ?, total_price = ?,
          dp_amount = ?, balance_amount = ?, dp_status = ?, balance_status = ?,
          dp_bukti_url = ?, balance_bukti_url = ?, status = 'pending_verification', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      pkg.id, shooting_time || '', durationHours, totalPrice, dpAmount, balanceAmount,
      dpStatus, balanceStatus, dpBuktiUrl, balanceBuktiUrl, bookingId
    );
    try {
      db.prepare("UPDATE qris_transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status = 'pending'").run(bookingId);
    } catch (e) {}
  } else {
    // BUG-03 fix: status 'pending_verification' — admin harus verifikasi bukti transfer dulu
    const r = db.prepare(`
      INSERT INTO bookings (
        inquiry_id, package_id, client_name, client_phone, client_email, 
        graduation_date, city, location, university, shooting_time, duration_hours, total_price, 
        dp_amount, balance_amount, dp_status, balance_status, dp_bukti_url, balance_bukti_url, status,
        transport_charge, transport_charge_notes, discount_amount, discount_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', ?, ?, ?, ?)
    `).run(
      inquiry.id, pkg.id, inquiry.client_name, inquiry.client_phone, inquiry.client_email,
      inquiry.graduation_date, inquiry.city || 'Makassar', inquiry.location, inquiry.university, shooting_time || '', durationHours,
      totalPrice, dpAmount, balanceAmount, dpStatus, balanceStatus, dpBuktiUrl, balanceBuktiUrl,
      transportCharge, inquiry.transport_charge_notes || '', discountAmount, inquiry.discount_notes || ''
    );
    bookingId = r.lastInsertRowid;
  }

  // Mark token as used
  db.prepare('UPDATE booking_tokens SET used = 1 WHERE id = ?').run(tokenRow.id);

  // Update inquiry status to 'converted'
  db.prepare('UPDATE inquiries SET status = \'converted\', package_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(pkg.id, inquiry.id);

  // 📧 Send Booking Submission & Payment Proof Received Email to Client
  const newBooking = db.prepare('SELECT b.*, p.name as package_name FROM bookings b LEFT JOIN packages p ON b.package_id = p.id WHERE b.id = ?').get(bookingId);
  if (newBooking && newBooking.client_email) {
    try {
      emailService.sendClientBookingSubmittedEmail({
        booking: newBooking
      }).catch(e => console.error('[EmailService] Booking submit email dispatch error:', e.message));
    } catch (e) {}
  }

  res.json({
    success: true,
    booking_id: bookingId,
    tracking_token: ensureTrackingToken(newBooking, db),
    message: 'Booking berhasil dikonfirmasi. Pembayaran sedang diverifikasi admin.'
  });
});

function ensureTrackingToken(booking, targetDb = db) {
  if (!booking.tracking_token) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const token = `TRK-${booking.id}-${randomHex}`;
    targetDb.prepare('UPDATE bookings SET tracking_token = ? WHERE id = ?').run(token, booking.id);
    booking.tracking_token = token;
  }
  return booking.tracking_token;
}

// ============ QRIS PAYMENT GENERATION (iPaymu) ============
// POST /api/public/booking-token/:token/qris — Buat tagihan QRIS untuk Booking Awal (DP / Full)
router.post('/booking-token/:token/qris', async (req, res) => {
  const tokenRow = db.prepare('SELECT * FROM booking_tokens WHERE token = ?').get(req.params.token);
  if (!tokenRow) return res.status(404).json({ error: 'Link booking tidak valid' });

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(tokenRow.inquiry_id);
  if (!inquiry) return res.status(404).json({ error: 'Data inquiry tidak ditemukan' });

  const existingBooking = db.prepare("SELECT * FROM bookings WHERE inquiry_id = ? AND status = 'pending' AND dp_status = 'unpaid' ORDER BY id DESC LIMIT 1").get(tokenRow.inquiry_id);

  if (tokenRow.used && !existingBooking) {
    return res.status(400).json({ error: 'Link booking sudah pernah digunakan' });
  }
  if (!existingBooking && new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link booking sudah kedaluwarsa (expired)' });
  }

  const { package_id, shooting_time, payment_type = 'dp' } = req.body;
  if (!package_id) return res.status(400).json({ error: 'Pilih paket terlebih dahulu' });

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
  if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan' });

  const settings = getSettings();
  if (String(settings.ipaymu_enabled) !== '1' || String(settings.ipaymu_verified) !== '1' || !settings.ipaymu_va || !settings.ipaymu_api_key) {
    return res.status(400).json({ error: 'Pembayaran QRIS saat ini sedang tidak aktif. Silakan pilih transfer bank manual.' });
  }

  const dpPercentage = parseInt(settings.dp_percentage || 50);
  const durationHours = parseInt(req.body.duration_hours) || pkg.duration_hours || 2;
  const baseHours = pkg.duration_hours || 1;
  let totalPrice = pkg.price;
  if (durationHours !== baseHours) {
    totalPrice = Math.round((pkg.price / baseHours) * durationHours);
  }

  const transportCharge = Number(inquiry.transport_charge || 0);
  const discountAmount = Number(inquiry.discount_amount || 0);
  totalPrice = Math.max(0, totalPrice + transportCharge - discountAmount);

  let dpAmount = 0;
  let balanceAmount = 0;
  let chargeAmount = 0;

  if (payment_type === 'full') {
    dpAmount = totalPrice;
    balanceAmount = 0;
    chargeAmount = totalPrice;
  } else {
    dpAmount = Math.round(totalPrice * dpPercentage / 100);
    balanceAmount = totalPrice - dpAmount;
    chargeAmount = dpAmount;
  }

  let bookingId;
  let booking;

  if (existingBooking) {
    bookingId = existingBooking.id;
    db.prepare(`
      UPDATE bookings 
      SET package_id = ?, shooting_time = ?, duration_hours = ?, total_price = ?,
          dp_amount = ?, balance_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(pkg.id, shooting_time || '', durationHours, totalPrice, dpAmount, balanceAmount, bookingId);
    booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    try {
      db.prepare("UPDATE qris_transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status = 'pending'").run(bookingId);
    } catch (e) {}
  } else {
    const r = db.prepare(`
      INSERT INTO bookings (
        inquiry_id, package_id, client_name, client_phone, client_email, 
        graduation_date, city, location, university, shooting_time, duration_hours, total_price, 
        dp_amount, balance_amount, dp_status, balance_status, status,
        transport_charge, transport_charge_notes, discount_amount, discount_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'unpaid', 'pending', ?, ?, ?, ?)
    `).run(
      inquiry.id, pkg.id, inquiry.client_name, inquiry.client_phone, inquiry.client_email,
      inquiry.graduation_date, inquiry.city || 'Makassar', inquiry.location, inquiry.university, shooting_time || '', durationHours,
      totalPrice, dpAmount, balanceAmount,
      transportCharge, inquiry.transport_charge_notes || '', discountAmount, inquiry.discount_notes || ''
    );
    bookingId = r.lastInsertRowid;
    booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  }

  const trackingToken = ensureTrackingToken(booking, db);

  const referenceId = `BOOKING-${bookingId}-${payment_type.toUpperCase()}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const appBaseUrl = resolveAppBaseUrl(settings, req);
  const notifyUrl = `${appBaseUrl.replace(/\/+$/, '')}/api/public/payment/ipaymu/notify`;
  const expiryMinutes = Number(settings.ipaymu_qris_expiry_minutes || 15);

  try {
    const qrisResult = await ipaymuService.createQrisPayment({
      env: settings.ipaymu_env || 'sandbox',
      va: settings.ipaymu_va,
      apiKey: settings.ipaymu_api_key,
      name: inquiry.client_name,
      phone: inquiry.client_phone,
      email: inquiry.client_email || 'client@wisuda.local',
      amount: chargeAmount,
      comments: `Pembayaran ${payment_type === 'full' ? 'Lunas 100%' : 'DP'} Booking #${bookingId} - ${inquiry.client_name}`,
      referenceId: referenceId,
      notifyUrl: notifyUrl,
      expiryMinutes: expiryMinutes
    });

    if (qrisResult.ok) {
      const q = qrisResult.data;
      const expiredAtIso = new Date(Date.now() + (expiryMinutes * 60 * 1000)).toISOString();
      db.prepare(`
        INSERT INTO qris_transactions (
          booking_id, trx_id, session_id, reference_id, payment_type, amount,
          qr_image, qr_string, expired_at, status, raw_response
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        bookingId,
        String(q.transactionId),
        q.sessionId || '',
        referenceId,
        payment_type,
        chargeAmount,
        q.qrImage,
        q.qrString,
        expiredAtIso,
        JSON.stringify(q)
      );

      // Update package_id di inquiry tapi status tetap booking_link_active sampai bayar
      db.prepare("UPDATE inquiries SET package_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(pkg.id, inquiry.id);

      // Kunci sisa detik riil link booking (PAUSE murni) tanpa manipulasi tanggal expires_at
      try {
        let remainingSec = tokenRow.paused_remaining_seconds;
        if (remainingSec == null) {
          remainingSec = Math.max(0, Math.floor((new Date(tokenRow.expires_at).getTime() - Date.now()) / 1000));
        }
        db.prepare('UPDATE booking_tokens SET paused_remaining_seconds = ?, paused_at = CURRENT_TIMESTAMP WHERE id = ?').run(remainingSec, tokenRow.id);
        tokenRow.paused_remaining_seconds = remainingSec;
      } catch (tokErr) {
        console.error('[TokenPause] Error locking paused seconds:', tokErr.message);
      }

      // Kirim notifikasi Email Tagihan & Kode QRIS ke inbox klien
      const bookingRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
      if (bookingRow && bookingRow.client_email) {
        const paymentUrl = `${appBaseUrl.replace(/\/+$/, '')}/confirm-booking.html?token=${req.params.token}`;
        emailService.sendClientQrisInvoiceEmail({
          booking: { ...bookingRow, package_name: pkg.name },
          qrisData: {
            amount: chargeAmount,
            payment_type: payment_type,
            expired_at: expiredAtIso,
            qr_image: q.qrImage
          },
          paymentUrl
        }).catch(err => console.error('[EmailService] QRIS invoice email error:', err.message));
      }

      res.json({
        success: true,
        booking_id: bookingId,
        tracking_token: trackingToken,
        payment_type: payment_type,
        amount: chargeAmount,
        total_price: totalPrice,
        qr_image: q.qrImage,
        qr_string: q.qrString,
        qr_template: q.qrTemplate,
        expired_at: expiredAtIso,
        expiry_minutes: expiryMinutes,
        reference_id: referenceId,
        transaction_id: q.transactionId
      });
    } else {
      res.status(400).json({ error: 'Gagal membuat QRIS: ' + (qrisResult.error || 'Server iPaymu sibuk') });
    }
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses pembuatan QRIS: ' + err.message });
  }
});

// POST /api/public/booking-token/:token/cancel-qris — Batalkan QRIS aktif dan lanjutkan (resume) waktu link booking
router.post('/booking-token/:token/cancel-qris', (req, res) => {
  try {
    const tokenRow = db.prepare('SELECT * FROM booking_tokens WHERE token = ?').get(req.params.token);
    if (!tokenRow) return res.status(404).json({ error: 'Link booking tidak valid' });

    const booking = db.prepare('SELECT * FROM bookings WHERE inquiry_id = ? ORDER BY id DESC LIMIT 1').get(tokenRow.inquiry_id);
    if (booking) {
      // 1. Batalkan semua transaksi QRIS yang berstatus pending untuk booking ini
      db.prepare("UPDATE qris_transactions SET status = 'cancelled', updated_at = datetime('now') WHERE booking_id = ? AND status = 'pending'").run(booking.id);
    }

    // 2. Resume token booking: hitung expires_at baru jika sebelumnya di-pause
    let newExpiresAt = tokenRow.expires_at;
    if (tokenRow.paused_remaining_seconds != null) {
      newExpiresAt = new Date(Date.now() + (tokenRow.paused_remaining_seconds * 1000)).toISOString();
      db.prepare('UPDATE booking_tokens SET expires_at = ?, paused_remaining_seconds = NULL, paused_at = NULL WHERE id = ?').run(newExpiresAt, tokenRow.id);
    }

    res.json({
      success: true,
      message: 'QRIS berhasil dibatalkan dan waktu link booking dilanjutkan',
      expires_at: newExpiresAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membatalkan QRIS: ' + err.message });
  }
});

// POST /api/public/booking/:id/balance-qris — Buat tagihan QRIS untuk Pelunasan Sisa
router.post('/booking/:id/balance-qris', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const code = req.body.code || req.query.code;
  // SEC-04 fix: wajib ada dan hanya tracking_token yang valid (hapus integer ID bypass)
  if (!code || code !== booking.tracking_token) {
    return res.status(403).json({ error: 'Akses ditolak: Token tidak valid' });
  }

  if (booking.balance_status === 'paid' || booking.balance_amount <= 0) {
    return res.status(400).json({ error: 'Pelunasan sudah lunas / tidak ada sisa tagihan' });
  }

  const settings = getSettings();
  if (String(settings.ipaymu_enabled) !== '1' || String(settings.ipaymu_verified) !== '1' || !settings.ipaymu_va || !settings.ipaymu_api_key) {
    return res.status(400).json({ error: 'Pembayaran QRIS saat ini sedang tidak aktif. Silakan hubungi admin.' });
  }

  // Cek apakah ada QRIS pelunasan yang masih aktif (pending dan belum expired)
  const pendingTransactions = db.prepare(`
    SELECT * FROM qris_transactions
    WHERE booking_id = ? AND payment_type = 'balance' AND status = 'pending'
    ORDER BY id DESC LIMIT 5
  `).all(bookingId);

  let existingActiveQris = null;
  for (const trx of pendingTransactions) {
    if (trx.expired_at) {
      let expMs = new Date(trx.expired_at).getTime();
      if (isNaN(expMs)) {
        expMs = new Date(String(trx.expired_at).replace(/-/g, '/')).getTime();
      }
      if (!isNaN(expMs) && expMs > Date.now()) {
        existingActiveQris = trx;
        break;
      } else if (!isNaN(expMs) && expMs <= Date.now()) {
        db.prepare("UPDATE qris_transactions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(trx.id);
      }
    }
  }

  if (existingActiveQris) {
    let expiredAtMs = new Date(existingActiveQris.expired_at).getTime();
    if (isNaN(expiredAtMs)) {
      expiredAtMs = new Date(String(existingActiveQris.expired_at).replace(/-/g, '/')).getTime();
    }
    const remainingSeconds = Math.max(0, Math.floor((expiredAtMs - Date.now()) / 1000));
    return res.json({
      ok: true,
      data: {
        qr_image: existingActiveQris.qr_image,
        qr_string: existingActiveQris.qr_string,
        transaction_id: existingActiveQris.trx_id,
        session_id: existingActiveQris.session_id,
        reference_id: existingActiveQris.reference_id,
        expired_at: existingActiveQris.expired_at,
        expiry_minutes: Math.ceil(remainingSeconds / 60),
        remaining_seconds: remainingSeconds,
        amount: existingActiveQris.amount,
        reused: true
      }
    });
  }

  const referenceId = `BOOKING-${bookingId}-BAL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const appBaseUrl = resolveAppBaseUrl(settings, req);
  const notifyUrl = `${appBaseUrl.replace(/\/+$/, '')}/api/public/payment/ipaymu/notify`;
  const expiryMinutes = parseInt(settings.ipaymu_qris_expiry_minutes || 15, 10);

  try {
    const qrisResult = await ipaymuService.createQrisPayment({
      env: settings.ipaymu_env || 'sandbox',
      va: settings.ipaymu_va,
      apiKey: settings.ipaymu_api_key,
      name: booking.client_name || 'Client Wisuda',
      phone: booking.client_phone || '08123456789',
      email: booking.client_email || 'client@wisuda.app',
      amount: Number(booking.balance_amount),
      referenceId,
      notifyUrl,
      comments: `Pelunasan Sisa Foto Wisuda ${booking.package_name || ''} (#BK-${booking.id})`,
      expiryMinutes
    });

    if (!qrisResult.ok) {
      return res.status(400).json({ error: 'Gagal membuat QRIS pelunasan: ' + (qrisResult.error || 'Server iPaymu sibuk') });
    }

    const q = qrisResult.data;
    const expiredAtIso = new Date(Date.now() + (expiryMinutes * 60 * 1000)).toISOString();
    db.prepare(`
      INSERT INTO qris_transactions (
        booking_id, trx_id, session_id, reference_id, payment_type, amount,
        qr_image, qr_string, expired_at, status, raw_response
      ) VALUES (?, ?, ?, ?, 'balance', ?, ?, ?, ?, 'pending', ?)
    `).run(
      bookingId,
      String(q.transactionId),
      q.sessionId || '',
      referenceId,
      Number(booking.balance_amount),
      q.qrImage,
      q.qrString,
      expiredAtIso,
      JSON.stringify(q)
    );

    // Kirim notifikasi Email Tagihan & Kode QRIS Pelunasan ke inbox klien
    if (booking.client_email) {
      const paymentUrl = `${appBaseUrl.replace(/\/+$/, '')}/tracking.html?code=${booking.tracking_token || booking.id}`;
      emailService.sendClientQrisInvoiceEmail({
        booking: { ...booking, package_name: booking.package_name },
        qrisData: {
          amount: booking.balance_amount,
          payment_type: 'balance',
          expired_at: expiredAtIso,
          qr_image: q.qrImage
        },
        paymentUrl
      }).catch(err => console.error('[EmailService] Balance QRIS invoice email error:', err.message));
    }

    res.json({
      success: true,
      booking_id: bookingId,
      tracking_token: booking.tracking_token,
      payment_type: 'balance',
      amount: booking.balance_amount,
      qr_image: q.qrImage,
      qr_string: q.qrString,
      qr_template: q.qrTemplate,
      expired_at: expiredAtIso,
      expiry_minutes: expiryMinutes,
      reference_id: referenceId,
      transaction_id: q.transactionId
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses QRIS pelunasan: ' + err.message });
  }
});

// GET /api/public/payment/qris/:referenceId/status — Polling Status QRIS Real-Time dari Browser Klien
router.get('/payment/qris/:referenceId/status', (req, res) => {
  const { referenceId } = req.params;
  const qrisTrx = db.prepare('SELECT * FROM qris_transactions WHERE reference_id = ? OR trx_id = ?').get(referenceId, referenceId);
  if (!qrisTrx) {
    return res.status(404).json({ error: 'Data transaksi QRIS tidak ditemukan' });
  }

  const booking = db.prepare('SELECT id, client_name, status, dp_status, balance_status, tracking_token FROM bookings WHERE id = ?').get(qrisTrx.booking_id);

  res.json({
    success: true,
    status: qrisTrx.status, // 'pending', 'paid', 'expired'
    payment_type: qrisTrx.payment_type,
    amount: qrisTrx.amount,
    booking_id: qrisTrx.booking_id,
    booking_status: booking ? booking.status : null,
    dp_status: booking ? booking.dp_status : null,
    balance_status: booking ? booking.balance_status : null
    // tracking_token sengaja TIDAK dikembalikan (NEW-03 fix — mencegah token leak via QRIS poll)
  });
});

// POST /api/public/payment/ipaymu/notify — Webhook Notifikasi Otomatis dari Server iPaymu
router.post('/payment/ipaymu/notify', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    // ─── SECURITY: Verifikasi Signature iPaymu ─────────────────────────────────
    // iPaymu mengirim signature via header 'signature'.
    // Formula: HMAC-SHA256(apiKey, "POST:va:SHA256_lowercase(bodyJSON):apiKey")
    // Jika signature tidak cocok, request WAJIB ditolak — bisa jadi pemalsuan.
    const webhookSettings = getSettings();
    const ipaymuVa = webhookSettings.ipaymu_va;
    const ipaymuApiKey = webhookSettings.ipaymu_api_key;
    const ipaymuEnabled = String(webhookSettings.ipaymu_enabled) === '1' && String(webhookSettings.ipaymu_verified) === '1';

    if (ipaymuEnabled && ipaymuVa && ipaymuApiKey) {
      const incomingSignature = req.headers['signature'] || req.headers['x-signature'] || '';
      if (incomingSignature) {
        // Hitung ulang expectedSignature dari payload body yang diterima
        // Formula iPaymu: HMAC-SHA256(apiKey, "POST:va:SHA256_lowercase(bodyJSON):apiKey")
        const expectedSignature = ipaymuService.generateSignature(req.body, 'POST', ipaymuVa, ipaymuApiKey);
        const incBuf = Buffer.from(incomingSignature.toLowerCase());
        const expBuf = Buffer.from(expectedSignature.toLowerCase());
        const sigMatch = incBuf.length === expBuf.length && crypto.timingSafeEqual(incBuf, expBuf);
        if (!sigMatch) {
          if (String(webhookSettings.ipaymu_env) === 'production') {
            console.warn(`[iPaymu Webhook] ⚠️ SIGNATURE MISMATCH — kemungkinan request palsu! incoming=${incomingSignature.slice(0, 16)}...`);
            return res.status(401).json({ status: 401, error: 'Invalid signature' });
          } else {
            console.warn(`[iPaymu Webhook] ⚠️ Sandbox Mode: Signature mismatch dari simulator iPaymu ditoleransi untuk keperluan testing.`);
          }
        } else {
          console.log('[iPaymu Webhook] ✅ Signature verified OK');
        }
      } else {
        // SEC-02 fix: Jika production mode, TOLAK request tanpa signature (hard reject)
        if (String(webhookSettings.ipaymu_env) === 'production') {
          console.error('[iPaymu Webhook] 🛑 REJECTED: Header signature wajib di lingkungan production. Request ditolak.');
          return res.status(401).json({ status: 401, error: 'Signature header is required in production mode' });
        }
        // Di sandbox, header ini mungkin tidak dikirim iPaymu — log warning dan lanjutkan
        console.warn('[iPaymu Webhook] ⚠️ Header signature tidak ditemukan di mode sandbox — diproses dengan peringatan.');
      }
    }
    // ──────────────────────────────────────────────────────────────────────────────

    const payload = req.body || {};
    const trxId = payload.trx_id || payload.transaction_id || payload.id;
    const referenceId = payload.reference_id || payload.referenceId || payload.sid;
    const status = String(payload.status || '').toLowerCase();
    const statusCode = String(payload.status_code || '');

    console.log(`[iPaymu Webhook] Received notification: trx_id=${trxId}, reference_id=${referenceId}, status=${status}, status_code=${statusCode}`);

    const isSuccess = status === 'berhasil' || status === 'settlement' || statusCode === '1';

    let qrisTrx = null;
    if (referenceId) {
      qrisTrx = db.prepare('SELECT * FROM qris_transactions WHERE reference_id = ?').get(referenceId);
    }
    if (!qrisTrx && trxId) {
      qrisTrx = db.prepare('SELECT * FROM qris_transactions WHERE trx_id = ?').get(String(trxId));
    }

    if (!qrisTrx) {
      console.warn(`[iPaymu Webhook] Transaction not found for ref=${referenceId}, trx=${trxId}`);
      return res.status(200).json({ status: 200, message: 'Notification received but record not matched' });
    }

    // SECURITY FIX #1: Idempotency — cek apakah webhook sudah pernah diproses
    const existingLog = db.prepare(
      "SELECT id FROM webhook_logs WHERE reference_id = ? OR trx_id = ?"
    ).get(referenceId, String(trxId));
    if (existingLog) {
      console.log(`[iPaymu Webhook] ✅ Idempotency check passed — already processed webhook_logs=${existingLog.id} for ref=${referenceId}`);
      return res.json({ status: 200, message: 'Webhook already processed (idempotency)' });
    }

    // SECURITY FIX #2: Grace period anti-stale webhook
    // Hanya proses webhook dalam 5 detik setelah transaction dibuat
    if (qrisTrx.created_at) {
      // Append 'Z' to treat SQLite's CURRENT_TIMESTAMP (YYYY-MM-DD HH:MM:SS) as UTC
      const createdAtStr = qrisTrx.created_at.endsWith('Z') ? qrisTrx.created_at : qrisTrx.created_at + 'Z';
      const createdAt = new Date(createdAtStr).getTime();
      const ageMs = Date.now() - createdAt;
      if (ageMs < 0 || ageMs > 5000) {
        console.log(`[iPaymu Webhook] Discarded stale webhook ref=${referenceId}, age=${ageMs}ms`);
        return res.status(200).json({ status: 200, message: 'Stale transaction (age > 5s or future timestamp)' });
      }
    }

    // Security: Validate this is the latest QRIS transaction for the booking
    // Prevent race condition where webhook from a previous (cancelled/regenerated) QRIS
    // arrives after user generates a new one — only accept the latest pending transaction
    if (qrisTrx.status !== 'pending' || qrisTrx.status === 'cancelled') {
      console.log(`[iPaymu Webhook] Discarding webhook for non-pending transaction ref=${referenceId} status=${qrisTrx.status}`);
      return res.status(200).json({ status: 200, message: 'Transaction not in pending state — likely superseded' });
    }

    // Verify this is the active/latest QRIS for this booking
    const latestActiveQris = db.prepare("SELECT id FROM qris_transactions WHERE booking_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1").get(qrisTrx.booking_id);
    if (!latestActiveQris || latestActiveQris.id !== qrisTrx.id) {
      console.log(`[iPaymu Webhook] Discarding webhook — order ${referenceId} is not the latest active QRIS (latest active: ${latestActiveQris?.id || 'none'})`);
      return res.status(200).json({ status: 200, message: 'Stale transaction — not the latest active QRIS' });
    }

    if (isSuccess && qrisTrx.status !== 'paid') {
      // SECURITY FIX #3: Payment type validation — pastikan update sesuai payment_type
      // full: langsung lunasi dp + balance
      // dp: hanya update dp_status
      // balance: hanya update balance_status (pastikan DP sudah paid dulu)
      const validPaymentType = ['full', 'dp', 'balance'].includes(qrisTrx.payment_type);
      if (!validPaymentType) {
        console.error(`[iPaymu Webhook] Invalid payment_type '${qrisTrx.payment_type}' for ref=${referenceId}`);
        return res.status(400).json({ status: 400, message: 'Invalid payment type' });
      }

      db.prepare("UPDATE qris_transactions SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(qrisTrx.id);

      const booking = db.prepare('SELECT b.*, p.name as package_name FROM bookings b LEFT JOIN packages p ON b.package_id = p.id WHERE b.id = ?').get(qrisTrx.booking_id);
      if (booking) {
        const settings = getSettings();
        const trackingToken = ensureTrackingToken(booking, db);
        const appBaseUrl = resolveAppBaseUrl(settings, req);
        const trackingUrl = `${appBaseUrl.replace(/\/+$/, '')}/tracking.html?token=${trackingToken}`;

        // 1. Hitung total dana riil yang sudah diterima di seluruh transaksi QRIS yang sukses untuk booking ini
        const paidQrisRows = db.prepare("SELECT * FROM qris_transactions WHERE booking_id = ? AND status = 'paid'").all(booking.id);
        const totalCashReceived = paidQrisRows.reduce((acc, row) => acc + Number(row.amount || 0), 0);
        const totalPrice = Number(booking.total_price || 0);

        // 2. Evaluasi apakah Lunas (dengan/tanpa Overpayment) ataukah Pembayaran Sebagian (DP)
        const isFullOrOverpaid = totalCashReceived >= totalPrice;
        const overpaymentAmount = isFullOrOverpaid ? (totalCashReceived - totalPrice) : 0;

        if (isFullOrOverpaid) {
          // Lunas 100% (atau terdapat kelebihan bayar)
          const assignDone = db.prepare("SELECT id FROM assignments WHERE booking_id = ? AND status IN ('done', 'completed')").get(booking.id);
          const nextStatus = (assignDone || booking.is_session_done) ? 'post_production' : 'confirmed';
          db.prepare(`
            UPDATE bookings 
            SET dp_amount = ?, dp_status = 'paid', balance_amount = 0, balance_status = 'paid',
                dp_verified_at = COALESCE(dp_verified_at, datetime('now')),
                balance_verified_at = datetime('now'),
                status = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(totalPrice, nextStatus, booking.id);

          try {
            const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
            saveFinalInvoiceSnapshot(updatedBooking, db);
          } catch (invErr) {
            console.error('[iPaymu Webhook] Failed to save final invoice snapshot:', invErr);
          }

          if (overpaymentAmount > 0) {
            // Skenario Kelebihan Bayar (Overpayment)
            try {
              db.prepare(`
                INSERT INTO notifications (user_type, user_id, type, title, message, data, read, sent_at)
                VALUES ('admin', 1, 'qris_overpayment', ?, ?, ?, 0, CURRENT_TIMESTAMP)
              `).run(
                `🚨 Kelebihan Pembayaran QRIS (#${booking.id})`,
                `Klien ${booking.client_name} membayar dengan total Rp ${totalCashReceived.toLocaleString('id-ID')} (Harga Paket: Rp ${totalPrice.toLocaleString('id-ID')}). Terdapat kelebihan dana Rp ${overpaymentAmount.toLocaleString('id-ID')} yang perlu di-refund atau dialihkan ke add-on.`,
                JSON.stringify({
                  booking_id: booking.id,
                  client_name: booking.client_name,
                  client_phone: booking.client_phone,
                  total_received: totalCashReceived,
                  package_price: totalPrice,
                  overpayment_amount: overpaymentAmount
                })
              );
            } catch (notifErr) {
              console.error('[iPaymu Webhook] Failed to insert admin overpayment notif:', notifErr.message);
            }

            if (booking.client_email) {
              emailService.sendClientOverpaymentEmail({
                booking,
                totalReceived: totalCashReceived,
                overpaymentAmount,
                trackingUrl
              }).catch(e => console.error('[EmailService] Overpayment email error:', e.message));
            }
          } else {
            // Skenario Lunas Normal
            const templates = getWaTemplates();
            const companyName = settings.company_name || settings.companyName || 'Studio';
            const waTemplate = templates.client_fully_paid || `✅ Pelunasan Terverifikasi — ${companyName}\n\nHalo ${booking.client_name}, pembayaran lunas 100% foto wisuda kamu (#BKG-${booking.id}) telah kami terima via QRIS!\n\n🔍 Lacak status & akses pemilihan foto kamu di sini:\n${trackingUrl}\n\nTerima kasih!`;
            const waMessage = waTemplate
              .replace(/{company_name}/g, companyName)
              .replace(/{client_name}/g, booking.client_name || 'Kak')
              .replace(/{booking_id}/g, String(booking.id))
              .replace(/{tracking_url}/g, trackingUrl);
            const waUrl = `https://wa.me/${booking.client_phone}?text=${encodeURIComponent(waMessage)}`;

            try {
              db.prepare(`
                INSERT INTO notifications (user_type, user_id, type, title, message, data, read, sent_at)
                VALUES ('admin', 1, 'qris_paid', ?, ?, ?, 0, CURRENT_TIMESTAMP)
              `).run(
                `Pembayaran Lunas QRIS Masuk (#${booking.id})`,
                `Klien ${booking.client_name} telah membayar lunas 100% sebesar Rp ${totalPrice.toLocaleString('id-ID')} via QRIS iPaymu.`,
                JSON.stringify({
                  booking_id: booking.id,
                  client_name: booking.client_name,
                  client_phone: booking.client_phone,
                  payment_type: 'full',
                  amount: totalPrice,
                  wa_url: waUrl
                })
              );
            } catch (notifErr) {}

            if (booking.client_email) {
              emailService.sendClientBalancePaidEmail({
                booking,
                trackingUrl
              }).catch(e => console.error('[EmailService] Full Paid email error:', e.message));
            }
          }
        } else {
          // Skenario Pembayaran Sebagian (Otomatis Menjadi DP Sah)
          const dpPaid = totalCashReceived;
          const balanceRemaining = totalPrice - dpPaid;

          db.prepare(`
            UPDATE bookings 
            SET dp_amount = ?, dp_status = 'paid', balance_amount = ?, balance_status = 'unpaid',
                dp_verified_at = datetime('now'), status = 'confirmed', updated_at = datetime('now')
            WHERE id = ?
          `).run(dpPaid, balanceRemaining, booking.id);

          const templates = getWaTemplates();
          const companyName = settings.company_name || settings.companyName || 'Studio';
          const waTemplate = templates.client_dp_verified || `✅ Pembayaran DP Terverifikasi — ${companyName}\n\nHalo ${booking.client_name}, pembayaran DP foto wisuda kamu (#BKG-${booking.id}) sebesar Rp ${dpPaid.toLocaleString('id-ID')} telah kami terima via QRIS!\nSisa tagihan pelunasan: Rp ${balanceRemaining.toLocaleString('id-ID')}.\n\n🔍 Lacak progres & detail jadwal kamu di sini:\n${trackingUrl}\n\nTerima kasih!`;
          const waMessage = waTemplate
            .replace(/{company_name}/g, companyName)
            .replace(/{client_name}/g, booking.client_name || 'Kak')
            .replace(/{booking_id}/g, String(booking.id))
            .replace(/{dp_amount}/g, dpPaid.toLocaleString('id-ID'))
            .replace(/{balance_amount}/g, balanceRemaining.toLocaleString('id-ID'))
            .replace(/{tracking_url}/g, trackingUrl);
          const waUrl = `https://wa.me/${booking.client_phone}?text=${encodeURIComponent(waMessage)}`;

          try {
            db.prepare(`
              INSERT INTO notifications (user_type, user_id, type, title, message, data, read, sent_at)
              VALUES ('admin', 1, 'qris_paid', ?, ?, ?, 0, CURRENT_TIMESTAMP)
            `).run(
              `Pembayaran DP QRIS Masuk (#${booking.id})`,
              `Klien ${booking.client_name} telah membayar DP sebesar Rp ${dpPaid.toLocaleString('id-ID')} via QRIS iPaymu (Sisa: Rp ${balanceRemaining.toLocaleString('id-ID')}).`,
              JSON.stringify({
                booking_id: booking.id,
                client_name: booking.client_name,
                client_phone: booking.client_phone,
                payment_type: 'dp',
                amount: dpPaid,
                wa_url: waUrl
              })
            );
          } catch (notifErr) {}

          if (booking.client_email) {
            emailService.sendClientDpVerifiedEmail({
              booking: { ...booking, dp_amount: dpPaid, balance_amount: balanceRemaining },
              trackingUrl
            }).catch(e => console.error('[EmailService] DP Verified email error:', e.message));
          }
        }

        // Tandai inquiry sebagai converted & token used
        if (booking.inquiry_id) {
          try {
            db.prepare("UPDATE inquiries SET status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(booking.inquiry_id);
            db.prepare("UPDATE booking_tokens SET used = 1, paused_remaining_seconds = NULL, paused_at = NULL WHERE inquiry_id = ?").run(booking.inquiry_id);
          } catch (e) {}
        }
      }
    } else if (status === 'expired' || status === 'kadaluarsa') {
      db.prepare("UPDATE qris_transactions SET status = 'expired', updated_at = datetime('now') WHERE id = ?").run(qrisTrx.id);
    }

    // SSE: push real-time update ke browser klien yang sedang buka tracking page
    if (qrisTrx && isSuccess) {
      sseService.notifyBookingUpdate(qrisTrx.booking_id);
    }

    // SECURITY FIX #3: Idempotency — simpan webhook log setelah berhasil diproses
    try {
      db.prepare(
        "INSERT INTO webhook_logs (reference_id, trx_id) VALUES (?, ?)"
      ).run(referenceId, String(trxId));
    } catch (logErr) {
      console.warn('[iPaymu Webhook] Failed to save webhook log:', logErr.message);
    }

    res.status(200).json({ status: 200, message: 'Notification processed successfully' });
  } catch (err) {
    console.error('[iPaymu Webhook] Error processing notification:', err);
    res.status(500).json({ status: 500, error: err.message });
  }
});

router.get('/bookings/:id/invoice', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });

  // NEW-01 fix: wajib sertakan tracking_token untuk akses invoice
  const token = req.query.token || req.headers['x-tracking-token'] || '';
  if (!token) return res.status(401).json({ error: 'Token tracking wajib untuk mengakses invoice.' });

  const booking = db.prepare(`
    SELECT b.*, p.name as package_name, p.description as package_description
    FROM bookings b
    JOIN packages p ON b.package_id = p.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Invoice tidak ditemukan' });

  if (booking.tracking_token && token !== booking.tracking_token) {
    return res.status(403).json({ error: 'Token tidak valid. Akses ditolak.' });
  }

  const settings = getSettings();

  // Strip field sensitif yang tidak relevan untuk invoice
  const { download_url, download_password, staging_files, dp_bukti_url, balance_bukti_url, ...safeBooking } = booking;

  res.json({
    ...safeBooking,
    company_name: settings.company_name || settings.companyName || '',
    company_phone: settings.company_phone || settings.companyPhone || '',
    company_address: settings.company_address || settings.companyAddress || '',
    logo_url: settings.logo_url || ''
  });
});

// Alias /track/:token for legacy/shortlink compatibility (Redirects to beautiful UI page)
router.get('/track/:token', (req, res) => {
  const token = req.params.token;
  return res.redirect(307, `/tracking.html?code=${encodeURIComponent(token)}`);
});

router.get('/tracking', (req, res) => {
  const tokenOrPhone = (req.query.code || req.query.token || req.query.phone || req.query.client_phone || req.query.wa || '').trim();
  const cleanPhoneStr = (req.query.phone || req.query.client_phone || req.query.wa || '').trim();
  const tokenInput = (req.query.code || req.query.token || '').trim();

  if (!tokenOrPhone) {
    return res.status(400).json({ error: 'Mohon masukkan Kode Token Tracking (TRK-...) atau Nomor WhatsApp Anda.' });
  }

  // Robust Phone Sanitizer & Normalizer
  let rawDigits = tokenOrPhone.replace(/[^0-9]/g, '');
  let normalized62Phone = rawDigits;
  let normalized08Phone = rawDigits;
  let tailDigits = rawDigits.length >= 8 ? rawDigits.slice(-9) : rawDigits;

  if (rawDigits.startsWith('0')) {
    normalized62Phone = '62' + rawDigits.slice(1);
    normalized08Phone = rawDigits;
  } else if (rawDigits.startsWith('62')) {
    normalized62Phone = rawDigits;
    normalized08Phone = '0' + rawDigits.slice(2);
  } else if (rawDigits.length >= 9) {
    normalized62Phone = '62' + rawDigits;
    normalized08Phone = '0' + rawDigits;
  }

  // Look up booking by tracking_token OR normalized phone variants
  let foundBooking = db.prepare(`
    SELECT id FROM bookings 
    WHERE tracking_token = ? 
       OR client_phone = ? 
       OR client_phone = ? 
       OR (length(?) >= 8 AND client_phone LIKE ?)
    ORDER BY created_at DESC LIMIT 1
  `).get(tokenOrPhone, normalized62Phone, normalized08Phone, tailDigits, '%' + tailDigits);

  if (!foundBooking) {
    return res.status(400).json({ error: 'Kode Token Tracking atau Nomor WhatsApp tidak ditemukan.' });
  }

  const bookingId = foundBooking.id;

  const selectFields = `
    b.*, p.name as package_name, 
    f.name as fg_name, f.phone as fg_phone,
    a.id as assignment_id, a.status as assignment_status, a.shoot_end_at, a.fg_confirmed_at,
    d.id as deliverable_id, d.drive_folder_url as fg_drive_url, d.delivery_type as delivery_type
  `;
  const fromJoin = `
    FROM bookings b 
    LEFT JOIN packages p ON b.package_id = p.id 
    LEFT JOIN assignments a ON a.booking_id = b.id AND a.status != 'cancelled'
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
  `;

  let booking = null;

  if (cleanPhoneStr) {
    let cleanPhoneDigits = cleanPhoneStr.replace(/[^0-9]/g, '');
    if (cleanPhoneDigits.startsWith('0')) {
      cleanPhoneDigits = '62' + cleanPhoneDigits.slice(1);
    }
    const zeroPhoneDigits = '0' + cleanPhoneDigits.slice(2);
    const tail8Digits = cleanPhoneDigits.slice(-8);

    booking = db.prepare(`
      SELECT ${selectFields} ${fromJoin}
      WHERE b.id = ? AND (
        b.client_phone = ? OR 
        b.client_phone = ? OR
        b.client_phone LIKE ?
      )
    `).get(bookingId, cleanPhoneDigits, zeroPhoneDigits, `%${tail8Digits}`);

    if (!booking) {
      return res.status(400).json({ error: 'No. WhatsApp tidak cocok dengan Kode Token yang dimasukkan.' });
    }
  } else {
    // Direct link access with token (no phone required if opened via token link)
    booking = db.prepare(`
      SELECT ${selectFields} ${fromJoin}
      WHERE b.id = ?
    `).get(bookingId);
  }

  if (!booking) {
    return res.json(null);
  }

  // Add formatting/computed fields for the public template
  const settings = getSettings();

  // Status mapping
  const statusLabels = {
    pending: 'Menunggu Verifikasi',
    confirmed: 'Dikonfirmasi (Aktif)',
    shooting: 'Sesi Foto Sedang Berlangsung',
    editing: 'Sesi Foto Selesai (Post Production)',
    delivered: 'Hasil Foto Terkirim',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  };

  const statusLabel = statusLabels[booking.status] || booking.status;

  // Formatted date helper
  const formatDateHelper = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return dateStr; }
  };

  const isSessionDone = ['done', 'completed', 'uploaded'].includes(booking.assignment_status) ||
                        !!booking.shoot_end_at || !!booking.fg_confirmed_at ||
                        ['post_production', 'delivered', 'completed'].includes(booking.status);

  const isFileSubmitted = !!booking.fg_drive_url || booking.delivery_type === 'fisik' ||
                          ['uploaded', 'done', 'completed'].includes(booking.assignment_status);

  // SEC-03 fix: Hanya tracking_token yang valid — integer ID tidak lagi diterima sebagai auth
  const tokenMatches = Boolean(
    (tokenInput && tokenInput === booking.tracking_token) ||
    (tokenOrPhone && tokenOrPhone === booking.tracking_token)
  );

  let expiryDate = booking.drive_expiry_date;
  if (!expiryDate && booking.drive_parent_url) {
    const retentionMonths = parseInt(settings.drive_retention_months || '3', 10);
    db.prepare(`
      UPDATE bookings
      SET drive_expiry_date = date(COALESCE(updated_at, CURRENT_TIMESTAMP), '+' || ? || ' month')
      WHERE id = ?
    `).run(retentionMonths, booking.id);
    const updatedRow = db.prepare('SELECT drive_expiry_date FROM bookings WHERE id = ?').get(booking.id);
    expiryDate = updatedRow ? updatedRow.drive_expiry_date : null;
  }

  let activeBalanceQris = null;
  if (booking.balance_status !== 'paid' && Number(booking.balance_amount || 0) > 0) {
    const pendingTrxList = db.prepare(`
      SELECT * FROM qris_transactions
      WHERE booking_id = ? AND payment_type = 'balance' AND status = 'pending'
      ORDER BY id DESC LIMIT 5
    `).all(booking.id);

    for (const qTrx of pendingTrxList) {
      if (qTrx.expired_at) {
        let expMs = new Date(qTrx.expired_at).getTime();
        if (isNaN(expMs)) {
          expMs = new Date(String(qTrx.expired_at).replace(/-/g, '/')).getTime();
        }
        if (!isNaN(expMs) && expMs > Date.now()) {
          const remainingSeconds = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
          activeBalanceQris = {
            qr_image: qTrx.qr_image,
            qr_string: qTrx.qr_string,
            transaction_id: qTrx.trx_id,
            session_id: qTrx.session_id,
            reference_id: qTrx.reference_id,
            expired_at: qTrx.expired_at,
            expiry_minutes: Math.ceil(remainingSeconds / 60),
            remaining_seconds: remainingSeconds,
            amount: qTrx.amount
          };
          break;
        } else if (!isNaN(expMs) && expMs <= Date.now()) {
          db.prepare("UPDATE qris_transactions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(qTrx.id);
        }
      }
    }
  }

  const pendingReschedule = db.prepare(`
    SELECT id, old_graduation_date, old_shooting_time, new_graduation_date, new_shooting_time, reason, created_at, status
    FROM reschedule_requests 
    WHERE booking_id = ? AND status = 'pending' 
    ORDER BY id DESC LIMIT 1
  `).get(booking.id);

  const formattedBooking = {
    ...booking,
    status_label: statusLabel,
    created_at_formatted: formatDateHelper(booking.created_at),
    graduation_date_raw: booking.graduation_date,
    graduation_date: formatDateHelper(booking.graduation_date),
    wa_link_client: `https://wa.me/${settings.adminPhone}`,
    company_name: settings.company_name || settings.companyName || 'AmsDev',
    bank_accounts: settings.bank_accounts || [],
    active_balance_qris: activeBalanceQris,
    pending_reschedule: pendingReschedule ? {
      id: pendingReschedule.id,
      old_graduation_date: formatDateHelper(pendingReschedule.old_graduation_date),
      old_graduation_date_raw: pendingReschedule.old_graduation_date,
      old_shooting_time: pendingReschedule.old_shooting_time || '09:00',
      new_graduation_date: formatDateHelper(pendingReschedule.new_graduation_date),
      new_graduation_date_raw: pendingReschedule.new_graduation_date,
      new_shooting_time: pendingReschedule.new_shooting_time,
      reason: pendingReschedule.reason || '',
      created_at: pendingReschedule.created_at,
      created_at_formatted: formatDateHelper(pendingReschedule.created_at)
    } : null,
    // Include assignment & deliverable state
    is_session_done: isSessionDone,
    is_file_submitted: isFileSubmitted,
    delivery_type: booking.delivery_type || null,
    // Include selection status for timeline display
    selection_status: booking.selection_status || 'pending',
    portfolio_consent: booking.portfolio_consent || 'pending',
    // Include highlight indicator (not the actual URL for security)
    highlight_drive_url: booking.highlight_drive_url ? true : false,
    token_verified: !!tokenMatches,
    access_token: tokenMatches ? (booking.tracking_token || tokenInput || tokenOrPhone) : null,
    download_url_unlocked: tokenMatches ? (booking.download_url || '') : null,
    highlight_drive_url_unlocked: (tokenMatches && (['cleaned', 'delivered', 'completed'].includes(booking.selection_status) || ['delivered', 'completed'].includes(booking.status))) ? (booking.highlight_drive_url || '') : null,
    drive_parent_url_unlocked: tokenMatches ? (booking.drive_parent_url || '') : null,
    drive_retention_months: settings.drive_retention_months || 3,
    drive_expiry_date: expiryDate,
    drive_expiry_date_formatted: formatDateHelper(expiryDate),
    drive_total_bytes: booking.drive_total_bytes || 0,
    drive_total_size_formatted: booking.folder_total_size_formatted || (booking.drive_total_bytes ? `${(booking.drive_total_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : null),
    folder_total_size_formatted: booking.folder_total_size_formatted || (booking.drive_total_bytes ? `${(booking.drive_total_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : null),
    google_client_id: getSetting('google_oauth_client_id', process.env.GOOGLE_OAUTH_CLIENT_ID || '') || null
  };

  // Strip sensitive download details
  delete formattedBooking.download_url;
  delete formattedBooking.download_password;
  delete formattedBooking.password;
  delete formattedBooking.tracking_token; // SEC-260817-02: jangan bocorkan token via phone search (access_token di atas sudah kondisional)

  res.json(formattedBooking);
});


router.post('/tracking/:id/confirm-receipt', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const code = req.body.code ? req.body.code.trim() : '';

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // Verifikasi via tracking token
  if (!code || code !== booking.tracking_token) { // SEC-04 fix: wajib ada
    return res.status(401).json({ error: 'Token tidak valid.' });
  }

  // Calculate folder total size ONCE when client confirms receipt
  try {
    const driveFolderService = require('../services/drive-folder.service');
    const folderId = booking.drive_parent_folder_id || driveFolderService.extractFolderIdFromUrl(booking.drive_parent_url || booking.download_url || booking.staging_drive_url || booking.highlight_drive_url);
    if (folderId) {
      const sizeResult = await driveFolderService.calculateFolderTotalSize(folderId);
      const formattedText = sizeResult?.formattedSize || sizeResult?.formatted || (sizeResult?.totalBytes ? driveFolderService.formatBytes(sizeResult.totalBytes) : '0 B');
      if (formattedText) {
        db.prepare("UPDATE bookings SET folder_total_size_formatted = ?, drive_total_bytes = ? WHERE id = ?")
          .run(formattedText, sizeResult?.totalBytes || 0, bookingId);
      }
    }
  } catch (e) {
    console.error('[ConfirmReceipt] Error calculating folder size:', e.message);
  }

  // Update booking status to completed
  db.prepare("UPDATE bookings SET status = 'completed', selection_status = 'cleaned', staging_files = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

  res.json({ success: true, message: 'Terima kasih! Pesanan telah dikonfirmasi selesai.' });
});

// GET /tracking/:id/master-files — List all files in master folder for client 1-click copy
router.get('/tracking/:id/master-files', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const code = (req.query.code || '').trim();

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (!code || code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Token tracking tidak valid' });
  }

  try {
    const driveFolderService = require('../services/drive-folder.service');
    const folderId = booking.drive_parent_folder_id || driveFolderService.extractFolderIdFromUrl(booking.drive_parent_url || booking.download_url || booking.staging_drive_url || booking.highlight_drive_url);
    if (!folderId) {
      return res.status(400).json({ error: 'Folder Google Drive belum tersedia' });
    }
    const files = await driveFolderService.listFilesInFolderHierarchy(folderId);
    let totalBytes = 0;
    files.forEach(f => { totalBytes += (f.size || 0); });

    return res.json({
      success: true,
      folderId,
      files,
      totalFiles: files.length,
      totalBytes,
      formattedTotalSize: driveFolderService.formatBytes(totalBytes)
    });
  } catch (e) {
    console.error('[MasterFiles] Error:', e.message);
    return res.status(500).json({ error: 'Gagal membaca berkas Google Drive: ' + e.message });
  }
});

// GET /tracking/:id/download-zip — Direct on-the-fly streaming ZIP download (Zero Disk Transit)
router.get('/tracking/:id/download-zip', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const code = (req.query.code || '').trim();

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (!code || code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Token tracking tidak valid' });
  }

  try {
    const driveFolderService = require('../services/drive-folder.service');
    const folderId = booking.drive_parent_folder_id || driveFolderService.extractFolderIdFromUrl(booking.drive_parent_url || booking.download_url || booking.staging_drive_url || booking.highlight_drive_url);
    if (!folderId) {
      return res.status(400).json({ error: 'Folder Google Drive belum tersedia' });
    }

    const cleanClientName = (booking.client_name || 'Dokumentasi').replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFileName = `Foto_Wisuda_${cleanClientName}.zip`;

    await driveFolderService.streamFolderAsZip(folderId, res, zipFileName);
  } catch (e) {
    console.error('[DownloadZip] Error:', e.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Gagal mengunduh ZIP: ' + e.message });
    }
  }
});

// POST /tracking/:id/recheck-folder-size — Client re-checks folder size on demand
router.post('/tracking/:id/recheck-folder-size', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const code = req.body.code ? req.body.code.trim() : '';

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (!code || code !== booking.tracking_token) { // SEC-04 fix: wajib ada
    return res.status(401).json({ error: 'Token tidak valid' });
  }

  try {
    const driveFolderService = require('../services/drive-folder.service');
    const folderId = booking.drive_parent_folder_id || driveFolderService.extractFolderIdFromUrl(booking.drive_parent_url || booking.download_url || booking.staging_drive_url || booking.highlight_drive_url);
    if (!folderId) {
      return res.status(400).json({ error: 'Folder Google Drive belum tersedia' });
    }
    const sizeResult = await driveFolderService.calculateFolderTotalSize(folderId);
    const formattedText = sizeResult?.formattedSize || sizeResult?.formatted || (sizeResult?.totalBytes ? driveFolderService.formatBytes(sizeResult.totalBytes) : '0 B');
    
    db.prepare("UPDATE bookings SET folder_total_size_formatted = ?, drive_total_bytes = ? WHERE id = ?")
      .run(formattedText, sizeResult?.totalBytes || 0, bookingId);
      
    return res.json({ success: true, folder_total_size_formatted: formattedText, drive_total_bytes: sizeResult?.totalBytes || 0 });
  } catch (e) {
    console.error('[RecheckFolderSize] Error:', e.message);
    return res.status(500).json({ error: 'Gagal terhubung ke Google Drive API: ' + e.message });
  }
});

// POST /tracking/:id/confirm-backup — Client confirms file download/backup secured
router.post('/tracking/:id/confirm-backup', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const code = req.body.code ? req.body.code.trim() : '';

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (!code || code !== booking.tracking_token) { // SEC-04 fix: wajib ada
    return res.status(401).json({ error: 'Token tracking tidak valid' });
  }

  try {
    db.prepare(`
      UPDATE bookings
      SET drive_cleanup_status = 'client_confirmed',
          client_confirmed_at = CURRENT_TIMESTAMP,
          drive_cleanup_notes = 'Klien mengonfirmasi file sudah diunduh & diamankan.'
      WHERE id = ?
    `).run(bookingId);

    res.json({
      success: true,
      message: '✓ Terima kasih! Anda telah mengonfirmasi bahwa seluruh file telah diunduh & diamankan.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan: ' + err.message });
  }
});

// POST /tracking/:id/portfolio-consent — Update client portfolio publication consent
router.post('/tracking/:id/portfolio-consent', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const { consent, pin, code } = req.body;

  if (!['approved', 'declined'].includes(consent)) {
    return res.status(400).json({ error: 'Nilai consent tidak valid' });
  }

  const booking = db.prepare('SELECT id, tracking_token FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // Verifikasi via tracking token
  if (!code || code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Akses tidak sah. Token tidak valid.' });
  }

  db.prepare("UPDATE bookings SET portfolio_consent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(consent, bookingId);

  // Auto publish/unpublish the portfolio item if it exists
  if (consent === 'approved') {
    db.prepare("UPDATE portfolio_items SET published = 1 WHERE booking_id = ?").run(bookingId);
  } else if (consent === 'declined') {
    db.prepare("UPDATE portfolio_items SET published = 0 WHERE booking_id = ?").run(bookingId);
  }

  res.json({
    success: true,
    message: consent === 'approved' 
      ? 'Terima kasih atas izin publikasi yang Anda berikan!' 
      : 'Pilihan Anda disimpan. Foto Anda tidak akan dipublikasikan.'
  });
});

// POST /tracking/:id/submit-rating — Client submits star rating & testimonial after completed
router.post('/tracking/:id/submit-rating', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const { code, rating, feedback_notes } = req.body;

  if (!rating || isNaN(parseFloat(rating)) || parseFloat(rating) < 1 || parseFloat(rating) > 5) {
    return res.status(400).json({ error: 'Rating harus berupa angka antara 1 dan 5' });
  }

  const booking = db.prepare('SELECT id, tracking_token, status, rating FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // Verifikasi via tracking token
  if (!code || code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Akses tidak sah. Token tidak valid.' });
  }

  // Hanya booking yang sudah completed boleh memberi rating
  if (booking.status !== 'completed') {
    return res.status(400).json({ error: 'Rating hanya dapat diberikan setelah transaksi selesai (completed).' });
  }

  // Rating can be created or updated as long as transaction is completed and tracking token is valid

  const ratingVal = Math.min(5.0, Math.max(1.0, parseFloat(rating)));
  const notesVal = (feedback_notes || '').trim() || null;

  // Simpan ke bookings
  db.prepare(`
    UPDATE bookings SET rating = ?, feedback_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(ratingVal, notesVal, bookingId);

  // Sync ke portfolio_items jika ada portofolio terkait booking ini
  db.prepare(`
    UPDATE portfolio_items SET rating = ?, feedback_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?
  `).run(ratingVal, notesVal, bookingId);

  res.json({
    success: true,
    message: 'Terima kasih! Rating dan ulasan Anda telah berhasil disimpan.'
  });
});

// POST /tracking/:id/reschedule — Client requests date & shooting time change
const { checkFgConflict } = require('../utils/timeSlot');

router.post('/tracking/:id/reschedule', [
  body('code').trim().notEmpty().withMessage('Token tracking wajib diisi'),
  body('new_graduation_date').isISO8601().withMessage('Tanggal baru tidak valid (YYYY-MM-DD)'),
  body('new_shooting_time').trim().matches(/^([01]?\d|2[0-3]):[0-5]\d$/).withMessage('Jam mulai baru tidak valid (HH:MM)'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Alasan max 500 karakter'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    next();
  }
], (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const { code, new_graduation_date, new_shooting_time, reason } = req.body;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (!code || code !== booking.tracking_token) {
    return res.status(401).json({ error: 'Akses tidak sah. Token tracking tidak valid.' });
  }

  // Check if there is already a pending reschedule request
  const existingPending = db.prepare("SELECT id FROM reschedule_requests WHERE booking_id = ? AND status = 'pending'").get(bookingId);
  if (existingPending) {
    return res.status(400).json({ error: 'Anda sudah memiliki permohonan reschedule yang sedang diproses oleh Admin.' });
  }

  // Check assigned FG and evaluate conflict status
  const assignment = db.prepare("SELECT fg_id FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(bookingId);
  let conflictStatus = 'no_fg';
  let conflictingBookingInfo = null;

  if (assignment && assignment.fg_id) {
    const conflictResult = checkFgConflict(
      db,
      assignment.fg_id,
      new_graduation_date,
      new_shooting_time,
      booking.duration_hours || 2,
      bookingId
    );
    conflictStatus = conflictResult.hasConflict ? 'conflict' : 'available';
    if (conflictResult.hasConflict) conflictingBookingInfo = conflictResult.conflictingBooking;
  }

  const result = db.prepare(`
    INSERT INTO reschedule_requests (
      booking_id, requested_by, old_graduation_date, old_shooting_time,
      new_graduation_date, new_shooting_time, reason, fg_conflict_status, status
    ) VALUES (?, 'client', ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    bookingId,
    booking.graduation_date,
    booking.shooting_time || '09:00',
    new_graduation_date,
    new_shooting_time,
    reason || '',
    conflictStatus
  );

  res.json({
    success: true,
    message: 'Permohonan perubahan jadwal berhasil dikirim. Tim Admin akan meninjau ketersediaan jadwal.',
    request_id: result.lastInsertRowid,
    fg_conflict_status: conflictStatus,
    conflict_details: conflictingBookingInfo ? 'Fotografer memiliki sesi foto lain di jam tersebut' : null
  });
});

// ============ PORTFOLIO FILES (direct from filesystem) ============
router.get('/portfolio-files', (req, res) => {
  try {
    // 1. Fetch featured items first (published & featured)
    const featuredItems = db.prepare('SELECT * FROM portfolio_items WHERE published = 1 AND featured = 1').all();
    const featuredPhotos = [];
    
    featuredItems.forEach(item => {
      let highlights = [];
      try { highlights = JSON.parse(item.highlight_photos || '[]'); } catch { highlights = []; }
      
      const photoList = [];
      if (item.cover_photo_url) photoList.push(item.cover_photo_url);
      if (Array.isArray(highlights)) photoList.push(...highlights);

      const uniquePhotos = Array.from(new Set(photoList));
      uniquePhotos.forEach(pUrl => {
        if (pUrl) {
          featuredPhotos.push({
            src: pUrl,
            caption: item.client_initial || 'Wisudawan',
            univ: item.university || 'Makassar',
            label: item.graduation_year ? `Wisuda ${item.graduation_year}` : 'Momen Kelulusan'
          });
        }
      });
    });

    // Shuffle featured photos randomly
    for (let i = featuredPhotos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [featuredPhotos[i], featuredPhotos[j]] = [featuredPhotos[j], featuredPhotos[i]];
    }

    let allPhotos = [...featuredPhotos];

    // 2. If we don't have enough photos (less than 15), fetch non-featured published items to fill up
    const targetCount = 15;
    if (allPhotos.length < targetCount) {
      const nonFeaturedItems = db.prepare('SELECT * FROM portfolio_items WHERE published = 1 AND (featured = 0 OR featured IS NULL)').all();
      const nonFeaturedPhotos = [];

      nonFeaturedItems.forEach(item => {
        let highlights = [];
        try { highlights = JSON.parse(item.highlight_photos || '[]'); } catch { highlights = []; }
        
        const photoList = [];
        if (item.cover_photo_url) photoList.push(item.cover_photo_url);
        if (Array.isArray(highlights)) photoList.push(...highlights);

        const uniquePhotos = Array.from(new Set(photoList));
        uniquePhotos.forEach(pUrl => {
          if (pUrl) {
            nonFeaturedPhotos.push({
              src: pUrl,
              caption: item.client_initial || 'Wisudawan',
              univ: item.university || 'Makassar',
              label: item.graduation_year ? `Wisuda ${item.graduation_year}` : 'Momen Kelulusan'
            });
          }
        });
      });

      // Shuffle non-featured photos locally
      for (let i = nonFeaturedPhotos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nonFeaturedPhotos[i], nonFeaturedPhotos[j]] = [nonFeaturedPhotos[j], nonFeaturedPhotos[i]];
      }

      // Add to our slideshow photos until we reach the target or run out of non-featured photos
      for (const photo of nonFeaturedPhotos) {
        if (allPhotos.length >= targetCount) break;
        allPhotos.push(photo);
      }
    }

    // 3. Limit final slides count between 15 to 20 photos
    const maxLimit = Math.min(20, Math.max(15, allPhotos.length));
    const finalPhotos = allPhotos.slice(0, maxLimit);

    // 4. Shuffle final photos list to mix featured and non-featured nicely
    for (let i = finalPhotos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalPhotos[i], finalPhotos[j]] = [finalPhotos[j], finalPhotos[i]];
    }

    res.json({ success: true, all_photos: finalPhotos, data: featuredItems });
  } catch (e) {
    res.json({ success: false, all_photos: [], data: [] });
  }
});

// ============ PUBLIC SETTINGS (Branding & General) ============
router.get('/settings', (req, res) => {
  // Cache-Control: Cloudflare edge cache 30 menit (s-maxage=1800)
  // Browser tidak cache dari server — pakai localStorage di frontend (TTL 30 menit)
  res.setHeader('Cache-Control', 'public, s-maxage=1800, max-age=0, stale-while-revalidate=60');

  const settings = getSettings();
  const cName = settings.company_name || settings.companyName || '';
  res.json({
    company_name: cName,
    company_phone: settings.company_phone || settings.companyPhone || '',
    company_email: settings.company_email || settings.companyEmail || settings.smtp_user || '',
    company_address: settings.company_address || settings.companyAddress || '',
    admin_phone: settings.admin_phone || settings.adminPhone || '',
    portfolio_limit: parseInt(settings.portfolio_limit || 200),
    bank_accounts: settings.bank_accounts || [],
    logo_url: settings.logo_url || '',
    favicon_url: settings.favicon_url || '',
    seo_domain: settings.seo_domain || '',
    seo_title: settings.seo_title || (cName ? `${cName} — Dokumentasi Wisuda` : 'Dokumentasi Wisuda Premium'),
    seo_description: settings.seo_description || 'Layanan dokumentasi kelulusan wisuda premium.',
    seo_keywords: settings.seo_keywords || 'foto wisuda, dokumentasi wisuda',
    seo_og_image: settings.seo_og_image || settings.logo_url || '/favicon.png',
    google_site_verification: settings.google_site_verification || '',
    supported_cities: settings.supported_cities || ['Makassar', 'Jakarta', 'Surabaya', 'Yogyakarta', 'Bandung'],
    dp_percentage: parseInt(settings.dp_percentage || '50', 10),
    drive_retention_months: parseInt(settings.drive_retention_months || '3', 10),
    ipaymu_enabled: String(settings.ipaymu_enabled) === '1' && String(settings.ipaymu_verified) === '1',
    ipaymu_qris_expiry_minutes: parseInt(settings.ipaymu_qris_expiry_minutes || 15, 10)
  });
});


// ============ PUBLIC FREELANCE RECRUITMENT ============
router.post('/recruitment/apply', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama wajib 2-100 karakter'),
  body('phone')
    .customSanitizer(v => {
      if (!v) return '';
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      else if (p.length >= 9 && !p.startsWith('62')) p = '62' + p;
      return p;
    })
    .matches(/^62\d{8,13}$/).withMessage('Nomor WhatsApp tidak valid (Contoh: 08xxxxxxxxx)'),
  body('email').trim().notEmpty().withMessage('Email wajib diisi').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('portfolio_url').trim().isURL().withMessage('URL Portofolio wajib diisi dengan format URL yang valid'),
  body('specialties').isArray({ min: 1 }).withMessage('Pilih minimal 1 spesialisasi'),
  body('city').trim().notEmpty().withMessage('Kota domisili wajib dipilih'),
  body('gear_info').optional().trim().isLength({ max: 1000 }),
  body('ktp_photo_url').optional({ checkFalsy: true }).isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    }
    next();
  }
], (req, res) => {
  const { name, phone, email, portfolio_url, specialties, city, gear_info, ktp_photo_url } = req.body;
  
  // Periksa apakah nomor handphone sudah terdaftar
  const existingFg = db.prepare('SELECT id FROM freelancers WHERE phone = ?').get(phone);
  if (existingFg) {
    return res.status(400).json({ error: 'Nomor WhatsApp ini sudah terdaftar sebagai freelancer aktif.' });
  }

  const existingApp = db.prepare('SELECT id FROM freelancer_applications WHERE phone = ? AND status = ?').get(phone, 'pending');
  if (existingApp) {
    return res.status(400).json({ error: 'Anda sudah mengirimkan pendaftaran sebelumnya. Harap tunggu konfirmasi dari Admin.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO freelancer_applications (name, phone, email, portfolio_url, specialties, city, gear_info, ktp_photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, phone, email || null, portfolio_url, JSON.stringify(specialties), city, gear_info || '', ktp_photo_url || null);

    if (email) {
      try {
        const emailService = require('../services/email.service');
        emailService.sendFreelancerRegistrationEmail({ name, email, city, specialties }).catch(err => {
          console.warn('[FreelancerRegEmail Warn]:', err.message);
        });
      } catch (e) {}
    }

    res.status(201).json({
      success: true,
      message: 'Pendaftaran Anda berhasil dikirim! Tim kami akan meninjau portofolio Anda dan memberikan keputusan via WhatsApp.',
      application_id: result.lastInsertRowid
    });
  } catch (e) {
    res.status(500).json({ error: 'Terjadi kesalahan sistem: ' + e.message });
  }
});

module.exports = router;
