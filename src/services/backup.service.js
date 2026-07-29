const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');

const config = require('../config/settings');
const { getDb } = require('../config/database');

const DB_PATH = config.dbPath;
const BACKUP_DIR = config.backupPath;

async function backupDatabase() {
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFile = path.join(BACKUP_DIR, `wisuda_${dateStr}.db`);
  const backupGz = backupFile + '.gz';

  // 1. Native better-sqlite3 online backup (consistent WAL mode snapshot)
  const db = getDb();
  await db.backup(backupFile);

  // 2. Compress via native zlib stream
  const source = fs.createReadStream(backupFile);
  const destination = fs.createWriteStream(backupGz);
  const gzip = zlib.createGzip();
  await pipeline(source, gzip, destination);

  // Clean uncompressed temp file
  if (fs.existsSync(backupFile)) {
    fs.unlinkSync(backupFile);
  }

  // 3. Cleanup old backups (>30 days)
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

  const tempRestoredDb = path.join(BACKUP_DIR, 'temp_restore.db');

  if (backupFile.endsWith('.gz')) {
    const source = fs.createReadStream(fullPath);
    const destination = fs.createWriteStream(tempRestoredDb);
    const gunzip = zlib.createGunzip();
    await pipeline(source, gunzip, destination);
  } else {
    fs.copyFileSync(fullPath, tempRestoredDb);
  }

  // Copy to DB_PATH safely
  fs.copyFileSync(tempRestoredDb, DB_PATH);
  if (fs.existsSync(tempRestoredDb)) {
    fs.unlinkSync(tempRestoredDb);
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