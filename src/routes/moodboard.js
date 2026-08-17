const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const { getDb } = require('../config/database');
const config = require('../config/settings');

const router = express.Router();

// Helper untuk mencari booking berdasarkan tracking_token saja
// SEC-07 fix: Hapus fallback ke integer ID — mencegah IDOR via enumerasi booking ID
function findBooking(tokenOrId) {
  const db = getDb();
  // Hanya cari via tracking_token (string format TRK-xxx-xxx)
  // Integer ID tidak lagi diterima sebagai auth untuk endpoint publik moodboard
  const booking = db.prepare('SELECT * FROM bookings WHERE tracking_token = ?').get(tokenOrId);
  return booking || null;
}

// Zero-Local Storage Architecture: Moodboard files are stored directly in Google Drive
function getMoodboardDir(bookingId) {
  return null;
}

// Helper fetch image buffer & convert to JPEG for PDFKit compatibility (handles WebP/PNG/JPG)
async function fetchImageBuffer(imageUrl, publicDir) {
  if (!imageUrl) return null;

  try {
    let rawBuffer = null;

    // Case 1: Local file
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      const cleanPath = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
      const localPath = path.join(publicDir, cleanPath);
      if (fs.existsSync(localPath)) {
        rawBuffer = fs.readFileSync(localPath);
      } else {
        const { getSetting } = require('../config/wa-templates');
        const activeUpload = getSetting('upload_path', config.uploadPath);
        const altPath = path.join(activeUpload, cleanPath.replace('/uploads/', ''));
        if (fs.existsSync(altPath)) {
          rawBuffer = fs.readFileSync(altPath);
        }
      }
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Case 2: Remote URL with redirect following (e.g. Google CDN)
      function fetchBufferWithRedirect(url, maxRedirects = 5, timeoutMs = 7000) {
        return new Promise((resolve) => {
          if (maxRedirects <= 0) return resolve(null);
          const client = url.startsWith('https://') ? https : http;
          const req = client.get(url, {
            timeout: timeoutMs,
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
              return resolve(fetchBufferWithRedirect(next, maxRedirects - 1, timeoutMs));
            }
            if (res.statusCode !== 200) return resolve(null);
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', () => resolve(null));
          });
          req.on('error', () => resolve(null));
          req.on('timeout', () => { req.destroy(); resolve(null); });
        });
      }

      rawBuffer = await fetchBufferWithRedirect(imageUrl);
    }

    if (!rawBuffer || rawBuffer.length === 0) return null;

    // Convert raw image to optimized JPEG buffer (450px) for fast PDF rendering & smaller file size
    const jpegBuffer = await sharp(rawBuffer)
      .resize(450, 450, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer();

    return jpegBuffer;
  } catch (e) {
    console.warn('[Moodboard fetchImageBuffer Error]:', e.message);
    return null;
  }
}

// Default Moodboard Categories Fallback
const DEFAULT_MOODBOARD_CATEGORIES = [
  { id: 'general', label: 'Inspirasi Pose (General)' },
  { id: 'solo', label: 'Beauty / Solo (Portret Toga)' },
  { id: 'family', label: 'Foto Keluarga' },
  { id: 'couple', label: 'Foto Couple / Pasangan' },
  { id: 'group', label: 'Foto Grup / Sahabat' }
];

function getMoodboardCategories(db) {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'moodboard_categories'").get();
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[getMoodboardCategories Error]:', e.message);
  }
  return DEFAULT_MOODBOARD_CATEGORIES;
}

// ============ 1. GET MOODBOARD & PORTFOLIO ITEMS ============
router.get('/:tokenOrId', (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const db = getDb();
    const categories = getMoodboardCategories(db);
    
    let moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);
    let items = [];
    if (moodboard && moodboard.items) {
      try { items = JSON.parse(moodboard.items); } catch (e) { items = []; }
    }

    let categoryNotes = {};
    if (moodboard && moodboard.category_notes) {
      try { categoryNotes = JSON.parse(moodboard.category_notes); } catch (e) { categoryNotes = {}; }
    }

    const portfolioRows = db.prepare(`
      SELECT id, booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos
      FROM portfolio_items
      WHERE published = 1
      ORDER BY featured DESC, created_at DESC
      LIMIT 30
    `).all();

    const portfolioItems = portfolioRows.map(p => {
      let highlights = [];
      try { highlights = JSON.parse(p.highlight_photos); } catch (e) { highlights = []; }
      return {
        id: p.id,
        title: `${p.university || 'Wisuda'} (${p.graduation_year || ''})`,
        client_initial: p.client_initial,
        cover_photo_url: p.cover_photo_url,
        photos: highlights.length > 0 ? highlights : (p.cover_photo_url ? [p.cover_photo_url] : [])
      };
    });

    res.json({
      booking: {
        id: booking.id,
        client_name: booking.client_name,
        graduation_date: booking.graduation_date,
        status: booking.status,
        university: booking.university
      },
      booking_id: booking.id,
      client_name: booking.client_name,
      graduation_date: booking.graduation_date,
      status: booking.status,
      university: booking.university,
      moodboard_exists: items.length > 0,
      categories,
      items,
      category_notes: categoryNotes,
      portfolio: portfolioItems,
      portfolio_catalog: portfolioItems
    });
  } catch (err) {
    console.error('[Moodboard GET Error]:', err);
    res.status(500).json({ error: 'Gagal mengambil data moodboard' });
  }
});

// ============ 1b. POST UPDATE CATEGORY BRIEFING NOTE ============
router.post('/:tokenOrId/category-note', async (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const { category, note } = req.body;
    const catKey = (category || 'general').toLowerCase().trim();

    const db = getDb();
    let moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);

    let categoryNotes = {};
    if (moodboard && moodboard.category_notes) {
      try { categoryNotes = JSON.parse(moodboard.category_notes); } catch (e) { categoryNotes = {}; }
    }

    categoryNotes[catKey] = (note || '').trim();

    if (moodboard) {
      db.prepare(`
        UPDATE booking_moodboards
        SET category_notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ?
      `).run(JSON.stringify(categoryNotes), booking.id);
    } else {
      db.prepare(`
        INSERT INTO booking_moodboards (booking_id, items, category_notes)
        VALUES (?, '[]', ?)
      `).run(booking.id, JSON.stringify(categoryNotes));
    }

    res.json({ message: 'Catatan briefing kategori berhasil disimpan', category_notes: categoryNotes });
  } catch (err) {
    console.error('[Moodboard Category Note Error]:', err);
    res.status(500).json({ error: 'Gagal menyimpan catatan kategori: ' + err.message });
  }
});

// ============ 1c. PATCH UPDATE SPECIFIC PHOTO NOTE ============
router.patch('/:tokenOrId/item/:itemId', async (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const { note } = req.body;
    const db = getDb();
    let moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);
    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard kosong' });
    }

    let items = [];
    try { items = JSON.parse(moodboard.items); } catch (e) { items = []; }

    const targetItem = items.find(i => i.id === req.params.itemId);
    if (!targetItem) {
      return res.status(404).json({ error: 'Item referensi tidak ditemukan' });
    }

    targetItem.note = (note || '').trim();

    db.prepare(`
      UPDATE booking_moodboards
      SET items = ?, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
    `).run(JSON.stringify(items), booking.id);

    res.json({ message: 'Catatan foto berhasil diperbarui', item: targetItem, items: items });
  } catch (err) {
    console.error('[Moodboard Item Note Error]:', err);
    res.status(500).json({ error: 'Gagal memperbarui catatan foto: ' + err.message });
  }
});

// ============ 2. POST ADD ITEM TO MOODBOARD ============
router.post('/:tokenOrId', async (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const db = getDb();
    let moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);
    let currentItems = [];
    if (moodboard && moodboard.items) {
      try { currentItems = JSON.parse(moodboard.items); } catch (e) { currentItems = []; }
    }

    const source = req.body.source || 'upload';
    const category = req.body.category || 'general';
    const note = (req.body.note || '').trim().slice(0, 100);
    const itemId = 'mb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const addedItems = [];
    const driveFolder = require('../services/drive-folder.service');

    // Auto-resolve moodboard folder in Google Drive if not yet mapped in database
    if (!booking.moodboard_drive_url && booking.drive_parent_url) {
      try {
        const resolvedUrl = await driveFolder.ensureMoodboardFolder(booking);
        if (resolvedUrl) {
          booking.moodboard_drive_url = resolvedUrl;
        }
      } catch (e) {
        console.warn('[Moodboard ensureMoodboardFolder Warn]:', e.message);
      }
    }

    if (source === 'portfolio') {
      const portfolioUrl = req.body.portfolio_url || req.body.photo_url;
      if (!portfolioUrl) {
        return res.status(400).json({ error: 'Foto portofolio tidak valid' });
      }

      // Backend Deduplication: Cegah entri duplikat untuk kombinasi URL + KATEGORI yang SAMA
      const cleanTarget = String(portfolioUrl).trim().replace(/=[sw]\d+.*$/, '');
      const existing = currentItems.find(i => {
        if (!i.url) return false;
        const cleanUrl = String(i.url).trim().replace(/=[sw]\d+.*$/, '');
        // Foto yang sama BOLEH dipilih untuk kategori berbeda; duplikat hanya jika URL & kategori identik
        return cleanUrl === cleanTarget && (i.category || 'general') === category;
      });

      if (existing) {
        return res.status(200).json({
          message: 'Foto referensi sudah ada di kategori ini',
          item: existing,
          total_items: currentItems.length
        });
      }

      const albumTitle = (req.body.album_title || '').trim().slice(0, 100);

      // Read-only pointer: Tidak menyalin file ke Google Drive demi keamanan master portofolio
      const newItem = {
        id: itemId,
        source: source,
        url: portfolioUrl,
        category: category,
        note: note,
        album_title: albumTitle,
        created_at: new Date().toISOString()
      };
      currentItems.push(newItem);
      addedItems.push(newItem);
    } else {
      if (!req.files || !req.files.photo) {
        return res.status(400).json({ error: 'File foto tidak ditemukan' });
      }

      const photoFiles = Array.isArray(req.files.photo) ? req.files.photo : [req.files.photo];
      const targetFolderId = booking.moodboard_drive_url ? driveFolder.extractFolderIdFromUrl(booking.moodboard_drive_url) : null;

      if (!targetFolderId) {
        return res.status(400).json({
          error: 'Folder Google Drive Moodboard belum tersedia untuk booking ini. Pastikan DP telah diverifikasi dan Akun Google Studio telah ditautkan di Admin Panel.'
        });
      }

      for (let i = 0; i < photoFiles.length; i++) {
        const photoFile = photoFiles[i];
        const subItemId = 'mb_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4);
        const rawBuffer = (photoFile.data && photoFile.data.length > 0)
          ? photoFile.data
          : (photoFile.tempFilePath && fs.existsSync(photoFile.tempFilePath) ? fs.readFileSync(photoFile.tempFilePath) : null);

        if (!rawBuffer || rawBuffer.length === 0) continue;

        // Auto-compress and convert to optimized WebP (max 1600px, quality 82) for high performance & minimal bandwidth
        let processedBuffer = rawBuffer;
        let mimeType = 'image/webp';
        let filename = `${subItemId}.webp`;

        try {
          processedBuffer = await sharp(rawBuffer)
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82, effort: 4 })
            .toBuffer();
        } catch (sharpErr) {
          console.warn('[Moodboard Sharp WebP Compression Warn]:', sharpErr.message);
          processedBuffer = rawBuffer;
          mimeType = photoFile.mimetype || 'image/jpeg';
          filename = `${subItemId}.jpg`;
        }

        // Direct Stream Upload to Client's Google Drive Moodboard Folder (Zero VPS Disk Transit)
        const finalPhotoUrl = await driveFolder.uploadPortfolioPhotoToDrive(filename, mimeType, processedBuffer, targetFolderId);

        const newItem = {
          id: subItemId,
          source: source,
          url: finalPhotoUrl,
          category: category,
          note: note,
          created_at: new Date().toISOString()
        };
        currentItems.push(newItem);
        addedItems.push(newItem);
      }
    }

    if (moodboard) {
      db.prepare(`
        UPDATE booking_moodboards
        SET items = ?, updated_at = CURRENT_TIMESTAMP, cleaned_up = 0
        WHERE booking_id = ?
      `).run(JSON.stringify(currentItems), booking.id);
    } else {
      db.prepare(`
        INSERT INTO booking_moodboards (booking_id, items)
        VALUES (?, ?)
      `).run(booking.id, JSON.stringify(currentItems));
    }

    res.status(201).json({
      message: 'Referensi berhasil ditambahkan',
      item: addedItems[0],
      items: addedItems,
      total_items: currentItems.length
    });
  } catch (err) {
    console.error('[Moodboard POST Error]:', err);
    res.status(500).json({ error: 'Gagal menambahkan referensi: ' + err.message });
  }
});

// ============ 3. DELETE ITEM FROM MOODBOARD ============
router.delete('/:tokenOrId/item/:itemId', async (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const db = getDb();
    let moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);
    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard kosong' });
    }

    let items = [];
    try { items = JSON.parse(moodboard.items); } catch (e) { items = []; }

    const targetItem = items.find(i => i.id === req.params.itemId);
    if (!targetItem) {
      return res.status(404).json({ error: 'Item referensi tidak ditemukan' });
    }

    const updatedItems = items.filter(i => i.id !== req.params.itemId);

    // Delete physically ONLY if it was an uploaded file (protect portfolio master files)
    if (targetItem.source === 'upload' && targetItem.url) {
      try {
        const driveFolder = require('../services/drive-folder.service');
        if (targetItem.url.includes('google') || targetItem.url.includes('/d/')) {
          await driveFolder.deleteDriveFile(targetItem.url);
        } else {
          const publicDir = path.join(__dirname, '../../public');
          const localFilePath = path.join(publicDir, targetItem.url);
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        }
      } catch (e) {
        console.warn('[Moodboard File Delete Warning]:', e.message);
      }
    }

    db.prepare(`
      UPDATE booking_moodboards
      SET items = ?, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
    `).run(JSON.stringify(updatedItems), booking.id);

    res.json({ message: 'Referensi berhasil dihapus', total_items: updatedItems.length });
  } catch (err) {
    console.error('[Moodboard DELETE Error]:', err);
    res.status(500).json({ error: 'Gagal menghapus referensi' });
  }
});

// ============ 4. GET INLINE PDF BRIEFING SHEET (A4 LANDSCAPE 4-COLUMN WIDESCREEN GRID) ============
router.get('/:tokenOrId/pdf', async (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).send('Pesanan tidak ditemukan');
    }

    const db = getDb();
    const moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);
    let items = [];
    if (moodboard && moodboard.items) {
      try { items = JSON.parse(moodboard.items); } catch (e) { items = []; }
    }

    let categoryNotes = {};
    if (moodboard && moodboard.category_notes) {
      try { categoryNotes = JSON.parse(moodboard.category_notes); } catch (e) { categoryNotes = {}; }
    }

    // Pre-fetch image buffers & convert to JPEG for 100% PDFKit compatibility
    const publicDir = path.join(__dirname, '../../public');
    const itemsWithBuffers = await Promise.all(items.map(async (item) => {
      const buffer = await fetchImageBuffer(item.url, publicDir);
      return { ...item, buffer };
    }));

    // Group items by category order
    const categories = getMoodboardCategories(db);
    const categoryOrder = categories.map(c => c.id);
    const CATEGORY_LABELS = {};
    categories.forEach(c => {
      CATEGORY_LABELS[c.id] = c.label.toUpperCase();
    });

    const groupedItems = {};
    categoryOrder.forEach(cat => { groupedItems[cat] = []; });
    itemsWithBuffers.forEach(item => {
      const cat = (item.category || categoryOrder[0] || 'general').toLowerCase();
      if (!groupedItems[cat]) groupedItems[cat] = [];
      groupedItems[cat].push(item);
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Moodboard-Order-${booking.id}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=60');

    // A4 Landscape orientation (Width: 841.89 pt, Height: 595.28 pt)
    const doc = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    // Helper: Draw Landscape Top Header (Width 841.89 pt)
    function drawHeader(docPage) {
      docPage.rect(0, 0, 841.89, 42).fill('#111E35');
      docPage.font('Helvetica-Bold').fillColor('#FFFFFF').fontSize(13).text('MOODBOARD & BRIEFING POSE FOTO WISUDA', 30, 14);
      docPage.font('Helvetica-Bold').fillColor('#D4AF37').fontSize(10).text(`ORDER #${booking.id}`, 700, 16, { align: 'right' });
      docPage.rect(0, 42, 841.89, 3).fill('#C59B63');
    }

    drawHeader(doc);

    // Landscape Client Info Bar (Width 782pt)
    let boxY = 52;
    doc.rect(30, boxY, 782, 22).fillAndStroke('#FAF9F6', '#C59B63');
    
    doc.font('Helvetica-Bold').fillColor('#111E35').fontSize(8.5)
       .text(`Client: ${booking.client_name || '-'}`, 42, boxY + 6)
       .text(`Univ: ${booking.university || '-'}`, 300, boxY + 6)
       .text(`Tanggal: ${booking.graduation_date || '-'}`, 600, boxY + 6);

    // Prominent Notice Banner (Width 782pt)
    let noticeY = boxY + 26;
    doc.rect(30, noticeY, 782, 22).fillAndStroke('#FFFDF5', '#FCD34D');
    doc.font('Helvetica-Bold').fillColor('#92400E').fontSize(7.5)
       .text('PANDUAN & PENYATUAN PERSPEKTIF: Moodboard ini berfungsi sebagai panduan utama penyatuan perspektif gaya & pose antara klien dan fotografer. Hasil akhir pemotretan diadaptasikan secara profesional dengan kondisi lokasi, pencahayaan, dan situasi lapangan.', 38, noticeY + 6, { width: 766 });

    let currentY = noticeY + 28;

    if (itemsWithBuffers.length === 0) {
      doc.font('Helvetica').fillColor('#6B7280').fontSize(10).text('Tidak ada referensi moodboard khusus dari klien (Sesi Pemotretan Gaya Bebas Studio)', 30, currentY + 30, { align: 'center', width: 782 });
    } else {
      // 4-Column Widescreen Landscape Grid
      // Col 0: x=30, Col 1: x=226, Col 2: x=422, Col 3: x=618 (Card width = 184, gap = 12)
      for (const catKey of categoryOrder) {
        const catItems = groupedItems[catKey];
        if (!catItems || catItems.length === 0) continue;

        // Check if we need new page for category header
        if (currentY > 520) {
          doc.addPage();
          drawHeader(doc);
          currentY = 52;
        }

        // Clean Category Header Banner
        const catTitle = CATEGORY_LABELS[catKey] || `POSE ${catKey.toUpperCase()}`;
        doc.rect(30, currentY, 782, 18).fill('#111E35');
        doc.font('Helvetica-Bold').fillColor('#D4AF37').fontSize(8.5).text(`[ ${catTitle} ]  -  ${catItems.length} FOTO`, 40, currentY + 5);
        currentY += 21;

        // Category Briefing Note in PDF if present
        if (categoryNotes[catKey]) {
          doc.rect(30, currentY, 782, 16).fillAndStroke('#FFFDF5', '#FCD34D');
          doc.font('Helvetica-Oblique').fillColor('#92400E').fontSize(7.5).text(`Briefing Kategori: "${categoryNotes[catKey]}"`, 40, currentY + 4, { width: 760, ellipsis: true });
          currentY += 19;
        }

        let col = 0;
        for (let i = 0; i < catItems.length; i++) {
          const item = catItems[i];
          const x = 30 + col * 196; // 4 columns: 30, 226, 422, 618

          const hasNote = Boolean(item.note);
          const cardHeight = hasNote ? 165 : 145;

          if (currentY + cardHeight > 545) {
            doc.addPage();
            drawHeader(doc);
            currentY = 52;
            col = 0;

            doc.rect(30, currentY, 782, 18).fill('#111E35');
            doc.fillColor('#D4AF37').fontSize(8.5).text(`[ ${catTitle} ]  -  LANJUTAN`, 40, currentY + 5, { bold: true });
            currentY += 23;
          }

          // Card Outer Frame (Width 185, Height 140)
          doc.rect(x, currentY, 185, 140).fillAndStroke('#FFFFFF', '#E5E0D8');

          // Embed Image
          if (item.buffer) {
            try {
              doc.image(item.buffer, x + 4, currentY + 4, { fit: [177, 132], align: 'center', valign: 'center' });
            } catch (e) {
              doc.fillColor('#9CA3AF').fontSize(8).text('Foto Referensi', x + 10, currentY + 60, { align: 'center', width: 165 });
            }
          } else {
            doc.fillColor('#9CA3AF').fontSize(8).text('Foto Referensi', x + 10, currentY + 60, { align: 'center', width: 165 });
          }

          // Micro Note footer ONLY IF NOTE EXISTS
          if (hasNote) {
            doc.rect(x, currentY + 140, 185, 20).fill('#FFFDF5');
            doc.rect(x, currentY + 140, 185, 20).stroke('#E5E0D8');
            doc.fillColor('#374151').fontSize(7.5).text(`"${item.note}"`, x + 5, currentY + 144, { width: 175, height: 14, ellipsis: true });
          }

          col++;
          if (col >= 4) {
            col = 0;
            currentY += (hasNote ? 168 : 148);
          }
        }

        if (col !== 0) {
          col = 0;
          currentY += 148;
        }

        currentY += 8;
      }
    }

    // Draw footer disclaimer note in PDF
    doc.fillColor('#6B7280').fontSize(8)
       .text('* Catatan: Moodboard ini berfungsi sebagai panduan penyatuan perspektif gaya & pose antara klien dan fotografer. Hasil akhir foto disesuaikan dengan kondisi lokasi & pencahayaan lapangan.', 30, 565, { align: 'center', width: 782 });

    doc.end();
  } catch (err) {
    console.error('[Moodboard PDF Error]:', err);
    res.status(500).send('Gagal membuat PDF moodboard');
  }
});

// ============ 5. GET MOBILE RESPONSIVE WEB PREVIEW ============
router.get('/:tokenOrId/view', (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).send('Pesanan tidak ditemukan');
    }

    const db = getDb();
    const moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);
    let items = [];
    if (moodboard && moodboard.items) {
      try { items = JSON.parse(moodboard.items); } catch (e) { items = []; }
    }

    let categoryNotes = {};
    if (moodboard && moodboard.category_notes) {
      try { categoryNotes = JSON.parse(moodboard.category_notes); } catch (e) { categoryNotes = {}; }
    }

    const categories = getMoodboardCategories(db);
    const categoryOrder = categories.map(c => c.id);
    const CATEGORY_NAMES = {};
    categories.forEach(c => {
      CATEGORY_NAMES[c.id] = c.label;
    });

    const groupedItems = {};
    categoryOrder.forEach(cat => { groupedItems[cat] = []; });
    items.forEach(item => {
      const cat = (item.category || categoryOrder[0] || 'general').toLowerCase();
      if (!groupedItems[cat]) groupedItems[cat] = [];
      groupedItems[cat].push(item);
    });

    const allGalleryItems = [];
    let globalIndex = 0;

    let categoriesHtml = '';
    let totalCount = 0;

    function escapeHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    for (const catKey of categoryOrder) {
      const catItems = groupedItems[catKey];
      if (!catItems || catItems.length === 0) continue;
      totalCount += catItems.length;

      const catTitle = CATEGORY_NAMES[catKey] || `Pose ${catKey.toUpperCase()}`;
      const catBriefing = categoryNotes[catKey];

      const cardsHtml = catItems.map(item => {
        const itemIdx = globalIndex++;
        allGalleryItems.push({
          index: itemIdx,
          url: item.url,
          category: catTitle,
          note: item.note || ''
        });

        return `
          <div class="card">
            <div class="card-img-wrap" onclick="openLightbox(${itemIdx})" title="Klik untuk memperbesar foto & navigasi">
              <img src="${item.url}" loading="lazy" alt="${catTitle}">
              <div class="zoom-hint">Perbesar</div>
            </div>
            ${item.note ? `<div class="card-note">“${escapeHtml(item.note)}”</div>` : ''}
          </div>
        `;
      }).join('');

      categoriesHtml += `
        <div class="category-section">
          <div class="category-header">
            <div class="category-title">
              <span>${catTitle}</span>
              <span class="category-badge">${catItems.length} Foto</span>
            </div>
          </div>
          ${catBriefing ? `
            <div style="background:#FAF9F6; border:1px solid #E5E0D8; border-radius:12px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:#1A1A2E; display:flex; align-items:center; gap:8px;">
              <span style="font-weight:bold; text-transform:uppercase; font-size:10px; color:#C59B63; letter-spacing:0.5px;">Briefing Kategori:</span> <span style="font-style:italic;">“${escapeHtml(catBriefing)}”</span>
            </div>
          ` : ''}
          <div class="grid">
            ${cardsHtml}
          </div>
        </div>
      `;
    }

    if (totalCount === 0) {
      categoriesHtml = `<div style="text-align:center; padding: 60px 20px; color:#6B7280; font-size:14px; background:#fff; border-radius:16px; border:1px solid #E5E0D8;">Sesi foto standar / Tidak ada moodboard khusus dari klien.</div>`;
    }

    const pdfUrl = `/api/public/moodboard/${booking.tracking_token || booking.id}/pdf`;

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Moodboard Foto — ${escapeHtml(booking.customer_name || 'Klien')}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #FDFBF7;
            color: #1A1A2E;
            padding: 24px 16px;
            -webkit-font-smoothing: antialiased;
          }
          .container { max-width: 1040px; margin: 0 auto; }
          .header {
            background: #FFFFFF;
            border: 1px solid #E5E0D8;
            border-radius: 20px;
            padding: 24px 28px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03);
          }
          .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #C59B63;
            background: rgba(197, 155, 99, 0.1);
            padding: 4px 10px;
            border-radius: 6px;
            margin-bottom: 6px;
          }
          .title { font-size: 20px; font-weight: 800; color: #1A1A2E; }
          .meta-info { font-size: 13px; color: #6B7280; margin-top: 4px; }
          .meta-info strong { color: #1A1A2E; }
          .btn-pdf {
            background: #1A1A2E;
            color: #FFFFFF;
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(26,26,46,0.15);
          }
          .btn-pdf:hover { background: #2A2A4E; transform: translateY(-1px); }
          .disclaimer {
            background: #FAF9F6;
            border: 1px solid #E5E0D8;
            border-radius: 14px;
            padding: 14px 18px;
            margin-bottom: 24px;
            font-size: 12px;
            color: #4B5563;
            line-height: 1.6;
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }
          .disclaimer strong { color: #1A1A2E; }
          .category-section { margin-bottom: 32px; }
          .category-header {
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #E5E0D8;
            padding-bottom: 8px;
          }
          .category-title {
            font-size: 15px;
            font-weight: 700;
            color: #1A1A2E;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .category-badge {
            font-size: 11px;
            font-weight: 700;
            background: #FAF9F6;
            color: #C59B63;
            border: 1px solid #E5E0D8;
            padding: 2px 8px;
            border-radius: 12px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(130px, 165px));
            gap: 14px;
          }
          @media (max-width: 640px) {
            .grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
          }
          .card {
            background: #FFFFFF;
            border: 1px solid #E5E0D8;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 2px 6px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.06); }
          .card-img-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 3/4;
            background: #F3F4F6;
            cursor: pointer;
            overflow: hidden;
          }
          .card-img-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }
          .card-img-wrap:hover img { transform: scale(1.04); }
          .zoom-hint {
            position: absolute;
            bottom: 6px;
            right: 6px;
            background: rgba(0,0,0,0.65);
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 600;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
          }
          .card-img-wrap:hover .zoom-hint { opacity: 1; }
          .card-note {
            padding: 8px 10px;
            font-size: 10.5px;
            color: #4B5563;
            font-style: italic;
            background: #FAF9F6;
            border-top: 1px solid #E5E0D8;
            line-height: 1.35;
          }

          /* Lightbox Modal */
          #lightbox {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(10, 10, 20, 0.95);
            backdrop-filter: blur(8px);
            z-index: 99999;
            align-items: center;
            justify-content: center;
            padding: 16px;
          }
          .lb-container {
            width: 100%;
            max-width: 900px;
            display: flex;
            flex-direction: column;
            max-height: 94vh;
          }
          .lb-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            color: #fff;
          }
          .lb-category-info { display: flex; align-items: center; gap: 10px; }
          .lb-badge {
            background: rgba(197, 155, 99, 0.25);
            color: #E2B774;
            border: 1px solid rgba(197, 155, 99, 0.4);
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 6px;
            text-transform: uppercase;
          }
          .lb-counter { font-size: 12px; color: #9CA3AF; font-family: monospace; }
          .lb-close {
            background: rgba(255,255,255,0.15);
            border: none;
            color: #fff;
            font-size: 16px;
            font-weight: bold;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
          }
          .lb-close:hover { background: rgba(255,255,255,0.3); }
          .lb-body {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            min-height: 0;
          }
          .lb-img-wrap {
            max-height: 75vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .lb-img-wrap img {
            max-width: 100%;
            max-height: 75vh;
            object-fit: contain;
            border-radius: 12px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          }
          .lb-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.6);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.2);
            width: 44px;
            height: 44px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 10;
          }
          .lb-nav:hover { background: rgba(0,0,0,0.9); transform: translateY(-50%) scale(1.1); }
          .lb-prev { left: 8px; }
          .lb-next { right: 8px; }
          .lb-note {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.15);
            color: #F3F4F6;
            padding: 10px 16px;
            border-radius: 10px;
            margin-top: 12px;
            font-size: 12px;
            text-align: center;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <span class="badge">Briefing Moodboard & Referensi Foto</span>
              <h1 class="title">${escapeHtml(booking.customer_name || booking.client_name || 'Klien')}</h1>
              <p class="meta-info">
                Paket: <strong>${escapeHtml(booking.package_name || '-')}</strong> &bull;
                Univ: <strong>${escapeHtml(booking.university || '-')}</strong> &bull;
                Tanggal: <strong>${escapeHtml(booking.graduation_date || '-')}</strong>
              </p>
            </div>
            <a href="${pdfUrl}" target="_blank" class="btn-pdf">
              Unduh / Cetak PDF
            </a>
          </div>

          <div class="disclaimer">
            <div style="width:8px; height:8px; border-radius:50%; background:#C59B63; margin-top:5px; flex-shrink:0;"></div>
            <div>
              <strong>Panduan & Penyatuan Perspektif:</strong> Moodboard ini berfungsi sebagai panduan utama penyatuan perspektif gaya & pose antara Anda dan fotografer. Hasil akhir pemotretan akan diadaptasikan secara profesional dengan kondisi lokasi, pencahayaan, dan situasi terbaik di lapangan.
            </div>
          </div>

          ${categoriesHtml}

          <!-- Interactive Lightbox Modal -->
          <div id="lightbox" onclick="closeLightbox(event)">
            <div class="lb-container" onclick="event.stopPropagation()">
              <div class="lb-header">
                <div class="lb-category-info">
                  <span id="lb-cat-badge" class="lb-badge">Kategori</span>
                  <span id="lb-counter" class="lb-counter">Foto 1 / 10</span>
                </div>
                <button class="lb-close" onclick="closeLightbox(event)">✕</button>
              </div>

              <div class="lb-body">
                <button class="lb-nav lb-prev" onclick="prevLightbox(event)" title="Foto Sebelumnya (Kiri)">❮</button>
                <div class="lb-img-wrap">
                  <img id="lightbox-img" src="" alt="Zoomed Pose" oncontextmenu="return false;" ondragstart="return false;">
                </div>
                <button class="lb-nav lb-next" onclick="nextLightbox(event)" title="Foto Berikutnya (Kanan)">❯</button>
              </div>

              <div id="lb-note" class="lb-note" style="display:none;"></div>
            </div>
          </div>

          <script>
            const galleryData = ${JSON.stringify(allGalleryItems)};
            let currentIndex = 0;

            function openLightbox(index) {
              if (index < 0 || index >= galleryData.length) return;
              currentIndex = index;
              renderLightbox();
              document.getElementById('lightbox').style.display = 'flex';
            }

            function renderLightbox() {
              const item = galleryData[currentIndex];
              if (!item) return;

              document.getElementById('lightbox-img').src = item.url;
              document.getElementById('lb-cat-badge').textContent = item.category;
              document.getElementById('lb-counter').textContent = 'Foto ' + (currentIndex + 1) + ' dari ' + galleryData.length;

              const noteEl = document.getElementById('lb-note');
              if (item.note) {
                noteEl.textContent = '“' + item.note + '”';
                noteEl.style.display = 'block';
              } else {
                noteEl.style.display = 'none';
              }
            }

            function prevLightbox(e) {
              if (e) e.stopPropagation();
              if (galleryData.length === 0) return;
              currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
              renderLightbox();
            }

            function nextLightbox(e) {
              if (e) e.stopPropagation();
              if (galleryData.length === 0) return;
              currentIndex = (currentIndex + 1) % galleryData.length;
              renderLightbox();
            }

            function closeLightbox(e) {
              if (e) e.stopPropagation();
              document.getElementById('lightbox').style.display = 'none';
            }

            document.addEventListener('keydown', function(e) {
              const lb = document.getElementById('lightbox');
              if (lb && lb.style.display === 'flex') {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') prevLightbox();
                if (e.key === 'ArrowRight') nextLightbox();
              }
            });

            // Mobile Touch Swipe Navigation
            let touchStartX = 0;
            let touchEndX = 0;
            const lbEl = document.getElementById('lightbox');
            if (lbEl) {
              lbEl.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, false);
              lbEl.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchEndX < touchStartX - 40) nextLightbox();
                if (touchEndX > touchStartX + 40) prevLightbox();
              }, false);
            }

            // Disable right-click & image drag protection
            document.addEventListener('contextmenu', function(e) {
              if (e.target.tagName === 'IMG' || e.target.closest('.card-img-wrap') || e.target.closest('#lightbox')) {
                e.preventDefault();
                return false;
              }
            });

            document.addEventListener('dragstart', function(e) {
              if (e.target.tagName === 'IMG' || e.target.closest('.card-img-wrap')) {
                e.preventDefault();
                return false;
              }
            });
          </script>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error('[Moodboard Web View Error]:', err);
    res.status(500).send('Gagal memuat web preview moodboard');
  }
});

module.exports = router;
