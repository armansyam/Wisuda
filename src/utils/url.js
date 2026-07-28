/**
 * Wisuda Platform — URL Utility
 * 
 * Helper untuk generate URL yang protocol-aware (http/https).
 * Di production (behind Nginx + SSL), otomatis menggunakan https.
 */

/**
 * Menentukan base URL berdasarkan request context.
 * Mendukung reverse proxy via X-Forwarded-Proto header.
 * 
 * @param {import('express').Request} req - Express request object
 * @returns {string} Base URL (contoh: "https://wisuda.example.com")
 */
function getBaseUrl(req) {
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${protocol}://${req.get('host')}`;
}

module.exports = { getBaseUrl };
