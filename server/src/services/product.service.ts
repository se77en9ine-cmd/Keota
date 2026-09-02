import { eq, like, or, sql } from 'drizzle-orm';
import { db, sqlite } from '../database/connection';
import { products, productVariants, categories, brands, units, suppliers, inventory, warehouses, inventoryMovements } from '../database/schema';
import { AppError } from '../middlewares/errorHandler';

import fs from 'fs';
import path from 'path';

function removeLocalFileIfApplicable(imageUrl?: string | null) {
  if (imageUrl && imageUrl.startsWith('/uploads/products/')) {
    const filename = path.basename(imageUrl);
    const fullPath = path.resolve(__dirname, '../../../uploads/products', filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error('Failed to remove local product image:', err);
      }
    }
  }
}

export class ProductService {
  public static async getProducts(query?: { search?: string; categoryId?: string; isActive?: boolean }) {
    let baseQuery = db
      .select({
        id: products.id,
        sku: products.sku,
        barcode: products.barcode,
        qrCode: products.qrCode,
        name: products.name,
        description: products.description,
        categoryId: products.categoryId,
        categoryName: categories.name,
        brandId: products.brandId,
        brandName: brands.name,
        unitId: products.unitId,
        unitSymbol: units.symbol,
        supplierId: products.supplierId,
        purchasePrice: products.purchasePrice,
        sellingPrice: products.sellingPrice,
        wholesalePrice: products.wholesalePrice,
        minPrice: products.minPrice,
        maxDiscount: products.maxDiscount,
        taxRate: products.taxRate,
        imageUrl: products.imageUrl,
        isActive: products.isActive,
        trackInventory: products.trackInventory,
        hasVariants: products.hasVariants,
        stockLocation: products.stockLocation,
        posMode: products.posMode,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(units, eq(products.unitId, units.id));

    const rows = await baseQuery;

    // Fetch stock totals & variants
    const allVariants = await db.select().from(productVariants);
    const allStock = await db.select().from(inventory);

    const result = rows.map((prod) => {
      const prodVariants = allVariants.filter((v) => v.productId === prod.id);
      const stockItems = allStock.filter((s) => s.productId === prod.id);
      const stockTotal = stockItems.reduce((sum, item) => sum + item.quantity, 0);

      // Find nearest active expiry date from inventory batches (prioritizing in-stock items > 0)
      const inStockWithExpiry = stockItems
        .filter((s) => s.expiryDate && s.expiryDate.trim().length > 0 && s.quantity > 0)
        .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''));

      const allWithExpiry = stockItems
        .filter((s) => s.expiryDate && s.expiryDate.trim().length > 0)
        .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''));

      const inStockBatches = stockItems.filter((s) => s.quantity > 0);
      const nearestBatch = inStockWithExpiry[0] || allWithExpiry[0] || stockItems[0];
      const nearestExpiryDate = nearestBatch ? nearestBatch.expiryDate : null;
      const batchNumber = nearestBatch ? nearestBatch.batchNumber : null;
      const activeBatchQty = nearestBatch ? nearestBatch.quantity : 0;
      const batchCount = inStockBatches.length;

      const formattedBatches = stockItems.map((s) => ({
        id: s.id,
        batchNumber: s.batchNumber,
        expiryDate: s.expiryDate,
        quantity: s.quantity,
        avgCost: s.avgCost,
      }));

      return {
        ...prod,
        stockQuantity: stockTotal,
        expiryDate: nearestExpiryDate,
        batchNumber,
        activeBatchQty,
        batchCount,
        batches: formattedBatches,
        variants: prodVariants,
      };
    });

    // Apply filtering in memory or where clauses
    let filtered = result;
    if (query?.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === query.categoryId);
    }
    if (query?.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.barcode.toLowerCase().includes(s) ||
          p.sku.toLowerCase().includes(s)
      );
    }

    return filtered;
  }

  public static async getByBarcode(barcode: string) {
    // Check main product or variant barcode
    const prod = (await db.select().from(products).where(eq(products.barcode, barcode)).limit(1))[0];
    if (prod) {
      const variants = await db.select().from(productVariants).where(eq(productVariants.productId, prod.id));
      const stock = await db.select().from(inventory).where(eq(inventory.productId, prod.id));
      const totalStock = stock.reduce((acc, s) => acc + s.quantity, 0);
      return { ...prod, variants, stockQuantity: totalStock };
    }

    const variant = (await db.select().from(productVariants).where(eq(productVariants.barcode, barcode)).limit(1))[0];
    if (variant) {
      const parent = (await db.select().from(products).where(eq(products.id, variant.productId)).limit(1))[0];
      const stock = await db.select().from(inventory).where(eq(inventory.variantId, variant.id));
      const totalStock = stock.reduce((acc, s) => acc + s.quantity, 0);
      return {
        ...parent,
        selectedVariant: variant,
        sellingPrice: parent.sellingPrice + variant.priceAdjustment,
        purchasePrice: parent.purchasePrice + variant.costAdjustment,
        stockQuantity: totalStock,
      };
    }

    return null;
  }

  public static async createProduct(data: any) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Product name is required', 400);
    }

    const sku = (data.sku && data.sku.trim()) || `SKU-${Date.now().toString().slice(-6)}`;
    const barcode = (data.barcode && data.barcode.trim()) || `BC-${Date.now().toString().slice(-8)}`;

    // Check SKU duplicate
    const existingSku = (await db.select({ id: products.id }).from(products).where(eq(products.sku, sku)).limit(1))[0];
    if (existingSku) {
      throw new AppError(`SKU "${sku}" is already assigned to another product`, 400);
    }

    // Check Barcode duplicate
    const existingBarcode = (await db.select({ id: products.id }).from(products).where(eq(products.barcode, barcode)).limit(1))[0];
    if (existingBarcode) {
      throw new AppError(`Barcode "${barcode}" is already assigned to another product`, 400);
    }

    // Foreign Keys sanitization
    let categoryId = data.categoryId || null;
    if (categoryId) {
      const catExists = (await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1))[0];
      if (!catExists) categoryId = null;
    }

    let brandId = data.brandId || null;
    if (brandId) {
      const brandExists = (await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1))[0];
      if (!brandExists) brandId = null;
    }

    let unitId = data.unitId || null;
    if (unitId) {
      const unitExists = (await db.select({ id: units.id }).from(units).where(eq(units.id, unitId)).limit(1))[0];
      if (!unitExists) unitId = null;
    }

    let supplierId = data.supplierId || null;
    if (supplierId) {
      const supExists = (await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, supplierId)).limit(1))[0];
      if (!supExists) supplierId = null;
    }

    const id = data.id || `prod-${Date.now()}`;
    await db.insert(products).values({
      id,
      sku,
      barcode,
      qrCode: data.qrCode || null,
      name: data.name.trim(),
      description: data.description || null,
      categoryId,
      brandId,
      unitId,
      supplierId,
      purchasePrice: Number(data.purchasePrice || 0),
      sellingPrice: Number(data.sellingPrice || 0),
      wholesalePrice: Number(data.wholesalePrice || 0),
      minPrice: Number(data.minPrice || 0),
      maxDiscount: Number(data.maxDiscount || 0),
      taxRate: Number(data.taxRate || 0),
      imageUrl: data.imageUrl || null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      trackInventory: data.trackInventory !== undefined ? Boolean(data.trackInventory) : true,
      hasVariants: Boolean(data.hasVariants),
      stockLocation: data.stockLocation || null,
      posMode: data.posMode || 'ALL',
    });

    // Resolve valid warehouse ID
    let targetWarehouseId = data.warehouseId || 'wh-main';
    const whExists = (await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.id, targetWarehouseId)).limit(1))[0];
    if (!whExists) {
      const defaultWh = (await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.isDefault, true)).limit(1))[0];
      if (defaultWh) {
        targetWarehouseId = defaultWh.id;
      } else {
        const anyWh = (await db.select({ id: warehouses.id }).from(warehouses).limit(1))[0];
        if (anyWh) {
          targetWarehouseId = anyWh.id;
        } else {
          targetWarehouseId = 'wh-main';
          await db.insert(warehouses).values({
            id: 'wh-main',
            name: 'Central Warehouse & Cold Storage',
            code: 'WH-01',
            location: 'Zone A - Main Hub',
            isDefault: true,
          }).onConflictDoNothing();
        }
      }
    }

    if (data.initialStock && Number(data.initialStock) > 0) {
      await db.insert(inventory).values({
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: id,
        warehouseId: targetWarehouseId,
        quantity: Number(data.initialStock),
        avgCost: Number(data.purchasePrice || 0),
        batchNumber: data.batchNumber || `BATCH-${new Date().getFullYear()}`,
        expiryDate: data.expiryDate || null,
      });

      await db.insert(inventoryMovements).values({
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: id,
        warehouseId: targetWarehouseId,
        type: 'IN',
        quantity: Number(data.initialStock),
        cost: Number(data.purchasePrice || 0),
        referenceType: 'MANUAL',
        notes: 'Initial stock on product creation',
      }).onConflictDoNothing();
    }

    if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
      for (const v of data.variants) {
        const varId = v.id || `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const varSku = (v.sku && v.sku.trim()) || `${sku}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        await db.insert(productVariants).values({
          id: varId,
          productId: id,
          sku: varSku,
          barcode: v.barcode || null,
          name: v.name || 'Variant',
          priceAdjustment: Number(v.priceAdjustment || 0),
          costAdjustment: Number(v.costAdjustment || 0),
          attributesJson: v.attributesJson ? (typeof v.attributesJson === 'string' ? v.attributesJson : JSON.stringify(v.attributesJson)) : null,
        });

        if (v.initialStock && Number(v.initialStock) > 0) {
          await db.insert(inventory).values({
            id: `inv-var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: id,
            variantId: varId,
            warehouseId: targetWarehouseId,
            quantity: Number(v.initialStock),
            avgCost: Number(data.purchasePrice || 0) + Number(v.costAdjustment || 0),
            batchNumber: data.batchNumber || `BATCH-${new Date().getFullYear()}`,
            expiryDate: data.expiryDate || null,
          });
        }
      }
    }

    return { id, message: 'Product created successfully' };
  }

  public static async updateProduct(id: string, data: any) {
    const existing = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    if (existing.imageUrl && existing.imageUrl !== data.imageUrl) {
      removeLocalFileIfApplicable(existing.imageUrl);
    }

    const sku = (data.sku && data.sku.trim()) || existing.sku;
    const barcode = (data.barcode && data.barcode.trim()) || existing.barcode;

    // Check duplicate SKU
    if (sku !== existing.sku) {
      const existingSku = (await db.select({ id: products.id }).from(products).where(eq(products.sku, sku)).limit(1))[0];
      if (existingSku && existingSku.id !== id) {
        throw new AppError(`SKU "${sku}" is already assigned to another product`, 400);
      }
    }

    // Check duplicate Barcode
    if (barcode !== existing.barcode) {
      const existingBarcode = (await db.select({ id: products.id }).from(products).where(eq(products.barcode, barcode)).limit(1))[0];
      if (existingBarcode && existingBarcode.id !== id) {
        throw new AppError(`Barcode "${barcode}" is already assigned to another product`, 400);
      }
    }

    // Foreign Keys sanitization
    let categoryId = data.categoryId || null;
    if (categoryId) {
      const catExists = (await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1))[0];
      if (!catExists) categoryId = null;
    }

    let brandId = data.brandId || null;
    if (brandId) {
      const brandExists = (await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1))[0];
      if (!brandExists) brandId = null;
    }

    let unitId = data.unitId || null;
    if (unitId) {
      const unitExists = (await db.select({ id: units.id }).from(units).where(eq(units.id, unitId)).limit(1))[0];
      if (!unitExists) unitId = null;
    }

    let supplierId = data.supplierId || null;
    if (supplierId) {
      const supExists = (await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, supplierId)).limit(1))[0];
      if (!supExists) supplierId = null;
    }

    await db
      .update(products)
      .set({
        name: data.name ? data.name.trim() : existing.name,
        sku,
        barcode,
        description: data.description !== undefined ? data.description : existing.description,
        categoryId,
        brandId,
        unitId,
        supplierId,
        purchasePrice: Number(data.purchasePrice ?? existing.purchasePrice),
        sellingPrice: Number(data.sellingPrice ?? existing.sellingPrice),
        wholesalePrice: Number(data.wholesalePrice ?? existing.wholesalePrice),
        minPrice: Number(data.minPrice ?? existing.minPrice),
        maxDiscount: Number(data.maxDiscount ?? existing.maxDiscount),
        taxRate: Number(data.taxRate ?? existing.taxRate),
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
        isActive: Boolean(data.isActive !== false),
        trackInventory: Boolean(data.trackInventory !== false),
        hasVariants: Boolean(data.hasVariants),
        stockLocation: data.stockLocation !== undefined ? data.stockLocation : existing.stockLocation,
        posMode: data.posMode || existing.posMode || 'ALL',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, id));

    // Resolve warehouse ID for inventory
    let targetWarehouseId = data.warehouseId || 'wh-main';
    const whExists = (await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.id, targetWarehouseId)).limit(1))[0];
    if (!whExists) {
      const anyWh = (await db.select({ id: warehouses.id }).from(warehouses).limit(1))[0];
      targetWarehouseId = anyWh ? anyWh.id : 'wh-main';
    }

    if (data.variants && Array.isArray(data.variants)) {
      const existingVariants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, id));

      const incomingIds = new Set(data.variants.map((v: any) => v.id).filter(Boolean));

      // 1. Safely remove deleted variants without breaking inventory FK
      for (const ex of existingVariants) {
        if (!incomingIds.has(ex.id)) {
          sqlite.prepare('UPDATE inventory SET variant_id = NULL WHERE variant_id = ?').run(ex.id);
          sqlite.prepare('UPDATE inventory_movements SET variant_id = NULL WHERE variant_id = ?').run(ex.id);
          sqlite.prepare('DELETE FROM product_variants WHERE id = ?').run(ex.id);
        }
      }

      // 2. Upsert (update existing, insert new)
      for (const v of data.variants) {
        const varId = v.id || `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const exists = existingVariants.some((ex) => ex.id === varId);

        if (exists) {
          await db
            .update(productVariants)
            .set({
              sku: v.sku,
              barcode: v.barcode || null,
              name: v.name,
              priceAdjustment: Number(v.priceAdjustment || 0),
              costAdjustment: Number(v.costAdjustment || 0),
              attributesJson: v.attributesJson
                ? typeof v.attributesJson === 'string'
                  ? v.attributesJson
                  : JSON.stringify(v.attributesJson)
                : null,
            })
            .where(eq(productVariants.id, varId));
        } else {
          await db.insert(productVariants).values({
            id: varId,
            productId: id,
            sku: v.sku || `${sku}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            barcode: v.barcode || null,
            name: v.name,
            priceAdjustment: Number(v.priceAdjustment || 0),
            costAdjustment: Number(v.costAdjustment || 0),
            attributesJson: v.attributesJson
              ? typeof v.attributesJson === 'string'
                ? v.attributesJson
                : JSON.stringify(v.attributesJson)
              : null,
          });

          if (v.initialStock && Number(v.initialStock) > 0) {
            await db.insert(inventory).values({
              id: `inv-var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              productId: id,
              variantId: varId,
              warehouseId: targetWarehouseId,
              quantity: Number(v.initialStock),
              avgCost: Number(data.purchasePrice || 0) + Number(v.costAdjustment || 0),
              batchNumber: data.batchNumber || `BATCH-${new Date().getFullYear()}`,
              expiryDate: data.expiryDate || null,
            });
          }
        }
      }
    } else if (!data.hasVariants) {
      // If variants turned off, detach references and clear variants
      sqlite.prepare('UPDATE inventory SET variant_id = NULL WHERE product_id = ?').run(id);
      sqlite.prepare('UPDATE inventory_movements SET variant_id = NULL WHERE product_id = ?').run(id);
      sqlite.prepare('UPDATE sale_items SET variant_id = NULL WHERE product_id = ?').run(id);
      sqlite.prepare('UPDATE purchase_items SET variant_id = NULL WHERE product_id = ?').run(id);
      sqlite.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
    }

    // 3. Synchronize stock quantity (QTY) in inventory table for standard products
    if (!data.hasVariants && data.initialStock !== undefined) {
      const existingInv = (await db.select().from(inventory).where(eq(inventory.productId, id)).limit(1))[0];
      if (existingInv) {
        await db
          .update(inventory)
          .set({
            quantity: Number(data.initialStock),
            avgCost: Number(data.purchasePrice || 0),
            batchNumber: data.batchNumber !== undefined ? data.batchNumber : existingInv.batchNumber,
            expiryDate: data.expiryDate !== undefined ? (data.expiryDate || null) : existingInv.expiryDate,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(inventory.id, existingInv.id));
      } else if (Number(data.initialStock) > 0) {
        await db.insert(inventory).values({
          id: `inv-${Date.now()}`,
          productId: id,
          warehouseId: targetWarehouseId,
          quantity: Number(data.initialStock),
          avgCost: Number(data.purchasePrice || 0),
          batchNumber: data.batchNumber || `BATCH-${new Date().getFullYear()}`,
          expiryDate: data.expiryDate || null,
        });
      }
    }

    return { id, message: 'Product updated successfully' };
  }

  public static async deleteProduct(id: string) {
    const existing = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
    if (existing && existing.imageUrl) {
      removeLocalFileIfApplicable(existing.imageUrl);
    }

    const deleteTx = sqlite.transaction(() => {
      // 1. Delete dependent sales items
      sqlite.prepare('DELETE FROM sale_items WHERE product_id = ? OR variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)').run(id, id);
      // 2. Delete dependent purchase items
      sqlite.prepare('DELETE FROM purchase_items WHERE product_id = ? OR variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)').run(id, id);
      // 3. Delete inventory audit movements
      sqlite.prepare('DELETE FROM inventory_movements WHERE product_id = ? OR variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)').run(id, id);
      // 4. Delete inventory stock balances
      sqlite.prepare('DELETE FROM inventory WHERE product_id = ? OR variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)').run(id, id);
      // 5. Delete child product variants
      sqlite.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
      // 6. Delete master product record
      sqlite.prepare('DELETE FROM products WHERE id = ?').run(id);
    });

    deleteTx();
    return { id, message: 'Product deleted successfully' };
  }

  public static async deleteMultipleProducts(ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0, message: 'No products selected' };
    for (const id of ids) {
      await this.deleteProduct(id);
    }
    return { count: ids.length, message: `${ids.length} products deleted successfully` };
  }

  public static async deleteAllProducts() {
    const all = await db.select({ id: products.id }).from(products);
    const ids = all.map((p) => p.id);
    return this.deleteMultipleProducts(ids);
  }

  public static async bulkUpdateProducts(
    ids: string[],
    updates: { categoryId?: string; posMode?: string; stockAdjustment?: number }
  ) {
    if (!ids || ids.length === 0) return { count: 0, message: 'No products selected' };

    const updateTx = sqlite.transaction(() => {
      for (const id of ids) {
        if (updates.categoryId !== undefined) {
          sqlite.prepare('UPDATE products SET category_id = ? WHERE id = ?').run(updates.categoryId || null, id);
        }
        if (updates.posMode !== undefined) {
          sqlite.prepare('UPDATE products SET pos_mode = ? WHERE id = ?').run(updates.posMode, id);
        }
        if (updates.stockAdjustment !== undefined && updates.stockAdjustment !== 0) {
          sqlite.prepare('UPDATE inventory SET quantity = MAX(0, quantity + ?) WHERE product_id = ?').run(updates.stockAdjustment, id);
        }
      }
    });

    updateTx();
    return { count: ids.length, message: `${ids.length} products updated successfully` };
  }
}

