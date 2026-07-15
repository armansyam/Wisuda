const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('../utils/currency');

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

  let pkg = null;
  if (package_id) {
    pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
    if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan atau tidak aktif' });
  }

  const result = db.prepare(`
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email || null, graduation_date, location, university, package_id || null, notes || '');

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(result.lastInsertRowid);

  const templates = getWaTemplates();
  const settings = getSettings();

  let waMessage = templates.admin_new_inquiry
    .replace('{client_name}', client_name)
    .replace('{graduation_date}', formatDate(graduation_date))
    .replace('{location}', location)
    .replace('{university}', university || '-')
    .replace('{notes}', notes || '-')
    .replace('{package_name}', pkg?.name || '-')
    .replace('{client_phone}', client_phone);

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

  const settings = getSettings();
  const bookingUrl = `http://${req.get('host')}/tracking.html?id=${bookingId}`;
  const dpAmountStr = 'Rp ' + dpAmount.toLocaleString('id-ID');
  const totalStr = 'Rp ' + pkg.price.toLocaleString('id-ID');

  // WA ke admin — ada booking baru
  const waMsgAdmin = `📸 Booking Baru!\nClient: ${client_name}\nPaket: ${pkg.name}\nTotal: ${totalStr}\nDP: ${dpAmountStr}\nTgl Wisuda: ${formatDate(graduation_date)}\nLokasi: ${location}\n\nLink Booking: ${bookingUrl}\n\nAdmin verifikasi DP manual setelah client kirim bukti via WA.`;
  const waAdmin = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(waMsgAdmin)}`;

  // WA ke client — jumlah DP + no admin untuk kirim bukti
  const waMsgClient = `Halo ${client_name}, terima kasih telah booking foto wisuda!\n\nPaket: ${pkg.name}\nTotal: ${totalStr}\nDP (50%): ${dpAmountStr}\n\nSilakan transfer ke rek:\n${settings.bankList || '- Bank Mandiri 123-00-1234567 a.n. Sorehari Wisuda'}\n\nSetelah transfer, kirim bukti via WA ke admin:\nhttps://wa.me/${settings.adminPhone}\n\nCek status booking:\n${bookingUrl}\n\nTerima kasih!`;
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
    admin_phone: getSettings()?.adminPhone || '6282333333420'
  });
});

// ============ PACKAGES (PUBLIC) ============
router.get('/packages', (req, res) => {
  const packages = db.prepare('SELECT id, name, description, price, includes, duration_hours FROM packages WHERE active = 1 ORDER BY sort_order ASC, price ASC').all();
  res.json(packages);
});

// ============ PORTFOLIO (PUBLIC) ============
router.get('/portfolio', (req, res) => {
  const { year, university, search, limit = 50, offset = 0 } = req.query;
  let where = 'published = 1';
  const params = [];

  if (year) { where += ' AND graduation_year = ?'; params.push(parseInt(year)); }
  if (university) { where += ' AND university LIKE ?'; params.push(`%${university}%`); }
  if (search) { where += ' AND client_initial LIKE ?'; params.push(`%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM portfolio_items WHERE ${where}`).get(params).c;
  const rows = db.prepare(`SELECT * FROM portfolio_items WHERE ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), parseInt(offset));
  rows.forEach(p => { try { p.highlight_photos = JSON.parse(p.highlight_photos || '[]'); } catch { p.highlight_photos = []; } });

  res.json({ data: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
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
  const tokenRow = db.prepare('SELECT * FROM booking_tokens WHERE token = ?').get(req.params.token);
  if (!tokenRow) return res.status(404).json({ error: 'Link booking tidak valid' });
  
  if (tokenRow.used) return res.status(400).json({ error: 'Link booking sudah pernah digunakan' });
  
  if (new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link booking sudah kedaluwarsa (expired)' });
  }
  
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(tokenRow.inquiry_id);
  if (!inquiry) return res.status(404).json({ error: 'Data inquiry tidak ditemukan' });
  
  const settings = getSettings();
  res.json({
    inquiry,
    expires_at: tokenRow.expires_at,
    bank_accounts: settings.bank_accounts || [],
    company_name: settings.companyName || 'Wisuda Platform'
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
  const totalPrice = pkg.price;
  const dpAmount = Math.round(totalPrice * dpPercentage / 100);
  const balanceAmount = totalPrice - dpAmount;
  
  let dpStatus = 'unpaid';
  let balanceStatus = 'unpaid';
  let dpBuktiUrl = null;
  let balanceBuktiUrl = null;
  
  if (payment_type === 'full') {
    dpStatus = 'uploaded';
    balanceStatus = 'uploaded';
    dpBuktiUrl = dbPath;
    balanceBuktiUrl = dbPath;
  } else {
    dpStatus = 'uploaded';
    dpBuktiUrl = dbPath;
  }
  
  // Create booking
  const r = db.prepare(`
    INSERT INTO bookings (
      inquiry_id, package_id, client_name, client_phone, client_email, 
      graduation_date, location, university, shooting_time, total_price, 
      dp_amount, balance_amount, dp_status, balance_status, dp_bukti_url, balance_bukti_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(
    inquiry.id, pkg.id, inquiry.client_name, inquiry.client_phone, inquiry.client_email,
    inquiry.graduation_date, inquiry.location, inquiry.university, shooting_time || '',
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
    company_name: settings.companyName || 'Wisuda Platform',
    company_phone: settings.companyPhone || '',
    company_address: settings.companyAddress || ''
  });
});

router.get('/tracking', (req, res) => {
  const q = req.query.q ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ error: 'Kata kunci pencarian tidak boleh kosong' });

  let booking = null;
  
  // 1. Try to search by ID if q is a number
  if (/^\d+$/.test(q)) {
    booking = db.prepare(`
      SELECT b.*, p.name as package_name, f.name as fg_name, f.phone as fg_phone
      FROM bookings b 
      LEFT JOIN packages p ON b.package_id = p.id 
      LEFT JOIN assignments a ON a.booking_id = b.id AND a.status != 'cancelled'
      LEFT JOIN freelancers f ON a.fg_id = f.id
      WHERE b.id = ?
    `).get(parseInt(q));
  }
  
  // 2. If not found, try searching by client name (case insensitive, partial match)
  if (!booking) {
    booking = db.prepare(`
      SELECT b.*, p.name as package_name, f.name as fg_name, f.phone as fg_phone
      FROM bookings b 
      LEFT JOIN packages p ON b.package_id = p.id 
      LEFT JOIN assignments a ON a.booking_id = b.id AND a.status != 'cancelled'
      LEFT JOIN freelancers f ON a.fg_id = f.id
      WHERE LOWER(b.client_name) LIKE ? 
      ORDER BY b.created_at DESC LIMIT 1
    `).get(`%${q.toLowerCase()}%`);
  }

  // 3. If still not found, try searching by phone number
  if (!booking) {
    booking = db.prepare(`
      SELECT b.*, p.name as package_name, f.name as fg_name, f.phone as fg_phone
      FROM bookings b 
      LEFT JOIN packages p ON b.package_id = p.id 
      LEFT JOIN assignments a ON a.booking_id = b.id AND a.status != 'cancelled'
      LEFT JOIN freelancers f ON a.fg_id = f.id
      WHERE b.client_phone LIKE ? 
      ORDER BY b.created_at DESC LIMIT 1
    `).get(`%${q}%`);
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
    } catch(e) { return dateStr; }
  };

  const formattedBooking = {
    ...booking,
    status_label: statusLabel,
    created_at_formatted: formatDateHelper(booking.created_at),
    graduation_date_raw: booking.graduation_date,
    graduation_date: formatDateHelper(booking.graduation_date),
    wa_link_client: `https://wa.me/${settings.adminPhone}`,
    company_name: settings.companyName || 'Wisuda Platform'
  };

  // Strip sensitive download details
  delete formattedBooking.download_url;
  delete formattedBooking.password;

  res.json(formattedBooking);
});

router.post('/tracking/:id/verify-pin', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const inputPin = req.body.pin ? req.body.pin.trim() : '';
  
  if (!inputPin) return res.status(400).json({ error: 'PIN wajib diisi' });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (inputPin !== booking.download_password) {
    return res.status(400).json({ error: 'PIN tidak cocok. Silakan gunakan PIN yang diberikan oleh Admin.' });
  }

  // Double check status before showing files (completed or delivered)
  if (booking.status !== 'completed' && booking.status !== 'delivered') {
    return res.status(400).json({ error: 'Hasil foto belum siap diunduh' });
  }

  res.json({
    success: true,
    download_url: booking.download_url || '',
    password: booking.download_password || ''
  });
});

router.post('/tracking/:id/confirm-receipt', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'ID tidak valid' });
  const bookingId = parseInt(req.params.id);
  const inputPin = req.body.pin ? req.body.pin.trim() : '';

  if (!inputPin) return res.status(400).json({ error: 'PIN wajib diisi' });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (inputPin !== booking.download_password) {
    return res.status(400).json({ error: 'PIN tidak cocok.' });
  }

  // Update booking status to completed
  db.prepare("UPDATE bookings SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

  res.json({
    success: true,
    message: 'Hasil foto berhasil dikonfirmasi diterima. Terima kasih!'
  });
});

module.exports = router;
