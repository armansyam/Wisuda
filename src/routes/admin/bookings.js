/**
 * src/routes/admin/bookings.js
 * Sub-router untuk semua endpoint /bookings/*
 * Dipanggil dari src/routes/admin.js via: router.use('/bookings', require('./admin/bookings'))
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../../config/settings');
const { getDb } = require('../../config/database');
const { getSettings, getWaTemplates, getSetting, setSetting } = require('../../config/wa-templates');
const { body, query, param, validationResult } = require('express-validator');
const { handleValidation, paginationValidation, bookingDpValidation, bookingBalanceValidation } = require('../../middleware/validation');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { formatCurrency, formatDate, formatDateTime } = require('../../utils/currency');
const { normalizeUniversity } = require('../../utils/university');
const { saveFinalInvoiceSnapshot } = require('../../utils/invoice');
const { getBaseUrl } = require('../../utils/url');
const { checkTimeOverlap, checkFgConflict, findAvailableFreelancers } = require('../../utils/timeSlot');
const driveImporter = require('../../services/drive-importer.service');
const driveFolder = require('../../services/drive-folder.service');
const { generateWaLink } = require('../../services/wa.service');
const multer = require('multer');
const emailService = require('../../services/email.service');

const bookingsRouter = express.Router();
const db = getDb();

function clearGalleryCache(bookingId) {
  try {
    const booking = db.prepare('SELECT staging_files FROM bookings WHERE id = ?').get(bookingId);
    if (!booking?.staging_files) return;
    const stagingFiles = JSON.parse(booking.staging_files || '[]');
    const activeUpload = getSetting('upload_path', config.uploadPath);
    const cacheDir = path.join(activeUpload, 'gallery_cache');
    stagingFiles.forEach(f => {
      try {
        const cachePath = path.join(cacheDir, `${f.fileId}.jpg`);
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      } catch (e) {
        console.warn(`[GalleryCache] Gagal hapus cache file ${f.fileId}:`, e.message);
      }
    });
  } catch (e) {
    console.warn(`[GalleryCache] Gagal clear cache untuk Booking #${bookingId}:`, e.message);
  }
}

function ensureBookingToken(booking, database) {
  if (!booking) return booking;
  const targetDb = database || db;
  if (!booking.tracking_token) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    booking.tracking_token = `TRK-${booking.id}-${randomHex}`;
    try {
      targetDb.prepare('UPDATE bookings SET tracking_token = ? WHERE id = ?')
        .run(booking.tracking_token, booking.id);
    } catch (e) { }
  }
  return booking;
}

function getTrackingUrl(req, booking) {
  if (!booking) return '';
  ensureBookingToken(booking, db);
  const token = booking.tracking_token || `TRK-${booking.id}`;
  return `${getBaseUrl(req)}/tracking.html?code=${encodeURIComponent(token)}`;
}

function ensurePortfolioDraft(bookingId, targetUrl) {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return;

    const clientName = (booking.client_name || 'Client').trim();
    const year = booking.graduation_date ? new Date(booking.graduation_date).getFullYear() : new Date().getFullYear();
    const fgAssignment = db.prepare('SELECT f.name FROM assignments a JOIN freelancers f ON a.fg_id = f.id WHERE a.booking_id = ?').get(bookingId);

    const existingPorto = db.prepare('SELECT id, published FROM portfolio_items WHERE booking_id = ?').get(bookingId);
    const isApproved = booking.portfolio_consent === 'approved';
    const publishedVal = isApproved ? 1 : (existingPorto ? existingPorto.published : 0);

    const clientRating = (booking.status === 'completed' && booking.rating) ? booking.rating : null;
    const clientFeedback = (booking.status === 'completed' && booking.feedback_notes) ? booking.feedback_notes : null;

    if (!existingPorto) {
      db.prepare(`
        INSERT INTO portfolio_items (booking_id, client_initial, graduation_year, university, city, cover_photo_url, highlight_photos, fg_name, featured, published, rating, feedback_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        bookingId,
        clientName,
        year,
        booking.university || 'Universitas',
        booking.city || null,
        photoUrl || null,
        photoUrl ? JSON.stringify([photoUrl]) : JSON.stringify([]),
        fgAssignment?.name || null,
        publishedVal,
        clientRating,
        clientFeedback
      );
    } else {
      db.prepare(`
        UPDATE portfolio_items
        SET client_initial = ?,
            cover_photo_url = COALESCE(cover_photo_url, ?),
            rating = COALESCE(?, rating),
            feedback_notes = COALESCE(?, feedback_notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ?
      `).run(
        clientName,
        photoUrl || null,
        clientRating,
        clientFeedback,
        bookingId
      );
    }

    if (photoUrl) {
      driveImporter.importPortfolioFromDrive(bookingId, photoUrl).catch(err => {
        console.error(`[DriveImporter Auto-Portfolio Error for Booking #${bookingId}]:`, err.message);
      });
    }
  } catch (e) {
    console.error('[ensurePortfolioDraft Error]:', e.message);
  }
}

bookingsRouter.get('/', paginationValidation, (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params = [];

  if (search) {
    where += ' AND (b.client_name LIKE ? OR b.client_phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }
  if (status) {
    where += ' AND b.status = ?';
    params.push(status);
  } else {
    // Gate 1: Halaman Client hanya menampilkan booking yang DP-nya sudah diverifikasi
    // Booking dengan dp_status='unpaid'/'uploaded' tetap di halaman Inquiry
    where += " AND b.dp_status = 'paid' AND b.status NOT IN ('post_production', 'delivered', 'completed', 'cancelled')";
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM bookings b WHERE ${where}`).get(params).c;
  const rows = db.prepare(`
    SELECT b.*, p.name as package_name,
           (SELECT COUNT(*) FROM booking_moodboards bm WHERE bm.booking_id = b.id AND bm.items != '[]' AND bm.items != '') > 0 AS has_moodboard,
           a.id as assignment_id, f.name as fg_name, a.status as assignment_status,
           f.access_code as fg_code, f.phone as fg_phone,
           d.qc_status as qc_status, d.qc_notes as qc_notes
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    LEFT JOIN deliverables d ON d.assignment_id = a.id
    WHERE ${where}
    ORDER BY b.graduation_date ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  rows.forEach(r => ensureBookingToken(r, db));
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

bookingsRouter.get('/:id', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, p.name as package_name, p.fg_fee as package_fg_fee,
           a.id as assignment_id, a.fg_id, a.status as assignment_status,
           f.name as fg_name, f.phone as fg_phone, f.access_code as fg_code
    FROM bookings b
    LEFT JOIN packages p ON b.package_id = p.id
    LEFT JOIN assignments a ON a.booking_id = b.id
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });
  ensureBookingToken(booking, db);

  // Get deliverables
  const deliverables = db.prepare(`
    SELECT d.*, a.fg_id
    FROM deliverables d
    JOIN assignments a ON d.assignment_id = a.id
    WHERE a.booking_id = ?
  `).all(req.params.id);

  // Get payouts
  const payouts = db.prepare(`
    SELECT p.*
    FROM payouts p
    JOIN assignments a ON p.assignment_id = a.id
    WHERE a.booking_id = ?
  `).all(req.params.id);

  res.json({ ...booking, deliverables, payouts });
});

bookingsRouter.post('/:id/verify-dp', bookingDpValidation, (req, res) => {
  const { dp_amount, dp_bukti_url } = req.body;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Verify amount matches
  if (dp_amount !== booking.dp_amount) {
    return res.status(400).json({ error: `Nominal DP harus ${formatCurrency(booking.dp_amount)}` });
  }

  const isFullPayment = booking.balance_status === 'uploaded' && booking.dp_status === 'uploaded';

  if (isFullPayment) {
    db.prepare(`
      UPDATE bookings 
      SET dp_status = 'paid', 
          balance_status = 'paid',
          dp_verified_by = ?, 
          dp_verified_at = CURRENT_TIMESTAMP, 
          balance_verified_by = ?,
          balance_verified_at = CURRENT_TIMESTAMP,
          dp_bukti_url = ?, 
          balance_bukti_url = ?,
          status = 'confirmed', 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.user.id, dp_bukti_url || '', dp_bukti_url || '', req.params.id);
  } else {
    db.prepare(`
      UPDATE bookings 
      SET dp_status = 'paid', dp_verified_by = ?, dp_verified_at = CURRENT_TIMESTAMP, dp_bukti_url = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, dp_bukti_url || '', req.params.id);
  }

  try {
    db.prepare("UPDATE qris_transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status = 'pending'").run(req.params.id);
  } catch (e) {}

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  ensureBookingToken(updated, db);

  // Generate invoice URL
  const invoiceUrl = `${getBaseUrl(req)}/invoice.html?id=${req.params.id}`;

  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = getTrackingUrl(req, updated);

  let waMessage;
  if (isFullPayment) {
    waMessage = (templates.client_fully_paid || '')
      .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
      .replace('{client_name}', updated.client_name || 'Kak')
      .replace('{booking_id}', updated.id)
      .replace('{invoice_url}', invoiceUrl)
      .replace('{tracking_url}', trackingUrl);
  } else {
    waMessage = (templates.client_dp_verified || '')
      .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
      .replace('{client_name}', updated.client_name || 'Kak')
      .replace('{booking_id}', updated.id)
      .replace('{contract_url}', invoiceUrl)
      .replace('{invoice_url}', invoiceUrl)
      .replace('{tracking_url}', trackingUrl)
      .replace('{admin_phone}', settings.adminPhone);
  }

  const waLink = `https://api.whatsapp.com/send?phone=${updated.client_phone}&text=${encodeURIComponent(waMessage)}`;

  // ── Otomasi: Buat struktur folder Drive di background (tidak blocking response) ──
  // Hanya dibuat jika belum ada drive_parent_url dan master folder sudah dikonfigurasi
  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  if (masterFolderId && !updated.drive_parent_url) {
    driveFolder.createBookingFolderStructure(updated, masterFolderId)
      .then(folderMap => {
        db.prepare(`
          UPDATE bookings
          SET drive_parent_url = ?, staging_drive_url = ?, highlight_drive_url = ?, download_url = ?, moodboard_drive_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          folderMap.drive_parent_url,
          folderMap.staging_drive_url,
          folderMap.highlight_drive_url,
          folderMap.download_url,
          folderMap.moodboard_drive_url,
          updated.id
        );
        console.log(`[DriveFolder] ✓ Folder Drive otomatis dibuat untuk Booking #${updated.id}: ${folderMap.parent_folder_name}`);
      })
      .catch(err => {
        console.error(`[DriveFolder] ✗ Gagal buat folder untuk Booking #${updated.id}:`, err.message);
      });
  }

  // Send official DP Verified & Contract Email to Client
  if (updated.client_email) {
    try {
      emailService.sendClientDpVerifiedEmail({
        booking: updated,
        trackingUrl
      }).catch(err => {
        console.warn('[DpVerifiedEmail Warn]:', err.message);
      });
    } catch (e) {}
  }

  res.json({ booking: updated, invoice_url: invoiceUrl, wa_link: waLink });
});

// POST /api/admin/bookings/:id/create-drive — Pemicu pembuatan/pemetaan ulang folder Drive otomatis
bookingsRouter.post('/:id/create-drive', async (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  if (!masterFolderId) {
    return res.status(400).json({ error: 'Master Folder ID belum dikonfigurasi di Settings Admin.' });
  }

  try {
    const folderMap = await driveFolder.createBookingFolderStructure(booking, masterFolderId);
    db.prepare(`
      UPDATE bookings
      SET drive_parent_url = ?, staging_drive_url = ?, highlight_drive_url = ?, download_url = ?, moodboard_drive_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      folderMap.drive_parent_url,
      folderMap.staging_drive_url,
      folderMap.highlight_drive_url,
      folderMap.download_url,
      folderMap.moodboard_drive_url,
      bookingId
    );
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    res.json({
      success: true,
      message: `✓ Folder Google Drive berhasil digenerate untuk ${updated.client_name}!`,
      booking: updated,
      folderMap
    });
  } catch (err) {
    console.error(`[DriveFolder Error for Booking #${bookingId}]:`, err);
    res.status(500).json({ error: 'Gagal membuat folder Google Drive: ' + err.message });
  }
});

bookingsRouter.post('/:id/upload-to-drive', async (req, res) => {
  const bookingId = req.params.id;
  const target = (req.query.target || (req.body && req.body.target) || 'staging').toLowerCase();

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan.' });

  // Get file from express-fileupload (req.files) or multer (req.file)
  let fileBuffer = null;
  let fileName = null;
  let mimeType = null;

  if (req.files) {
    const uploadedFile = req.files.file || Object.values(req.files)[0];
    if (uploadedFile) {
      fileName = uploadedFile.name;
      mimeType = uploadedFile.mimetype;
      if (uploadedFile.data && uploadedFile.data.length > 0) {
        fileBuffer = uploadedFile.data;
      } else if (uploadedFile.tempFilePath) {
        const fs = require('fs');
        fileBuffer = fs.readFileSync(uploadedFile.tempFilePath);
      }
    }
  } else if (req.file) {
    fileName = req.file.originalname;
    mimeType = req.file.mimetype;
    fileBuffer = req.file.buffer;
  }

  if (!fileBuffer || !fileName) {
    return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
  }

  let folderUrl = null;
  if (target === 'staging') {
    folderUrl = booking.staging_drive_url;
  } else if (target === 'highlight') {
    folderUrl = booking.highlight_drive_url;
  } else if (target === 'final') {
    folderUrl = booking.download_url;
  } else {
    folderUrl = booking.drive_parent_url;
  }

  if (!folderUrl) {
    return res.status(400).json({ error: `Folder Google Drive ${target} belum ter-mapping untuk booking ini.` });
  }

  try {
    const uploadedDriveFile = await driveFolder.uploadFileToFolder(
      folderUrl,
      fileName,
      mimeType,
      fileBuffer
    );

    // Automation Pipeline Triggers
    if (target === 'staging') {
      const fileId = uploadedDriveFile?.id || String(Date.now());

      // Atomic Transaction: Fresh read + append to prevent concurrency race condition
      const appendStaging = db.transaction((bId, fId, fName) => {
        const freshBooking = db.prepare('SELECT staging_files, staged_photo_count FROM bookings WHERE id = ?').get(bId);
        let existing = [];
        try { existing = JSON.parse(freshBooking?.staging_files || '[]'); } catch (e) { }
        if (!existing.some(f => (f.fileId && f.fileId === fId) || (f.name && f.name === fName) || (f.filename && f.filename === fName))) {
          existing.push({ fileId: fId, name: fName, filename: fName, uploaded_at: new Date().toISOString() });
        }
        db.prepare("UPDATE bookings SET staging_files = ?, selection_status = 'staged', staged_photo_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(JSON.stringify(existing), existing.length, bId);
        return existing.length;
      });

      appendStaging(bookingId, fileId, fileName);

      if (req.query.auto_scrape === 'true') {
        try {
          await driveImporter.scrapeAndStoreFileList(bookingId, booking.staging_drive_url);
        } catch (e) {
          console.warn('[AutoScrape Staging Warn]:', e.message);
        }
      }
    } else if (target === 'highlight') {
      db.prepare("UPDATE bookings SET highlight_photo_count = COALESCE(highlight_photo_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(bookingId);
    } else if (target === 'final') {
      db.prepare("UPDATE bookings SET final_photo_count = COALESCE(final_photo_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(bookingId);
    }

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    res.json({
      success: true,
      message: `✓ ${fileName} berhasil ter-upload ke Google Drive!`,
      file: uploadedDriveFile,
      booking: updatedBooking
    });
  } catch (err) {
    console.error(`[DirectUploadError for Booking #${bookingId}]:`, err);
    res.status(500).json({ error: 'Gagal mengunggah file ke Google Drive: ' + err.message });
  }
});

// ============ SETTINGS DRIVE — Dipindahkan ke src/routes/admin/settings.js ============

bookingsRouter.post('/:id/verify-balance', bookingBalanceValidation, (req, res) => {
  const { balance_bukti_url } = req.body;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.balance_status === 'paid') {
    return res.status(400).json({ error: 'Sudah lunas' });
  }

  db.prepare(`
    UPDATE bookings 
    SET balance_status = 'paid', balance_verified_by = ?, balance_verified_at = CURRENT_TIMESTAMP, balance_bukti_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user.id, balance_bukti_url || '', req.params.id);

  try {
    db.prepare("UPDATE qris_transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status = 'pending'").run(req.params.id);
  } catch (e) {}

  // Jika sesi foto sudah selesai dan pembayaran lunas, otomatis masuk Post Production
  const assignDone = db.prepare("SELECT id FROM assignments WHERE booking_id = ? AND status IN ('done', 'completed')").get(req.params.id);
  if (assignDone || booking.is_session_done) {
    db.prepare("UPDATE bookings SET status = 'post_production', is_session_done = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  }

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  ensureBookingToken(updated, db);

  // Save static final invoice snapshot archive to /uploads/invoices-client/
  try {
    saveFinalInvoiceSnapshot(updated, db);
  } catch (err) {
    console.error('Failed to save final invoice snapshot archive:', err);
  }

  const invoiceUrl = `${getBaseUrl(req)}/invoice.html?id=${req.params.id}`;

  // WA.me links
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = getTrackingUrl(req, updated);

  let waMessageClient = (templates.client_fully_paid || '')
    .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
    .replace('{client_name}', updated.client_name || 'Kak')
    .replace('{booking_id}', updated.id)
    .replace('{invoice_url}', invoiceUrl)
    .replace('{tracking_url}', trackingUrl);

  const waLinkClient = `https://api.whatsapp.com/send?phone=${updated.client_phone}&text=${encodeURIComponent(waMessageClient)}`;

  // Notify admin
  let waMessageAdmin = `✅ Pelunasan Terverifikasi\nBooking ${updated.id} (${updated.client_name}) SELESAI.`;
  const waLinkAdmin = `https://api.whatsapp.com/send?phone=${settings.adminPhone}&text=${encodeURIComponent(waMessageAdmin)}`;

  // Send official Full Payment Receipt Email to Client
  if (updated.client_email) {
    try {
      emailService.sendClientBalancePaidEmail({
        booking: updated,
        trackingUrl
      }).catch(err => {
        console.warn('[BalancePaidEmail Warn]:', err.message);
      });
    } catch (e) {}
  }

  res.json({ booking: updated, invoice_url: invoiceUrl, wa_link_client: waLinkClient, wa_link_admin: waLinkAdmin });
});

// ============ DIRECT EDIT BOOKING SCHEDULE & DETAILS ============
bookingsRouter.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('graduation_date').optional().isISO8601().withMessage('Tanggal tidak valid (YYYY-MM-DD)'),
  body('shooting_time').optional().trim().matches(/^([01]?\d|2[0-3]):[0-5]\d$/).withMessage('Jam mulai tidak valid (HH:MM)'),
  body('location').optional().trim(),
  body('university').optional().trim(),
  body('city').optional().trim(),
  body('duration_hours').optional().isInt({ min: 1, max: 12 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const { graduation_date, shooting_time, location, university, city, duration_hours } = req.body;
  const updates = [];
  const params = [];

  if (graduation_date) { updates.push('graduation_date = ?'); params.push(graduation_date); }
  if (shooting_time) { updates.push('shooting_time = ?'); params.push(shooting_time); }
  if (location !== undefined) { updates.push('location = ?'); params.push(location); }
  if (university !== undefined) { updates.push('university = ?'); params.push(university); }
  if (city !== undefined) { updates.push('city = ?'); params.push(city); }
  if (duration_hours) { updates.push('duration_hours = ?'); params.push(duration_hours); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Tidak ada data yang diubah' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // If graduation_date or shooting_time changed, update linked FG schedule if exists
  const targetDate = graduation_date || booking.graduation_date;
  const targetTime = shooting_time || booking.shooting_time || '09:00';
  const targetDuration = duration_hours || booking.duration_hours || 2;

  const assignment = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(req.params.id);
  let conflictWarning = null;

  if (assignment && assignment.fg_id) {
    // Update FG schedule date
    db.prepare(`
      INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
      VALUES (?, ?, 'booked', ?, 'Booking Updated #' || ?)
    `).run(assignment.fg_id, targetDate, req.params.id, req.params.id);

    // Check if new schedule conflicts with FG's other jobs
    const conflictCheck = checkFgConflict(db, assignment.fg_id, targetDate, targetTime, targetDuration, req.params.id);
    if (conflictCheck.hasConflict) {
      conflictWarning = `Peringatan: FG ID #${assignment.fg_id} memiliki bentrok jadwal di jam tersebut. Pertimbangkan untuk memindahkan ke FG lain.`;
    }
  }

  const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json({
    success: true,
    message: 'Jadwal booking berhasil diperbarui.',
    booking: updatedBooking,
    warning: conflictWarning
  });
});

// ============ BOOKING STATUS UPDATE ============
function handleStatusUpdate(req, res) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const { status } = req.body;

  // Validate transition
  const validTransitions = {
    'confirmed': ['shooting', 'post_production', 'cancelled'],
    'shooting': ['post_production', 'uploaded', 'delivered', 'completed'],
    'post_production': ['uploaded', 'delivered', 'completed', 'cancelled'],
    'uploaded': ['delivered', 'completed', 'cancelled'],
    'delivered': ['completed', 'cancelled']
  };

  if (validTransitions[booking.status] && !validTransitions[booking.status].includes(status)) {
    return res.status(400).json({ error: `Cannot change from ${booking.status} to ${status}` });
  }

  // Gate 2: Tidak bisa masuk Post Production jika pelunasan belum diverifikasi
  if (status === 'post_production') {
    if (booking.balance_amount > 0 && booking.balance_status !== 'paid') {
      return res.status(400).json({
        error: 'Pelunasan harus diverifikasi terlebih dahulu sebelum booking dapat masuk ke Post Produksi.'
      });
    }
    db.prepare("UPDATE bookings SET status = 'post_production', is_session_done = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE assignments SET status = 'done', shoot_end_at = COALESCE(shoot_end_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status != 'cancelled'").run(req.params.id);
  } else {
    db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  }

  if (status === 'cancelled') {
    try {
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(req.params.id);
      db.prepare("UPDATE assignments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status != 'cancelled'").run(req.params.id);
    } catch (e) {
      console.warn('[StatusUpdate] Gagal cancel assignment/schedule:', e.message);
    }
  }

  if (status === 'completed') {
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    try {
      saveFinalInvoiceSnapshot(updated, db);
    } catch (err) {
      console.error('Failed to save final invoice snapshot archive:', err);
    }
  }

  const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: `Status booking #${req.params.id} berhasil diperbarui ke ${status}.`, booking: updatedBooking });
}

const statusValidationMiddleware = [
  param('id').isInt({ min: 1 }),
  body('status').isIn(['confirmed', 'shooting', 'post_production', 'uploaded', 'delivered', 'completed', 'cancelled']),
  handleValidation
];

bookingsRouter.post('/:id/status', statusValidationMiddleware, handleStatusUpdate);
bookingsRouter.put('/:id/status', statusValidationMiddleware, handleStatusUpdate);
bookingsRouter.patch('/:id/status', statusValidationMiddleware, handleStatusUpdate);

// ============ CANCEL BOOKING ============
bookingsRouter.post('/:id/cancel', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Data booking / client tidak ditemukan' });

  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'Booking sudah berstatus batal' });
  }

  try {
    db.transaction(() => {
      // 1. Set booking status to cancelled
      db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

      // 2. Free FG schedule entry for this booking
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(bookingId);

      // 3. Mark active assignments as cancelled
      db.prepare("UPDATE assignments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status != 'cancelled'").run(bookingId);
    })();

    res.json({ success: true, message: 'Booking berhasil dibatalkan. Rekam transaksi/DP tetap disimpan untuk keuangan, dan jadwal fotografer telah dibebaskan.', status: 'cancelled' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Gagal membatalkan booking: ' + err.message });
  }
});

// Admin manually marks photo shoot session as completed (Fleksibel: Admin or Freelancer can trigger)
bookingsRouter.post('/:id/mark-session-done', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const now = new Date().toISOString();

  // Update assignment status if exists
  db.prepare(`
    UPDATE assignments 
    SET status = 'done', shoot_end_at = COALESCE(shoot_end_at, ?), updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = ? AND status IN ('confirmed', 'assigned', 'pending')
  `).run(now, booking.id);

  // Jika sudah lunas 100% (Full Payment), langsung masuk post_production.
  // Jika masih DP 50%, tetap di status 'shooting' (atau selesai sesi) dengan is_session_done = 1 menunggu pelunasan.
  const isPaid = booking.balance_status === 'paid' || Number(booking.balance_amount || 0) === 0;
  const targetStatus = isPaid ? 'post_production' : 'shooting';

  db.prepare(`
    UPDATE bookings 
    SET is_session_done = 1, status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(targetStatus, booking.id);

  res.json({
    success: true,
    message: isPaid 
      ? `Sesi pemotretan selesai & pembayaran lunas! Booking #${booking.id} (${booking.client_name}) langsung masuk ke Post Production ✅`
      : `Sesi pemotretan selesai! Booking #${booking.id} (${booking.client_name}) menunggu pelunasan sebelum masuk ke Post Production.`,
    is_session_done: 1,
    status: targetStatus
  });
});

// ============ DELIVER ============
bookingsRouter.post('/:id/deliver', [
  param('id').isInt({ min: 1 }),
  body('download_url').trim().notEmpty().withMessage('Link download wajib'),
  body('password').optional().trim().isLength({ max: 20 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });
  if (booking.status !== 'shooting') return res.status(400).json({ error: 'Booking harus status shooting' });
  if (booking.balance_status !== 'paid') return res.status(400).json({ error: 'Pelunasan harus diverifikasi dulu' });

  const password = req.body.password || Math.random().toString(36).slice(2, 8).toUpperCase();
  const downloadUrl = req.body.download_url;

  // Save as deliverable - match actual database schema
  const assignment = db.prepare('SELECT id, fg_id FROM assignments WHERE booking_id = ?').get(req.params.id);
  if (!assignment) return res.status(400).json({ error: 'Assignment tidak ditemukan' });

  const delResult = db.prepare(`
      INSERT INTO deliverables (assignment_id, preview_url, total_photos, qc_status, delivered_at)
      VALUES (?, ?, 0, 'pending', CURRENT_TIMESTAMP)
    `).run(assignment.id, downloadUrl);

  // Update booking status
  db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('delivered', req.params.id);
  db.prepare("UPDATE assignments SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND status != 'done'").run(req.params.id);

  // WA notification - handle missing templates gracefully
  const templates = getWaTemplates() || {};
  const settings = getSettings() || { companyName: 'Wisuda.', adminPhone: '+628****7890', client_phone: booking?.client_phone || '' };

  let waClient = templates?.client_delivered
    ? templates.client_delivered
      .replace('{booking_id}', booking.id)
      .replace('{download_url}', downloadUrl)
      .replace('{company_name}', settings.companyName)
    : `📸 Hasil foto Booking #${booking.id} (${booking.client_name}) sudah dikirim`;

  const waLinkClient = `https://api.whatsapp.com/send?phone=${booking.client_phone || settings.adminPhone}&text=${encodeURIComponent(waClient)}`;

  res.json({
    status: 'delivered',
    download_url: downloadUrl,
    password,
    wa_link_client: waLinkClient
  });
});

bookingsRouter.post('/:id/assign-fg', [
  param('id').isInt({ min: 1 }),
  body('fg_id').isInt({ min: 1 }),
  body('shooting_time').optional().trim(),
  body('duration_hours').optional().isInt({ min: 1, max: 12 }),
  body('location').optional().trim().isLength({ max: 200 }),
  body('brief').optional().trim().isLength({ max: 500 }),
  body('fg_fee').optional().isInt({ min: 0 }),
  handleValidation
], (req, res) => {
  const { fg_id, shooting_time, duration_hours, location, brief, fg_fee } = req.body;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.dp_status !== 'paid') {
    return res.status(400).json({ error: 'DP pembayaran harus diverifikasi lunas oleh admin sebelum Assign FG' });
  }

  const fg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND active = 1').get(fg_id);
  if (!fg) return res.status(400).json({ error: 'FG tidak ditemukan atau tidak aktif' });

  // Check existing assignment
  const existing = db.prepare('SELECT * FROM assignments WHERE booking_id = ?').get(req.params.id);
  if (existing) return res.status(400).json({ error: 'Booking sudah punya FG assignment' });

  // Calculate FG Fee based on priority hierarchy
  let finalFgFee = 0;
  if (fg_fee !== undefined && fg_fee !== null && fg_fee !== '') {
    finalFgFee = parseInt(fg_fee);
  } else if (fg.default_rate && fg.default_rate > 0) {
    finalFgFee = fg.default_rate;
  } else {
    const pkg = db.prepare('SELECT fg_fee FROM packages WHERE id = ?').get(booking.package_id);
    finalFgFee = pkg ? pkg.fg_fee : 0;
  }

  // Update booking with shooting details
  const updates = [];
  const bParams = [];
  if (shooting_time) { updates.push('shooting_time = ?'); bParams.push(shooting_time); }
  if (duration_hours) { updates.push('duration_hours = ?'); bParams.push(duration_hours); }
  if (location) { updates.push('location = ?'); bParams.push(location); }
  if (updates.length > 0) {
    bParams.push(req.params.id);
    db.prepare(`UPDATE bookings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...bParams);
  }

  const result = db.prepare(`
    INSERT INTO assignments (booking_id, fg_id, brief, fg_fee, upload_deadline, offer_status, status)
    VALUES (?, ?, ?, ?, date(?, '+1 day'), 'accepted', 'confirmed')
  `).run(req.params.id, fg_id, brief || '', finalFgFee, booking.graduation_date);

  const assignment = db.prepare(`
    SELECT a.*, f.name as fg_name, f.phone as fg_phone
    FROM assignments a
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  // Generate WA.me link for FG
  const templates = getWaTemplates();
  const settings = getSettings();
  const portalUrl = `${getBaseUrl(req)}/freelance-portal.html?code=${fg.access_code}&assignment=${assignment.id}`;
  const waMessage = (templates.fg_assigned || '')
      .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
      .replace('{client_name}', booking.client_name)
      .replace('{location}', booking.location || '-')
      .replace('{university}', booking.university || '-')
      .replace('{shooting_time}', booking.shooting_time || 'TBD')
      .replace('{duration_hours}', booking.duration_hours || booking.shooting_duration || '-')
      .replace('{admin_phone}', settings.adminPhone || '')
      .replace('{assignment_id}', assignment.id)
      .replace('{portal_url}', portalUrl);

  const waLink = `https://api.whatsapp.com/send?phone=${fg.phone}&text=${encodeURIComponent(waMessage)}`;

  // Send assignment email notification to FG if email is configured
  if (fg.email) {
    try {
      const emailService = require('../../services/email.service');
      emailService.sendAssignmentEmail({ fg, booking, assignment, portalUrl }).catch(err => {
        console.warn('[AssignEmail Warn]:', err.message);
      });
    } catch (e) { }
  }

  res.status(201).json({ assignment, wa_link: waLink, portal_url: portalUrl, portal_enabled: true });
});

// ============ REASSIGN / SWITCH FG FLEKSIBEL ============
bookingsRouter.post('/:id/reassign-fg', [
  param('id').isInt({ min: 1 }),
  body('new_fg_id').isInt({ min: 1 }),
  body('shooting_time').optional().trim(),
  body('duration_hours').optional().isInt({ min: 1, max: 12 }),
  body('location').optional().trim().isLength({ max: 200 }),
  body('brief').optional().trim().isLength({ max: 500 }),
  body('fg_fee').optional().isInt({ min: 0 }),
  body('reason').optional().trim(),
  handleValidation
], (req, res) => {
  const { new_fg_id, shooting_time, duration_hours, location, brief, fg_fee, reason } = req.body;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  const newFg = db.prepare('SELECT * FROM freelancers WHERE id = ? AND active = 1').get(new_fg_id);
  if (!newFg) return res.status(400).json({ error: 'FG baru tidak ditemukan atau tidak aktif' });

  // Release current assignment
  const oldAssignment = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(req.params.id);
  if (oldAssignment) {
    db.prepare(`
      UPDATE assignments 
      SET status = 'cancelled', offer_status = 'reassigned', decline_reason = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reason || 'Reassigned by Admin', oldAssignment.id);

    // Release old FG schedule
    db.prepare("DELETE FROM fg_schedules WHERE fg_id = ? AND booking_id = ?").run(oldAssignment.fg_id, req.params.id);
  }

  // Calculate FG Fee
  let finalFgFee = 0;
  if (fg_fee !== undefined && fg_fee !== null && fg_fee !== '') {
    finalFgFee = parseInt(fg_fee);
  } else if (newFg.default_rate && newFg.default_rate > 0) {
    finalFgFee = newFg.default_rate;
  } else {
    const pkg = db.prepare('SELECT fg_fee FROM packages WHERE id = ?').get(booking.package_id);
    finalFgFee = pkg ? pkg.fg_fee : 0;
  }

  // Update booking details if provided
  const updates = [];
  const bParams = [];
  if (shooting_time) { updates.push('shooting_time = ?'); bParams.push(shooting_time); }
  if (duration_hours) { updates.push('duration_hours = ?'); bParams.push(duration_hours); }
  if (location) { updates.push('location = ?'); bParams.push(location); }
  if (updates.length > 0) {
    bParams.push(req.params.id);
    db.prepare(`UPDATE bookings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...bParams);
  }

  // Create new assignment directly confirmed
  const result = db.prepare(`
    INSERT INTO assignments (booking_id, fg_id, brief, fg_fee, upload_deadline, offer_status, status)
    VALUES (?, ?, ?, ?, date(?, '+1 day'), 'accepted', 'confirmed')
  `).run(req.params.id, new_fg_id, brief || '', finalFgFee, booking.graduation_date);

  // Lock schedule in fg_schedules for new FG
  db.prepare(`
    INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
    VALUES (?, ?, 'booked', ?, 'Wisuda Booking #' || ?)
  `).run(new_fg_id, booking.graduation_date, req.params.id, req.params.id);

  const newAssignment = db.prepare(`
    SELECT a.*, f.name as fg_name, f.phone as fg_phone
    FROM assignments a
    LEFT JOIN freelancers f ON a.fg_id = f.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  const settings = getSettings();
  const portalUrl = `${getBaseUrl(req)}/freelance-portal.html?code=${newFg.access_code}&assignment=${newAssignment.id}`;
  let waMessage = `Halo Kak ${newFg.name}! 👋\n\nAda pengalihan penugasan pemotretan wisuda baru untuk Anda:\n\nClient: ${booking.client_name}\nTanggal: ${booking.graduation_date}\nJam: ${shooting_time || booking.shooting_time || '-'}\nLokasi: ${location || booking.location || '-'}\n\nMohon buka portal untuk menerima/mengonfirmasi penugasan:\n${portalUrl}`;

  const waLink = `https://api.whatsapp.com/send?phone=${newFg.phone}&text=${encodeURIComponent(waMessage)}`;

  // Send assignment email notification to new FG if email is configured
  if (newFg.email) {
    try {
      const emailService = require('../../services/email.service');
      emailService.sendAssignmentEmail({ fg: newFg, booking, assignment: newAssignment, portalUrl }).catch(err => {
        console.warn('[ReassignEmail Warn]:', err.message);
      });
    } catch (e) { }
  }

  res.status(200).json({
    success: true,
    message: `Penugasan berhasil dialihkan ke ${newFg.name}`,
    assignment: newAssignment,
    wa_link: waLink,
    portal_url: portalUrl
  });
});

// ============ BULK CHECKBOX OPERATIONS ============
bookingsRouter.post('/bulk-delete', [
  body('ids').isArray({ min: 1 }).withMessage('Pilih minimal 1 client untuk dihapus'),
  handleValidation
], (req, res) => {
  const { ids } = req.body;
  let deletedCount = 0;

  const deleteStmt = db.transaction((bookingIds) => {
    for (const id of bookingIds) {
      db.prepare("DELETE FROM fg_schedules WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM deliverables WHERE assignment_id IN (SELECT id FROM assignments WHERE booking_id = ?)").run(id);
      db.prepare("DELETE FROM payouts WHERE assignment_id IN (SELECT id FROM assignments WHERE booking_id = ?)").run(id);
      db.prepare("DELETE FROM assignments WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM portfolio_items WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM reschedule_requests WHERE booking_id = ?").run(id);
      db.prepare("DELETE FROM booking_moodboards WHERE booking_id = ?").run(id);
      const res = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
      if (res.changes > 0) deletedCount++;
    }
  });

  try {
    deleteStmt(ids);
    res.json({
      success: true,
      message: `${deletedCount} data client berhasil dihapus bersih!`,
      deleted_count: deletedCount
    });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus massal: ' + e.message });
  }
});

bookingsRouter.post('/bulk-verify-dp', [
  body('ids').isArray({ min: 1 }).withMessage('Pilih minimal 1 client'),
  handleValidation
], (req, res) => {
  const { ids } = req.body;
  let verifiedCount = 0;

  const verifyStmt = db.transaction((bookingIds) => {
    for (const id of bookingIds) {
      const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
      if (b && b.dp_status !== 'paid') {
        const dpAmt = b.dp_amount || Math.round(b.total_price * 0.5);
        const balAmt = b.total_price - dpAmt;
        db.prepare(`
          UPDATE bookings
          SET dp_status = 'paid', dp_verified_by = ?, dp_verified_at = CURRENT_TIMESTAMP,
              dp_amount = ?, balance_amount = ?, status = 'confirmed',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(req.user.id, dpAmt, balAmt, id);
        ensureBookingToken(b, db);
        verifiedCount++;
      }
    }
  });

  try {
    verifyStmt(ids);
    res.json({
      success: true,
      message: `${verifiedCount} pembayaran DP client berhasil diverifikasi!`,
      verified_count: verifiedCount
    });
  } catch (e) {
    res.status(500).json({ error: 'Gagal memverifikasi DP massal: ' + e.message });
  }
});

bookingsRouter.post('/bulk-assign-fg', [
  body('ids').isArray({ min: 1 }).withMessage('Pilih minimal 1 client'),
  body('fg_id').isInt({ min: 1 }).withMessage('Pilih fotografer terlebih dahulu'),
  body('fg_fee').optional().isInt({ min: 0 }),
  handleValidation
], (req, res) => {
  const { ids, fg_id, fg_fee } = req.body;

  const fg = db.prepare("SELECT * FROM freelancers WHERE id = ? AND active = 1").get(fg_id);
  if (!fg) return res.status(400).json({ error: 'FG tidak ditemukan atau tidak aktif' });

  // 1. Fetch selected bookings
  const placeholders = ids.map(() => '?').join(',');
  const bookings = db.prepare(`SELECT * FROM bookings WHERE id IN (${placeholders})`).all(...ids);
  if (bookings.length === 0) return res.status(400).json({ error: 'Data booking tidak ditemukan' });

  // 2. DETEKSI BENTROK JAM CERDAS (Internal pairwise overlap check & FG schedule check)
  const conflicts = [];

  // 2a. Pairwise overlap check among selected bookings for the same date
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const b1 = bookings[i];
      const b2 = bookings[j];

      if (b1.graduation_date === b2.graduation_date) {
        const time1 = b1.shooting_time || '09:00';
        const dur1 = b1.duration_hours || 2;
        const time2 = b2.shooting_time || '09:00';
        const dur2 = b2.duration_hours || 2;

        if (checkTimeOverlap(time1, dur1, time2, dur2)) {
          conflicts.push(`Jam tumpang tindih antara ${b1.client_name} (${b1.graduation_date} ${time1}) dan ${b2.client_name} (${b2.graduation_date} ${time2})`);
        }
      }
    }
  }

  // 2b. Check conflict against FG's existing schedules in DB
  for (const b of bookings) {
    const time = b.shooting_time || '09:00';
    const dur = b.duration_hours || 2;
    const cCheck = checkFgConflict(db, fg_id, b.graduation_date, time, dur, b.id);
    if (cCheck.hasConflict) {
      conflicts.push(`FG ${fg.name} sudah memiliki jadwal lain pada ${b.graduation_date} jam ${time} (Booking #${cCheck.conflictingBooking.id} - ${cCheck.conflictingBooking.client_name})`);
    }
  }

  if (conflicts.length > 0) {
    return res.status(400).json({
      error: `Gagal Assign Massal! Terdeteksi ${conflicts.length} bentrok jam:`,
      conflicts
    });
  }

  // 3. Execution — All time slots are clear!
  let assignedCount = 0;

  const assignStmt = db.transaction((targetBookings) => {
    for (const b of targetBookings) {
      // Calculate FG fee
      let finalFee = 0;
      if (fg_fee !== undefined && fg_fee !== null && fg_fee !== '') {
        finalFee = parseInt(fg_fee);
      } else if (fg.default_rate && fg.default_rate > 0) {
        finalFee = fg.default_rate;
      } else {
        const pkg = db.prepare('SELECT fg_fee FROM packages WHERE id = ?').get(b.package_id);
        finalFee = pkg ? pkg.fg_fee : 0;
      }

      // Cancel previous assignment if any
      db.prepare("UPDATE assignments SET status = 'cancelled', offer_status = 'reassigned' WHERE booking_id = ? AND status != 'cancelled'").run(b.id);
      db.prepare("DELETE FROM fg_schedules WHERE fg_id = ? AND booking_id = ?").run(fg_id, b.id);

      // Create assignment (Directly accepted & confirmed by Admin)
      db.prepare(`
        INSERT INTO assignments (booking_id, fg_id, fg_fee, upload_deadline, offer_status, status)
        VALUES (?, ?, ?, date(?, '+1 day'), 'accepted', 'accepted')
      `).run(b.id, fg_id, finalFee, b.graduation_date);

      // Lock schedule
      db.prepare(`
        INSERT OR REPLACE INTO fg_schedules (fg_id, date, status, booking_id, notes)
        VALUES (?, ?, 'booked', ?, 'Wisuda Booking #' || ?)
      `).run(fg_id, b.graduation_date, b.id, b.id);

      assignedCount++;
    }
  });

  try {
    assignStmt(bookings);
    res.json({
      success: true,
      message: `${assignedCount} client berhasil ditugaskan ke FG ${fg.name} secara massal!`,
      assigned_count: assignedCount
    });
  } catch (e) {
    res.status(500).json({ error: 'Gagal Assign Massal: ' + e.message });
  }
});

bookingsRouter.post('/:id/contract', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Placeholder - PDF generation will be in service
  const contractUrl = path.join(config.uploadPath, 'contracts', `contract_${booking.id}.pdf`);

  db.prepare('UPDATE bookings SET contract_url = ?, contract_signed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(contractUrl, req.params.id);

  res.json({ contract_url: contractUrl });
});

// PUT /api/admin/bookings/:id/drive-mapping (Map Google Drive folder links in a single setup)
bookingsRouter.put('/:id/drive-mapping', [
  param('id').isInt({ min: 1 }),
  body('drive_parent_url').optional().trim(),
  body('staging_drive_url').optional().trim(),
  body('highlight_drive_url').optional().trim(),
  body('download_url').optional().trim(),
  body('moodboard_drive_url').optional().trim(),
  handleValidation
], (req, res) => {
  const { id } = req.params;
  const { drive_parent_url, staging_drive_url, highlight_drive_url, download_url, moodboard_drive_url } = req.body;

  const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  try {
    db.prepare(`
      UPDATE bookings 
      SET drive_parent_url = ?, 
          staging_drive_url = ?, 
          highlight_drive_url = ?, 
          download_url = ?, 
          moodboard_drive_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(drive_parent_url || null, staging_drive_url || null, highlight_drive_url || null, download_url || null, moodboard_drive_url || null, id);

    res.json({ success: true, message: 'Google Drive Mapping berhasil disimpan.' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyimpan Drive Mapping: ' + e.message });
  }
});

// POST /api/admin/bookings/:id/transfer-drive-ownership — Manual transfer ownership trigger
bookingsRouter.post('/:id/transfer-drive-ownership', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking tidak ditemukan' });
    }

    if (booking.drive_cleanup_status === 'trashed') {
      return res.status(400).json({ error: 'Folder sudah dipindahkan ke Trash dan tidak bisa ditransfer lagi' });
    }

    if (!booking.drive_parent_url) {
      return res.status(400).json({ error: 'Booking ini belum memiliki Drive parent folder' });
    }

    const targetEmail = (req.body.email || booking.client_email || '').trim();
    if (!targetEmail) {
      return res.status(400).json({ error: 'Email Google Drive klien belum diisi' });
    }

    const folderMatch = booking.drive_parent_url.match(/\/folders\/([a-zA-Z0-9_-]+)/i) || booking.drive_parent_url.match(/id=([a-zA-Z0-9_-]+)/i);
    const folderId = folderMatch ? folderMatch[1] : null;

    if (!folderId) {
      return res.status(400).json({ error: 'URL Google Drive tidak valid' });
    }

    const driveFolderService = require('../../services/drive-folder.service');

    // Update DB status to 'transferred' when Admin confirms invite
    const notes = `Pemindahan kepemilikan folder Google Drive telah diselesaikan oleh Admin ke ${targetEmail}.`;
    db.prepare(`
      UPDATE bookings
      SET drive_cleanup_status = 'transferred', drive_cleanup_notes = ?, client_email = ?
      WHERE id = ?
    `).run(notes, targetEmail, bookingId);

    // Prepare WA notification link
    const templates = getWaTemplates();
    const settings = getSettings();
    let waMsg = (templates.drive_manual_transfer || templates.drive_expired_cleanup || '')
      .replace('{client_name}', booking.client_name || 'Client')
      .replace('{booking_id}', booking.id)
      .replace('{drive_expiry_date}', booking.drive_expiry_date || new Date().toISOString().slice(0, 10))
      .replace('{client_email}', targetEmail)
      .replace('{company_name}', settings.company_name || 'Wisuda Photography');

    let phoneClean = String(booking.client_phone || '').replace(/[^0-9]/g, '');
    if (phoneClean.startsWith('0')) phoneClean = '62' + phoneClean.slice(1);
    const directWaUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(waMsg)}` : null;

    res.json({
      success: true,
      message: `Undangan pemindahan kepemilikan telah ditandai selesai untuk ${targetEmail}`,
      client_email: targetEmail,
      direct_wa_url: directWaUrl
    });
  } catch (err) {
    console.error('Transfer drive ownership error:', err);
    res.status(500).json({ error: 'Gagal mentransfer kepemilikan Drive: ' + err.message });
  }
});

// DELETE /api/admin/bookings/:id (Clean delete client & booking without residual files or records)
bookingsRouter.delete('/:id', async (req, res) => {
  const bookingId = req.params.id;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Data booking / client tidak ditemukan' });

  try {
    // 1. Delete associated portfolio files from Google Drive
    const portfolioItems = db.prepare('SELECT * FROM portfolio_items WHERE booking_id = ?').all(bookingId);
    for (const p of portfolioItems) {
      if (p.cover_photo_url) await driveFolder.deleteDriveFile(p.cover_photo_url);
      if (p.highlight_photos) {
        try {
          const arr = JSON.parse(p.highlight_photos);
          if (Array.isArray(arr)) {
            for (const u of arr) await driveFolder.deleteDriveFile(u);
          }
        } catch {}
      }
    }

    db.transaction(() => {
      // 2. Delete associated assignments, deliverables & payouts
      const assignments = db.prepare('SELECT id FROM assignments WHERE booking_id = ?').all(bookingId);
      assignments.forEach(a => {
        db.prepare('DELETE FROM deliverables WHERE assignment_id = ?').run(a.id);
        db.prepare('DELETE FROM payouts WHERE assignment_id = ?').run(a.id);
      });
      db.prepare('DELETE FROM assignments WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM portfolio_items WHERE booking_id = ?').run(bookingId);



      // 4. Delete associated schedule entries, reschedule requests & moodboards
      db.prepare('DELETE FROM fg_schedules WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM reschedule_requests WHERE booking_id = ?').run(bookingId);
      db.prepare('DELETE FROM booking_moodboards WHERE booking_id = ?').run(bookingId);

      // 5. Save inquiry ID and delete the booking record first (to respect FK constraint on bookings.inquiry_id)
      const inquiryId = booking.inquiry_id;
      db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);

      // 6. Delete booking tokens & inquiry if inquiry exists
      if (inquiryId) {
        db.prepare('DELETE FROM booking_tokens WHERE inquiry_id = ?').run(inquiryId);
        db.prepare('DELETE FROM inquiries WHERE id = ?').run(inquiryId);
      }
    })();

    res.json({ success: true, message: 'Data client & booking telah dihapus bersih secara permanen.' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Gagal menghapus client: ' + err.message });
  }
});

// POST /bookings/:booking_id/activate-gallery — Admin konfirmasi file fisik diterima dari FG & aktifkan galeri seleksi
// Endpoint ini dipanggil saat Admin menerima SD Card/file foto dari FG (Terima File).
// Gate 2 (pelunasan) wajib sudah lulus sebelum berkas dapat diproses lebih lanjut.
bookingsRouter.post('/:booking_id/activate-gallery', (req, res) => {
  try {
    const bookingId = req.params.booking_id;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    let assignment = db.prepare("SELECT * FROM assignments WHERE booking_id = ? AND status != 'cancelled'").get(bookingId);
    if (!assignment) {
      const ins = db.prepare("INSERT INTO assignments (booking_id, status, shoot_end_at) VALUES (?, 'done', CURRENT_TIMESTAMP)").run(bookingId);
      assignment = { id: ins.lastInsertRowid };
    } else {
      db.prepare("UPDATE assignments SET status = 'done', shoot_end_at = COALESCE(shoot_end_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(assignment.id);
    }

    let del = db.prepare('SELECT * FROM deliverables WHERE assignment_id = ?').get(assignment.id);
    if (!del) {
      db.prepare(`
        INSERT INTO deliverables (assignment_id, delivery_type, notes)
        VALUES (?, 'fisik', 'Diterima oleh Admin')
      `).run(assignment.id);
    } else {
      db.prepare("UPDATE deliverables SET delivery_type = 'fisik', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(del.id);
    }

    // Status resmi: post_production + is_session_done = 1
    db.prepare("UPDATE bookings SET status = 'post_production', is_session_done = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

    res.json({ success: true, message: 'File/berkas foto berhasil diterima dari FG & siap diunggah ke Staging!' });
  } catch (err) {
    console.error('Error activating gallery:', err);
    res.status(500).json({ error: 'Gagal mengaktifkan berkas foto: ' + err.message });
  }
});


// POST /bookings/:booking_id/upload-raw-photos — Admin upload Drive staging link untuk seleksi klien
// [Menggantikan /post-production/:id/upload-staging]
bookingsRouter.post('/:booking_id/upload-raw-photos', [
  param('booking_id').isInt({ min: 1 }),
  body('staging_drive_url').isURL().withMessage('Link Drive Staging wajib URL valid'),
  handleValidation
], async (req, res) => {
  const { staging_drive_url } = req.body;
  const bookingId = req.params.booking_id;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status !== 'paid') {
    return res.status(400).json({ error: 'Status pembayaran belum lunas. Pelunasan harus dikonfirmasi terlebih dahulu.' });
  }

  try {
    const files = await driveImporter.scrapeAndStoreFileList(bookingId, staging_drive_url);
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: '⚠️ Folder Google Drive kosong (0 foto). Pastikan folder berisi foto (.jpg/.png).'
      });
    }

    res.json({
      success: true,
      message: `✓ Berhasil memindai ${files.length} foto mentah! Foto siap di-push ke client.`,
      booking: updated
    });
  } catch (err) {
    console.error(`[DriveScraper Error for Booking #${bookingId}]:`, err);
    db.prepare("UPDATE bookings SET selection_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);
    res.status(500).json({ error: 'Gagal memindai folder Google Drive: ' + err.message });
  }
});


// POST /bookings/:booking_id/publish-staging — Admin publishes staging gallery for client selection
bookingsRouter.post('/:booking_id/publish-staging', [
  param('booking_id').isInt({ min: 1 }),
  handleValidation
], async (req, res) => {
  const bookingId = req.params.booking_id;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  // ── Guard Gate 2: Pelunasan harus sudah terverifikasi sebelum galeri dirilis ke klien ─
  if (booking.balance_status !== 'paid' && booking.balance_amount > 0) {
    return res.status(400).json({
      error: 'Gate 2 belum lulus: Pelunasan belum terverifikasi. Verifikasi pembayaran lunas terlebih dahulu sebelum merilis galeri seleksi ke client.'
    });
  }

  // Auto-sync files from Google Drive if staging_drive_url exists to guarantee 100% complete files
  if (booking.staging_drive_url) {
    try {
      await driveImporter.scrapeAndStoreFileList(bookingId, booking.staging_drive_url);
    } catch (e) {
      console.warn('[PublishStaging AutoScrape Warn]:', e.message);
    }
  }

  db.prepare(`
    UPDATE bookings 
    SET selection_status = 'ready', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(bookingId);

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

  // Send Photo Selection Notification Email to Client
  if (updated.client_email) {
    try {
      const trackingUrl = getTrackingUrl(req, updated);
      emailService.sendClientPhotoSelectionEmail({
        booking: updated,
        selectionUrl: trackingUrl,
        quota: updated.max_selected_photos || 15
      }).catch(err => {
        console.warn('[PhotoSelectionEmail Warn]:', err.message);
      });
    } catch (e) {}
  }

  res.json({
    success: true,
    message: 'Galeri seleksi telah dipublikasikan dan siap dipilih oleh client!',
    booking: updated
  });
});


// POST /bookings/:booking_id/unlock-final-editing — Admin kirim link hasil final editing ke klien
bookingsRouter.post('/:booking_id/unlock-final-editing', [
  param('booking_id').isInt({ min: 1 }),
  body('download_url').isURL().withMessage('Download URL wajib'),
  body('password').trim().isLength({ min: 4, max: 50 }).withMessage('Password 4-50 karakter'),
  handleValidation
], (req, res) => {
  const { download_url, password } = req.body;
  const bookingId = req.params.booking_id;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status !== 'paid') {
    return res.status(400).json({ error: 'Gate 2 belum lulus: Pelunasan belum terverifikasi. Tidak dapat mengirim link hasil foto.' });
  }

  // ── Guard is_session_done: Sesi foto harus sudah ditandai selesai ─────────
  if (!booking.is_session_done) {
    return res.status(400).json({ error: 'Sesi pemotretan belum ditandai selesai. Tandai sesi selesai terlebih dahulu.' });
  }

  if (!['post_production', 'delivered'].includes(booking.status)) {
    return res.status(400).json({ error: 'Booking belum memasuki tahap post-production. Aktifkan galeri terlebih dahulu.' });
  }

  // Update booking with download link and set status to delivered
  db.prepare('UPDATE bookings SET status = ?, download_url = ?, download_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('delivered', download_url, password || null, bookingId);

  // Auto-create/update entry in portfolio_items table as DRAFT
  ensurePortfolioDraft(bookingId, download_url);

  // Update assignment status if exists
  const assignment = db.prepare('SELECT id FROM assignments WHERE booking_id = ?').get(bookingId);
  if (assignment) {
    db.prepare("UPDATE assignments SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(assignment.id);
  }

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  ensureBookingToken(updated, db);

  // WA.me link for client
  const templates = getWaTemplates();
  const settings = getSettings();
  const trackingUrl = getTrackingUrl(req, updated);

  const driveParentUrl = updated.drive_parent_url || download_url;
  let waMessage = (templates.delivery_ready || '')
    .replace(/{company_name}/g, settings.company_name || settings.companyName || 'Studio')
    .replace('{drive_parent_url}', driveParentUrl)
    .replace('{download_url}', driveParentUrl)
    .replace('{tracking_url}', trackingUrl)
    .replace('{password}', password)
    .replace('{admin_phone}', settings.adminPhone)
    .replace('{booking_id}', updated.id);

  const waLink = `https://api.whatsapp.com/send?phone=${updated.client_phone}&text=${encodeURIComponent(waMessage)}`;

  // Send Final Photos Delivery & Closing Email to Client
  if (updated.client_email) {
    try {
      emailService.sendClientClosingEmail({
        booking: updated,
        trackingUrl
      }).catch(err => {
        console.warn('[ClosingEmail Warn]:', err.message);
      });
    } catch (e) {}
  }

  res.json({
    success: true,
    message: 'Link Drive hasil akhir berhasil dikirim ke client!',
    wa_link_client: waLink,
    status: 'delivered'
  });
});

// POST /bookings/:booking_id/upload-highlight-link — Admin upload Highlight Drive link ke klien
// [Menggantikan /post-production/:id/send-highlight-link]
bookingsRouter.post('/:booking_id/upload-highlight-link', [
  param('booking_id').isInt({ min: 1 }),
  body('highlight_drive_url').isURL().withMessage('Highlight Drive URL wajib'),
  handleValidation
], (req, res) => {
  const { highlight_drive_url } = req.body;
  const bookingId = req.params.booking_id;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (booking.balance_status !== 'paid') {
    return res.status(400).json({ error: 'Pelunasan belum terverifikasi. Tidak dapat mengirim highlight link.' });
  }

  db.prepare('UPDATE bookings SET highlight_drive_url = ?, selection_status = \'cleaned\', updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(highlight_drive_url, bookingId);

  // Clear gallery cache disk — galeri tidak diperlukan setelah admin upload highlight
  clearGalleryCache(bookingId);

  // Auto-create/update entry in portfolio_items table as DRAFT
  ensurePortfolioDraft(bookingId, highlight_drive_url);

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  res.json({
    success: true,
    message: 'Link Highlight tersimpan! Foto highlight sedang diimpor ke Portofolio.',
    booking: updated
  });
});

// POST /bookings/:id/clean-staging — Manually/automatically clean staging uploads folder
bookingsRouter.post('/:id/clean-staging', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const bookingId = req.params.id;
  try {
    // Hapus thumbnail cache dari disk sebelum clear DB
    try {
      clearGalleryCache(bookingId);
    } catch (e) {
      console.warn(`[CleanStaging] Gagal clear gallery cache Booking #${bookingId}:`, e.message);
    }

    // Clear staging_files dari DB
    db.prepare("UPDATE bookings SET staging_files = NULL, selection_status = 'cleaned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);
    res.json({ success: true, message: `Staging booking #${bookingId} berhasil dibersihkan.` });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membersihkan folder staging: ' + e.message });
  }
});

// POST /bookings/:id/reopen-selection — Reopen client selection gallery and add photos
bookingsRouter.post('/:id/reopen-selection', [
  param('id').isInt({ min: 1 }),
  handleValidation
], (req, res) => {
  const bookingId = req.params.id;
  try {
    const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    const additionalPhotos = parseInt(req.body.additional_photos) || 0;
    db.prepare("UPDATE bookings SET selection_status = 'ready', additional_photos = additional_photos + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(additionalPhotos, bookingId);

    res.json({
      success: true,
      message: 'Galeri seleksi berhasil dibuka kembali untuk client!'
    });
  } catch (err) {
    console.error('Reopen selection error:', err);
    res.status(500).json({ error: 'Gagal membuka kembali galeri seleksi: ' + err.message });
  }
});


module.exports = bookingsRouter;
