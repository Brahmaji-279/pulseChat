import { gcm } from '@noble/ciphers/aes.js';
import { CRYPTO_CONSTANTS } from './algorithms.js';

export interface AesGcmCipherResult {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

/**
 * Encrypt plaintext using AES-256-GCM with fresh unpredictable 96-bit nonce
 * and optional Additional Authenticated Data (AAD).
 */
export function encryptAesGcm(
  key: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array
): AesGcmCipherResult {
  if (key.length !== CRYPTO_CONSTANTS.AES_256_KEY_BYTES) {
    throw new Error('Invalid AES-256 key size: expected 32 bytes');
  }

  // Generate 12-byte cryptographically secure random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.AES_GCM_NONCE_BYTES));

  const cipher = gcm(key, nonce, aad);
  // noble/ciphers gcm.encrypt returns ciphertext with appended 16-byte authentication tag
  const combined = cipher.encrypt(plaintext);

  const tagLength = CRYPTO_CONSTANTS.AES_GCM_TAG_BYTES;
  const ciphertextLength = combined.length - tagLength;
  const ciphertext = combined.slice(0, ciphertextLength);
  const tag = combined.slice(ciphertextLength);

  return {
    nonce,
    ciphertext,
    tag,
  };
}
