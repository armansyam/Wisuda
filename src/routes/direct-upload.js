/**
 * direct-upload.js
 * Router for Direct-to-Cloud Upload v2.0 to Google Drive Subfolders
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../config/database');
const { getOAuth2Client } = require('../services/drive-folder.service');

router.use(requireAuth);

/**
 * POST /api/v2/admin/uploads/initiate
 * Body: { booking_id, subfolder_type ('jpg' | 'highlight' | 'final'), files: [{ name, mimeType, size }] }
 */
router.post('/initiate', async (req, res) => {
  try {
    const { booking_id, subfolder_type, files } = req.body;
    if (!booking_id || !subfolder_type || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'booking_id, subfolder_type, dan array files wajib diisi' });
    }

    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking tidak ditemukan' });
    }

    // Resolve target folder ID
    let targetFolderUrl = '';
    if (subfolder_type === 'jpg') {
      targetFolderUrl = booking.staging_drive_url;
    } else if (subfolder_type === 'highlight') {
      targetFolderUrl = booking.highlight_drive_url;
    } else if (subfolder_type === 'final') {
      targetFolderUrl = booking.download_url;
    } else {
      return res.status(400).json({ success: false, error: 'subfolder_type tidak valid (harus: jpg, highlight, atau final)' });
    }

    if (!targetFolderUrl) {
      return res.status(400).json({ success: false, error: `Folder Google Drive untuk ${subfolder_type} belum dibuat. Pastikan DP sudah terverifikasi.` });
    }

    // Extract folder ID from URL (e.g. https://drive.google.com/drive/folders/1xxx or raw ID)
    const folderIdMatch = targetFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/) || targetFolderUrl.match(/id=([a-zA-Z0-9_-]+)/);
    const targetFolderId = folderIdMatch ? folderIdMatch[1] : targetFolderUrl;

    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      return res.status(400).json({ success: false, error: 'Google Drive OAuth belum terkonfigurasi di Admin Settings.' });
    }

    const tokenRes = await oauth2Client.getAccessToken();
    const accessToken = typeof tokenRes === 'string' ? tokenRes : tokenRes.token;
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'Gagal mendapatkan Google OAuth access token' });
    }

    const sessionPromises = files.map(async (f) => {
      try {
        const initiateRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
              'X-Upload-Content-Type': f.mimeType || 'application/octet-stream',
              'Origin': req.headers.origin || 'https://wisuda.sorehari.my.id',
              ...(f.size ? { 'X-Upload-Content-Length': f.size.toString() } : {}),
            },
            body: JSON.stringify({
              name: f.name,
              parents: [targetFolderId],
            }),
          }
        );

        const sessionUrl = initiateRes.headers.get('location');
        return {
          file_name: f.name,
          mime_type: f.mimeType || 'application/octet-stream',
          size: f.size || 0,
          session_url: sessionUrl,
        };
      } catch (err) {
        return {
          file_name: f.name,
          error: err.message,
        };
      }
    });

    const sessions = await Promise.all(sessionPromises);

    return res.json({
      success: true,
      booking_id,
      subfolder_type,
      target_folder_id: targetFolderId,
      sessions,
    });
  } catch (err) {
    console.error('[DirectUpload] Initiate error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v2/admin/uploads/finalize
 * Body: { booking_id, subfolder_type, files: [{ drive_file_id, name, size }] }
 */
router.post('/finalize', async (req, res) => {
  try {
    const { booking_id, subfolder_type, files } = req.body;
    if (!booking_id || !subfolder_type || !Array.isArray(files)) {
      return res.status(400).json({ success: false, error: 'booking_id, subfolder_type, dan array files wajib' });
    }

    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking tidak ditemukan' });
    }

    let insertedCount = 0;
    if (subfolder_type === 'jpg') {
      const finalizeStaging = db.transaction((bId, newFiles) => {
        const fresh = db.prepare('SELECT staging_files FROM bookings WHERE id = ?').get(bId);
        let existingFiles = [];
        try { existingFiles = JSON.parse(fresh?.staging_files || '[]'); } catch (e) {}
        const fileIdSet = new Set(existingFiles.map(f => f.fileId));
        let added = 0;
        for (const f of newFiles) {
          if (f.drive_file_id && !fileIdSet.has(f.drive_file_id)) {
            existingFiles.push({
              filename: f.name || 'photo.jpg',
              fileId: f.drive_file_id,
              size: f.size || 0,
              uploaded_at: new Date().toISOString()
            });
            fileIdSet.add(f.drive_file_id);
            added++;
          }
        }
        db.prepare("UPDATE bookings SET staging_files = ?, selection_status = 'staged', staged_photo_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(JSON.stringify(existingFiles), existingFiles.length, bId);
        return added;
      });
      insertedCount = finalizeStaging(booking_id, files);
    } else if (subfolder_type === 'highlight' || subfolder_type === 'final') {
      insertedCount = files.length;
    }

    return res.json({
      success: true,
      booking_id,
      subfolder_type,
      processed_count: insertedCount,
    });
  } catch (err) {
    console.error('[DirectUpload] Finalize error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
