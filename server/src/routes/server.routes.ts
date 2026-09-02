import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { getCurrentDbPath } from '../database/dbConfigManager';

const router = Router();

/**
 * GET /api/server/db-path
 * Returns the current active database file path the server is using.
 */
router.get('/db-path', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), (req: Request, res: Response) => {
  try {
    const dbPath = getCurrentDbPath();
    res.json({
      success: true,
      databasePath: dbPath,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/server/restart
 * Gracefully shuts down the server. The process manager (npm dev/pm2/systemd)
 * will automatically restart it, and on next boot the server reads db_config.json
 * to connect to the new database location.
 */
router.post('/restart', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is restarting. Please wait a few seconds...',
  });

  // Give the response time to flush before exiting
  setTimeout(() => {
    console.log('[Server] Restart requested via API. Shutting down for process manager restart...');
    process.exit(0);
  }, 500);
});

export default router;
