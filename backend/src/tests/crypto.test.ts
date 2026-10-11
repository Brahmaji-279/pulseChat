import { describe, it, expect } from 'vitest';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha384, sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

describe('PulseChat Post-Quantum Cryptography Architecture', () => {
  it('ML-KEM-768 key generation, encapsulation, and decapsulation establish identical shared secret', () => {
    // 1. Recipient keygen
    const recipient = ml_kem768.keygen();
    expect(recipient.publicKey.length).toBe(1184);
    expect(recipient.secretKey.length).toBe(2400);

    // 2. Sender encapsulates to recipient public key
    const { cipherText, sharedSecret: senderSecret } = ml_kem768.encapsulate(recipient.publicKey);
    expect(cipherText.length).toBe(1088);
    expect(senderSecret.length).toBe(32);

    // 3. Recipient decapsulates ciphertext with secret key
    const recipientSecret = ml_kem768.decapsulate(cipherText, recipient.secretKey);
    expect(recipientSecret.length).toBe(32);

    // 4. Verify shared secrets match exactly
    expect(Buffer.from(senderSecret).equals(Buffer.from(recipientSecret))).toBe(true);
  });

  it('ML-DSA-65 digital signatures sign canonically and verify correctly', () => {
    const signer = ml_dsa65.keygen();
    expect(signer.publicKey.length).toBe(1952);
    expect(signer.secretKey.length).toBe(4032);

    const canonicalMessage = new TextEncoder().encode('PULSECHAT_V1_CANONICAL_ENVELOPE|msg-12345|senderA|recipientB');
    const signature = ml_dsa65.sign(canonicalMessage, signer.secretKey);
    expect(signature.length).toBe(3309);

    // Verify valid signature
    const isValid = ml_dsa65.verify(signature, canonicalMessage, signer.publicKey);
    expect(isValid).toBe(true);

    // Verify modified message fails verification
    const tamperedMessage = new TextEncoder().encode('PULSECHAT_V1_CANONICAL_ENVELOPE|msg-12345|senderA|recipientC_TAMPERED');
    const isTamperedValid = ml_dsa65.verify(signature, tamperedMessage, signer.publicKey);
    expect(isTamperedValid).toBe(false);

    // Verify wrong public key fails verification
    const otherUser = ml_dsa65.keygen();
    const isWrongKeyValid = ml_dsa65.verify(signature, canonicalMessage, otherUser.publicKey);
    expect(isWrongKeyValid).toBe(false);
  });

  it('HKDF-SHA384 derives 256-bit symmetric keys with domain separation', () => {
    const sharedSecret = new Uint8Array(32).fill(42);
    const salt = new Uint8Array(32).fill(99);

    const key1 = hkdf(sha384, sharedSecret, salt, new TextEncoder().encode('PULSECHAT_KEY_DIRECTION_A'), 32);
    const key2 = hkdf(sha384, sharedSecret, salt, new TextEncoder().encode('PULSECHAT_KEY_DIRECTION_B'), 32);

    expect(key1.length).toBe(32);
    expect(key2.length).toBe(32);
    expect(Buffer.from(key1).equals(Buffer.from(key2))).toBe(false);
  });

  it('AES-256-GCM authenticated encryption succeeds and tampering is rejected', () => {
    const key = new Uint8Array(32).fill(15);
    const nonce = new Uint8Array(12).fill(8);
    const aad = new TextEncoder().encode('pulse-v1-mlkem768-mldsa65:conv_1:msg_1');
    const plaintext = new TextEncoder().encode('Classified message for recipient eyes only');

    const cipher = gcm(key, nonce, aad);
    const ciphertextWithTag = cipher.encrypt(plaintext);

    // Decrypt valid
    const decipher = gcm(key, nonce, aad);
    const decrypted = decipher.decrypt(ciphertextWithTag);
    expect(new TextDecoder().decode(decrypted)).toBe('Classified message for recipient eyes only');

    // Tamper with ciphertext byte -> Must throw
    const tampered = new Uint8Array(ciphertextWithTag);
    tampered[5] ^= 0x01;
    expect(() => {
      const tamperDecipher = gcm(key, nonce, aad);
      tamperDecipher.decrypt(tampered);
    }).toThrow();

    // Tamper with AAD -> Must throw
    const badAad = new TextEncoder().encode('pulse-v1-mlkem768-mldsa65:conv_1:TAMPERED_MSG_ID');
    expect(() => {
      const badAadDecipher = gcm(key, nonce, badAad);
      badAadDecipher.decrypt(ciphertextWithTag);
    }).toThrow();
  });

  it('Public key fingerprint is deterministic and collision resistant', () => {
    const pubKeyA = new Uint8Array(1952).fill(0xaa);
    const pubKeyB = new Uint8Array(1952).fill(0xbb);

    const fpA1 = bytesToHex(sha256(pubKeyA)).toUpperCase();
    const fpA2 = bytesToHex(sha256(pubKeyA)).toUpperCase();
    const fpB = bytesToHex(sha256(pubKeyB)).toUpperCase();

    expect(fpA1).toBe(fpA2);
    expect(fpA1).not.toBe(fpB);
  });
});
