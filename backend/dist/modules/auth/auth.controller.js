"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.getCurrentUser = getCurrentUser;
exports.forgotPassword = forgotPassword;
const argon2_1 = __importDefault(require("argon2"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const User_js_1 = require("../../models/User.js");
const Session_js_1 = require("../../models/Session.js");
const SecurityEvent_js_1 = require("../../models/SecurityEvent.js");
const env_js_1 = require("../../config/env.js");
exports.registerSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username cannot exceed 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    displayName: zod_1.z.string().min(1, 'Display name is required').max(50),
});
exports.loginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, 'Username or email is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env_js_1.ENV.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env_js_1.ENV.COOKIE_SECURE,
    sameSite: 'lax',
};
async function register(req, res) {
    const { username, email, password, displayName } = req.body;
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();
    // Check if username already exists
    const existingUsername = await User_js_1.User.findOne({ normalizedUsername });
    if (existingUsername) {
        res.status(409).json({ success: false, error: 'Username is already taken' });
        return;
    }
    // Check if email already exists
    const existingEmail = await User_js_1.User.findOne({ normalizedEmail });
    if (existingEmail) {
        res.status(409).json({ success: false, error: 'Email address is already registered' });
        return;
    }
    // Hash password using Argon2id with recommended parameters
    const passwordHash = await argon2_1.default.hash(password, {
        type: argon2_1.default.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 1,
    });
    const newUser = await User_js_1.User.create({
        username: username.trim(),
        normalizedUsername,
        email: email.trim(),
        normalizedEmail,
        passwordHash,
        displayName: displayName.trim(),
        accountStatus: 'active',
    });
    // Create session
    const sessionToken = crypto_1.default.randomBytes(32).toString('hex');
    const session = await Session_js_1.Session.create({
        userId: newUser._id,
        sessionToken,
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await SecurityEvent_js_1.SecurityEvent.create({
        userId: newUser._id,
        eventType: 'USER_REGISTERED',
        metadata: { username: newUser.username },
        ip: req.ip,
    });
    // Sign JWT
    const token = jsonwebtoken_1.default.sign({ userId: newUser._id.toString(), sessionToken }, env_js_1.ENV.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('pulse_session', token, COOKIE_OPTIONS);
    res.status(201).json({
        success: true,
        user: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            displayName: newUser.displayName,
            profilePhoto: newUser.profilePhoto,
            biography: newUser.biography,
            privacySettings: newUser.privacySettings,
            createdAt: newUser.createdAt,
        },
        token, // Also returned for mobile / non-cookie clients
    });
}
async function login(req, res) {
    const { identifier, password } = req.body;
    const normalizedIdentifier = identifier.toLowerCase().trim();
    // Find user by normalizedUsername or normalizedEmail
    const user = await User_js_1.User.findOne({
        $or: [{ normalizedUsername: normalizedIdentifier }, { normalizedEmail: normalizedIdentifier }],
    }).select('+passwordHash');
    if (!user || user.accountStatus !== 'active') {
        res.status(401).json({ success: false, error: 'Invalid username/email or password' });
        return;
    }
    const isValidPassword = await argon2_1.default.verify(user.passwordHash, password);
    if (!isValidPassword) {
        await SecurityEvent_js_1.SecurityEvent.create({
            userId: user._id,
            eventType: 'AUTH_FAILED_PASSWORD',
            metadata: { identifier },
            ip: req.ip,
        });
        res.status(401).json({ success: false, error: 'Invalid username/email or password' });
        return;
    }
    // Update last active
    user.lastActiveAt = new Date();
    await user.save();
    // Create session
    const sessionToken = crypto_1.default.randomBytes(32).toString('hex');
    await Session_js_1.Session.create({
        userId: user._id,
        sessionToken,
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await SecurityEvent_js_1.SecurityEvent.create({
        userId: user._id,
        eventType: 'AUTH_LOGIN_SUCCESS',
        metadata: { username: user.username },
        ip: req.ip,
    });
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), sessionToken }, env_js_1.ENV.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('pulse_session', token, COOKIE_OPTIONS);
    res.json({
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            profilePhoto: user.profilePhoto,
            biography: user.biography,
            privacySettings: user.privacySettings,
            createdAt: user.createdAt,
        },
        token,
    });
}
async function logout(req, res) {
    if (req.user && req.sessionId) {
        await Session_js_1.Session.findByIdAndUpdate(req.sessionId, { revokedAt: new Date() });
        await SecurityEvent_js_1.SecurityEvent.create({
            userId: req.user._id,
            eventType: 'AUTH_LOGOUT',
            metadata: {},
            ip: req.ip,
        });
    }
    res.clearCookie('pulse_session', CLEAR_COOKIE_OPTIONS);
    res.json({ success: true, message: 'Logged out successfully' });
}
async function getCurrentUser(req, res) {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
    }
    res.json({
        success: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            displayName: req.user.displayName,
            profilePhoto: req.user.profilePhoto,
            biography: req.user.biography,
            privacySettings: req.user.privacySettings,
            createdAt: req.user.createdAt,
        },
    });
}
async function forgotPassword(req, res) {
    const { email } = req.body;
    // Always return success to prevent account enumeration
    res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been prepared.',
    });
}
