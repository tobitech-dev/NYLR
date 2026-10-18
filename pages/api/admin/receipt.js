import { ObjectId } from 'mongodb';
import { db, api } from '../../../lib/db';
import { valid } from '../../../lib/auth';

export default api(async (req, res) => {
  if (!valid(req)) return res.status(401).send('Not signed in');
  let id;
  try { id = new ObjectId(String(req.query.id)); } catch (e) { return res.status(400).send('Bad id'); }
  const p = await (await db()).collection('registrations').findOne({ _id: id }, { projection: { receipt: 1 } });
  const m = p && /^data:([a-z/]+);base64,(.+)$/.exec(p.receipt || '');
  if (!m) return res.status(404).send('Not found');
  res.setHeader('Content-Type', m[1]);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', 'inline');
  return res.status(200).send(Buffer.from(m[2], 'base64'));
});
