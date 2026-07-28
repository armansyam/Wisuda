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

// Default path ke credentials service account
const CREDENTIALS_PATH = path.join(__dirname, '../../DATA/service-account.json');

// Sub-folder yang dibuat otomatis untuk setiap booking
const SUBFOLDERS = [
  { key: 'jpg',       name: 'JPG',             field: 'staging_drive_url'    },
  { key: 'highlight', name: 'Highlight',        field: 'highlight_drive_url'  },
  { key: 'final',     name: 'All File Edited',  field: 'download_url'         },
];

/**
 * Load credentials dari file ATAU dari DB settings.
 * Prioritas: file → DB → null
 */
function loadCredentials() {
  // 1. Cek file service-account.json
  if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    } catch (e) {
      console.error('[DriveFolder] Gagal parse service-account.json:', e.message);
    }
  }

  // 2. Cek DB settings (di-upload via admin UI)
  try {
    const { getSetting } = require('../config/wa-templates');
    const jsonStr = getSetting('google_service_account_json', '');
    if (jsonStr) {
      const creds = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      if (creds && creds.client_email && creds.private_key) {
        // Tulis ke file agar bisa dipakai tanpa DB lookup berikutnya
        try {
          fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), 'utf8');
        } catch (writeErr) {
          // Tidak fatal, credentials tetap bisa dipakai dari memory
        }
        return creds;
      }
    }
  } catch (e) {
    // DB belum siap / modul belum loaded — skip
  }

  return null;
}

/**
 * Ambil email Service Account
 */
function getServiceAccountEmail() {
  const creds = loadCredentials();
  return creds ? (creds.client_email || null) : null;
}

/**
 * Simpan service account JSON yang di-upload via admin UI
 * @param {object} jsonData — parsed JSON dari file yang di-upload
 * @returns {{ email: string }} email service account
 */
function saveServiceAccountFromUpload(jsonData) {
  if (!jsonData || !jsonData.client_email || !jsonData.private_key) {
    throw new Error('File JSON tidak valid — harus berisi client_email dan private_key.');
  }

  // Simpan ke file
  const dataDir = path.dirname(CREDENTIALS_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(jsonData, null, 2), 'utf8');

  // Simpan juga ke DB sebagai backup
  try {
    const { setSetting } = require('../config/wa-templates');
    setSetting('google_service_account_json', JSON.stringify(jsonData), 'Google Service Account credentials (uploaded via admin UI)');
  } catch (e) {
    // Non-fatal — file sudah tersimpan
  }

  return { email: jsonData.client_email };
}

/**
 * Inisialisasi Google Drive client via Service Account
 */
function getDriveClient() {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error('Service account belum dikonfigurasi. Upload file service-account.json di Admin Panel > Settings > Google Drive.');
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Buat satu folder di Google Drive
 * @param {object} drive - Drive client
 * @param {string} name  - Nama folder
 * @param {string} parentId - ID folder induk
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
 *         └── 📁 All File Edited/           ← download_url
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

  // 1. Buat folder induk client
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
 * Recursively transfer ownership of folder and all contained files to client email
 */
async function transferFolderOwnershipRecursive(folderId, clientEmail) {
  if (!folderId || !clientEmail) return { success: false, reason: 'Missing folderId or clientEmail' };
  try {
    const drive = getDriveClient();
    let processedCount = 0;

    async function processItem(itemId) {
      try {
        await drive.permissions.create({
          fileId: itemId,
          transferOwnership: true,
          requestBody: {
            role: 'owner',
            type: 'user',
            emailAddress: clientEmail
          }
        });
        processedCount++;
      } catch (permErr) {
        try {
          await drive.permissions.create({
            fileId: itemId,
            requestBody: {
              role: 'writer',
              type: 'user',
              emailAddress: clientEmail
            }
          });
          processedCount++;
        } catch (writerErr) {
          console.warn(`[DriveFolder] Permission fallback failed for item ${itemId}:`, writerErr.message);
        }
      }

      let pageToken = null;
      do {
        const res = await drive.files.list({
          q: `'${itemId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, mimeType)',
          pageSize: 1000,
          pageToken: pageToken
        });
        const files = res.data?.files || [];
        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            await processItem(file.id);
          } else {
            try {
              await drive.permissions.create({
                fileId: file.id,
                transferOwnership: true,
                requestBody: {
                  role: 'owner',
                  type: 'user',
                  emailAddress: clientEmail
                }
              });
              processedCount++;
            } catch (fErr) {
              try {
                await drive.permissions.create({
                  fileId: file.id,
                  requestBody: { role: 'writer', type: 'user', emailAddress: clientEmail }
                });
                processedCount++;
              } catch (e) {}
            }
          }
        }
        pageToken = res.data?.nextPageToken;
      } while (pageToken);
    }

    await processItem(folderId);
    return { success: true, processedCount };
  } catch (err) {
    console.error(`[DriveFolder] Transfer ownership error for ${folderId}:`, err.message);
    return { success: false, reason: err.message };
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

module.exports = {
  getServiceAccountEmail,
  saveServiceAccountFromUpload,
  createBookingFolderStructure,
  testConnection,
  formatBytes,
  calculateFolderTotalSize,
  transferFolderOwnershipRecursive,
  moveFolderToTrash,
};
