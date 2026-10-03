// GET  /api/data -> { data, sha }   reads data.json from the GitHub repo
// PUT  /api/data  { data, sha }     saves data.json; returns 409 if someone saved in between
const { checkAuth, getBody } = require('./_lib');

const REPO = process.env.GITHUB_REPO || 'niv-ilany/Job_hub_Noy';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE = 'data.json';

function gh(query, opts = {}) {
  return fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}${query}`, {
    ...opts,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'job-hub-noy',
      ...(opts.headers || {})
    }
  });
}

module.exports = async (req, res) => {
  if (!checkAuth(req, res)) return;
  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN is not set in Vercel environment variables' });
  }
  try {
    if (req.method === 'GET') {
      const r = await gh(`?ref=${encodeURIComponent(BRANCH)}`);
      const j = await r.json();
      if (!r.ok) return res.status(502).json({ error: 'GitHub: ' + (j.message || r.status) });
      let text;
      if (j.content && j.encoding === 'base64') {
        text = Buffer.from(j.content, 'base64').toString('utf8');
      } else {
        // files over 1 MB come without inline content
        const raw = await gh(`?ref=${encodeURIComponent(BRANCH)}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
        text = await raw.text();
      }
      return res.status(200).json({ sha: j.sha, data: JSON.parse(text) });
    }

    if (req.method === 'PUT') {
      const body = getBody(req);
      if (!body || !body.data || !Array.isArray(body.data.trackerJobs)) {
        return res.status(400).json({ error: 'Invalid data' });
      }
      if (!body.sha) return res.status(409).json({ error: 'Missing version — reload first' });
      const content = Buffer.from(JSON.stringify(body.data, null, 2), 'utf8').toString('base64');
      const when = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
      const r = await gh('', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Auto-save: ${body.data.trackerJobs.length} jobs — ${when}`,
          content,
          sha: body.sha,
          branch: BRANCH
        })
      });
      const j = await r.json();
      if (r.status === 409 || (r.status === 422 && /sha/i.test(j.message || ''))) {
        return res.status(409).json({ error: 'Changed on another device' });
      }
      if (!r.ok) return res.status(502).json({ error: 'GitHub: ' + (j.message || r.status) });
      return res.status(200).json({ sha: j.content.sha });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
