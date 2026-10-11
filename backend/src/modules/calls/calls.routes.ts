import { Router } from 'express';
import {
  logCall,
  getCallHistory,
  updateCallStatus,
  logCallSchema,
} from './calls.controller.js';
import { authenticateToken } from '../../middleware/authentication.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validateBody } from '../../middleware/validation.js';

const router = Router();

router.use(authenticateToken);

router.post('/', validateBody(logCallSchema), asyncHandler(logCall));
router.get('/history', asyncHandler(getCallHistory));
router.patch('/:id', asyncHandler(updateCallStatus));

export default router;
