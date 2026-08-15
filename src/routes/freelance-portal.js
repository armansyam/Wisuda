const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { getSettings } = require('../config/wa-templates');

const router = express.Router();
const db = getDb();

// ============ FREELANCE PORTAL (PUBLIC) ============

// Public status check (always enabled)
router.get('/status', (req, res) => {
  res.json({ enabled: true });
});

// Login: freelancer verifies with phone + access_code
router.post('/login', [
  body('phone')
    .customSanitizer(v => {
      if (!v) return '';
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      else if (p.length >= 9 && !p.startsWith('62')) p = '62' + p;
      return p;
    })
    .matches(/^62\d{8,13}$/).withMessage('Format nomor WA tidak valid'),
  body('access_code').trim().notEmpty().withMessage('Kode akses wajib diisi'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Format nomor WA tidak valid', details: errors.array() });
    next();
  }
], (req, res) => {
  const { phone, access_code } = req.body;
  const normalPhone = phone;

  const fg = db.prepare(`
    SELECT id, name, phone, access_code, active FROM freelancers 
    WHERE access_code = ? AND active = 1
  `).get(access_code.trim());

  if (!fg) return res.status(401).json({ error: 'Kode akses tidak valid atau tidak aktif' });

  // Verify phone match flexibly
  let fgPhone = (fg.phone || '').replace(/[^0-9]/g, '');
  if (fgPhone.startsWith('0')) fgPhone = '62' + fgPhone.slice(1);
  else if (fgPhone.length >= 9 && !fgPhone.startsWith('62')) fgPhone = '62' + fgPhone;

  let inputPhone = normalPhone.replace(/[^0-9]/g, '');
  if (inputPhone.startsWith('0')) inputPhone = '62' + inputPhone.slice(1);
  else if (inputPhone.length >= 9 && !inputPhone.startsWith('62')) inputPhone = '62' + inputPhone;

  const fgSuffix = fgPhone.slice(-8);
  const inputSuffix = inputPhone.slice(-8);

  if (fgPhone !== inputPhone && fgSuffix !== inputSuffix) {
    return res.status(401).json({ error: 'Nomor HP/WA tidak cocok dengan data freelancer' });
  }

  // Generate session token
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  const settings = getSettings();
  const cName = settings.company_name || settings.companyName || 'Wisuda Platform';
  res.json({
    success: true,
    token: token,
    fg_id: fg.id,
    fg_name: fg.name,
    company_name: cName,
    logo_url: settings.logo_url || '',
    message: 'Login berhasil'
  });
});

// Auto-login: freelancer logs in with just access_code (from admin-sent portal link)
router.post('/auto-login', [
  body('access_code').trim().notEmpty().withMessage('Kode akses wajib diisi'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    next();
  }
], (req, res) => {
  const { access_code } = req.body;

  const fg = db.prepare(`
    SELECT id, name, phone, access_code, active FROM freelancers 
    WHERE access_code = ? AND active = 1
  `).get(access_code.trim());

  if (!fg) return res.status(401).json({ error: 'Kode akses tidak valid atau tidak aktif' });

  const settings = getSettings();
  const cName = settings.company_name || settings.companyName || 'Wisuda Platform';
  res.json({
    success: true,
    fg_id: fg.id,
    fg_name: fg.name,
    access_code: fg.access_code,
    company_name: cName,
    logo_url: settings.logo_url || '',
    message: 'Auto-login berhasil'
  });
});

// Accept assignment: freelancer confirms they will handle the client
router.post('/accept-assignment', [
  body('fg_id').isInt({ min: 1 }),
  body('access_code').trim().notEmpty(),
  body('assignment_id').isInt({ min: 1 }),
  body('accept_editing').optional().isBoolean(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    next();
  }
], (req, res) => {
  const { fg_id, access_code, assignment_id, accept_editing } = req.body;

  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND access_code = ? AND active = 1').get(fg_id, access_code);
  if (!fg) return res.status(401).json({ error: 'Akses tidak valid' });

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(assignment_id, fg.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment tidak ditemukan' });

  if (assignment.status !== 'assigned') {
    return res.status(400).json({ error: 'Penugasan ini sudah diterima atau dalam proses' });
  }

  // If editor unchecks accept_editing, remove their editor assignment (set editor_id = NULL)
  if (accept_editing === false || accept_editing === 'false') {
    db.prepare(`
      UPDATE assignments SET status = 'confirmed', editor_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(assignment.id);
  } else {
    db.prepare(`
      UPDATE assignments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(assignment.id);
  }

  res.json({
    success: true,
    message: 'Penugasan diterima! Selamat bekerja 🎉',
    assignment_id: assignment.id
  });
});

// Get freelancer's assigned clients & schedules  
router.get('/schedule', (req, res) => {
  const fgId = req.query.fg_id;
  const accessCode = req.query.access_code;

  if (!fgId || !accessCode) return res.status(400).json({ error: 'fg_id dan access_code wajib' });

  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND access_code = ? AND active = 1').get(fgId, accessCode);
  if (!fg) return res.status(401).json({ error: 'Akses tidak valid' });

  const assignments = db.prepare(`
    SELECT a.id, a.booking_id, a.status as assignment_status, a.brief, 
           a.fg_confirmed_at, a.shoot_start_at, a.shoot_end_at, a.upload_deadline,
           a.created_at as assigned_at, a.fg_id, a.editor_id,
           b.client_name, b.graduation_date, b.shooting_time, b.location, b.university, b.tracking_token,
           (SELECT COUNT(*) FROM booking_moodboards bm WHERE bm.booking_id = b.id AND bm.items != '[]' AND bm.items != '') > 0 AS has_moodboard,
           b.status as booking_status, b.drive_parent_url, b.staging_drive_url, b.highlight_drive_url, b.download_url,
           p.name as package_name, p.includes as package_includes, p.duration_hours,
           d.drive_folder_url, d.raw_folder_url, d.qc_status, d.delivered_at, d.delivery_type, d.notes as delivery_notes,
           py.status as payout_status, py.total_payout, py.paid_at,
           COALESCE(a.fg_fee, (SELECT default_rate FROM freelancers WHERE id = a.fg_id), p.fg_fee, 0) as final_fg_fee
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    LEFT JOIN payouts py ON py.assignment_id = a.id
    WHERE a.fg_id = ?
    ORDER BY b.graduation_date ASC
  `).all(fg.id);

  // Format status labels
  const statusLabels = {
    assigned: 'Jadwal Sesi Foto',
    accepted: 'Jadwal Sesi Foto',
    confirmed: 'Jadwal Sesi Foto',
    shooting: 'Sesi Pemotretan',
    uploaded: 'File Diupload',
    done: 'Selesai Sesi',
    completed: 'Selesai Sesi'
  };

  const formatted = assignments.map(a => {
    const isCompletedSession = ['done', 'completed'].includes(a.assignment_status);
    
    let is_completed = false;
    let status_label = statusLabels[a.assignment_status] || a.assignment_status;

    if (isCompletedSession) {
      if (a.payout_status === 'paid') {
        is_completed = true;
        status_label = 'Selesai & Dibayar';
      } else {
        is_completed = false;
        status_label = 'Sesi Selesai (Menunggu Payment)';
      }
    }

    return {
      ...a,
      has_moodboard: Boolean(a.has_moodboard),
      status_label,
      is_completed,
      is_session_done: isCompletedSession,
      delivery_type: a.delivery_type || 'fisik',
      qc_label: a.qc_status === 'approved' ? 'Disetujui' : a.qc_status === 'revision' ? 'Revisi' : 'Pending'
    };
  });

  const settings = getSettings();

  res.json({
    fg_name: fg.name,
    agree_terms: fg.agree_terms,
    admin_phone: settings?.adminPhone || settings?.admin_phone || '',
    assignments: formatted,
    stats: {
      total: formatted.length,
      pending: formatted.filter(a => !a.is_completed).length,
      shooting: formatted.filter(a => a.assignment_status === 'shooting').length,
      completed: formatted.filter(a => a.is_completed).length,
      file_submitted: formatted.filter(a => a.is_file_submitted).length
    }
  });
});

// Freelancer confirms photo session completed for a client
router.post('/confirm-session', [
  body('fg_id').isInt({ min: 1 }),
  body('access_code').trim().notEmpty(),
  body('assignment_id').isInt({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validasi gagal', details: errors.array() });
    next();
  }
], (req, res) => {
  const { fg_id, access_code, assignment_id } = req.body;

  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND access_code = ? AND active = 1').get(fg_id, access_code);
  if (!fg) return res.status(401).json({ error: 'Akses tidak valid' });

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(assignment_id, fg.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment tidak ditemukan' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE assignments SET status = 'done', shoot_end_at = COALESCE(shoot_end_at, ?), 
    fg_confirmed_at = COALESCE(fg_confirmed_at, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(now, now, assignment.id);

  // Cek kelunasan pembayaran untuk transisi Gate 2
  const booking = db.prepare('SELECT id, balance_status, balance_amount, status FROM bookings WHERE id = ?').get(assignment.booking_id);
  
  let targetStatus = 'shooting';
  if (booking) {
    const isPaidInFull = booking.balance_status === 'paid' || (booking.balance_amount !== null && Number(booking.balance_amount) <= 0);
    targetStatus = isPaidInFull ? 'post_production' : 'shooting';

    // Update booking: selalu sinkronkan is_session_done = 1
    db.prepare(`
      UPDATE bookings 
      SET is_session_done = 1, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(targetStatus, booking.id);
  }

  res.json({
    success: true,
    message: `Sesi foto untuk client telah dikonfirmasi selesai ✅`,
    assignment_id: assignment.id,
    is_session_done: 1,
    booking_status: targetStatus
  });
});



// Get consolidated payout invoice details by transfer reference (Publicly accessible)
router.get('/payout-invoice/:transfer_ref', (req, res) => {
  const ref = req.params.transfer_ref;
  
  const payouts = db.prepare(`
    SELECT p.*, f.name as fg_name, f.phone as fg_phone, f.bank_account,
           a.booking_id, b.client_name, b.graduation_date, b.location, b.university,
           pkg.name as package_name
    FROM payouts p
    JOIN freelancers f ON p.fg_id = f.id
    JOIN assignments a ON p.assignment_id = a.id
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN packages pkg ON b.package_id = pkg.id
    WHERE p.transfer_ref = ?
  `).all(ref);
  
  if (payouts.length === 0) {
    return res.status(404).json({ error: 'Invoice tidak ditemukan' });
  }
  
  // Format bank account of first item
  const mainPayout = payouts[0];
  let ba = {};
  try { ba = JSON.parse(mainPayout.bank_account || '{}'); } catch { ba = {}; }
  mainPayout.bank_account = {
    bank: ba.bank || '',
    norek: ba.norek || ba.number || '',
    number: ba.number || ba.norek || '',
    atas_nama: ba.atas_nama || ba.name || '',
    name: ba.name || ba.atas_nama || ''
  };
  
  const settings = getSettings();
  
  res.json({
    fg_name: mainPayout.fg_name,
    fg_phone: mainPayout.fg_phone,
    bank_account: mainPayout.bank_account,
    transfer_ref: mainPayout.transfer_ref,
    paid_at: mainPayout.paid_at,
    company_name: settings.companyName || 'Wisuda Platform',
    company_address: settings.companyAddress || '',
    company_phone: settings.companyPhone || '',
    items: payouts.map(p => ({
      payout_id: p.id,
      client_name: p.client_name,
      graduation_date: p.graduation_date,
      location: p.location,
      university: p.university,
      package_name: p.package_name,
      fg_fee: p.fg_fee,
      bonus: p.bonus || 0,
      deduction: p.deduction || 0,
      total_payout: p.total_payout
    })),
    total_amount: payouts.reduce((sum, p) => sum + p.total_payout, 0)
  });
});

module.exports = router;
