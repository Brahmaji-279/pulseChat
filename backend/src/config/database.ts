import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectDatabase(): Promise<void> {
  const mongoUri = ENV.MONGODB_ATLAS_URI;
  if (!mongoUri || !/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
    throw new Error('Set MONGODB_ATLAS_URI in backend/.env to your MongoDB Atlas connection string.');
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    console.log('[PulseChat DB] Connected to MongoDB Atlas.');
  } catch (err) {
    console.error('[PulseChat DB] MongoDB connection error:', err);
    throw err;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[PulseChat DB] MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('[PulseChat DB] MongoDB runtime error:', err);
});
