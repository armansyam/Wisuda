/**
 * Wisuda Platform — Rate Limit Middleware
 */

const rateLimit = require('express-rate-limit');

// Public inquiry: 5 req/min per IP
const publicInquiryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Terlalu banyak request. Coba lagi dalam 1 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

// Admin API: 100 req/min per session
const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Terlalu banyak request admin. Tunggu sebentar.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.userId || req.ip
});

// FG Portal: 30 req/min per token
const fgPortalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Terlalu banyak request. Tunggu sebentar.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || req.ip
});

// Login: 5 req/15min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Terlalu banyak percobaan login. Coba lagi 15 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

module.exports = {
  publicInquiryLimiter,
  adminApiLimiter,
  fgPortalLimiter,
  loginLimiter
};