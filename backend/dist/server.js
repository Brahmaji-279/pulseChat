"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_js_1 = require("./app.js");
const database_js_1 = require("./config/database.js");
const env_js_1 = require("./config/env.js");
const index_js_1 = require("./sockets/index.js");
const httpServer = http_1.default.createServer(app_js_1.app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [env_js_1.ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 15000,
});
(0, index_js_1.setupSocketIO)(io);
async function startServer() {
    try {
        await (0, database_js_1.connectDatabase)();
        httpServer.listen(env_js_1.ENV.PORT, () => {
            console.log(`=======================================================`);
            console.log(`  PulseChat Backend Server running on port ${env_js_1.ENV.PORT}`);
            console.log(`  Health Check: http://localhost:${env_js_1.ENV.PORT}/api/health`);
            console.log(`  PQC Suite: ML-KEM-768 + ML-DSA-65 + AES-256-GCM`);
            console.log(`=======================================================`);
        });
    }
    catch (err) {
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
