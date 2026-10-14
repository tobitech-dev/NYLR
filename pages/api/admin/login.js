const { makeToken, same } = require('../../../lib/auth');
const tries = global._tries || (global._tries = {});
module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  const t = tries[ip] || { n: 0, until: 0 };
  if (t.until > Date.now()) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  const pw = String((req.body && req.body.password) || '');
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET || !same(pw, process.env.ADMIN_PASSWORD)) {
    t.n++; if (t.n >= 5) { t.until = Date.now() + 10 * 60000; t.n = 0; }
    tries[ip] = t;
    return res.status(401).json({ error: 'Wrong password.' });
  }
  delete tries[ip];
  res.setHeader('Set-Cookie', 'nylr_admin=' + makeToken() + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800');
  res.json({ ok: true });
};
