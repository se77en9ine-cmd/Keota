import { Request, Response, NextFunction } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../database/connection';
import { categories, products } from '../database/schema';

export class CategoryController {
  /**
   * GET /api/categories — list all categories with product count
   */
  public static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const allCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          code: categories.code,
          icon: categories.icon,
          parentId: categories.parentId,
          sortOrder: categories.sortOrder,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .orderBy(categories.sortOrder);

      // Count products per category
      const productCounts = await db
        .select({
          categoryId: products.categoryId,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(products)
        .groupBy(products.categoryId);

      const countMap = new Map(productCounts.map((pc) => [pc.categoryId, pc.count]));

      const result = allCategories.map((cat) => ({
        ...cat,
        productCount: countMap.get(cat.id) || 0,
      }));

      res.json({ success: true, categories: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/categories — create a new category
   */
  public static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, code, icon, parentId } = req.body;

      if (!name || !code) {
        return res.status(400).json({ success: false, message: 'Name and code are required' });
      }

      // Get max sort order for placement at end
      const maxResult = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
        .from(categories);
      const nextOrder = (maxResult[0]?.maxOrder ?? -1) + 1;

      const id = `cat-${Date.now()}`;
      await db.insert(categories).values({
        id,
        name,
        code: code.toUpperCase(),
        icon: icon || null,
        parentId: parentId || null,
        sortOrder: nextOrder,
      });

      res.status(201).json({ success: true, id, message: 'Category created successfully' });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, message: 'Category code already exists' });
      }
      next(err);
    }
  }

  /**
   * PUT /api/categories/:id — update a category
   */
  public static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, code, icon, parentId } = req.body;

      if (!name || !code) {
        return res.status(400).json({ success: false, message: 'Name and code are required' });
      }

      // Prevent self-referencing parent
      if (parentId === id) {
        return res.status(400).json({ success: false, message: 'Category cannot be its own parent' });
      }

      await db
        .update(categories)
        .set({
          name,
          code: code.toUpperCase(),
          icon: icon || null,
          parentId: parentId || null,
        })
        .where(eq(categories.id, id));

      res.json({ success: true, id, message: 'Category updated successfully' });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, message: 'Category code already exists' });
      }
      next(err);
    }
  }

  /**
   * DELETE /api/categories/:id — delete a category (only if no products assigned)
   */
  public static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if products are assigned
      const assignedProducts = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(products)
        .where(eq(products.categoryId, id));

      const count = assignedProducts[0]?.count || 0;
      if (count > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete: ${count} product(s) are assigned to this category. Reassign them first.`,
        });
      }

      await db.delete(categories).where(eq(categories.id, id));
      res.json({ success: true, id, message: 'Category deleted' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/categories/reorder — reorder categories by passing ordered ID array
   */
  public static async reorderCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ success: false, message: 'orderedIds array is required' });
      }

      for (let i = 0; i < orderedIds.length; i++) {
        await db
          .update(categories)
          .set({ sortOrder: i })
          .where(eq(categories.id, orderedIds[i]));
      }

      res.json({ success: true, message: 'Categories reordered successfully' });
    } catch (err) {
      next(err);
    }
  }
}
