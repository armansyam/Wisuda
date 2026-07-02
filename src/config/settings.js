require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8081,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || '/DATA/AppData/wisuda.db',
  sessionSecret: process.env.SESSION_SECRET || 'wisuda-secret-change-in-production',
  sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  uploadPath: process.env.UPLOAD_PATH || '/DATA/AppData/wisuda-uploads',
  backupPath: process.env.BACKUP_PATH || '/DATA/backups',
  companyName: process.env.COMPANY_NAME || 'Sorehari Wisuda',
  companyPhone: process.env.COMPANY_PHONE || '',
  companyAddress: process.env.COMPANY_ADDRESS || '',
  adminPhone: process.env.ADMIN_PHONE || '6282333333420',
  timezone: 'Asia/Makassar',
};