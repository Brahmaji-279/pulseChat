import { describe, expect, it } from 'vitest';
import { normalizeEncryptedEnvelope } from '../store/chatStore.js';

describe('normalizeEncryptedEnvelope', () => {
  it('restores metadata omitted from previously stored message envelopes', () => {
    const envelope = normalizeEncryptedEnvelope({
      conversationId: 'conversation-1',
      messageId: 'message-123456',
      senderId: 'sender-1',
      recipientId: 'recipient-1',
      protocolVersion: 'pulse-v1-mlkem768-mldsa65',
      encryptedEnvelope: {
        protocolVersion: 'pulse-v1-mlkem768-mldsa65',
        senderKeyId: 'sender-key',
        recipientKeyId: 'recipient-key',
        keyEncapsulationCiphertext: 'kem-ciphertext',
        nonce: 'nonce',
        ciphertext: 'ciphertext',
        tag: 'tag',
        signatureAlgorithm: 'ML-DSA-65',
        signature: 'signature',
        timestamp: 1,
      },
    });

    expect(envelope).toMatchObject({
      conversationId: 'conversation-1',
      messageId: 'message-123456',
      senderId: 'sender-1',
      recipientId: 'recipient-1',
    });
  });
});
