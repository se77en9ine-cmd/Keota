import { eq, sql } from 'drizzle-orm';
import { db } from '../database/connection';
import { purchases, purchaseItems, inventory, inventoryMovements, suppliers, warehouses, products } from '../database/schema';
import { AppError } from '../middlewares/errorHandler';

export class PurchaseService {
  public static async getPurchases() {
    const list = await db
      .select({
        id: purchases.id,
        invoiceNo: purchases.invoiceNo,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
        supplierCompany: suppliers.companyName,
        warehouseId: purchases.warehouseId,
        warehouseName: warehouses.name,
        status: purchases.status,
        totalAmount: purchases.totalAmount,
        paidAmount: purchases.paidAmount,
        paymentStatus: purchases.paymentStatus,
        dueDate: purchases.dueDate,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
        itemsCount: sql<number>`(SELECT count(*) FROM purchase_items WHERE purchase_items.purchase_id = ${purchases.id})`,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(purchases.warehouseId, warehouses.id))
      .orderBy(sql`${purchases.createdAt} DESC`);

    return list;
  }

  public static async getPurchaseDetails(purchaseId: string) {
    const poList = await db
      .select({
        id: purchases.id,
        invoiceNo: purchases.invoiceNo,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
        supplierEmail: suppliers.email,
        supplierCompany: suppliers.companyName,
        supplierAddress: suppliers.address,
        warehouseId: purchases.warehouseId,
        warehouseName: warehouses.name,
        warehouseLocation: warehouses.location,
        status: purchases.status,
        totalAmount: purchases.totalAmount,
        taxAmount: purchases.taxAmount,
        shippingAmount: purchases.shippingAmount,
        paidAmount: purchases.paidAmount,
        paymentStatus: purchases.paymentStatus,
        paymentMethod: purchases.paymentMethod,
        dueDate: purchases.dueDate,
        notes: purchases.notes,
        createdBy: purchases.createdBy,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(purchases.warehouseId, warehouses.id))
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (!poList.length) {
      throw new AppError('Purchase order not found', 404);
    }

    const po = poList[0];

    // Helper to extract freight from notes if shippingAmount is 0
    let shippingFee = Number(po.shippingAmount || 0);
    if (shippingFee === 0 && po.notes) {
      const match = po.notes.match(/\[Freight-In:\s*([^\]]+)\]/i);
      if (match) {
        const numStr = match[1].replace(/[^0-9.]/g, '');
        shippingFee = parseFloat(numStr) || 0;
      }
    }

    const items = await db
      .select({
        id: purchaseItems.id,
        purchaseId: purchaseItems.purchaseId,
        productId: purchaseItems.productId,
        productName: products.name,
        productSku: products.sku,
        productBarcode: products.barcode,
        productImage: products.imageUrl,
        batchNumber: purchaseItems.batchNumber,
        expiryDate: purchaseItems.expiryDate,
        quantity: purchaseItems.quantity,
        baseCost: purchaseItems.baseCost,
        freightCost: purchaseItems.freightCost,
        unitCost: purchaseItems.unitCost,
        totalCost: purchaseItems.totalCost,
      })
      .from(purchaseItems)
      .leftJoin(products, eq(purchaseItems.productId, products.id))
      .where(eq(purchaseItems.purchaseId, purchaseId));

    const enrichedItems = items.map((item) => {
      const bCost = item.baseCost !== null && item.baseCost !== undefined
        ? Number(item.baseCost)
        : Number(item.unitCost);
      const qty = Number(item.quantity);
      const lineTotal = bCost * qty;

      return {
        ...item,
        baseCost: bCost,
        freightCost: 0,
        unitCost: bCost,
        totalCost: lineTotal,
        baseTotalCost: lineTotal,
      };
    });

    const productsSubtotal = enrichedItems.reduce((sum, it) => sum + it.totalCost, 0);
    const computedTotal = productsSubtotal + shippingFee + Number(po.taxAmount || 0);

    return {
      purchase: {
        ...po,
        shippingAmount: shippingFee,
        productsSubtotal,
        totalAmount: Number(po.totalAmount) > 0 ? Number(po.totalAmount) : computedTotal,
      },
      items: enrichedItems,
    };
  }

  public static async createPurchaseOrder(data: {
    supplierId: string;
    warehouseId: string;
    status?: string; // 'ORDERED' | 'RECEIVED'
    paymentStatus?: string;
    paymentMethod?: string;
    dueDate?: string;
    shippingFee?: number;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      baseCost?: number;
      freightCost?: number;
      unitCost: number;
      batchNumber?: string;
      expiryDate?: string;
    }>;
    notes?: string;
    userId?: string;
  }) {
    const purchaseId = `po-${Date.now()}`;
    const invoiceNo = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const shippingAmount = Number(data.shippingFee || 0);
    let productsSubtotal = 0;
    for (const item of data.items) {
      const bCost = item.baseCost !== undefined ? Number(item.baseCost) : Number(item.unitCost);
      productsSubtotal += Number(item.quantity) * bCost;
    }
    const total = productsSubtotal + shippingAmount;

    const initialStatus = data.status || 'RECEIVED';

    await db.insert(purchases).values({
      id: purchaseId,
      invoiceNo,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId || 'wh-main',
      status: initialStatus,
      totalAmount: total,
      shippingAmount,
      paidAmount: initialStatus === 'RECEIVED' ? total : 0,
      paymentStatus: initialStatus === 'RECEIVED' ? 'PAID' : (data.paymentStatus || 'UNPAID'),
      paymentMethod: data.paymentMethod || 'CASH',
      dueDate: data.dueDate || null,
      notes: data.notes || '',
      createdBy: data.userId,
    });

    for (const item of data.items) {
      const bCost = item.baseCost !== undefined ? Number(item.baseCost) : Number(item.unitCost);
      await db.insert(purchaseItems).values({
        id: `pitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        purchaseId,
        productId: item.productId,
        variantId: item.variantId || null,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate || null,
        quantity: Number(item.quantity),
        baseCost: bCost,
        freightCost: 0,
        unitCost: bCost,
        totalCost: Number(item.quantity) * bCost,
      });

      // If status is RECEIVED, increase inventory right away
      if (initialStatus === 'RECEIVED') {
        const targetWarehouse = data.warehouseId || 'wh-main';
        const itemBatch = item.batchNumber?.trim() || null;
        const itemExpiry = item.expiryDate?.trim() || null;
        const itemVariant = item.variantId || null;

        const allInvForProduct = await db
          .select()
          .from(inventory)
          .where(eq(inventory.productId, item.productId));

        // Find exact lot matching warehouse, variant, batch number, and expiry date
        const existingLot = allInvForProduct.find((inv) => {
          const matchWh = inv.warehouseId === targetWarehouse;
          const matchVar = (inv.variantId || null) === itemVariant;
          const matchBatch = (inv.batchNumber || null) === itemBatch;
          const matchExp = (inv.expiryDate || null) === itemExpiry;
          return matchWh && matchVar && matchBatch && matchExp;
        });

        if (existingLot) {
          const totalQty = existingLot.quantity + Number(item.quantity);
          const weightedCost = totalQty > 0
            ? ((existingLot.quantity * existingLot.avgCost) + (Number(item.quantity) * bCost)) / totalQty
            : bCost;

          await db
            .update(inventory)
            .set({
              quantity: totalQty,
              avgCost: Number(weightedCost.toFixed(2)),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(inventory.id, existingLot.id));
        } else {
          await db.insert(inventory).values({
            id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: item.productId,
            variantId: itemVariant,
            warehouseId: targetWarehouse,
            quantity: Number(item.quantity),
            avgCost: bCost,
            batchNumber: itemBatch,
            expiryDate: itemExpiry,
          });
        }

        // Record movement
        await db.insert(inventoryMovements).values({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: item.productId,
          warehouseId: data.warehouseId || 'wh-main',
          type: 'IN',
          quantity: Number(item.quantity),
          cost: bCost,
          referenceType: 'PURCHASE',
          referenceId: purchaseId,
          notes: `PO Received: ${invoiceNo}`,
          createdBy: data.userId,
        });
      }
    }

    // Auto-post financial double-entry journal voucher if received
    if (initialStatus === 'RECEIVED' && total > 0) {
      try {
        const { LedgerService } = await import('./ledger.service');
        const isPaid = (data.paymentStatus || 'PAID') === 'PAID';
        const tenderAcc = (data.paymentMethod || 'CASH') === 'BANK_TRANSFER' ? '1020' : '1010';
        const creditAcc = isPaid ? tenderAcc : '2010';

        const lines = [
          { accountId: '1200', debit: productsSubtotal, credit: 0, description: `Inventory Asset Received (${invoiceNo})` },
        ];
        if (shippingAmount > 0) {
          lines.push({ accountId: '6040', debit: shippingAmount, credit: 0, description: `Inbound Transportation Fee (${invoiceNo})` });
        }
        lines.push({ accountId: creditAcc, debit: 0, credit: total, description: isPaid ? `Payment Outflow for PO (${invoiceNo})` : `Accounts Payable Liability (${invoiceNo})` });

        await LedgerService.postJournalEntry({
          referenceType: 'PURCHASE_ORDER',
          referenceId: purchaseId,
          memo: `PO Stock Received: ${invoiceNo} (${isPaid ? 'Paid' : 'Accounts Payable'})`,
          createdBy: data.userId,
          lines,
        });
      } catch (err) {
        console.warn('[createPurchaseOrder] Journal posting skipped or deferred:', err);
      }
    }

    return { purchaseId, invoiceNo, totalAmount: total, status: initialStatus };
  }

  public static async updatePurchaseOrder(purchaseId: string, data: {
    supplierId?: string;
    warehouseId?: string;
    dueDate?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    notes?: string;
  }) {
    const poList = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
    if (!poList.length) throw new AppError('Purchase order not found', 404);
    const po = poList[0];
    let paidAmountToSet = po.paidAmount;
    if (data.paymentStatus === 'PAID') {
      paidAmountToSet = po.totalAmount;
    } else if (data.paymentStatus === 'UNPAID') {
      paidAmountToSet = 0;
    }

    await db
      .update(purchases)
      .set({
        ...(data.supplierId && { supplierId: data.supplierId }),
        ...(data.warehouseId && { warehouseId: data.warehouseId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
        ...(data.paymentStatus && { paymentStatus: data.paymentStatus, paidAmount: paidAmountToSet }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchases.id, purchaseId));

    return { success: true, message: 'Purchase order updated successfully' };
  }

  public static async receivePurchaseOrder(purchaseId: string, userId?: string) {
    const poList = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
    if (!poList.length) throw new AppError('Purchase order not found', 404);
    const po = poList[0];

    if (po.status === 'RECEIVED') {
      throw new AppError('Purchase order is already received', 400);
    }

    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));

    for (const item of items) {
      const targetWarehouse = po.warehouseId || 'wh-main';
      const itemBatch = item.batchNumber?.trim() || null;
      const itemExpiry = item.expiryDate?.trim() || null;
      const itemVariant = item.variantId || null;

      const allInvForProduct = await db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, item.productId));

      const existingLot = allInvForProduct.find((inv) => {
        const matchWh = inv.warehouseId === targetWarehouse;
        const matchVar = (inv.variantId || null) === itemVariant;
        const matchBatch = (inv.batchNumber || null) === itemBatch;
        const matchExp = (inv.expiryDate || null) === itemExpiry;
        return matchWh && matchVar && matchBatch && matchExp;
      });

      const bCost = item.baseCost !== null && item.baseCost !== undefined ? Number(item.baseCost) : Number(item.unitCost);

      if (existingLot) {
        const totalQty = existingLot.quantity + Number(item.quantity);
        const weightedCost = totalQty > 0
          ? ((existingLot.quantity * existingLot.avgCost) + (Number(item.quantity) * bCost)) / totalQty
          : bCost;

        await db
          .update(inventory)
          .set({
            quantity: totalQty,
            avgCost: Number(weightedCost.toFixed(2)),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(inventory.id, existingLot.id));
      } else {
        await db.insert(inventory).values({
          id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: item.productId,
          variantId: itemVariant,
          warehouseId: targetWarehouse,
          quantity: Number(item.quantity),
          avgCost: bCost,
          batchNumber: itemBatch,
          expiryDate: itemExpiry,
        });
      }

      await db.insert(inventoryMovements).values({
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: item.productId,
        warehouseId: po.warehouseId || 'wh-main',
        type: 'IN',
        quantity: item.quantity,
        cost: bCost,
        referenceType: 'PURCHASE',
        referenceId: purchaseId,
        notes: `PO Received: ${po.invoiceNo}`,
        createdBy: userId,
      });
    }

    const shippingFee = Number(po.shippingAmount || 0);
    const productsSubtotal = items.reduce((sum, it) => {
      const bCost = it.baseCost !== null && it.baseCost !== undefined ? Number(it.baseCost) : Number(it.unitCost);
      return sum + (Number(it.quantity) * bCost);
    }, 0);
    const totalAmount = productsSubtotal + shippingFee;

    await db
      .update(purchases)
      .set({
        status: 'RECEIVED',
        totalAmount,
        paidAmount: totalAmount,
        paymentStatus: 'PAID',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchases.id, purchaseId));

    // Auto-post financial double-entry journal voucher for PO receiving
    try {
      const { LedgerService } = await import('./ledger.service');
      const tenderAcc = (po.paymentMethod || 'CASH') === 'BANK_TRANSFER' ? '1020' : '1010';

      const lines = [
        { accountId: '1200', debit: productsSubtotal, credit: 0, description: `Inventory Asset Received (${po.invoiceNo})` },
      ];
      if (shippingFee > 0) {
        lines.push({ accountId: '6040', debit: shippingFee, credit: 0, description: `Inbound Transportation Fee (${po.invoiceNo})` });
      }
      lines.push({ accountId: tenderAcc, debit: 0, credit: totalAmount, description: `Payment Outflow for PO (${po.invoiceNo})` });

      await LedgerService.postJournalEntry({
        referenceType: 'PURCHASE_ORDER',
        referenceId: purchaseId,
        memo: `PO Stock Received: ${po.invoiceNo} (Paid)`,
        createdBy: userId,
        lines,
      });
    } catch (err) {
      console.warn('[receivePurchaseOrder] Journal posting skipped or deferred:', err);
    }

    return { success: true, message: 'Stock received and added to inventory', purchaseId };
  }

  public static async cancelPurchaseOrder(purchaseId: string) {
    const poList = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
    if (!poList.length) throw new AppError('Purchase order not found', 404);
    if (poList[0].status === 'RECEIVED') {
      throw new AppError('Cannot cancel a received purchase order', 400);
    }

    await db
      .update(purchases)
      .set({
        status: 'CANCELLED',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchases.id, purchaseId));

    return { success: true, message: 'Purchase order cancelled' };
  }

  public static async deletePurchaseOrder(purchaseId: string, userId?: string) {
    const poList = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
    if (!poList.length) throw new AppError('Purchase order not found', 404);
    const po = poList[0];

    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));

    // If it was already received, reverse the added inventory stock
    if (po.status === 'RECEIVED') {
      for (const item of items) {
        const existingInv = (
          await db
            .select()
            .from(inventory)
            .where(eq(inventory.productId, item.productId))
            .limit(1)
        )[0];

        if (existingInv) {
          const newQty = Math.max(0, existingInv.quantity - item.quantity);
          await db
            .update(inventory)
            .set({
              quantity: newQty,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(inventory.id, existingInv.id));
        }

        // Record stock reversal movement
        await db.insert(inventoryMovements).values({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: item.productId,
          warehouseId: po.warehouseId || 'wh-main',
          type: 'OUT',
          quantity: item.quantity,
          cost: item.unitCost,
          referenceType: 'MANUAL',
          referenceId: purchaseId,
          notes: `PO Deleted/Reversed: ${po.invoiceNo}`,
          createdBy: userId,
        });
      }
    }

    // Cascade delete any journal vouchers posted for this PO
    try {
      const { journalEntries, journalLines } = await import('../database/schema');
      const { and } = await import('drizzle-orm');
      const entries = await db
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(and(eq(journalEntries.referenceType, 'PURCHASE_ORDER'), eq(journalEntries.referenceId, purchaseId)));

      for (const e of entries) {
        await db.delete(journalLines).where(eq(journalLines.journalEntryId, e.id));
        await db.delete(journalEntries).where(eq(journalEntries.id, e.id));
      }
    } catch (err) {
      console.warn('[deletePurchaseOrder] Journal cleanup warning:', err);
    }

    // Delete purchase items first
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    // Delete purchase record
    await db.delete(purchases).where(eq(purchases.id, purchaseId));

    return { success: true, message: 'Purchase order deleted successfully' };
  }
}
