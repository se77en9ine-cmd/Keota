import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), BackupController.getBackups);
router.get('/stats', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), BackupController.getDatabaseStats);
router.get('/download', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), BackupController.downloadBackup);
router.post('/create', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('CREATE_BACKUP', 'SETTINGS'), BackupController.createBackup);
router.post('/restore-file', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('RESTORE_FILE_BACKUP', 'SETTINGS'), BackupController.restoreEncryptedPayload);
router.post('/migrate', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('MIGRATE_STORAGE', 'SETTINGS'), BackupController.executeMigration);
router.post('/verify-directory', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), BackupController.verifyDirectory);
router.post('/clear-all-records', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('CLEAR_ALL_RECORDS', 'SETTINGS'), BackupController.clearAllRecords);
router.post('/:id/restore', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('RESTORE_BACKUP', 'SETTINGS'), BackupController.restoreBackup);

export default router;
