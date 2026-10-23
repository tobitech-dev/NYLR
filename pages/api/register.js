import { db, api } from '../../lib/db';

const LEVELS = [
  'Secondary school',
  'Awaiting Admission',
  'Undergraduate',
  'Graduate'
];

const ASSEMBLIES = [
  'Region HQ',
  'LP 33',
  'LP 55',
  'LP 62',
  'LP 98',
  'LP 99',
  'LP 107'
];

const TSHIRT_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL'
];

const PHONE = /^[+]?[0-9 -]{7,18}$/;
const DOB = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const EMAIL = /^[^ @]+@[^ @]+[.][^ @]+$/;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};

const FILE = /^data:(image[/](jpeg|png)|application[/]pdf);base64,[A-Za-z0-9+/=]+$/;

const hits = global._regHits || (global._regHits = {});

const t = (v, n) =>
  String(v == null ? '' : v).trim().slice(0, n);

async function addToBrevo(d) {
  const key = process.env.BREVO_API_KEY;
  const list = Number(process.env.BREVO_LIST_ID);

  if (!key) return false;

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': key,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        email: d.email,
        attributes: {
          FIRSTNAME: d.firstName,
          LASTNAME: d.surname
        },
        ...(list ? { listIds: [list] } : {}),
        updateEnabled: true
      })
    });

    if (!r.ok) {
      console.error('Brevo rejected contact:', r.status);
    }

    return r.ok;
  } catch (e) {
    console.error('Brevo error:', e);
    return false;
  }
}

export default api(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed.'
    });
  }

  const b = req.body || {};

  if (b.website) {
    return res.status(200).json({
      ok: true
    });
  }

  const ip = String(
    req.headers['x-forwarded-for'] || ''
  ).split(',')[0] || 'x';

  const now = Date.now();

  const recent = (hits[ip] || []).filter(
    (x) => now - x < 3600000
  );

  if (recent.length >= 200) {
    return res.status(429).json({
      error: 'Too many registrations. Please try again later.'
    });
  }

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
    tshirtSize: t(b.tshirtSize, 10).toUpperCase(),
    allergies: t(b.allergies, 300),
    health: t(b.health, 300)
  };

  const required = [
    'firstName',
    'surname',
    'dob',
    'gender',
    'phone',
    'email',
    'province',
    'coordinatorName',
    'coordinatorPhone',
    'parentName',
    'parentPhone',
    'academicLevel',
    'tshirtSize'
  ];

  if (required.some((k) => !d[k])) {
    return res.status(400).json({
      error: 'Please fill in all required fields.'
    });
  }

  if (b.consent !== 'yes' && b.consent !== true) {
    return res.status(400).json({
      error: 'Please tick the box to receive event updates.'
    });
  }

  // Validate the selected assembly.
  if (!ASSEMBLIES.includes(d.province)) {
    return res.status(400).json({
      error: 'Please select a valid assembly.'
    });
  }

  // Validate the selected T-shirt size.
  if (!TSHIRT_SIZES.includes(d.tshirtSize)) {
    return res.status(400).json({
      error: 'Please select a valid T-shirt size.'
    });
  }

  if (!EMAIL.test(d.email)) {
    return res.status(400).json({
      error: 'Enter a valid email address.'
    });
  }

  const birth = new Date(d.dob + 'T00:00:00Z');

  if (
    !DOB.test(d.dob) ||
    Number.isNaN(birth.getTime()) ||
    birth.toISOString().slice(0, 10) !== d.dob ||
    birth > new Date()
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
    ![d.phone, d.coordinatorPhone, d.parentPhone].every(
      (p) => PHONE.test(p)
    )
  ) {
    return res.status(400).json({
      error: 'Enter valid phone numbers.'
    });
  }

  const receipt = String(b.receipt || '');

  if (receipt.length > 2800000 || !FILE.test(receipt)) {
    return res.status(400).json({
      error: 'Upload your payment receipt (photo, screenshot or PDF under 2 MB).'
    });
  }

  const collection = (await db()).collection('registrations');

  const key = [
    d.phone.replace(/[^0-9]/g, ''),
    d.surname.toLowerCase(),
    d.firstName.toLowerCase()
  ].join('|');

  if (await collection.findOne({ key })) {
    return res.status(409).json({
      error: 'You have already registered.'
    });
  }

  const brevo = await addToBrevo(d);

  hits[ip] = recent.concat(now);

  await collection.insertOne({
    ...d,
    key,
    consent: true,
    brevo,
    receipt,
    hasReceipt: true,
    paid: false,
    createdAt: new Date()
  });

  return res.status(201).json({
    ok: true,
    message: 'Registration successful.'
  });
});
