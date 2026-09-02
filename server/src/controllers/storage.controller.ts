import { Request, Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';

export class StorageController {
  public static async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await StorageService.getStorageConfig();
      res.json({ success: true, config });
    } catch (err) {
      next(err);
    }
  }

  public static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await StorageService.updateStorageConfig(req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async validatePath(req: Request, res: Response, next: NextFunction) {
    try {
      const { path } = req.body;
      const result = StorageService.validatePath(path);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getNetworkInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const info = await StorageService.getNetworkInfo();
      res.json({ success: true, ...info });
    } catch (err) {
      next(err);
    }
  }
}
