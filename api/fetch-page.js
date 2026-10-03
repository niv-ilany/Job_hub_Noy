// POST /api/fetch-page { url } -> { status, contents }  (replaces the public allorigins.win proxy)
const { checkAuth, getBody } = require('./_lib');

const BLOCKED_HOST = /^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|\[f[cd])/i;

module.exports = async (req, res) => {
  if (!checkAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { url } = getBody(req) || {};
  let u;
  try { u = new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
  if (!/^https?:$/.test(u.protocol) || BLOCKED_HOST.test(u.hostname) || u.hostname.endsWith('.local')) {
    return res.status(400).json({ error: 'URL not allowed' });
  }
  try {
    const r = await fetch(u.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8'
      }
    });
    let html = await r.text();
    if (html.length > 1500000) html = html.slice(0, 1500000);
    return res.status(200).json({ status: r.status, contents: html });
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'Page took too long to respond' : e.message;
    return res.status(502).json({ error: 'Could not fetch page: ' + msg });
  }
};
