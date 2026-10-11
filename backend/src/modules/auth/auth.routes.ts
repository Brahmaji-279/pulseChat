import { Router } from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  registerSchema,
  loginSchema,
} from './auth.controller.js';
import { authenticateToken } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validateBody } from '../../middleware/validation.js';
import { authLimiter } from '../../middleware/rate-limit.js';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(login));
router.post('/logout', authenticateToken, asyncHandler(logout));
router.get('/me', authenticateToken, asyncHandler(getCurrentUser));
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));

export default router;
