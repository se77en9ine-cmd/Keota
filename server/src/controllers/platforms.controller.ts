import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { onlinePlatforms } from '../database/schema';
import { eq, asc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export class PlatformsController {
  /**
   * GET /api/online-platforms — List all configured online platforms
   */
  public static async getAllPlatforms(req: Request, res: Response, next: NextFunction) {
    try {
      const platforms = await db
        .select()
        .from(onlinePlatforms)
        .orderBy(asc(onlinePlatforms.sortOrder), asc(onlinePlatforms.name));

      res.json({ success: true, platforms });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/online-platforms/upload-logo — Upload a platform logo image
   */
  public static async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
      }

      // Return public URL relative to static uploads directory
      const fileUrl = `/uploads/platforms/${req.file.filename}`;
      res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/online-platforms — Create a new online platform
   */
  public static async createPlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, code, icon = '📦', color = 'emerald', commissionRate = 0, isActive = true } = req.body;

      if (!name || !code) {
        return res.status(400).json({ success: false, message: 'Platform name and code are required' });
      }

      const id = `plt-${code.toLowerCase().trim()}-${Date.now()}`;
      const now = new Date().toISOString();

      await db.insert(onlinePlatforms).values({
        id,
        name: name.trim(),
        code: code.toUpperCase().trim(),
        icon: icon || '📦',
        color,
        commissionRate: Number(commissionRate) || 0,
        isActive: Boolean(isActive),
        sortOrder: 99,
        createdAt: now,
        updatedAt: now,
      });

      res.status(201).json({ success: true, message: `Platform ${name} created successfully`, id });
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE')) {
        return res.status(400).json({ success: false, message: 'Platform code must be unique' });
      }
      next(err);
    }
  }

  /**
   * PUT /api/online-platforms/:id — Update an online platform
   */
  public static async updatePlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, code, icon, color, commissionRate, isActive, sortOrder } = req.body;

      // Check existing platform to cleanup old local logo if changed
      const [existing] = await db.select().from(onlinePlatforms).where(eq(onlinePlatforms.id, id)).limit(1);

      if (existing && icon && existing.icon !== icon && existing.icon.startsWith('/uploads/platforms/')) {
        try {
          const oldPath = path.resolve(__dirname, '../../../uploads/platforms', path.basename(existing.icon));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch {}
      }

      await db
        .update(onlinePlatforms)
        .set({
          ...(name ? { name: name.trim() } : {}),
          ...(code ? { code: code.toUpperCase().trim() } : {}),
          ...(icon ? { icon } : {}),
          ...(color ? { color } : {}),
          ...(commissionRate !== undefined ? { commissionRate: Number(commissionRate) } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
          ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(onlinePlatforms.id, id));

      res.json({ success: true, message: 'Platform updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/online-platforms/:id — Delete a custom platform
   */
  public static async deletePlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const [existing] = await db.select().from(onlinePlatforms).where(eq(onlinePlatforms.id, id)).limit(1);

      if (existing && existing.icon && existing.icon.startsWith('/uploads/platforms/')) {
        try {
          const oldPath = path.resolve(__dirname, '../../../uploads/platforms', path.basename(existing.icon));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch {}
      }

      await db.delete(onlinePlatforms).where(eq(onlinePlatforms.id, id));
      res.json({ success: true, message: 'Platform deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

