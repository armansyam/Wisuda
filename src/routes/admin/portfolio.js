/**
 * src/routes/admin/portfolio.js
 * Sub-router untuk semua endpoint /portfolio/*
 * Dipanggil dari src/routes/admin.js via: router.use('/portfolio', require('./admin/portfolio'))
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../../config/database');
const { getSettings, getSetting } = require('../../config/wa-templates');
const { body, param, validationResult } = require('express-validator');
const { handleValidation, paginationValidation } = require('../../middleware/validation');
const { requireAuth } = require('../../middleware/auth');
const driveFolder = require('../../services/drive-folder.service');
const driveImporter = require('../../services/drive-importer.service');
const { normalizeUniversity } = require('../../utils/university');
const multer = require('multer');
const sharp = require('sharp');

const portfolioRouter = express.Router();
const db = getDb();

// ============ PORTFOLIO ============
portfolioRouter.get('/', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, published, featured, city } = req.query;
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params = [];

  if (published !== undefined) {
    where += ' AND published = ?';
    params.push(published === 'true' ? 1 : 0);
  }
  if (featured !== undefined) {
    where += ' AND featured = ?';
    params.push(featured === 'true' ? 1 : 0);
  }
  if (city) {
    where += ' AND city = ?';
    params.push(city);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM portfolio_items p WHERE ${where.replace(/published/g, 'p.published').replace(/featured/g, 'p.featured').replace(/city/g, 'p.city')}`).get(params).c;
  const rows = db.prepare(`
    SELECT p.*, b.portfolio_consent, b.client_name,
           COALESCE(p.rating, b.rating) as rating,
           COALESCE(p.feedback_notes, b.feedback_notes) as feedback_notes
    FROM portfolio_items p
    LEFT JOIN bookings b ON p.booking_id = b.id
    WHERE ${where.replace(/published/g, 'p.published').replace(/featured/g, 'p.featured').replace(/city/g, 'p.city')}
    ORDER BY p.sort_order ASC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  rows.forEach(p => {
    try { p.highlight_photos = JSON.parse(p.highlight_photos || '[]'); } catch { p.highlight_photos = []; }
  });

  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

portfolioRouter.post('/from-booking', [
  body('booking_id').isInt({ min: 1 }).withMessage('Booking ID wajib'),
  body('client_initial').trim().isLength({ min: 1, max: 100 }).withMessage('Nama / inisial client wajib (max 100 karakter)'),
  body('graduation_year').optional({ checkFalsy: true }).isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib'),
  body('cover_photo_url').isURL().withMessage('Cover photo URL wajib'),
  body('highlight_photos').isArray({ min: 1, max: 500 }).withMessage('Highlight photos 1-500'),
  body('fg_name').optional().trim().isLength({ max: 100 }).withMessage('Nama FG max 100 karakter'),
  body('featured').optional().isBoolean().withMessage('Featured harus boolean'),
  handleValidation
], (req, res) => {
  const { booking_id, client_initial, graduation_year, university, cover_photo_url, highlight_photos, fg_name, featured } = req.body;
  const finalYear = graduation_year && Number(graduation_year) >= 2020 ? Number(graduation_year) : new Date().getFullYear();

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND status = ?').get(booking_id, 'completed');
  if (!booking) return res.status(400).json({ error: 'Booking tidak ditemukan atau belum completed' });

  const existing = db.prepare('SELECT id FROM portfolio_items WHERE booking_id = ?').get(booking_id);
  if (existing) return res.status(400).json({ error: 'Booking sudah dikurasi ke portfolio' });

  const isPublished = req.body.published === true || req.body.published === 1 ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(booking_id, client_initial, graduation_year, university, booking.city || null, cover_photo_url, JSON.stringify(highlight_photos), fg_name || null, featured ? 1 : 0, isPublished);

  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(result.lastInsertRowid);
  try { portfolio.highlight_photos = JSON.parse(portfolio.highlight_photos); } catch { portfolio.highlight_photos = []; }

  res.status(201).json(portfolio);
});

const updatePortfolioHandler = async (req, res) => {
  const { cover_photo_url, highlight_photos, featured, published, sort_order, client_initial, graduation_year, university, city, fg_name } = req.body;

  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!portfolio) return res.status(404).json({ error: 'Not found' });

  if (published && portfolio.booking_id) {
    const booking = db.prepare('SELECT portfolio_consent FROM bookings WHERE id = ?').get(portfolio.booking_id);
    if (booking && booking.portfolio_consent === 'declined') {
      return res.status(400).json({ error: 'Klien menolak persetujuan publikasi foto ini di portofolio.' });
    }
  }

  const updates = [];
  const params = [];

  const driveFolder = require('../../services/drive-folder.service');

  if (cover_photo_url) { updates.push('cover_photo_url = ?'); params.push(cover_photo_url); }
  if (highlight_photos) {
    try {
      const oldList = JSON.parse(portfolio.highlight_photos || '[]');
      const newList = typeof highlight_photos === 'string' ? JSON.parse(highlight_photos) : highlight_photos;
      if (Array.isArray(oldList) && Array.isArray(newList)) {
        const removedPhotos = oldList.filter(oldUrl => !newList.includes(oldUrl));
        for (const oldUrl of removedPhotos) {
          if (oldUrl) {
            await driveFolder.deleteDriveFile(oldUrl);
          }
        }
      }
    } catch (e) { }
    updates.push('highlight_photos = ?');
    params.push(typeof highlight_photos === 'string' ? highlight_photos : JSON.stringify(highlight_photos));
  }
  if (featured !== undefined) { updates.push('featured = ?'); params.push(featured ? 1 : 0); }
  if (published !== undefined) { updates.push('published = ?'); params.push(published ? 1 : 0); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
  if (client_initial) { updates.push('client_initial = ?'); params.push(client_initial); }
  if (graduation_year) { updates.push('graduation_year = ?'); params.push(graduation_year); }
  if (university) { updates.push('university = ?'); params.push(university); }
  if (city !== undefined) { updates.push('city = ?'); params.push(city || null); }
  if (fg_name !== undefined) { updates.push('fg_name = ?'); params.push(fg_name); }
  if (req.body.rating !== undefined) {
    if (req.body.rating === null || req.body.rating === '') {
      updates.push('rating = ?');
      params.push(null);
    } else {
      const parsedRating = parseFloat(req.body.rating);
      updates.push('rating = ?');
      params.push(!isNaN(parsedRating) ? Math.min(5.0, Math.max(1.0, parsedRating)) : null);
    }
  }
  if (req.body.feedback_notes !== undefined) { updates.push('feedback_notes = ?'); params.push(req.body.feedback_notes || null); }

  // Sync rename subfolder in Google Drive if metadata changed
  const newInitial = client_initial || portfolio.client_initial;
  const newUni = university || portfolio.university;
  const newYear = graduation_year || portfolio.graduation_year;
  if ((client_initial || university || graduation_year) && portfolio.drive_subfolder_id) {
    await driveFolder.renamePortfolioItemSubfolder(portfolio.drive_subfolder_id, newInitial, newUni, newYear);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada data untuk diupdate' });

  params.push(req.params.id);
  db.prepare(`UPDATE portfolio_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Two-Way Sync back to bookings table if portfolio item is linked to a booking
  if (portfolio.booking_id && (req.body.rating !== undefined || req.body.feedback_notes !== undefined)) {
    const bookingUpdates = [];
    const bookingParams = [];
    if (req.body.rating !== undefined) {
      bookingUpdates.push('rating = ?');
      const parsed = req.body.rating !== null && req.body.rating !== '' ? parseFloat(req.body.rating) : null;
      bookingParams.push(parsed !== null && !isNaN(parsed) ? Math.min(5.0, Math.max(1.0, parsed)) : null);
    }
    if (req.body.feedback_notes !== undefined) {
      bookingUpdates.push('feedback_notes = ?');
      bookingParams.push(req.body.feedback_notes || null);
    }
    if (bookingUpdates.length > 0) {
      bookingParams.push(portfolio.booking_id);
      db.prepare(`UPDATE bookings SET ${bookingUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...bookingParams);
    }
  }

  const updated = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  try { updated.highlight_photos = JSON.parse(updated.highlight_photos); } catch { updated.highlight_photos = []; }

  res.json(updated);
};

portfolioRouter.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('cover_photo_url').optional(),
  body('highlight_photos').optional(),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('rating').optional().isFloat({ min: 1.0, max: 5.0 }),
  body('feedback_notes').optional().trim(),
  handleValidation
], updatePortfolioHandler);

portfolioRouter.patch('/:id', [
  param('id').isInt({ min: 1 }),
  body('cover_photo_url').optional(),
  body('highlight_photos').optional(),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('rating').optional().isFloat({ min: 1.0, max: 5.0 }),
  body('feedback_notes').optional().trim(),
  handleValidation
], updatePortfolioHandler);

// ============ PORTFOLIO UPLOAD & DRIVE IMPORT ============
// (sharp already required at top)

async function runManualDriveImportInBackground(jobId, folderId, options) {
  const { portfolio_id, booking_id, client_initial, graduation_year, normalizedUniversity, city, fg_name, featured, published } = options;
  const db = getDb();
  const driveFolder = require('../../services/drive-folder.service');

  try {
    db.prepare("UPDATE portfolio_import_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);

    const subfolderId = await driveFolder.createPortfolioItemSubfolder(client_initial, normalizedUniversity, graduation_year);
    const highlightUrls = await driveFolder.copyDriveFilesCloudToCloud(folderId, subfolderId, (current, total) => {
      try {
        db.prepare("UPDATE portfolio_import_jobs SET total_photos = ?, processed_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(total, current, jobId);
      } catch (e) {}
    });

    if (!highlightUrls || highlightUrls.length === 0) {
      throw new Error('Gagal menyalin file gambar dari Drive. Pastikan link Drive publik dan memiliki file gambar.');
    }

    const coverPhotoUrl = highlightUrls[0];
    db.prepare("UPDATE portfolio_import_jobs SET total_photos = ?, processed_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(highlightUrls.length, highlightUrls.length, jobId);

    let targetId = portfolio_id;
    if (targetId) {
      db.prepare(`
        UPDATE portfolio_items
        SET client_initial = ?, graduation_year = ?, university = ?, city = ?, cover_photo_url = ?, highlight_photos = ?, fg_name = ?, featured = ?, published = ?, drive_subfolder_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(client_initial, graduation_year, normalizedUniversity, city || null, coverPhotoUrl, JSON.stringify(highlightUrls), fg_name || null, featured ? 1 : 0, published ? 1 : 0, subfolderId, targetId);
    } else {
      const result = db.prepare(`
        INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published, drive_subfolder_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(booking_id || null, client_initial, graduation_year, normalizedUniversity, city || null, coverPhotoUrl, JSON.stringify(highlightUrls), fg_name || null, featured ? 1 : 0, published ? 1 : 0, subfolderId);
      targetId = result.lastInsertRowid;
    }

    db.prepare("UPDATE portfolio_import_jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);
    console.log(`[DriveImporter] Manual portfolio import job #${jobId} completed successfully with ${highlightUrls.length} Google Drive CDN photos.`);
  } catch (err) {
    console.error(`[DriveImporter Manual Import Error, Job #${jobId}]:`, err.message);
    db.prepare("UPDATE portfolio_import_jobs SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(err.message || 'Unknown error', jobId);
  }
}

portfolioRouter.post('/import-drive', [
  body('drive_url').trim().isLength({ min: 5 }).withMessage('Link Google Drive wajib'),
  body('client_initial').trim().isLength({ min: 1, max: 100 }).withMessage('Nama / inisial client wajib (max 100 karakter)'),
  body('graduation_year').optional({ checkFalsy: true }).toInt().isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid (2020-2030)'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib (min 2 karakter)'),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('fg_name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('featured').optional({ checkFalsy: true }).isBoolean(),
  body('published').optional({ checkFalsy: true }).isBoolean(),
  body('portfolio_id').optional({ checkFalsy: true }).toInt(),
  body('booking_id').optional({ checkFalsy: true }).toInt(),
  handleValidation
], async (req, res) => {
  try {
    const { drive_url, client_initial, graduation_year, university, city, fg_name, featured, published, portfolio_id, booking_id } = req.body;
    const finalYear = graduation_year && Number(graduation_year) >= 2020 ? Number(graduation_year) : new Date().getFullYear();
    const normalizedUniversity = normalizeUniversity(university);

    const match = drive_url.match(/folders\/([a-zA-Z0-9-_]+)/) || drive_url.match(/[?&]id=([a-zA-Z0-9-_]+)/) || drive_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const folderId = match ? match[1] : drive_url.trim();

    if (!folderId || folderId.length < 10) {
      return res.status(400).json({ error: 'Format link Google Drive folder tidak valid. Gunakan link folder Google Drive.' });
    }

    // Insert job with 'pending' status
    const insertJob = db.prepare(`
      INSERT INTO portfolio_import_jobs (client_initial, graduation_year, university, drive_url, status, total_photos, processed_photos)
      VALUES (?, ?, ?, ?, 'pending', 0, 0)
    `).run(client_initial, finalYear, normalizedUniversity, drive_url);
    const jobId = insertJob.lastInsertRowid;

    // Trigger background processing
    runManualDriveImportInBackground(jobId, folderId, {
      portfolio_id,
      booking_id: booking_id || null,
      client_initial,
      graduation_year,
      normalizedUniversity,
      city,
      fg_name,
      featured,
      published
    }).catch(err => {
      console.error(`[Background Manual Import Error for Job #${jobId}]:`, err);
    });

    res.status(202).json({
      success: true,
      message: 'Proses impor Google Drive berhasil dimulai di latar belakang.',
      jobId
    });
  } catch (err) {
    console.error('Failed to create manual import job:', err);
    res.status(500).json({ error: 'Gagal menginisiasi pekerjaan impor Google Drive: ' + err.message });
  }
});

portfolioRouter.get('/import-jobs', (req, res) => {
  try {
    // Auto-mark stale jobs (no update for > 15 mins) as failed
    db.prepare(`
      UPDATE portfolio_import_jobs
      SET status = 'failed', error_message = 'Proses terhenti karena koneksi terputus atau server di-restart', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('pending', 'processing')
        AND datetime(updated_at) < datetime('now', '-15 minutes')
    `).run();

    // Return all pending/processing jobs plus jobs completed/failed in the last 1 hour
    const jobs = db.prepare(`
      SELECT * FROM portfolio_import_jobs
      WHERE status IN ('pending', 'processing')
         OR (status IN ('completed', 'failed') AND datetime(updated_at) >= datetime('now', '-1 hour'))
      ORDER BY created_at DESC
    `).all();
    res.json(jobs);
  } catch (err) {
    console.error('Failed to query import jobs:', err);
    res.status(500).json({ error: 'Internal database error' });
  }
});

portfolioRouter.delete('/import-jobs/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM portfolio_import_jobs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete import job:', err);
    res.status(500).json({ error: 'Internal database error' });
  }
});

portfolioRouter.post('/', [
  body('client_initial').trim().isLength({ min: 1, max: 100 }).withMessage('Nama / inisial client wajib (max 100 karakter)'),
  body('graduation_year').optional({ checkFalsy: true }).isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid'),
  body('university').trim().isLength({ min: 2, max: 100 }).withMessage('Universitas wajib'),
  body('city').optional().trim().isLength({ max: 100 }),
  body('cover_photo_url').optional({ checkFalsy: true }).trim(),
  body('highlight_photos').optional(),
  body('fg_name').optional().trim().isLength({ max: 100 }),
  body('featured').optional().isBoolean(),
  body('published').optional().isBoolean(),
  body('booking_id').optional({ values: 'falsy' }).isInt(),
  handleValidation
], (req, res) => {
  const { client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published, booking_id } = req.body;
  const finalYear = graduation_year && Number(graduation_year) >= 2020 ? Number(graduation_year) : new Date().getFullYear();

  if (published && booking_id) {
    const booking = db.prepare('SELECT portfolio_consent FROM bookings WHERE id = ?').get(booking_id);
    if (booking && booking.portfolio_consent === 'declined') {
      return res.status(400).json({ error: 'Klien menolak persetujuan publikasi foto ini di portofolio.' });
    }
  }

  const normalizedUniversity = normalizeUniversity(university);

  let highlights = [];
  if (Array.isArray(highlight_photos)) highlights = highlight_photos;
  else if (typeof highlight_photos === 'string') {
    try { highlights = JSON.parse(highlight_photos); } catch { highlights = [cover_photo_url]; }
  }
  if (highlights.length === 0 && cover_photo_url) {
    highlights = [cover_photo_url];
  }

  const result = db.prepare(`
    INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    booking_id || null,
    client_initial,
    finalYear,
    normalizedUniversity,
    city || null,
    cover_photo_url || '',
    JSON.stringify(highlights),
    fg_name || null,
    featured ? 1 : 0,
    published ? 1 : 0
  );

  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(result.lastInsertRowid);
  try { portfolio.highlight_photos = JSON.parse(portfolio.highlight_photos); } catch { portfolio.highlight_photos = []; }

  res.status(201).json(portfolio);
});

// ============ PORTFOLIO MANUAL UPLOAD (100% GOOGLE DRIVE DIRECT STREAM) ============
portfolioRouter.post('/upload', requireAuth, async (req, res) => {
  let file = null;
  if (req.files && req.files.file) {
    file = req.files.file;
  } else if (req.files && req.files.cover) {
    file = req.files.cover;
  }

  if (Array.isArray(file)) {
    file = file[0];
  }

  if (!file) return res.status(400).json({ error: 'File wajib' });

  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.name).toLowerCase();
  if (!allowed.includes(ext)) {
    return res.status(400).json({ error: 'Format harus jpg/png/webp' });
  }

  try {
    const fileBuffer = (file.data && file.data.length > 0)
      ? file.data
      : (file.tempFilePath && fs.existsSync(file.tempFilePath) ? fs.readFileSync(file.tempFilePath) : null);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'Buffer file upload kosong' });
    }

    const driveFolder = require('../../services/drive-folder.service');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const subfolderId = req.query.subfolder_id || req.body?.subfolder_id || null;
    const client = req.query.client || req.body?.client || req.query.client_initial || req.body?.client_initial || '';
    const university = req.query.university || req.body?.university || '';
    const year = req.query.year || req.body?.year || req.query.graduation_year || req.body?.graduation_year || '';

    let url = '';
    if (subfolderId) {
      url = await driveFolder.uploadPortfolioPhotoToDrive(filename, file.mimetype || 'image/jpeg', fileBuffer, subfolderId);
    } else if (client || university) {
      url = await driveFolder.uploadPortfolioPhotoToDrive(filename, file.mimetype || 'image/jpeg', fileBuffer, null, {
        client_initial: client,
        university,
        graduation_year: year
      });
    } else {
      url = await driveFolder.uploadPortfolioPhotoToDrive(filename, file.mimetype || 'image/jpeg', fileBuffer);
    }

    console.log(`[Portfolio] Directly uploaded image stream to Google Drive CDN (${url})`);
    res.json({ url, filename, subfolder_id: subfolderId });
  } catch (e) {
    console.error('Portfolio image upload processing error:', e);
    res.status(500).json({ error: 'Gagal proses gambar: ' + e.message });
  }
});

portfolioRouter.post('/create-subfolder', requireAuth, async (req, res) => {
  try {
    const { client_initial, university, graduation_year } = req.body;
    const driveFolder = require('../../services/drive-folder.service');
    const normalizedUniv = normalizeUniversity(university || '');
    const subfolderId = await driveFolder.createPortfolioItemSubfolder(client_initial || 'portfolio', normalizedUniv || 'general', graduation_year || new Date().getFullYear());
    res.json({ success: true, subfolder_id: subfolderId });
  } catch (err) {
    console.error('Failed to create portfolio subfolder:', err);
    res.status(500).json({ error: 'Gagal membuat subfolder Google Drive: ' + err.message });
  }
});

// ============ PORTFOLIO DELETE (100% GOOGLE DRIVE API TRASH VIA SUBFOLDER) ============
portfolioRouter.delete('/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], async (req, res) => {
  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(req.params.id);
  if (!portfolio) return res.status(404).json({ error: 'Not found' });

  try {
    const driveFolder = require('../../services/drive-folder.service');
    // Jika ada subfolder ID, hapus 1 subfolder utama (menghapus seluruh foto di dalamnya secara otomatis dalam 0.3s)
    if (portfolio.drive_subfolder_id) {
      await driveFolder.deleteDriveFile(portfolio.drive_subfolder_id);
    } else {
      // Fallback untuk portfolio lama tanpa subfolder: hapus per file
      const allUrls = [portfolio.cover_photo_url];
      if (portfolio.highlight_photos) {
        try {
          const parsed = JSON.parse(portfolio.highlight_photos);
          if (Array.isArray(parsed)) allUrls.push(...parsed);
        } catch { }
      }
      for (const u of allUrls) {
        if (u) {
          await driveFolder.deleteDriveFile(u);
        }
      }
    }
  } catch (e) {
    console.warn('Cleanup portfolio drive files error (non-fatal):', e.message);
  }

  db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(req.params.id);
  res.json({ success: true, status: 'deleted' });
});


module.exports = portfolioRouter;
