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
  return '';
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
   * Ambil daftar file dari folder Google Drive via Service Account (OAuth resmi).
   * Method A (API Key publik) & Method B (HTML Scraper) telah dinonaktifkan.
   */
  async scrapeDriveFolderFiles(folderId) {
    if (!folderId || folderId.length < 25) {
      throw new Error('Link Google Drive yang Anda masukkan tidak lengkap / terpotong (ID folder tidak valid). Silakan salin ulang seluruh URL folder dari Google Drive.');
    }

    // Murni menggunakan Service Account (OAuth resmi Google Drive API)
    const { getDriveClient } = require('./drive-folder.service');
    const drive = getDriveClient();

    if (!drive) {
      throw new Error(
        'Service Account Google Drive belum dikonfigurasi. ' +
        'Upload file service_account.json di Pengaturan → Drive terlebih dahulu.'
      );
    }

    const filesMap = new Map();
    let pageToken = undefined;

    try {
      do {
        const apiRes = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          pageSize: 1000,
          fields: 'nextPageToken, files(id, name, mimeType)',
          pageToken,
        });
        const files = apiRes.data?.files || [];
        for (const f of files) {
          if (!f.id || !f.name) continue;
          const isImgExt = /\.(jpg|jpeg|png|webp)$/i.test(f.name);
          const isImgMime = f.mimeType?.startsWith('image/');
          if (isImgExt || isImgMime) {
            const safeExtName = isImgExt ? f.name : `${f.name}.jpg`;
            filesMap.set(f.id, safeExtName.replace(/[\/\\]/g, '_').trim());
          }
        }
        pageToken = apiRes.data?.nextPageToken;
      } while (pageToken);
    } catch (err) {
      throw new Error(`Service Account gagal list file dari folder ${folderId}: ${err.message}`);
    }

    if (filesMap.size === 0) {
      throw new Error(
        'Folder Drive tidak mengandung file gambar (JPG/JPEG/PNG/WEBP). ' +
        'Pastikan file sudah di-upload ke folder staging dan Service Account sudah di-invite sebagai Viewer.'
      );
    }

    console.log(`[DriveImporter SA] Retrieved ${filesMap.size} files from folder ${folderId}`);
    return Array.from(filesMap.entries()).map(([id, name]) => ({ id, name }));
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
          SET selection_status = 'scanning', staging_drive_url = ?, status = 'post_production', updated_at = CURRENT_TIMESTAMP
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
          stagingFiles.length > 0 ? 'staged' : 'failed',
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
        const fullClientName = (booking?.client_name || 'Client').trim();
        const year = booking?.graduation_date ? new Date(booking.graduation_date).getFullYear() : new Date().getFullYear();
        const uni = booking?.university || 'Universitas';

        console.log(`[DriveImporter] Starting Portfolio Cloud-to-Cloud import for Booking #${bookingId} (${fullClientName}_${uni}_${year})`);

        try {
          const insertJob = db.prepare(`
            INSERT INTO portfolio_import_jobs (client_initial, graduation_year, university, drive_url, status, total_photos, processed_photos)
            VALUES (?, ?, ?, ?, 'pending', 0, 0)
          `).run(fullClientName, year, uni, driveUrl);
          jobId = insertJob.lastInsertRowid;
        } catch (dbErr) {
          console.warn('[DriveImporter DB Job Log Warn]:', dbErr.message);
        }

        const driveFolder = require('./drive-folder.service');
        const subfolderId = await driveFolder.createPortfolioItemSubfolder(fullClientName, uni, year);
        const cdnUrls = await driveFolder.copyDriveFilesCloudToCloud(driveUrl, subfolderId);

        console.log(`[DriveImporter] Cloud-to-cloud copied ${cdnUrls.length} highlight photos for Booking #${bookingId}`);

        if (jobId) {
          db.prepare("UPDATE portfolio_import_jobs SET status = 'processing', total_photos = ?, processed_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(cdnUrls.length, cdnUrls.length, jobId);
        }

        if (cdnUrls.length > 0) {
          const coverUrl = cdnUrls[0];
          const highlightJson = JSON.stringify(cdnUrls);
          const fgAssignment = db.prepare('SELECT f.name FROM assignments a JOIN freelancers f ON a.fg_id = f.id WHERE a.booking_id = ?').get(bookingId);
          const isApproved = booking?.portfolio_consent === 'approved';

          const existingPorto = db.prepare('SELECT id, published FROM portfolio_items WHERE booking_id = ?').get(bookingId);
          const publishedVal = isApproved ? 1 : (existingPorto ? existingPorto.published : 0);

          const clientRating = (booking?.status === 'completed' && booking?.rating) ? booking.rating : null;
          const clientFeedback = (booking?.status === 'completed' && booking?.feedback_notes) ? booking.feedback_notes : null;

          if (!existingPorto) {
            db.prepare(`
              INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published, rating, feedback_notes, drive_subfolder_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
            `).run(
              bookingId,
              fullClientName,
              year,
              uni,
              booking?.city || null,
              coverUrl,
              highlightJson,
              fgAssignment?.name || null,
              publishedVal,
              clientRating,
              clientFeedback,
              subfolderId || null
            );
          } else {
            db.prepare(`
              UPDATE portfolio_items
              SET client_initial = ?,
                  cover_photo_url = COALESCE(?, cover_photo_url),
                  highlight_photos = ?,
                  drive_subfolder_id = COALESCE(?, drive_subfolder_id),
                  rating = COALESCE(?, rating),
                  feedback_notes = COALESCE(?, feedback_notes),
                  updated_at = CURRENT_TIMESTAMP
              WHERE booking_id = ?
            `).run(
              fullClientName,
              coverUrl,
              highlightJson,
              subfolderId || null,
              clientRating,
              clientFeedback,
              bookingId
            );
          }
          console.log(`[DriveImporter] Successfully updated portfolio for Booking #${bookingId} with ${cdnUrls.length} Google Drive CDN images.`);
        }

        if (jobId) {
          db.prepare("UPDATE portfolio_import_jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);
        }

        return cdnUrls;
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
