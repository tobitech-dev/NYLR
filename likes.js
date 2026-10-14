const { db, api } = require('../../lib/db');
module.exports = api(async (req, res) => {
  const c = (await db()).collection('likes');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const voter = String(req.query.voter || '').slice(0, 80);
    const counts = {}, mine = {};
    (await c.aggregate([{ $group: { _id: '$photo', n: { $sum: 1 } } }]).toArray()).forEach((a) => (counts[a._id] = a.n));
    if (voter) (await c.find({ voter }).toArray()).forEach((x) => (mine[x.photo] = true));
    return res.json({ counts, mine });
  }
  if (req.method === 'POST') {
    const { id, voter, like } = req.body || {};
    if (!/^p\d{1,3}$/.test(String(id)) || !voter || String(voter).length > 80) return res.status(400).json({ error: 'Bad request' });
    const q = { photo: String(id), voter: String(voter) };
    if (like) await c.updateOne(q, { $setOnInsert: { at: new Date() } }, { upsert: true });
    else await c.deleteOne(q);
    return res.json({ count: await c.countDocuments({ photo: q.photo }) });
  }
  res.status(405).end();
});
