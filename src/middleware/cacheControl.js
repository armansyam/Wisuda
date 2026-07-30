/**
 * Cache-Control Middleware for Cloudflare CDN & Zero Trust Integration
 * Sets optimal Cache-Control HTTP headers based on request route and file type.
 */

/**
 * Custom static file header setter for express.static
 */
function setStaticCacheHeaders(res, path) {
  // Service Worker must NEVER be cached long-term by CDN/Browser
  if (path.endsWith('/sw.js') || path.endsWith('\\sw.js')) {
    res.setHeader('Cache-Control', 'public, max-age=0, no-cache, must-revalidate');
    return;
  }

  // HTML files served statically
  if (path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60');
    return;
  }

  // Static Assets (CSS, JS, Images, Fonts, Favicons)
  if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|ttf|otf|map|mp4|webm)$/i.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  // Default fallback for other static files
  res.setHeader('Cache-Control', 'public, max-age=3600');
}

/**
 * Route-level Cache-Control Middleware
 */
function cacheControlMiddleware(req, res, next) {
  const reqPath = req.path;

  // 1. API routes & Proxy endpoints -> No store, private
  if (reqPath.startsWith('/api') || reqPath.startsWith('/webhook')) {
    if (!reqPath.startsWith('/api/proxy/')) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    }
    return next();
  }

  // 2. Admin app & routes (Protected by Cloudflare Zero Trust) -> Bypass cache
  if (reqPath.startsWith('/admin') || reqPath.startsWith('/admin-app')) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return next();
  }

  // 3. Service Worker route
  if (reqPath === '/sw.js') {
    res.setHeader('Cache-Control', 'public, max-age=0, no-cache, must-revalidate');
    return next();
  }

  // 4. Private Portal Pages (Invoices, Freelance portal, Photo Selection)
  const privatePages = [
    '/freelance-portal.html',
    '/payout-invoice.html',
    '/invoice.html',
    '/select-photos.html',
    '/tracking.html'
  ];

  if (privatePages.some(page => reqPath.includes(page) || reqPath.startsWith('/select-photos/'))) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return next();
  }

  // 5. Static Assets (CSS, JS, Images, Fonts, Favicons)
  if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|ttf|otf|map|mp4|webm)$/i.test(reqPath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return next();
  }

  // 6. Dynamic HTML / Manifest / Root Page
  if (reqPath === '/' || reqPath === '/manifest.json' || reqPath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60');
    return next();
  }

  next();
}

module.exports = {
  setStaticCacheHeaders,
  cacheControlMiddleware
};
