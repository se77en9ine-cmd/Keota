import { Request, Response, NextFunction } from 'express';
import { ExportService } from '../services/export.service';

export class ExportController {
  public static async exportProductsExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = (req.query.currency as string) || 'USD';
      const lang = (req.query.lang as string) || (req.headers['accept-language']?.slice(0, 2)) || 'en';
      const rawIds = req.query.ids;
      const ids = rawIds ? (typeof rawIds === 'string' ? rawIds.split(',') : (rawIds as string[])) : undefined;
      const buffer = await ExportService.generateProductsExcel({ currency, lang, ids });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="39pos_products_catalog_${currency}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  public static async exportSalesExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = (req.query.currency as string) || 'USD';
      const lang = (req.query.lang as string) || (req.headers['accept-language']?.slice(0, 2)) || 'en';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const channel = req.query.channel as string;
      const codFilter = req.query.codFilter as string;
      const buffer = await ExportService.generateSalesReportExcel({ currency, lang, startDate, endDate, channel, codFilter });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="39pos_sales_report_${currency}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  public static async exportInventoryExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = (req.query.currency as string) || 'USD';
      const lang = (req.query.lang as string) || (req.headers['accept-language']?.slice(0, 2)) || 'en';
      const buffer = await ExportService.generateInventoryExcel({ currency, lang });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="39pos_inventory_valuation_${currency}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  public static async exportPnlExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = (req.query.currency as string) || 'USD';
      const lang = (req.query.lang as string) || (req.headers['accept-language']?.slice(0, 2)) || 'en';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const buffer = await ExportService.generatePnlExcel({ currency, lang, startDate, endDate });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="39pos_financial_pnl_${currency}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  public static async exportCodExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = (req.query.currency as string) || 'USD';
      const lang = (req.query.lang as string) || (req.headers['accept-language']?.slice(0, 2)) || 'en';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const buffer = await ExportService.generateCodReportExcel({ currency, lang, startDate, endDate });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="39pos_cod_deliveries_${currency}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  public static async exportLossExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = (req.query.currency as string) || 'USD';
      const lang = (req.query.lang as string) || (req.headers['accept-language']?.slice(0, 2)) || 'en';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const warehouseId = req.query.warehouseId as string;
      const lossType = req.query.lossType as string;
      const buffer = await ExportService.generateLossReportExcel({ currency, lang, startDate, endDate, warehouseId, lossType });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="39pos_loss_and_shrinkage_report_${currency}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  public static async exportCashFlowExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = (req.query.currency as string) || 'USD';
      const lang = (req.query.lang as string) || (req.headers['accept-language']?.slice(0, 2)) || 'en';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const granularity = (req.query.granularity as 'day' | 'month' | 'year' | 'all') || 'day';
      const poOutflowMode = (req.query.poOutflowMode as 'ACTUAL_PAID' | 'TOTAL_COMMITTED') || 'ACTUAL_PAID';
      const buffer = await ExportService.generateCashFlowExcel({ currency, lang, startDate, endDate, granularity, poOutflowMode });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="39pos_cash_flow_${granularity}_${currency}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}
export default ExportController;
