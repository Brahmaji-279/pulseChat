import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Call } from '../../models/Call.js';
import { BlockedUser } from '../../models/BlockedUser.js';
import { AuthenticatedRequest } from '../../middleware/authentication.js';

export const logCallSchema = z.object({
  recipientId: z.string().min(1),
  callType: z.enum(['voice', 'video']),
  status: z.enum(['initiated', 'ringing', 'accepted', 'declined', 'missed', 'ended']).default('initiated'),
  duration: z.number().int().nonnegative().default(0),
});

export async function logCall(req: AuthenticatedRequest, res: Response): Promise<void> {
  const initiatorId = req.user?._id;
  if (!initiatorId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { recipientId, callType, status, duration } = req.body;

  // Block check
  const isBlocked = await BlockedUser.findOne({
    $or: [
      { blockerId: initiatorId, blockedUserId: recipientId },
      { blockerId: recipientId, blockedUserId: initiatorId },
    ],
  });

  if (isBlocked) {
    res.status(403).json({ success: false, error: 'Call prohibited' });
    return;
  }

  const call = await Call.create({
    initiatorId,
    recipientId: new Types.ObjectId(recipientId),
    callType,
    status,
    startedAt: new Date(),
    endedAt: status === 'ended' ? new Date() : undefined,
    duration,
  });

  res.status(201).json({ success: true, call });
}

export async function getCallHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?._id;

  const calls = await Call.find({
    $or: [{ initiatorId: userId }, { recipientId: userId }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('initiatorId recipientId', 'username displayName profilePhoto');

  const formatted = calls.map((c) => {
    const isInitiator = c.initiatorId._id.toString() === userId?.toString();
    const otherParticipant = isInitiator ? c.recipientId : c.initiatorId;

    return {
      id: c._id,
      callType: c.callType,
      status: c.status,
      duration: c.duration,
      isOutgoing: isInitiator,
      participant: otherParticipant,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      createdAt: c.createdAt,
    };
  });

  res.json({ success: true, calls: formatted });
}

export async function updateCallStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?._id;
  const callId = req.params.id;
  const { status, duration } = req.body;

  const call = await Call.findOne({
    _id: callId,
    $or: [{ initiatorId: userId }, { recipientId: userId }],
  });

  if (!call) {
    res.status(404).json({ success: false, error: 'Call record not found' });
    return;
  }

  if (status) call.status = status;
  if (duration !== undefined) call.duration = duration;
  if (status === 'ended' || status === 'declined' || status === 'missed') {
    call.endedAt = new Date();
  }

  await call.save();

  res.json({ success: true, call });
}
