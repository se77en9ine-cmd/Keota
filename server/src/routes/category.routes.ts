import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.get('/', CategoryController.getCategories);
router.put('/reorder', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), auditLog('REORDER_CATEGORIES', 'CATEGORIES'), CategoryController.reorderCategories);
router.post('/', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), auditLog('CREATE_CATEGORY', 'CATEGORIES'), CategoryController.createCategory);
router.put('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), auditLog('UPDATE_CATEGORY', 'CATEGORIES'), CategoryController.updateCategory);
router.delete('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('DELETE_CATEGORY', 'CATEGORIES'), CategoryController.deleteCategory);

export default router;
