const express = require('express');
const router = express.Router();
const { getDb } = require('../../config/database');
const { body, validationResult } = require('express-validator');

// Helper untuk validasi
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/admin/partners
router.get('/', (req, res) => {
  const db = getDb();
  const partners = db.prepare('SELECT * FROM partners ORDER BY created_at DESC').all();
  res.json({ partners });
});

// POST /api/admin/partners
router.post('/', [
  body('name').trim().notEmpty(),
  body('profession').trim().notEmpty(),
  body('code').trim().notEmpty().isUppercase().matches(/^[A-Z0-9_]+$/).withMessage('Kode hanya boleh huruf besar, angka, dan underscore'),
  body('discount_type').isIn(['nominal', 'percent']),
  body('discount_value').isInt({ min: 0 }),
  body('fee_type').isIn(['nominal', 'percent']),
  body('fee_value').isInt({ min: 0 }),
  handleValidation
], (req, res) => {
  const { name, profession, code, discount_type, discount_value, fee_type, fee_value } = req.body;
  const db = getDb();

  // Check if code exists in partners OR promo_codes
  const existingPartner = db.prepare('SELECT id FROM partners WHERE code = ?').get(code);
  const existingPromo = db.prepare('SELECT id FROM promo_codes WHERE code = ?').get(code);
  if (existingPartner || existingPromo) {
    return res.status(400).json({ error: 'Kode referal sudah digunakan (cek tabel partner atau promo)' });
  }

  const result = db.prepare(`
    INSERT INTO partners (name, profession, code, discount_type, discount_value, fee_type, fee_value, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(name, profession, code, discount_type, discount_value, fee_type, fee_value);

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ partner, message: 'Partner berhasil dibuat' });
});

// PUT /api/admin/partners/:id/toggle
router.put('/:id/toggle', (req, res) => {
  const db = getDb();
  const partner = db.prepare('SELECT active FROM partners WHERE id = ?').get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner tidak ditemukan' });

  const newActive = partner.active === 1 ? 0 : 1;
  db.prepare('UPDATE partners SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newActive, req.params.id);
  
  res.json({ success: true, active: newActive });
});

// DELETE /api/admin/partners/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  
  // Periksa apakah partner sudah dipakai di booking
  const partner = db.prepare('SELECT code FROM partners WHERE id = ?').get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner tidak ditemukan' });

  const used = db.prepare('SELECT id FROM bookings WHERE promo_code_used = ? LIMIT 1').get(partner.code);
  if (used) {
    return res.status(400).json({ error: 'Tidak dapat menghapus partner yang kodenya sudah pernah digunakan. Silakan nonaktifkan (toggle) saja.' });
  }

  db.prepare('DELETE FROM partners WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Partner berhasil dihapus' });
});

module.exports = router;
