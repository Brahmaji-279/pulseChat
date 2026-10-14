import { Router } from 'express';
import {
  getConversationMessages,
  sendEncryptedMessage,
  updateMessageStatus,
  deleteMessage,
  sendEncryptedMessageSchema,
} from './messages.controller.js';
import { authenticateToken } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validateBody } from '../../middleware/validation.js';
import { attachmentUploadMemory, processAttachmentUpload } from '../../middleware/upload.js';
import { uploadAttachment, verifyConversationParticipant } from './attachments.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/conversations/:id/messages', asyncHandler(getConversationMessages));
router.post(
  '/conversations/:id/attachments',
  verifyConversationParticipant,
  attachmentUploadMemory.single('file'),
  processAttachmentUpload,
  asyncHandler(uploadAttachment)
);
router.post(
  '/conversations/:id/messages',
  validateBody(sendEncryptedMessageSchema),
  asyncHandler(sendEncryptedMessage)
);
router.patch('/messages/:id/status', asyncHandler(updateMessageStatus));
router.delete('/messages/:id', asyncHandler(deleteMessage));

export default router;
