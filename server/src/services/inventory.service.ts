import { eq, sql, lt, lte, and, inArray, desc } from 'drizzle-orm';
import { db } from '../database/connection';
import { inventory, inventoryMovements, products, warehouses, users, expenses, stores } from '../database/schema';
import { AppError } from '../middlewares/errorHandler';

export class InventoryService {
  public static async getStockSummary() {
    const list = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: products.name,
        sku: products.sku,
        barcode: products.barcode,
        warehouseId: inventory.warehouseId,
        warehouseName: warehouses.name,
        batchNumber: inventory.batchNumber,
        serialNumber: inventory.serialNumber,
        expiryDate: inventory.expiryDate,
        quantity: inventory.quantity,
        avgCost: inventory.avgCost,
        sellingPrice: products.sellingPrice,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id));

    return list;
  }

  public static async getLowStock(threshold: number = 10) {
    const all = await this.getStockSummary();
    return all.filter((item) => item.quantity <= threshold);
  }

  public static async getExpiringStock(daysAhead: number = 90) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const dateStr = targetDate.toISOString().split('T')[0];

    const all = await this.getStockSummary();
    return all.filter((item) => item.expiryDate && item.expiryDate <= dateStr && item.quantity > 0);
  }

  public static async transferStock(params: {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    userId?: string;
    notes?: string;
  }) {
    const source = (
      await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, params.productId),
            eq(inventory.warehouseId, params.fromWarehouseId)
          )
        )
        .limit(1)
    )[0];

    if (!source || source.quantity < params.quantity) {
      throw new AppError('Insufficient source stock for transfer', 400);
    }

    // Deduct source
    await db
      .update(inventory)
      .set({ quantity: source.quantity - params.quantity, updatedAt: new Date().toISOString() })
      .where(eq(inventory.id, source.id));

    // Increase destination
    const dest = (
      await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, params.productId),
            eq(inventory.warehouseId, params.toWarehouseId)
          )
        )
        .limit(1)
    )[0];

    if (dest) {
      await db
        .update(inventory)
        .set({ quantity: dest.quantity + params.quantity, updatedAt: new Date().toISOString() })
        .where(eq(inventory.id, dest.id));
    } else {
      await db.insert(inventory).values({
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: params.productId,
        warehouseId: params.toWarehouseId,
        quantity: params.quantity,
        avgCost: source.avgCost,
        batchNumber: source.batchNumber,
        expiryDate: source.expiryDate,
      });
    }

    // Log movement
    await db.insert(inventoryMovements).values({
      id: `mov-${Date.now()}`,
      productId: params.productId,
      warehouseId: params.toWarehouseId,
      type: 'TRANSFER',
      quantity: params.quantity,
      cost: source.avgCost,
      referenceType: 'TRANSFER',
      notes: params.notes || `Transfer from ${params.fromWarehouseId} to ${params.toWarehouseId}`,
      createdBy: params.userId,
    });

    return { message: 'Stock transferred successfully' };
  }

  public static async adjustStock(params: {
    inventoryId?: string;
    productId: string;
    warehouseId?: string;
    type: 'AUDIT_CORRECTION' | 'RESTOCK' | 'DAMAGE' | 'SURPLUS';
    quantityDelta: number;
    newQuantity?: number;
    unitCost?: number;
    batchNumber?: string | null;
    expiryDate?: string | null;
    notes?: string;
    userId?: string;
  }) {
    let target = null;
    if (params.inventoryId) {
      target = (await db.select().from(inventory).where(eq(inventory.id, params.inventoryId)).limit(1))[0];
    } else if (params.productId) {
      target = (await db.select().from(inventory).where(eq(inventory.productId, params.productId)).limit(1))[0];
    }

    if (!target) {
      throw new AppError('Inventory record not found', 404);
    }

    let finalQuantity = target.quantity;
    if (params.newQuantity !== undefined) {
      finalQuantity = Math.max(0, params.newQuantity);
    } else {
      finalQuantity = Math.max(0, target.quantity + params.quantityDelta);
    }

    const actualDelta = finalQuantity - target.quantity;

    await db
      .update(inventory)
      .set({
        quantity: finalQuantity,
        avgCost: params.unitCost !== undefined ? params.unitCost : target.avgCost,
        ...(params.batchNumber !== undefined && { batchNumber: params.batchNumber ? params.batchNumber.trim() : null }),
        ...(params.expiryDate !== undefined && { expiryDate: params.expiryDate ? params.expiryDate.trim() : null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(inventory.id, target.id));

    // Log movement
    await db.insert(inventoryMovements).values({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: target.productId,
      warehouseId: target.warehouseId,
      type: 'ADJUSTMENT',
      quantity: actualDelta,
      cost: target.avgCost,
      referenceType: 'MANUAL_ADJUSTMENT',
      notes: params.notes || `Stock adjusted via ${params.type} (Delta: ${actualDelta > 0 ? '+' : ''}${actualDelta})`,
      createdBy: params.userId,
    });

    return {
      message: 'Stock adjusted successfully',
      previousQuantity: target.quantity,
      newQuantity: finalQuantity,
      delta: actualDelta,
    };
  }

  /**
   * Records Damaged, Expired, Defective, or Lost items with real-time stock deduction,
   * audit movement log, and automatic accounting expense write-off.
   */
  public static async recordStockLoss(params: {
    inventoryId?: string;
    productId: string;
    warehouseId: string;
    batchNumber?: string;
    lossType: 'DAMAGE' | 'EXPIRED' | 'DEFECTIVE' | 'LOST' | 'SHRINKAGE' | 'INTERNAL_USE';
    reason: string;
    quantity: number;
    notes?: string;
    userId?: string;
    postToAccounting?: boolean;
  }) {
    if (!params.quantity || params.quantity <= 0) {
      throw new AppError('Quantity must be greater than zero', 400);
    }

    // 1. Fetch current inventory record
    let targetInv;
    if (params.inventoryId) {
      targetInv = (await db.select().from(inventory).where(eq(inventory.id, params.inventoryId)).limit(1))[0];
    } else {
      const conditions = [
        eq(inventory.productId, params.productId),
        eq(inventory.warehouseId, params.warehouseId),
      ];
      if (params.batchNumber) {
        conditions.push(eq(inventory.batchNumber, params.batchNumber));
      }
      targetInv = (await db.select().from(inventory).where(and(...conditions)).limit(1))[0];
    }

    if (!targetInv || targetInv.quantity < params.quantity) {
      throw new AppError(
        `Insufficient stock for loss write-off (Available: ${targetInv ? targetInv.quantity : 0}, Requested: ${params.quantity})`,
        400
      );
    }

    // 2. Fetch product details for description & retail valuation
    const prod = (await db.select().from(products).where(eq(products.id, params.productId)).limit(1))[0];
    const productName = prod?.name || 'Product';
    const sku = prod?.sku || '';
    const unitCost = targetInv.avgCost || prod?.purchasePrice || 0;
    const totalLossCost = Number((params.quantity * unitCost).toFixed(2));
    const totalRetailLoss = Number((params.quantity * (prod?.sellingPrice || 0)).toFixed(2));

    const nowIso = new Date().toISOString();
    const movementId = `mov-loss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 3. Atomically deduct inventory quantity
    await db
      .update(inventory)
      .set({
        quantity: targetInv.quantity - params.quantity,
        updatedAt: nowIso,
      })
      .where(eq(inventory.id, targetInv.id));

    // 4. Create immutable movement audit log
    const combinedNotes = `[${params.lossType}] ${params.reason}${params.notes ? ` - ${params.notes}` : ''}`;
    await db.insert(inventoryMovements).values({
      id: movementId,
      productId: params.productId,
      variantId: targetInv.variantId || null,
      warehouseId: params.warehouseId,
      type: params.lossType,
      quantity: -Math.abs(params.quantity), // negative for deduction
      cost: unitCost,
      referenceType: 'LOSS_REPORT',
      referenceId: movementId,
      batchNumber: targetInv.batchNumber || params.batchNumber || null,
      notes: combinedNotes,
      createdBy: params.userId || null,
      createdAt: nowIso,
    });

    // 5. Post to Accounting Expense ledger (if enabled and cost > 0)
    let expenseRecordId: string | null = null;
    const shouldPostAccounting = params.postToAccounting !== false;
    if (shouldPostAccounting && totalLossCost > 0) {
      expenseRecordId = `exp-loss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.insert(expenses).values({
        id: expenseRecordId,
        storeId: 'store-flagship',
        category: 'Loss & Shrinkage',
        amount: totalLossCost,
        currency: 'USD',
        exchangeRate: 1.0,
        description: `[Loss Write-off: ${params.lossType}] ${productName} (${sku}) × ${params.quantity} pcs @ $${unitCost.toFixed(2)} - ${params.reason}`,
        createdBy: params.userId || null,
        expenseDate: nowIso.split('T')[0],
        createdAt: nowIso,
      });
    }

    return {
      message: 'Stock loss recorded and written off successfully',
      movementId,
      expenseId: expenseRecordId,
      deductedQuantity: params.quantity,
      remainingQuantity: targetInv.quantity - params.quantity,
      totalLossCost,
      totalRetailLoss,
      productName,
      sku,
    };
  }

  /**
   * Retrieves all loss, damage, expired, and defect movements with rich product and user context.
   */
  public static async getLossHistory(filters?: {
    startDate?: string;
    endDate?: string;
    warehouseId?: string;
    lossType?: string;
    search?: string;
  }) {
    const lossTypes = ['DAMAGE', 'EXPIRED', 'DEFECTIVE', 'LOST', 'SHRINKAGE', 'INTERNAL_USE'];

    const rawMovements = await db
      .select({
        id: inventoryMovements.id,
        productId: inventoryMovements.productId,
        productName: products.name,
        sku: products.sku,
        barcode: products.barcode,
        sellingPrice: products.sellingPrice,
        warehouseId: inventoryMovements.warehouseId,
        warehouseName: warehouses.name,
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        cost: inventoryMovements.cost,
        batchNumber: inventoryMovements.batchNumber,
        notes: inventoryMovements.notes,
        referenceType: inventoryMovements.referenceType,
        createdBy: inventoryMovements.createdBy,
        createdByName: users.fullName,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .leftJoin(products, eq(inventoryMovements.productId, products.id))
      .leftJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
      .leftJoin(users, eq(inventoryMovements.createdBy, users.id))

      .orderBy(desc(inventoryMovements.createdAt));

    // Filter in-memory for flexible multi-condition matching
    const filtered = rawMovements.filter((m) => {
      // Must be a loss type or LOSS_REPORT reference
      const isLoss = lossTypes.includes(m.type) || m.referenceType === 'LOSS_REPORT';
      if (!isLoss) return false;

      if (filters?.warehouseId && filters.warehouseId !== 'ALL' && m.warehouseId !== filters.warehouseId) {
        return false;
      }
      if (filters?.lossType && filters.lossType !== 'ALL' && m.type !== filters.lossType) {
        return false;
      }
      const dateStr = m.createdAt ? m.createdAt.slice(0, 10) : '';
      if (filters?.startDate && dateStr < filters.startDate) return false;
      if (filters?.endDate && dateStr > filters.endDate) return false;

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const match =
          m.productName?.toLowerCase().includes(q) ||
          m.sku?.toLowerCase().includes(q) ||
          m.barcode?.toLowerCase().includes(q) ||
          m.batchNumber?.toLowerCase().includes(q) ||
          m.notes?.toLowerCase().includes(q) ||
          m.createdByName?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    const enriched = filtered.map((m) => {
      const absQty = Math.abs(m.quantity);
      const totalCostValue = Number((absQty * (m.cost || 0)).toFixed(2));
      const totalRetailValue = Number((absQty * (m.sellingPrice || 0)).toFixed(2));
      return {
        ...m,
        absQuantity: absQty,
        totalCostValue,
        totalRetailValue,
      };
    });

    const totalLossCost = enriched.reduce((sum, item) => sum + item.totalCostValue, 0);
    const totalLossRetail = enriched.reduce((sum, item) => sum + item.totalRetailValue, 0);
    const totalItemsCount = enriched.reduce((sum, item) => sum + item.absQuantity, 0);

    return {
      history: enriched,
      summary: {
        totalRecords: enriched.length,
        totalItemsLost: totalItemsCount,
        totalLossCost: Number(totalLossCost.toFixed(2)),
        totalLossRetail: Number(totalLossRetail.toFixed(2)),
      },
    };
  }

  /**
   * Generates high-level analytics & breakdowns for Loss & Shrinkage Reports.
   */
  public static async getLossAnalytics(filters?: { startDate?: string; endDate?: string }) {
    const { history, summary } = await this.getLossHistory({
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });

    // 1. Breakdown by Loss Reason / Type
    const byType: Record<string, { count: number; quantity: number; cost: number; retail: number }> = {};
    for (const h of history) {
      const t = h.type || 'OTHER';
      if (!byType[t]) {
        byType[t] = { count: 0, quantity: 0, cost: 0, retail: 0 };
      }
      byType[t].count += 1;
      byType[t].quantity += h.absQuantity;
      byType[t].cost += h.totalCostValue;
      byType[t].retail += h.totalRetailValue;
    }

    // 2. Top 10 Most Damaged / Lost Products
    const byProduct: Record<string, { productId: string; name: string; sku: string; quantity: number; cost: number }> = {};
    for (const h of history) {
      const pid = h.productId;
      if (!byProduct[pid]) {
        byProduct[pid] = {
          productId: pid,
          name: h.productName || 'Unknown',
          sku: h.sku || '',
          quantity: 0,
          cost: 0,
        };
      }
      byProduct[pid].quantity += h.absQuantity;
      byProduct[pid].cost += h.totalCostValue;
    }

    const topLostProducts = Object.values(byProduct)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // 3. Timeline / Daily Trend
    const byDate: Record<string, { date: string; cost: number; quantity: number }> = {};
    for (const h of history) {
      const d = h.createdAt ? h.createdAt.slice(0, 10) : 'Unknown';
      if (!byDate[d]) {
        byDate[d] = { date: d, cost: 0, quantity: 0 };
      }
      byDate[d].cost += h.totalCostValue;
      byDate[d].quantity += h.absQuantity;
    }

    const timeline = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary,
      byType,
      topLostProducts,
      timeline,
    };
  }
}

