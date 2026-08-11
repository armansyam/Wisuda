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
    await setPublicViewPermission(drive, subFolder.id);
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
  await setPublicViewPermission(drive, subfolderId);
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
  // M3 FIX: Fungsi ini sekarang melempar error eksplisit jika gagal
  // — tidak akan pernah mengembalikan URL palsu yang bisa tersimpan ke database sebagai broken image
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
  await setPublicViewPermission(drive, fileData.id);

  return `https://lh3.googleusercontent.com/d/${fileData.id}=s1600`;
}

/**
 * In-memory stream fetch & direct upload to target subfolder (Zero Disk Transit)
 */
async function copyDriveFilesCloudToCloud(sourceUrlOrFolderId, targetSubfolderId, onProgress) {
  const sourceFolderId = extractFolderIdFromUrl(sourceUrlOrFolderId);
  if (!sourceFolderId) return [];

  try {
    const drive = getDriveClient();
    const res = await drive.files.list({
      q: `'${sourceFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType)'
    });

    const files = res.data.files || [];
    const cdnUrls = [];
    const sharp = require('sharp');

    if (onProgress && typeof onProgress === 'function') {
      try { onProgress(0, files.length); } catch (e) {}
    }

    let current = 0;
    for (const file of files) {
      try {
        // Try direct in-memory stream fetch (Zero Disk Transit)
        const response = await drive.files.get(
          { fileId: file.id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );

        let buffer = Buffer.from(response.data);
        if (buffer && buffer.length > 0) {
          // Compress photo using Sharp in memory (max 1200px, JPEG quality 85)
          // C5 FIX: Log sharp errors agar tidak tersembunyi — buffer asli (tidak terkompresi) tetap diunggah sebagai fallback
          try {
            buffer = await sharp(buffer)
              .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer();
          } catch (sharpErr) {
            console.warn(`[DriveFolder] Sharp compression failed for ${file.name} (${Math.round(Buffer.from(response.data).length / 1024)}KB original), uploading uncompressed:`, sharpErr.message);
          }

          const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
          const url = await uploadPortfolioPhotoToDrive(filename, 'image/jpeg', buffer, targetSubfolderId);
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

module.exports = {
  getDriveClient,
  getOAuth2Client,
  getServiceAccountEmail,
  saveServiceAccountFromUpload,
  createBookingFolderStructure,
  testConnection,
  formatBytes,
  calculateFolderTotalSize,
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
};
