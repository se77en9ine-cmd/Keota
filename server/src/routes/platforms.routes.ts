import { Router } from 'express';
import { PlatformsController } from '../controllers/platforms.controller';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLogger';
import { uploadPlatformLogo } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', authenticateToken, PlatformsController.getAllPlatforms);

router.post(
  '/upload-logo',
  authenticateToken,
  uploadPlatformLogo.single('logo'),
  PlatformsController.uploadLogo
);

router.post(
  '/',
  authenticateToken,
  auditLog('CREATE_ONLINE_PLATFORM', 'SETTINGS'),
  PlatformsController.createPlatform
);
router.put(
  '/:id',
  authenticateToken,
  auditLog('UPDATE_ONLINE_PLATFORM', 'SETTINGS'),
  PlatformsController.updatePlatform
);
router.delete(
  '/:id',
  authenticateToken,
  auditLog('DELETE_ONLINE_PLATFORM', 'SETTINGS'),
  PlatformsController.deletePlatform
);

export default router;
