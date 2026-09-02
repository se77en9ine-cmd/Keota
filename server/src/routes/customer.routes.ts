import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLogger';
import { uploadCustomerAvatar } from '../middlewares/upload.middleware';
import { requireRoles } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticateToken, CustomerController.getCustomers);
router.get('/tier-rules', authenticateToken, CustomerController.getTierRules);
router.put(
  '/tier-rules',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('UPDATE_TIER_RULES', 'CRM'),
  CustomerController.saveTierRules
);
router.post(
  '/recalculate-tiers',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('RECALCULATE_TIERS', 'CRM'),
  CustomerController.recalculateTiers
);

router.post(
  '/upload-avatar',
  authenticateToken,
  uploadCustomerAvatar.single('avatar'),
  CustomerController.uploadAvatar
);
router.post('/', authenticateToken, auditLog('CREATE_CUSTOMER', 'CRM'), CustomerController.createCustomer);
router.put('/:id', authenticateToken, auditLog('UPDATE_CUSTOMER', 'CRM'), CustomerController.updateCustomer);
router.post(
  '/:id/toggle-blacklist',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER'),
  auditLog('TOGGLE_CUSTOMER_BLACKLIST', 'CRM'),
  CustomerController.toggleBlacklist
);
router.delete(
  '/:id',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('DELETE_CUSTOMER', 'CRM'),
  CustomerController.deleteCustomer
);

export default router;
