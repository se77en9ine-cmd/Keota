import { Request, Response, NextFunction } from 'express';
import { CurrencyService } from '../services/currency.service';

export class CurrencyController {
  public static async getCurrencies(req: Request, res: Response, next: NextFunction) {
    try {
      const includeAll = req.query.includeAll === 'true';
      const list = await CurrencyService.getCurrencies(includeAll);
      res.json({ success: true, currencies: list });
    } catch (err) {
      next(err);
    }
  }

  public static async createCurrency(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await CurrencyService.createCurrency(req.body);
      res.status(201).json({ success: true, currency: created });
    } catch (err) {
      next(err);
    }
  }

  public static async updateCurrency(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const updated = await CurrencyService.updateCurrency(code, req.body);
      res.json({ success: true, currency: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async updateRate(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const { rate } = req.body;
      const result = await CurrencyService.updateRate(code, Number(rate));
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCurrency(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const result = await CurrencyService.deleteCurrency(code);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async setBaseCurrency(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const result = await CurrencyService.setBaseCurrency(code);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async convert(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, from, to } = req.body;
      const engine = await CurrencyService.getEngine();
      const converted = engine.convert(Number(amount), from, to);
      const formatted = engine.format(converted, to);
      res.json({ success: true, converted, formatted, currency: to });
    } catch (err) {
      next(err);
    }
  }
}
export default CurrencyController;
