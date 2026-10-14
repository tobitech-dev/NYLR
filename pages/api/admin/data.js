import { ObjectId } from 'mongodb';
import { db, api } from '../../../lib/db';
import { valid } from '../../../lib/auth';
const COLS = [['createdAt', 'Registered'], ['firstName', 'First name'], ['surname', 'Surname'], ['dob', 'Date of birth'], ['gender', 'Gender'], ['phone', 'Phone'], ['province', 'Province'], ['coordinatorName', 'Coordinator'], ['coordinatorPhone', 'Coordinator phone'], ['parentName', 'Parent name'], ['parentPhone', 'Parent phone'], ['academicLevel', 'Academic level'], ['allergies', 'Allergies'], ['health', 'Health challenges']];
const val = (r, k) => (k === 'createdAt' ? new Date(r[k]).toISOString().slice(0, 16).replace('T', ' ') : String(r[k] == null ? '' : r[k]));
const guard = (s) => ('=+-@'.includes(s.charAt(0)) && s !== '' && !/^[+]?[0-9 ()-]+$/.test(s) ? "'" + s : s);
const h = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export default api(async (req, res) => {
  if (!valid(req)) return res.status(401).json({ error: 'Not signed in' });
  res.setHeader('Cache-Control', 'no-store');
  const c = (await db()).collection('registrations');
  if (req.method === 'DELETE') {
    let id; try { id = new ObjectId(String(req.query.id)); } catch (e) { return res.status(400).json({ error: 'Bad id' }); }
    await c.deleteOne({ _id: id });
    return res.json({ ok: true });
  }
  if (req.method !== 'GET') return res.status(405).end();
  const rows = await c.find({}).sort({ createdAt: -1 }).toArray();
  const f = req.query.format;
  if (f === 'csv') {
    const q = (s) => '"' + s.replace(/"/g, '""') + '"';
    const lines = [COLS.map((x) => q(x[1])).join(',')].concat(rows.map((r) => COLS.map((x) => q(guard(val(r, x[0])))).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nylr-registrations.csv"');
    return res.send(String.fromCharCode(65279) + lines.join(String.fromCharCode(13, 10)));
  }
  if (f === 'xls') {
    const html = '<html><head><meta charset="utf-8"></head><body><table border="1"><tr>' + COLS.map((x) => '<th>' + h(x[1]) + '</th>').join('') + '</tr>' +
      rows.map((r) => '<tr>' + COLS.map((x) => '<td>' + h(guard(val(r, x[0]))) + '</td>').join('') + '</tr>').join('') + '</table></body></html>';
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nylr-registrations.xls"');
    return res.send(html);
  }
  res.json({ rows: rows.map((r) => Object.assign({ id: String(r._id) }, ...COLS.map((x) => ({ [x[0]]: val(r, x[0]) })))) });
});
