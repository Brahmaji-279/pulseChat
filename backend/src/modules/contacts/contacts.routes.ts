import { Router } from 'express';
import {
  getContacts,
  sendContactRequest,
  getContactRequests,
  respondContactRequest,
  deleteContact,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from './contacts.controller.js';
import { authenticateToken } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/async-handler.js';

const router = Router();

router.use(authenticateToken);

router.get('/', asyncHandler(getContacts));
router.post('/requests', asyncHandler(sendContactRequest));
router.get('/requests', asyncHandler(getContactRequests));
router.patch('/requests/:id', asyncHandler(respondContactRequest));
router.delete('/:id', asyncHandler(deleteContact));

router.post('/block/:id', asyncHandler(blockUser));
router.delete('/block/:id', asyncHandler(unblockUser));
router.get('/blocked/list', asyncHandler(getBlockedUsers));

export default router;
