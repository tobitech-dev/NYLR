import { db, api } from '../../lib/db';

const LEVELS = ['Secondary school', 'Awaiting Admission', 'Undergraduate', 'Graduate'];
const PHONE = /^[+]?[0-9 -]{7,18}$/;
const DOB = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const EMAIL = /^[^ @]+@[^ @]+[.][^ @]+$/;
const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

async function addToBrevo(d) {
  const key = process.env.BREVO_API_KEY;
  const list = Number(process.env.BREVO_LIST_ID);
  if (!key) return false;
  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        email: d.email,
        attributes: { FIRSTNAME: d.firstName, LASTNAME: d.surname },
        ...(list ? { listIds: [list] } : {}),
        updateEnabled: true,
      }),
    });
    if (!r.ok) console.error('Brevo rejected contact:', r.status);
    return r.ok;
  } catch (e) {
    console.error('Brevo error:', e);
    return false;
  }
}

export default api(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const b = req.body || {};
  if (b.website) return res.status(200).json({ ok: true });

  const d = {
    firstName: t(b.firstName, 60),
    surname: t(b.surname, 60),
    dob: t(b.dob, 10),
    gender: t(b.gender, 10),
    phone: t(b.phone, 20),
    email: t(b.email, 120).toLowerCase(),
    province: t(b.province, 80),
    coordinatorName: t(b.coordinatorName, 100),
    coordinatorPhone: t(b.coordinatorPhone, 20),
    parentName: t(b.parentName, 100),
    parentPhone: t(b.parentPhone, 20),
    academicLevel: t(b.academicLevel, 30),
    allergies: t(b.allergies, 300),
    health: t(b.health, 300),
  };

  const required = ['firstName', 'surname', 'dob', 'gender', 'phone', 'email', 'province', 'coordinatorName', 'coordinatorPhone', 'parentName', 'parentPhone', 'academicLevel'];
  if (required.some((k) => !d[k])) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  if (b.consent !== 'yes' && b.consent !== true) {
    return res.status(400).json({ error: 'Please tick the box to receive event updates.' });
  }

  const num = Number(d.province);
  if (!/^[0-9]{1,3}$/.test(d.province) || num < 1 || num > 100) {
    return res.status(400).json({ error: 'Choose a province number from 1 to 100.' });
  }

  if (!EMAIL.test(d.email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const birth = new Date(d.dob + 'T00:00:00Z');
  if (!DOB.test(d.dob) || Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== d.dob || birth > new Date()) {
    return res.status(400).json({ error: 'Enter a valid date of birth.' });
  }

  if (!['Male', 'Female'].includes(d.gender) || !LEVELS.includes(d.academicLevel)) {
    return res.status(400).json({ error: 'Check your gender and academic level.' });
  }

  if (![d.phone, d.coordinatorPhone, d.parentPhone].every((p) => PHONE.test(p))) {
    return res.status(400).json({ error: 'Enter valid phone numbers.' });
  }

  const collection = (await db()).collection('registrations');

  const key = [d.phone.replace(/[^0-9]/g, ''), d.surname.toLowerCase(), d.firstName.toLowerCase()].join('|');
  if (await collection.findOne({ key })) {
    return res.status(409).json({ error: 'You have already registered.' });
  }

  const brevo = await addToBrevo(d);
  await collection.insertOne({ ...d, key, consent: true, brevo, createdAt: new Date() });
  return res.status(201).json({ ok: true, message: 'Registration successful.' });
});
