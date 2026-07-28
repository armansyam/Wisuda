/**
 * jest-global-teardown.js
 * Otomatis membersihkan berkas database uji coba (wisuda_test.db*)
 * dan log temporary setelah pengujian Jest selesai.
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const dataDir = path.join(__dirname, '../DATA');
  const filesToDelete = [
    path.join(dataDir, 'wisuda_test.db'),
    path.join(dataDir, 'wisuda_test.db-shm'),
    path.join(dataDir, 'wisuda_test.db-wal'),
    path.join(dataDir, 'wisuda-builder.log'),
  ];

  for (const filePath of filesToDelete) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Silent catch jika file sedang dikunci
    }
  }
};
