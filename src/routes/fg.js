const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');

const router = express.Router();
const db = getDb();

// FG auth using access_code
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
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail(),
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
