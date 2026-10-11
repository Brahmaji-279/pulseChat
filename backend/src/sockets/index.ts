import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { Types } from 'mongoose';
import { ENV } from '../config/env.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { BlockedUser } from '../models/BlockedUser.js';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
  };
}

// Global presence tracker: userId -> Set of socketIds
export const onlineUsers = new Map<string, Set<string>>();

export function setupSocketIO(io: Server): void {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        token = cookies.pulse_session;
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
        userId: string;
        sessionToken: string;
      };

      const session = await Session.findOne({
        sessionToken: decoded.sessionToken,
        userId: decoded.userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        return next(new Error('Session expired or revoked'));
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.accountStatus !== 'active') {
        return next(new Error('User account inactive'));
      }

      socket.data = {
        userId: user._id.toString(),
        username: user.username,
      };

      next();
    } catch (err) {
      next(new Error('Invalid socket credentials'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, username } = authSocket.data;

    // Join personal room for targeted events
    authSocket.join(`user:${userId}`);

    // Update presence tracking
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(authSocket.id);

    // Broadcast online status
    io.emit('presence:update', { userId, username, status: 'online' });

    // Send currently online user list to this socket
    const activeUserIds = Array.from(onlineUsers.keys());
    authSocket.emit('presence:sync', { activeUserIds });

    // Join conversation room handler
    authSocket.on('conversation:join', async ({ conversationId }: { conversationId: string }) => {
      try {
        const conv = await Conversation.findOne({
          _id: conversationId,
          participantIds: userId,
        });
        if (conv) {
          authSocket.join(`conv:${conversationId}`);
        }
      } catch (err) {
        // Ignored safely
      }
    });

    // Real-Time Encrypted Message Sending
    authSocket.on('message:send', async (payload, callback) => {
      try {
        const { conversationId, recipientId, messageId, protocolVersion, encryptedEnvelope } = payload;

        if (!conversationId || !recipientId || !messageId || !encryptedEnvelope) {
          if (callback) callback({ success: false, error: 'Malformed message payload' });
          return;
        }

        if (
          encryptedEnvelope.protocolVersion !== protocolVersion ||
          encryptedEnvelope.conversationId !== conversationId ||
          encryptedEnvelope.messageId !== messageId ||
          encryptedEnvelope.senderId !== userId ||
          encryptedEnvelope.recipientId !== recipientId
        ) {
          if (callback) callback({ success: false, error: 'Message envelope metadata is inconsistent' });
          return;
        }

        // Verify conversation membership
        const conv = await Conversation.findById(conversationId);

        if (!conv || !conv.participantIds.some((participantId) => participantId.toString() === userId)) {
          if (callback) callback({ success: false, error: 'Unauthorized conversation' });
          return;
        }

        const actualRecipientId = conv.participantIds
          .find((participantId) => participantId.toString() !== userId)
          ?.toString();
        if (!actualRecipientId || actualRecipientId !== recipientId) {
          if (callback) callback({ success: false, error: 'Recipient does not belong to this conversation' });
          return;
        }

        // Verify blocking
        const isBlocked = await BlockedUser.findOne({
          $or: [
            { blockerId: userId, blockedUserId: actualRecipientId },
            { blockerId: actualRecipientId, blockedUserId: userId },
          ],
        });

        if (isBlocked) {
          if (callback) callback({ success: false, error: 'Message rejected by policy' });
          return;
        }

        // Idempotency / replay check
        const existing = await Message.findOne({ messageId });
        if (existing) {
          if (
            existing.senderId.toString() === userId &&
            existing.recipientId.toString() === recipientId &&
            existing.conversationId.toString() === conversationId
          ) {
            const formattedExisting = {
              _id: existing._id,
              messageId: existing.messageId,
              conversationId: existing.conversationId,
              senderId: existing.senderId,
              recipientId: existing.recipientId,
              protocolVersion: existing.protocolVersion,
              encryptedEnvelope: existing.encryptedEnvelope,
              deliveryStatus: existing.deliveryStatus,
              createdAt: existing.createdAt,
            };
            io.to(`user:${recipientId}`).emit('message:received', formattedExisting);
            if (callback) callback({ success: true, message: formattedExisting });
            return;
          }
          if (callback) callback({ success: false, error: 'Duplicate message submission rejected' });
          return;
        }

        // Check if recipient is online to determine initial delivery status
        const isRecipientOnline = onlineUsers.has(actualRecipientId) && onlineUsers.get(actualRecipientId)!.size > 0;
        const initialStatus = isRecipientOnline ? 'delivered' : 'sent';

        // Persist encrypted envelope in MongoDB
        const savedMessage = await Message.create({
          conversationId: conv._id,
          senderId: new Types.ObjectId(userId),
          recipientId: new Types.ObjectId(actualRecipientId),
          messageId,
          protocolVersion,
          encryptedEnvelope,
          deliveryStatus: initialStatus,
          deliveredAt: isRecipientOnline ? new Date() : undefined,
        });

        conv.lastMessageAt = new Date();
        await conv.save();

        const formatted = {
          _id: savedMessage._id,
          messageId: savedMessage.messageId,
          conversationId: savedMessage.conversationId,
          senderId: savedMessage.senderId,
          recipientId: savedMessage.recipientId,
          protocolVersion: savedMessage.protocolVersion,
          encryptedEnvelope: savedMessage.encryptedEnvelope,
          deliveryStatus: savedMessage.deliveryStatus,
          createdAt: savedMessage.createdAt,
        };

        // Notify recipient in their personal room
        io.to(`user:${actualRecipientId}`).emit('message:received', formatted);

        // Acknowledge to sender
        if (callback) {
          callback({ success: true, message: formatted });
        }
      } catch (err: any) {
        console.error('[Socket Message Error]', err);
        if (callback) callback({ success: false, error: err.message || 'Error processing message' });
      }
    });

    // Message Delivered Receipt
    authSocket.on('message:delivered', async ({ messageId }: { messageId: string }) => {
      try {
        const msg = await Message.findOneAndUpdate(
          { messageId, recipientId: userId, deliveryStatus: 'sent' },
          { deliveryStatus: 'delivered', deliveredAt: new Date() },
          { new: true }
        );
        if (msg) {
          io.to(`user:${msg.senderId}`).emit('message:delivered', {
            messageId,
            conversationId: msg.conversationId,
            deliveredAt: msg.deliveredAt,
          });
        }
      } catch (err) {
        // Ignored safely
      }
    });

    // Message Read Receipt
    authSocket.on('message:read', async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      try {
        const msg = await Message.findOneAndUpdate(
          { messageId, recipientId: userId },
          { deliveryStatus: 'read', readAt: new Date() },
          { new: true }
        );
        if (msg) {
          io.to(`user:${msg.senderId}`).emit('message:read', {
            messageId,
            conversationId,
            readAt: msg.readAt,
          });
        }
      } catch (err) {
        // Ignored safely
      }
    });

    // Typing Indicators
    authSocket.on('typing:start', ({ conversationId, recipientId }: { conversationId: string; recipientId: string }) => {
      io.to(`user:${recipientId}`).emit('typing:start', { conversationId, userId, username });
    });

    authSocket.on('typing:stop', ({ conversationId, recipientId }: { conversationId: string; recipientId: string }) => {
      io.to(`user:${recipientId}`).emit('typing:stop', { conversationId, userId });
    });

    // WebRTC Calling Events (PulseCall & VisualPulse)
    authSocket.on('call:initiate', async (payload: { recipientId: string; callType: 'voice' | 'video'; callId?: string }) => {
      try {
        const { recipientId, callType } = payload;
        // Verify blocking
        const isBlocked = await BlockedUser.findOne({
          $or: [
            { blockerId: userId, blockedUserId: recipientId },
            { blockerId: recipientId, blockedUserId: userId },
          ],
        });

        if (isBlocked) {
          authSocket.emit('call:error', { error: 'Call cannot be connected to this user' });
          return;
        }

        const callerInfo = await User.findById(userId).select('username displayName profilePhoto');

        io.to(`user:${recipientId}`).emit('call:incoming', {
          callId: payload.callId || `call_${Date.now()}`,
          initiator: {
            id: userId,
            username: callerInfo?.username || username,
            displayName: callerInfo?.displayName || username,
            profilePhoto: callerInfo?.profilePhoto,
          },
          callType,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[Call Initiate Error]', err);
      }
    });

    authSocket.on('call:accept', (payload: { callId: string; initiatorId: string }) => {
      io.to(`user:${payload.initiatorId}`).emit('call:accepted', {
        callId: payload.callId,
        recipientId: userId,
      });
    });

    authSocket.on('call:reject', (payload: { callId: string; initiatorId: string; reason?: string }) => {
      io.to(`user:${payload.initiatorId}`).emit('call:rejected', {
        callId: payload.callId,
        recipientId: userId,
        reason: payload.reason || 'declined',
      });
    });

    authSocket.on('call:end', (payload: { callId: string; otherUserId: string; duration?: number }) => {
      io.to(`user:${payload.otherUserId}`).emit('call:ended', {
        callId: payload.callId,
        endedBy: userId,
        duration: payload.duration || 0,
      });
    });

    // WebRTC Signaling: Offer, Answer, ICE Candidates
    authSocket.on('call:signal', (payload: { recipientId: string; callId: string; signal: any }) => {
      io.to(`user:${payload.recipientId}`).emit('call:signal', {
        callId: payload.callId,
        senderId: userId,
        signal: payload.signal,
      });
    });

    // Disconnect handling
    authSocket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(authSocket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline event
          io.emit('presence:update', { userId, username, status: 'offline' });
          await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
        }
      }
    });
  });
}
