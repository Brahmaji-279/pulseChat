import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { Session } from '../models/Session.js';
import { User, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  sessionId?: string;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.pulse_session;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
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
      res.status(401).json({ success: false, error: 'Session expired or revoked' });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.accountStatus !== 'active') {
      res.status(401).json({ success: false, error: 'User account unavailable' });
      return;
    }

    req.user = user;
    req.sessionId = session._id.toString();
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
}
