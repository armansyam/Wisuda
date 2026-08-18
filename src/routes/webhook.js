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

/**
 * Middleware: validasi X-Cron-Secret header untuk semua cron trigger endpoints.
 * Hanya berlaku jika WEBHOOK_SECRET diset di environment.
 */
function requireCronSecret(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    // Jika tidak diset, tolak akses — paksa admin untuk menetapkan secret
    return res.status(401).json({ error: 'WEBHOOK_SECRET not configured. Set WEBHOOK_SECRET in .env to use webhook cron endpoints.' });
  }
  const provided = req.headers['x-cron-secret'] || req.query.secret;
  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'Invalid or missing X-Cron-Secret header' });
  }
  next();
}

// ============ INQUIRY SUBMIT (public form can call this directly) ============
router.post('/inquiry', [
  body('client_name').trim().isLength({ min: 2, max: 100 }),
  body('client_phone').trim()
    .customSanitizer(v => {
      if (!v) return '';
      let p = v.replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      else if (p.length >= 9 && !p.startsWith('62')) p = '62' + p;
      return p;
    })
    .matches(/^62\d{9,12}$/).withMessage('Format nomor telepon tidak valid (harus format 08... atau 628...)'),
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
  const rawTemplate = templates.client_new_inquiry || templates.admin_new_inquiry || 'Halo Admin, ada inquiry baru dari {client_name} ({client_phone}) untuk wisuda tgl {graduation_date}.';
  
  let msg = rawTemplate
    .replace('{client_name}', client_name || '')
    .replace('{graduation_date}', formatDate(graduation_date))
    .replace('{location}', location || '')
    .replace('{university}', university || '')
    .replace('{package_name}', pkg?.name || '-')
    .replace('{client_phone}', client_phone || '')
    .replace('{company_name}', settings.company_name || settings.companyName || 'Wisuda Platform');
  
  const adminPhone = settings.adminPhone || settings.admin_phone || '628123456789';
  const waLink = `https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`;
  
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

// ============ CRON TRIGGER ENDPOINTS (protected by X-Cron-Secret) ============
router.post('/cron/reminder-h3', requireCronSecret, (req, res) => {
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

router.post('/cron/reminder-h1', requireCronSecret, (req, res) => {
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

router.post('/cron/auto-approve', requireCronSecret, (req, res) => {
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
    
    // FIX: Update booking status ke 'delivered' setelah auto-approve
    db.prepare("UPDATE bookings SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(d.booking_id);
    
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

router.post('/cron/dp-expired', requireCronSecret, (req, res) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const inquiries = db.prepare(`
    SELECT * FROM inquiries 
    WHERE status IN ('booking_link_active') AND created_at < ?
  `).all(cutoff);
  
  for (const i of inquiries) {
    db.prepare('UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('expired', i.id);
  }
  
  res.json({ expired: inquiries.length, data: inquiries.map(i => i.id) });
});

router.post('/cron/payout', requireCronSecret, (req, res) => {
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

router.post('/cron/backup', requireCronSecret, async (req, res) => {
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