const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const path = require('path');
require('dotenv').config();

const config = require('./config/settings');
const { getDb, migrate } = require('./config/database');
const { loadSettings, loadWaTemplates } = require('./config/wa-templates');
const authMiddleware = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const freelancePortalRoutes = require('./routes/freelance-portal');
const fgRoutes = require('./routes/fg');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'sessions',
    dir: path.dirname(config.dbPath),
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // LAN internal, no HTTPS
    maxAge: config.sessionMaxAge,
    sameSite: 'lax',
  },
  name: 'wisuda.sid',
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Terlalu banyak request, coba lagi nanti' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => true,
});
app.use(globalLimiter);

// File upload middleware for logo/branding
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  abortOnLimit: true,
}));

// Stricter rate limit for public inquiry (booking form)
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Terlalu banyak inquiry, coba lagi 15 menit' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => true,
});

// Relaxed rate limit for freelance portal (active use throughout work day)
const freelancePortalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Terlalu banyak request, coba lagi sebentar' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => true,
});

// Ensure upload directories exist
const fs = require('fs');
const invoiceClientDir = path.join(config.uploadPath, 'invoices-client');
const invoiceFreelanceDir = path.join(config.uploadPath, 'invoices-freelance');

if (!fs.existsSync(invoiceClientDir)) fs.mkdirSync(invoiceClientDir, { recursive: true });
if (!fs.existsSync(invoiceFreelanceDir)) fs.mkdirSync(invoiceFreelanceDir, { recursive: true });

// Load settings & templates on startup
loadSettings();
loadWaTemplates();

// Health check (no auth, no rate limit)
app.get('/api/health', (req, res) => {
  const db = getDb();
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// Root route → landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Static files for public pages & uploads
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(config.uploadPath));

// Disable caching for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Routes — freelance portal gets its own relaxed limiter and dedicated router
app.use('/api/public/freelance-portal', freelancePortalLimiter, freelancePortalRoutes);
app.use('/api/public', inquiryLimiter, publicRoutes);
app.use('/api/fg', fgRoutes);
app.use('/api/webhook', webhookRoutes);

// Admin routes (auth handled inside)
app.use('/api/admin', adminRoutes);

// Serve admin SPA
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Fallback for SPA routes
app.use('/admin', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../public/admin/index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
function start() {
  // Run migration
  migrate();

  const server = app.listen(config.port, () => {
    console.log(`Wisuda API running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Health: http://localhost:${config.port}/api/health`);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };