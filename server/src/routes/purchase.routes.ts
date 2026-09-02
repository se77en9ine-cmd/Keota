import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/', authenticateToken, PurchaseController.getPurchases);
router.get('/:id', authenticateToken, PurchaseController.getPurchaseDetails);
router.post('/', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('CREATE_PURCHASE_ORDER', 'PURCHASE'), PurchaseController.createPurchaseOrder);
router.put('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('UPDATE_PURCHASE_ORDER', 'PURCHASE'), PurchaseController.updatePurchaseOrder);
router.post('/:id/receive', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('RECEIVE_PURCHASE_ORDER', 'PURCHASE'), PurchaseController.receivePurchaseOrder);
router.post('/:id/cancel', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('CANCEL_PURCHASE_ORDER', 'PURCHASE'), PurchaseController.cancelPurchaseOrder);
router.delete('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), auditLog('DELETE_PURCHASE_ORDER', 'PURCHASE'), PurchaseController.deletePurchaseOrder);

export default router;
