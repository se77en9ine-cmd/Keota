import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { db } from '../database/connection';
import { categories, brands, units, suppliers, warehouses } from '../database/schema';

export class ProductController {
  public static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, categoryId } = req.query;
      const list = await ProductService.getProducts({
        search: search as string,
        categoryId: categoryId as string,
      });
      res.json({ success: true, products: list });
    } catch (err) {
      next(err);
    }
  }

  public static async getByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { barcode } = req.params;
      const product = await ProductService.getByBarcode(barcode);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, product });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
      }
      const imageUrl = `/uploads/products/${req.file.filename}`;
      res.json({
        success: true,
        imageUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.createProduct(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await ProductService.updateProduct(id, req.body);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Update product error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Failed to update product' });
    }
  }

  public static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await ProductService.deleteProduct(id);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await ProductService.deleteMultipleProducts(ids);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async bulkUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids, updates } = req.body;
      const result = await ProductService.bulkUpdateProducts(ids, updates || {});
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.deleteAllProducts();
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const allCategories = await db.select().from(categories);
      const allBrands = await db.select().from(brands);
      const allUnits = await db.select().from(units);
      const allSuppliers = await db.select().from(suppliers);
      const allWarehouses = await db.select().from(warehouses);

      res.json({
        success: true,
        categories: allCategories,
        brands: allBrands,
        units: allUnits,
        suppliers: allSuppliers,
        warehouses: allWarehouses,
      });
    } catch (err) {
      next(err);
    }
  }
}
