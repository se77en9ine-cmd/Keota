import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { diningTables, sales } from '../database/schema';
import { eq, asc } from 'drizzle-orm';

export class TableController {
  /**
   * GET /api/tables — list all restaurant dining tables
   */
  public static async getTables(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await db.select().from(diningTables).orderBy(asc(diningTables.sortOrder));
      res.json({ success: true, tables: list });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/tables — create a dining table
   */
  public static async createTable(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.body.id || `tbl-${Date.now()}`;
      await db.insert(diningTables).values({
        id,
        name: req.body.name,
        code: req.body.code.toUpperCase(),
        zone: req.body.zone || 'Main Dining',
        capacity: Number(req.body.capacity || 4),
        shape: req.body.shape || 'SQUARE',
        status: req.body.status || 'AVAILABLE',
        sortOrder: Number(req.body.sortOrder || 0),
      });

      res.status(201).json({ success: true, id, message: 'Table created successfully' });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, message: 'Table code already exists' });
      }
      next(err);
    }
  }

  /**
   * PUT /api/tables/:id — update a dining table
   */
  public static async updateTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await db
        .update(diningTables)
        .set({
          name: req.body.name,
          code: req.body.code.toUpperCase(),
          zone: req.body.zone || 'Main Dining',
          capacity: Number(req.body.capacity || 4),
          shape: req.body.shape || 'SQUARE',
          status: req.body.status || 'AVAILABLE',
          sortOrder: Number(req.body.sortOrder || 0),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(diningTables.id, id));

      res.json({ success: true, message: 'Table updated successfully' });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, message: 'Table code already exists' });
      }
      next(err);
    }
  }

  /**
   * PATCH /api/tables/:id/status — quick status toggle (Available, Occupied, Reserved, Cleaning)
   */
  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, activeHoldId } = req.body;

      await db
        .update(diningTables)
        .set({
          status: status || 'AVAILABLE',
          activeHoldId: activeHoldId !== undefined ? activeHoldId : null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(diningTables.id, id));

      res.json({ success: true, message: 'Table status updated' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/tables/:id — delete a table
   */
  public static async deleteTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await db.delete(diningTables).where(eq(diningTables.id, id));
      res.json({ success: true, id, message: 'Table deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/tables/zones/rename — rename a zone and cascade update all associated tables
   */
  public static async renameZone(req: Request, res: Response, next: NextFunction) {
    try {
      const { oldZone, newZone } = req.body;
      if (!oldZone || !newZone) {
        return res.status(400).json({ success: false, message: 'oldZone and newZone are required' });
      }
      const trimmedNew = newZone.trim();
      await db
        .update(diningTables)
        .set({ zone: trimmedNew, updatedAt: new Date().toISOString() })
        .where(eq(diningTables.zone, oldZone));

      res.json({ success: true, message: `Zone renamed from "${oldZone}" to "${trimmedNew}"` });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/tables/zones/delete — delete a zone and reassign tables to a fallback zone
   */
  public static async deleteZone(req: Request, res: Response, next: NextFunction) {
    try {
      const { zoneName, targetZone } = req.body;
      if (!zoneName) {
        return res.status(400).json({ success: false, message: 'zoneName is required' });
      }
      const destination = targetZone ? targetZone.trim() : 'Main Dining';
      await db
        .update(diningTables)
        .set({ zone: destination, updatedAt: new Date().toISOString() })
        .where(eq(diningTables.zone, zoneName));

      res.json({
        success: true,
        message: `Zone "${zoneName}" removed. Tables reassigned to "${destination}".`,
      });
    } catch (err) {
      next(err);
    }
  }
}

