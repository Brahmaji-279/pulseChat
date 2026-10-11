import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Message } from '../../models/Message.js';
import { Conversation } from '../../models/Conversation.js';
import { BlockedUser } from '../../models/BlockedUser.js';
import { AuthenticatedRequest } from '../../middleware/authentication.js';

export const sendEncryptedMessageSchema = z.object({
  messageId: z.string().min(10).max(100),
  recipientId: z.string().min(1),
  protocolVersion: z.literal('pulse-v1-mlkem768-mldsa65'),
  encryptedEnvelope: z.object({
    protocolVersion: z.literal('pulse-v1-mlkem768-mldsa65'),
    conversationId: z.string().min(1),
    messageId: z.string().min(10).max(100),
    senderId: z.string().min(1),
    recipientId: z.string().min(1),
    senderKeyId: z.string().min(1),
    recipientKeyId: z.string().min(1),
    keyEncapsulationCiphertext: z.string().min(10), // Base64
    nonce: z.string().min(10), // Base64
    ciphertext: z.string().min(1), // Base64
    tag: z.string().min(1), // Base64
    signatureAlgorithm: z.literal('ML-DSA-65'),
    signature: z.string().min(10), // Base64
    timestamp: z.number().int().positive(),
  }),
}).superRefine((body, ctx) => {
  if (body.encryptedEnvelope.messageId !== body.messageId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['encryptedEnvelope', 'messageId'],
      message: 'Envelope message ID does not match message ID',
    });
  }
  if (body.encryptedEnvelope.recipientId !== body.recipientId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['encryptedEnvelope', 'recipientId'],
      message: 'Envelope recipient ID does not match recipient ID',
    });
  }
});

export async function getConversationMessages(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?._id;
  const conversationId = req.params.id;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
  const before = req.query.before as string;

  // Verify user is in conversation
  const conv = await Conversation.findOne({
    _id: conversationId,
    participantIds: userId,
  });

  if (!conv) {
    res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
    return;
  }

  const query: any = { conversationId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('_id messageId conversationId senderId recipientId protocolVersion encryptedEnvelope deliveryStatus deliveredAt readAt createdAt');

  res.json({
    success: true,
    messages: messages.reverse(),
  });
}

export async function sendEncryptedMessage(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const currentUserId = req.user?._id;
  if (!currentUserId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const conversationId = req.params.id;
  const { messageId, recipientId, protocolVersion, encryptedEnvelope } = req.body;

  if (
    encryptedEnvelope.protocolVersion !== protocolVersion ||
    encryptedEnvelope.conversationId !== conversationId ||
    encryptedEnvelope.messageId !== messageId ||
    encryptedEnvelope.senderId !== currentUserId.toString() ||
    encryptedEnvelope.recipientId !== recipientId
  ) {
    res.status(400).json({ success: false, error: 'Message envelope metadata is inconsistent' });
    return;
  }

  // Verify conversation
  const conversation = await Conversation.findById(conversationId);

  if (!conversation || !conversation.participantIds.some((participantId) => participantId.equals(currentUserId))) {
    res.status(404).json({ success: false, error: 'Conversation not found or unauthorized' });
    return;
  }

  const actualRecipientId = conversation.participantIds
    .find((participantId) => !participantId.equals(currentUserId))
    ?.toString();
  if (!actualRecipientId || actualRecipientId !== recipientId) {
    res.status(400).json({ success: false, error: 'Recipient does not belong to this conversation' });
    return;
  }

  // Check blocking
  const isBlocked = await BlockedUser.findOne({
    $or: [
      { blockerId: currentUserId, blockedUserId: actualRecipientId },
      { blockerId: actualRecipientId, blockedUserId: currentUserId },
    ],
  });

  if (isBlocked) {
    res.status(403).json({ success: false, error: 'Cannot send messages to this user' });
    return;
  }

  // Replay check
  const duplicate = await Message.findOne({ messageId });
  if (duplicate) {
    if (
      duplicate.senderId.toString() === currentUserId.toString() &&
      duplicate.recipientId.toString() === actualRecipientId &&
      duplicate.conversationId.toString() === conversationId
    ) {
      res.status(200).json({ success: true, message: duplicate });
      return;
    }
    res.status(409).json({ success: false, error: 'Duplicate message submission rejected' });
    return;
  }

  const createdMessage = await Message.create({
    conversationId: new Types.ObjectId(conversationId),
    senderId: currentUserId,
    recipientId: new Types.ObjectId(actualRecipientId),
    messageId,
    protocolVersion,
    encryptedEnvelope,
    deliveryStatus: 'sent',
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  res.status(201).json({
    success: true,
    message: createdMessage,
  });
}

export async function updateMessageStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?._id;
  const messageId = req.params.id;
  const { status } = req.body; // 'delivered' or 'read'

  if (!['delivered', 'read'].includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid message status' });
    return;
  }

  const updateFields: any = { deliveryStatus: status };
  if (status === 'delivered') updateFields.deliveredAt = new Date();
  if (status === 'read') updateFields.readAt = new Date();

  const updated = await Message.findOneAndUpdate(
    {
      _id: messageId,
      recipientId: userId, // Only the intended recipient can report delivery or read status
    },
    updateFields,
    { new: true }
  );

  if (!updated) {
    res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
    return;
  }

  res.json({ success: true, message: updated });
}

export async function deleteMessage(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?._id;
  const messageId = req.params.id;

  const deleted = await Message.findOneAndDelete({
    _id: messageId,
    senderId: userId, // Only sender can delete for everyone
  });

  if (!deleted) {
    res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
    return;
  }

  res.json({ success: true, message: 'Message deleted' });
}
