import { Request, Response, NextFunction } from 'express';
import { PosService } from '../services/pos.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export class PosController {
  public static async checkout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const cashierId = req.user?.id || req.body.cashierId || 'user-admin';
      const storeId = req.user?.storeId || req.body.storeId || 'store-flagship';
      const result = await PosService.checkout({ ...req.body, cashierId, storeId });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getHolds(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await PosService.getHolds();
      res.json({ success: true, holds: list });
    } catch (err) {
      next(err);
    }
  }

  public static async resumeHold(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PosService.resumeHold(id);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async cancelHold(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PosService.cancelHold(id);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getRecentSales(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const sales = await PosService.getRecentSales(limit);
      res.json({ success: true, sales });
    } catch (err) {
      next(err);
    }
  }

  public static async getSaleDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const details = await PosService.getSaleDetails(id);
      res.json({ success: true, ...details });
    } catch (err) {
      next(err);
    }
  }

  public static async getLiveOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = req.query.channel as string;
      const orders = await PosService.getLiveOrders(channel);
      res.json({ success: true, orders });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PosService.updateOrderPipeline(id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async completeCod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PosService.completeCodOrder(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async rejectCod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await PosService.rejectCodOrder(id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async batchUpdatePipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderIds, stage, extraData } = req.body;
      const result = await PosService.batchUpdatePipeline(orderIds, stage, extraData);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async batchCompleteCod(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderIds } = req.body;
      const result = await PosService.batchCompleteCod(orderIds);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async scanAdvance(req: Request, res: Response, next: NextFunction) {
    try {
      const { barcodeOrInvoice, targetStage } = req.body;
      const result = await PosService.scanAdvanceOrder(barcodeOrInvoice, targetStage);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
