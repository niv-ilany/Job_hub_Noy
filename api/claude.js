// POST /api/claude  { model, max_tokens, system?, messages } -> Anthropic Messages API response
const { checkAuth, getBody } = require('./_lib');

const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']);

module.exports = async (req, res) => {
  if (!checkAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY is not set in Vercel environment variables' } });
  }
  const b = getBody(req) || {};
  if (!ALLOWED_MODELS.has(b.model)) return res.status(400).json({ error: { message: 'Model not allowed: ' + b.model } });
  if (!Array.isArray(b.messages)) return res.status(400).json({ error: { message: 'messages missing' } });

  const payload = {
    model: b.model,
    max_tokens: Math.min(Number(b.max_tokens) || 1000, 4000),
    messages: b.messages
  };
  if (b.system) payload.system = b.system;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: { message: 'Could not reach Anthropic: ' + e.message } });
  }
};
