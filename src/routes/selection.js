const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { getSettings } = require('../config/wa-templates');
const { requireAuth } = require('../middleware/auth');

const db = getDb();

// ============ PUBLIC: GET SELECTION GALLERY ============
router.get('/selection/:id', (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = db.prepare(`
      SELECT b.*, p.name as package_name, p.max_selected_photos, p.highlight_count
      FROM bookings b
      LEFT JOIN packages p ON b.package_id = p.id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Data booking tidak ditemukan' });
    }

    const settings = getSettings();

    // Baca daftar file dari DB (staging_files JSON) — thumbnail via server proxy
    // Grid: sz=w400 (cached ke disk), Popup: sz=w800 (on-demand, lebih jelas)
    let files = [];
    try {
      const stagingFiles = JSON.parse(booking.staging_files || '[]');
      files = stagingFiles.map(f => ({
        filename: f.filename,
        url: `/api/proxy/thumb/${f.fileId}`,
        popupUrl: `/api/proxy/thumb/${f.fileId}?sz=w800`
      }));
    } catch { files = []; }

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
    const bookingId = parseInt(req.params.id);
    const { selected_photos } = req.body;

    if (!Array.isArray(selected_photos)) {
      return res.status(400).json({ error: 'Data foto terpilih harus berupa array nama file' });
    }

    const booking = db.prepare(`
      SELECT b.id, b.additional_photos, p.max_selected_photos 
      FROM bookings b 
      LEFT JOIN packages p ON b.package_id = p.id 
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Data booking tidak ditemukan' });
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
