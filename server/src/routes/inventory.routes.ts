import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/', authenticateToken, InventoryController.getStockSummary);
router.get('/warehouses', async (_req, res) => {
  try {
    const { locationService } = await import('../services/location.service');
    const warehouses = await locationService.getWarehouses();
    res.json({ success: true, warehouses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/low-stock', authenticateToken, InventoryController.getLowStock);
router.get('/expiring', authenticateToken, InventoryController.getExpiring);
router.post('/transfer', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('TRANSFER_STOCK', 'INVENTORY'), InventoryController.transferStock);
router.post('/adjust', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('ADJUST_STOCK', 'INVENTORY'), InventoryController.adjustStock);

// Loss, Damage, Expiry & Discrepancy routes
router.post('/loss', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE', 'CASHIER'), auditLog('RECORD_STOCK_LOSS', 'INVENTORY'), InventoryController.recordLoss);
router.get('/loss-history', authenticateToken, InventoryController.getLossHistory);
router.get('/loss-analytics', authenticateToken, InventoryController.getLossAnalytics);

export default router;

