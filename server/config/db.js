import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['1.1.1.1', '8.8.8.8']);

export async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MongoDB URI is not configured. Add MONGO_URI to your .env file.'
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log('[Database] Connected to MongoDB Atlas');
  } catch (err) {
    console.error('[Database] MongoDB connection failed:', err.message);
    throw err;
  }
}