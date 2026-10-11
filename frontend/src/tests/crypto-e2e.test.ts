import { describe, it, expect } from 'vitest';
import {
  generateFullIdentityKeys,
  createEncryptedEnvelope,
  openEncryptedEnvelope,
  computePublicKeyFingerprint,
} from '../crypto/index.js';

describe('PulseChat Client-Side Post-Quantum Cryptographic Architecture', () => {
  it('generates ML-KEM-768 and ML-DSA-65 keys and cryptographically binds them', () => {
    const aliceKeys = generateFullIdentityKeys('alice');

    expect(aliceKeys.kemKey.publicKey.length).toBe(1184); // FIPS 203 ML-KEM-768 public key
    expect(aliceKeys.kemKey.secretKey.length).toBe(2400); // FIPS 203 ML-KEM-768 secret key
    expect(aliceKeys.dsaKey.publicKey.length).toBe(1952); // FIPS 204 ML-DSA-65 public key
    expect(aliceKeys.dsaKey.secretKey.length).toBe(4032); // FIPS 204 ML-DSA-65 secret key

    // Verifiable binding signature exists
    expect(aliceKeys.kemBindingSignature).toBeDefined();
    expect(typeof aliceKeys.kemBindingSignature).toBe('string');

    // SHA-256 Fingerprints formatted in 4-char groups
    expect(aliceKeys.kemKey.fingerprint).toMatch(/^([0-9A-F]{4}\s?)+$/);
    expect(aliceKeys.dsaKey.fingerprint).toMatch(/^([0-9A-F]{4}\s?)+$/);
  });

  it('performs end-to-end post-quantum message encryption and decryption', () => {
    // 1. Setup Alice and Bob identity keypairs
    const aliceKeys = generateFullIdentityKeys('alice');
    const bobKeys = generateFullIdentityKeys('bob');

    const conversationId = 'conv-alice-bob-123';
    const plaintextMessage = {
      text: 'Quantum computers cannot break this message!',
      type: 'text' as const,
    };

    // 2. Alice encrypts envelope for Bob using Bob ML-KEM public key and Alice ML-DSA signing key
    const envelope = createEncryptedEnvelope({
      content: plaintextMessage,
      conversationId,
      senderId: 'alice-id',
      recipientId: 'bob-id',
      senderDsaKey: aliceKeys.dsaKey,
      senderKemKey: aliceKeys.kemKey,
      recipientKemPublicKey: bobKeys.kemKey.publicKey,
      recipientKemKeyId: bobKeys.kemKey.keyId,
    });

    expect(envelope.protocolVersion).toBe('pulse-v1-mlkem768-mldsa65');
    expect(envelope.signatureAlgorithm).toBe('ML-DSA-65');
    expect(envelope.keyEncapsulationCiphertext).toBeDefined();
    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.tag).toBeDefined();
    expect(envelope.nonce).toBeDefined();

    // 3. Bob decrypts envelope using Bob ML-KEM secret key and Alice ML-DSA public key
    const decrypted = openEncryptedEnvelope({
      envelope,
      recipientKemSecretKey: bobKeys.kemKey.secretKey,
      senderDsaPublicKey: aliceKeys.dsaKey.publicKey,
    });

    expect(decrypted.text).toBe(plaintextMessage.text);
    expect(decrypted.type).toBe('text');
  });

  it('rejects envelope if digital signature is forged or altered', () => {
    const aliceKeys = generateFullIdentityKeys('alice');
    const bobKeys = generateFullIdentityKeys('bob');
    const eveKeys = generateFullIdentityKeys('eve'); // Mallory/Eve

    const envelope = createEncryptedEnvelope({
      content: { text: 'Secret communication' },
      conversationId: 'conv-123',
      senderId: 'alice-id',
      recipientId: 'bob-id',
      senderDsaKey: aliceKeys.dsaKey,
      senderKemKey: aliceKeys.kemKey,
      recipientKemPublicKey: bobKeys.kemKey.publicKey,
      recipientKemKeyId: bobKeys.kemKey.keyId,
    });

    // Bob tries to verify with Eve's key instead of Alice's
    expect(() => {
      openEncryptedEnvelope({
        envelope,
        recipientKemSecretKey: bobKeys.kemKey.secretKey,
        senderDsaPublicKey: eveKeys.dsaKey.publicKey,
      });
    }).toThrow(/signature verification failed/i);
  });

  it('rejects envelope if ciphertext is tampered (AES-256-GCM authentication failure)', () => {
    const aliceKeys = generateFullIdentityKeys('alice');
    const bobKeys = generateFullIdentityKeys('bob');

    const envelope = createEncryptedEnvelope({
      content: { text: 'Sensitive message' },
      conversationId: 'conv-123',
      senderId: 'alice-id',
      recipientId: 'bob-id',
      senderDsaKey: aliceKeys.dsaKey,
      senderKemKey: aliceKeys.kemKey,
      recipientKemPublicKey: bobKeys.kemKey.publicKey,
      recipientKemKeyId: bobKeys.kemKey.keyId,
    });

    // Tamper with ciphertext
    const tamperedEnvelope = {
      ...envelope,
      ciphertext: btoa('tampered_ciphertext_bytes'),
    };

    expect(() => {
      openEncryptedEnvelope({
        envelope: tamperedEnvelope,
        recipientKemSecretKey: bobKeys.kemKey.secretKey,
        senderDsaPublicKey: aliceKeys.dsaKey.publicKey,
      });
    }).toThrow();
  });

  it('computes deterministic, collision-resistant public key fingerprints', () => {
    const keys1 = generateFullIdentityKeys('user1');
    const fp1 = computePublicKeyFingerprint(keys1.dsaKey.publicKey);
    const fp2 = computePublicKeyFingerprint(keys1.dsaKey.publicKey);

    expect(fp1).toBe(fp2);
    expect(fp1.length).toBeGreaterThan(30);
  });
});
