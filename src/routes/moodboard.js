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

// Helper untuk mencari booking berdasarkan tracking_token atau ID
function findBooking(tokenOrId) {
  const db = getDb();
  let booking = db.prepare('SELECT * FROM bookings WHERE tracking_token = ?').get(tokenOrId);
  if (!booking) {
    booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(tokenOrId);
  }
  return booking;
}

// Ensure moodboard folder exists
function getMoodboardDir(bookingId) {
  const uploadDir = config.uploadPath || path.join(__dirname, '../../public/uploads');
  const moodboardDir = path.join(uploadDir, 'moodboards', String(bookingId));
  if (!fs.existsSync(moodboardDir)) {
    fs.mkdirSync(moodboardDir, { recursive: true });
  }
  return moodboardDir;
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
        const altPath = path.join(config.uploadPath, cleanPath.replace('/uploads/', ''));
        if (fs.existsSync(altPath)) {
          rawBuffer = fs.readFileSync(altPath);
        }
      }
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Case 2: Remote URL
      rawBuffer = await new Promise((resolve) => {
        const client = imageUrl.startsWith('https://') ? https : http;
        const req = client.get(imageUrl, { timeout: 5000 }, (res) => {
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

    if (!rawBuffer) return null;

    // Convert any raw image (WebP, PNG, HEIC) to JPEG buffer so PDFKit can render natively!
    const jpegBuffer = await sharp(rawBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return jpegBuffer;
  } catch (e) {
    console.warn('[Moodboard fetchImageBuffer Error]:', e.message);
    return null;
  }
}

// Standard ASCII Labels to avoid PDFKit font encoding issues
const CATEGORY_LABELS = {
  solo: 'POSE BEAUTY / SOLO (INDIVIDU)',
  couple: 'POSE COUPLE / PASANGAN',
  family: 'POSE KELUARGA',
  group: 'POSE GRUP / SAHABAT',
  general: 'INSPIRASI MOOD & TONE (GENERAL)'
};

// ============ 1. GET MOODBOARD & PORTFOLIO ITEMS ============
router.get('/:tokenOrId', (req, res) => {
  try {
    const booking = findBooking(req.params.tokenOrId);
    if (!booking) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const db = getDb();
    
    let moodboard = db.prepare('SELECT * FROM booking_moodboards WHERE booking_id = ?').get(booking.id);
    let items = [];
    if (moodboard && moodboard.items) {
      try { items = JSON.parse(moodboard.items); } catch (e) { items = []; }
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
      booking_id: booking.id,
      client_name: booking.client_name,
      graduation_date: booking.graduation_date,
      status: booking.status,
      moodboard_exists: items.length > 0,
      items: items,
      portfolio_catalog: portfolioItems
    });
  } catch (err) {
    console.error('[Moodboard GET Error]:', err);
    res.status(500).json({ error: 'Gagal mengambil data moodboard' });
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

    let finalPhotoUrl = '';

    if (source === 'portfolio') {
      const portfolioUrl = req.body.portfolio_url;
      if (!portfolioUrl) {
        return res.status(400).json({ error: 'Foto portofolio tidak valid' });
      }
      finalPhotoUrl = portfolioUrl;
    } else {
      if (!req.files || !req.files.photo) {
        return res.status(400).json({ error: 'File foto tidak ditemukan' });
      }

      const photoFile = req.files.photo;
      const moodboardDir = getMoodboardDir(booking.id);
      const filename = `${itemId}.webp`;
      const targetPath = path.join(moodboardDir, filename);

      await sharp(photoFile.tempFilePath || photoFile.data)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .sharpen({ sigma: 0.5 })
        .webp({ quality: 80 })
        .toFile(targetPath);

      finalPhotoUrl = `/uploads/moodboards/${booking.id}/${filename}`;
    }

    const newItem = {
      id: itemId,
      source: source,
      url: finalPhotoUrl,
      category: category,
      note: note,
      created_at: new Date().toISOString()
    };

    currentItems.push(newItem);

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
      item: newItem,
      total_items: currentItems.length
    });
  } catch (err) {
    console.error('[Moodboard POST Error]:', err);
    res.status(500).json({ error: 'Gagal menambahkan referensi: ' + err.message });
  }
});

// ============ 3. DELETE ITEM FROM MOODBOARD ============
router.delete('/:tokenOrId/item/:itemId', (req, res) => {
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

    if (targetItem.source === 'upload' && targetItem.url) {
      try {
        const publicDir = path.join(__dirname, '../../public');
        const localFilePath = path.join(publicDir, targetItem.url);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
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

    // Pre-fetch image buffers & convert to JPEG for 100% PDFKit compatibility
    const publicDir = path.join(__dirname, '../../public');
    const itemsWithBuffers = await Promise.all(items.map(async (item) => {
      const buffer = await fetchImageBuffer(item.url, publicDir);
      return { ...item, buffer };
    }));

    // Group items by category order
    const categoryOrder = ['solo', 'couple', 'family', 'group', 'general'];
    const groupedItems = {};
    categoryOrder.forEach(cat => { groupedItems[cat] = []; });
    itemsWithBuffers.forEach(item => {
      const cat = (item.category || 'general').toLowerCase();
      if (!groupedItems[cat]) groupedItems[cat] = [];
      groupedItems[cat].push(item);
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Moodboard-Order-${booking.id}.pdf"`);

    // A4 Landscape orientation (Width: 841.89 pt, Height: 595.28 pt)
    const doc = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    // Helper: Draw Landscape Top Header (Width 841.89 pt)
    function drawHeader(docPage) {
      docPage.rect(0, 0, 841.89, 42).fill('#111E35');
      docPage.fillColor('#FFFFFF').fontSize(13).text('MOODBOARD & BRIEFING POSE FOTO WISUDA', 30, 14, { bold: true });
      docPage.fillColor('#D4AF37').fontSize(10).text(`ORDER #${booking.id}`, 700, 16, { align: 'right', bold: true });
      docPage.rect(0, 42, 841.89, 3).fill('#C59B63');
    }

    drawHeader(doc);

    // Landscape Client Info Bar (Width 782pt)
    let boxY = 52;
    doc.rect(30, boxY, 782, 26).fillAndStroke('#FAF9F6', '#C59B63');
    
    doc.fillColor('#111E35').fontSize(8.5)
       .text(`Client: ${booking.client_name || '-'}`, 42, boxY + 8, { bold: true })
       .text(`Univ: ${booking.university || '-'}`, 300, boxY + 8, { bold: true })
       .text(`Tanggal: ${booking.graduation_date || '-'}`, 600, boxY + 8, { bold: true });

    let currentY = boxY + 34;

    if (itemsWithBuffers.length === 0) {
      doc.fillColor('#6B7280').fontSize(10).text('Tidak ada referensi moodboard khusus dari klien (Sesi Pemotretan Gaya Bebas Studio)', 30, currentY + 30, { align: 'center', width: 782 });
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
        doc.fillColor('#D4AF37').fontSize(8.5).text(`[ ${catTitle} ]  -  ${catItems.length} FOTO`, 40, currentY + 5, { bold: true });
        currentY += 23;

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

    let itemsHtml = '';
    if (items.length === 0) {
      itemsHtml = `<div style="text-align:center; padding: 40px 20px; color:#6B7280;">Sesi foto standar / Tidak ada moodboard khusus dari klien.</div>`;
    } else {
      itemsHtml = items.map(item => `
        <div style="background:#fff; border:1px solid #E5E0D8; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <div style="background:#FAF9F6; padding: 8px 12px; font-size:11px; font-weight:700; color:#C59B63; text-transform:uppercase; border-bottom:1px solid #E5E0D8;">
            🏷️ ${item.category}
          </div>
          <div style="height:240px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            <img src="${item.url}" style="width:100%; height:100%; object-fit:cover;" alt="Referenced Pose" onerror="this.src='/ams-logo.png'; this.style.objectFit='contain';">
          </div>
          ${item.note ? `<div style="padding:10px 12px; font-size:12px; color:#374151; background:#fff; font-style:italic;">💬 "${item.note}"</div>` : ''}
        </div>
      `).join('');
    }

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Moodboard - ${booking.client_name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF9F6; color: #1A1A2E; margin: 0; padding: 16px; }
          .header { background: #111E35; color: #fff; padding: 16px; border-radius: 12px; margin-bottom: 16px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size:11px; color:#D4AF37; text-transform:uppercase; font-weight:700; letter-spacing:1px;">Briefing Moodboard Foto</div>
          <h2 style="margin:4px 0; font-size:18px;">${booking.client_name}</h2>
          <div style="font-size:12px; opacity:0.8;">Order #${booking.id} • ${booking.university || '-'}</div>
        </div>
        <div class="grid">
          ${itemsHtml}
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
