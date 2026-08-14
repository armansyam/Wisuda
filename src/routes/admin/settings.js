/**
 * src/routes/admin/settings.js
 * Sub-router untuk semua endpoint /settings/* dan /profile/*
 * Dipanggil dari src/routes/admin.js via:
 *   router.use('/settings', require('./admin/settings'))
 *   router.use('/profile', require('./admin/settings').profileRouter)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../../config/settings');
const { getDb } = require('../../config/database');
const { getSettings, getWaTemplates, getSetting, setSetting, getDefaultWaTemplates } = require('../../config/wa-templates');
const { body, query, validationResult } = require('express-validator');
const { handleValidation } = require('../../middleware/validation');
const { requireAuth, hashPassword, verifyPassword } = require('../../middleware/auth');
const { formatCurrency } = require('../../utils/currency');
const driveFolder = require('../../services/drive-folder.service');
const multer = require('multer');
const { getBaseUrl } = require('../../utils/url');

const settingsRouter = express.Router();
const db = getDb();

// GET /api/admin/settings/drive-config — Ambil info status konfigurasi Google Drive
settingsRouter.get('/drive-config', (req, res) => {
  const serviceAccountEmail = driveFolder.getServiceAccountEmail();
  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  const apiKey = getSetting('google_drive_api_key', '');

  res.json({
    has_service_account: !!serviceAccountEmail,
    service_account_email: serviceAccountEmail,
    master_folder_id: masterFolderId,
    has_master_folder: !!masterFolderId,
    api_key: apiKey,
    has_api_key: !!apiKey
  });
});

// POST /api/admin/settings/drive-upload-sa — Upload Service Account JSON dari Admin UI
settingsRouter.post('/drive-upload-sa', (req, res) => {
  const { json_content, json_string } = req.body;
  let parsed = json_content;
  if (!parsed && json_string) {
    try {
      parsed = JSON.parse(json_string);
    } catch (e) {
      return res.status(400).json({ error: 'Format JSON file tidak valid.' });
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return res.status(400).json({ error: 'Konten JSON service account tidak ditemukan.' });
  }

  try {
    const result = driveFolder.saveServiceAccountFromUpload(parsed);
    res.json({ success: true, message: 'Service account JSON berhasil disimpan!', service_account_email: result.email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/settings/drive-status — Comprehensive status for Smart Hybrid Drive (OAuth + Bot)
settingsRouter.get('/drive-status', async (req, res) => {
  const serviceAccountEmail = driveFolder.getServiceAccountEmail();
  const masterFolderId = getSetting('google_drive_master_folder_id', '');
  const oauthEmail = getSetting('google_oauth_email', '');
  const oauthRefreshToken = getSetting('google_oauth_refresh_token', '');
  const oauthTokens = getSetting('google_oauth_tokens', '');
  const oauthConnected = !!(oauthEmail && (oauthRefreshToken || oauthTokens));

  let storageUsedGB = '0.0';
  let storageTotalGB = 'Tanpa Batas';
  let storagePercent = 0;

  if (oauthConnected) {
    try {
      const drive = driveFolder.getDriveClient(true);
      const about = await drive.about.get({ fields: 'storageQuota' });
      if (about.data && about.data.storageQuota) {
        const usageBytes = parseInt(about.data.storageQuota.usage || '0', 10);
        storageUsedGB = (usageBytes / (1024 * 1024 * 1024)).toFixed(1);
        if (about.data.storageQuota.limit) {
          const limitBytes = parseInt(about.data.storageQuota.limit, 10);
          storageTotalGB = (limitBytes / (1024 * 1024 * 1024)).toFixed(1);
          storagePercent = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;
        } else {
          storageTotalGB = 'Tanpa Batas';
          storagePercent = 0;
        }
      }
    } catch (e) {
      console.warn('[DriveStatusWarn]:', e.message);
    }
  }

  res.json({
    oauth_connected: oauthConnected,
    oauth_email: oauthEmail,
    mode: oauthConnected ? 'oauth2_active' : 'oauth2_pending',
    mode_label: oauthConnected ? 'Google Drive OAuth2 Active' : 'Google Drive Belum Terhubung',
    master_folder_id: masterFolderId,
    has_master_folder: !!masterFolderId,
    storage_used_gb: storageUsedGB,
    storage_total_gb: storageTotalGB,
    storage_percent: storagePercent
  });
});



// POST /api/admin/settings/drive-disconnect — Putuskan Tautan OAuth
settingsRouter.post('/drive-disconnect', (req, res) => {
  setSetting('google_oauth_refresh_token', '', 'Google Drive OAuth Refresh Token');
  setSetting('google_oauth_access_token', '', 'Google Drive OAuth Access Token');
  setSetting('google_oauth_tokens', '', 'Google Drive OAuth Full Tokens Object');
  setSetting('google_oauth_email', '', 'Google Drive OAuth Connected Email');
  res.json({ success: true, message: '✓ Tautan akun Google Drive berhasil diputuskan.' });
});

// GET /api/admin/settings/drive-test — Test koneksi Master Folder ID Google Drive via OAuth2
settingsRouter.get('/drive-test', async (req, res) => {
  try {
    const masterFolderId = getSetting('google_drive_master_folder_id', '');
    if (!masterFolderId) {
      return res.status(400).json({ ok: false, error: 'Master Folder ID Client belum dikonfigurasi.' });
    }

    const drive = driveFolder.getDriveClient(true);
    const folderRes = await drive.files.get({
      fileId: masterFolderId,
      fields: 'id, name, webViewLink, mimeType'
    });

    let portfolioFolderId = getSetting('google_drive_portfolio_folder_id', '');
    let portfolioFolderName = 'Master Portofolio';
    if (portfolioFolderId) {
      try {
        const pRes = await drive.files.get({
          fileId: portfolioFolderId,
          fields: 'id, name'
        });
        portfolioFolderName = pRes.data.name || 'Master Portofolio';
      } catch (err) {}
    } else {
      try {
        portfolioFolderId = await driveFolder.getOrCreateMasterPortfolioFolder(drive);
      } catch (err) {}
    }

    res.json({
      ok: true,
      success: true,
      folder_name: folderRes.data.name || 'WISUDA CLIENTS',
      folder_id: masterFolderId,
      portfolio_folder_id: portfolioFolderId || '',
      portfolio_folder_name: portfolioFolderName,
      portfolio_folder_url: portfolioFolderId ? `https://drive.google.com/drive/folders/${portfolioFolderId}` : '',
      message: `Terhubung ke folder Client ("${folderRes.data.name || masterFolderId}") & Portofolio`
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Gagal terhubung ke Master Folder Google Drive: ' + e.message });
  }
});

// ============ BACKUP MONITOR STATUS ============
settingsRouter.get('/backup-status', (req, res) => {
  try {
    const backupDir = getSetting('backup_path', process.env.BACKUP_PATH || './DATA/backups');
    let resolvedPath = path.resolve(backupDir);

    if (!fs.existsSync(resolvedPath)) {
      try { fs.mkdirSync(resolvedPath, { recursive: true }); } catch (e) {}
    }

    let files = [];
    if (fs.existsSync(resolvedPath)) {
      files = fs.readdirSync(resolvedPath)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const fullPath = path.join(resolvedPath, f);
          const stat = fs.statSync(fullPath);
          return {
            filename: f,
            size_bytes: stat.size,
            size_kb: Math.round(stat.size / 1024),
            size_mb: (stat.size / (1024 * 1024)).toFixed(2),
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime - a.mtime);
    }

    // Fallback: If 0 files found in custom backupDir, also scan default ./DATA/backups
    const defaultResolved = path.resolve('./DATA/backups');
    if (files.length === 0 && resolvedPath !== defaultResolved && fs.existsSync(defaultResolved)) {
      const defaultFiles = fs.readdirSync(defaultResolved)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const fullPath = path.join(defaultResolved, f);
          const stat = fs.statSync(fullPath);
          return {
            filename: f,
            size_bytes: stat.size,
            size_kb: Math.round(stat.size / 1024),
            size_mb: (stat.size / (1024 * 1024)).toFixed(2),
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime - a.mtime);
      if (defaultFiles.length > 0) {
        files = defaultFiles;
        resolvedPath = defaultResolved;
      }
    }

    const latest = files.length > 0 ? files[0] : null;

    const cronHour = getSetting('backup_cron_hour', '02:00');
    const cronEnabled = getSetting('backup_cron_enabled', 'true') === 'true';

    res.json({
      active: cronEnabled,
      backup_path: backupDir,
      resolved_path: resolvedPath,
      total_backups: files.length,
      latest_backup: latest ? {
        filename: latest.filename,
        size_mb: latest.size_mb + ' MB',
        size_kb: latest.size_kb + ' KB',
        mtime: latest.mtime,
        created_at: latest.mtime.toISOString()
      } : null,
      cron_hour: cronHour,
      cron_enabled: cronEnabled,
      cron_schedule: `Setiap Hari Jam ${cronHour} WITA`,
      retention_policy: '30 Hari Retensi Otomatis'
    });
  } catch (err) {
    console.error('Backup status error:', err);
    res.status(500).json({ error: 'Gagal membaca status backup: ' + err.message });
  }
});

// ============ UPDATE BACKUP SCHEDULE ============
settingsRouter.post('/backup-schedule', (req, res) => {
  try {
    const { cron_hour, cron_enabled } = req.body;
    if (cron_hour !== undefined) {
      setSetting('backup_cron_hour', cron_hour, 'Jam otomatisasi backup database (HH:MM)');
    }
    if (cron_enabled !== undefined) {
      setSetting('backup_cron_enabled', String(cron_enabled), 'Status aktif otomatisasi backup database');
    }
    res.json({
      success: true,
      message: `Jadwal backup otomatis berhasil diperbarui: Jam ${cron_hour || '02:00'} WITA (${cron_enabled !== false ? 'Aktif' : 'Non-Aktif'})`,
      cron_hour: cron_hour || '02:00',
      cron_enabled: cron_enabled !== false
    });
  } catch (err) {
    res.status(400).json({ error: 'Gagal memperbarui jadwal backup: ' + err.message });
  }
});

// ============ DOWNLOAD LATEST BACKUP ============
settingsRouter.get('/backup-download', (req, res) => {
  try {
    const configSettings = getSettings();
    const backupDir = configSettings.backupPath || './DATA/backups';
    const resolvedPath = path.resolve(backupDir);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Folder backup belum ada' });
    }

    const files = fs.readdirSync(resolvedPath)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        filename: f,
        fullPath: path.join(resolvedPath, f),
        mtime: fs.statSync(path.join(resolvedPath, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return res.status(404).json({ error: 'Belum ada file backup database' });
    }

    const targetFile = req.query.file ? path.join(resolvedPath, path.basename(req.query.file)) : files[0].fullPath;

    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'File backup tidak ditemukan' });
    }

    res.download(targetFile, path.basename(targetFile));
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Gagal mendownload backup: ' + err.message });
  }
});

// ============ GOOGLE DRIVE CLOUD STORAGE MONITOR STATUS ============
settingsRouter.get('/storage-status', async (req, res) => {
  try {
    const authClient = driveFolder.getOAuth2Client();
    if (!authClient) {
      return res.json({
        is_cloud: true,
        linked: false,
        message: 'Google Drive belum dikonfigurasi. Tautkan Akun Google Studio di Settings.',
        storage: {
          used_bytes: 0,
          limit_bytes: 16106127360,
          used_gb: '0.00 GB',
          used_mb: '0.00 MB',
          limit_gb: '15.00 GB',
          trash_mb: '0.00 MB',
          percent: 0,
          user_email: '-',
          portfolio: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 },
          clients: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 }
        }
      });
    }

    const { google } = require('googleapis');
    const drive = google.drive({ version: 'v3', auth: authClient });
    const about = await drive.about.get({ fields: 'storageQuota, user' });
    const quota = about.data.storageQuota || {};
    const user = about.data.user || {};

    const limitBytes = parseInt(quota.limit || 0, 10);
    const usageBytes = parseInt(quota.usage || 0, 10);
    const usageInTrashBytes = parseInt(quota.usageInDriveTrash || 0, 10);

    const limitGB = limitBytes > 0 ? (limitBytes / (1024 * 1024 * 1024)).toFixed(2) : '15.00';
    const usedGB = usageBytes > 0 ? (usageBytes / (1024 * 1024 * 1024)).toFixed(2) : '0.00';
    const usedMB = usageBytes > 0 ? (usageBytes / (1024 * 1024)).toFixed(2) : '0.00';
    const trashMB = usageInTrashBytes > 0 ? (usageInTrashBytes / (1024 * 1024)).toFixed(2) : '0.00';

    const percent = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;

    // Helper to calculate recursive size and file count for a folder
    const getFolderStats = async (folderId) => {
      if (!folderId) return { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 };
      try {
        let totalSize = 0;
        let totalFiles = 0;
        let pageToken = null;
        do {
          const query = `'${folderId}' in parents and trashed = false`;
          const resFiles = await drive.files.list({
            q: query,
            fields: 'nextPageToken, files(id, size, mimeType)',
            pageSize: 1000,
            pageToken
          });
          const files = resFiles.data.files || [];
          for (const f of files) {
            if (f.mimeType !== 'application/vnd.google-apps.folder') {
              totalSize += parseInt(f.size || 0, 10);
              totalFiles += 1;
            }
          }
          pageToken = resFiles.data.nextPageToken;
        } while (pageToken);

        const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        const sizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
        const sizeFormatted = totalSize >= 1024 * 1024 * 1024 ? `${sizeGB} GB` : `${sizeMB} MB`;

        return {
          size_bytes: totalSize,
          size_formatted: sizeFormatted,
          files_count: totalFiles
        };
      } catch (err) {
        return { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 };
      }
    };

    const portfolioFolderId = getSetting('google_drive_portfolio_folder_id', '');
    const clientsFolderId = getSetting('google_drive_master_folder_id', '');

    const [portfolioStats, clientsStats] = await Promise.all([
      getFolderStats(portfolioFolderId),
      getFolderStats(clientsFolderId)
    ]);

    res.json({
      is_cloud: true,
      linked: true,
      storage: {
        used_bytes: usageBytes,
        limit_bytes: limitBytes,
        used_gb: usedGB + ' GB',
        used_mb: usedMB + ' MB',
        limit_gb: limitGB + ' GB',
        trash_mb: trashMB + ' MB',
        percent: percent,
        user_email: user.emailAddress || 'Gmail Studio Tertaot',
        portfolio: portfolioStats,
        clients: clientsStats
      }
    });
  } catch (err) {
    res.json({
      is_cloud: true,
      linked: false,
      message: 'Gagal membaca kuota Google Drive: ' + err.message,
      storage: {
        used_bytes: 0,
        limit_bytes: 16106127360,
        used_gb: '0.00 GB',
        used_mb: '0.00 MB',
        limit_gb: '15.00 GB',
        trash_mb: '0.00 MB',
        percent: 0,
        user_email: '-',
        portfolio: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 },
        clients: { size_bytes: 0, size_formatted: '0.00 MB', files_count: 0 }
      }
    });
  }
});

// ============ VERIFY PATH EXISTENCE & ACCESS ============
settingsRouter.post('/verify-path', [
  body('target_path').trim().notEmpty().withMessage('Path folder wajib diisi'),
  handleValidation
], (req, res) => {
  try {
    const targetPath = req.body.target_path;
    const resolved = path.resolve(targetPath);

    let exists = fs.existsSync(resolved);
    let created = false;

    if (!exists) {
      try {
        fs.mkdirSync(resolved, { recursive: true });
        exists = true;
        created = true;
      } catch (mkdirErr) {
        return res.status(400).json({
          valid: false,
          error: `Folder tidak ada dan gagal dibuat: ${mkdirErr.message}`,
          resolved_path: resolved
        });
      }
    }

    // Test write permission
    const testFile = path.join(resolved, `.write_test_${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test_access', 'utf8');
    fs.unlinkSync(testFile);

    res.json({
      valid: true,
      resolved_path: resolved,
      created: created,
      writable: true,
      message: `✅ Path folder valid & berstatus Writable: ${resolved}`
    });
  } catch (err) {
    res.status(400).json({
      valid: false,
      error: `Path folder tidak dapat diakses atau ditulisi: ${err.message}`,
      resolved_path: req.body.target_path
    });
  }
});

// ============ BROWSE DIRECTORIES FOR FILE EXPLORER MODAL ============
settingsRouter.get('/browse-directories', (req, res) => {
  try {
    let targetPath = req.query.target_path ? req.query.target_path.trim() : process.cwd();
    let resolved = path.resolve(targetPath);

    if (!fs.existsSync(resolved)) {
      resolved = process.cwd();
    }

    const items = fs.readdirSync(resolved, { withFileTypes: true });
    const directories = [];

    for (const item of items) {
      if (item.isDirectory()) {
        if (item.name.startsWith('.') && item.name !== '.DATA') continue;
        directories.push({
          name: item.name,
          path: path.join(resolved, item.name)
        });
      }
    }

    directories.sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = path.dirname(resolved) !== resolved ? path.dirname(resolved) : null;

    res.json({
      current_path: resolved,
      parent_path: parentPath,
      directories: directories
    });
  } catch (err) {
    console.error('Browse directories error:', err);
    res.status(500).json({ error: 'Gagal menelusuri direktori: ' + err.message });
  }
});

// ============ CREATE NEW DIRECTORY FROM EXPLORER MODAL ============
settingsRouter.post('/create-directory', [
  body('parent_path').trim().notEmpty().withMessage('Parent path wajib diisi'),
  body('folder_name').trim().notEmpty().withMessage('Nama folder baru wajib diisi'),
  handleValidation
], (req, res) => {
  try {
    const parentPath = path.resolve(req.body.parent_path);
    const folderName = req.body.folder_name.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim();

    if (!fs.existsSync(parentPath)) {
      return res.status(400).json({ error: 'Parent directory tidak ditemukan di server' });
    }

    const newFolderPath = path.join(parentPath, folderName);
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath, { recursive: true });
    }

    res.json({
      success: true,
      new_path: newFolderPath,
      message: `✓ Folder '${folderName}' berhasil dibuat!`
    });
  } catch (err) {
    console.error('Create directory error:', err);
    res.status(500).json({ error: 'Gagal membuat folder baru: ' + err.message });
  }
});

// ============ SETTINGS ============
settingsRouter.get('/', (req, res) => {
  const settings = getSettings();
  const templates = getWaTemplates();

  // Don't expose sensitive
  const { sessionSecret, adminPassword, ...safeSettings } = settings;

  const isUploadPathConfiguredInDb = getSetting('upload_path', null) !== null;
  const isBackupPathConfiguredInDb = getSetting('backup_path', null) !== null;
  safeSettings.storage_needs_setup = !isUploadPathConfiguredInDb || !isBackupPathConfiguredInDb;

  res.json({ settings: safeSettings, wa_templates: templates });
});

const updateSettingsHandler = [
  body('companyName').optional().trim().isLength({ max: 100 }),
  body('companyPhone').optional().trim().isLength({ max: 20 }),
  body('companyAddress').optional().trim().isLength({ max: 200 }),
  body('adminPhone').optional().trim(),
  body('dp_percentage').optional().isInt({ min: 10, max: 100 }),
  body('upload_deadline_days').optional().isInt({ min: 1, max: 30 }),
  body('auto_approve_hours').optional().isInt({ min: 1, max: 168 }),
  body('max_photos_per_fg_per_day').optional().isInt({ min: 1, max: 10 }),
  body('dp_expired_days').optional().isInt({ min: 1, max: 30 }),
  body('bank_accounts').optional().isArray(),
  body('invoice_prefix').optional().trim().isLength({ max: 20 }),
  body('session_timeout_minutes').optional().isInt({ min: 60, max: 1440 }),
  body('portfolio_limit').optional().isInt({ min: 1, max: 10000 }),
  body('seo_domain').optional().trim(),
  body('seo_title').optional().trim(),
  body('seo_description').optional().trim(),
  body('seo_keywords').optional().trim(),
  body('google_site_verification').optional().trim(),
  body('google_drive_master_folder_id').optional().trim(),
  body('google_drive_api_key').optional().trim(),
  // AUD-01 FIX: google_oauth_client_id & google_oauth_client_secret DILARANG diubah via endpoint
  // umum POST/PUT /settings. Wajib melalui POST /settings/verify-oauth-credentials yang menjalankan
  // probe test ke https://oauth2.googleapis.com/token terlebih dahulu.
  // body('google_oauth_client_id').optional().trim(),    // DIBLOKIR — gunakan /verify-oauth-credentials
  // body('google_oauth_client_secret').optional().trim(), // DIBLOKIR — gunakan /verify-oauth-credentials
  body('backup_path').optional().trim(),
  body('supported_cities').optional().isArray(),
  body('drive_retention_months').optional().isInt({ min: 1, max: 12 }),
  body('drive_auto_trash_enabled').optional().isBoolean(),
  body('enable_freelance_portal').optional().custom(v => v === '0' || v === '1' || v === 0 || v === 1 || typeof v === 'boolean'),
  body('smtp_host').optional().trim(),
  body('smtp_port').optional().isInt({ min: 1, max: 65535 }),
  body('smtp_user').optional().trim(),
  body('smtp_pass').optional().trim(),
  body('smtp_secure').optional().custom(v => v === '0' || v === '1' || v === 0 || v === 1 || typeof v === 'boolean'),
  body('smtp_from_name').optional().trim(),
  body('smtp_from_email').optional().trim(),
  handleValidation,
  (req, res) => {
    if (req.body.adminPhone !== undefined) {
      let p = String(req.body.adminPhone).replace(/[^0-9]/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1);
      req.body.adminPhone = p;
      req.body.admin_phone = p;
    }

    const allowed = [
      'companyName', 'companyPhone', 'companyAddress', 'adminPhone',
      'company_name', 'company_phone', 'company_address', 'admin_phone',
      'dp_percentage', 'upload_deadline_days', 'auto_approve_hours', 'booking_link_expiry_hours',
      'max_photos_per_fg_per_day', 'dp_expired_days', 'bank_accounts', 'invoice_prefix',
      'session_timeout_minutes', 'portfolio_limit',
      'seo_domain', 'seo_title', 'seo_description', 'seo_keywords',
      'seo_og_image', 'google_site_verification', 'supported_cities',
      'google_drive_master_folder_id', 'google_drive_portfolio_folder_id', 'google_drive_api_key',
      // AUD-01 FIX: 'google_oauth_client_id' dan 'google_oauth_client_secret' DIHAPUS dari allowed.
      // Dua kunci ini HANYA bisa diubah melalui POST /settings/verify-oauth-credentials
      // yang menjalankan mandatory probe test ke Google API sebelum menyimpan.
      'backup_path', 'backupPath',
      'drive_retention_months', 'drive_auto_trash_enabled', 'enable_freelance_portal', 'fg_auto_rotate_tokens_enabled', 'app_url', 'domain_url',
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'smtp_from_name', 'smtp_from_email'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        setSetting(key, req.body[key]);
      }
    }

    res.json(getSettings());
  }];

settingsRouter.put('/', ...updateSettingsHandler);
settingsRouter.post('/', ...updateSettingsHandler);

// POST /api/admin/settings/verify-smtp — Verify SMTP Server Connection
settingsRouter.post('/verify-smtp', async (req, res) => {
  try {
    const emailService = require('../../services/email.service');
    const result = await emailService.verifySmtpConnection(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Gagal terhubung ke Server SMTP: ' + e.message });
  }
});

// POST /api/admin/settings/send-test-email — Send Test Email via SMTP
settingsRouter.post('/send-test-email', async (req, res) => {
  try {
    const { target_email, ...smtpConfig } = req.body;
    if (!target_email) {
      return res.status(400).json({ ok: false, error: 'Email tujuan wajib diisi.' });
    }
    const emailService = require('../../services/email.service');
    const result = await emailService.sendTestEmail(smtpConfig, target_email);
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Gagal mengirim email uji coba: ' + e.message });
  }
});

settingsRouter.post('/verify-oauth-credentials', [
  body('google_oauth_client_id').trim().isLength({ min: 10 }).withMessage('Client ID wajib diisi'),
  body('google_oauth_client_secret').trim().isLength({ min: 5 }).withMessage('Client Secret wajib diisi'),
  handleValidation
], async (req, res) => {
  try {
    const { google_oauth_client_id, google_oauth_client_secret } = req.body;

    // Send probe test to Google OAuth token endpoint to verify if client_id and client_secret match
    const probeParams = new URLSearchParams({
      client_id: google_oauth_client_id,
      client_secret: google_oauth_client_secret,
      grant_type: 'authorization_code',
      code: 'probe_test_verification'
    });

    const googleRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: probeParams.toString()
    });

    const googleData = await googleRes.json();

    if (googleData.error === 'invalid_client') {
      return res.status(400).json({
        error: '❌ Client ID dan Client Secret tidak cocok / salah. Google menolak kredensial ini. Mohon periksa kembali pasangan Client ID & Secret di Google Cloud Console.'
      });
    }

    // Save to database settings table since verification passed (invalid_grant or token probe response confirms valid matched credentials)
    setSetting('google_oauth_client_id', google_oauth_client_id);
    setSetting('google_oauth_client_secret', google_oauth_client_secret);

    res.json({
      success: true,
      message: '✅ Pasangan Client ID & Client Secret berhasil diverifikasi cocok oleh Google dan disimpan!'
    });
  } catch (err) {
    console.error('Verify OAuth credentials error:', err);
    res.status(500).json({ error: 'Gagal menghubungi server verifikasi Google: ' + err.message });
  }
});

// ============ OG IMAGE UPLOAD ============
settingsRouter.post('/og-image', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../../public/uploads/branding');
    if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.og_image) {
      fileBuffer = req.files.og_image.data;
    } else if (req.body && req.body.image_data) {
      const matches = req.body.image_data.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
      if (matches) fileBuffer = Buffer.from(matches[2], 'base64');
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file banner OG' });

    const ogDest = path.join(brandingDir, 'og_banner.png');
    await sharp(fileBuffer)
      .resize(1200, 630, { fit: 'cover' })
      .png({ quality: 85 })
      .toFile(ogDest);

    const ogUrl = '/uploads/branding/og_banner.png';
    setSetting('seo_og_image', ogUrl);
    res.json({ og_image_url: ogUrl, message: 'Banner SEO Social Share berhasil diunggah!' });
  } catch (err) {
    console.error('OG Upload error:', err);
    res.status(500).json({ error: 'Gagal mengunggah banner OG' });
  }
});

// ============ USER PROFILE ============
settingsRouter.get('/profile', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, name, role, avatar_url FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (user.avatar_url) {
      try {
        const fs = require('fs');
        const path = require('path');
        const cleanPath = user.avatar_url.split('?')[0];
        const filePath = path.join(__dirname, '../../../public', cleanPath);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          user.avatar_url = `${cleanPath}?t=${stats.mtimeMs}`;
        }
      } catch (e) { }
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

settingsRouter.put('/profile', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Nama wajib diisi'),
  body('username').trim().isLength({ min: 1, max: 50 }).withMessage('Username wajib diisi'),
  handleValidation
], (req, res) => {
  try {
    const { name, username } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
    if (existing) return res.status(400).json({ error: 'Username sudah digunakan oleh pengguna lain' });

    db.prepare('UPDATE users SET name = ?, username = ? WHERE id = ?').run(name, username, req.user.id);
    const updated = db.prepare('SELECT id, username, name, role, avatar_url FROM users WHERE id = ?').get(req.user.id);

    if (updated.avatar_url) {
      try {
        const fs = require('fs');
        const path = require('path');
        const cleanPath = updated.avatar_url.split('?')[0];
        const filePath = path.join(__dirname, '../../../public', cleanPath);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          updated.avatar_url = `${cleanPath}?t=${stats.mtimeMs}`;
        }
      } catch (e) { }
    }

    res.json({ user: updated, message: 'Profil berhasil diperbarui' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});

settingsRouter.post('/profile/avatar', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const avatarsDir = path.join(__dirname, '../../../public/uploads/avatars');
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.avatar) {
      fileBuffer = req.files.avatar.data;
    } else if (req.body && req.body.avatar_data) {
      const matches = req.body.avatar_data.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file avatar' });

    const avatarPath = `avatar-${req.user.id}.png`;
    const avatarDest = path.join(avatarsDir, avatarPath);

    await sharp(fileBuffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .png({ quality: 80 })
      .toFile(avatarDest);

    const relativeUrl = `/uploads/avatars/${avatarPath}`;
    const cleanUrl = `${relativeUrl}?t=${Date.now()}`;

    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(relativeUrl, req.user.id);
    res.json({ avatar_url: cleanUrl, message: 'Foto profil berhasil diperbarui!' });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Gagal memperbarui foto profil' });
  }
});

settingsRouter.delete('/profile/avatar', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');

    const avatarsDir = path.join(__dirname, '../../../public/uploads/avatars');
    const avatarPath = `avatar-${req.user.id}.png`;
    const avatarDest = path.join(avatarsDir, avatarPath);

    if (fs.existsSync(avatarDest)) {
      fs.unlinkSync(avatarDest);
    }

    db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(req.user.id);
    res.json({ avatar_url: '', message: 'Foto profil berhasil dihapus!' });
  } catch (err) {
    console.error('Delete avatar error:', err);
    res.status(500).json({ error: 'Gagal menghapus foto profil' });
  }
});

// ============ CHANGE PASSWORD ============
settingsRouter.post('/change-password', [
  body('current_password').trim().isLength({ min: 1 }),
  body('new_password').trim().isLength({ min: 6, max: 100 }),
  handleValidation
], async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await verifyPassword(req.body.current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Password saat ini salah' });

    const hash = await hashPassword(req.body.new_password);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Gagal ubah password' });
  }
});

settingsRouter.post('/verify-admin-password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password wajib diisi' });

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Password admin salah' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Verify admin password error:', err);
    res.status(500).json({ error: 'Gagal verifikasi password' });
  }
});

// ============ LOGO UPLOAD ============
settingsRouter.post('/logo', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../../public/uploads/branding');
    if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.logo) {
      fileBuffer = req.files.logo.data;
    } else if (req.body && req.body.logo_data) {
      const matches = req.body.logo_data.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file logo' });

    const logoDest = path.join(brandingDir, 'logo.png');
    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');

    // 1. Save compressed logo (max 512x512)
    await sharp(fileBuffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(logoDest);

    // 2. Generate Favicon PNG (64x64)
    await sharp(fileBuffer)
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconPng);

    // 3. Generate Favicon ICO (32x32)
    await sharp(fileBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconIco);

    const timestamp = Date.now();
    const logoPath = `/uploads/branding/logo.png?v=${timestamp}`;
    const faviconPath = `/uploads/branding/favicon.png?v=${timestamp}`;
    setSetting('logo_url', logoPath);
    setSetting('favicon_url', faviconPath);
    const updatedSettings = getSettings();
    res.json({ logo_url: updatedSettings.logo_url || logoPath, message: 'Logo dan Favicon berhasil diperbarui!' });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Gagal upload logo' });
  }
});

settingsRouter.delete('/logo', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../../public/uploads/branding');
    const logoDest = path.join(brandingDir, 'logo.png');
    const defaultAmsLogo = path.join(__dirname, '../../../public/images/ams-logo.png');
    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');

    // 1. Delete custom logo
    if (fs.existsSync(logoDest)) {
      fs.unlinkSync(logoDest);
    }

    // 2. Restore default favicons from ams-logo.png
    if (fs.existsSync(defaultAmsLogo)) {
      await sharp(defaultAmsLogo)
        .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconPng);

      await sharp(defaultAmsLogo)
        .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconIco);
    } else {
      if (fs.existsSync(faviconPng)) fs.unlinkSync(faviconPng);
      if (fs.existsSync(faviconIco)) fs.unlinkSync(faviconIco);
    }

    setSetting('logo_url', '');
    setSetting('favicon_url', '');
    res.json({ logo_url: '', message: 'Logo berhasil dihapus!' });
  } catch (err) {
    console.error('Delete logo error:', err);
    res.status(500).json({ error: 'Gagal menghapus logo' });
  }
});

// ============ FAVICON UPLOAD ============
settingsRouter.post('/favicon', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../../public/uploads/branding');
    if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

    let fileBuffer = null;
    if (req.files && req.files.favicon) {
      fileBuffer = req.files.favicon.data;
    } else if (req.body && req.body.favicon_data) {
      const matches = req.body.favicon_data.match(/^data:image\/(png|jpg|jpeg|webp|x-icon|vnd.microsoft.icon);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'Tidak ada file favicon' });

    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');

    // 1. Generate Favicon PNG (64x64)
    await sharp(fileBuffer)
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconPng);

    // 2. Generate Favicon ICO (32x32)
    await sharp(fileBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(faviconIco);

    const timestamp = Date.now();
    const faviconPath = `/uploads/branding/favicon.png?v=${timestamp}`;
    setSetting('favicon_url', faviconPath);

    res.json({ favicon_url: faviconPath, message: 'Favicon berhasil diperbarui!' });
  } catch (err) {
    console.error('Favicon upload error:', err);
    res.status(500).json({ error: 'Gagal upload favicon' });
  }
});

settingsRouter.delete('/favicon', async (req, res) => {
  try {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const brandingDir = path.join(__dirname, '../../../public/uploads/branding');
    const faviconPng = path.join(brandingDir, 'favicon.png');
    const faviconIco = path.join(brandingDir, 'favicon.ico');
    const defaultAmsLogo = path.join(__dirname, '../../../public/images/ams-logo.png');

    // Restore default favicons from ams-logo.png if logo settings is empty, or from current logo if logo exists
    const currentLogoUrl = getSetting('logo_url', '');
    let sourceImage = defaultAmsLogo;

    if (currentLogoUrl) {
      const logoBasePath = currentLogoUrl.split('?')[0];
      const logoFullPath = path.join(__dirname, '../../../public', logoBasePath);
      if (fs.existsSync(logoFullPath)) {
        sourceImage = logoFullPath;
      }
    }

    if (fs.existsSync(sourceImage)) {
      await sharp(sourceImage)
        .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconPng);

      await sharp(sourceImage)
        .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(faviconIco);

      const timestamp = Date.now();
      setSetting('favicon_url', `/uploads/branding/favicon.png?v=${timestamp}`);
    } else {
      if (fs.existsSync(faviconPng)) fs.unlinkSync(faviconPng);
      if (fs.existsSync(faviconIco)) fs.unlinkSync(faviconIco);
      setSetting('favicon_url', '');
    }

    const updatedSettings = getSettings();
    res.json({ success: true, favicon_url: updatedSettings.favicon_url, message: 'Favicon berhasil di-reset!' });
  } catch (err) {
    console.error('Delete favicon error:', err);
    res.status(500).json({ error: 'Gagal menghapus favicon' });
  }
});

settingsRouter.put('/wa-templates', [
  body('templates').isObject().withMessage('Templates harus object'),
  handleValidation
], (req, res) => {
  const { templates } = req.body;
  const defaults = getDefaultWaTemplates();
  const validKeys = Object.keys(defaults);

  const filtered = {};
  for (const key of validKeys) {
    if (templates[key] !== undefined) {
      filtered[key] = templates[key];
    }
  }

  setSetting('wa_templates', filtered);
  res.json(getWaTemplates());
});

settingsRouter.post('/reset-wa-templates', (req, res) => {
  const { key } = req.body || {};
  const defaults = getDefaultWaTemplates();

  if (key && defaults[key] !== undefined) {
    const current = getWaTemplates();
    current[key] = defaults[key];
    setSetting('wa_templates', current);
    return res.json({ success: true, message: `Template '${key}' berhasil direset ke default!`, wa_templates: getWaTemplates(), default: defaults[key] });
  }

  setSetting('wa_templates', defaults);
  res.json({ success: true, message: 'Seluruh template WA berhasil direset ke default!', wa_templates: getWaTemplates() });
});

settingsRouter.post('/reset-defaults', (req, res) => {
  const { category } = req.body || {};

  const defaults = {
    general: {
      company_name: '',
      companyName: '',
      company_phone: '',
      companyPhone: '',
      company_address: '',
      companyAddress: '',
      admin_phone: '',
      adminPhone: '',
      dp_percentage: 50,
      upload_deadline_days: 1,
      auto_approve_hours: 24,
      max_photos_per_fg_per_day: 5,
      invoice_prefix: 'INV',
      session_timeout_minutes: 1440,
      portfolio_limit: 50,
      supported_cities: ["Makassar"]
    },
    seo: {
      seo_domain: '',
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      google_site_verification: ''
    }
  };

  const targetCategory = category || 'all';
  const toReset = targetCategory === 'seo' ? defaults.seo : (targetCategory === 'general' ? defaults.general : { ...defaults.general, ...defaults.seo });

  for (const [key, value] of Object.entries(toReset)) {
    setSetting(key, value);
  }

  res.json({ success: true, message: `Pengaturan ${targetCategory} berhasil direset ke default bawaan sistem!`, settings: getSettings() });
});

module.exports = settingsRouter;
