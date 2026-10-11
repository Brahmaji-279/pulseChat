import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { PublicKey } from '../../models/PublicKey.js';
import { AuthenticatedRequest } from '../../middleware/authentication.js';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  biography: z.string().max(250).optional(),
  privacySettings: z
    .object({
      presenceVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
      lastActiveVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
      callPermissions: z.enum(['everyone', 'contacts', 'nobody']).optional(),
    })
    .optional(),
});

export async function searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = (req.query.q as string)?.trim().toLowerCase();
  if (!query || query.length < 1) {
    res.json({ success: true, users: [] });
    return;
  }

  // Escape special regex characters to prevent ReDoS
  const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const currentUserId = req.user?._id;

  // Search users by normalizedUsername or displayName
  const users = await User.find({
    _id: { $ne: currentUserId },
    accountStatus: 'active',
    $or: [
      { normalizedUsername: { $regex: `^${sanitizedQuery}` } },
      { displayName: { $regex: sanitizedQuery, $options: 'i' } },
    ],
  })
    .limit(15)
    .select('_id username displayName profilePhoto biography lastActiveAt privacySettings');

  // Fetch their primary ML-DSA public key fingerprint if available
  const userIds = users.map((u) => u._id);
  const publicKeys = await PublicKey.find({
    userId: { $in: userIds },
    algorithm: 'ML-DSA-65',
    isCurrent: true,
  });

  const keyMap = new Map<string, string>();
  publicKeys.forEach((k) => keyMap.set(k.userId.toString(), k.fingerprint));

  const result = users.map((u) => ({
    id: u._id,
    username: u.username,
    displayName: u.displayName,
    profilePhoto: u.profilePhoto,
    biography: u.biography,
    fingerprint: keyMap.get(u._id.toString()) || null,
  }));

  res.json({ success: true, users: result });
}

export async function getUserByUsername(req: Request, res: Response): Promise<void> {
  const username = req.params.username?.toLowerCase().trim();
  const user = await User.findOne({
    normalizedUsername: username,
    accountStatus: 'active',
  }).select('_id username displayName profilePhoto biography createdAt privacySettings');

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  // Fetch verified public key info
  const keys = await PublicKey.find({
    userId: user._id,
    isCurrent: true,
  }).select('keyId algorithm fingerprint createdAt');

  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      profilePhoto: user.profilePhoto,
      biography: user.biography,
      createdAt: user.createdAt,
      keys: keys.map((k) => ({
        keyId: k.keyId,
        algorithm: k.algorithm,
        fingerprint: k.fingerprint,
        createdAt: k.createdAt,
      })),
    },
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { displayName, biography, privacySettings } = req.body;
  if (displayName) req.user.displayName = displayName.trim();
  if (biography !== undefined) req.user.biography = biography.trim();
  if (privacySettings) {
    req.user.privacySettings = {
      ...req.user.privacySettings,
      ...privacySettings,
    };
  }

  await req.user.save();

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

export async function uploadProfilePhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const savedUrl = (req as Request & { savedFileUrl?: string }).savedFileUrl;
  if (!savedUrl) {
    res.status(400).json({ success: false, error: 'File upload processing failed' });
    return;
  }

  req.user.profilePhoto = savedUrl;
  await req.user.save();

  res.json({
    success: true,
    profilePhoto: savedUrl,
    message: 'Profile photo updated successfully',
  });
}
