import { Router } from 'express';
import { CurrencyController } from '../controllers/currency.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

// Public & Cashier read
router.get('/', CurrencyController.getCurrencies);
router.post('/convert', CurrencyController.convert);

// Admin / Manager CRUD & Rate update
router.post(
  '/set-base',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('SET_BASE_CURRENCY', 'CURRENCY'),
  CurrencyController.setBaseCurrency
);

router.post(
  '/',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'),
  auditLog('CREATE_CURRENCY', 'CURRENCY'),
  CurrencyController.createCurrency
);

router.put(
  '/:code',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'),
  auditLog('UPDATE_CURRENCY', 'CURRENCY'),
  CurrencyController.updateCurrency
);

router.put(
  '/:code/rate',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'),
  auditLog('UPDATE_RATE', 'CURRENCY'),
  CurrencyController.updateRate
);

router.delete(
  '/:code',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER'),
  auditLog('DELETE_CURRENCY', 'CURRENCY'),
  CurrencyController.deleteCurrency
);

export default router;
