import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { Message } from '../models/Message.js';
import { sendEncryptedMessageSchema } from '../modules/messages/messages.controller.js';

const message = {
  messageId: 'message-123456',
  recipientId: 'recipient-1',
  protocolVersion: 'pulse-v1-mlkem768-mldsa65',
  encryptedEnvelope: {
    protocolVersion: 'pulse-v1-mlkem768-mldsa65',
    conversationId: 'conversation-1',
    messageId: 'message-123456',
    senderId: 'sender-1',
    recipientId: 'recipient-1',
    senderKeyId: 'sender-key',
    recipientKeyId: 'recipient-key',
    keyEncapsulationCiphertext: 'kem-ciphertext',
    nonce: 'nonce-data',
    ciphertext: 'ciphertext-data',
    tag: 'tag-data',
    signatureAlgorithm: 'ML-DSA-65',
    signature: 'signature-data',
    timestamp: 1,
  },
};

describe('sendEncryptedMessageSchema', () => {
  it('preserves all envelope metadata required for message verification', () => {
    const parsed = sendEncryptedMessageSchema.parse(message);
    expect(parsed.encryptedEnvelope).toMatchObject({
      conversationId: message.encryptedEnvelope.conversationId,
      messageId: message.encryptedEnvelope.messageId,
      senderId: message.encryptedEnvelope.senderId,
      recipientId: message.encryptedEnvelope.recipientId,
    });
  });

  it('rejects envelope metadata that does not match the request', () => {
    const parsed = sendEncryptedMessageSchema.safeParse({
      ...message,
      encryptedEnvelope: { ...message.encryptedEnvelope, messageId: 'different-message-id' },
    });
    expect(parsed.success).toBe(false);
  });

  it('keeps envelope metadata in the message model', () => {
    const document = new Message({
      conversationId: new Types.ObjectId(),
      senderId: new Types.ObjectId(),
      recipientId: new Types.ObjectId(),
      messageId: message.messageId,
      protocolVersion: message.protocolVersion,
      encryptedEnvelope: message.encryptedEnvelope,
    });

    expect(document.validateSync()).toBeUndefined();
    expect(document.toObject().encryptedEnvelope).toMatchObject({
      conversationId: message.encryptedEnvelope.conversationId,
      messageId: message.encryptedEnvelope.messageId,
      senderId: message.encryptedEnvelope.senderId,
      recipientId: message.encryptedEnvelope.recipientId,
    });
  });
});
