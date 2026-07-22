const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const { getDb } = require('../config/database');

/**
 * Service to import, download and compress Google Drive folder photos for Staging Gallery
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
    // Matches /folders/ID or id=ID
    const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/i) || 
                        cleanUrl.match(/id=([a-zA-Z0-9_-]+)/i);
    if (folderMatch && folderMatch[1]) return folderMatch[1];
    
    // If exact ID was passed
    if (/^[a-zA-Z0-9_-]{20,}$/.test(cleanUrl)) return cleanUrl;
    return null;
  }

  /**
   * Ensure staging directory exists for booking
   */
  getStagingDir(bookingId) {
    const baseStaging = path.join(__dirname, '../../DATA/uploads/staging_uploads');
    if (!fs.existsSync(baseStaging)) {
      fs.mkdirSync(baseStaging, { recursive: true });
    }
    const clientDir = path.join(baseStaging, String(bookingId));
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    return clientDir;
  }

  /**
   * Download a single URL to Buffer (following redirects)
   */
  downloadBuffer(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
      
      const client = url.startsWith('https') ? https : http;
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
          return resolve(this.downloadBuffer(redirectUrl, maxRedirects - 1));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP Status ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', err => reject(err));
      });

      req.on('error', err => reject(err));
    });
  }

  /**
   * Parse files from Google Drive public folder page (preserving exact original filenames)
   */
  async scrapeDriveFolderFiles(folderId) {
    const filesMap = new Map();

    const urlsToFetch = [
      `https://drive.google.com/embeddedfolderview?id=${folderId}`,
      `https://drive.google.com/drive/folders/${folderId}`
    ];

    for (const url of urlsToFetch) {
      try {
        const pageHtmlBuf = await this.downloadBuffer(url);
        const html = pageHtmlBuf.toString('utf-8');

        // Pattern 1: ["ID", "FILENAME.JPG"] (standard Drive JS payload)
        const regex1 = /\["([a-zA-Z0-9_-]{25,50})",\s*"([^"]+\.(?:jpg|jpeg|png|webp|cr2|nef|arw|dng|JPG|JPEG|PNG|WEBP|CR2|NEF|ARW|DNG))"/g;
        let m1;
        while ((m1 = regex1.exec(html)) !== null) {
          const id = m1[1];
          const name = m1[2];
          if (id && name && !filesMap.has(id)) {
            filesMap.set(id, name);
          }
        }

        // Pattern 2: ["FILENAME.JPG", ..., "ID"] or [null, "FILENAME.JPG"]
        const regex2 = /"([a-zA-Z0-9_-]{25,50})"[^\]]*?"([^"]+\.(?:jpg|jpeg|png|webp|cr2|nef|arw|dng|JPG|JPEG|PNG|WEBP|CR2|NEF|ARW|DNG))"/g;
        let m2;
        while ((m2 = regex2.exec(html)) !== null) {
          const id = m2[1];
          const name = m2[2];
          if (id && name && !filesMap.has(id)) {
            filesMap.set(id, name);
          }
        }

        // Pattern 3: Embedded view HTML elements (data-id & data-name)
        const regex3 = /data-id="([a-zA-Z0-9_-]{25,50})"[^>]*?data-name="([^"]+)"/g;
        let m3;
        while ((m3 = regex3.exec(html)) !== null) {
          const id = m3[1];
          const name = m3[2];
          if (id && name && !filesMap.has(id)) {
            filesMap.set(id, name);
          }
        }

        // Pattern 4: General JSON pattern matching file names with extensions
        const regex4 = /"([a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP))"/g;
        let m4;
        while ((m4 = regex4.exec(html)) !== null) {
          const name = m4[1];
          // Try to associate with any unmapped file ID
          if (name && !Array.from(filesMap.values()).includes(name)) {
            // Find preceding file ID if available
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
        console.error(`Scrape Drive folder error for ${url}:`, err.message);
      }
    }

    return Array.from(filesMap.entries()).map(([id, name]) => {
      // Preserve exact original filename, only strip unsafe directory slashes
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
        .rotate() // auto rotate based on EXIF orientation
        .resize({ width: 1600, withoutEnlargement: true }) // max width 1600px
        .jpeg({ quality: 80, progressive: true })
        .toFile(targetPath);
      return true;
    } catch (err) {
      console.error('Sharp compression error, falling back to direct write:', err);
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
   * Download a single image with Automatic Retry and Dynamic Backoff Delay
   */
  async downloadBufferWithRetry(fileId, fileName, maxRetries = 3, initialDelay = 250) {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      // Dynamic backoff delay: 250ms -> 625ms -> 1560ms
      const delayMs = attempt === 1 ? initialDelay : Math.round(initialDelay * Math.pow(2.5, attempt - 1));
      await this.sleep(delayMs);

      try {
        let buffer = null;
        // Method A: Direct Google Drive CDN URL
        try {
          const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
          buffer = await this.downloadBuffer(directUrl);
        } catch (e1) {
          // Method B: Google Drive API alt=media fallback if API key available
          const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
          if (apiKey) {
            try {
              const apiDlUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
              const imgRes = await fetch(apiDlUrl);
              if (imgRes.ok) {
                buffer = Buffer.from(await imgRes.arrayBuffer());
              }
            } catch (e2) {}
          }
        }

        if (buffer && buffer.length >= 1000) {
          return buffer;
        }

        console.warn(`[DriveImporter Retry] Attempt ${attempt}/${maxRetries} invalid buffer for ${fileName} (${fileId}). Retrying with backoff delay...`);
      } catch (err) {
        console.warn(`[DriveImporter Retry] Attempt ${attempt}/${maxRetries} failed for ${fileName}:`, err.message);
      }
    }

    return null;
  }

  /**
   * Main import job runner (runs asynchronously in background)
   */
  async startImport(bookingId, driveUrl) {
    const db = getDb();
    const stagingDir = this.getStagingDir(bookingId);
    
    // Set selection_status = 'importing'
    db.prepare(`
      UPDATE bookings 
      SET selection_status = 'importing', staging_drive_url = ?, status = 'editing', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(driveUrl, bookingId);

    const folderId = this.extractFolderId(driveUrl);
    console.log(`[DriveImporter] Starting import for Booking #${bookingId}, Folder ID: ${folderId}`);

    let fileList = [];
    if (folderId) {
      fileList = await this.scrapeDriveFolderFiles(folderId);
    }

    console.log(`[DriveImporter] Found ${fileList.length} files to import for Booking #${bookingId}`);

    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const targetFileName = file.name.replace(/[\/\\]/g, '_').trim();
      const targetPath = path.join(stagingDir, targetFileName);

      try {
        const imgBuffer = await this.downloadBufferWithRetry(file.id, file.name);
        if (imgBuffer && imgBuffer.length > 1000) {
          await this.compressAndSaveImage(imgBuffer, targetPath);
          successCount++;
        }
      } catch (err) {
        console.error(`[DriveImporter] Failed to download file ${file.name} (${file.id}):`, err.message);
      }
    }

    // Update status to 'ready' once complete
    db.prepare(`
      UPDATE bookings 
      SET selection_status = 'ready', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(bookingId);

    console.log(`[DriveImporter] Finished import for Booking #${bookingId}. Imported ${successCount} files.`);
    return { successCount, totalCount: fileList.length };
  }

  /**
   * Ensure portfolio directory exists for booking
   */
  getPortfolioDir(bookingId) {
    const basePorto = path.join(__dirname, '../../DATA/uploads/portfolio');
    if (!fs.existsSync(basePorto)) {
      fs.mkdirSync(basePorto, { recursive: true });
    }
    const clientDir = path.join(basePorto, `booking_${bookingId}`);
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    return clientDir;
  }

  /**
   * Import highlight photos from Drive directly for Portfolio Showcase
   */
  async importPortfolioFromDrive(bookingId, driveUrl) {
    const db = getDb();
    const portoDir = this.getPortfolioDir(bookingId);
    const folderId = this.extractFolderId(driveUrl);

    console.log(`[DriveImporter] Starting Portfolio import for Booking #${bookingId}, Folder ID: ${folderId}`);

    let fileList = [];
    if (folderId) {
      fileList = await this.scrapeDriveFolderFiles(folderId);
    }

    console.log(`[DriveImporter] Found ${fileList.length} highlight files for Portfolio Booking #${bookingId}`);

    const downloadedRelUrls = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const targetFileName = file.name.replace(/[\/\\]/g, '_').trim();
      const targetPath = path.join(portoDir, targetFileName);

      try {
        const imgBuffer = await this.downloadBufferWithRetry(file.id, file.name);
        if (imgBuffer && imgBuffer.length > 1000) {
          await this.compressAndSaveImage(imgBuffer, targetPath);
          const relativeUrl = `/uploads/portfolio/booking_${bookingId}/${targetFileName}`;
          downloadedRelUrls.push(relativeUrl);
        }
      } catch (err) {
        console.error(`[DriveImporter] Failed to download portfolio file ${file.name}:`, err.message);
      }
    }

    if (downloadedRelUrls.length > 0) {
      const coverUrl = downloadedRelUrls[0];
      const highlightJson = JSON.stringify(downloadedRelUrls);

      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
      const nameParts = (booking?.client_name || 'Client').trim().split(/\s+/);
      const initial = nameParts.map(p => p[0]?.toUpperCase() || '').join('').substring(0, 5) || 'CL';
      const year = booking?.graduation_date ? new Date(booking.graduation_date).getFullYear() : new Date().getFullYear();
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

    return downloadedRelUrls;
  }
}

module.exports = new DriveImporterService();
