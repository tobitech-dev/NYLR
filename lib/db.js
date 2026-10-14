const { MongoClient } = require('mongodb');

let mongoClientPromise;

function db() {
if (!process.env.MONGODB_URI) {
throw new Error('MONGODB_URI is not set');
}

if (!global._mongo) {
global._mongo = new MongoClient(
process.env.MONGODB_URI
).connect();
}

return global._mongo.then((client) =>
client.db(process.env.MONGODB_DB || 'nylr')
);
}

function api(fn) {
return async (req, res) => {
const allowedOrigin = 'https://tobitech-dev.github.io';
const origin = req.headers.origin;

if (origin === allowedOrigin) {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

if (req.method === 'OPTIONS') {
  return res.status(204).end();
}

try {
  return await fn(req, res);
} catch (error) {
  console.error('API error:', error);

  if (!res.headersSent) {
    return res.status(500).json({
      error: 'Server error. Please try again.'
    });
  }

  return;
}

};
}

module.exports = { db, api };
