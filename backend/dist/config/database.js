"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("./env.js");
async function connectDatabase() {
    const mongoUri = env_js_1.ENV.MONGODB_ATLAS_URI;
    if (!mongoUri || !/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
        throw new Error('Set MONGODB_ATLAS_URI in backend/.env to your MongoDB Atlas connection string.');
    }
    try {
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            autoIndex: true,
        });
        console.log('[PulseChat DB] Connected to MongoDB Atlas.');
    }
    catch (err) {
        console.error('[PulseChat DB] MongoDB connection error:', err);
        throw err;
    }
}
mongoose_1.default.connection.on('disconnected', () => {
    console.warn('[PulseChat DB] MongoDB disconnected. Attempting to reconnect...');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('[PulseChat DB] MongoDB runtime error:', err);
});
