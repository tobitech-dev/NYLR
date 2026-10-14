import { db, api } from '../../lib/db';

export default api(async (req, res) => {
  const c = (await db()).collection('likes');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const voter = String(req.query.voter || '').slice(0, 80);
    const counts = {};
    const mine = {};
    const groups = await c.aggregate([{ $group: { _id: '$photo', n: { $sum: 1 } } }]).toArray();
    groups.forEach((a) => { counts[a._id] = a.n; });
    if (voter) {
      const own = await c.find({ voter }).toArray();
      own.forEach((x) => { mine[x.photo] = true; });
    }
    return res.status(200).json({ counts, mine });
  }

  if (req.method === 'POST') {
    const { id, voter, like } = req.body || {};
    if (!/^p[0-9]{1,3}$/.test(String(id)) || !voter || String(voter).length > 80) {
      return res.status(400).json({ error: 'Bad request' });
    }
    const q = { photo: String(id), voter: String(voter) };
    if (like) await c.updateOne(q, { $setOnInsert: { at: new Date() } }, { upsert: true });
    else await c.deleteOne(q);
    return res.status(200).json({ count: await c.countDocuments({ photo: q.photo }) });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
});
