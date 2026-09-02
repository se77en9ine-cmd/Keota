import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/analytics', authenticateToken, DashboardController.getAnalytics);

export default router;
