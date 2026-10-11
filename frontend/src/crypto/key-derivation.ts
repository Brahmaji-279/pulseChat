import { hkdf } from '@noble/hashes/hkdf.js';
import { sha384 } from '@noble/hashes/sha2.js';
import { CRYPTO_CONSTANTS } from './algorithms.js';

/**
 * Derives a 256-bit AES-GCM message encryption key from the established post-quantum shared secret
 * with strict domain separation.
 *
 * @param sharedSecret The 32-byte shared secret decapsulated from ML-KEM-768
 * @param salt Unique conversation / context salt
 * @param domain Context domain separator string
 */
export function deriveMessageKey(
  sharedSecret: Uint8Array,
  salt: Uint8Array,
  domain: string = 'PULSECHAT_V1_AES256GCM_KEY'
): Uint8Array {
  if (sharedSecret.length !== CRYPTO_CONSTANTS.ML_KEM_768_SHARED_SECRET_BYTES) {
    throw new Error('Invalid ML-KEM-768 shared secret length');
  }

  const info = new TextEncoder().encode(domain);
  return hkdf(sha384, sharedSecret, salt, info, CRYPTO_CONSTANTS.AES_256_KEY_BYTES);
}

/**
 * Derives a deterministic context salt for message key establishment
 */
export function deriveConversationSalt(
  conversationId: string,
  timestamp: number
): Uint8Array {
  const input = `${conversationId}:${timestamp}:pulse-salt`;
  const info = new TextEncoder().encode('PULSE_CONTEXT_SALT');
  return hkdf(sha384, new TextEncoder().encode(input), new Uint8Array(32), info, 32);
}
