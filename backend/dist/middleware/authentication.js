"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const Session_js_1 = require("../models/Session.js");
const User_js_1 = require("../models/User.js");
async function authenticateToken(req, res, next) {
    try {
        let token = req.cookies?.pulse_session;
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_js_1.ENV.JWT_SECRET);
        const session = await Session_js_1.Session.findOne({
            sessionToken: decoded.sessionToken,
            userId: decoded.userId,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });
        if (!session) {
            res.status(401).json({ success: false, error: 'Session expired or revoked' });
            return;
        }
        const user = await User_js_1.User.findById(decoded.userId);
        if (!user || user.accountStatus !== 'active') {
            res.status(401).json({ success: false, error: 'User account unavailable' });
            return;
        }
        req.user = user;
        req.sessionId = session._id.toString();
        next();
    }
    catch (err) {
        res.status(401).json({ success: false, error: 'Invalid or expired session token' });
    }
}
