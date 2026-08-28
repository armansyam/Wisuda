/**
 * drive-folder.service.js
 * Service untuk otomasi pembuatan struktur folder Google Drive
 * saat client melakukan DP (down payment).
 *
 * Menggunakan Service Account — berjalan 24/7 tanpa perlu login manual.
 * Folder dibuat di dalam "Master Folder" yang sudah di-share ke service account.
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Sub-folder yang dibuat otomatis untuk setiap booking
const SUBFOLDERS = [
  { key: 'jpg',       name: 'JPG',             field: 'staging_drive_url'    },
  { key: 'highlight', name: 'Highlight',        field: 'highlight_drive_url'  },
  { key: 'final',     name: 'Final Editing',    field: 'download_url'         },
  { key: 'moodboard', name: 'Moodboard',        field: 'moodboard_drive_url'  },
];

/**
 * Inisialisasi Google OAuth2 Client (Akun Google Studio Master)
 */
function getOAuth2Client(customRedirectUri = null) {
  const { getSetting } = require('../config/wa-templates');
  const clientId = getSetting('google_oauth_client_id', process.env.GOOGLE_OAUTH_CLIENT_ID || '');
  const clientSecret = getSetting('google_oauth_client_secret', process.env.GOOGLE_OAUTH_CLIENT_SECRET || '');
  const redirectUri = customRedirectUri || getSetting('google_oauth_redirect_uri', process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:8081/api/admin/auth/google/callback');

  if (!clientId || !clientSecret) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const refreshToken = getSetting('google_oauth_refresh_token', '');
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

/**
 * Inisialisasi Google Drive Client Terpusat (OAuth2 Master Studio Account)
 */
function getDriveClient() {
  try {
    const oauth2Client = getOAuth2Client();
    const { getSetting } = require('../config/wa-templates');
    const refreshToken = getSetting('google_oauth_refresh_token', '');
    if (oauth2Client && refreshToken) {
      return google.drive({ version: 'v3', auth: oauth2Client });
    }
  } catch (e) {
    console.warn('[DriveFolder] OAuth client init error:', e.message);
  }

  throw new Error('Google Drive belum dikonfigurasi. Tautkan Akun Google Studio di Admin Panel > Settings.');
}

/**
 * Buat satu folder di Google Drive
 * @param {object} drive - Drive client
 * @param {string} name  - Nama folder
 * @param {string} parentId - ID parent folder
 * @returns {string} ID folder yang baru dibuat
 */
async function createFolder(drive, name, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name, webViewLink',
  });
  return res.data;
}

/**
 * Set permission "Anyone with link can view" pada folder
 * @param {object} drive - Drive client
 * @param {string} fileId - ID file/folder
 */
async function setPublicViewPermission(drive, fileId) {
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });
}

/**
 * Buat struktur folder Drive lengkap untuk satu booking.
 * Dipanggil otomatis saat DP client terverifikasi.
 *
 * Struktur:
 * 📁 MASTER_FOLDER/
 *   └── 📁 Wisuda_NamaClient_YYYY-MM-DD/   ← drive_parent_url
 *         ├── 📁 JPG/                       ← staging_drive_url
 *         ├── 📁 Highlight/                 ← highlight_drive_url
 *         └── 📁 Final Editing/             ← download_url
 *
 * @param {object} booking - Data booking dari DB
 * @param {string} masterFolderId - ID folder master (dari Settings admin)
 * @returns {object} Mapping URL semua folder yang dibuat
 */
async function createBookingFolderStructure(booking, masterFolderId) {
  if (!masterFolderId) {
    throw new Error('Master Folder ID belum dikonfigurasi di Settings admin.');
  }

  const drive = getDriveClient();

  // Format nama folder: Wisuda_NamaClient_TanggalWisuda
  const safeName = (booking.client_name || 'Client')
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const dateStr = booking.graduation_date
    ? booking.graduation_date.replace(/-/g, '-').slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const parentFolderName = `Wisuda_${safeName}_${dateStr}`;

  // 1. Buat folder client
  const parentFolder = await createFolder(drive, parentFolderName, masterFolderId);
  await setPublicViewPermission(drive, parentFolder.id);

  // 2. Buat sub-folder
  const result = {
    drive_parent_url: `https://drive.google.com/drive/folders/${parentFolder.id}`,
    parent_folder_id: parentFolder.id,
    parent_folder_name: parentFolderName,
  };

  for (const sub of SUBFOLDERS) {
    const subFolder = await createFolder(drive, sub.name, parentFolder.id);
    result[sub.field] = `https://drive.google.com/drive/folders/${subFolder.id}`;
    result[`${sub.key}_folder_id`] = subFolder.id;
  }

  return result;
}

/**
 * Test koneksi service account ke Google Drive
 * Dipanggil dari admin panel untuk verifikasi setup.
 */
async function testConnection(masterFolderId) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: masterFolderId,
    fields: 'id, name',
  });
  return { ok: true, folder_name: res.data.name, folder_id: res.data.id };
}

/**
 * Format bytes to human-readable string (e.g. 3.45 GB)
 */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calculate total size in bytes of a folder recursively
 */
async function calculateFolderTotalSize(folderId) {
  if (!folderId) return { totalBytes: 0, formattedSize: '0 B' };
  try {
    const drive = getDriveClient();
    let totalBytes = 0;

    async function scanFolder(currentFolderId) {
      let pageToken = null;
      do {
        const res = await drive.files.list({
          q: `'${currentFolderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, size)',
          pageSize: 1000,
          pageToken: pageToken
        });
        const files = res.data?.files || [];
        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            await scanFolder(file.id);
          } else if (file.size) {
            totalBytes += parseInt(file.size, 10);
          }
        }
        pageToken = res.data?.nextPageToken;
      } while (pageToken);
    }

    await scanFolder(folderId);
    return {
      totalBytes,
      formattedSize: formatBytes(totalBytes)
    };
  } catch (err) {
    console.error(`[DriveFolder] Error calculating size for ${folderId}:`, err.message);
    return { totalBytes: 0, formattedSize: '0 B' };
  }
}

/**
 * List all files in a folder recursively with subfolder paths
 */
async function listFilesInFolderHierarchy(folderId) {
  if (!folderId) return [];
  try {
    const drive = getDriveClient();
    const allFiles = [];

    async function scan(currentFolderId, relativePath = '') {
      let pageToken = null;
      do {
        const res = await drive.files.list({
          q: `'${currentFolderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, size)',
          pageSize: 1000,
          pageToken: pageToken
        });
        const files = res.data?.files || [];
        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            const subPath = relativePath ? `${relativePath}/${file.name}` : file.name;
            await scan(file.id, subPath);
          } else {
            allFiles.push({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? parseInt(file.size, 10) : 0,
              folderPath: relativePath
            });
          }
        }
        pageToken = res.data?.nextPageToken;
      } while (pageToken);
    }

    await scan(folderId);
    return allFiles;
  } catch (err) {
    console.error(`[DriveFolder] Error listing files for ${folderId}:`, err.message);
    return [];
  }
}

/**
 * Stream all files in folder as a ZIP archive directly to an Express response (Zero Disk Transit)
 */
async function streamFolderAsZip(folderId, res, archiveName = 'Foto_Wisuda.zip') {
  const archiver = require('archiver');
  const drive = getDriveClient();
  const allFiles = await listFilesInFolderHierarchy(folderId);

  if (!allFiles || allFiles.length === 0) {
    throw new Error('Tidak ada berkas yang ditemukan dalam folder');
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(archiveName)}"`);
  const archive = (typeof archiver === 'function')
    ? archiver('zip', { zlib: { level: 5 } })
    : (archiver.ZipArchive ? new archiver.ZipArchive({ zlib: { level: 5 } }) : new archiver.Archiver('zip', { zlib: { level: 5 } }));

  archive.on('error', (err) => {
    console.error('[StreamZip] Archiver error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gagal membuat arsip ZIP: ' + err.message });
    }
  });

  archive.pipe(res);

  for (const file of allFiles) {
    try {
      const fileRes = await drive.files.get(
        { fileId: file.id, alt: 'media' },
        { responseType: 'stream' }
      );
      const filePath = file.folderPath ? `${file.folderPath}/${file.name}` : file.name;
      archive.append(fileRes.data, { name: filePath });
    } catch (fileErr) {
      console.warn(`[StreamZip] Skip file ${file.name}:`, fileErr.message);
    }
  }

  await archive.finalize();
}

/**
 * Move a folder to Google Drive trash
 */
async function moveFolderToTrash(folderId) {
  if (!folderId) return false;
  try {
    const drive = getDriveClient();
    await drive.files.update({
      fileId: folderId,
      requestBody: {
        trashed: true
      }
    });
    return true;
  } catch (err) {
    console.error(`[DriveFolder] Error moving folder ${folderId} to trash:`, err.message);
    return false;
  }
}

/**
 * Extract Google Drive Folder ID from a Drive URL or ID string
 */
function extractFolderIdFromUrl(urlOrId) {
  if (!urlOrId) return null;
  let str = String(urlOrId).trim();
  // Strip Google CDN sizing parameter suffix (e.g. =s1600 or =w800)
  str = str.replace(/=[sw]\d+.*$/, '');

  if (!str.includes('http://') && !str.includes('https://')) {
    return str;
  }
  // 1. Standard /folders/FOLDER_ID
  let match = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // 2. Standard /d/FILE_ID (Google CDN & View URLs)
  match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // 3. Query param ?id=FOLDER_ID or &id=FOLDER_ID
  match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  return null;
}

/**
 * Upload a file directly to a Google Drive folder via stream/buffer
 */
async function uploadFileToFolder(folderUrlOrId, fileName, mimeType, buffer) {
  const folderId = extractFolderIdFromUrl(folderUrlOrId);
  if (!folderId) {
    throw new Error('ID / URL Folder Google Drive tidak valid.');
  }

  const drive = getDriveClient();
  const Readable = require('stream').Readable;
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType: mimeType || 'image/jpeg',
      body: stream
    },
    fields: 'id, name, webViewLink, webContentLink'
  });

  return response.data;
}

/**
 * Legacy stubs for Service Account (Deprecated in favor of Unified OAuth2 System)
 */
function getServiceAccountEmail() {
  return null;
}
function saveServiceAccountFromUpload() {
  return { email: null };
}

/**
 * Get or create "Master Portofolio" parent folder in Root Google Drive
 */
async function getOrCreateMasterPortfolioFolder(drive) {
  const { getSetting, setSetting } = require('../config/wa-templates');
  let masterId = getSetting('google_drive_portfolio_folder_id', '');

  if (masterId) return masterId;

  try {
    const res = await drive.files.list({
      q: "name = 'Master Portofolio' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)'
    });

    if (res.data.files && res.data.files.length > 0) {
      masterId = res.data.files[0].id;
    } else {
      const newFolder = await drive.files.create({
        requestBody: {
          name: 'Master Portofolio',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      masterId = newFolder.data.id;
      await setPublicViewPermission(drive, masterId);
    }

    setSetting('google_drive_portfolio_folder_id', masterId);
    return masterId;
  } catch (e) {
    // M5 FIX: Lempar error eksplisit — jangan simpan ID palsu ke Settings
    throw new Error(`[DriveFolder] Gagal mendapatkan/membuat folder 'Master Portofolio': ${e.message}`);
  }
}

/**
 * Create a subfolder for a specific portfolio entry inside "Master Portofolio"
 * Format: [InisialClient]_[Universitas]_[Tahun]
 */
async function createPortfolioItemSubfolder(clientInitial, university, year) {
  // M4 FIX: Fungsi ini sekarang melempar error eksplisit jika gagal
  // — tidak akan pernah mengembalikan mock ID yang bisa tersimpan ke DB
  const drive = getDriveClient();
  const parentId = await getOrCreateMasterPortfolioFolder(drive);

  const cleanInitial = String(clientInitial || 'Wisuda').replace(/[^a-zA-Z0-9_\-]/g, '_').trim();
  const cleanUni = String(university || 'Umum').replace(/[^a-zA-Z0-9_\-]/g, '_').trim();
  const cleanYear = String(year || new Date().getFullYear()).trim();
  const folderName = `${cleanInitial}_${cleanUni}_${cleanYear}`;

  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id, name, webViewLink'
  });

  const subfolderId = res.data.id;
  return subfolderId;
}

/**
 * Rename a portfolio subfolder in Google Drive when portfolio metadata is updated
 */
async function renamePortfolioItemSubfolder(subfolderId, clientInitial, university, year) {
  if (!subfolderId || subfolderId.startsWith('mock_')) return false;

  try {
    const drive = getDriveClient();
    const cleanInitial = String(clientInitial || 'Wisuda').replace(/[^a-zA-Z0-9_\-]/g, '_').trim();
    const cleanUni = String(university || 'Umum').replace(/[^a-zA-Z0-9_\-]/g, '_').trim();
    const cleanYear = String(year || new Date().getFullYear()).trim();
    const newFolderName = `${cleanInitial}_${cleanUni}_${cleanYear}`;

    await drive.files.update({
      fileId: subfolderId,
      requestBody: {
        name: newFolderName
      }
    });
    return true;
  } catch (e) {
    console.warn(`[DriveFolder] Error renaming subfolder ${subfolderId}:`, e.message);
    return false;
  }
}

/**
 * Upload a photo directly to a portfolio subfolder in Google Drive
 */
async function uploadPortfolioPhotoToDrive(fileName, mimeType, buffer, targetFolderId = null, options = {}) {
  const drive = getDriveClient();
  let folderId = null;

  if (typeof targetFolderId === 'string' && targetFolderId.length > 5) {
    folderId = targetFolderId;
  } else if (typeof targetFolderId === 'object' && targetFolderId !== null) {
    options = targetFolderId;
    folderId = null;
  }

  if (!folderId && (options.client_initial || options.client || options.university)) {
    const initial = options.client_initial || options.client;
    const uni = options.university;
    const yr = options.graduation_year || options.year;
    folderId = await createPortfolioItemSubfolder(initial, uni, yr);
  }

  if (!folderId) {
    folderId = await getOrCreateMasterPortfolioFolder(drive);
  }

  const Readable = require('stream').Readable;
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType: mimeType || 'image/jpeg',
      body: stream
    },
    fields: 'id, name, webViewLink, webContentLink'
  });

  const fileData = response.data;
  return `https://lh3.googleusercontent.com/d/${fileData.id}=s1600`;
}

/**
 * In-memory stream fetch & direct upload to target subfolder (Zero Disk Transit)
 */
async function copyDriveFilesCloudToCloud(sourceUrlOrFolderId, targetSubfolderId, onProgress) {
  const targetFolderId = extractFolderIdFromUrl(targetSubfolderId);
  if (!targetFolderId) return [];

  const drive = getDriveClient();
  const cdnUrls = [];
  const sharp = require('sharp');

  // Case 1: Local file in /uploads/
  if (typeof sourceUrlOrFolderId === 'string' && (sourceUrlOrFolderId.startsWith('/uploads/') || sourceUrlOrFolderId.startsWith('uploads/'))) {
    try {
      const publicDir = path.join(__dirname, '../../public');
      const cleanPath = sourceUrlOrFolderId.startsWith('/') ? sourceUrlOrFolderId : '/' + sourceUrlOrFolderId;
      const localPath = path.join(publicDir, cleanPath);
      let buffer = null;
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath);
      }

      if (buffer && buffer.length > 0) {
        let processedBuffer = buffer;
        try {
          processedBuffer = await sharp(buffer)
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .sharpen()
            .webp({ quality: 82 })
            .toBuffer();
        } catch (e) {}

        const filename = `mb_porto_${Date.now()}.webp`;
        const url = await uploadPortfolioPhotoToDrive(filename, 'image/webp', processedBuffer, targetFolderId);
        if (url) cdnUrls.push(url);
      }
      return cdnUrls;
    } catch (e) {
      console.warn('[DriveFolder] Local portfolio copy error:', e.message);
      return [];
    }
  }

  // Case 2: Google Drive File or Folder
  const sourceId = extractFolderIdFromUrl(sourceUrlOrFolderId);
  if (!sourceId) return [];

  try {
    // Check if sourceId is a single file or a folder
    let fileMeta = null;
    try {
      const getRes = await drive.files.get({
        fileId: sourceId,
        fields: 'id, name, mimeType'
      });
      fileMeta = getRes.data;
    } catch (e) {}

    // If it's a single image file, copy Cloud-to-Cloud directly
    if (fileMeta && fileMeta.mimeType && fileMeta.mimeType !== 'application/vnd.google-apps.folder') {
      try {
        const copyRes = await drive.files.copy({
          fileId: sourceId,
          requestBody: {
            name: `mb_porto_${Date.now()}_${fileMeta.name || 'pose.webp'}`,
            parents: [targetFolderId]
          },
          fields: 'id, name'
        });
        const copiedId = copyRes.data.id;
        cdnUrls.push(`https://lh3.googleusercontent.com/d/${copiedId}=s1600`);
        return cdnUrls;
      } catch (copyErr) {
        console.warn('[DriveFolder] Direct drive.files.copy failed, falling back to stream:', copyErr.message);
      }
    }

    // If it's a folder or fallback, query files inside it
    const res = await drive.files.list({
      q: `'${sourceId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType)'
    });

    const files = res.data.files || [];
    if (onProgress && typeof onProgress === 'function') {
      try { onProgress(0, files.length); } catch (e) {}
    }

    let current = 0;
    for (const file of files) {
      try {
        const response = await drive.files.get(
          { fileId: file.id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );

        let buffer = Buffer.from(response.data);
        if (buffer && buffer.length > 0) {
          try {
            buffer = await sharp(buffer)
              .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
              .sharpen()
              .webp({ quality: 82 })
              .toBuffer();
          } catch (sharpErr) {}

          const filename = `mb_porto_${Date.now()}-${Math.random().toString(36).slice(2, 6)}.webp`;
          const url = await uploadPortfolioPhotoToDrive(filename, 'image/webp', buffer, targetFolderId);
          if (url && !url.includes('porto_photo_')) {
            cdnUrls.push(url);
          }
        }
      } catch (fileErr) {
        console.warn(`[DriveFolder] In-memory stream copy warn for ${file.name}:`, fileErr.message);
      }
      current++;
      if (onProgress && typeof onProgress === 'function') {
        try { onProgress(current, files.length); } catch (e) {}
      }
    }

    return cdnUrls;
  } catch (e) {
    console.warn('[DriveFolder] copyDriveFilesCloudToCloud error:', e.message);
    return [];
  }
}

/**
 * Delete a file from Google Drive via API
 */
async function deleteDriveFile(fileUrlOrId) {
  if (!fileUrlOrId) return false;
  const fileId = extractFolderIdFromUrl(fileUrlOrId);
  if (!fileId) return false;

  try {
    const drive = getDriveClient();
    await drive.files.update({
      fileId,
      requestBody: { trashed: true }
    });
    console.log(`[DriveFolder] Successfully trashed file/folder ${fileId} in Google Drive`);
    return true;
  } catch (e) {
    console.warn(`[DriveFolder] Error deleting drive file ${fileId}:`, e.message);
    return false;
  }
}

/**
 * Ensure moodboard folder exists in Google Drive for a booking.
 * Looks for an existing 'Moodboard' subfolder inside drive_parent_url.
 * If not found, creates it.
 * Persists the resulting URL to bookings.moodboard_drive_url.
 */
async function ensureMoodboardFolder(booking) {
  if (!booking) return null;
  if (booking.moodboard_drive_url) return booking.moodboard_drive_url;

  const parentFolderId = extractFolderIdFromUrl(booking.drive_parent_url);
  if (!parentFolderId) return null;

  const drive = getDriveClient();

  // Search for existing 'Moodboard' subfolder in parent folder
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = 'Moodboard' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1
  });

  let folderId = null;
  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id;
  } else {
    // Create 'Moodboard' subfolder if it didn't exist
    const newFolder = await createFolder(drive, 'Moodboard', parentFolderId);
    folderId = newFolder.id;
  }

  const moodboardUrl = `https://drive.google.com/drive/folders/${folderId}`;

  // Persist to DB
  const { getDb } = require('../config/database');
  const db = getDb();
  try {
    db.prepare('UPDATE bookings SET moodboard_drive_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(moodboardUrl, booking.id);
  } catch (e) {
    console.warn('[DriveFolder] Error saving moodboard_drive_url:', e.message);
  }

  return moodboardUrl;
}

module.exports = {
  getDriveClient,
  getOAuth2Client,
  getServiceAccountEmail,
  saveServiceAccountFromUpload,
  createBookingFolderStructure,
  testConnection,
  formatBytes,
  calculateFolderTotalSize,
  listFilesInFolderHierarchy,
  streamFolderAsZip,
  moveFolderToTrash,
  extractFolderIdFromUrl,
  uploadFileToFolder,
  getOrCreateMasterPortfolioFolder,
  createPortfolioItemSubfolder,
  renamePortfolioItemSubfolder,
  uploadPortfolioPhotoToDrive,
  copyDriveFilesCloudToCloud,
  deleteDriveFile,
  setPublicViewPermission,
  ensureMoodboardFolder,
};
