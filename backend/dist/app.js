"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("./config/env.js");
const error_handler_js_1 = require("./middleware/error-handler.js");
const auth_routes_js_1 = __importDefault(require("./modules/auth/auth.routes.js"));
const users_routes_js_1 = __importDefault(require("./modules/users/users.routes.js"));
const contacts_routes_js_1 = __importDefault(require("./modules/contacts/contacts.routes.js"));
const conversations_routes_js_1 = __importDefault(require("./modules/conversations/conversations.routes.js"));
const messages_routes_js_1 = __importDefault(require("./modules/messages/messages.routes.js"));
const crypto_routes_js_1 = __importDefault(require("./modules/crypto/crypto.routes.js"));
const calls_routes_js_1 = __importDefault(require("./modules/calls/calls.routes.js"));
exports.app = (0, express_1.default)();
// Security HTTP headers
exports.app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// CORS configuration
exports.app.use((0, cors_1.default)({
    origin: [env_js_1.ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json({ limit: '10mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static uploads directory
exports.app.use('/uploads', express_1.default.static(env_js_1.ENV.UPLOAD_DIR));
// Health check endpoint (Section 26)
exports.app.get('/api/health', (_req, res) => {
    const dbConnected = mongoose_1.default.connection.readyState === 1;
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
            connected: dbConnected,
            name: mongoose_1.default.connection.name || 'pulsechat',
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
exports.app.use('/api/auth', auth_routes_js_1.default);
exports.app.use('/api/users', users_routes_js_1.default);
exports.app.use('/api/contacts', contacts_routes_js_1.default);
exports.app.use('/api/conversations', conversations_routes_js_1.default);
exports.app.use('/api', messages_routes_js_1.default);
exports.app.use('/api/crypto', crypto_routes_js_1.default);
exports.app.use('/api/calls', calls_routes_js_1.default);
// 404 handler
exports.app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});
// Global error handler
exports.app.use(error_handler_js_1.errorHandler);
