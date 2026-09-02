import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { db } from '../database/connection';
import { auditLogs } from '../database/schema';

export function auditLog(action: string, module: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Capture user IP & route
    const originalSend = res.json;

    res.json = function (body: any) {
      const userId = req.user?.id || null;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      if (res.statusCode >= 200 && res.statusCode < 300) {
        db.insert(auditLogs)
          .values({
            id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            userId,
            action,
            module,
            entityId: req.params?.id || req.body?.id || null,
            oldValuesJson: null,
            newValuesJson: req.method !== 'GET' ? JSON.stringify(req.body).substring(0, 1000) : null,
            ipAddress: typeof ipAddress === 'string' ? ipAddress : JSON.stringify(ipAddress),
          })
          .catch((err) => console.error('Error recording audit log:', err));
      }

      return originalSend.call(this, body);
    };

    next();
  };
}
