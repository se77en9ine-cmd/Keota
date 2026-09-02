import { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/sync.service';

export class SyncController {
  public static async push(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SyncService.pushSync(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async pull(req: Request, res: Response, next: NextFunction) {
    try {
      const lastSyncedAt = req.query.lastSyncedAt as string;
      const result = await SyncService.pullSync(lastSyncedAt);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
