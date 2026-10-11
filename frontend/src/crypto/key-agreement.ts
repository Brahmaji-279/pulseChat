import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { CRYPTO_CONSTANTS } from './algorithms.js';

export interface EncapsulationResult {
  cipherText: Uint8Array; // 1088 bytes encapsulation ciphertext
  sharedSecret: Uint8Array; // 32 bytes agreed shared secret
}

/**
 * Sender encapsulates a shared secret to the recipient's ML-KEM-768 public key (FIPS 203)
 */
export function encapsulateSecret(recipientPublicKey: Uint8Array): EncapsulationResult {
  if (recipientPublicKey.length !== CRYPTO_CONSTANTS.ML_KEM_768_PUBLIC_KEY_BYTES) {
    throw new Error(
      `Invalid recipient ML-KEM-768 public key size: expected ${CRYPTO_CONSTANTS.ML_KEM_768_PUBLIC_KEY_BYTES}, got ${recipientPublicKey.length}`
    );
  }

  const { cipherText, sharedSecret } = ml_kem768.encapsulate(recipientPublicKey);

  return {
    cipherText,
    sharedSecret,
  };
}

/**
 * Recipient decapsulates the shared secret using their private ML-KEM-768 secret key
 */
export function decapsulateSecret(
  cipherText: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array {
  if (cipherText.length !== CRYPTO_CONSTANTS.ML_KEM_768_CIPHERTEXT_BYTES) {
    throw new Error(
      `Invalid ML-KEM-768 ciphertext size: expected ${CRYPTO_CONSTANTS.ML_KEM_768_CIPHERTEXT_BYTES}, got ${cipherText.length}`
    );
  }
  if (recipientSecretKey.length !== CRYPTO_CONSTANTS.ML_KEM_768_SECRET_KEY_BYTES) {
    throw new Error(
      `Invalid ML-KEM-768 secret key size: expected ${CRYPTO_CONSTANTS.ML_KEM_768_SECRET_KEY_BYTES}, got ${recipientSecretKey.length}`
    );
  }

  return ml_kem768.decapsulate(cipherText, recipientSecretKey);
}
