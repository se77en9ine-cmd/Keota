import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { AppError } from './errorHandler';
import { db } from '../database/connection';
import { users, roles } from '../database/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    storeId?: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
    if (err) {
      return next(new AppError('Invalid or expired token', 403));
    }
    req.user = user;
    next();
  });
}
