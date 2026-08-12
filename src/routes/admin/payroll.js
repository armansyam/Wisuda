/**
 * src/routes/admin/payroll.js
 * Sub-router untuk semua endpoint /payouts/* (Payroll & Payout)
 */
const express = require('express');
const { getDb } = require('../../config/database');
const { getSettings, getSetting } = require('../../config/wa-templates');
const { body, param, validationResult } = require('express-validator');
const { handleValidation, paginationValidation } = require('../../middleware/validation');
const { generateWaLink } = require('../../services/wa.service');
const { formatCurrency, formatDate } = require('../../utils/currency');
const { saveFinalInvoiceSnapshot } = require('../../utils/invoice');

const payoutsRouter = express.Router();
const db = getDb();

// ============ PAYOUTS ============
payoutsRouter.get('/payouts', paginationValidation, (req, res) => {
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

payoutsRouter.post('/payouts/run', [
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

payoutsRouter.post('/payouts/complete-bulk', [
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

payoutsRouter.post('/payouts/:id/complete', [
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

// ============ PORTFOLIO — Dipindahkan ke src/routes/admin/portfolio.js ============

module.exports = payoutsRouter;
