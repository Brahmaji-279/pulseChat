import { Router } from 'express';
import {
  registerPublicKey,
  getPublicKeysForUser,
  getSpecificKey,
  revokeKey,
  getUserFingerprint,
  registerKeySchema,
} from './crypto.controller.js';
import { authenticateToken } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validateBody } from '../../middleware/validation.js';
import { apiLimiter } from '../../middleware/rate-limit.js';

const router = Router();

router.post(
  '/keys',
  authenticateToken,
  apiLimiter,
  validateBody(registerKeySchema),
  asyncHandler(registerPublicKey)
);
router.get('/keys/:username', apiLimiter, asyncHandler(getPublicKeysForUser));
router.get('/keys/:username/:keyId', apiLimiter, asyncHandler(getSpecificKey));
router.post('/keys/:keyId/revoke', authenticateToken, asyncHandler(revokeKey));
router.get('/fingerprint/:username', apiLimiter, asyncHandler(getUserFingerprint));

export default router;
