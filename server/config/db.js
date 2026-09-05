import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artmind-ai';
  try {
    // Attempt connecting to configured MONGODB_URI with a short timeout
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log(`[Database] Connected to MongoDB at ${uri}`);
  } catch (err) {
    console.warn(`[Database] Local MongoDB not reachable at ${uri}. Launching MongoMemoryServer fallback...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memUri = mongoServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] Connected to MongoMemoryServer at ${memUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to initialize MongoMemoryServer:', memErr.message);
    }
  }
}
