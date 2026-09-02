import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/', authenticateToken, SettingsController.getAllSettings);
router.get('/printers/system-drivers', authenticateToken, SettingsController.getSystemInstalledPrinters);
router.post('/save', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('UPDATE_SETTING', 'SETTINGS'), SettingsController.updateSetting);
router.put('/store', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('UPDATE_STORE_PROFILE', 'SETTINGS'), SettingsController.updateStoreProfile);
router.put('/storage', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('UPDATE_STORAGE_CONFIG', 'SETTINGS'), SettingsController.updateStorageConfig);
router.post('/storage', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('UPDATE_STORAGE_CONFIG', 'SETTINGS'), SettingsController.updateStorageConfig);

export default router;
