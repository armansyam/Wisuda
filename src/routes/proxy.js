const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const config = require('../config/settings');
const { getSetting } = require('../config/wa-templates');

function getCacheDir() {
  const activeUpload = getSetting('upload_path', config.uploadPath);
  const cacheDir = path.join(activeUpload, 'gallery_cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

/**
 * Fetch URL ke Buffer dengan redirect following + timeout
 */
function fetchBuffer(url, maxRedirects = 5, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    let settled = false;

    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Referer': 'https://drive.google.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(fetchBuffer(next, maxRedirects - 1, timeoutMs));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => { if (!settled) { settled = true; resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }); } });
      res.on('error', e => { if (!settled) { settled = true; reject(e); } });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timeout')));
    req.on('error', e => { if (!settled) { settled = true; reject(e); } });
  });
}

/**
 * GET /api/proxy/thumb/:fileId
 * - ?sz=w400 (default, grid) | sz=w800 (popup lightbox)
 * - Grid cache: disimpan ke disk (7 hari) → reliable, tidak bergantung CDN Google
 * - Popup (w800): fetch langsung tanpa disk cache — on-demand saja
 */
router.get('/thumb/:fileId', async (req, res) => {
  const { fileId } = req.params;

  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return res.status(400).json({ error: 'File ID tidak valid' });
  }

  const sz = req.query.sz || 'w400';
  const isGrid = sz === 'w400';

  // ── Cek disk cache (hanya untuk grid w400) ──
  if (isGrid) {
    const cachePath = path.join(getCacheDir(), `${fileId}.jpg`);
    if (fs.existsSync(cachePath)) {
      try {
        const stat = fs.statSync(cachePath);
        // Cache valid jika file > 1KB dan tidak lebih dari 7 hari
        const ageMs = Date.now() - stat.mtimeMs;
        if (stat.size > 1024 && ageMs < 7 * 24 * 60 * 60 * 1000) {
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 hari
          res.setHeader('X-Cache', 'HIT');
          return res.sendFile(cachePath);
        }
      } catch (e) {}
    }
  }

  // ── Fetch dari Google CDN ──
  const primaryUrl = `https://lh3.googleusercontent.com/d/${fileId}=${sz}`;
  const fallbackUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=${sz}`;

  async function tryFetch(url, isFallback = false) {
    try {
      const { buffer, contentType } = await fetchBuffer(url);

      if (!contentType.startsWith('image/')) {
        if (!isFallback) return tryFetch(fallbackUrl, true);
        return res.status(502).send('Bukan file gambar');
      }

      if (buffer.length < 1024) {
        if (!isFallback) return tryFetch(fallbackUrl, true);
        return res.status(502).send('File terlalu kecil / tidak valid');
      }

      // Simpan ke disk cache (hanya untuk grid w400)
      if (isGrid) {
        const cachePath = path.join(getCacheDir(), `${fileId}.jpg`);
        fs.writeFile(cachePath, buffer, () => {}); // async, tidak blocking response
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', isGrid ? 'public, max-age=604800' : 'public, max-age=3600');
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Proxy-Source', isFallback ? 'drive-thumbnail' : 'lh3-cdn');
      return res.send(buffer);

    } catch (err) {
      if (!isFallback) return tryFetch(fallbackUrl, true);

      // Fallback 3: Fetch directly via Service Account Bot if public CDN fetch failed
      try {
        const { getDriveClient } = require('../services/drive-folder.service');
        const drive = getDriveClient();
        if (drive) {
          const driveRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
          if (driveRes.data) {
            const buffer = Buffer.from(driveRes.data);
            if (isGrid) {
              const cachePath = path.join(getCacheDir(), `${fileId}.jpg`);
              fs.writeFile(cachePath, buffer, () => {});
            }
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', isGrid ? 'public, max-age=604800' : 'public, max-age=3600');
            res.setHeader('X-Cache', 'MISS-SA');
            return res.send(buffer);
          }
        }
      } catch (saErr) {
        console.error(`[ThumbProxy SA] Failed for fileId=${fileId}:`, saErr.message);
      }

      console.error(`[ThumbProxy] Failed for fileId=${fileId}:`, err.message);
      if (!res.headersSent) res.status(502).send('Gagal mengambil gambar dari Google Drive');
    }
  }

  tryFetch(primaryUrl);
});

module.exports = router;
