const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const { getDb } = require('../config/database');

function getDriveApiKey() {
  try {
    const { getSetting } = require('../config/wa-templates');
    const dbKey = getSetting('google_drive_api_key', '');
    if (dbKey && dbKey.trim()) return dbKey.trim();
  } catch (e) {}
  return process.env.GOOGLE_DRIVE_API_KEY || '';
}

/**
 * Drive Importer Service
 * - scrapeAndStoreFileList: Zero-storage staging gallery — scrape Drive folder, store [{fileId, filename}] to DB only
 * - importPortfolioFromDrive: Download & Sharp-compress highlight photos for Portfolio showcase
 */
class DriveImporterService {
  constructor() {
    this.activeImports = new Map();
  }

  /**
   * Helper: Extract Google Drive folder ID from URL
   */
  extractFolderId(url) {
    if (!url) return null;
    const cleanUrl = url.trim();
    const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/i) || 
                        cleanUrl.match(/id=([a-zA-Z0-9_-]+)/i);
    const candidateId = folderMatch && folderMatch[1] ? folderMatch[1] : (/^[a-zA-Z0-9_-]+$/.test(cleanUrl) ? cleanUrl : null);
    return candidateId;
  }


  /**
   * Download a single URL to Buffer with 30s Socket Timeout (following redirects)
   */
  downloadBuffer(url, maxRedirects = 5, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
      
      const client = url.startsWith('https') ? https : http;
      let isSettled = false;

      const req = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http') 
            ? res.headers.location 
            : new URL(res.headers.location, url).href;
          return resolve(this.downloadBuffer(redirectUrl, maxRedirects - 1, timeoutMs));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP Status ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          if (!isSettled) {
            isSettled = true;
            resolve(Buffer.concat(chunks));
          }
        });
        res.on('error', err => {
          if (!isSettled) {
            isSettled = true;
            reject(err);
          }
        });
      });

      // Layer 2: Hard Network Socket Timeout (30s)
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Download timeout exceeded ${timeoutMs}ms`));
      });

      req.on('error', err => {
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      });
    });
  }

  /**
   * Parse files from Google Drive public folder page (preserving exact original filenames)
   */
  async scrapeDriveFolderFiles(folderId) {
    if (!folderId || folderId.length < 25) {
      throw new Error('Link Google Drive yang Anda masukkan tidak lengkap / terpotong (ID folder tidak valid). Silakan salin ulang seluruh URL folder dari Google Drive.');
    }

    const filesMap = new Map();
    let isPrivateFolder = false;
    let isNotFound = false;

    // Method 0: Official Google Drive Service Account Bot (Full Authorized Access)
    try {
      const { getDriveClient } = require('./drive-folder.service');
      const drive = getDriveClient();
      if (drive) {
        const apiRes = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          pageSize: 1000,
          fields: 'files(id,name,mimeType)',
        });
        if (apiRes.data && Array.isArray(apiRes.data.files)) {
          for (const f of apiRes.data.files) {
            if (f.id && f.name) {
              const isImgExt = /\.(jpg|jpeg|png|webp)$/i.test(f.name);
              const isImgMime = f.mimeType && f.mimeType.startsWith('image/');
              if (isImgExt || isImgMime) {
                const safeExtName = isImgExt ? f.name : `${f.name}.jpg`;
                filesMap.set(f.id, safeExtName);
              }
            }
          }
          if (filesMap.size > 0) {
            console.log(`[DriveImporter ServiceAccount] Successfully retrieved ${filesMap.size} files via Service Account Bot for folder ${folderId}`);
            return Array.from(filesMap.entries()).map(([id, name]) => ({
              id,
              name: name.replace(/[\/\\]/g, '_').trim()
            }));
          }
        }
      }
    } catch (saErr) {
      console.warn(`[DriveImporter ServiceAccount Warning] Could not list files via Service Account for folder ${folderId}:`, saErr.message);
    }

    // Method A: Official Google Drive v3 API if API Key is available
    const apiKey = getDriveApiKey();
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&pageSize=1000&fields=files(id,name,mimeType)&key=${apiKey}`;
        const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson && Array.isArray(apiJson.files)) {
            for (const f of apiJson.files) {
              if (f.id && f.name) {
                const isImgExt = /\.(jpg|jpeg|png|webp)$/i.test(f.name);
                const isImgMime = f.mimeType && f.mimeType.startsWith('image/');
                if (isImgExt || isImgMime) {
                  const safeExtName = isImgExt ? f.name : `${f.name}.jpg`;
                  filesMap.set(f.id, safeExtName);
                }
              }
            }
            if (filesMap.size > 0) {
              console.log(`[DriveImporter API] Successfully retrieved ${filesMap.size} files via Google Drive API for folder ${folderId}`);
              return Array.from(filesMap.entries()).map(([id, name]) => ({
                id,
                name: name.replace(/[\/\\]/g, '_').trim()
              }));
            }
          }
        } else if (apiRes.status === 404) {
          isNotFound = true;
        } else if (apiRes.status === 403) {
          isPrivateFolder = true;
        }
      } catch (apiErr) {
        console.warn(`[DriveImporter API Warning] API fetch failed for folder ${folderId}:`, apiErr.message);
      }
    }

    // Method B: HTML Scraping Fallback
    const urlsToFetch = [
      `https://drive.google.com/drive/folders/${folderId}`,
      `https://drive.google.com/drive/u/0/folders/${folderId}`
    ];

    for (const url of urlsToFetch) {
      try {
        const pageHtmlBuf = await this.downloadBuffer(url, 5, 15000);
        const html = pageHtmlBuf.toString('utf-8');

        if (html.includes('accounts.google.com/v3/signin') || html.includes('ServiceLogin')) {
          isPrivateFolder = true;
          continue;
        }

        // Pattern 1: ["ID", "FILENAME.JPG"]
        const regex1 = /\["([a-zA-Z0-9_-]{25,50})",\s*"([^"]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP))"/g;
        let m1;
        while ((m1 = regex1.exec(html)) !== null) {
          const id = m1[1];
          const name = m1[2];
          if (id && name && !filesMap.has(id)) {
            filesMap.set(id, name);
          }
        }

        // Pattern 2: ["FILENAME.JPG", ..., "ID"]
        const regex2 = /"([a-zA-Z0-9_-]{25,50})"[^\]]*?"([^"]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP))"/g;
        let m2;
        while ((m2 = regex2.exec(html)) !== null) {
          const id = m2[1];
          const name = m2[2];
          if (id && name && !filesMap.has(id)) {
            filesMap.set(id, name);
          }
        }

        // Pattern 3: Embedded view HTML elements
        const regex3 = /data-id="([a-zA-Z0-9_-]{25,50})"[^>]*?data-name="([^"]+)"/g;
        let m3;
        while ((m3 = regex3.exec(html)) !== null) {
          const id = m3[1];
          const name = m3[2];
          if (id && name && !filesMap.has(id)) {
            filesMap.set(id, name);
          }
        }

        // Pattern 4: General JSON pattern matching file names
        const regex4 = /"([a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP))"/g;
        let m4;
        while ((m4 = regex4.exec(html)) !== null) {
          const name = m4[1];
          if (name && !Array.from(filesMap.values()).includes(name)) {
            const subIndex = html.lastIndexOf('"', m4.index - 5);
            if (subIndex > 0) {
              const possibleIdMatch = html.substring(Math.max(0, m4.index - 200), m4.index).match(/"([a-zA-Z0-9_-]{25,50})"/);
              if (possibleIdMatch && possibleIdMatch[1] && !filesMap.has(possibleIdMatch[1])) {
                filesMap.set(possibleIdMatch[1], name);
              }
            }
          }
        }
      } catch (err) {
        if (err.message.includes('HTTP Status 404')) {
          isNotFound = true;
        } else if (err.message.includes('HTTP Status 403')) {
          isPrivateFolder = true;
        }
        console.error(`Scrape Drive folder error for ${url}:`, err.message);
      }
    }

    if (filesMap.size === 0) {
      if (isNotFound) {
        throw new Error('Folder Google Drive tidak ditemukan (HTTP 404). Silakan periksa kembali link folder yang Anda salin.');
      }
      if (isPrivateFolder) {
        throw new Error('Akses folder Google Drive masih PRIVAT / DIBATASI. Silakan buka folder di Google Drive, klik Bagikan (Share), lalu ubah akses menjadi "Siapa saja yang memiliki link dapat melihat" (Anyone with link can view).');
      }
      throw new Error('Folder Google Drive kosong atau tidak dapat diakses. Silakan periksa kembali tautan folder Google Drive Anda.');
    }

    return Array.from(filesMap.entries()).map(([id, name]) => {
      const safeName = name.replace(/[\/\\]/g, '_').trim();
      return { id, name: safeName };
    });
  }

  /**
   * Process and compress image buffer using sharp
   */
  async compressAndSaveImage(imageBuffer, targetPath) {
    try {
      await sharp(imageBuffer)
        .rotate()
        .resize({ width: 1000, withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toFile(targetPath);
      return true;
    } catch (err) {
      console.error('Sharp compression error, falling back to direct write:', err.message);
      fs.writeFileSync(targetPath, imageBuffer);
      return true;
    }
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Layer 3: Download a single image with Base Throttling (250ms) + Exponential Backoff Retry (1.5s -> 3.0s -> 6.0s)
   */
  async downloadBufferWithRetry(fileId, fileName, maxRetries = 3, initialDelay = 250) {
    if (initialDelay > 0) {
      await this.sleep(initialDelay);
    }

    let attempt = 0;
    const retryDelays = [1500, 3000, 6000];

    while (attempt < maxRetries) {
      attempt++;

      try {
        let buffer = null;

        // Method A: Direct Google Drive CDN URL
        try {
          const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
          buffer = await this.downloadBuffer(directUrl, 5, 30000);
        } catch (e1) {
          // Method B: Google Drive API alt=media fallback if API key available
          const apiKey = getDriveApiKey();
          if (apiKey) {
            try {
              const apiDlUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
              const imgRes = await fetch(apiDlUrl, { signal: AbortSignal.timeout(30000) });
              if (imgRes.ok) {
                buffer = Buffer.from(await imgRes.arrayBuffer());
              }
            } catch (e2) {}
          }
        }

        if (buffer && buffer.length >= 1000) {
          return buffer;
        }

        console.warn(`[DriveImporter Retry] Attempt ${attempt}/${maxRetries} invalid buffer for ${fileName} (${fileId}).`);
      } catch (err) {
        console.warn(`[DriveImporter Retry] Attempt ${attempt}/${maxRetries} failed for ${fileName}:`, err.message);
      }

      if (attempt < maxRetries) {
        const backoffMs = retryDelays[attempt - 1] || 6000;
        console.log(`[DriveImporter Backoff] Retrying ${fileName} in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    return null;
  }


  /**
   * Staging Gallery (Zero-Storage): Scrape Drive folder files and store list to DB only.
   * No download, no Sharp compression, no disk storage.
   * Gallery renders thumbnails directly from Google Drive thumbnail URLs.
   * Guard: deduplicates concurrent scrape for the same bookingId.
   */
  async scrapeAndStoreFileList(bookingId, driveUrl) {
    const jobKey = `scan_${bookingId}`;
    // Deduplication guard: return existing promise if already in progress
    if (this.activeImports.has(jobKey)) {
      console.log(`[DriveScraper] Scan for Booking #${bookingId} already in progress, skipping duplicate.`);
      return this.activeImports.get(jobKey);
    }

    const scanPromise = (async () => {
      try {
        const db = getDb();
        const folderId = this.extractFolderId(driveUrl);

        // Set status to scanning immediately
        db.prepare(`
          UPDATE bookings
          SET selection_status = 'scanning', staging_drive_url = ?, status = 'editing', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(driveUrl, bookingId);

        console.log(`[DriveScraper] Scanning folder for Booking #${bookingId}, Folder ID: ${folderId}`);

        let fileList = [];
        if (folderId) {
          fileList = await this.scrapeDriveFolderFiles(folderId);
        }

        const stagingFiles = fileList.map(f => ({
          fileId: f.id,
          filename: f.name
        }));

        console.log(`[DriveScraper] Found ${stagingFiles.length} files for Booking #${bookingId}`);

        db.prepare(`
          UPDATE bookings
          SET staging_files = ?, selection_status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          JSON.stringify(stagingFiles),
          stagingFiles.length > 0 ? 'ready' : 'failed',
          bookingId
        );

        return stagingFiles;
      } finally {
        this.activeImports.delete(jobKey);
      }
    })();

    this.activeImports.set(jobKey, scanPromise);
    return scanPromise;
  }

  /**
   * Ensure portfolio directory exists for booking with clean client_univ_year naming
   */
  getPortfolioDir(subFolderName) {
    const basePorto = path.join(__dirname, '../../DATA/uploads/portfolio');
    if (!fs.existsSync(basePorto)) {
      fs.mkdirSync(basePorto, { recursive: true });
    }
    const clientDir = path.join(basePorto, subFolderName);
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    return clientDir;
  }

  /**
   * Import highlight photos from Drive directly for Portfolio Showcase with Resiliency
   */
  async importPortfolioFromDrive(bookingId, driveUrl) {
    const jobKey = `portfolio_${bookingId}`;

    if (this.activeImports.has(jobKey)) {
      return this.activeImports.get(jobKey);
    }

    const portfolioPromise = (async () => {
      const db = getDb();
      let jobId = null;
      try {
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
        const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const clientName = sanitize(booking?.client_name || 'client');
        const university = sanitize(booking?.university || 'univ');
        const year = booking?.graduation_date ? new Date(booking.graduation_date).getFullYear() : new Date().getFullYear();
        const subFolderName = `${clientName}_${university}_${year}`;

        const portoDir = this.getPortfolioDir(subFolderName);
        const folderId = this.extractFolderId(driveUrl);

        console.log(`[DriveImporter] Starting Portfolio import for Booking #${bookingId} (${subFolderName}), Folder ID: ${folderId}`);

        const nameParts = (booking?.client_name || 'Client').trim().split(/\s+/);
        const initial = nameParts.map(p => p[0]?.toUpperCase() || '').join('').substring(0, 5) || 'CL';

        try {
          const insertJob = db.prepare(`
            INSERT INTO portfolio_import_jobs (client_initial, graduation_year, university, drive_url, status, total_photos, processed_photos)
            VALUES (?, ?, ?, ?, 'pending', 0, 0)
          `).run(initial, year, booking?.university || 'Universitas', driveUrl);
          jobId = insertJob.lastInsertRowid;
        } catch (dbErr) {
          console.warn('[DriveImporter DB Job Log Warn]:', dbErr.message);
        }

        let fileList = [];
        if (folderId) {
          fileList = await this.scrapeDriveFolderFiles(folderId);
        }

        console.log(`[DriveImporter] Found ${fileList.length} highlight files for Portfolio Booking #${bookingId}`);

        if (jobId) {
          db.prepare("UPDATE portfolio_import_jobs SET status = 'processing', total_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(fileList.length, jobId);
        }

        const downloadedRelUrls = [];

        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const targetFileName = file.name.replace(/[\/\\]/g, '_').trim();
          const targetPath = path.join(portoDir, targetFileName);

          // Resumable Check
          if (fs.existsSync(targetPath)) {
            try {
              if (fs.statSync(targetPath).size > 1000) {
                const relativeUrl = `/uploads/portfolio/${subFolderName}/${targetFileName}`;
                downloadedRelUrls.push(relativeUrl);
                if (jobId) {
                  db.prepare("UPDATE portfolio_import_jobs SET processed_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(i + 1, jobId);
                }
                continue;
              }
            } catch (e) {}
          }

          try {
            const imgBuffer = await this.downloadBufferWithRetry(file.id, file.name);
            if (imgBuffer && imgBuffer.length > 1000) {
              await this.compressAndSaveImage(imgBuffer, targetPath);
              const relativeUrl = `/uploads/portfolio/${subFolderName}/${targetFileName}`;
              downloadedRelUrls.push(relativeUrl);
            }
          } catch (err) {
            console.error(`[DriveImporter] Failed to download portfolio file ${file.name}:`, err.message);
          }

          if (jobId) {
            db.prepare("UPDATE portfolio_import_jobs SET processed_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(i + 1, jobId);
          }
        }

        if (downloadedRelUrls.length > 0) {
          const coverUrl = downloadedRelUrls[0];
          const highlightJson = JSON.stringify(downloadedRelUrls);

          const nameParts = (booking?.client_name || 'Client').trim().split(/\s+/);
          const initial = nameParts.map(p => p[0]?.toUpperCase() || '').join('').substring(0, 5) || 'CL';
          const fgAssignment = db.prepare('SELECT f.name FROM assignments a JOIN freelancers f ON a.fg_id = f.id WHERE a.booking_id = ?').get(bookingId);

          const existingPorto = db.prepare('SELECT id FROM portfolio_items WHERE booking_id = ?').get(bookingId);
          if (!existingPorto) {
            db.prepare(`
              INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, cover_photo_url, highlight_photos, fg_name, featured, published)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
            `).run(
              bookingId,
              initial,
              year,
              booking?.university || 'Universitas',
              coverUrl,
              highlightJson,
              fgAssignment?.name || null
            );
          } else {
            db.prepare(`
              UPDATE portfolio_items
              SET cover_photo_url = ?, highlight_photos = ?
              WHERE booking_id = ?
            `).run(
              coverUrl,
              highlightJson,
              bookingId
            );
          }
          console.log(`[DriveImporter] Successfully updated portfolio for Booking #${bookingId} with ${downloadedRelUrls.length} compressed local images.`);
        }

        if (jobId) {
          db.prepare("UPDATE portfolio_import_jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);
        }

        return downloadedRelUrls;
      } catch (err) {
        console.error(`[DriveImporter Portfolio Error for Booking #${bookingId}]:`, err.message);
        if (jobId) {
          db.prepare("UPDATE portfolio_import_jobs SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(err.message || 'Unknown error', jobId);
        }
        return [];
      } finally {
        this.activeImports.delete(jobKey);
      }
    })();

    this.activeImports.set(jobKey, portfolioPromise);
    return portfolioPromise;
  }

  /**
   * Auto-cleanup stale 'importing' bookings (older than 30 minutes)
   */
  cleanStaleImportingBookings() {
    try {
      const db = getDb();
      const result = db.prepare(`
        UPDATE bookings 
        SET selection_status = 'failed', updated_at = CURRENT_TIMESTAMP 
        WHERE selection_status = 'importing' 
          AND updated_at < datetime('now', '-30 minutes')
      `).run();

      if (result.changes > 0) {
        console.log(`[DriveImporter Cleanup] Reset ${result.changes} stale 'importing' bookings to 'failed'.`);
      }
    } catch (err) {
      console.error('[DriveImporter Cleanup Error]:', err.message);
    }
  }
}

module.exports = new DriveImporterService();
