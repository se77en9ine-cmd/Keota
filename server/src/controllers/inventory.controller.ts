import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export class InventoryController {
  public static async getStockSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await InventoryService.getStockSummary();
      res.json({ success: true, inventory: list });
    } catch (err) {
      next(err);
    }
  }

  public static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const threshold = parseInt(req.query.threshold as string, 10) || 10;
      const list = await InventoryService.getLowStock(threshold);
      res.json({ success: true, lowStock: list });
    } catch (err) {
      next(err);
    }
  }

  public static async getExpiring(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string, 10) || 90;
      const list = await InventoryService.getExpiringStock(days);
      res.json({ success: true, expiringStock: list });
    } catch (err) {
      next(err);
    }
  }

  public static async transferStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.transferStock({
        ...req.body,
        userId: req.user?.id,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async recordLoss(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.recordStockLoss({
        ...req.body,
        userId: req.user?.id,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.adjustStock({
        ...req.body,
        userId: req.user?.id,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getLossHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, warehouseId, lossType, search } = req.query as Record<string, string>;
      const result = await InventoryService.getLossHistory({
        startDate,
        endDate,
        warehouseId,
        lossType,
        search,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getLossAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const result = await InventoryService.getLossAnalytics({ startDate, endDate });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

