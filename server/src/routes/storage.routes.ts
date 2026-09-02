import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/config', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), StorageController.getConfig);
router.put('/config', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('UPDATE_STORAGE_CONFIG', 'SETTINGS'), StorageController.updateConfig);
router.post('/validate-path', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), StorageController.validatePath);
router.get('/network-info', authenticateToken, StorageController.getNetworkInfo);

export default router;
