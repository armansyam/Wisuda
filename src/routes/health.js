/**
 * Wisuda Platform — Health Check Route
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

router.get('/', (req, res) => {
  const checks = {
    db: false,
    wal_mode: false,
    fk_enabled: false,
    tables: false,
    disk_space: false
  };

  try {
    // DB connection
    checks.db = db.prepare('SELECT 1 as ok').get().ok === 1;
    
    // WAL mode
    checks.wal_mode = db.pragma('journal_mode') === 'wal';
    
    // Foreign keys enabled
    checks.fk_enabled = db.pragma('foreign_keys') === 1;
    
    // Minimum tables (13 expected)
    const tableCount = db.prepare("SELECT count(*) as cnt FROM sqlite_master WHERE type='table'").get().cnt;
    checks.tables = tableCount >= 13;
    
    // Disk space (>1GB free)
    const fs = require('fs');
    const path = require('path');
    const config = require('../config/settings');
    const targetDir = fs.existsSync('/DATA') ? '/DATA' : path.dirname(config.dbPath);
    const stats = fs.statfsSync(targetDir);
    const freeGB = (stats.bfree * stats.bsize) / (1024 ** 3);
    checks.disk_space = freeGB > 1;
  } catch (e) {
    console.error('[Health] Check failed:', e.message);
  }

  const healthy = Object.values(checks).every(v => v === true);
  res.status(healthy ? 200 : 503).json({
    healthy,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('../../package.json').version
  });
});

module.exports = router;