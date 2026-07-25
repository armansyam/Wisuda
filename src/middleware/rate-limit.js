/**
 * Wisuda Platform — Rate Limit Middleware
 */

const rateLimit = require('express-rate-limit');
const isTestEnv = process.env.NODE_ENV === 'test';

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
  keyGenerator: (req) => req.ip,
  skip: () => isTestEnv,
});

// Admin API: Unrestricted (no rate limit for admin operations)
const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true,
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
  keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || req.ip,
  skip: () => isTestEnv,
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
  keyGenerator: (req) => req.ip,
  skip: () => isTestEnv,
});

module.exports = {
  publicInquiryLimiter,
  adminApiLimiter,
  fgPortalLimiter,
  loginLimiter
};