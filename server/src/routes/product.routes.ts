import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';
import { uploadProductImage } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', ProductController.getProducts);
router.get('/meta', ProductController.getMeta);
router.get('/barcode/:barcode', ProductController.getByBarcode);
router.post('/upload-image', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), uploadProductImage.single('image'), ProductController.uploadImage);
router.post('/bulk-delete', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('BULK_DELETE_PRODUCTS', 'PRODUCTS'), ProductController.deleteBulk);
router.post('/bulk-update', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), auditLog('BULK_UPDATE_PRODUCTS', 'PRODUCTS'), ProductController.bulkUpdate);
router.delete('/delete-all', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('DELETE_ALL_PRODUCTS', 'PRODUCTS'), ProductController.deleteAll);
router.post('/', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('CREATE_PRODUCT', 'PRODUCTS'), ProductController.createProduct);
router.put('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'), auditLog('UPDATE_PRODUCT', 'PRODUCTS'), ProductController.updateProduct);
router.delete('/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('DELETE_PRODUCT', 'PRODUCTS'), ProductController.deleteProduct);

export default router;
