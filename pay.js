import { ObjectId } from 'mongodb';
import { db, api } from '../../../lib/db';
import { valid } from '../../../lib/auth';

const oid = (v) => {
  try { return new ObjectId(String(v)); } catch (e) { return null; }
};
const PAID = (ref) => ({ $set: { paid: true, paidAt: new Date(), paidRef: ref } });
const UNPAID = { $set: { paid: false }, $unset: { paidAt: '', paidRef: '' } };

export default api(async (req, res) => {
  if (!valid(req)) return res.status(401).json({ error: 'Not signed in' });
  res.setHeader('Cache-Control', 'no-store');
  const d = await db();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body || {};
  const ref = String(b.ref || '').trim().slice(0, 200);
  const regs = d.collection('registrations');

  if (b.action === 'mark') {
    const ids = (Array.isArray(b.ids) ? b.ids : []).slice(0, 2000).map(oid).filter(Boolean);
    if (!ids.length) return res.status(400).json({ error: 'Nobody selected' });
    const r = await regs.updateMany({ _id: { $in: ids } }, b.paid ? PAID(ref) : UNPAID);
    return res.status(200).json({ ok: true, changed: r.modifiedCount });
  }

  if (b.action === 'markProvince') {
    const province = String(b.province || '');
    if (!/^[0-9]{1,3}$/.test(province)) return res.status(400).json({ error: 'Bad province' });
    const filter = b.paid ? { province, paid: { $ne: true } } : { province };
    const r = await regs.updateMany(filter, b.paid ? PAID(ref) : UNPAID);
    return res.status(200).json({ ok: true, changed: r.modifiedCount });
  }

  return res.status(400).json({ error: 'Unknown action' });
});
