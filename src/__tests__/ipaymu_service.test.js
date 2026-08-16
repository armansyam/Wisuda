/**
 * src/__tests__/ipaymu_service.test.js
 * Unit Test Suite untuk Layanan iPaymu API v2
 */
const ipaymuService = require('../services/ipaymu.service');

describe('iPaymu Service Unit Tests', () => {
  test('generateSignature produces consistent 64-character hex signature', () => {
    const payload = { account: '1179000899' };
    const va = '1179000899';
    const apiKey = 'SANDBOX-TEST-API-KEY-12345';
    
    const sig1 = ipaymuService.generateSignature(payload, 'POST', va, apiKey);
    const sig2 = ipaymuService.generateSignature(payload, 'POST', va, apiKey);

    expect(typeof sig1).toBe('string');
    expect(sig1.length).toBe(64);
    expect(sig1).toBe(sig2);
  });

  test('getBaseUrl correctly switches between sandbox and production', () => {
    expect(ipaymuService.getBaseUrl('sandbox')).toBe('https://sandbox.ipaymu.com');
    expect(ipaymuService.getBaseUrl('production')).toBe('https://my.ipaymu.com');
  });

  test('getTimestamp returns 14-digit string format YYYYMMDDHHmmss', () => {
    const ts = ipaymuService.getTimestamp();
    expect(ts).toMatch(/^\d{14}$/);
  });

  test('verifyCredentials rejects missing VA or API Key', async () => {
    await expect(ipaymuService.verifyCredentials({ env: 'sandbox', va: '', apiKey: 'abc' }))
      .rejects.toThrow('Nomor Virtual Account (VA) wajib diisi');

    await expect(ipaymuService.verifyCredentials({ env: 'sandbox', va: '1179000899', apiKey: '' }))
      .rejects.toThrow('API Key wajib diisi');
  });

  test('createQrisPayment rejects invalid amount or missing credentials', async () => {
    await expect(ipaymuService.createQrisPayment({ env: 'sandbox', va: '', apiKey: 'key', amount: 50000 }))
      .rejects.toThrow('Kredensial iPaymu belum terkonfigurasi');

    await expect(ipaymuService.createQrisPayment({ env: 'sandbox', va: '1179000899', apiKey: 'key', amount: 0 }))
      .rejects.toThrow('Nominal tagihan tidak valid');
  });
});
