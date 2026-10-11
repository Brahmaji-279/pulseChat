import { Router } from 'express';
import {
  getConversations,
  createOrGetDirectConversation,
  getConversationById,
} from './conversations.controller.js';
import { authenticateToken } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const router = Router();

router.use(authenticateToken);

router.get('/', asyncHandler(getConversations));
router.post('/', asyncHandler(createOrGetDirectConversation));
router.get('/:id', asyncHandler(getConversationById));

export default router;
