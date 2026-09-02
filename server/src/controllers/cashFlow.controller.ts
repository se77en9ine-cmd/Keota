import { Request, Response, NextFunction } from 'express';
import { CashFlowService } from '../services/cashFlow.service';

export class CashFlowController {
  public static async getCashFlowSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        granularity: (req.query.granularity as 'day' | 'month' | 'year' | 'all') || 'day',
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        currency: (req.query.currency as string) || 'USD',
        poOutflowMode: (req.query.poOutflowMode as 'ACTUAL_PAID' | 'TOTAL_COMMITTED') || 'ACTUAL_PAID',
      };

      const data = await CashFlowService.getCashFlowSummary(filters);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }
}
