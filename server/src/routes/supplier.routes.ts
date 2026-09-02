import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';
import { uploadSupplierLogo } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', authenticateToken, SupplierController.getSuppliers);

router.post(
  '/upload-logo',
  authenticateToken,
  uploadSupplierLogo.single('logo'),
  SupplierController.uploadLogo
);

router.post(
  '/',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'),
  auditLog('CREATE_SUPPLIER', 'SUPPLIERS'),
  SupplierController.createSupplier
);

router.put(
  '/:id',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'),
  auditLog('UPDATE_SUPPLIER', 'SUPPLIERS'),
  SupplierController.updateSupplier
);

router.delete(
  '/:id',
  authenticateToken,
  requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'),
  auditLog('DELETE_SUPPLIER', 'SUPPLIERS'),
  SupplierController.deleteSupplier
);

export default router;
