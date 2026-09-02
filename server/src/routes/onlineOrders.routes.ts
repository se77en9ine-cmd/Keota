import { Router } from 'express';
import { OnlineOrdersController } from '../controllers/onlineOrders.controller';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/', authenticateToken, OnlineOrdersController.getOnlineOrders);
router.post(
  '/',
  authenticateToken,
  auditLog('CREATE_ONLINE_ORDER', 'ORDERS'),
  OnlineOrdersController.createOnlineOrder
);
router.put(
  '/:id',
  authenticateToken,
  auditLog('UPDATE_ONLINE_ORDER', 'ORDERS'),
  OnlineOrdersController.updateOnlineOrder
);
router.delete(
  '/:id',
  authenticateToken,
  auditLog('DELETE_ONLINE_ORDER', 'ORDERS'),
  OnlineOrdersController.deleteOnlineOrder
);
router.patch(
  '/:id/status',
  authenticateToken,
  auditLog('UPDATE_ONLINE_ORDER_STATUS', 'ORDERS'),
  OnlineOrdersController.updateFulfillmentStatus
);
router.post(
  '/simulate',
  authenticateToken,
  auditLog('SIMULATE_ONLINE_ORDER', 'ORDERS'),
  OnlineOrdersController.simulateIncomingOrder
);

export default router;
