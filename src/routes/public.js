const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('../utils/currency');

const { normalizeUniversity, getOfficialUniversityList } = require('../utils/university');

const router = express.Router();
const db = getDb();

// ============ PUBLIC INQUIRY (no package required) ============
router.post('/inquiry', [
  body('client_name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('client_phone')
    .customSanitizer(v => {
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      return p;
    })
    .matches(/^62\d{9,12}$/).withMessage('Format WA: 628xxxxxxxxxx'),
  body('client_email').optional().isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('graduation_date').isISO8601().withMessage('Tanggal tidak valid (YYYY-MM-DD)'),
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
  const { client_name, client_phone, client_email, graduation_date, location, university, package_id, notes } = req.body;
  const normalizedUniversity = normalizeUniversity(university);

  let pkg = null;
  if (package_id) {
    pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
    if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan atau tidak aktif' });
  }

  const result = db.prepare(`
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email || null, graduation_date, location, normalizedUniversity, package_id || null, notes || '');

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
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
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
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email || null, graduation_date, location, university, package_id, notes || '');

  const inquiryId = result.lastInsertRowid;

  const bookingResult = db.prepare(`
    INSERT INTO bookings (client_name, client_phone, client_email, graduation_date, location, package_id, total_price, dp_amount, balance_amount, dp_status, status, inquiry_id, shooting_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending', ?, 'TBD', datetime('now'), datetime('now'))
  `).run(client_name, client_phone, client_email || null, graduation_date, location, package_id, pkg.price, dpAmount, pkg.price - dpAmount, inquiryId);

  const bookingId = bookingResult.lastInsertRowid;

  db.prepare("UPDATE inquiries SET status = 'booked' WHERE id = ?").run(inquiryId);

  const crypto = require('crypto');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const trackingToken = `TRK-${bookingId}-${randomHex}`;
  const downloadPassword = String(Math.floor(100000 + Math.random() * 900000));
  try {
    db.prepare("UPDATE bookings SET tracking_token = ?, download_password = ? WHERE id = ?").run(trackingToken, downloadPassword, bookingId);
  } catch (e) {}

  const settings = getSettings();
  const bookingUrl = `http://${req.get('host')}/tracking.html?code=${trackingToken}`;
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
  const msg = `📸 Klien ${booking.client_name} mengirim bukti DP\nBooking #${booking.id}\nCek & verifikasi: http://${req.get('host')}/admin`;
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

  // Ensure uploads directory exists
  const uploadDir = path.join(config.uploadPath, 'payment_proofs');
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
  const msg = `💰 Klien ${booking.client_name} mengirim bukti transfer Pembayaran ${paymentTypeLabel}\nBooking #${booking.id}\nCek & verifikasi: http://${req.get('host')}/admin`;
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

  // Ensure uploads directory exists
  const uploadDir = path.join(config.uploadPath, 'payment_proofs');
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
  const msg = `💰 Klien ${booking.client_name} mengirim bukti pelunasan\nBooking #${booking.id}\nCek & verifikasi: http://${req.get('host')}/admin`;
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
  const packages = db.prepare('SELECT id, name, description, price, includes, duration_hours FROM packages WHERE active = 1 ORDER BY sort_order ASC, price ASC').all();
  res.json(packages);
});

// ============ PORTFOLIO (PUBLIC) ============
router.get('/portfolio', (req, res) => {
  const settings = getSettings();
  const defaultLimit = parseInt(settings.portfolio_limit || 200);
  const { year, university, search, booking_id, limit = defaultLimit, offset = 0 } = req.query;
  let where = 'published = 1';
  const params = [];

  if (year) { where += ' AND graduation_year = ?'; params.push(parseInt(year)); }
  if (university) { where += ' AND university LIKE ?'; params.push(`%${university}%`); }
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
  res.json({ years: years.map(y => y.graduation_year), universities: universities.map(u => u.university) });
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

  // Ensure uploads directory exists
  const uploadDir = path.join(config.uploadPath, 'payment_proofs');
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
      graduation_date, location, university, shooting_time, duration_hours, total_price, 
      dp_amount, balance_amount, dp_status, balance_status, dp_bukti_url, balance_bukti_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(
    inquiry.id, pkg.id, inquiry.client_name, inquiry.client_phone, inquiry.client_email,
    inquiry.graduation_date, inquiry.location, inquiry.university, shooting_time || '', durationHours,
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

router.get('/tracking', (req, res) => {
  const phoneInput = req.query.phone || req.query.client_phone || req.query.wa || '';
  const tokenInput = (req.query.code || req.query.token || '').trim();
  const cleanPhoneStr = phoneInput.trim();

  if (!tokenInput) {
    return res.status(400).json({ error: 'Mohon masukkan Kode Token Tracking Anda.' });
  }

  // Look up booking strictly by tracking_token
  const foundByToken = db.prepare("SELECT id FROM bookings WHERE tracking_token = ?").get(tokenInput);

  if (!foundByToken) {
    return res.status(400).json({ error: 'Kode Token Tracking tidak ditemukan atau tidak valid.' });
  }

  const bookingId = foundByToken.id;

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
    tokenInput === booking.download_password ||
    tokenInput === String(booking.id)
  );

  const formattedBooking = {
    ...booking,
    status_label: statusLabel,
    created_at_formatted: formatDateHelper(booking.created_at),
    graduation_date_raw: booking.graduation_date,
    graduation_date: formatDateHelper(booking.graduation_date),
    wa_link_client: `https://wa.me/${settings.adminPhone}`,
    company_name: settings.companyName || 'Wisuda Platform',
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
    highlight_drive_url_unlocked: tokenMatches ? (booking.highlight_drive_url || '') : null,
    drive_parent_url_unlocked: tokenMatches ? (booking.drive_parent_url || '') : null
  };

  // Strip sensitive download details
  delete formattedBooking.download_url;
  delete formattedBooking.password;

  res.json(formattedBooking);
});

router.post('/tracking/:id/verify-pin', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const inputPin = req.body.pin ? req.body.pin.trim() : (req.body.token || req.body.code || '').trim();

  if (!inputPin) return res.status(400).json({ error: 'PIN atau token wajib diisi' });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (inputPin !== booking.download_password && inputPin !== booking.tracking_token) {
    return res.status(400).json({ error: 'PIN atau token tidak cocok. Silakan gunakan PIN/link token yang valid.' });
  }

  // Double check status before showing files (completed, delivered, or highlight_drive_url available)
  if (booking.status !== 'completed' && booking.status !== 'delivered' && !booking.highlight_drive_url) {
    return res.status(400).json({ error: 'Hasil foto belum siap diunduh' });
  }

  res.json({
    success: true,
    download_url: booking.download_url || '',
    highlight_drive_url: booking.highlight_drive_url || '',
    drive_parent_url: booking.drive_parent_url || '',
    password: booking.download_password || ''
  });
});

router.post('/tracking/:id/confirm-receipt', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const inputPin = req.body.pin ? req.body.pin.trim() : '';
  const code = req.body.code ? req.body.code.trim() : '';

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // Allow confirmation if valid PIN provided OR if tracking token matches OR if code matches
  const isValidPin = inputPin && inputPin === booking.download_password;
  const isValidToken = code && (code === booking.tracking_token || code === booking.access_token);
  
  if (!isValidPin && !isValidToken && inputPin !== 'NO_PIN_NEEDED') {
    // If request comes from valid booking ID route on client, confirm receipt
    if (req.params.id != booking.id) {
      return res.status(400).json({ error: 'Verifikasi token tracking tidak cocok.' });
    }
  }

  // Update booking status to completed
  db.prepare("UPDATE bookings SET status = 'completed', selection_status = 'cleaned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

  // Clean staging folder
  try {
    const fs = require('fs');
    const path = require('path');
    const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const nameStr = sanitize(booking.client_name || 'client');
    const uniStr = sanitize(booking.university || 'univ');
    const folderName = `${nameStr}_${uniStr}_${bookingId}`;
    const stagingDir = path.join(__dirname, '../../DATA/uploads/staging_uploads', folderName);
    
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    
    const legacyDir = path.join(__dirname, '../../DATA/uploads/staging_uploads', String(bookingId));
    if (fs.existsSync(legacyDir)) {
      fs.rmSync(legacyDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Failed to auto-clean staging on confirm-receipt:', e.message);
  }

  res.json({
    success: true,
    message: 'Hasil foto berhasil dikonfirmasi diterima. Terima kasih!'
  });
});

// POST /tracking/:id/portfolio-consent — Update client portfolio publication consent
router.post('/tracking/:id/portfolio-consent', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const { consent, pin, code } = req.body;

  if (!['approved', 'declined'].includes(consent)) {
    return res.status(400).json({ error: 'Nilai consent tidak valid' });
  }

  const booking = db.prepare('SELECT id, tracking_token, download_password FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // Security check: must match PIN or tracking token
  const isValidPin = pin && pin === booking.download_password;
  const isValidToken = code && (code === booking.tracking_token);
  
  if (!isValidPin && !isValidToken) {
    return res.status(401).json({ error: 'Akses tidak sah' });
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
    seo_domain: settings.seo_domain || '',
    seo_title: settings.seo_title || (cName ? `${cName} — Dokumentasi Wisuda` : 'Dokumentasi Wisuda Premium'),
    seo_description: settings.seo_description || 'Layanan dokumentasi kelulusan wisuda premium.',
    seo_keywords: settings.seo_keywords || 'foto wisuda, dokumentasi wisuda',
    seo_og_image: settings.seo_og_image || settings.logo_url || '/favicon.png',
    google_site_verification: settings.google_site_verification || '',
    supported_cities: settings.supported_cities || ['Makassar', 'Jakarta', 'Surabaya', 'Yogyakarta', 'Bandung']
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
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Format email tidak valid'),
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

module.exports = router;
