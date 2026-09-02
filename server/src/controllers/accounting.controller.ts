import { Request, Response, NextFunction } from 'express';
import { AccountingService } from '../services/accounting.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export class AccountingController {
  public static async getExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await AccountingService.getExpenses();
      res.json({ success: true, expenses: list });
    } catch (err) {
      next(err);
    }
  }

  public static async addExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AccountingService.addExpense({
        ...req.body,
        userId: req.user?.id,
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await AccountingService.getIncome();
      res.json({ success: true, income: list });
    } catch (err) {
      next(err);
    }
  }

  public static async addIncome(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AccountingService.addIncome({
        ...req.body,
        userId: req.user?.id,
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await AccountingService.deleteExpense(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await AccountingService.deleteIncome(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getDailyClosings(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await AccountingService.getDailyClosings();
      res.json({ success: true, closings: list });
    } catch (err) {
      next(err);
    }
  }

  public static async recordClosing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AccountingService.recordDailyClosing({
        ...req.body,
        userId: req.user?.id || 'user-admin',
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
