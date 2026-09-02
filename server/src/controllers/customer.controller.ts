import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { customers, settings, sales } from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export interface TierRule {
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  name: string;
  minPoints: number;
  discountPercent: number;
  creditLimit: number;
  description: string;
}

export const DEFAULT_TIER_RULES: TierRule[] = [
  {
    tier: 'BRONZE',
    name: 'Bronze Standard',
    minPoints: 0,
    discountPercent: 0,
    creditLimit: 500,
    description: 'Entry-level tier for all registered members',
  },
  {
    tier: 'SILVER',
    name: 'Silver Club',
    minPoints: 500,
    discountPercent: 5,
    creditLimit: 1000,
    description: '5% member discount on all standard orders',
  },
  {
    tier: 'GOLD',
    name: 'Gold Executive',
    minPoints: 1000,
    discountPercent: 10,
    creditLimit: 2000,
    description: '10% discount + VIP pricing',
  },
  {
    tier: 'PLATINUM',
    name: 'VIP Platinum',
    minPoints: 2500,
    discountPercent: 15,
    creditLimit: 5000,
    description: '15% discount + maximum credit limit & perks',
  },
];

function removeLocalAvatarIfApplicable(avatarUrl?: string | null) {
  if (avatarUrl && avatarUrl.startsWith('/uploads/customers/')) {
    const filename = path.basename(avatarUrl);
    const fullPath = path.resolve(__dirname, '../../../uploads/customers', filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error('Failed to remove customer avatar file:', err);
      }
    }
  }
}

export class CustomerController {
  /**
   * GET /api/customers — list all customers with live sales aggregation
   */
  public static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await db.select().from(customers);

      // Aggregated real sales summary per customer
      const salesSummary = await db
        .select({
          customerId: sales.customerId,
          totalOrders: sql<number>`COUNT(${sales.id})`,
          totalSpent: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        })
        .from(sales)
        .where(sql`${sales.customerId} IS NOT NULL`)
        .groupBy(sales.customerId);

      const salesMap = new Map<string, { totalOrders: number; totalSpent: number }>();
      for (const s of salesSummary) {
        if (s.customerId) {
          salesMap.set(s.customerId, {
            totalOrders: Number(s.totalOrders) || 0,
            totalSpent: Number(s.totalSpent) || 0,
          });
        }
      }

      const enriched = list.map((c) => {
        const stats = salesMap.get(c.id) || { totalOrders: 0, totalSpent: 0 };
        const calculatedOrders = stats.totalOrders + (c.manualOrdersCount || 0);
        const calculatedSpent = stats.totalSpent + (c.manualTotalSpent || 0);
        return {
          ...c,
          actualOrdersCount: stats.totalOrders,
          actualTotalSpent: stats.totalSpent,
          totalOrders: calculatedOrders,
          totalSpent: calculatedSpent,
        };
      });

      res.json({ success: true, customers: enriched });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customers/tier-rules — get membership tier qualification rules
   */
  public static async getTierRules(req: Request, res: Response, next: NextFunction) {
    try {
      const settingRow = (
        await db.select().from(settings).where(eq(settings.key, 'customer_tier_rules')).limit(1)
      )[0];

      let rules: TierRule[] = DEFAULT_TIER_RULES;
      if (settingRow && settingRow.valueJson) {
        try {
          rules = JSON.parse(settingRow.valueJson);
        } catch {
          rules = DEFAULT_TIER_RULES;
        }
      }

      res.json({ success: true, rules });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/customers/tier-rules — save membership tier qualification rules
   */
  public static async saveTierRules(req: Request, res: Response, next: NextFunction) {
    try {
      const rules = req.body.rules;
      if (!Array.isArray(rules)) {
        return res.status(400).json({ success: false, message: 'Invalid rules array' });
      }

      const existing = (
        await db.select().from(settings).where(eq(settings.key, 'customer_tier_rules')).limit(1)
      )[0];

      if (existing) {
        await db
          .update(settings)
          .set({
            valueJson: JSON.stringify(rules),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(settings.key, 'customer_tier_rules'));
      } else {
        await db.insert(settings).values({
          id: `set-tier-rules-${Date.now()}`,
          key: 'customer_tier_rules',
          valueJson: JSON.stringify(rules),
          category: 'POS',
        });
      }

      res.json({ success: true, message: 'Tier rules saved successfully', rules });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customers/recalculate-tiers — batch update all customer tiers based on points
   */
  public static async recalculateTiers(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Get tier rules
      const settingRow = (
        await db.select().from(settings).where(eq(settings.key, 'customer_tier_rules')).limit(1)
      )[0];

      let rules: TierRule[] = DEFAULT_TIER_RULES;
      if (settingRow && settingRow.valueJson) {
        try {
          rules = JSON.parse(settingRow.valueJson);
        } catch {
          rules = DEFAULT_TIER_RULES;
        }
      }

      // Sort rules descending by minPoints
      const sortedRules = [...rules].sort((a, b) => b.minPoints - a.minPoints);

      // 2. Fetch all customers
      const allCustomers = await db.select().from(customers);
      let promotedCount = 0;
      let unchangedCount = 0;
      const changes: { name: string; oldTier: string; newTier: string; points: number }[] = [];

      for (const cust of allCustomers) {
        const points = cust.points || 0;
        let eligibleTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'BRONZE';

        for (const r of sortedRules) {
          if (points >= r.minPoints) {
            eligibleTier = r.tier;
            break;
          }
        }

        if (cust.tier !== eligibleTier) {
          await db
            .update(customers)
            .set({
              tier: eligibleTier,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(customers.id, cust.id));

          promotedCount++;
          changes.push({
            name: cust.name,
            oldTier: cust.tier,
            newTier: eligibleTier,
            points,
          });
        } else {
          unchangedCount++;
        }
      }

      res.json({
        success: true,
        message: `Recalculation complete. ${promotedCount} customer tiers updated.`,
        promotedCount,
        unchangedCount,
        totalScanned: allCustomers.length,
        changes,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customers/upload-avatar — upload customer profile picture
   */
  public static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No avatar image uploaded' });
      }
      const avatarUrl = `/uploads/customers/${req.file.filename}`;
      res.json({
        success: true,
        avatarUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customers — create a customer
   */
  public static async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.body.id || `cust-${Date.now()}`;
      await db.insert(customers).values({
        id,
        name: req.body.name,
        surname: req.body.surname || null,
        gender: req.body.gender || 'UNSPECIFIED',
        phone: req.body.phone || null,
        email: req.body.email || null,
        memberCode: req.body.memberCode || `MBR-${Math.floor(10000 + Math.random() * 90000)}`,
        tier: req.body.tier || 'BRONZE',
        points: Number(req.body.points || 0),
        creditLimit: Number(req.body.creditLimit || 0),
        balance: Number(req.body.balance || 0),
        avatarUrl: req.body.avatarUrl || null,
        address: req.body.address || null,
        currency: req.body.currency || 'USD',
        manualOrdersCount: Number(req.body.manualOrdersCount || req.body.totalOrders || 0),
        manualTotalSpent: Number(req.body.manualTotalSpent || req.body.totalSpent || 0),
      });
      res.status(201).json({ success: true, id, message: 'Customer created successfully' });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, message: 'Member code already exists' });
      }
      next(err);
    }
  }

  /**
   * PUT /api/customers/:id — update a customer
   */
  public static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = (await db.select().from(customers).where(eq(customers.id, id)).limit(1))[0];

      if (existing && existing.avatarUrl && existing.avatarUrl !== req.body.avatarUrl) {
        removeLocalAvatarIfApplicable(existing.avatarUrl);
      }

      await db
        .update(customers)
        .set({
          name: req.body.name,
          surname: req.body.surname !== undefined ? req.body.surname : undefined,
          gender: req.body.gender !== undefined ? req.body.gender : undefined,
          phone: req.body.phone || null,
          email: req.body.email || null,
          memberCode: req.body.memberCode,
          tier: req.body.tier || 'BRONZE',
          points: Number(req.body.points || 0),
          creditLimit: Number(req.body.creditLimit || 0),
          avatarUrl: req.body.avatarUrl || null,
          address: req.body.address || null,
          currency: req.body.currency || 'USD',
          manualOrdersCount:
            req.body.manualOrdersCount !== undefined
              ? Number(req.body.manualOrdersCount)
              : req.body.totalOrders !== undefined
              ? Number(req.body.totalOrders)
              : undefined,
          manualTotalSpent:
            req.body.manualTotalSpent !== undefined
              ? Number(req.body.manualTotalSpent)
              : req.body.totalSpent !== undefined
              ? Number(req.body.totalSpent)
              : undefined,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(customers.id, id));

      res.json({ success: true, message: 'Customer updated successfully' });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, message: 'Member code already exists' });
      }
      next(err);
    }
  }

  /**
   * DELETE /api/customers/:id — delete a customer
   */
  public static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const existing = (await db.select().from(customers).where(eq(customers.id, id)).limit(1))[0];
      if (existing && existing.avatarUrl) {
        removeLocalAvatarIfApplicable(existing.avatarUrl);
      }

      await db.delete(customers).where(eq(customers.id, id));
      res.json({ success: true, id, message: 'Customer deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customers/:id/toggle-blacklist — toggle COD blacklist status
   */
  public static async toggleBlacklist(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const { PosService } = await import('../services/pos.service');
      const result = await PosService.toggleCustomerBlacklist(id, reason);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

