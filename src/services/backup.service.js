/**
 * Wisuda Platform — Backup Service
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || '/DATA/AppData/wisuda.db';
const BACKUP_DIR = '/DATA/backups';

async function backupDatabase() {
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFile = path.join(BACKUP_DIR, `wisuda_${dateStr}.db`);
  const backupGz = backupFile + '.gz';

  // SQLite online backup (consistent)
  execSync(`sqlite3 "${DB_PATH}" ".backup '${backupFile}'"`, { stdio: 'pipe' });
  
  // Compress
  execSync(`gzip -f "${backupFile}"`, { stdio: 'pipe' });

  // Verify integrity
  const check = execSync(`sqlite3 "${backupGz}" "PRAGMA integrity_check;"`, { 
    encoding: 'utf8',
    stdio: 'pipe'
  }).trim();

  if (check !== 'ok') {
    throw new Error(`Backup integrity check failed: ${check}`);
  }

  // Cleanup old backups (>30 days)
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  for (const file of files) {
    if (file.startsWith('wisuda_') && file.endsWith('.db.gz')) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 30 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  }

  return backupGz;
}

async function restoreDatabase(backupFile) {
  const fullPath = path.join(BACKUP_DIR, backupFile);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Backup not found: ${fullPath}`);
  }

  // Stop PM2 processes first (caller should handle)
  // Restore
  if (backupFile.endsWith('.gz')) {
    execSync(`gunzip -c "${fullPath}" | sqlite3 "${DB_PATH}"`, { stdio: 'pipe' });
  } else {
    execSync(`sqlite3 "${DB_PATH}" ".restore '${fullPath}'"`, { stdio: 'pipe' });
  }

  // Verify
  const check = execSync(`sqlite3 "${DB_PATH}" "PRAGMA integrity_check;"`, { 
    encoding: 'utf8' 
  }).trim();

  if (check !== 'ok') {
    throw new Error(`Restored DB integrity check failed: ${check}`);
  }

  return true;
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('wisuda_') && f.endsWith('.db.gz'))
    .map(f => {
      const p = path.join(BACKUP_DIR, f);
      const s = fs.statSync(p);
      return { file: f, size: s.size, date: s.mtime };
    })
    .sort((a, b) => b.date - a.date);
}

module.exports = { backupDatabase, restoreDatabase, listBackups, BACKUP_DIR, DB_PATH };