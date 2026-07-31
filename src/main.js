const express = require('express');
const session = require('express-session');
const createBetterSqliteStore = require('./config/session-store');
const BetterSqliteStore = createBetterSqliteStore(session);
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const config = require('./config/settings');
const { getDb, migrate } = require('./config/database');
const { loadSettings, loadWaTemplates } = require('./config/wa-templates');
const authMiddleware = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const { setStaticCacheHeaders, cacheControlMiddleware } = require('./middleware/cacheControl');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const freelancePortalRoutes = require('./routes/freelance-portal');
const fgRoutes = require('./routes/fg');
const webhookRoutes = require('./routes/webhook');
const proxyRoutes = require('./routes/proxy');

const cors = require('cors');
const apiKeysRoutes = require('./routes/apiKeys');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// CORS Configuration for Multi-Client API access
app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      // 1. No origin (curl, same-server requests, mobile app)
      if (!origin) return callback(null, true);

      // 2. Wildcard or explicitly listed in CORS_ORIGINS
      if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 3. AUTO-ALLOW if origin host matches server Host or X-Forwarded-Host (Cloudflare Tunnel / Nginx / Reverse Proxy)
      try {
        const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
        if (hostHeader) {
          const primaryHost = hostHeader.split(',')[0].trim();
          const originHost = new URL(origin).host;
          // Match full host:port or hostname without port (e.g. wisuda.sorehari.my.id)
          if (originHost === primaryHost || originHost.split(':')[0] === primaryHost.split(':')[0]) {
            return callback(null, true);
          }
        }
      } catch (e) {}

      // 4. Auto-allow if origin matches seo_domain in DB
      try {
        const { getSetting } = require('./config/wa-templates');
        const seoDomain = getSetting('seo_domain', '');
        if (seoDomain) {
          const cleanSeoHost = seoDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const originHost = new URL(origin).host;
          if (originHost === cleanSeoHost) {
            return callback(null, true);
          }
        }
      } catch (e) {}

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
  })(req, res, next);
});

// Security headers (XSS, clickjacking, MIME sniffing, hide X-Powered-By)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Cloudflare CDN & Zero Trust Cache-Control Middleware
app.use(cacheControlMiddleware);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration using 100% native Better-Sqlite3 driver
app.use(session({
  store: new BetterSqliteStore(),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: config.sessionMaxAge,
    sameSite: 'lax',
  },
  name: 'wisuda.sid',
}));

// Dynamic session timeout based on admin settings
app.use((req, res, next) => {
  if (req.session) {
    try {
      const { getSetting } = require('./config/wa-templates');
      const timeoutMinutes = parseInt(getSetting('session_timeout_minutes', '1440'), 10);
      req.session.cookie.maxAge = timeoutMinutes * 60 * 1000;
    } catch (e) {}
  }
  next();
});

const isTestEnv = process.env.NODE_ENV === 'test';

// Global rate limiter (only applies to non-GET write requests, skips GETs, static assets, and admin routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { error: 'Terlalu banyak request, coba lagi nanti' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isTestEnv || req.method === 'GET' || req.path.startsWith('/admin') || req.path.startsWith('/api/admin') || req.path.match(/\.(html|css|js|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|ttf|map)$/i),
});
app.use(globalLimiter);

// File upload middleware for portfolio/branding
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit per file for high-res camera photos
  abortOnLimit: false,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../DATA/tmp')
}));

// Stricter rate limit for public inquiry (booking form)
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Terlalu banyak inquiry, coba lagi 15 menit' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

// Relaxed rate limit for freelance portal
const freelancePortalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Terlalu banyak request, coba lagi sebentar' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

// Strict rate limit for FG login (anti brute-force enumeration phone numbers)
const fgLoginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 5,
  message: { error: 'Terlalu banyak percobaan login FG, coba lagi 1 menit' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

// Ensure upload directories exist
const fs = require('fs');
const invoiceClientDir = path.join(config.uploadPath, 'invoices-client');
const invoiceFreelanceDir = path.join(config.uploadPath, 'invoices-freelance');

if (!fs.existsSync(invoiceClientDir)) fs.mkdirSync(invoiceClientDir, { recursive: true });
if (!fs.existsSync(invoiceFreelanceDir)) fs.mkdirSync(invoiceFreelanceDir, { recursive: true });

// Load settings & templates on startup
try {
  loadSettings();
  loadWaTemplates();
} catch (e) {
  console.warn('[Main] Startup settings load deferred until DB migration:', e.message);
}

// Root route → JSON info if requested as API or Accept: application/json, otherwise index.html
app.get('/', (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({
      name: 'Wisuda Headless API Engine',
      version: '1.3.0',
      status: 'online',
      documentation: '/docs',
      endpoints: {
        health: '/api/health',
        public: '/api/public',
        admin: '/api/admin',
        freelance: '/api/fg',
        webhooks: '/api/webhook'
      },
      timestamp: new Date().toISOString()
    });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Dedicated API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Wisuda Headless API Engine',
    version: '1.3.0',
    status: 'online',
    documentation: '/docs',
    endpoints: {
      health: '/api/health',
      public: '/api/public',
      admin: '/api/admin',
      freelance: '/api/fg',
      webhooks: '/api/webhook'
    },
    timestamp: new Date().toISOString()
  });
});

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

// Selection gallery route
app.get('/select-photos/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/select-photos.html'));
});

// Favicon routes
app.get('/favicon.png', (req, res) => {
  const customFavicon = path.join(__dirname, '../public/uploads/branding/favicon.png');
  if (fs.existsSync(customFavicon)) return res.sendFile(customFavicon);
  const fallback = path.join(__dirname, '../public/images/favicon.png');
  if (fs.existsSync(fallback)) return res.sendFile(fallback);
  res.status(404).end();
});

app.get('/favicon.ico', (req, res) => {
  const customFavicon = path.join(__dirname, '../public/uploads/branding/favicon.ico');
  if (fs.existsSync(customFavicon)) return res.sendFile(customFavicon);
  const fallback = path.join(__dirname, '../public/images/favicon.ico');
  if (fs.existsSync(fallback)) return res.sendFile(fallback);
  res.status(404).end();
});

// Dynamic PWA manifest routes
const { getSettings } = require('./config/wa-templates');
app.get('/manifest.json', (req, res) => {
  const settings = getSettings();
  const rawName = settings.company_name || settings.companyName || 'AmsDev';
  const cleanBrand = rawName.replace(/[\._\-]/g, ' ').trim();
  const appTitle = `${cleanBrand} Tracking`;

  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    name: appTitle,
    short_name: appTitle,
    description: `Aplikasi Lacak Status & Progres Real-time Foto Wisuda ${rawName}`,
    start_url: '/tracking.html',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF9F6',
    theme_color: '#1A1A2E',
    icons: [
      {
        src: settings.logo_url || '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
    ]
  });
});

app.get('/manifest-freelance.json', (req, res) => {
  const settings = getSettings();
  const rawName = settings.company_name || settings.companyName || 'AmsDev';
  const cleanBrand = rawName.replace(/[\._\-]/g, ' ').trim();
  const appTitle = `${cleanBrand} Freelance`;

  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    name: appTitle,
    short_name: 'Portal Freelance',
    description: `Portal Freelance Photographer ${rawName}`,
    start_url: '/freelance-portal.html',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF6F0',
    theme_color: '#111E35',
    icons: [
      {
        src: settings.logo_url || '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: settings.logo_url || '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  });
});

// Developer Watermark Control (Control via .env)
app.get('/js/watermark.js', (req, res, next) => {
  const showWatermark = process.env.SHOW_DEV_WATERMARK;
  const watermarkKey = process.env.DEV_WATERMARK_KEY;

  const isHidden = showWatermark === 'false' || 
                   (watermarkKey && (watermarkKey.toUpperCase() === 'AMS-HIDE' || watermarkKey.toUpperCase() === 'DISABLE'));

  if (isHidden) {
    return res.type('application/javascript').send('/* Developer Watermark Disabled via .env */');
  }
  next();
});

// Static files for public pages & assets
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: setStaticCacheHeaders
}));

// Dynamic static file serving for uploads (reads DB settings on the fly)
app.use('/uploads', (req, res, next) => {
  try {
    const { getSetting } = require('./config/wa-templates');
    const secondaryUploadPath = getSetting('upload_path_secondary', process.env.UPLOAD_PATH_SECONDARY || '');
    if (secondaryUploadPath && fs.existsSync(secondaryUploadPath)) {
      return express.static(secondaryUploadPath, { setHeaders: setStaticCacheHeaders })(req, res, next);
    }
  } catch (e) {}
  next();
});

app.use('/uploads', (req, res, next) => {
  try {
    const { getSettings } = require('./config/wa-templates');
    const settings = getSettings();
    const uploadDir = settings.uploadPath || settings.upload_path || config.uploadPath;
    if (uploadDir && fs.existsSync(uploadDir)) {
      return express.static(uploadDir, { setHeaders: setStaticCacheHeaders })(req, res, next);
    }
  } catch (e) {}
  return express.static(config.uploadPath, { setHeaders: setStaticCacheHeaders })(req, res, next);
});

// Drive thumbnail proxy
app.use('/api/proxy', proxyRoutes);

const selectionRoutes = require('./routes/selection');

const moodboardRoutes = require('./routes/moodboard');

// Routes
app.use('/api/public/freelance-portal', freelancePortalLimiter, freelancePortalRoutes);
app.use('/api/public/inquiry', inquiryLimiter);
app.use('/api/public/moodboard', moodboardRoutes);
app.use('/api/public', selectionRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/fg/login', fgLoginLimiter);
app.use('/api/fg', fgRoutes);
app.use('/api/webhook', webhookRoutes);

const directUploadRoutes = require('./routes/direct-upload');

// Admin routes
app.use('/api/v2/admin/uploads', directUploadRoutes);
app.use('/api/admin/uploads', directUploadRoutes);
app.use('/api/admin/api-keys', apiKeysRoutes);
app.use('/api/admin', selectionRoutes);
app.use('/api/admin', adminRoutes);

// Serve admin SPA & fallback (with no-cache headers for instant deploy updates)
app.use('/admin', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
}, express.static(path.join(__dirname, '../public/admin')));

app.use('/admin', (req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.sendFile(path.join(__dirname, '../public/admin/index.html'));
  }
  next();
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 Handler for API vs Web
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found', path: req.path });
  }
  res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
function start() {
  // Validate environment configuration first (Fail-Fast)
  config.validateEnvironment();

  // Run migration
  migrate();

  // Auto-clean any stale 'importing' bookings from previous server restarts
  try {
    const driveImporter = require('./services/drive-importer.service');
    driveImporter.cleanStaleImportingBookings();
  } catch (e) {
    console.error('Failed to run driveImporter stale cleanup:', e.message);
  }

  const server = app.listen(config.port, () => {
    console.log(`Wisuda API running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Upload Path: ${path.resolve(config.uploadPath)}`);
    console.log(`Health: http://localhost:${config.port}/api/health`);
  });

  // Graceful shutdown — pastikan SQLite WAL di-checkpoint dan koneksi ditutup
  const gracefulShutdown = (signal) => {
    console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Shutdown] HTTP server closed');
      try {
        const db = getDb();
        db.pragma('wal_checkpoint(TRUNCATE)');
        console.log('[Shutdown] SQLite WAL checkpoint completed');
        const { closeDb } = require('./config/database');
        closeDb();
        console.log('[Shutdown] Database connection closed');
      } catch (e) {
        console.error('[Shutdown] DB cleanup error:', e.message);
      }
      console.log('[Shutdown] Process exiting cleanly');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      console.error('[Shutdown] Forced exit after 10s timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };