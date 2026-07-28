const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// List all API Keys
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const keys = db.prepare('SELECT id, name, key_prefix, scopes, created_at, last_used_at, active FROM api_keys ORDER BY created_at DESC').all();
    res.json({ success: true, data: keys });
  } catch (err) {
    console.error('Error fetching API keys:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new API Key
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { name, scopes } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nama API Key wajib diisi' });
    }

    const rawKey = 'wsd_' + crypto.randomBytes(24).toString('hex');
    const keyPrefix = rawKey.substring(0, 8) + '...';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO api_keys (name, key_hash, key_prefix, scopes) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), keyHash, keyPrefix, scopes || 'read');

    res.status(201).json({
      success: true,
      message: 'API Key berhasil dibuat. Simpan key ini karena hanya ditampilkan sekali!',
      data: {
        id: result.lastInsertRowid,
        name: name.trim(),
        apiKey: rawKey,
        keyPrefix,
        scopes: scopes || 'read',
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke/Deactivate an API Key
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'API Key tidak ditemukan' });
    }
    res.json({ success: true, message: 'API Key berhasil dicabut' });
  } catch (err) {
    console.error('Error revoking API key:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
