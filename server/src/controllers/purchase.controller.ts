import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from '../services/purchase.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export class PurchaseController {
  public static async getPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await PurchaseService.getPurchases();
      res.json({ success: true, purchases: list });
    } catch (err) {
      next(err);
    }
  }

  public static async getPurchaseDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const details = await PurchaseService.getPurchaseDetails(id);
      res.json({ success: true, ...details });
    } catch (err) {
      next(err);
    }
  }

  public static async createPurchaseOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseService.createPurchaseOrder({
        ...req.body,
        userId: req.user?.id,
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PurchaseService.updatePurchaseOrder(id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async receivePurchaseOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PurchaseService.receivePurchaseOrder(id, req.user?.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PurchaseService.cancelPurchaseOrder(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async deletePurchaseOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PurchaseService.deletePurchaseOrder(id, req.user?.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
