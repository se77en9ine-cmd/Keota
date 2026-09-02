import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

router.post('/login', auditLog('LOGIN', 'AUTH'), AuthController.login);
router.post('/pin-switch', auditLog('PIN_SWITCH', 'AUTH'), AuthController.pinSwitch);
router.post('/refresh', AuthController.refreshToken);
router.post('/google', auditLog('GOOGLE_LOGIN', 'AUTH'), AuthController.googleAuth);
router.get('/me', authenticateToken, AuthController.getProfile);

export default router;
