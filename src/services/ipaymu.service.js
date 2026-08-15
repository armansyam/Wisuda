/**
 * src/services/ipaymu.service.js
 * Modul Layanan Integrasi Resmi iPaymu API v2 (Direct QRIS & Verifikasi Akun)
 */
const crypto = require('crypto');

/**
 * Generate HMAC-SHA256 Signature resmi iPaymu API v2
 * Formula: HMAC-SHA256(apiKey, "HTTPMethod:va:lowercase(sha256(body)):apiKey")
 */
function generateSignature(body = {}, method = 'POST', va, apiKey) {
  const bodyString = typeof body === 'object' ? JSON.stringify(body) : String(body);
  const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
  const stringToSign = `${method.toUpperCase()}:${va}:${bodyHash}:${apiKey}`;
  return crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');
}

/**
 * Format timestamp iPaymu (YYYYMMDDHHmmss)
 */
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
}

/**
 * Dapatkan Base URL iPaymu berdasarkan Environment
 */
function getBaseUrl(env = 'sandbox') {
  return env === 'production' 
    ? 'https://my.ipaymu.com' 
    : 'https://sandbox.ipaymu.com';
}

/**
 * Probe Verifikasi Kredensial ke API iPaymu (/api/v2/balance)
 */
async function verifyCredentials({ env = 'sandbox', va, apiKey }) {
  if (!va || !String(va).trim()) {
    throw new Error('Nomor Virtual Account (VA) wajib diisi.');
  }
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('API Key wajib diisi.');
  }

  const cleanVa = String(va).trim();
  const cleanApiKey = String(apiKey).trim();
  const baseUrl = getBaseUrl(env);
  const endpoint = `${baseUrl}/api/v2/balance`;

  const payload = { account: cleanVa };
  const signature = generateSignature(payload, 'POST', cleanVa, cleanApiKey);
  const timestamp = getTimestamp();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'va': cleanVa,
        'signature': signature,
        'timestamp': timestamp
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.Status === 200 && data.Success === true) {
      return {
        ok: true,
        status: 200,
        message: data.Message || 'Terhubung ke server iPaymu',
        data: data.Data || {}
      };
    } else {
      const errorMsg = data.Message || (data.Status ? `Status code: ${data.Status}` : 'Gagal otentikasi iPaymu');
      return {
        ok: false,
        status: data.Status || 400,
        error: errorMsg
      };
    }
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: `Gagal menghubungi server iPaymu (${env}): ${err.message}`
    };
  }
}

module.exports = {
  generateSignature,
  getTimestamp,
  getBaseUrl,
  verifyCredentials
};
