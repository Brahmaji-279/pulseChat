import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { CRYPTO_CONSTANTS, CRYPTO_ALGORITHMS } from './algorithms.js';
import { computePublicKeyFingerprint } from './fingerprint.js';

export interface KemKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  keyId: string;
  fingerprint: string;
  version: number;
}

export interface DsaKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  keyId: string;
  fingerprint: string;
  version: number;
}

export interface FullClientIdentityKeys {
  kemKey: KemKeyPair;
  dsaKey: DsaKeyPair;
  kemBindingSignature: string; // Base64 signature of ML-KEM binding signed by ML-DSA key
  createdAt: number;
}

// Convert Uint8Array to Base64
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate ML-KEM-768 Post-Quantum Key Pair (FIPS 203)
 */
export function generateKemKeyPair(version = 1): KemKeyPair {
  const keys = ml_kem768.keygen();
  const keyId = `kem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const fingerprint = computePublicKeyFingerprint(keys.publicKey);

  if (keys.publicKey.length !== CRYPTO_CONSTANTS.ML_KEM_768_PUBLIC_KEY_BYTES) {
    throw new Error('ML-KEM-768 public key size mismatch');
  }

  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    keyId,
    fingerprint,
    version,
  };
}

/**
 * Generate ML-DSA-65 Post-Quantum Signing Key Pair (FIPS 204)
 */
export function generateDsaKeyPair(version = 1): DsaKeyPair {
  const keys = ml_dsa65.keygen();
  const keyId = `dsa-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const fingerprint = computePublicKeyFingerprint(keys.publicKey);

  if (keys.publicKey.length !== CRYPTO_CONSTANTS.ML_DSA_65_PUBLIC_KEY_BYTES) {
    throw new Error('ML-DSA-65 public key size mismatch');
  }

  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    keyId,
    fingerprint,
    version,
  };
}

/**
 * Generates both ML-KEM and ML-DSA keys and cryptographically binds them
 */
export function generateFullIdentityKeys(username: string): FullClientIdentityKeys {
  const dsaKey = generateDsaKeyPair(1);
  const kemKey = generateKemKeyPair(1);

  // Authenticated key binding message: BIND:PULSE:<username>:<algorithm>:<keyId>:<version>:<base64PublicKey>
  const kemPubBase64 = toBase64(kemKey.publicKey);
  const bindingMessage = new TextEncoder().encode(
    `BIND:PULSE:${username}:${CRYPTO_ALGORITHMS.KEM}:${kemKey.keyId}:${kemKey.version}:${kemPubBase64}`
  );

  // Sign binding using ML-DSA-65 secret key (sign: msg, secretKey)
  const sigBytes = ml_dsa65.sign(bindingMessage, dsaKey.secretKey);
  const kemBindingSignature = toBase64(sigBytes);

  return {
    kemKey,
    dsaKey,
    kemBindingSignature,
    createdAt: Date.now(),
  };
}
