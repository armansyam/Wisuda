/**
 * src/routes/admin/inquiries.js
 * Sub-router untuk semua endpoint /inquiries/*
 */
const express = require('express');
const { getDb } = require('../../config/database');
const { getSettings, getSetting } = require('../../config/wa-templates');
const { body, param, validationResult } = require('express-validator');
const { handleValidation, paginationValidation, inquiryValidation, inquiryStatusValidation } = require('../../middleware/validation');
const { generateWaLink } = require('../../services/wa.service');
const { normalizeUniversity } = require('../../utils/university');
const { formatCurrency, formatDate } = require('../../utils/currency');
const crypto = require('crypto');
const { getBaseUrl } = require('../../utils/url');

const inquiriesRouter = express.Router();
const db = getDb();

// ============ INQUIRIES ============
function checkOutsideMainArea() {
  return false;
}

inquiriesRouter.get('/inquiries', paginationValidation, (req, res) => {
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

inquiriesRouter.get('/inquiries/:id', [
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

inquiriesRouter.post('/inquiries', inquiryValidation, (req, res) => {
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

inquiriesRouter.post('/inquiries/:id/status', inquiryStatusValidation, (req, res) => {
  const { status } = req.body;

  db.prepare('UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  res.json(inquiry);
});

inquiriesRouter.post('/inquiries/:id/charge', [
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
inquiriesRouter.post('/inquiries/:id/create-booking-link', [
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
inquiriesRouter.post('/inquiries/:id/regenerate-link', [
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
inquiriesRouter.delete('/inquiries/:id', (req, res) => {
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

module.exports = inquiriesRouter;
