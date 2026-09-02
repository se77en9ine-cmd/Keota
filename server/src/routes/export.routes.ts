import { Router } from 'express';
import { ExportController } from '../controllers/export.controller';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/products/excel', authenticateToken, auditLog('EXPORT_PRODUCTS_EXCEL', 'EXPORT'), ExportController.exportProductsExcel);
router.get('/sales/excel', authenticateToken, auditLog('EXPORT_SALES_EXCEL', 'EXPORT'), ExportController.exportSalesExcel);
router.get('/pnl/excel', authenticateToken, auditLog('EXPORT_PNL_EXCEL', 'EXPORT'), ExportController.exportPnlExcel);
router.get('/cod/excel', authenticateToken, auditLog('EXPORT_COD_EXCEL', 'EXPORT'), ExportController.exportCodExcel);
router.get('/inventory/excel', authenticateToken, auditLog('EXPORT_INVENTORY_EXCEL', 'EXPORT'), ExportController.exportInventoryExcel);
router.get('/loss/excel', authenticateToken, auditLog('EXPORT_LOSS_EXCEL', 'EXPORT'), ExportController.exportLossExcel);
router.get('/cash-flow/excel', authenticateToken, auditLog('EXPORT_CASH_FLOW_EXCEL', 'EXPORT'), ExportController.exportCashFlowExcel);

export default router;

