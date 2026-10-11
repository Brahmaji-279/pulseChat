import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import mongoose from 'mongoose';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import contactsRoutes from './modules/contacts/contacts.routes.js';
import conversationsRoutes from './modules/conversations/conversations.routes.js';
import messagesRoutes from './modules/messages/messages.routes.js';
import cryptoRoutes from './modules/crypto/crypto.routes.js';
import callsRoutes from './modules/calls/calls.routes.js';

export const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// Health check endpoint (Section 26)
app.get('/api/health', (_req: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected,
      name: mongoose.connection.name || 'pulsechat',
    },
    cryptography: {
      mlKemStandard: 'FIPS 203 (ML-KEM-768)',
      mlDsaStandard: 'FIPS 204 (ML-DSA-65)',
      symmetricCipher: 'AES-256-GCM',
      keyDerivation: 'HKDF-SHA384',
      status: 'operational',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api', messagesRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/calls', callsRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);
