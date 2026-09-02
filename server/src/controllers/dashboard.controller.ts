import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  public static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getAnalytics();
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }
}
