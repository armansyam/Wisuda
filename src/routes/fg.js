const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('../utils/currency');
const { getBaseUrl } = require('../utils/url');

const router = express.Router();
const db = getDb();

// FG auth menggunakan access_code atau id freelancer
function fgAuth(req, res, next) {
  const token = req.headers['x-fg-token'] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  const fg = db.prepare('SELECT * FROM freelancers WHERE access_code = ? AND active = 1').get(token);
  if (!fg) return res.status(401).json({ error: 'Invalid token' });
  
  req.fg = fg;
  next();
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
}

// ============ FG LOGIN ============
router.post('/login', [
  body('phone')
    .customSanitizer(v => {
      if (!v) return '';
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      return p;
    })
    .matches(/^62\d{9,13}$/).withMessage('Nomor WA tidak valid (Contoh: 08xxxxxxxxxx atau 628xxxxxxxxxx)'),
  handleValidation
], (req, res) => {
  const { phone } = req.body;
  const fg = db.prepare('SELECT * FROM freelancers WHERE phone = ? AND active = 1').get(phone);
  if (!fg) return res.status(401).json({ error: 'Nomor tidak terdaftar sebagai FG' });
  
  res.json({
    success: true,
    token: fg.access_code,
    fg: {
      id: fg.id,
      name: fg.name,
      phone: fg.phone,
      email: fg.email,
      portfolio_url: fg.portfolio_url
    }
  });
});
router.get('/dashboard', fgAuth, (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*, b.client_name, b.client_phone, b.graduation_date, b.shooting_time, b.location, b.tracking_token,
           (SELECT COUNT(*) FROM booking_moodboards bm WHERE bm.booking_id = b.id AND bm.items != '[]' AND bm.items != '') > 0 AS has_moodboard,
           p.name as package_name, p.includes as package_includes,
           d.drive_folder_url, d.qc_status
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    WHERE a.fg_id = ?
    ORDER BY b.graduation_date ASC
  `).all(req.fg.id);

  const totalPayoutRow = db.prepare('SELECT COALESCE(SUM(total_payout),0) as total FROM payouts WHERE fg_id = ? AND status = ?').get(req.fg.id, 'paid');
  
  const stats = {
    total: assignments.length,
    done: assignments.filter(a => a.status === 'done').length,
    pending: assignments.filter(a => ['assigned','confirmed'].includes(a.status)).length,
    total_payout: totalPayoutRow ? totalPayoutRow.total : 0
  };

  res.json({ data: assignments, stats });
});

router.get('/assignments', fgAuth, (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*, b.client_name, b.client_phone, b.graduation_date, b.shooting_time, b.location, b.tracking_token,
           (SELECT COUNT(*) FROM booking_moodboards bm WHERE bm.booking_id = b.id AND bm.items != '[]' AND bm.items != '') > 0 AS has_moodboard,
           p.name as package_name, p.includes as package_includes,
           d.drive_folder_url, d.qc_status, d.qc_notes, d.preview_url
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    WHERE a.fg_id = ?
    ORDER BY b.graduation_date ASC
  `).all(req.fg.id);
  
  res.json({ data: assignments });
});

router.get('/assignments/:id', fgAuth, [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const assignment = db.prepare(`
    SELECT a.*, b.client_name, b.client_phone, b.client_email, b.graduation_date, b.shooting_time, b.location, b.tracking_token,
           (SELECT COUNT(*) FROM booking_moodboards bm WHERE bm.booking_id = b.id AND bm.items != '[]' AND bm.items != '') > 0 AS has_moodboard,
           p.name as package_name, p.includes as package_includes, p.duration_hours
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN packages p ON b.package_id = p.id
    WHERE a.id = ? AND a.fg_id = ?
  `).get(req.params.id, req.fg.id);
  
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  
  res.json(assignment);
});

// ============ CHECK-IN/OUT ============
router.post('/assignments/:id/checkin', fgAuth, [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(req.params.id, req.fg.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  
  if (assignment.shoot_start_at) {
    return res.status(400).json({ error: 'Sudah check-in' });
  }
  
  const now = new Date().toISOString();
  db.prepare('UPDATE assignments SET shoot_start_at = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(now, 'shooting', req.params.id);
  
  db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('shooting', assignment.booking_id);
  
  const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  res.json({ assignment: updated, message: 'Check-in berhasil' });
});

router.post('/assignments/:id/checkout', fgAuth, [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(req.params.id, req.fg.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  
  if (!assignment.shoot_start_at) {
    return res.status(400).json({ error: 'Belum check-in' });
  }
  if (assignment.shoot_end_at) {
    return res.status(400).json({ error: 'Sudah check-out' });
  }
  
  const now = new Date().toISOString();
  db.prepare('UPDATE assignments SET shoot_end_at = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(now, 'uploaded', req.params.id);
  
  const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  res.json({ assignment: updated, message: 'Check-out berhasil. Upload hasil foto sebelum deadline.' });
});

// ============ UPLOAD HASIL ============
router.post('/assignments/:id/upload', fgAuth, [
  param('id').isInt({ min: 1 }),
  body('drive_folder_url').isURL().withMessage('Drive folder URL wajib'),
  handleValidation
], (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(req.params.id, req.fg.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  
  const { drive_folder_url } = req.body;
  
  // Create or update deliverable
  let deliverable = db.prepare('SELECT * FROM deliverables WHERE assignment_id = ?').get(assignment.id);
  
  if (deliverable) {
    db.prepare('UPDATE deliverables SET drive_folder_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(drive_folder_url, deliverable.id);
  } else {
    const result = db.prepare(`
      INSERT INTO deliverables (assignment_id, drive_folder_url)
      VALUES (?, ?)
    `).run(assignment.id, drive_folder_url);
    deliverable = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(result.lastInsertRowid);
  }
  
  // Update assignment status
  db.prepare('UPDATE assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('uploaded', assignment.id);
  
  // Notify admin via wa.me
  const templates = getWaTemplates();
  const settings = getSettings();
  
  let msg = templates.fg_upload_ready
    .replace('{fg_name}', req.fg.name)
    .replace('{admin_url}', `${getBaseUrl(req)}/admin`);
  
  const waLink = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(msg)}`;
  
  res.json({ deliverable, wa_link: waLink, message: 'Upload berhasil. Admin akan QC.' });
});

// ============ QC STATUS ============
router.get('/assignments/:id/qc-status', fgAuth, [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(req.params.id, req.fg.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  
  const deliverable = db.prepare('SELECT * FROM deliverables WHERE assignment_id = ?').get(assignment.id);
  
  res.json({ assignment, deliverable });
});

// ============ PAYOUT HISTORY ============
router.get('/payouts', fgAuth, (req, res) => {
  const payouts = db.prepare(`
    SELECT p.*, a.booking_id, b.client_name, b.graduation_date
    FROM payouts p
    JOIN assignments a ON p.assignment_id = a.id
    JOIN bookings b ON a.booking_id = b.id
    WHERE p.fg_id = ?
    ORDER BY p.created_at DESC
  `).all(req.fg.id);
  
  res.json({ data: payouts });
});

// ============ FG PORTFOLIO ============
router.get('/portfolio', fgAuth, (req, res) => {
  const items = db.prepare(`
    SELECT pi.*, b.graduation_date
    FROM portfolio_items pi
    JOIN bookings b ON pi.booking_id = b.id
    JOIN assignments a ON b.id = a.booking_id
    WHERE a.fg_id = ? AND pi.published = 1
    ORDER BY pi.created_at DESC
  `).all(req.fg.id);
  
  items.forEach(p => {
    try { p.highlight_photos = JSON.parse(p.highlight_photos || '[]'); } catch { p.highlight_photos = []; }
  });
  
  res.json({ data: items });
});

// ============ FG PROFILE ============
router.get('/profile', fgAuth, (req, res) => {
  const fg = req.fg;
  try { fg.specialties = JSON.parse(fg.specialties || '[]'); } catch { fg.specialties = []; }
  try { fg.bank_account = JSON.parse(fg.bank_account || '{}'); } catch { fg.bank_account = {}; }
  delete fg.id_card;
  res.json(fg);
});

router.put('/profile', fgAuth, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().trim().matches(/^62\d{9,12}$/),
  body('email').optional().isEmail(),
  body('portfolio_url').optional().isURL(),
  body('specialties').optional().isArray(),
  body('bank_account').optional().isObject(),
  body('active').optional().isInt({ min: 0, max: 1 }),
  body('requested_rate').optional().isInt({ min: 0 }),
  handleValidation
], (req, res) => {
  const { name, phone, email, portfolio_url, specialties, bank_account, active, requested_rate } = req.body;
  
  const updates = [];
  const params = [];
  
  if (name) { updates.push('name = ?'); params.push(name); }
  if (phone) { updates.push('phone = ?'); params.push(phone); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (portfolio_url !== undefined) { updates.push('portfolio_url = ?'); params.push(portfolio_url); }
  if (specialties) { updates.push('specialties = ?'); params.push(JSON.stringify(specialties)); }
  if (bank_account) { updates.push('bank_account = ?'); params.push(JSON.stringify(bank_account)); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active); }
  if (requested_rate !== undefined) { updates.push('pending_rate = ?'); params.push(requested_rate); }
  
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada data untuk diupdate' });
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.fg.id);
  
  db.prepare(`UPDATE freelancers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updated = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.fg.id);
  try { updated.specialties = JSON.parse(updated.specialties || '[]'); } catch { updated.specialties = []; }
  try { updated.bank_account = JSON.parse(updated.bank_account || '{}'); } catch { updated.bank_account = {}; }
  delete updated.id_card;
  
  res.json(updated);
});

// ============ FG TERMS AND CONDITIONS AGREEMENT ============
router.post('/agree-terms', fgAuth, (req, res) => {
  try {
    db.prepare('UPDATE freelancers SET agree_terms = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(req.fg.id);
    res.json({ success: true, message: 'Syarat dan Ketentuan Kemitraan berhasil disetujui.' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyetujui syarat & ketentuan: ' + e.message });
  }
});

module.exports = router;
