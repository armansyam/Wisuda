const request = require('supertest');
const { app } = require('../main');
const { getDb } = require('../config/database');

describe('System Health & Public API Integration Test', () => {
  beforeAll(() => {
    // Ensure database is initialized
    getDb();
  });

  test('GET /api/health should return success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/public/packages should return packages list', async () => {
    const res = await request(app).get('/api/public/packages');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});
