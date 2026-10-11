import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/**
 * Computes a deterministic cryptographic fingerprint for a public key
 * @param publicKeyBytes Uint8Array of the public key
 * @returns Human readable 4-byte grouped uppercase hex string: "3F2A B81C ..."
 */
export function computePublicKeyFingerprint(publicKeyBytes: Uint8Array): string {
  const hash = sha256(publicKeyBytes);
  const hex = bytesToHex(hash).toUpperCase();
  const chunks = hex.match(/.{1,4}/g);
  return chunks ? chunks.join(' ') : hex;
}

/**
 * Compare two fingerprints in constant-time logic
 */
export function compareFingerprints(fp1: string, fp2: string): boolean {
  const clean1 = fp1.replace(/\s+/g, '').toUpperCase();
  const clean2 = fp2.replace(/\s+/g, '').toUpperCase();
  if (clean1.length !== clean2.length) return false;

  let mismatch = 0;
  for (let i = 0; i < clean1.length; i++) {
    mismatch |= clean1.charCodeAt(i) ^ clean2.charCodeAt(i);
  }
  return mismatch === 0;
}
