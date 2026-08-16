const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { getSettings } = require('../config/wa-templates');
const { requireAuth } = require('../middleware/auth');

// ============ PUBLIC: GET SELECTION GALLERY ============
router.get('/selection/:id', async (req, res) => {
  try {
    const db = getDb();
    const bookingId = parseInt(req.params.id);
    const booking = db.prepare(`
      SELECT b.*, COALESCE(b.max_selected_photos, p.max_selected_photos, 15) as max_selected_photos, p.name as package_name, p.highlight_count
      FROM bookings b
      LEFT JOIN packages p ON b.package_id = p.id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Data booking tidak ditemukan' });
    }

    // SEC-06 fix: wajib sertakan tracking_token untuk akses galeri seleksi
    const token = req.query.token || req.headers['x-tracking-token'] || '';
    if (!token || token !== booking.tracking_token) {
      return res.status(401).json({ error: 'Token tracking tidak valid. Silakan buka halaman ini dari link tracking Anda.' });
    }

    const settings = getSettings();

    // Check if balance payment is completed
    const requiresPayment = booking.balance_status !== 'paid';
    if (requiresPayment) {
      return res.json({
        booking_id: booking.id,
        client_name: booking.client_name,
        university: booking.university || '-',
        // tracking_token TIDAK dikembalikan (NEW-02 + SEC-06 fix)
        requires_payment: true,
        balance_status: booking.balance_status || 'unpaid',
        balance_amount: booking.balance_amount || 0,
        company_name: settings.company_name || settings.companyName || '',
        logo_url: settings.logo_url || '',
        bank_accounts: settings.bank_accounts || settings.bankAccounts || [],
        files: []
      });
    }

    // Baca daftar file dari DB (staging_files JSON)
    let rawStagingFiles = [];
    try {
      rawStagingFiles = JSON.parse(booking.staging_files || '[]');
    } catch { rawStagingFiles = []; }

    // Auto-Recovery / Self-Healing Sync:
    // Jika data di DB kosong/kurang tapi ada staging_drive_url, sinkronkan otomatis langsung dari Google Drive
    if ((!rawStagingFiles || rawStagingFiles.length === 0) && booking.staging_drive_url) {
      try {
        const driveImporter = require('../services/drive-importer.service');
        const scraped = await driveImporter.scrapeAndStoreFileList(bookingId, booking.staging_drive_url);
        if (scraped && scraped.length > 0) {
          rawStagingFiles = scraped;
        }
      } catch (e) {
        console.warn('[Selection AutoRecovery Warn]:', e.message);
      }
    }

    // Grid: sz=w400 (cached ke disk), Popup: sz=w800 (on-demand, lebih jelas)
    const files = rawStagingFiles.map(f => {
      const filename = f.filename || f.name || `Photo-${f.fileId}`;
      return {
        filename,
        name: filename,
        fileId: f.fileId,
        url: `/api/proxy/thumb/${f.fileId}`,
        popupUrl: `/api/proxy/thumb/${f.fileId}?sz=w800`
      };
    });

    let selectedPhotos = [];
    try {
      selectedPhotos = JSON.parse(booking.selected_photos || '[]');
    } catch {
      selectedPhotos = [];
    }

    res.json({
      booking_id: booking.id,
      client_name: booking.client_name,
      university: booking.university || '-',
      // tracking_token sengaja TIDAK dikembalikan ke publik (NEW-02 fix)
      requires_payment: false,
      max_selected_photos: (booking.max_selected_photos || 15) + (booking.additional_photos || 0),
      highlight_count: booking.highlight_count || 5,
      selected_photos: selectedPhotos,
      selection_status: booking.selection_status || 'pending',
      company_name: settings.company_name || settings.companyName || '',
      logo_url: settings.logo_url || '',
      files
    });
  } catch (err) {
    console.error('Fetch selection error:', err);
    res.status(500).json({ error: 'Gagal mengambil data galeri seleksi' });
  }
});

// ============ PUBLIC: SUBMIT CLIENT SELECTION ============
router.post('/selection/:id/submit', (req, res) => {
  try {
    const db = getDb();
    const bookingId = parseInt(req.params.id);
    const { selected_photos } = req.body;

    if (!Array.isArray(selected_photos)) {
      return res.status(400).json({ error: 'Data foto terpilih harus berupa array nama file' });
    }

    const booking = db.prepare(`
      SELECT b.id, b.additional_photos, b.balance_status, COALESCE(b.max_selected_photos, p.max_selected_photos, 15) as max_selected_photos 
      FROM bookings b 
      LEFT JOIN packages p ON b.package_id = p.id 
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Data booking tidak ditemukan' });
    }

    // SEC-06 fix: validasi token di POST submit juga
    const token = req.body.token || req.query.token || req.headers['x-tracking-token'] || '';
    if (!token || token !== booking.tracking_token) {
      return res.status(401).json({ error: 'Token tracking tidak valid.' });
    }

    if (booking.balance_status !== 'paid') {
      return res.status(403).json({ error: 'Galeri seleksi foto terkunci. Silakan lakukan pelunasan sisa pembayaran terlebih dahulu.' });
    }

    const maxQuota = (booking.max_selected_photos || 15) + (booking.additional_photos || 0);
    if (selected_photos.length > maxQuota) {
      return res.status(400).json({ error: `Jumlah foto terpilih (${selected_photos.length}) melebihi kuota paket (${maxQuota} foto).` });
    }

    // Simpan daftar nama file terpilih ke database
    db.prepare(`
      UPDATE bookings
      SET selected_photos = ?, selection_status = 'submitted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(selected_photos), bookingId);

    res.json({
      success: true,
      message: 'Pilihan foto favorit berhasil disimpan!',
      count: selected_photos.length
    });
  } catch (err) {
    console.error('Submit selection error:', err);
    res.status(500).json({ error: 'Gagal menyimpan pilihan foto' });
  }
});

// ============ ADMIN: CLEAN STAGING (Clear DB staging_files) ============
router.post('/admin/bookings/:id/clean-staging', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const bookingId = parseInt(req.params.id);
    const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    // Clear staging_files dari DB (tidak ada file di disk pada sistem baru)
    db.prepare("UPDATE bookings SET staging_files = NULL, selection_status = 'cleaned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(bookingId);

    res.json({ success: true, message: 'Data staging galeri berhasil dibersihkan.' });
  } catch (err) {
    console.error('Clean staging error:', err);
    res.status(500).json({ error: 'Gagal membersihkan staging: ' + err.message });
  }
});

module.exports = router;
