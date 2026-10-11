import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { fromBase64, toBase64 } from './key-generation.js';
import { CRYPTO_ALGORITHMS } from './algorithms.js';

export interface VerifiedContactKey {
  username: string;
  userId: string;
  kemPublicKey: Uint8Array;
  kemKeyId: string;
  kemFingerprint: string;
  kemVersion: number;
  dsaPublicKey: Uint8Array;
  dsaKeyId: string;
  dsaFingerprint: string;
  verifiedAt: number;
}

export interface KeyChangeEvent {
  username: string;
  oldFingerprint: string;
  newFingerprint: string;
  timestamp: number;
}

// In-memory / persistent cache of verified contact keys
const verifiedKeyCache = new Map<string, VerifiedContactKey>();
const keyChangeListeners = new Set<(event: KeyChangeEvent) => void>();

export function onKeyChanged(listener: (event: KeyChangeEvent) => void): () => void {
  keyChangeListeners.add(listener);
  return () => keyChangeListeners.delete(listener);
}

/**
 * Fetch and cryptographically verify public keys for a recipient
 */
export async function getVerifiedContactKeys(
  username: string,
  fetchFn: (username: string) => Promise<any>
): Promise<VerifiedContactKey> {
  const data = await fetchFn(username);
  if (!data || !data.keys || data.keys.length === 0) {
    throw new Error(`No public keys published for user: ${username}`);
  }

  const dsaKeyData = data.keys.find((k: any) => k.algorithm === 'ML-DSA-65');
  const kemKeyData = data.keys.find((k: any) => k.algorithm === 'ML-KEM-768');

  if (!dsaKeyData || !kemKeyData) {
    throw new Error(`User ${username} has incomplete post-quantum key suite`);
  }

  const dsaPubKeyBytes = fromBase64(dsaKeyData.publicKey);
  const kemPubKeyBytes = fromBase64(kemKeyData.publicKey);

  // Verify ML-DSA binding of the ML-KEM key if present
  if (kemKeyData.signatureOrBinding) {
    const sigBytes = fromBase64(kemKeyData.signatureOrBinding);
    const expectedBinding = new TextEncoder().encode(
      `BIND:PULSE:${username}:${CRYPTO_ALGORITHMS.KEM}:${kemKeyData.keyId}:${kemKeyData.keyVersion}:${kemKeyData.publicKey}`
    );

    const validBinding = ml_dsa65.verify(sigBytes, expectedBinding, dsaPubKeyBytes);
    if (!validBinding) {
      throw new Error(`Cryptographic verification error: ML-KEM key binding signature failed for ${username}`);
    }
  }

  // Key replacement detection
  const previous = verifiedKeyCache.get(username);
  if (previous && previous.dsaFingerprint !== dsaKeyData.fingerprint) {
    const changeEvent: KeyChangeEvent = {
      username,
      oldFingerprint: previous.dsaFingerprint,
      newFingerprint: dsaKeyData.fingerprint,
      timestamp: Date.now(),
    };

    keyChangeListeners.forEach((l) => l(changeEvent));
    console.warn(`[SECURITY WARNING] Identity key changed for contact: ${username}!`);
  }

  const verified: VerifiedContactKey = {
    username,
    userId: data.userId,
    kemPublicKey: kemPubKeyBytes,
    kemKeyId: kemKeyData.keyId,
    kemFingerprint: kemKeyData.fingerprint,
    kemVersion: kemKeyData.keyVersion,
    dsaPublicKey: dsaPubKeyBytes,
    dsaKeyId: dsaKeyData.keyId,
    dsaFingerprint: dsaKeyData.fingerprint,
    verifiedAt: Date.now(),
  };

  verifiedKeyCache.set(username, verified);
  return verified;
}

export function getCachedVerifiedKey(username: string): VerifiedContactKey | undefined {
  return verifiedKeyCache.get(username);
}
