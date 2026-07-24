const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { getSettings } = require('../config/wa-templates');
const { requireAuth } = require('../middleware/auth');

// Get DB instance
const db = getDb();

// Helper: Ensure staging directory exists with client_univ_bookingId naming
function getStagingDir(bookingId) {
  const baseStaging = path.join(__dirname, '../../DATA/uploads/staging_uploads');
  if (!fs.existsSync(baseStaging)) {
    fs.mkdirSync(baseStaging, { recursive: true });
  }

  const booking = db.prepare('SELECT id, client_name, university FROM bookings WHERE id = ?').get(bookingId);
  const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const nameStr = sanitize(booking?.client_name || 'client');
  const uniStr = sanitize(booking?.university || 'univ');
  const folderName = `${nameStr}_${uniStr}_${bookingId}`;
  const clientDir = path.join(baseStaging, folderName);

  // Legacy migration check
  const legacyDir = path.join(baseStaging, String(bookingId));
  if (fs.existsSync(legacyDir) && !fs.existsSync(clientDir)) {
    try { fs.renameSync(legacyDir, clientDir); } catch(e) {}
  }

  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }
  return { clientDir, folderName };
}

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
    const { clientDir, folderName } = getStagingDir(booking.id);

    // List staging files
    let files = [];
    if (fs.existsSync(clientDir)) {
      const rawFiles = fs.readdirSync(clientDir);
      files = rawFiles.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).map(filename => ({
        filename,
        url: `/uploads/staging_uploads/${folderName}/${filename}`
      }));
    }

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

    // Save selected photos list to database
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

// ============ ADMIN: UPLOAD STAGING FILES FOR CLIENT ============
router.post('/admin/bookings/:id/staging', requireAuth, (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    if (!req.files || !req.files.files) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }

    const stagingDir = getStagingDir(bookingId);
    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    files.forEach(file => {
      const dest = path.join(stagingDir, file.name);
      file.mv(dest);
    });

    // Update status
    db.prepare("UPDATE bookings SET selection_status = 'ready' WHERE id = ?").run(bookingId);

    res.json({ success: true, message: `${files.length} file staging berhasil diunggah` });
  } catch (err) {
    console.error('Upload staging error:', err);
    res.status(500).json({ error: 'Gagal mengunggah file staging' });
  }
});

// ============ ADMIN: CLEAN STAGING FILES ============
router.post('/admin/bookings/:id/clean-staging', requireAuth, (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = db.prepare('SELECT client_name, university FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const nameStr = sanitize(booking.client_name || 'client');
    const uniStr = sanitize(booking.university || 'univ');
    const folderName = `${nameStr}_${uniStr}_${bookingId}`;
    const stagingDir = path.join(__dirname, '../../DATA/uploads/staging_uploads', folderName);

    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }

    const legacyDir = path.join(__dirname, '../../DATA/uploads/staging_uploads', String(bookingId));
    if (fs.existsSync(legacyDir)) {
      fs.rmSync(legacyDir, { recursive: true, force: true });
    }

    db.prepare("UPDATE bookings SET selection_status = 'cleaned' WHERE id = ?").run(bookingId);

    res.json({
      success: true,
      message: 'Folder staging disk berhasil dibersihkan!'
    });
  } catch (err) {
    console.error('Clean staging error:', err);
    res.status(500).json({ error: 'Gagal membersihkan folder staging' });
  }
});

module.exports = router;
