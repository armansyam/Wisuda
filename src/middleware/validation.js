const { body, query, param, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
}

const inquiryValidation = [
  body('client_name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('client_phone').trim().matches(/^62\d{9,12}$/).withMessage('Format WA: 628xxxxxxxxxx'),
  body('client_email').optional().isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('graduation_date').isISO8601().withMessage('Tanggal tidak valid (YYYY-MM-DD)'),
  body('location').trim().isLength({ min: 2, max: 200 }).withMessage('Lokasi 2-200 karakter'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas 2-100 karakter'),
  body('package_id').optional().isInt({ min: 1 }).withMessage('Paket tidak valid'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Catatan max 1000 karakter'),
  handleValidation,
];

const inquiryStatusValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID tidak valid'),
  body('status').isIn(['new', 'quoted', 'booked', 'expired', 'lost', 'archived']).withMessage('Status tidak valid'),
  handleValidation,
];

const quoteValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID tidak valid'),
  body('package_id').isInt({ min: 1 }).withMessage('Paket wajib dipilih'),
  handleValidation,
];

const bookingDpValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID tidak valid'),
  body('dp_amount').isInt({ min: 1 }).withMessage('Nominal DP wajib'),
  body('dp_bukti_url').optional().isString().withMessage('URL bukti tidak valid'),
  handleValidation,
];

const bookingBalanceValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID tidak valid'),
  body('balance_bukti_url').optional().isString().withMessage('URL bukti tidak valid'),
  handleValidation,
];

const freelancerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('phone').trim().matches(/^62\d{9,12}$/).withMessage('Format WA: 628xxxxxxxxxx'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('portfolio_url').optional().isURL().withMessage('URL portfolio tidak valid'),
  body('specialties').optional().isArray().withMessage('Spesialisasi harus array'),
  body('bank_account').optional().isObject().withMessage('Bank account harus object'),
  body('id_card').optional().isString().withMessage('KTP harus string'),
  handleValidation,
];

const assignmentValidation = [
  body('booking_id').isInt({ min: 1 }).withMessage('Booking ID wajib'),
  body('fg_id').isInt({ min: 1 }).withMessage('FG ID wajib'),
  body('editor_id').optional().isInt({ min: 1 }).withMessage('Editor ID tidak valid'),
  body('brief').optional().trim().isLength({ max: 2000 }).withMessage('Brief max 2000 karakter'),
  handleValidation,
];

const deliverableQcValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID tidak valid'),
  body('qc_status').isIn(['approved', 'revision', 'rejected']).withMessage('Status QC tidak valid'),
  body('qc_notes').optional().trim().isLength({ max: 1000 }).withMessage('Catatan max 1000 karakter'),
  handleValidation,
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page min 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit 1-100'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search max 100 karakter'),
  query('status').optional().trim().isLength({ max: 50 }).withMessage('Status max 50 karakter'),
  handleValidation,
];

module.exports = {
  handleValidation,
  inquiryValidation,
  inquiryStatusValidation,
  quoteValidation,
  bookingDpValidation,
  bookingBalanceValidation,
  freelancerValidation,
  assignmentValidation,
  deliverableQcValidation,
  paginationValidation,
};