const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../DATA/wisuda.db');
const uploadsDir = path.join(__dirname, '../DATA/uploads');

async function convertPortfolioToWebp() {
  if (!fs.existsSync(uploadsDir)) {
    console.log('Folder uploads tidak ditemukan.');
    return;
  }

  const db = new Database(dbPath);

  console.log('🚀 MENGONVERSI SELURUH GAMBAR DI FOLDER UPLOADS KE FORMAT .WEBP...');

  let convertedCount = 0;
  let totalSavedBytes = 0;

  async function processDir(dirPath) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        await processDir(fullPath);
      } else if (/\.(jpg|jpeg|png|gif|bmp|tiff|heic|heif)$/i.test(file)) {
        const originalSize = stat.size;
        const parsed = path.parse(fullPath);
        const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

        try {
          const buffer = fs.readFileSync(fullPath);
          const webpBuffer = await sharp(buffer)
            .rotate()
            .resize(1000, undefined, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75, effort: 4 })
            .toBuffer();

          fs.writeFileSync(webpPath, webpBuffer);
          
          // Delete old .jpg/.png file
          if (fullPath !== webpPath && fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }

          const saved = originalSize - webpBuffer.length;
          totalSavedBytes += saved;
          convertedCount++;

          const oldRelPath = fullPath.replace(path.join(__dirname, '../DATA'), '').replace(/\\/g, '/');
          const newRelPath = webpPath.replace(path.join(__dirname, '../DATA'), '').replace(/\\/g, '/');

          console.log(`  ✓ Converted: ${parsed.name}.jpg ➔ ${parsed.name}.webp | Size: ${(originalSize/1024).toFixed(1)} KB ➔ ${(webpBuffer.length/1024).toFixed(1)} KB`);
        } catch (e) {
          console.error(`  ❌ Error converting ${file}: ${e.message}`);
        }
      }
    }
  }

  await processDir(uploadsDir);

  // Update Database SQLite portfolio_items URLs from .jpg/.png to .webp
  console.log('\n🔄 MENGUPDATE URL DATABASE SQLITE (cover_photo_url & highlight_photos)...');

  const items = db.prepare('SELECT id, cover_photo_url, highlight_photos FROM portfolio_items').all();
  let updatedDbRows = 0;

  for (const item of items) {
    let newCover = item.cover_photo_url ? item.cover_photo_url.replace(/\.(jpg|jpeg|png)$/i, '.webp') : item.cover_photo_url;
    let newHighlights = item.highlight_photos;

    if (item.highlight_photos) {
      try {
        const arr = JSON.parse(item.highlight_photos);
        if (Array.isArray(arr)) {
          const updatedArr = arr.map(url => typeof url === 'string' ? url.replace(/\.(jpg|jpeg|png)$/i, '.webp') : url);
          newHighlights = JSON.stringify(updatedArr);
        }
      } catch {}
    }

    if (newCover !== item.cover_photo_url || newHighlights !== item.highlight_photos) {
      db.prepare('UPDATE portfolio_items SET cover_photo_url = ?, highlight_photos = ? WHERE id = ?')
        .run(newCover, newHighlights, item.id);
      updatedDbRows++;
    }
  }

  console.log('===================================================');
  console.log(`🎉 KONVERSI .WEBP SELESAI SINKRON!`);
  console.log(`📸 Total Foto Dikonversi ke .webp: ${convertedCount} file`);
  console.log(`💾 Total Ukuran Disimpan Tambahan: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🗃️ Baris Database Diupdate ke .webp: ${updatedDbRows} baris`);
  console.log('===================================================');
}

convertPortfolioToWebp();
