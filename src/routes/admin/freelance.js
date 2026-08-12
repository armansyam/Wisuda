/**
 * src/routes/admin/freelance.js
 * Sub-router untuk semua endpoint /freelancers/*
 */
const express = require('express');
const { getDb } = require('../../config/database');
const { getSetting } = require('../../config/wa-templates');
const { body, validationResult } = require('express-validator');
const { handleValidation, paginationValidation, freelancerValidation } = require('../../middleware/validation');
const { generateWaLink } = require('../../services/wa.service');
const crypto = require('crypto');

const freelancersRouter = express.Router();
const db = getDb();

// ============ FREELANCERS ============
freelancersRouter.get('/freelancers', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, search = '', active, city } = req.query;
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params = [];

  if (search) {
    where += ' AND (name LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }
  if (active !== undefined) {
    const activeVal = (active === 'true' || active === '1') ? 1 : 0;
    where += ' AND active = ?';
    params.push(activeVal);
  }
  if (city && city !== 'all') {
    where += ' AND city = ?';
    params.push(city);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM freelancers WHERE ${where}`).get(params).c;

  // When city is provided as priority (not filter), sort matching city first
  let orderClause = 'name ASC';
  const priorityCity = req.query.priority_city;
  if (priorityCity) {
    orderClause = `CASE WHEN city = '${priorityCity.replace(/'/g, "''")}' THEN 0 ELSE 1 END, name ASC`;
  }

  const rows = db.prepare(`
    SELECT * FROM freelancers WHERE ${where} ORDER BY ${orderClause} LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // Parse JSON fields
  rows.forEach(f => {
    try { f.specialties = JSON.parse(f.specialties || '[]'); } catch { f.specialties = []; }
    try { f.bank_account = JSON.parse(f.bank_account || '{}'); } catch { f.bank_account = {}; }
  });

  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

freelancersRouter.post('/freelancers', freelancerValidation, (req, res) => {
  const { name, phone, email, portfolio_url, specialties, bank_account, id_card, default_rate, city } = req.body;

  // Auto-generate unique access code
  const crypto = require('crypto');
  const accessCode = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const result = db.prepare(`
    INSERT INTO freelancers (name, phone, email, portfolio_url, specialties, bank_account, id_card, access_code, default_rate, city)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, email || null, portfolio_url || null, JSON.stringify(specialties || []), JSON.stringify(bank_account || {}), id_card || null, accessCode, default_rate || 0, city);

  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(result.lastInsertRowid);
  try { fg.specialties = JSON.parse(fg.specialties); } catch { fg.specialties = []; }
  try { fg.bank_account = JSON.parse(fg.bank_account); } catch { fg.bank_account = {}; }

  res.status(201).json(fg);
});

freelancersRouter.patch('/freelancers/:id/active', [
  body('active').isBoolean().withMessage('Active must be boolean'),
  handleValidation
], (req, res) => {
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });

  db.prepare("UPDATE freelancers SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.body.active ? 1 : 0, req.params.id);

  const updated = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  try { updated.specialties = JSON.parse(updated.specialties); } catch { updated.specialties = []; }
  try { updated.bank_account = JSON.parse(updated.bank_account); } catch { updated.bank_account = {}; }
  res.json(updated);
});

freelancersRouter.put('/freelancers/:id', freelancerValidation, (req, res) => {
  const { name, phone, email, portfolio_url, specialties, bank_account, id_card, active, rating, default_rate, city } = req.body;

  db.prepare(`
    UPDATE freelancers 
    SET name = ?, phone = ?, email = ?, portfolio_url = ?, specialties = ?, bank_account = ?, id_card = ?, active = ?, rating = ?, default_rate = ?, city = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, phone, email || null, portfolio_url || null, JSON.stringify(specialties || []), JSON.stringify(bank_account || {}), id_card || null, active ? 1 : 0, rating || 5.0, default_rate || 0, city, req.params.id);

  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  try { fg.specialties = JSON.parse(fg.specialties); } catch { fg.specialties = []; }
  try { fg.bank_account = JSON.parse(fg.bank_account); } catch { fg.bank_account = {}; }

  res.json(fg);
});

// DELETE freelancer
freelancersRouter.delete('/freelancers/:id', (req, res) => {
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });

  try {
    // Delete linked schedules
    db.prepare("DELETE FROM fg_schedules WHERE fg_id = ?").run(req.params.id);

    // Set assignments status to cancelled or nullify fg_id for deleted FG
    db.prepare("UPDATE assignments SET status = 'cancelled', decline_reason = 'FG Akun Dihapus' WHERE fg_id = ?").run(req.params.id);

    // Delete freelancer record
    db.prepare("DELETE FROM freelancers WHERE id = ?").run(req.params.id);

    res.json({ success: true, message: `Freelancer ${fg.name} berhasil dihapus` });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus freelancer: ' + e.message });
  }
});

// POST /api/admin/freelancers/:id/approve-rate (Approve freelancer rate request)
freelancersRouter.post('/freelancers/:id/approve-rate', (req, res) => {
  const { id } = req.params;
  const fg = db.prepare('SELECT id, pending_rate FROM freelancers WHERE id = ?').get(id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });
  if (fg.pending_rate === null) return res.status(400).json({ error: 'Tidak ada pengajuan rate baru' });

  try {
    db.prepare('UPDATE freelancers SET default_rate = pending_rate, pending_rate = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    res.json({ success: true, message: 'Rate approved successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyetujui rate: ' + e.message });
  }
});

// Regenerate access code for a freelancer
freelancersRouter.post('/freelancers/:id/regenerate-code', (req, res) => {
  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(req.params.id);
  if (!fg) return res.status(404).json({ error: 'FG tidak ditemukan' });

  const crypto = require('crypto');
  const newCode = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare("UPDATE freelancers SET access_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(newCode, req.params.id);

  res.json({ success: true, access_code: newCode, message: 'Kode akses berhasil diperbarui' });
});

module.exports = freelancersRouter;
