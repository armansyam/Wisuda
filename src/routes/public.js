const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates, getSetting } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('../utils/currency');
const { getBaseUrl } = require('../utils/url');

const { normalizeUniversity, getOfficialUniversityList } = require('../utils/university');

const { execSync } = require('child_process');

const router = express.Router();
const db = getDb();

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

const { getUpdateStatus } = require('../utils/github-update');

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
  body('client_email').optional().isEmail().normalizeEmail().withMessage('Email tidak valid'),
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
  `).run(client_name, client_phone, client_email || null, graduation_date, eventCity, location, normalizedUniversity, package_id || null, notes || '');

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(result.lastInsertRowid);

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

  const dpAmount = Math.round(pkg.price * 0.5);
  const result = db.prepare(`
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, city, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email || null, graduation_date, req.body.city || '', location, university, package_id, notes || '');

  const inquiryId = result.lastInsertRowid;

  const bookingResult = db.prepare(`
    INSERT INTO bookings (client_name, client_phone, client_email, graduation_date, city, location, package_id, total_price, dp_amount, balance_amount, dp_status, status, inquiry_id, shooting_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending', ?, 'TBD', datetime('now'), datetime('now'))
  `).run(client_name, client_phone, client_email || null, graduation_date, req.body.city || 'Makassar', location, package_id, pkg.price, dpAmount, pkg.price - dpAmount, inquiryId);

  const bookingId = bookingResult.lastInsertRowid;

  db.prepare("UPDATE inquiries SET status = 'booked' WHERE id = ?").run(inquiryId);

  const crypto = require('crypto');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const trackingToken = `TRK-${bookingId}-${randomHex}`;
  try {
    db.prepare("UPDATE bookings SET tracking_token = ? WHERE id = ?").run(trackingToken, bookingId);
  } catch (e) {}

  const settings = getSettings();
  const companyName = settings.company_name || settings.companyName || 'Studio';
  const bookingUrl = `${getBaseUrl(req)}/tracking.html?code=${trackingToken}`;
  const dpAmountStr = 'Rp ' + dpAmount.toLocaleString('id-ID');
  const totalStr = 'Rp ' + pkg.price.toLocaleString('id-ID');

  const templates = getWaTemplates();
  const rawBank = getSetting('bank_accounts', '[]');
  const bankAccounts = typeof rawBank === 'string' ? JSON.parse(rawBank) : (Array.isArray(rawBank) ? rawBank : []);
  const bankList = bankAccounts.length > 0 ? bankAccounts.map(b => `${b.bank} - ${b.norek} a.n ${b.atas_nama}`).join('\n') : (settings.bankList || '- Rekening Bank Resmi ' + companyName);

  const waMsgAdmin = `📸 Booking Baru!\nClient: ${client_name}\nPaket: ${pkg.name}\nTotal: ${totalStr}\nDP: ${dpAmountStr}\nTgl Wisuda: ${formatDate(graduation_date)}\nLokasi: ${location}\n\nLink Booking: ${bookingUrl}\n\nAdmin verifikasi DP manual setelah client kirim bukti via WA.`;
  const waAdmin = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(waMsgAdmin)}`;

  let waMsgClient = (templates.client_auto_book || '')
    .replace(/{company_name}/g, companyName)
    .replace('{client_name}', client_name)
    .replace('{package_name}', pkg.name)
    .replace('{total_price}', totalStr)
    .replace('{dp_amount}', dpAmountStr)
    .replace('{bank_list}', bankList)
    .replace('{admin_phone}', settings.adminPhone)
    .replace('{booking_url}', bookingUrl);

  const waClient = `https://wa.me/${client_phone}?text=${encodeURIComponent(waMsgClient)}`;

  res.status(201).json({
    success: true,
    inquiry_id: inquiryId,
    booking_id: bookingId,
    booking_url: bookingUrl,
    total_price: pkg.price,
    dp_amount: dpAmount,
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

  // Check file upload
  if (!req.files || !req.files.payment_proof) {
    return res.status(400).json({ error: 'Upload bukti transfer terlebih dahulu' });
  }

  const file = req.files.payment_proof;
  const path = require('path');
  const fs = require('fs');
  const config = require('../config/settings');

  const { getSetting } = require('../config/wa-templates');
  const activeUpload = getSetting('upload_path', config.uploadPath);
  const uploadDir = path.join(activeUpload, 'payment_proofs');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileExt = path.extname(file.name).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  if (!allowedExts.includes(fileExt)) {
    return res.status(400).json({ error: 'Format file tidak diijinkan. Gunakan JPG, PNG, atau PDF.' });
  }

  const fileName = `proof_dp_${Date.now()}_bkg_${booking.id}${fileExt}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    await file.mv(filePath);
  } catch (err) {
    console.error('File move error:', err);
    return res.status(500).json({ error: 'Gagal mengupload bukti transfer' });
  }

  const dbPath = `/uploads/payment_proofs/${fileName}`;

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

  // Check file upload
  if (!req.files || !req.files.payment_proof) {
    return res.status(400).json({ error: 'Upload bukti transfer terlebih dahulu' });
  }

  const file = req.files.payment_proof;
  const path = require('path');
  const fs = require('fs');
  const config = require('../config/settings');

  const { getSetting } = require('../config/wa-templates');
  const activeUpload = getSetting('upload_path', config.uploadPath);
  const uploadDir = path.join(activeUpload, 'payment_proofs');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileExt = path.extname(file.name).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  if (!allowedExts.includes(fileExt)) {
    return res.status(400).json({ error: 'Format file tidak diijinkan. Gunakan JPG, PNG, atau PDF.' });
  }

  const fileName = `proof_balance_${Date.now()}_bkg_${booking.id}${fileExt}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    await file.mv(filePath);
  } catch (err) {
    console.error('File move error:', err);
    return res.status(500).json({ error: 'Gagal mengupload bukti transfer' });
  }

  const dbPath = `/uploads/payment_proofs/${fileName}`;

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

  res.json({
    booking,
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

  if (tokenRow.used) return res.status(400).json({ error: 'Link booking sudah pernah digunakan', ...meta });

  if (new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link booking sudah kedaluwarsa (expired)', ...meta });
  }

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(tokenRow.inquiry_id);
  if (!inquiry) return res.status(404).json({ error: 'Data inquiry tidak ditemukan', ...meta });

  res.json({
    inquiry,
    expires_at: tokenRow.expires_at,
    bank_accounts: settings.bank_accounts || [],
    ...meta
  });
});

router.post('/booking-token/:token/confirm', async (req, res) => {
  const tokenRow = db.prepare('SELECT * FROM booking_tokens WHERE token = ?').get(req.params.token);
  if (!tokenRow) return res.status(404).json({ error: 'Link booking tidak valid' });

  if (tokenRow.used) return res.status(400).json({ error: 'Link booking sudah pernah digunakan' });

  if (new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link booking sudah kedaluwarsa (expired)' });
  }

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(tokenRow.inquiry_id);
  if (!inquiry) return res.status(404).json({ error: 'Data inquiry tidak ditemukan' });

  const { package_id, shooting_time, payment_type } = req.body;
  if (!package_id) return res.status(400).json({ error: 'Pilih paket terlebih dahulu' });

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
  if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan' });

  // Check file upload
  if (!req.files || !req.files.payment_proof) {
    return res.status(400).json({ error: 'Upload bukti transfer terlebih dahulu' });
  }

  const file = req.files.payment_proof;
  const path = require('path');
  const fs = require('fs');
  const config = require('../config/settings');

  const { getSetting } = require('../config/wa-templates');
  const activeUpload = getSetting('upload_path', config.uploadPath);
  const uploadDir = path.join(activeUpload, 'payment_proofs');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileExt = path.extname(file.name).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  if (!allowedExts.includes(fileExt)) {
    return res.status(400).json({ error: 'Format file tidak diijinkan. Gunakan JPG, PNG, atau PDF.' });
  }

  const fileName = `proof_${Date.now()}_inq_${inquiry.id}${fileExt}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    await file.mv(filePath);
  } catch (err) {
    console.error('File move error:', err);
    return res.status(500).json({ error: 'Gagal mengupload bukti transfer' });
  }

  const dbPath = `/uploads/payment_proofs/${fileName}`;

  const dpPercentage = parseInt(getSettings().dp_percentage || 50);
  const durationHours = parseInt(req.body.duration_hours) || pkg.duration_hours || 2;
  const baseHours = pkg.duration_hours || 1;
  let totalPrice = pkg.price;
  if (durationHours !== baseHours) {
    totalPrice = Math.round((pkg.price / baseHours) * durationHours);
  }

  // Include transport charge set by admin in total price
  const transportCharge = Number(inquiry.transport_charge || 0);
  totalPrice += transportCharge;
  
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

  // Create booking
  const r = db.prepare(`
    INSERT INTO bookings (
      inquiry_id, package_id, client_name, client_phone, client_email, 
      graduation_date, city, location, university, shooting_time, duration_hours, total_price, 
      dp_amount, balance_amount, dp_status, balance_status, dp_bukti_url, balance_bukti_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(
    inquiry.id, pkg.id, inquiry.client_name, inquiry.client_phone, inquiry.client_email,
    inquiry.graduation_date, inquiry.city || 'Makassar', inquiry.location, inquiry.university, shooting_time || '', durationHours,
    totalPrice, dpAmount, balanceAmount, dpStatus, balanceStatus, dpBuktiUrl, balanceBuktiUrl
  );

  // Mark token as used
  db.prepare('UPDATE booking_tokens SET used = 1 WHERE id = ?').run(tokenRow.id);

  // Update inquiry status to 'converted'
  db.prepare('UPDATE inquiries SET status = \'converted\', package_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(pkg.id, inquiry.id);

  res.json({
    success: true,
    booking_id: r.lastInsertRowid,
    message: 'Booking berhasil dikonfirmasi. Pembayaran sedang diverifikasi admin.'
  });
});

router.get('/bookings/:id/invoice', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });

  const booking = db.prepare(`
    SELECT b.*, p.name as package_name, p.description as package_description
    FROM bookings b
    JOIN packages p ON b.package_id = p.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Invoice tidak ditemukan' });

  const settings = getSettings();

  res.json({
    ...booking,
    company_name: settings.company_name || settings.companyName || '',
    company_phone: settings.company_phone || settings.companyPhone || '',
    company_address: settings.company_address || settings.companyAddress || '',
    logo_url: settings.logo_url || ''
  });
});

// Alias /track/:token for legacy/shortlink compatibility
router.get('/track/:token', (req, res) => {
  const token = req.params.token;
  return res.redirect(307, `/api/public/tracking?code=${encodeURIComponent(token)}`);
});

router.get('/tracking', (req, res) => {
  const tokenOrPhone = (req.query.code || req.query.token || req.query.phone || req.query.client_phone || req.query.wa || '').trim();

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
                        ['editing', 'delivered', 'completed'].includes(booking.status);

  const isFileSubmitted = !!booking.fg_drive_url || booking.delivery_type === 'fisik' ||
                          ['uploaded', 'done', 'completed'].includes(booking.assignment_status);

  const tokenMatches = tokenInput && (
    tokenInput === booking.tracking_token ||
    tokenInput === String(booking.id)
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

  const formattedBooking = {
    ...booking,
    status_label: statusLabel,
    created_at_formatted: formatDateHelper(booking.created_at),
    graduation_date_raw: booking.graduation_date,
    graduation_date: formatDateHelper(booking.graduation_date),
    wa_link_client: `https://wa.me/${settings.adminPhone}`,
    company_name: settings.company_name || settings.companyName || 'AmsDev',
    bank_accounts: settings.bank_accounts || [],
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
    access_token: tokenMatches ? tokenInput : null,
    download_url_unlocked: tokenMatches ? (booking.download_url || '') : null,
    highlight_drive_url_unlocked: (tokenMatches && (['cleaned', 'delivered', 'completed'].includes(booking.selection_status) || ['delivered', 'completed'].includes(booking.status))) ? (booking.highlight_drive_url || '') : null,
    drive_parent_url_unlocked: tokenMatches ? (booking.drive_parent_url || '') : null,
    drive_retention_months: settings.drive_retention_months || 3,
    drive_expiry_date: expiryDate,
    drive_expiry_date_formatted: formatDateHelper(expiryDate),
    drive_total_bytes: booking.drive_total_bytes || 0,
    drive_total_size_formatted: booking.folder_total_size_formatted || (booking.drive_total_bytes ? `${(booking.drive_total_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : null),
    folder_total_size_formatted: booking.folder_total_size_formatted || (booking.drive_total_bytes ? `${(booking.drive_total_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : null)
  };

  // Strip sensitive download details
  delete formattedBooking.download_url;
  delete formattedBooking.download_password;
  delete formattedBooking.password;

  res.json(formattedBooking);
});


router.post('/tracking/:id/confirm-receipt', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const code = req.body.code ? req.body.code.trim() : '';

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // Verifikasi via tracking token
  if (code && code !== booking.tracking_token) {
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
  db.prepare("UPDATE bookings SET status = 'completed', selection_status = 'cleaned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

  // Clear staging_files dari DB + hapus thumbnail cache disk saat klien konfirmasi penerimaan
  try {
    const { getDb: getDbLocal } = require('../config/database');
    const localDb = getDbLocal();
    // Hapus thumbnail cache disk (proxy cache VPS, bukan file foto asli)
    const bookingCache = localDb.prepare('SELECT staging_files FROM bookings WHERE id = ?').get(bookingId);
    if (bookingCache?.staging_files) {
      const path = require('path');
      const fs = require('fs');
      const stagingFiles = JSON.parse(bookingCache.staging_files || '[]');
      const { getSetting } = require('../config/wa-templates');
      const activeUpload = getSetting('upload_path', config.uploadPath);
      const cacheDir = path.join(activeUpload, 'gallery_cache');
      stagingFiles.forEach(f => {
        try {
          const cachePath = path.join(cacheDir, `${f.fileId}.jpg`);
          if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        } catch (e) {
          console.warn(`[ConfirmReceipt] Gagal hapus cache file ${f.fileId}:`, e.message);
        }
      });
    }
    // Clear DB
    localDb.prepare('UPDATE bookings SET staging_files = NULL WHERE id = ?').run(bookingId);
  } catch (e) {
    console.warn(`[ConfirmReceipt] Gagal clear staging cache Booking #${bookingId}:`, e.message);
  }

  res.json({ success: true, message: 'Terima kasih! Pesanan telah dikonfirmasi selesai.' });
});

// POST /tracking/:id/recheck-folder-size — Client re-checks folder size on demand
router.post('/tracking/:id/recheck-folder-size', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const code = req.body.code ? req.body.code.trim() : '';

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (code && code !== booking.tracking_token) {
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

  if (code && code !== booking.tracking_token) {
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
  const settings = getSettings();
  const cName = settings.company_name || settings.companyName || '';
  res.json({
    company_name: cName,
    company_phone: settings.company_phone || settings.companyPhone || '',
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
    drive_retention_months: parseInt(settings.drive_retention_months || '3', 10)
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

    res.status(201).json({
      success: true,
      message: 'Pendaftaran Anda berhasil dikirim! Tim kami akan meninjau portofolio Anda dan memberikan keputusan via WhatsApp.',
      application_id: result.lastInsertRowid
    });
  } catch (e) {
    res.status(500).json({ error: 'Terjadi kesalahan sistem: ' + e.message });
  }
});

// ============ FREELANCER JOB OFFER RESPONSE & AVAILABILITY ============
router.post('/freelance-portal/assignments/:id/respond', [
  param('id').isInt({ min: 1 }),
  body('code').trim().notEmpty().withMessage('Kode akses freelance wajib'),
  body('response').isIn(['accepted', 'declined']).withMessage('Respon harus accepted atau declined'),
  body('reason').optional().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    }
    next();
  }
], (req, res) => {
  const { code, response, reason } = req.body;
  const fg = db.prepare('SELECT * FROM freelancers WHERE access_code = ? AND active = 1').get(code);
  if (!fg) return res.status(401).json({ error: 'Kode akses freelancer tidak valid' });

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(req.params.id, fg.id);
  if (!assignment) return res.status(404).json({ error: 'Penugasan tidak ditemukan' });

  if (response === 'accepted') {
    db.prepare(`
      UPDATE assignments 
      SET offer_status = 'accepted', status = 'assigned', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(assignment.id);

    // Lock FG schedule in fg_schedules
    const booking = db.prepare('SELECT graduation_date FROM bookings WHERE id = ?').get(assignment.booking_id);
    if (booking) {
      db.prepare(`
        INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
        VALUES (?, ?, 'booked', ?, 'Wisuda Booking #' || ?)
      `).run(fg.id, booking.graduation_date, assignment.booking_id, assignment.booking_id);
    }

    return res.json({
      success: true,
      message: 'Terima kasih! Penugasan berhasil Anda terima. Silakan persiapkan perlengkapan pemotretan Anda.',
      offer_status: 'accepted'
    });
  } else {
    db.prepare(`
      UPDATE assignments 
      SET offer_status = 'declined', status = 'cancelled', decline_reason = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reason || 'FG Menolak Penugasan', assignment.id);

    // Release FG schedule
    db.prepare("DELETE FROM fg_schedules WHERE fg_id = ? AND booking_id = ?").run(fg.id, assignment.booking_id);

    return res.json({
      success: true,
      message: 'Penugasan berhasil ditolak. Sistem telah menginformasikan ke Admin untuk pengalihan penugasan.',
      offer_status: 'declined'
    });
  }
});

router.post('/freelance-portal/availability', [
  body('code').trim().notEmpty().withMessage('Kode akses freelance wajib'),
  body('date').isISO8601().withMessage('Tanggal tidak valid (YYYY-MM-DD)'),
  body('status').isIn(['available', 'busy_external', 'off']).withMessage('Status ketersediaan tidak valid'),
  body('start_time').optional().trim(),
  body('end_time').optional().trim(),
  body('notes').optional().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    }
    next();
  }
], (req, res) => {
  const { code, date, status, start_time, end_time, notes } = req.body;
  const fg = db.prepare('SELECT * FROM freelancers WHERE access_code = ? AND active = 1').get(code);
  if (!fg) return res.status(401).json({ error: 'Kode akses freelancer tidak valid' });

  db.prepare(`
    INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, start_time, end_time, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(fg.id, date, status, start_time || null, end_time || null, notes || '');

  res.json({
    success: true,
    message: 'Ketersediaan jadwal Anda berhasil diperbarui.'
  });
});

router.get('/freelance-portal/availability', (req, res) => {
  const { code, month } = req.query;
  if (!code) return res.status(400).json({ error: 'Kode akses freelance wajib' });

  const fg = db.prepare('SELECT * FROM freelancers WHERE access_code = ? AND active = 1').get(code);
  if (!fg) return res.status(401).json({ error: 'Kode akses freelancer tidak valid' });

  let query = 'SELECT * FROM fg_schedules WHERE fg_id = ?';
  const params = [fg.id];

  if (month) {
    query += " AND strftime('%Y-%m', date) = ?";
    params.push(month);
  }

  const schedules = db.prepare(query).all(...params);
  res.json({ success: true, data: schedules });
});

module.exports = router;
