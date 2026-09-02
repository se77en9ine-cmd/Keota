import { Router } from 'express';
import { PosController } from '../controllers/pos.controller';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.post('/checkout', authenticateToken, auditLog('POS_CHECKOUT', 'POS'), PosController.checkout);
router.get('/holds', authenticateToken, PosController.getHolds);
router.get('/holds/:id/resume', authenticateToken, PosController.resumeHold);
router.delete('/holds/:id', authenticateToken, PosController.cancelHold);
router.get('/recent', authenticateToken, PosController.getRecentSales);
router.get('/sales/:id', authenticateToken, PosController.getSaleDetails);
router.get('/live-orders', authenticateToken, PosController.getLiveOrders);
router.patch('/orders/:id/pipeline', authenticateToken, PosController.updatePipeline);
router.post('/orders/:id/complete-cod', authenticateToken, auditLog('COMPLETE_COD', 'SALES'), PosController.completeCod);
router.post('/orders/:id/reject-cod', authenticateToken, auditLog('REJECT_COD', 'SALES'), PosController.rejectCod);

router.post('/orders/batch-pipeline', authenticateToken, auditLog('BATCH_PIPELINE', 'SALES'), PosController.batchUpdatePipeline);
router.post('/orders/batch-complete-cod', authenticateToken, auditLog('BATCH_COMPLETE_COD', 'SALES'), PosController.batchCompleteCod);
router.post('/orders/scan-advance', authenticateToken, auditLog('SCAN_ADVANCE_COD', 'SALES'), PosController.scanAdvance);

export default router;
