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

// GET /api/admin/promo
router.get('/', (req, res) => {
  const db = getDb();
  const promos = db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all();
  res.json({ promos });
});

// POST /api/admin/promo
router.post('/', [
  body('code').trim().notEmpty().isUppercase().matches(/^[A-Z0-9_]+$/).withMessage('Kode promo hanya boleh huruf besar, angka, dan underscore'),
  body('discount_type').isIn(['nominal', 'percent']),
  body('discount_value').isInt({ min: 1 }),
  body('affiliate_fee_value').optional().isInt({ min: 0 }),
  body('quota').optional({ nullable: true }).isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const { code, discount_type, discount_value, affiliate_fee_value, quota } = req.body;
  const db = getDb();

  // Check if code exists
  const existing = db.prepare('SELECT id FROM promo_codes WHERE code = ?').get(code);
  if (existing) {
    return res.status(400).json({ error: 'Kode promo sudah ada' });
  }

  const result = db.prepare(`
    INSERT INTO promo_codes (code, discount_type, discount_value, affiliate_fee_value, quota, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(code, discount_type, discount_value, affiliate_fee_value || 0, quota || null);

  const promo = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ promo, message: 'Kode promo berhasil dibuat' });
});

// PUT /api/admin/promo/:id/toggle
router.put('/:id/toggle', (req, res) => {
  const db = getDb();
  const promo = db.prepare('SELECT active FROM promo_codes WHERE id = ?').get(req.params.id);
  if (!promo) return res.status(404).json({ error: 'Promo tidak ditemukan' });

  const newActive = promo.active === 1 ? 0 : 1;
  db.prepare('UPDATE promo_codes SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newActive, req.params.id);
  
  res.json({ success: true, active: newActive });
});

// DELETE /api/admin/promo/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  
  // Periksa apakah promo sudah dipakai di booking
  const promo = db.prepare('SELECT code FROM promo_codes WHERE id = ?').get(req.params.id);
  if (!promo) return res.status(404).json({ error: 'Promo tidak ditemukan' });

  const used = db.prepare('SELECT id FROM bookings WHERE promo_code_used = ? LIMIT 1').get(promo.code);
  if (used) {
    return res.status(400).json({ error: 'Tidak dapat menghapus promo yang sudah pernah digunakan oleh klien. Silakan nonaktifkan (toggle) saja.' });
  }

  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Promo berhasil dihapus' });
});

module.exports = router;
