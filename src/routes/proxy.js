const express = require('express');
const https = require('https');
const http = require('http');
const router = express.Router();

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
 * - Pure Zero-Disk In-Memory Streaming: Alirkan thumbnail langsung dari Google CDN Edge ke browser klien
 * - Cache dikelola 100% oleh Browser Klien via header Cache-Control (7 hari) dan Google CDN Edge
 * - Nol Byte disk storage / I/O di VPS
 */
router.get('/thumb/:fileId', async (req, res) => {
  const { fileId } = req.params;

  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return res.status(400).json({ error: 'File ID tidak valid' });
  }

  const sz = req.query.sz || 'w400';
  const isGrid = sz === 'w400';

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

      // Stream langsung in-memory ke browser klien dengan cache browser 7 hari
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', isGrid ? 'public, max-age=604800' : 'public, max-age=3600');
      res.setHeader('X-Cache', 'STREAM-CDN');
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
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', isGrid ? 'public, max-age=604800' : 'public, max-age=3600');
            res.setHeader('X-Cache', 'STREAM-SA');
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
