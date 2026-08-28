const express = require('express');
const router = express.Router();
const { getDb } = require('../../config/database');
const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/admin/expenses (with pagination and optional filters)
router.get('/', (req, res) => {
  const { month, year, limit = 50, offset = 0 } = req.query;
  const db = getDb();
  
  let query = 'SELECT e.*, u.username as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id';
  const params = [];
  
  if (month && year) {
    query += ' WHERE strftime("%Y-%m", e.expense_date) = ?';
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  }

  query += ' ORDER BY e.expense_date DESC, e.id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const expenses = db.prepare(query).all(...params);
  
  // Total summary for this query
  let totalQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM expenses';
  const totalParams = [];
  if (month && year) {
    totalQuery += ' WHERE strftime("%Y-%m", expense_date) = ?';
    totalParams.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  const summary = db.prepare(totalQuery).get(...totalParams);

  res.json({ expenses, total: summary.total });
});

// POST /api/admin/expenses
router.post('/', [
  body('expense_date').isDate(),
  body('category').trim().notEmpty(),
  body('amount').isInt({ min: 1 }),
  body('description').optional().trim(),
  handleValidation
], (req, res) => {
  const { expense_date, category, amount, description } = req.body;
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO expenses (expense_date, category, amount, description, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(expense_date, category, amount, description || '', req.user?.id || null);

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ expense, message: 'Pengeluaran berhasil dicatat' });
});

// DELETE /api/admin/expenses/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Pengeluaran berhasil dihapus' });
});

module.exports = router;
