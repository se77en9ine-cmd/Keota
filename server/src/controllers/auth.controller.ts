import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { db } from '../database/connection';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password, pin } = req.body;
      const result = await AuthService.login(identifier, password, pin);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async pinSwitch(req: Request, res: Response, next: NextFunction) {
    try {
      const { pin } = req.body;
      const result = await AuthService.pinSwitch(pin);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const result = await AuthService.googleLogin(token);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const user = (await db.select().from(users).where(eq(users.id, req.user.id)).limit(1))[0];
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: req.user.role,
          storeId: user.storeId,
          language: user.language,
          currency: user.currency,
          theme: user.theme,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
