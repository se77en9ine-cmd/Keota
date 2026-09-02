import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';
import { uploadUserAvatar } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), UserController.getUsers);
router.post(
  '/upload-avatar',
  authenticateToken,
  uploadUserAvatar.single('avatar'),
  UserController.uploadAvatar
);
router.post('/', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('CREATE_USER', 'USERS'), UserController.createUser);
router.put('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('UPDATE_USER', 'USERS'), UserController.updateUser);
router.delete('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('DELETE_USER', 'USERS'), UserController.deleteUser);

router.get('/roles', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), UserController.getRoles);
router.post('/roles', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('CREATE_ROLE', 'USERS'), UserController.createRole);
router.put('/roles/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('UPDATE_ROLE', 'USERS'), UserController.updateRole);
router.delete('/roles/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('DELETE_ROLE', 'USERS'), UserController.deleteRole);

router.get('/permissions', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), UserController.getPermissions);
router.get('/audit-logs', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), UserController.getAuditLogs);

export default router;
