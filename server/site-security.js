'use strict';
const crypto = require('node:crypto');
const path = require('node:path');

function equal(a, b) {
  const hash = value => crypto.createHash('sha256').update(String(value)).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
}

module.exports = function installSiteSecurity(app, express, root) {
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  const attempts = new Map();
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Existing storefront uses inline event handlers/styles. External automatic loads are blocked.
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    let route;
    try { route = decodeURIComponent(req.path).toLowerCase().replace(/\/+$/, '') || '/'; }
    catch (_) { return res.sendStatus(400); }
    const api = route === '/api' || route.startsWith('/api/');
    const admin = route === '/admin' || route.startsWith('/admin/');
    if (api || admin) res.set('Cache-Control', 'no-store');
    if (process.env.NODE_ENV === 'production' && (api || admin) && !req.secure) {
      return res.status(426).send('HTTPS is required');
    }
    const publicRead = ['GET', 'HEAD'].includes(req.method) && (
      ['/api/products', '/api/content', '/api/delivery-options'].includes(route) ||
      /^\/api\/orders\/[^/]+\/status$/.test(route)
    );
    const publicWrite = req.method === 'POST' && ['/api/orders', '/api/yookassa/webhook'].includes(route);
    if ((api && !publicRead && !publicWrite) || admin) {
      const username = process.env.ADMIN_HTTP_USER;
      const password = process.env.ADMIN_HTTP_PASSWORD;
      if (!username || !password || password.length < 20) {
        return res.status(503).send('Administrator access is not configured');
      }
      // Reject cross-origin browser writes, including multipart/form posts (CSRF).
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.get('origin');
        if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(process.env.BASE_URL || 'http://localhost:8000').origin)) {
          return res.sendStatus(403);
        }
      }
      const now = Date.now();
      for (const [ip, item] of attempts) if (item.until <= now) attempts.delete(ip);
      const attempt = attempts.get(req.ip);
      if (attempt && attempt.count >= 20) { res.set('Retry-After', '900'); return res.sendStatus(429); }
      let supplied = '';
      const header = req.get('authorization') || '';
      if (header.startsWith('Basic ')) supplied = Buffer.from(header.slice(6), 'base64').toString('utf8');
      if (!equal(supplied, `${username}:${password}`)) {
        if (attempts.size > 10000) return res.sendStatus(429);
        attempts.set(req.ip, { count: (attempt?.count || 0) + 1, until: attempt?.until || now + 900000 });
        res.set('WWW-Authenticate', 'Basic realm="saba-dy administration", charset="UTF-8"');
        return res.sendStatus(401);
      }
      attempts.delete(req.ip);
    }
    next();
  });

  const pages = new Set(['index.html', 'checkout.html', 'order-success.html', 'offer.html', 'agreement.html', 'privacy.html', 'cookies.html']);
  app.get(['/', '/:page'], (req, res, next) => {
    const file = req.params.page || 'index.html';
    if (!pages.has(file)) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(root, file));
  });
  for (const directory of ['css', 'js', 'images']) {
    app.use('/' + directory, express.static(path.join(root, directory), { dotfiles: 'deny', index: false }));
  }
  app.use('/admin', (req, res, next) => {
    if (/\.map$/i.test(req.path)) return res.sendStatus(404);
    next();
  }, express.static(path.join(root, 'admin'), { dotfiles: 'deny' }));
};
