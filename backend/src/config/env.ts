import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  MONGODB_ATLAS_URI: process.env.MONGODB_ATLAS_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'pulsechat_dev_jwt_secret_quantum_key_2026_super_secure',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'https://pulse-chat-pearl.vercel.app',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  UPLOAD_DIR: path.resolve(process.cwd(), 'uploads'),
};
