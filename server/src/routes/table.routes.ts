import { Router } from 'express';
import { TableController } from '../controllers/table.controller';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLogger';
import { requireRoles } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticateToken, TableController.getTables);
router.post(
  '/zones/rename',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('RENAME_ZONE', 'POS'),
  TableController.renameZone
);
router.post(
  '/zones/delete',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('DELETE_ZONE', 'POS'),
  TableController.deleteZone
);
router.post(
  '/',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('CREATE_TABLE', 'POS'),
  TableController.createTable
);
router.put(
  '/:id',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('UPDATE_TABLE', 'POS'),
  TableController.updateTable
);
router.patch(
  '/:id/status',
  authenticateToken,
  auditLog('UPDATE_TABLE_STATUS', 'POS'),
  TableController.updateStatus
);
router.delete(
  '/:id',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('DELETE_TABLE', 'POS'),
  TableController.deleteTable
);

export default router;
