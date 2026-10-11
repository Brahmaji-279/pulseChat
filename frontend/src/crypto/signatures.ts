import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { CRYPTO_CONSTANTS } from './algorithms.js';

/**
 * Sign data using ML-DSA-65 post-quantum signing key (FIPS 204)
 * @param messageBytes The canonically encoded data to sign
 * @param secretKey The sender's private ML-DSA-65 key
 * @returns 3309-byte digital signature
 */
export function signCanonical(
  messageBytes: Uint8Array,
  secretKey: Uint8Array
): Uint8Array {
  if (secretKey.length !== CRYPTO_CONSTANTS.ML_DSA_65_SECRET_KEY_BYTES) {
    throw new Error(
      `Invalid ML-DSA-65 secret key size: expected ${CRYPTO_CONSTANTS.ML_DSA_65_SECRET_KEY_BYTES}, got ${secretKey.length}`
    );
  }

  return ml_dsa65.sign(messageBytes, secretKey);
}

/**
 * Verify an ML-DSA-65 digital signature against a public key
 * @param signature The 3309-byte digital signature
 * @param messageBytes The canonically encoded data
 * @param publicKey The sender's public ML-DSA-65 key
 * @returns boolean true if signature is cryptographically valid
 */
export function verifyCanonical(
  signature: Uint8Array,
  messageBytes: Uint8Array,
  publicKey: Uint8Array
): boolean {
  if (publicKey.length !== CRYPTO_CONSTANTS.ML_DSA_65_PUBLIC_KEY_BYTES) {
    return false;
  }
  if (signature.length !== CRYPTO_CONSTANTS.ML_DSA_65_SIGNATURE_BYTES) {
    return false;
  }

  try {
    return ml_dsa65.verify(signature, messageBytes, publicKey);
  } catch (err) {
    return false;
  }
}
