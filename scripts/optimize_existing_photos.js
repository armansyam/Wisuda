const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const portfolioDir = path.join(__dirname, '../DATA/uploads/portfolio');

async function optimizeAllPhotos() {
  if (!fs.existsSync(portfolioDir)) {
    console.log('Folder portfolio tidak ditemukan.');
    return;
  }

  console.log('🚀 MEMULAI OPTIMALISASI DAN KOMPRESI GAMBAR PORTOFOLIO...');

  let totalProcessed = 0;
  let totalSavedBytes = 0;

  async function processDir(dirPath) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        await processDir(fullPath);
      } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
        const originalSize = stat.size;
        // Only optimize if larger than 150 KB
        if (originalSize > 150 * 1024) {
          try {
            const buffer = fs.readFileSync(fullPath);
            const optimizedBuffer = await sharp(buffer)
              .rotate()
              .resize({ width: 1600, withoutEnlargement: true })
              .jpeg({ quality: 78, progressive: true })
              .toBuffer();

            if (optimizedBuffer.length < originalSize) {
              fs.writeFileSync(fullPath, optimizedBuffer);
              const saved = originalSize - optimizedBuffer.length;
              totalSavedBytes += saved;
              totalProcessed++;
              console.log(`  ✓ Compressed: ${path.basename(dirPath)}/${file} | Original: ${(originalSize/1024).toFixed(1)} KB ➔ New: ${(optimizedBuffer.length/1024).toFixed(1)} KB (Saved ${(saved/1024).toFixed(1)} KB)`);
            }
          } catch (e) {
            console.error(`  ❌ Error processing ${file}: ${e.message}`);
          }
        }
      }
    }
  }

  await processDir(portfolioDir);

  console.log('\n===================================================');
  console.log(`🎉 OPTIMALISASI SELESAI!`);
  console.log(`📸 Total Gambar Ditingkatkan: ${totalProcessed} file`);
  console.log(`💾 Total Ukuran Disimpan: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log('===================================================');
}

optimizeAllPhotos();
