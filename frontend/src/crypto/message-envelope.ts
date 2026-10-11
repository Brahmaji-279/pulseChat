import { CURRENT_PROTOCOL_VERSION, assertCompatibleProtocol } from './protocol-version.js';
import { encapsulateSecret, decapsulateSecret } from './key-agreement.js';
import { deriveMessageKey, deriveConversationSalt } from './key-derivation.js';
import { encryptAesGcm } from './encryption.js';
import { decryptAesGcm } from './decryption.js';
import { signCanonical, verifyCanonical } from './signatures.js';
import { toBase64, fromBase64, DsaKeyPair, KemKeyPair } from './key-generation.js';

export interface EncryptedMessageEnvelope {
  protocolVersion: string;
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  senderKeyId: string;
  recipientKeyId: string;
  keyEncapsulationCiphertext: string; // Base64 (1088 bytes)
  nonce: string; // Base64 (12 bytes)
  ciphertext: string; // Base64
  tag: string; // Base64 (16 bytes)
  signatureAlgorithm: 'ML-DSA-65';
  signature: string; // Base64 (3309 bytes)
  timestamp: number;
}

export interface PlaintextMessagePayload {
  text: string;
  type?: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
}

/**
 * Produces a deterministic canonical byte representation of the envelope fields
 * to prevent serialization ambiguity and signature malleability.
 */
export function buildCanonicalSigningData(envelope: {
  protocolVersion: string;
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  senderKeyId: string;
  recipientKeyId: string;
  keyEncapsulationCiphertext: string;
  nonce: string;
  ciphertext: string;
  tag: string;
  timestamp: number;
}): Uint8Array {
  const canonicalString = [
    'PULSECHAT_V1_CANONICAL_ENVELOPE',
    `proto:${envelope.protocolVersion}`,
    `conv:${envelope.conversationId}`,
    `msg:${envelope.messageId}`,
    `snd:${envelope.senderId}`,
    `rcp:${envelope.recipientId}`,
    `skid:${envelope.senderKeyId}`,
    `rkid:${envelope.recipientKeyId}`,
    `kemct:${envelope.keyEncapsulationCiphertext}`,
    `nonce:${envelope.nonce}`,
    `ct:${envelope.ciphertext}`,
    `tag:${envelope.tag}`,
    `ts:${envelope.timestamp}`,
  ].join('|');

  return new TextEncoder().encode(canonicalString);
}

/**
 * Encrypt and sign an outgoing message into an end-to-end encrypted envelope
 */
export function createEncryptedEnvelope(params: {
  content: PlaintextMessagePayload;
  conversationId: string;
  senderId: string;
  recipientId: string;
  senderDsaKey: DsaKeyPair;
  senderKemKey: KemKeyPair;
  recipientKemPublicKey: Uint8Array;
  recipientKemKeyId: string;
}): EncryptedMessageEnvelope {
  const timestamp = Date.now();
  const messageId = `msg-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;

  // 1. Post-Quantum Shared Secret Establishment via ML-KEM-768
  const { cipherText: kemCipherText, sharedSecret } = encapsulateSecret(params.recipientKemPublicKey);

  // 2. Derive 256-bit AES-GCM Key via HKDF-SHA384
  const salt = deriveConversationSalt(params.conversationId, timestamp);
  const aesKey = deriveMessageKey(sharedSecret, salt);

  // 3. Serialize Plaintext Content to JSON UTF-8
  const plaintextBytes = new TextEncoder().encode(JSON.stringify(params.content));

  // 4. Additional Authenticated Data (AAD) binds the message metadata
  const aad = new TextEncoder().encode(
    `${CURRENT_PROTOCOL_VERSION}:${params.conversationId}:${messageId}:${params.senderId}:${params.recipientId}`
  );

  // 5. Symmetric Encryption with fresh CSPRNG nonce
  const { nonce, ciphertext, tag } = encryptAesGcm(aesKey, plaintextBytes, aad);

  const base64KemCt = toBase64(kemCipherText);
  const base64Nonce = toBase64(nonce);
  const base64Ciphertext = toBase64(ciphertext);
  const base64Tag = toBase64(tag);

  // 6. Build canonical envelope signing payload
  const signingPayload = buildCanonicalSigningData({
    protocolVersion: CURRENT_PROTOCOL_VERSION,
    conversationId: params.conversationId,
    messageId,
    senderId: params.senderId,
    recipientId: params.recipientId,
    senderKeyId: params.senderDsaKey.keyId,
    recipientKeyId: params.recipientKemKeyId,
    keyEncapsulationCiphertext: base64KemCt,
    nonce: base64Nonce,
    ciphertext: base64Ciphertext,
    tag: base64Tag,
    timestamp,
  });

  // 7. Post-Quantum Digital Signature via ML-DSA-65
  const signatureBytes = signCanonical(signingPayload, params.senderDsaKey.secretKey);
  const signatureBase64 = toBase64(signatureBytes);

  return {
    protocolVersion: CURRENT_PROTOCOL_VERSION,
    conversationId: params.conversationId,
    messageId,
    senderId: params.senderId,
    recipientId: params.recipientId,
    senderKeyId: params.senderDsaKey.keyId,
    recipientKeyId: params.recipientKemKeyId,
    keyEncapsulationCiphertext: base64KemCt,
    nonce: base64Nonce,
    ciphertext: base64Ciphertext,
    tag: base64Tag,
    signatureAlgorithm: 'ML-DSA-65',
    signature: signatureBase64,
    timestamp,
  };
}

/**
 * Decrypts and cryptographically verifies an incoming message envelope
 */
export function openEncryptedEnvelope(params: {
  envelope: EncryptedMessageEnvelope;
  recipientKemSecretKey: Uint8Array;
  senderDsaPublicKey: Uint8Array;
}): PlaintextMessagePayload {
  // 1. Verify Protocol Version
  assertCompatibleProtocol(params.envelope.protocolVersion);

  // 2. Verify ML-DSA-65 Digital Signature
  const canonicalData = buildCanonicalSigningData({
    protocolVersion: params.envelope.protocolVersion,
    conversationId: params.envelope.conversationId,
    messageId: params.envelope.messageId,
    senderId: params.envelope.senderId,
    recipientId: params.envelope.recipientId,
    senderKeyId: params.envelope.senderKeyId,
    recipientKeyId: params.envelope.recipientKeyId,
    keyEncapsulationCiphertext: params.envelope.keyEncapsulationCiphertext,
    nonce: params.envelope.nonce,
    ciphertext: params.envelope.ciphertext,
    tag: params.envelope.tag,
    timestamp: params.envelope.timestamp,
  });

  const sigBytes = fromBase64(params.envelope.signature);
  const isSignatureValid = verifyCanonical(sigBytes, canonicalData, params.senderDsaPublicKey);

  if (!isSignatureValid) {
    throw new Error('ML-DSA-65 digital signature verification failed. Message rejected.');
  }

  // 3. Post-Quantum Decapsulation via ML-KEM-768
  const kemCiphertextBytes = fromBase64(params.envelope.keyEncapsulationCiphertext);
  const sharedSecret = decapsulateSecret(kemCiphertextBytes, params.recipientKemSecretKey);

  // 4. Derive AES-GCM Key via HKDF-SHA384
  const salt = deriveConversationSalt(params.envelope.conversationId, params.envelope.timestamp);
  const aesKey = deriveMessageKey(sharedSecret, salt);

  // 5. Symmetric Decryption with verified AAD
  const nonceBytes = fromBase64(params.envelope.nonce);
  const ciphertextBytes = fromBase64(params.envelope.ciphertext);
  const tagBytes = fromBase64(params.envelope.tag);
  const aad = new TextEncoder().encode(
    `${params.envelope.protocolVersion}:${params.envelope.conversationId}:${params.envelope.messageId}:${params.envelope.senderId}:${params.envelope.recipientId}`
  );

  const decryptedBytes = decryptAesGcm(aesKey, nonceBytes, ciphertextBytes, tagBytes, aad);

  // 6. Parse JSON Payload
  const jsonString = new TextDecoder().decode(decryptedBytes);
  return JSON.parse(jsonString) as PlaintextMessagePayload;
}
