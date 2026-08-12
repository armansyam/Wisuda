/**
 * drive.service.js
 * Consolidated Google Drive service layer.
 * Menggabungkan drive-folder.service.js dan menambahkan utilities tambahan.
 *
 * Sesuai MASTER_FLOW.md: Zero-local-disk transit.
 * Semua operasi file langsung ke/dari Google Drive API.
 */

'use strict';

// Re-export semua dari drive-folder.service.js untuk backward compat
const driveFolder = require('./drive-folder.service');

/**
 * Buat struktur folder 4-subfolder Drive untuk booking baru.
 * Dipanggil saat Gate 1 lulus (verify-dp).
 * @param {object} booking - Row dari tabel bookings
 * @param {string} masterRootId - ID folder master di Google Drive
 * @returns {Promise<object>} folderMap - { drive_parent_url, staging_drive_url, highlight_drive_url, download_url }
 */
async function createBookingFolderStructure(booking, masterRootId) {
  return driveFolder.createBookingFolderStructure(booking, masterRootId);
}

/**
 * Hitung total ukuran folder Drive secara rekursif.
 * @param {string} folderId
 * @returns {Promise<object>} { totalBytes, formattedSize }
 */
async function calculateFolderTotalSize(folderId) {
  return driveFolder.calculateFolderTotalSize(folderId);
}

/**
 * Format bytes ke string readable (KB, MB, GB).
 * @param {number} bytes
 */
function formatBytes(bytes) {
  return driveFolder.formatBytes(bytes);
}

/**
 * Ekstrak folder ID dari berbagai format URL Google Drive.
 * @param {string} url
 * @returns {string|null}
 */
function extractFolderIdFromUrl(url) {
  return driveFolder.extractFolderIdFromUrl(url);
}

/**
 * Dapatkan Google Drive client (OAuth2 Master Studio Account).
 * @returns {object|null} drive client
 */
function getDriveClient() {
  return driveFolder.getDriveClient();
}

/**
 * Dapatkan OAuth2 Client.
 * @returns {object|null}
 */
function getOAuth2Client(customRedirectUri = null) {
  return driveFolder.getOAuth2Client(customRedirectUri);
}

/**
 * Cloud-to-cloud copy: Salin isi folder Drive ke folder tujuan tanpa disk lokal.
 * @param {string} sourceFolderId
 * @param {string} destParentId
 * @param {string} newName
 * @returns {Promise<string>} newFolderId
 */
async function cloudToCloudCopy(sourceFolderId, destParentId, newName) {
  const drive = getDriveClient();
  if (!drive) throw new Error('Drive client tidak tersedia');

  // Buat folder baru di tujuan
  const folderRes = await drive.files.create({
    resource: {
      name: newName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [destParentId]
    },
    fields: 'id'
  });
  const newFolderId = folderRes.data.id;

  // List semua file & subfolder di source
  const listRes = await drive.files.list({
    q: `'${sourceFolderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType)',
    pageSize: 200
  });
  const files = listRes.data.files || [];

  for (const file of files) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      // Rekursif untuk subfolder
      await cloudToCloudCopy(file.id, newFolderId, file.name);
    } else {
      // Copy file
      await drive.files.copy({
        fileId: file.id,
        resource: { name: file.name, parents: [newFolderId] }
      });
    }
  }

  return newFolderId;
}

/**
 * Hapus folder Drive (pindah ke Trash).
 * @param {string} folderId
 */
async function deleteFolder(folderId) {
  const drive = getDriveClient();
  if (!drive) throw new Error('Drive client tidak tersedia');
  await drive.files.update({
    fileId: folderId,
    resource: { trashed: true }
  });
}

/**
 * Transfer ownership folder Drive ke email lain.
 * @param {string} folderId
 * @param {string} newOwnerEmail
 */
async function transferOwnership(folderId, newOwnerEmail) {
  const drive = getDriveClient();
  if (!drive) throw new Error('Drive client tidak tersedia');
  await drive.permissions.create({
    fileId: folderId,
    transferOwnership: true,
    resource: {
      role: 'owner',
      type: 'user',
      emailAddress: newOwnerEmail
    }
  });
}

module.exports = {
  // Core booking folder
  createBookingFolderStructure,
  calculateFolderTotalSize,
  formatBytes,
  extractFolderIdFromUrl,
  getDriveClient,
  getOAuth2Client,
  // Extended utilities
  cloudToCloudCopy,
  deleteFolder,
  transferOwnership,
  // Pass-through re-exports dari drive-folder.service.js
  ...driveFolder
};
