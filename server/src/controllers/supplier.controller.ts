import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { suppliers } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

function removeLocalLogoIfApplicable(logoUrl: string | null | undefined) {
  if (!logoUrl) return;
  if (logoUrl.startsWith('/uploads/suppliers/')) {
    const filename = path.basename(logoUrl);
    const fullPath = path.resolve(__dirname, '../../../uploads/suppliers', filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error('Failed to remove supplier logo file:', err);
      }
    }
  }
}

export class SupplierController {
  public static async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
      res.json({ success: true, suppliers: list });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No logo image uploaded' });
      }
      const logoUrl = `/uploads/suppliers/${req.file.filename}`;
      res.json({
        success: true,
        logoUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.body.id || `sup-${Date.now()}`;
      await db.insert(suppliers).values({
        id,
        name: req.body.name?.trim(),
        companyName: req.body.companyName?.trim() || null,
        taxId: req.body.taxId?.trim() || null,
        email: req.body.email?.trim() || null,
        phone: req.body.phone?.trim() || null,
        address: req.body.address?.trim() || null,
        logoUrl: req.body.logoUrl?.trim() || null,
        tier: req.body.tier || 'STANDARD',
        creditLimit: Number(req.body.creditLimit || 0),
        balance: Number(req.body.balance || 0),
      });
      res.status(201).json({ success: true, id, message: 'Supplier registered successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, companyName, taxId, email, phone, address, logoUrl, tier, creditLimit, balance } = req.body;

      const existing = (await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1))[0];
      if (existing && existing.logoUrl && existing.logoUrl !== logoUrl) {
        removeLocalLogoIfApplicable(existing.logoUrl);
      }

      await db
        .update(suppliers)
        .set({
          ...(name ? { name: name.trim() } : {}),
          ...(companyName !== undefined ? { companyName: companyName?.trim() || null } : {}),
          ...(taxId !== undefined ? { taxId: taxId?.trim() || null } : {}),
          ...(email !== undefined ? { email: email?.trim() || null } : {}),
          ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
          ...(address !== undefined ? { address: address?.trim() || null } : {}),
          ...(logoUrl !== undefined ? { logoUrl: logoUrl?.trim() || null } : {}),
          ...(tier !== undefined ? { tier } : {}),
          ...(creditLimit !== undefined ? { creditLimit: Number(creditLimit) } : {}),
          ...(balance !== undefined ? { balance: Number(balance) } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(suppliers.id, id));

      res.json({ success: true, message: 'Supplier updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = (await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1))[0];
      if (existing && existing.logoUrl) {
        removeLocalLogoIfApplicable(existing.logoUrl);
      }
      await db.delete(suppliers).where(eq(suppliers.id, id));
      res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}
