const { db, api } = require('../../lib/db');
const LEVELS = ['Secondary school', 'Awaiting Admission', 'Undergraduate', 'Graduate'];
const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const PHONE = /^\+?[\d\s-]{7,18}$/;
module.exports = api(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  if (b.website) return res.json({ ok: true });
  const d = {
    firstName: t(b.firstName, 60), surname: t(b.surname, 60), dob: t(b.dob, 10), gender: t(b.gender, 10),
    phone: t(b.phone, 20), province: t(b.province, 80), coordinatorName: t(b.coordinatorName, 100),
    coordinatorPhone: t(b.coordinatorPhone, 20), parentName: t(b.parentName, 100), parentPhone: t(b.parentPhone, 20),
    academicLevel: t(b.academicLevel, 30), allergies: t(b.allergies, 300), health: t(b.health, 300),
  };
  const need = ['firstName', 'surname', 'dob', 'gender', 'phone', 'province', 'coordinatorName', 'coordinatorPhone', 'parentName', 'parentPhone', 'academicLevel'];
  if (need.some((k) => !d[k])) return res.status(400).json({ error: 'Please fill in all required fields.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dob) || isNaN(Date.parse(d.dob)) || Date.parse(d.dob) > Date.now()) return res.status(400).json({ error: 'Enter a valid date of birth.' });
  if (!['Male', 'Female'].includes(d.gender) || !LEVELS.includes(d.academicLevel)) return res.status(400).json({ error: 'Check your gender and academic level.' });
  if (![d.phone, d.coordinatorPhone, d.parentPhone].every((p) => PHONE.test(p))) return res.status(400).json({ error: 'Enter valid phone numbers.' });
  const c = (await db()).collection('registrations');
  const key = d.phone.replace(/\D/g, '') + '|' + d.surname.toLowerCase() + '|' + d.firstName.toLowerCase();
  if (await c.findOne({ key })) return res.status(409).json({ error: 'You have already registered.' });
  await c.insertOne({ ...d, key, createdAt: new Date() });
  res.json({ ok: true });
});
