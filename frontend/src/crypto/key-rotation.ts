import {
  generateFullIdentityKeys,
  FullClientIdentityKeys,
  toBase64,
} from './key-generation.js';

export interface KeyRotationResult {
  newKeys: FullClientIdentityKeys;
  kemPayload: {
    keyId: string;
    algorithm: 'ML-KEM-768';
    publicKey: string;
    keyVersion: number;
    signatureOrBinding: string;
    signingKeyId: string;
  };
  dsaPayload: {
    keyId: string;
    algorithm: 'ML-DSA-65';
    publicKey: string;
    keyVersion: number;
  };
}

/**
 * Execute key rotation on the client device
 * Generates fresh ML-KEM-768 and ML-DSA-65 keys, increments version,
 * and binds the new KEM key to the new signing key.
 */
export async function rotateClientKeys(
  username: string,
  currentVersion = 1
): Promise<KeyRotationResult> {
  const newKeys = generateFullIdentityKeys(username);
  newKeys.kemKey.version = currentVersion + 1;
  newKeys.dsaKey.version = currentVersion + 1;

  return {
    newKeys,
    kemPayload: {
      keyId: newKeys.kemKey.keyId,
      algorithm: 'ML-KEM-768',
      publicKey: toBase64(newKeys.kemKey.publicKey),
      keyVersion: newKeys.kemKey.version,
      signatureOrBinding: newKeys.kemBindingSignature,
      signingKeyId: newKeys.dsaKey.keyId,
    },
    dsaPayload: {
      keyId: newKeys.dsaKey.keyId,
      algorithm: 'ML-DSA-65',
      publicKey: toBase64(newKeys.dsaKey.publicKey),
      keyVersion: newKeys.dsaKey.version,
    },
  };
}
