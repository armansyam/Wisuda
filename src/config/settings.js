const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '../../.env');
const envExamplePath = path.join(__dirname, '../../.env.example');

// 1. Jika file .env belum ada, buat otomatis dari template .env.example
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✓ File .env berhasil dibuat secara otomatis dari .env.example');
  } catch (e) {
    console.error('Gagal membuat file .env otomatis:', e.message);
  }
}

require('dotenv').config();

let sessionSecret = process.env.SESSION_SECRET;

const defaultSecrets = [
  'wisuda-secret-change-in-production',
  'your-secret-session-key-here',
  'CHANGE_THIS_IN_PRODUCTION'
];

if (!sessionSecret || defaultSecrets.includes(sessionSecret.trim())) {
  if (fs.existsSync(envPath)) {
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      const randomSecret = crypto.randomBytes(32).toString('hex');
      sessionSecret = randomSecret;
      
      if (envContent.includes('SESSION_SECRET=')) {
        envContent = envContent.replace(/^SESSION_SECRET\s*=\s*.*$/m, `SESSION_SECRET=${randomSecret}`);
      } else {
        envContent += `\nSESSION_SECRET=${randomSecret}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('✓ Secure SESSION_SECRET was automatically generated and saved to your .env file.');
    } catch (e) {
      sessionSecret = crypto.randomBytes(32).toString('hex');
    }
  } else {
    sessionSecret = crypto.randomBytes(32).toString('hex');
  }
}

module.exports = {
  port: process.env.PORT || 8081,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || './DATA/wisuda.db',
  sessionSecret: sessionSecret,
  sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  uploadPath: process.env.UPLOAD_PATH || './DATA/uploads',
  backupPath: process.env.BACKUP_PATH || './DATA/backups',
  companyName: process.env.COMPANY_NAME || 'Sorehari Wisuda',
  companyPhone: process.env.COMPANY_PHONE || '',
  companyAddress: process.env.COMPANY_ADDRESS || '',
  adminPhone: process.env.ADMIN_PHONE || '6282333333420',
  timezone: 'Asia/Makassar',
};