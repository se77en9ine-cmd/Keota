import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../services/backup.service';

export class BackupController {
  public static async createBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await BackupService.createBackup(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getBackups(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await BackupService.getBackups();
      res.json({ success: true, backups: list });
    } catch (err) {
      next(err);
    }
  }

  public static async restoreBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await BackupService.restoreBackup(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: targetPath } = req.body;
      const result = await BackupService.verifyDirectory(targetPath);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getDatabaseStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await BackupService.getDatabaseStats();
      res.json({ success: true, stats, ...stats });
    } catch (err) {
      next(err);
    }
  }

  public static async executeMigration(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await BackupService.executeMigration(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async clearAllRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const { wipeCatalog, createAutoBackup } = req.body;
      const adminUserId = (req as any).user?.id || (req as any).user?.userId;
      const result = await BackupService.clearAllRecords({
        wipeCatalog: !!wipeCatalog,
        createAutoBackup: createAutoBackup !== false,
        adminUserId,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async downloadBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const filePath = await BackupService.getLatestBackupFilePath();
      if (!filePath) {
        return res.status(404).json({ success: false, message: 'Backup file (.json.enc) not found on disk' });
      }
      res.download(filePath, '39pos_enterprise_backup.json.enc');
    } catch (err) {
      next(err);
    }
  }

  public static async restoreEncryptedPayload(req: Request, res: Response, next: NextFunction) {
    try {
      const { payload, filename } = req.body;
      const result = await BackupService.restoreFromEncryptedPayload(payload, filename);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
