const crypto = require('crypto');
const secret = () => process.env.SESSION_SECRET || '';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();
function makeToken() { const exp = Date.now() + 8 * 3600 * 1000; return exp + '.' + sign(String(exp)); }
function valid(req) {
  const m = /(?:^|; )nylr_admin=([^;]+)/.exec(req.headers.cookie || '');
  if (!m || !secret()) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
const same = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
module.exports = { makeToken, valid, same };
