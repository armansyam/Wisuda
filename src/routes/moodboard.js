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
       .text('💡 PANDUAN & PENYATUAN PERSPEKTIF: Moodboard ini berfungsi sebagai panduan utama penyatuan perspektif gaya & pose antara klien dan fotografer. Hasil akhir pemotretan diadaptasikan secara profesional dengan kondisi lokasi, pencahayaan, dan situasi lapangan.', 38, noticeY + 6, { width: 766 });

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

    const categoryOrder = ['solo', 'couple', 'family', 'group', 'general'];
    const CATEGORY_NAMES = {
      solo: '📸 Pose Beauty / Solo (Individu)',
      couple: '👩‍❤️‍👨 Pose Couple / Pasangan',
      family: '👨‍👩‍👧 Pose Keluarga',
      group: '👯‍♀️ Pose Grup / Sahabat',
      general: '💡 Inspirasi Mood & Tone (General)'
    };

    const groupedItems = {};
    categoryOrder.forEach(cat => { groupedItems[cat] = []; });
    items.forEach(item => {
      const cat = (item.category || 'general').toLowerCase();
      if (!groupedItems[cat]) groupedItems[cat] = [];
      groupedItems[cat].push(item);
    });

    let categoriesHtml = '';
    let totalCount = 0;

    for (const catKey of categoryOrder) {
      const catItems = groupedItems[catKey];
      if (!catItems || catItems.length === 0) continue;
      totalCount += catItems.length;

      const catTitle = CATEGORY_NAMES[catKey] || `Pose ${catKey.toUpperCase()}`;

      const cardsHtml = catItems.map(item => `
        <div class="card">
          <div class="card-img-wrap" onclick="openLightbox('${item.url}')" title="Klik untuk memperbesar foto">
            <img src="${item.url}" loading="lazy" alt="${catTitle}">
            <div class="zoom-hint">🔍 Perbesar</div>
          </div>
          ${item.note ? `<div class="card-note">💬 "${item.note}"</div>` : ''}
        </div>
      `).join('');

      categoriesHtml += `
        <div class="category-section">
          <div class="category-header">
            <div class="category-title">
              <span>${catTitle}</span>
              <span class="category-badge">${catItems.length} Foto</span>
            </div>
          </div>
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
        <title>Moodboard Foto — ${booking.client_name}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF9F6; color: #1A1A2E; margin: 0; padding: 16px; max-width: 1200px; margin: 0 auto; }
          .header { background: #111E35; color: #fff; padding: 20px; border-radius: 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 20px rgba(17,30,53,0.15); }
          .header-title { font-size: 11px; color: #D4AF37; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
          .header h2 { margin: 4px 0 2px 0; font-size: 20px; font-weight: 800; }
          .header-meta { font-size: 12px; opacity: 0.8; }
          .btn-pdf { background: linear-gradient(135deg, #D4AF37, #C5A028); color: #111E35; padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(212,175,55,0.3); transition: transform 0.2s; }
          .btn-pdf:hover { transform: translateY(-1px); }
          .disclaimer { background: #FFFDF5; border: 1px solid #FCD34D; color: #92400E; padding: 12px 16px; border-radius: 12px; font-size: 12px; margin-bottom: 24px; line-height: 1.5; display: flex; align-items: flex-start; gap: 10px; box-shadow: 0 2px 8px rgba(252,211,77,0.15); }
          
          .category-section { margin-bottom: 28px; }
          .category-header { background: #111E35; color: #fff; padding: 12px 18px; border-radius: 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #D4AF37; }
          .category-title { font-size: 13px; font-weight: 700; color: #D4AF37; display: flex; align-items: center; gap: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .category-badge { background: rgba(212, 175, 55, 0.2); color: #D4AF37; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; border: 1px solid rgba(212,175,55,0.4); }
          
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
          .card { background: #fff; border: 1px solid #E5E0D8; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s; }
          .card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
          .card-img-wrap { height: 280px; background: #f3f4f6; overflow: hidden; cursor: pointer; position: relative; }
          .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
          .card-img-wrap:hover img { transform: scale(1.03); }
          .zoom-hint { position: absolute; bottom: 8px; right: 8px; background: rgba(17,30,53,0.8); color: #D4AF37; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 8px; backdrop-filter: blur(4px); opacity: 0.9; }
          .card-note { padding: 12px 14px; font-size: 12px; color: #374151; background: #fff; border-top: 1px solid #F3F4F6; font-style: italic; }
          
          #lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 99999; justify-content: center; align-items: center; padding: 20px; cursor: pointer; backdrop-filter: blur(8px); }
          #lightbox img { max-width: 95vw; max-height: 92vh; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
          /* Disable user selection and image dragging */
          img, .card-img-wrap, #lightbox img {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-user-drag: none;
          }
        </style>
      </head>
      <body oncontextmenu="return false;">
        <div class="header">
          <div>
            <div class="header-title">Briefing Moodboard & Referensi Foto</div>
            <h2>${booking.client_name}</h2>
            <div class="header-meta">Order #${booking.id} • ${booking.university || '-'} • Tanggal: ${booking.graduation_date || '-'}</div>
          </div>
          <a href="${pdfUrl}" target="_blank" class="btn-pdf">
            📄 Unduh / Cetak PDF
          </a>
        </div>

        <div class="disclaimer">
          <span style="font-size:16px;">💡</span>
          <div>
            <strong>Panduan & Penyatuan Perspektif:</strong> Moodboard ini berfungsi sebagai panduan utama penyatuan perspektif gaya & pose antara Anda dan fotografer. Hasil akhir pemotretan akan diadaptasikan secara profesional dengan kondisi lokasi, pencahayaan, dan situasi terbaik di lapangan.
          </div>
        </div>

        ${categoriesHtml}

        <div id="lightbox" onclick="closeLightbox()">
          <img id="lightbox-img" src="" alt="Zoomed Pose" oncontextmenu="return false;" ondragstart="return false;">
        </div>

        <script>
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

          function openLightbox(url) {
            document.getElementById('lightbox-img').src = url;
            document.getElementById('lightbox').style.display = 'flex';
          }
          function closeLightbox() {
            document.getElementById('lightbox').style.display = 'none';
          }
        </script>
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
