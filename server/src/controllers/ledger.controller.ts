import { Request, Response, NextFunction } from 'express';
import { LedgerService } from '../services/ledger.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export class LedgerController {
  public static async getChartOfAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const accounts = await LedgerService.getChartOfAccounts();
      res.json({ success: true, accounts });
    } catch (err) {
      next(err);
    }
  }

  public static async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await LedgerService.createAccount(req.body);
      res.status(201).json({ success: true, account });
    } catch (err) {
      next(err);
    }
  }

  public static async getJournalEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        referenceType: req.query.referenceType as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
      };
      const entries = await LedgerService.getJournalEntries(filters);
      res.json({ success: true, entries });
    } catch (err) {
      next(err);
    }
  }

  public static async postManualJournal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || 'user-admin';
      const result = await LedgerService.postJournalEntry({
        ...req.body,
        referenceType: 'MANUAL',
        createdBy: userId,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await LedgerService.deleteJournalEntry(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async purgeOrphanedJournals(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LedgerService.purgeOrphanedJournals();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getGeneralLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        accountId: req.query.accountId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
      };
      const ledger = await LedgerService.getGeneralLedger(filters);
      res.json({ success: true, ledger });
    } catch (err) {
      next(err);
    }
  }

  public static async getTrialBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const trialBalance = await LedgerService.getTrialBalance();
      res.json({ success: true, trialBalance });
    } catch (err) {
      next(err);
    }
  }

  public static async getBalanceSheet(req: Request, res: Response, next: NextFunction) {
    try {
      const balanceSheet = await LedgerService.getBalanceSheet();
      res.json({ success: true, balanceSheet });
    } catch (err) {
      next(err);
    }
  }

  public static async getExtendedTrialBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const extendedTrialBalance = await LedgerService.getExtendedTrialBalance({ startDate, endDate });
      res.json({ success: true, extendedTrialBalance });
    } catch (err) {
      next(err);
    }
  }

  public static async getAccountingPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const periods = await LedgerService.getAccountingPeriods();
      res.json({ success: true, periods });
    } catch (err) {
      next(err);
    }
  }

  public static async closePeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodType, periodName, startDate, endDate, notes } = req.body;
      const userId = (req as any).user?.id;
      const result = await LedgerService.closePeriod({
        periodType,
        periodName,
        startDate,
        endDate,
        notes,
        userId,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async reopenPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await LedgerService.reopenPeriod(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getPeriodSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      const { granularity = 'MONTH', year } = req.query as {
        granularity?: 'MONTH' | 'QUARTER' | 'YEAR';
        year?: string;
      };
      const summaries = await LedgerService.getPeriodSummaries({
        granularity,
        year: year ? parseInt(year, 10) : undefined,
      });
      res.json({ success: true, summaries });
    } catch (err) {
      next(err);
    }
  }
}

