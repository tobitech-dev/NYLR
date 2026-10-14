const { db, api } = require('../../lib/db');

const LEVELS = [
'Secondary school',
'Awaiting Admission',
'Undergraduate',
'Graduate'
];

const t = (v, n) =>
String(v == null ? '' : v).trim().slice(0, n);

const PHONE = /^+?[\d\s-]{7,18}$/;

export default api(async (req, res) => {
if (req.method !== 'POST') {
res.setHeader('Allow', 'POST');
return res.status(405).json({
error: 'Method not allowed.'
});
}

try {
const b = req.body || {};

// Honeypot field for spam prevention.
if (b.website) {
  return res.status(200).json({ ok: true });
}

const d = {
  firstName: t(b.firstName, 60),
  surname: t(b.surname, 60),
  dob: t(b.dob, 10),
  gender: t(b.gender, 10),
  phone: t(b.phone, 20),
  province: t(b.province, 80),
  coordinatorName: t(b.coordinatorName, 100),
  coordinatorPhone: t(b.coordinatorPhone, 20),
  parentName: t(b.parentName, 100),
  parentPhone: t(b.parentPhone, 20),
  academicLevel: t(b.academicLevel, 30),
  allergies: t(b.allergies, 300),
  health: t(b.health, 300)
};

const required = [
  'firstName',
  'surname',
  'dob',
  'gender',
  'phone',
  'province',
  'coordinatorName',
  'coordinatorPhone',
  'parentName',
  'parentPhone',
  'academicLevel'
];

if (required.some((field) => !d[field])) {
  return res.status(400).json({
    error: 'Please fill in all required fields.'
  });
}

const birthDate = new Date(`${d.dob}T00:00:00`);

if (
  !/^\d{4}-\d{2}-\d{2}$/.test(d.dob) ||
  Number.isNaN(birthDate.getTime()) ||
  birthDate.toISOString().slice(0, 10) !== d.dob ||
  birthDate > new Date()
) {
  return res.status(400).json({
    error: 'Enter a valid date of birth.'
  });
}

if (
  !['Male', 'Female'].includes(d.gender) ||
  !LEVELS.includes(d.academicLevel)
) {
  return res.status(400).json({
    error: 'Check your gender and academic level.'
  });
}

if (
  ![d.phone, d.coordinatorPhone, d.parentPhone]
    .every((phone) => PHONE.test(phone))
) {
  return res.status(400).json({
    error: 'Enter valid phone numbers.'
  });
}

const collection = (await db()).collection('registrations');

const key = [
  d.phone.replace(/\D/g, ''),
  d.surname.toLowerCase(),
  d.firstName.toLowerCase()
].join('|');

const existing = await collection.findOne({ key });

if (existing) {
  return res.status(409).json({
    error: 'You have already registered.'
  });
}

await collection.insertOne({
  ...d,
  key,
  createdAt: new Date()
});

return res.status(201).json({ ok: true });

} catch (error) {
console.error('Registration API error:', error);

return res.status(500).json({
  error: 'Registration failed. Please try again later.'
});

}
});
