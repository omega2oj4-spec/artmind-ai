import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Database] Error: Neither MONGO_URI nor MONGODB_URI environment variable is set.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[Database] Connected to MongoDB Atlas at ${uri}`);
  } catch (err) {
    console.warn(`[Database] MongoDB connection failed at ${uri}: ${err.message}`);
    try {
      console.log('[Database] Launching MongoMemoryServer fallback...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memUri = mongoServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] Connected to MongoMemoryServer fallback at ${memUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to initialize MongoMemoryServer:', memErr.message);
    }
  }
}
