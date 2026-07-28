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

const uploadPath = process.env.UPLOAD_PATH || './DATA/uploads';
const backupPath = process.env.BACKUP_PATH || './DATA/backups';

function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];

  // 1. Cek UPLOAD_PATH
  if (!process.env.UPLOAD_PATH) {
    if (isProd) {
      errors.push('UPLOAD_PATH belum diatur di file .env!');
    }
  } else {
    const resolvedPath = path.resolve(process.env.UPLOAD_PATH);
    if (!fs.existsSync(resolvedPath)) {
      errors.push(`Folder UPLOAD_PATH (${resolvedPath}) tidak ditemukan di server!`);
    }
  }

  // 2. Cek BACKUP_PATH
  if (!process.env.BACKUP_PATH) {
    if (isProd) {
      errors.push('BACKUP_PATH belum diatur di file .env!');
    }
  } else {
    const resolvedBackupPath = path.resolve(process.env.BACKUP_PATH);
    if (!fs.existsSync(resolvedBackupPath)) {
      try {
        fs.mkdirSync(resolvedBackupPath, { recursive: true });
      } catch (e) {
        errors.push(`Folder BACKUP_PATH (${resolvedBackupPath}) tidak ada dan gagal dibuat!`);
      }
    }
  }

  // 2. Cek GOOGLE_DRIVE_API_KEY
  if (!process.env.GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY.includes('your_google_drive_api_key')) {
    console.warn('⚠️ WARNING: GOOGLE_DRIVE_API_KEY belum diatur atau menggunakan nilai default. Fitur impor Google Drive akan gagal.');
  }

  if (errors.length > 0) {
    console.error('\n====================================================');
    console.error('❌ CRITICAL ENVIRONMENT ERROR (FAIL-FAST)');
    console.error('====================================================');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('====================================================\n');
    console.error('Server dihentikan untuk mencegah kerusakan/lokasi penyimpanan file yang salah.\n');
    process.exit(1);
  }
}

module.exports = {
  port: process.env.PORT || 8081,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || './DATA/wisuda.db',
  sessionSecret: sessionSecret,
  sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  uploadPath: uploadPath,
  backupPath: backupPath,
  companyName: process.env.COMPANY_NAME || '',
  companyPhone: process.env.COMPANY_PHONE || '',
  companyAddress: process.env.COMPANY_ADDRESS || '',
  adminPhone: process.env.ADMIN_PHONE || '',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081'],
  jwtSecret: process.env.JWT_SECRET || sessionSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  timezone: 'Asia/Makassar',
  validateEnvironment,
};