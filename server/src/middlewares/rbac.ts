import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppError } from './errorHandler';

export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next(); // Super admin has universal bypass
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Forbidden: Requires one of [${allowedRoles.join(', ')}] role`, 403));
    }

    next();
  };
}
