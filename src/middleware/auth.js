const bcrypt = require('bcrypt');
const { getDb } = require('../config/database');

const SALT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }
  
  const db = getDb();
  const user = db.prepare('SELECT id, username, name, role, active FROM users WHERE id = ? AND active = 1').get(req.session.userId);
  
  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'User not found or inactive', code: 'USER_INVALID' });
  }
  
  req.user = user;
  next();
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

module.exports = { requireAuth, requireRole, hashPassword, verifyPassword, checkLockout, recordLoginAttempt };