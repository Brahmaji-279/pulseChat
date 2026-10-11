import { gcm } from '@noble/ciphers/aes.js';
import { CRYPTO_CONSTANTS } from './algorithms.js';

/**
 * Decrypts AES-256-GCM ciphertext and validates authentication tag and AAD.
 * Throws an error immediately if the authentication tag or ciphertext is modified.
 */
export function decryptAesGcm(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  if (key.length !== CRYPTO_CONSTANTS.AES_256_KEY_BYTES) {
    throw new Error('Invalid AES-256 key size: expected 32 bytes');
  }
  if (nonce.length !== CRYPTO_CONSTANTS.AES_GCM_NONCE_BYTES) {
    throw new Error('Invalid AES-GCM nonce size: expected 12 bytes');
  }
  if (tag.length !== CRYPTO_CONSTANTS.AES_GCM_TAG_BYTES) {
    throw new Error('Invalid AES-GCM authentication tag size: expected 16 bytes');
  }

  // Combine ciphertext and tag for noble/ciphers gcm.decrypt
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  try {
    const cipher = gcm(key, nonce, aad);
    return cipher.decrypt(combined);
  } catch (err) {
    throw new Error('Cryptographic verification failed: Authentication tag or ciphertext corrupted.');
  }
}
