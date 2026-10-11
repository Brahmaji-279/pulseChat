import { Request, Response } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Session } from '../../models/Session.js';
import { SecurityEvent } from '../../models/SecurityEvent.js';
import { ENV } from '../../config/env.js';
import { AuthenticatedRequest } from '../../middleware/authentication.js';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(1, 'Display name is required').max(50),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: 'lax' as const,
};

export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password, displayName } = req.body;

  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();

  // Check if username already exists
  const existingUsername = await User.findOne({ normalizedUsername });
  if (existingUsername) {
    res.status(409).json({ success: false, error: 'Username is already taken' });
    return;
  }

  // Check if email already exists
  const existingEmail = await User.findOne({ normalizedEmail });
  if (existingEmail) {
    res.status(409).json({ success: false, error: 'Email address is already registered' });
    return;
  }

  // Hash password using Argon2id with recommended parameters
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });

  const newUser = await User.create({
    username: username.trim(),
    normalizedUsername,
    email: email.trim(),
    normalizedEmail,
    passwordHash,
    displayName: displayName.trim(),
    accountStatus: 'active',
  });

  // Create session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const session = await Session.create({
    userId: newUser._id,
    sessionToken,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || '',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await SecurityEvent.create({
    userId: newUser._id,
    eventType: 'USER_REGISTERED',
    metadata: { username: newUser.username },
    ip: req.ip,
  });

  // Sign JWT
  const token = jwt.sign(
    { userId: newUser._id.toString(), sessionToken },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

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

export async function login(req: Request, res: Response): Promise<void> {
  const { identifier, password } = req.body;
  const normalizedIdentifier = identifier.toLowerCase().trim();

  // Find user by normalizedUsername or normalizedEmail
  const user = await User.findOne({
    $or: [{ normalizedUsername: normalizedIdentifier }, { normalizedEmail: normalizedIdentifier }],
  }).select('+passwordHash');

  if (!user || user.accountStatus !== 'active') {
    res.status(401).json({ success: false, error: 'Invalid username/email or password' });
    return;
  }

  const isValidPassword = await argon2.verify(user.passwordHash, password);
  if (!isValidPassword) {
    await SecurityEvent.create({
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
  const sessionToken = crypto.randomBytes(32).toString('hex');
  await Session.create({
    userId: user._id,
    sessionToken,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || '',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await SecurityEvent.create({
    userId: user._id,
    eventType: 'AUTH_LOGIN_SUCCESS',
    metadata: { username: user.username },
    ip: req.ip,
  });

  const token = jwt.sign(
    { userId: user._id.toString(), sessionToken },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

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

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.user && req.sessionId) {
    await Session.findByIdAndUpdate(req.sessionId, { revokedAt: new Date() });
    await SecurityEvent.create({
      userId: req.user._id,
      eventType: 'AUTH_LOGOUT',
      metadata: {},
      ip: req.ip,
    });
  }

  res.clearCookie('pulse_session', CLEAR_COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  // Always return success to prevent account enumeration
  res.json({
    success: true,
    message: 'If an account exists with that email, a password reset link has been prepared.',
  });
}
