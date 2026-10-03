// Shared helpers for the API functions. Files starting with "_" are not exposed as endpoints by Vercel.
const crypto = require('crypto');

function checkAuth(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const expected = process.env.APP_PASSWORD || '';
  if (!expected) {
    res.status(500).json({ error: 'APP_PASSWORD is not set in Vercel environment variables' });
    return false;
  }
  let got = String(req.headers['x-app-password'] || '');
  try { got = decodeURIComponent(got); } catch (e) {}
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Wrong password' });
    return false;
  }
  return true;
}

function getBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  return req.body;
}

module.exports = { checkAuth, getBody };
