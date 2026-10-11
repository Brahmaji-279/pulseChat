"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.ENV = {
    PORT: parseInt(process.env.PORT || '5001', 10),
    MONGODB_ATLAS_URI: process.env.MONGODB_ATLAS_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || 'pulsechat_dev_jwt_secret_quantum_key_2026_super_secure',
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    UPLOAD_DIR: path_1.default.resolve(process.cwd(), 'uploads'),
};
