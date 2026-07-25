const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { getSettings, getWaTemplates } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('../utils/currency');

const router = express.Router();
const db = getDb();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
}

// ============ FG CONFIRM VIA WA.ME ============
// When FG clicks wa.me link with "KONFIRMASI {assignment_id}", they send to admin WA
// Admin then calls this endpoint to confirm
router.post('/wa/fg-confirm', [
  body('assignment_id').isInt({ min: 1 }).withMessage('Assignment ID wajib'),
  body('fg_id').isInt({ min: 1 }).withMessage('FG ID wajib'),
  handleValidation
], (req, res) => {
  const { assignment_id, fg_id } = req.body;
  
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ? AND fg_id = ?').get(assignment_id, fg_id);
  if (!assignment) return res.status(404).json({ error: 'Assignment tidak ditemukan' });
  
  if (assignment.fg_confirmed_at) {
    return res.status(400).json({ error: 'Sudah dikonfirmasi' });
  }
  
  const now = new Date().toISOString();
  db.prepare('UPDATE assignments SET fg_confirmed_at = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(now, 'confirmed', assignment_id);
  
  // Notify admin
  const settings = getSettings();
  const fg = db.prepare('SELECT name FROM freelancers WHERE id = ?').get(fg_id);
  
  const msg = `✅ FG KONFIRMASI\n${fg?.name || 'FG'} menerima Assignment #${assignment_id}`;
  const waLink = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(msg)}`;
  
  res.json({ success: true, confirmed_at: now, wa_link: waLink });
});

// ============ CLIENT APPROVE DELIVERY VIA WA.ME ============
// When client clicks wa.me link with "OK {booking_id}"
router.post('/wa/client-approve', [
  body('booking_id').isInt({ min: 1 }).withMessage('Booking ID wajib'),
  body('client_phone').trim().matches(/^62\d{9,12}$/).withMessage('Phone tidak valid'),
  handleValidation
], (req, res) => {
  const { booking_id, client_phone } = req.body;
  
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND client_phone = ?').get(booking_id, client_phone);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });
  
  const assignment = db.prepare('SELECT * FROM assignments WHERE booking_id = ?').get(booking_id);
  if (!assignment) return res.status(404).json({ error: 'Assignment tidak ditemukan' });
  
  const deliverable = db.prepare('SELECT * FROM deliverables WHERE assignment_id = ?').get(assignment.id);
  if (!deliverable) return res.status(404).json({ error: 'Deliverable tidak ditemukan' });
  
  if (deliverable.client_approved) {
    return res.status(400).json({ error: 'Sudah di-approve' });
  }
  
  const now = new Date().toISOString();
  db.prepare('UPDATE deliverables SET client_approved = 1, client_approved_at = ? WHERE id = ?')
    .run(now, deliverable.id);
  
  // Trigger balance invoice
  if (booking.balance_status === 'unpaid') {
    const templates = getWaTemplates();
    const settings = getSettings();
    const rawBank = getSettings().bank_accounts;
    const bankAccounts = typeof rawBank === 'string' ? JSON.parse(rawBank) : (Array.isArray(rawBank) ? rawBank : []);
    const bankList = bankAccounts.map(b => `${b.bank} - ${b.norek} a.n ${b.atas_nama}`).join('\n');
    
    let msg = templates.balance_due
      .replace('{balance_amount}', formatCurrency(booking.balance_amount))
      .replace('{bank_list}', bankList)
      .replace('{admin_phone}', settings.adminPhone);
    
    const waLink = `https://wa.me/${client_phone}?text=${encodeURIComponent(msg)}`;
    
    res.json({ success: true, approved_at: now, balance_invoice: { wa_link: waLink, amount: booking.balance_amount } });
  } else {
    res.json({ success: true, approved_at: now, message: 'Sudah lunas, booking completed' });
  }
});

// ============ INQUIRY SUBMIT (public form can call this directly) ============
router.post('/inquiry', [
  body('client_name').trim().isLength({ min: 2, max: 100 }),
  body('client_phone').trim().matches(/^62\d{9,12}$/),
  body('client_email').optional().isEmail(),
  body('graduation_date').isISO8601(),
  body('location').trim().isLength({ min: 2, max: 200 }),
  body('university').trim().isLength({ min: 2, max: 100 }),
  body('package_id').optional().isInt({ min: 1 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  handleValidation
], (req, res) => {
  const { client_name, client_phone, client_email, graduation_date, location, university, package_id, notes } = req.body;
  
  let pkg = null;
  if (package_id) {
    pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
    if (!pkg) return res.status(400).json({ error: 'Paket tidak valid' });
  }
  
  const result = db.prepare(`
    INSERT INTO inquiries (client_name, client_phone, client_email, graduation_date, location, university, package_id, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web')
  `).run(client_name, client_phone, client_email || null, graduation_date, location, university, package_id || null, notes || '');
  
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(result.lastInsertRowid);
  
  // WA.me for admin
  const templates = getWaTemplates();
  const settings = getSettings();
  
  let msg = templates.admin_new_inquiry
    .replace('{client_name}', client_name)
    .replace('{graduation_date}', formatDate(graduation_date))
    .replace('{location}', location)
    .replace('{package_name}', pkg?.name || '-')
    .replace('{client_phone}', client_phone);
  
  const waLink = `https://wa.me/${settings.adminPhone}?text=${encodeURIComponent(msg)}`;
  
  res.status(201).json({ 
    success: true, 
    message: 'Inquiry terkirim. Admin akan menghubungi via WA 1x24 jam.',
    inquiry_id: inquiry.id,
    wa_link: waLink
  });
});

// ============ HEALTH CHECK FOR CRON ============
router.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ============ CRON TRIGGER ENDPOINTS (for external cron if needed) ============
router.post('/cron/reminder-h3', (req, res) => {
  // Triggered by cron job
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const assignments = db.prepare(`
    SELECT a.*, b.client_name, b.client_phone, b.graduation_date, b.shooting_time, b.location, b.brief,
           f.name as fg_name, f.phone as fg_phone
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE b.graduation_date = ? AND a.status IN ('confirmed', 'shooting')
  `).all(dateStr);
  
  const templates = getWaTemplates();
  const settings = getSettings();
  const results = [];
  
  for (const a of assignments) {
    // FG reminder
    let msgFg = templates.reminder_h3_fg
      .replace('{client_name}', a.client_name)
      .replace('{location}', a.location)
      .replace('{shooting_time}', a.shooting_time || '-')
      .replace('{brief}', a.brief || '-');
    
    const waLinkFg = `https://wa.me/${a.fg_phone}?text=${encodeURIComponent(msgFg)}`;
    
    // Client reminder
    let msgClient = templates.reminder_h3_client
      .replace('{client_name}', a.client_name)
      .replace('{shooting_time}', a.shooting_time || '-')
      .replace('{location}', a.location)
      .replace('{fg_name}', a.fg_name || '-')
      .replace('{fg_phone}', a.fg_phone || '-');
    
    const waLinkClient = `https://wa.me/${a.client_phone}?text=${encodeURIComponent(msgClient)}`;
    
    results.push({ assignment_id: a.id, fg: waLinkFg, client: waLinkClient });
  }
  
  res.json({ date: dateStr, reminders_sent: results.length, data: results });
});

router.post('/cron/reminder-h1', (req, res) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const assignments = db.prepare(`
    SELECT a.*, b.client_name, b.client_phone, b.graduation_date, b.shooting_time, b.location, b.brief,
           f.name as fg_name, f.phone as fg_phone
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE b.graduation_date = ? AND a.status IN ('confirmed', 'shooting')
  `).all(dateStr);
  
  const templates = getWaTemplates();
  const settings = getSettings();
  const results = [];
  
  for (const a of assignments) {
    let msgFg = templates.reminder_h1_fg
      .replace('{client_name}', a.client_name)
      .replace('{location}', a.location)
      .replace('{shooting_time}', a.shooting_time || '-')
      .replace('{brief}', a.brief || '-');
    
    const waLinkFg = `https://wa.me/${a.fg_phone}?text=${encodeURIComponent(msgFg)}`;
    
    let msgClient = templates.reminder_h1_client
      .replace('{client_name}', a.client_name)
      .replace('{shooting_time}', a.shooting_time || '-')
      .replace('{location}', a.location)
      .replace('{fg_name}', a.fg_name || '-')
      .replace('{fg_phone}', a.fg_phone || '-');
    
    const waLinkClient = `https://wa.me/${a.client_phone}?text=${encodeURIComponent(msgClient)}`;
    
    results.push({ assignment_id: a.id, fg: waLinkFg, client: waLinkClient });
  }
  
  res.json({ date: dateStr, reminders_sent: results.length, data: results });
});

router.post('/cron/auto-approve', (req, res) => {
  const autoApproveHours = parseInt(getSettings().auto_approve_hours || 48);
  const cutoff = new Date(Date.now() - autoApproveHours * 60 * 60 * 1000).toISOString();
  
  const deliverables = db.prepare(`
    SELECT d.*, a.booking_id, b.client_name, b.client_phone, b.balance_amount, b.balance_status
    FROM deliverables d
    JOIN assignments a ON d.assignment_id = a.id
    JOIN bookings b ON a.booking_id = b.id
    WHERE d.client_approved = 0 
    AND d.delivered_at IS NOT NULL 
    AND d.delivered_at < ?
  `).all(cutoff);
  
  const templates = getWaTemplates();
  const settings = getSettings();
  const results = [];
  
  for (const d of deliverables) {
    db.prepare('UPDATE deliverables SET client_approved = 1, client_approved_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(d.id);
    
    // If balance unpaid, send balance invoice
    if (d.balance_status === 'unpaid') {
      const rawBank = getSettings().bank_accounts;
      const bankAccounts = typeof rawBank === 'string' ? JSON.parse(rawBank) : (Array.isArray(rawBank) ? rawBank : []);
      const bankList = bankAccounts.map(b => `${b.bank} - ${b.norek} a.n ${b.atas_nama}`).join('\n');
      
      let msg = templates.balance_due
        .replace('{balance_amount}', formatCurrency(d.balance_amount))
        .replace('{bank_list}', bankList)
        .replace('{admin_phone}', settings.adminPhone);
      
      const waLink = `https://wa.me/${d.client_phone}?text=${encodeURIComponent(msg)}`;
      results.push({ deliverable_id: d.id, action: 'balance_invoice_sent', wa_link: waLink });
    } else {
      results.push({ deliverable_id: d.id, action: 'auto_approved' });
    }
  }
  
  res.json({ auto_approved: results.length, data: results });
});

router.post('/cron/dp-expired', (req, res) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const inquiries = db.prepare(`
    SELECT * FROM inquiries 
    WHERE status = 'quoted' AND created_at < ?
  `).all(cutoff);
  
  for (const i of inquiries) {
    db.prepare('UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('expired', i.id);
  }
  
  res.json({ expired: inquiries.length, data: inquiries.map(i => i.id) });
});

router.post('/cron/payout', (req, res) => {
  const { period_start, period_end } = req.body;
  
  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'period_start dan period_end wajib' });
  }
  
  const assignments = db.prepare(`
    SELECT a.*, b.total_price, p.fg_fee as package_fg_fee, p.editor_fee,
           f.name as fg_name, f.phone as fg_phone, f.bank_account
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    JOIN packages p ON b.package_id = p.id
    JOIN freelancers f ON a.fg_id = f.id
    WHERE a.status = 'done' 
    AND b.status = 'completed'
    AND a.updated_at BETWEEN ? AND ?
    AND NOT EXISTS (SELECT 1 FROM payouts WHERE assignment_id = a.id)
  `).all(period_start, period_end);
  
  const results = [];
  for (const a of assignments) {
    const fgFee = a.fg_fee || a.package_fg_fee || 0;
    const editorFee = a.editor_fee || 0;
    const total = fgFee + editorFee;
    
    const result = db.prepare(`
      INSERT INTO payouts (assignment_id, fg_id, fg_fee, editor_fee, total_payout, period_start, period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(a.id, a.fg_id, fgFee, editorFee, total, period_start, period_end);
    
    results.push({ assignment_id: a.id, payout_id: result.lastInsertRowid, total });
  }
  
  res.json({ created: results.length, data: results });
});

router.post('/cron/backup', async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const backupDir = getSettings().backupPath || './DATA/backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFile = path.join(backupDir, `wisuda_${dateStr}.db`);
  
  try {
    const db = getDb();
    await db.backup(backupFile);
    res.json({ backup_file: backupFile, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Gagal melakukan backup database: ' + err.message });
  }
});

module.exports = router;