import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/push', authenticateToken, SyncController.push);
router.get('/pull', authenticateToken, SyncController.pull);

export default router;
