import { Response } from 'express';
import { Types } from 'mongoose';
import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { User } from '../../models/User.js';
import { BlockedUser } from '../../models/BlockedUser.js';
import { PublicKey } from '../../models/PublicKey.js';
import { AuthenticatedRequest } from '../../middleware/authentication.js';

export async function getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?._id;

  const conversations = await Conversation.find({
    participantIds: userId,
  })
    .sort({ lastMessageAt: -1 })
    .populate('participantIds', 'username displayName profilePhoto lastActiveAt');

  // Gather latest message for each conversation
  const convIds = conversations.map((c) => c._id);
  const latestMessages = await Message.aggregate([
    { $match: { conversationId: { $in: convIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessageId: { $first: '$messageId' },
        senderId: { $first: '$senderId' },
        createdAt: { $first: '$createdAt' },
        deliveryStatus: { $first: '$deliveryStatus' },
        protocolVersion: { $first: '$protocolVersion' },
      },
    },
  ]);

  // Count unread messages for current user
  const unreadCounts = await Message.aggregate([
    {
      $match: {
        conversationId: { $in: convIds },
        recipientId: userId,
        deliveryStatus: { $ne: 'read' },
      },
    },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } },
  ]);

  const latestMap = new Map(latestMessages.map((m) => [m._id.toString(), m]));
  const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));

  const result = conversations.map((c) => {
    const otherParticipant = c.participantIds.find(
      (p: any) => p._id.toString() !== userId?.toString()
    ) as any;

    return {
      id: c._id,
      conversationType: c.conversationType,
      participant: otherParticipant
        ? {
            id: otherParticipant._id,
            username: otherParticipant.username,
            displayName: otherParticipant.displayName,
            profilePhoto: otherParticipant.profilePhoto,
            lastActiveAt: otherParticipant.lastActiveAt,
          }
        : null,
      lastMessage: latestMap.get(c._id.toString()) || null,
      unreadCount: unreadMap.get(c._id.toString()) || 0,
      updatedAt: c.updatedAt,
      lastMessageAt: c.lastMessageAt,
    };
  });

  res.json({ success: true, conversations: result });
}

export async function createOrGetDirectConversation(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const currentUserId = req.user?._id;
  const { recipientUsername, recipientId } = req.body;

  let targetUserId = recipientId;
  if (!targetUserId && recipientUsername) {
    const recipient = await User.findOne({
      normalizedUsername: recipientUsername.toLowerCase().trim(),
    });
    if (!recipient) {
      res.status(404).json({ success: false, error: 'Recipient not found' });
      return;
    }
    targetUserId = recipient._id;
  }

  if (!targetUserId) {
    res.status(400).json({ success: false, error: 'Recipient is required' });
    return;
  }

  if (targetUserId.toString() === currentUserId?.toString()) {
    res.status(400).json({ success: false, error: 'Cannot start conversation with yourself' });
    return;
  }

  // Check if either user is blocked
  const isBlocked = await BlockedUser.findOne({
    $or: [
      { blockerId: currentUserId, blockedUserId: targetUserId },
      { blockerId: targetUserId, blockedUserId: currentUserId },
    ],
  });

  if (isBlocked) {
    res.status(403).json({ success: false, error: 'Cannot create conversation with blocked user' });
    return;
  }

  // Check if conversation already exists between these 2 users
  let conversation = await Conversation.findOne({
    conversationType: 'direct',
    participantIds: { $all: [currentUserId, targetUserId], $size: 2 },
  }).populate('participantIds', 'username displayName profilePhoto lastActiveAt');

  if (!conversation) {
    conversation = await Conversation.create({
      participantIds: [currentUserId, new Types.ObjectId(targetUserId)],
      conversationType: 'direct',
      lastMessageAt: new Date(),
    });
    conversation = await conversation.populate(
      'participantIds',
      'username displayName profilePhoto lastActiveAt'
    );
  }

  const otherParticipant = conversation.participantIds.find(
    (p: any) => p._id.toString() !== currentUserId?.toString()
  ) as any;

  res.json({
    success: true,
    conversation: {
      id: conversation._id,
      conversationType: conversation.conversationType,
      participant: otherParticipant
        ? {
            id: otherParticipant._id,
            username: otherParticipant.username,
            displayName: otherParticipant.displayName,
            profilePhoto: otherParticipant.profilePhoto,
            lastActiveAt: otherParticipant.lastActiveAt,
          }
        : null,
      lastMessageAt: conversation.lastMessageAt,
    },
  });
}

export async function getConversationById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?._id;
  const conversationId = req.params.id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participantIds: userId,
  }).populate('participantIds', 'username displayName profilePhoto lastActiveAt');

  if (!conversation) {
    res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
    return;
  }

  const otherParticipant = conversation.participantIds.find(
    (p: any) => p._id.toString() !== userId?.toString()
  ) as any;

  // Fetch cryptographic identity info for recipient
  let recipientKeys: any = null;
  if (otherParticipant) {
    const keys = await PublicKey.find({
      userId: otherParticipant._id,
      isCurrent: true,
    }).select('keyId algorithm fingerprint keyVersion createdAt');
    recipientKeys = keys;
  }

  res.json({
    success: true,
    conversation: {
      id: conversation._id,
      conversationType: conversation.conversationType,
      participant: otherParticipant
        ? {
            id: otherParticipant._id,
            username: otherParticipant.username,
            displayName: otherParticipant.displayName,
            profilePhoto: otherParticipant.profilePhoto,
            lastActiveAt: otherParticipant.lastActiveAt,
            keys: recipientKeys,
          }
        : null,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    },
  });
}
