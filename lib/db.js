import { MongoClient } from 'mongodb';

export function db() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  if (!global._mongo) global._mongo = new MongoClient(process.env.MONGODB_URI).connect();
  return global._mongo.then((c) => c.db(process.env.MONGODB_DB || 'nylr'));
}

export function api(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error('API error:', e);
      if (!res.headersSent) res.status(500).json({ error: 'Server error. Please try again.' });
    }
  };
}
