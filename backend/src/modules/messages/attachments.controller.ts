import { NextFunction, Response } from 'express';
import { Conversation } from '../../models/Conversation.js';
import { AuthenticatedRequest } from '../../middleware/authentication.js';

export async function verifyConversationParticipant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participantIds: req.user?._id,
    }).select('_id');

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function uploadAttachment(req: AuthenticatedRequest, res: Response): void {
  const savedUrl = (req as AuthenticatedRequest & { savedFileUrl?: string }).savedFileUrl;
  if (!savedUrl || !req.file) {
    res.status(400).json({ success: false, error: 'File upload processing failed' });
    return;
  }

  res.status(201).json({
    success: true,
    url: savedUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
  });
}
