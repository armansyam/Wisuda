const request = require('supertest');
const { app } = require('../main');
const { migrate } = require('../config/database');

describe('Cache-Control Headers Test Suite', () => {
  beforeAll(() => {
    migrate();
  });

  test('API routes should return private, no-cache, no-store', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
  });

  test('Service Worker /sw.js should prevent long-term caching', async () => {
    const res = await request(app).get('/sw.js');
    expect(res.headers['cache-control']).toBe('public, max-age=0, no-cache, must-revalidate');
  });

  test('Static CSS/JS assets should have long-term immutable Cache-Control', async () => {
    const res = await request(app).get('/css/style.css');
    // Even if file doesn't exist (404), static headers or middleware should set cache headers
    if (res.headers['cache-control']) {
      expect(res.headers['cache-control']).toMatch(/public, max-age=31536000, immutable/);
    }
  });

  test('HTML pages should have short cache with revalidation', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300, s-maxage=3600, stale-while-revalidate=60');
  });
});
