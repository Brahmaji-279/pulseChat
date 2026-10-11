import { Router } from 'express';
import {
  searchUsers,
  getUserByUsername,
  updateProfile,
  uploadProfilePhoto,
  updateProfileSchema,
} from './users.controller.js';
import { authenticateToken } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validateBody } from '../../middleware/validation.js';
import { uploadMemory, processSecureUpload } from '../../middleware/upload.js';
import { apiLimiter } from '../../middleware/rate-limit.js';

const router = Router();

router.get('/search', authenticateToken, apiLimiter, asyncHandler(searchUsers));
router.get('/:username', apiLimiter, asyncHandler(getUserByUsername));
router.patch('/me', authenticateToken, validateBody(updateProfileSchema), asyncHandler(updateProfile));
router.post(
  '/me/photo',
  authenticateToken,
  uploadMemory.single('photo'),
  processSecureUpload,
  asyncHandler(uploadProfilePhoto)
);

export default router;
