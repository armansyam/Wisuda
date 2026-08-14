const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../config/database');
const config = require('../config/settings');

const SALT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function generateToken(user, customExpiresIn) {
  let expiresIn = customExpiresIn || config.jwtExpiresIn || '1440m';
  try {
    const { getSetting } = require('../config/wa-templates');
    const timeoutMinutes = parseInt(getSetting('session_timeout_minutes', '1440'), 10);
    if (!isNaN(timeoutMinutes) && timeoutMinutes > 0 && !customExpiresIn) {
      expiresIn = `${timeoutMinutes}m`;
    }
  } catch (e) {}

  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn }
  );
}

function requireAuth(req, res, next) {
  const db = getDb();

  // 1. Check Bearer Token (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = db.prepare('SELECT id, username, name, role, active FROM users WHERE id = ? AND active = 1').get(decoded.id);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      return res.status(401).json({ error: 'Token expired or invalid', code: 'TOKEN_INVALID' });
    }
  }

  // 2. Check X-API-Key Header (Server-to-Server / Third party)
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const keyRecord = db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND active = 1').get(keyHash);
    if (keyRecord) {
      db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyRecord.id);
      req.user = { id: 0, username: keyRecord.name, name: keyRecord.name, role: 'admin', apiKey: keyRecord };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or inactive API Key', code: 'API_KEY_INVALID' });
  }

  // 3. Check Session Cookie (Web Client)
  if (req.session && req.session.userId) {
    const user = db.prepare('SELECT id, username, name, role, active FROM users WHERE id = ? AND active = 1').get(req.session.userId);
    if (user) {
      req.user = user;
      return next();
    }
    if (req.session.destroy) req.session.destroy();
    return res.status(401).json({ error: 'User not found or inactive', code: 'USER_INVALID' });
  }

  return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
    }
    next();
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function checkLockout(identifier) {
  const db = getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
  
  const attempts = db.prepare(
    'SELECT COUNT(*) as c FROM notifications WHERE user_type = ? AND user_id = ? AND type = ? AND sent_at > ?'
  ).get('login_attempt', identifier, 'failed_login', cutoff).c;
  
  if (attempts >= MAX_ATTEMPTS) {
    return { locked: true, remainingMinutes: LOCKOUT_MINUTES };
  }
  return { locked: false, attempts, maxAttempts: MAX_ATTEMPTS };
}

function recordLoginAttempt(identifier, success) {
  const db = getDb();
  db.prepare(
    'INSERT INTO notifications (user_type, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
  ).run('login_attempt', identifier, success ? 'successful_login' : 'failed_login', 
    success ? 'Login successful' : 'Login failed', 
    `${identifier} - ${success ? 'success' : 'failed'} at ${new Date().toISOString()}`
  );
}

module.exports = { requireAuth, requireRole, generateToken, hashPassword, verifyPassword, checkLockout, recordLoginAttempt };