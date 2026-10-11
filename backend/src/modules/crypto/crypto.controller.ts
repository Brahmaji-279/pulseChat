import { Request, Response } from 'express';
import { z } from 'zod';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { PublicKey } from '../../models/PublicKey.js';
import { User } from '../../models/User.js';
import { SecurityEvent } from '../../models/SecurityEvent.js';
import { AuthenticatedRequest } from '../../middleware/authentication.js';

export const registerKeySchema = z.object({
  keyId: z.string().min(1).max(100),
  algorithm: z.enum(['ML-KEM-768', 'ML-DSA-65']),
  publicKey: z.string().min(10), // Base64 encoded public key
  keyVersion: z.number().int().positive().default(1),
  signatureOrBinding: z.string().optional(), // Base64 signature authenticating the key binding
  signingKeyId: z.string().optional(),
});

function computeFingerprint(publicKeyBase64: string): string {
  const bytes = Buffer.from(publicKeyBase64, 'base64');
  const hash = sha256(bytes);
  const hex = bytesToHex(hash).toUpperCase();
  // Format as nicely grouped 4-char chunks: "A1B2 C3D4 E5F6 ..."
  return hex.match(/.{1,4}/g)?.join(' ') || hex;
}

export async function registerPublicKey(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?._id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { keyId, algorithm, publicKey, keyVersion, signatureOrBinding, signingKeyId } = req.body;

  // Validate public key format length
  const keyBytes = Buffer.from(publicKey, 'base64');
  if (algorithm === 'ML-KEM-768' && keyBytes.length !== 1184) {
    res.status(400).json({
      success: false,
      error: `Invalid ML-KEM-768 public key size: expected 1184 bytes, got ${keyBytes.length}`,
    });
    return;
  }
  if (algorithm === 'ML-DSA-65' && keyBytes.length !== 1952) {
    res.status(400).json({
      success: false,
      error: `Invalid ML-DSA-65 public key size: expected 1952 bytes, got ${keyBytes.length}`,
    });
    return;
  }

  // If this is an ML-KEM key with a signatureOrBinding and signingKeyId, verify the ML-DSA signature
  if (algorithm === 'ML-KEM-768' && signatureOrBinding && signingKeyId) {
    const signingKeyDoc = await PublicKey.findOne({
      userId,
      keyId: signingKeyId,
      algorithm: 'ML-DSA-65',
      revokedAt: null,
    });

    if (signingKeyDoc) {
      try {
        const dsaPubKeyBytes = Buffer.from(signingKeyDoc.publicKey, 'base64');
        const sigBytes = Buffer.from(signatureOrBinding, 'base64');
        const bindingMsg = new TextEncoder().encode(
          `BIND:PULSE:${req.user?.username || ''}:${algorithm}:${keyId}:${keyVersion}:${publicKey}`
        );
        const valid = ml_dsa65.verify(sigBytes, bindingMsg, dsaPubKeyBytes);
        if (!valid) {
          res.status(400).json({
            success: false,
            error: 'Public key binding signature verification failed',
          });
          return;
        }
      } catch (verifyErr) {
        res.status(400).json({
          success: false,
          error: 'Error validating key binding signature',
        });
        return;
      }
    }
  }

  const fingerprint = computeFingerprint(publicKey);

  const existingKey = await PublicKey.findOne({ userId, keyId });
  if (existingKey) {
    if (
      existingKey.algorithm !== algorithm ||
      existingKey.publicKey !== publicKey ||
      existingKey.keyVersion !== keyVersion ||
      existingKey.signatureOrBinding !== signatureOrBinding ||
      existingKey.revokedAt
    ) {
      res.status(409).json({ success: false, error: 'Key ID is already registered or revoked' });
      return;
    }

    await PublicKey.updateMany(
      { userId, algorithm, isCurrent: true, keyId: { $ne: keyId } },
      { isCurrent: false }
    );
    existingKey.isCurrent = true;
    await existingKey.save();

    res.status(200).json({
      success: true,
      key: {
        keyId: existingKey.keyId,
        algorithm: existingKey.algorithm,
        publicKey: existingKey.publicKey,
        keyVersion: existingKey.keyVersion,
        fingerprint: existingKey.fingerprint,
        createdAt: existingKey.createdAt,
      },
    });
    return;
  }

  // Mark prior current keys for this algorithm as not current
  await PublicKey.updateMany(
    { userId, algorithm, isCurrent: true },
    { isCurrent: false }
  );

  const keyDoc = await PublicKey.create({
    userId,
    keyId,
    algorithm,
    publicKey,
    keyVersion,
    signatureOrBinding,
    fingerprint,
    isCurrent: true,
  });

  await SecurityEvent.create({
    userId,
    eventType: 'KEY_REGISTERED',
    metadata: {
      keyId,
      algorithm,
      fingerprint,
      keyVersion,
    },
    ip: req.ip,
  });

  res.status(201).json({
    success: true,
    key: {
      keyId: keyDoc.keyId,
      algorithm: keyDoc.algorithm,
      publicKey: keyDoc.publicKey,
      keyVersion: keyDoc.keyVersion,
      fingerprint: keyDoc.fingerprint,
      createdAt: keyDoc.createdAt,
    },
  });
}

export async function getPublicKeysForUser(req: Request, res: Response): Promise<void> {
  const username = req.params.username?.toLowerCase().trim();

  const user = await User.findOne({
    normalizedUsername: username,
    accountStatus: 'active',
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const keys = await PublicKey.find({
    userId: user._id,
    isCurrent: true,
    revokedAt: null,
  }).select('keyId algorithm publicKey keyVersion signatureOrBinding fingerprint createdAt');

  res.json({
    success: true,
    username: user.username,
    userId: user._id,
    keys: keys.map((k) => ({
      keyId: k.keyId,
      algorithm: k.algorithm,
      publicKey: k.publicKey,
      keyVersion: k.keyVersion,
      signatureOrBinding: k.signatureOrBinding,
      fingerprint: k.fingerprint,
      createdAt: k.createdAt,
    })),
  });
}

export async function getSpecificKey(req: Request, res: Response): Promise<void> {
  const { username, keyId } = req.params;
  const user = await User.findOne({
    normalizedUsername: username.toLowerCase().trim(),
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const key = await PublicKey.findOne({
    userId: user._id,
    keyId,
  }).select('keyId algorithm publicKey keyVersion signatureOrBinding fingerprint createdAt revokedAt isCurrent');

  if (!key) {
    res.status(404).json({ success: false, error: 'Key not found' });
    return;
  }

  res.json({
    success: true,
    key,
  });
}

export async function revokeKey(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?._id;
  const { keyId } = req.params;

  const key = await PublicKey.findOneAndUpdate(
    { userId, keyId },
    { revokedAt: new Date(), isCurrent: false },
    { new: true }
  );

  if (!key) {
    res.status(404).json({ success: false, error: 'Key not found' });
    return;
  }

  await SecurityEvent.create({
    userId,
    eventType: 'KEY_REVOKED',
    metadata: { keyId: key.keyId, algorithm: key.algorithm },
    ip: req.ip,
  });

  res.json({ success: true, message: 'Key revoked successfully', keyId: key.keyId });
}

export async function getUserFingerprint(req: Request, res: Response): Promise<void> {
  const username = req.params.username?.toLowerCase().trim();
  const user = await User.findOne({
    normalizedUsername: username,
    accountStatus: 'active',
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const currentDsaKey = await PublicKey.findOne({
    userId: user._id,
    algorithm: 'ML-DSA-65',
    isCurrent: true,
  });

  const currentKemKey = await PublicKey.findOne({
    userId: user._id,
    algorithm: 'ML-KEM-768',
    isCurrent: true,
  });

  res.json({
    success: true,
    username: user.username,
    displayName: user.displayName,
    dsaFingerprint: currentDsaKey?.fingerprint || null,
    kemFingerprint: currentKemKey?.fingerprint || null,
    keysUpdatedAt: currentDsaKey?.createdAt || currentKemKey?.createdAt || user.createdAt,
  });
}
