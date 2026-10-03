// GET /api/health — diagnostics only. Shows WHETHER things are set up, never the secret values.
const REPO = process.env.GITHUB_REPO || 'niv-ilany/Job_hub_Noy';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const out = {
    node: process.version,
    fetchAvailable: typeof fetch === 'function',
    env: {
      APP_PASSWORD: !!process.env.APP_PASSWORD,
      GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      GITHUB_REPO: REPO
    },
    github: null,
    anthropic: null
  };
  if (out.fetchAvailable && process.env.GITHUB_TOKEN) {
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/contents/data.json`, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'job-hub-noy' }
      });
      const j = await r.json().catch(() => ({}));
      out.github = { status: r.status, ok: r.ok, message: r.ok ? 'can read data.json' : (j.message || '') };
    } catch (e) { out.github = { error: e.message }; }
  }
  if (out.fetchAvailable && process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }
      });
      const j = await r.json().catch(() => ({}));
      out.anthropic = { status: r.status, ok: r.ok, message: r.ok ? 'key works' : (j.error && j.error.message) || '' };
    } catch (e) { out.anthropic = { error: e.message }; }
  }
  res.status(200).json(out);
};
