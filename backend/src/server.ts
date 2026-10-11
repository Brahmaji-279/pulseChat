import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { ENV } from './config/env.js';
import { setupSocketIO } from './sockets/index.js';

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

setupSocketIO(io);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    httpServer.listen(ENV.PORT, () => {
      console.log(`=======================================================`);
      console.log(`  PulseChat Backend Server running on port ${ENV.PORT}`);
      console.log(`  Health Check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`  PQC Suite: ML-KEM-768 + ML-DSA-65 + AES-256-GCM`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start PulseChat server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

startServer();
