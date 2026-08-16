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

/**
 * Buat Tagihan QRIS Dinamis via iPaymu Direct Payment API (/api/v2/payment/direct)
 */
async function createQrisPayment({
  env = 'sandbox',
  va,
  apiKey,
  name,
  phone,
  email,
  amount,
  comments = 'Pembayaran Sesi Wisuda',
  referenceId,
  notifyUrl,
  expiryMinutes = 15
}) {
  if (!va || !apiKey) {
    throw new Error('Kredensial iPaymu belum terkonfigurasi di sistem.');
  }
  if (!amount || Number(amount) <= 0) {
    throw new Error('Nominal tagihan tidak valid.');
  }

  const cleanVa = String(va).trim();
  const cleanApiKey = String(apiKey).trim();
  const baseUrl = getBaseUrl(env);
  const endpoint = `${baseUrl}/api/v2/payment/direct`;

  // Format nomor telepon standar iPaymu (08xxx)
  let cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('62')) {
    cleanPhone = '0' + cleanPhone.slice(2);
  }

  const cleanExpiryMinutes = Number(expiryMinutes) || 15;

  const payload = {
    name: name || 'Klien Wisuda',
    phone: cleanPhone || '081234567890',
    email: email || 'klien@wisuda.local',
    amount: Math.round(Number(amount)),
    notifyUrl: notifyUrl,
    comments: comments,
    referenceId: referenceId || `TRX-${Date.now()}`,
    paymentMethod: 'qris',
    paymentChannel: 'qris',
    expired: cleanExpiryMinutes,
    expiredType: 'minutes'
  };

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

    if (response.ok && data.Status === 200 && data.Success === true && data.Data) {
      let cleanQrImage = data.Data.QrImage;
      if (cleanQrImage && typeof cleanQrImage === 'string' && cleanQrImage.startsWith('http')) {
        try {
          const imgRes = await fetch(cleanQrImage);
          if (imgRes.ok) {
            const htmlText = await imgRes.text();
            const match = htmlText.match(/src=["'](data:image\/[^"']+)["']/i);
            if (match && match[1]) {
              cleanQrImage = match[1];
            }
          }
        } catch (e) {
          console.warn('[iPaymuService] Gagal fetch base64 qrImage:', e.message);
        }
      }

      return {
        ok: true,
        status: 200,
        message: data.Message || 'Tagihan QRIS berhasil dibuat',
        data: {
          sessionId: data.Data.SessionId,
          transactionId: data.Data.TransactionId,
          referenceId: data.Data.ReferenceId || payload.referenceId,
          via: data.Data.Via || 'qris',
          channel: data.Data.Channel || 'qris',
          paymentNo: data.Data.PaymentNo,
          qrImage: cleanQrImage,
          qrString: data.Data.QrString,
          qrTemplate: data.Data.QrTemplate,
          expired: data.Data.Expired,
          expiryMinutes: cleanExpiryMinutes,
          amount: data.Data.Total || payload.amount,
          fee: data.Data.Fee || 0
        }
      };
    } else {
      const errorMsg = data.Message || (data.Status ? `Status code: ${data.Status}` : 'Gagal membuat QRIS iPaymu');
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
      error: `Gagal menghubungi server iPaymu: ${err.message}`
    };
  }
}

module.exports = {
  generateSignature,
  getTimestamp,
  getBaseUrl,
  verifyCredentials,
  createQrisPayment
};
