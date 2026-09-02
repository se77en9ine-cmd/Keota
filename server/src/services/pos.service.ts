import { eq, or, and, sql, not, inArray } from 'drizzle-orm';
import { db } from '../database/connection';
import { sales, saleItems, payments, inventory, inventoryMovements, customers, diningTables, expenses, users, settings } from '../database/schema';
import { AppError } from '../middlewares/errorHandler';
import { SaleOrderRequest, PaymentTenderDTO, CartItemDTO } from '39pos-shared';
import Decimal from 'decimal.js';

export class PosService {
  public static async checkout(req: SaleOrderRequest) {
    if (!req.items || req.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // Query active store tax configuration
    const taxSetting = (await db.select().from(settings).where(eq(settings.key, 'tax_config')).limit(1))[0];
    let taxConfig = { enableTax: true, taxRate: 7, calculationMode: 'EXCLUSIVE' };
    if (taxSetting) {
      try {
        taxConfig = JSON.parse(taxSetting.valueJson);
      } catch {}
    }

    const isTaxEnabled = Boolean(taxConfig.enableTax);
    const taxCalculationMode = taxConfig.calculationMode || 'EXCLUSIVE';

    const saleId = `sale-${Date.now()}`;
    const invoiceNo = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(req.discountAmount || 0);
    let totalTax = new Decimal(0);
    let totalCost = new Decimal(0);

    // Calculate subtotal, taxes, costs
    for (const item of req.items) {
      const lineSubtotal = new Decimal(item.unitPrice).times(item.quantity);
      const lineDiscount = item.discountRate > 0
        ? lineSubtotal.times(item.discountRate).dividedBy(100)
        : new Decimal(item.discountAmount || 0);

      const taxableAmount = lineSubtotal.minus(lineDiscount);
      
      let lineTax = new Decimal(0);
      if (isTaxEnabled) {
        const rate = item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : taxConfig.taxRate;
        if (rate > 0) {
          if (taxCalculationMode === 'INCLUSIVE') {
            // Price already includes tax: extract tax portion
            lineTax = taxableAmount.times(rate).dividedBy(100 + rate);
          } else {
            // Exclusive: tax added on top of subtotal
            lineTax = taxableAmount.times(rate).dividedBy(100);
          }
        }
      }

      subtotal = subtotal.plus(lineSubtotal);
      totalTax = totalTax.plus(lineTax);
      totalCost = totalCost.plus(new Decimal(item.costPrice || 0).times(item.quantity));
    }

    const serviceCharge = new Decimal(req.serviceCharge || 0);
    const grandTotal = taxCalculationMode === 'INCLUSIVE' || !isTaxEnabled
      ? subtotal.minus(totalDiscount).plus(serviceCharge)
      : subtotal.minus(totalDiscount).plus(totalTax).plus(serviceCharge);

    // Calculate total tendered in base currency
    let totalPaidInBase = new Decimal(0);
    if (req.payments && req.payments.length > 0) {
      for (const pay of req.payments) {
        const rate = pay.exchangeRate || 1;
        const paidInBase = new Decimal(pay.tenderedAmount).dividedBy(rate);
        totalPaidInBase = totalPaidInBase.plus(paidInBase);
      }
    }

    const changeAmount = totalPaidInBase.greaterThan(grandTotal)
      ? totalPaidInBase.minus(grandTotal)
      : new Decimal(0);

    const isCod = Boolean((req as any).isCod);
    const initialPipelineStage = isCod ? 'NEW' : ((req as any).pipelineStage || 'COMPLETED');
    const paymentStatus = req.isHold
      ? 'HOLD'
      : isCod
      ? 'PENDING_COD'
      : totalPaidInBase.greaterThanOrEqualTo(grandTotal.minus(0.001))
      ? 'PAID'
      : totalPaidInBase.isZero()
      ? 'UNPAID'
      : 'PARTIAL';

    const fulfillmentStatus = isCod
      ? 'PENDING'
      : ((req as any).fulfillmentStatus || (req.isHold ? 'PENDING' : 'DELIVERED'));

    // 1. Insert Sale record
    await db.insert(sales).values({
      id: saleId,
      invoiceNo,
      storeId: req.storeId || 'store-flagship',
      customerId: req.customerId || null,
      cashierId: req.cashierId,
      status: req.isHold ? 'HOLD' : 'COMPLETED',
      subtotal: subtotal.toNumber(),
      discountAmount: totalDiscount.toNumber(),
      taxAmount: totalTax.toNumber(),
      serviceCharge: serviceCharge.toNumber(),
      totalAmount: grandTotal.toNumber(),
      paidAmount: isCod ? 0 : totalPaidInBase.toNumber(),
      changeAmount: isCod ? 0 : changeAmount.toNumber(),
      paymentStatus,
      isHold: Boolean(req.isHold),
      holdReference: req.holdReference || null,
      tableNo: req.tableNo || null,
      channel: (req as any).channel && (req as any).channel !== 'POS'
        ? (req as any).channel
        : (req.tableNo || (req as any).orderType === 'DINE_IN' ? 'POS_RC' : ((req as any).channel === 'POS_RC' ? 'POS_RC' : 'POS_MR')),
      orderType: (req as any).orderType || (isCod ? 'DELIVERY' : req.tableNo ? 'DINE_IN' : 'TAKEAWAY'),
      fulfillmentStatus,
      isCod,
      pipelineStage: initialPipelineStage,
      billPrinted: Boolean((req as any).billPrinted),
      courierName: (req as any).courierName || null,
      courierTrackingNo: (req as any).courierTrackingNo || null,
      deliveryFee: (req as any).deliveryFee !== undefined ? Number((req as any).deliveryFee) : 0,
      deliveryFeePayer: (req as any).deliveryFeePayer || 'CUSTOMER_PAYS',
      deliveryFeeLoss: 0,
      externalOrderId: (req as any).externalOrderId || null,
      deliveryAddress: (req as any).deliveryAddress || null,
      deliveryContact: (req as any).deliveryContact || null,
      notes: req.notes || null,
      syncStatus: 'SYNCED',
    });

    // 2. Insert Sale Items and deduct inventory if not on hold
    for (const item of req.items) {
      const saleItemId = `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const lineSubtotal = new Decimal(item.unitPrice).times(item.quantity);
      const lineDiscount = item.discountRate > 0
        ? lineSubtotal.times(item.discountRate).dividedBy(100)
        : new Decimal(item.discountAmount || 0);
      const lineTax = item.taxRate > 0
        ? lineSubtotal.minus(lineDiscount).times(item.taxRate).dividedBy(100)
        : new Decimal(0);

      await db.insert(saleItems).values({
        id: saleItemId,
        saleId,
        productId: item.productId,
        variantId: item.variantId || null,
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice || 0,
        discountRate: item.discountRate || 0,
        discountAmount: lineDiscount.toNumber(),
        taxRate: item.taxRate || 0,
        taxAmount: lineTax.toNumber(),
        totalPrice: lineSubtotal.minus(lineDiscount).toNumber(),
      });

      if (!req.isHold) {
        // Multi-lot FEFO inventory deduction
        const productLots = await db
          .select()
          .from(inventory)
          .where(eq(inventory.productId, item.productId));

        // Filter matching variant if variantId is specified
        const matchingLots = productLots.filter((lot) =>
          item.variantId ? lot.variantId === item.variantId : true
        );

        // Sort FEFO: earliest expiry date first, lots without expiry date last
        matchingLots.sort((a, b) => {
          if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
          if (a.expiryDate && !b.expiryDate) return -1;
          if (!a.expiryDate && b.expiryDate) return 1;
          return a.id.localeCompare(b.id);
        });

        let remainingToDeduct = Number(item.quantity);

        for (const lot of matchingLots) {
          if (remainingToDeduct <= 0) break;
          if (lot.quantity <= 0) continue;

          const deductFromLot = Math.min(lot.quantity, remainingToDeduct);
          const newLotQty = lot.quantity - deductFromLot;
          remainingToDeduct -= deductFromLot;

          await db
            .update(inventory)
            .set({ quantity: newLotQty, updatedAt: new Date().toISOString() })
            .where(eq(inventory.id, lot.id));

          // Record inventory movement per lot
          await db.insert(inventoryMovements).values({
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: item.productId,
            variantId: item.variantId || null,
            warehouseId: lot.warehouseId || 'wh-main',
            type: 'OUT',
            quantity: deductFromLot,
            cost: lot.avgCost || item.costPrice || 0,
            referenceType: 'SALE',
            referenceId: saleId,
            notes: `POS Sale: ${invoiceNo} (Lot: ${lot.batchNumber || 'Standard'})`,
            createdBy: req.cashierId,
          });
        }

        // If all lots had 0 or insufficient stock, deduct remainder from the first lot to allow backorder tracking
        if (remainingToDeduct > 0 && matchingLots.length > 0) {
          const primaryLot = matchingLots[0];
          await db
            .update(inventory)
            .set({ quantity: primaryLot.quantity - remainingToDeduct, updatedAt: new Date().toISOString() })
            .where(eq(inventory.id, primaryLot.id));

          await db.insert(inventoryMovements).values({
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: item.productId,
            variantId: item.variantId || null,
            warehouseId: primaryLot.warehouseId || 'wh-main',
            type: 'OUT',
            quantity: remainingToDeduct,
            cost: primaryLot.avgCost || item.costPrice || 0,
            referenceType: 'SALE',
            referenceId: saleId,
            notes: `POS Sale: ${invoiceNo} (Backorder remaining)`,
            createdBy: req.cashierId,
          });
        }
      }
    }

    // 3. Insert Payment records
    if (!req.isHold && req.payments && req.payments.length > 0) {
      for (const pay of req.payments) {
        await db.insert(payments).values({
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          saleId,
          paymentMethod: pay.paymentMethod,
          amount: new Decimal(pay.tenderedAmount).dividedBy(pay.exchangeRate || 1).toNumber(),
          currency: pay.currency,
          exchangeRate: pay.exchangeRate || 1,
          tenderedAmount: pay.tenderedAmount,
          referenceNo: pay.referenceNo || null,
        });
      }
    }

    // 4. Update customer loyalty points (Redeem points deduction + Points earning)
    let pointsRedeemed = Number(req.redeemedPoints || 0);
    let pointsEarned = 0;
    let newCustomerPoints = 0;

    // Check if any payment tender used LOYALTY_POINTS (100 pts = $1.00 base USD)
    if (!req.isHold && req.payments && req.payments.length > 0) {
      for (const pay of req.payments) {
        if (pay.paymentMethod === 'LOYALTY_POINTS') {
          const pointsFromPayment = Math.round(Number(pay.tenderedAmount) * 100);
          pointsRedeemed += pointsFromPayment;
        }
      }
    }

    if (!req.isHold && req.customerId) {
      const cust = (await db.select().from(customers).where(eq(customers.id, req.customerId)).limit(1))[0];
      if (cust) {
        if (pointsRedeemed > cust.points) {
          throw new AppError(
            `Insufficient loyalty points. Customer has ${cust.points} pts, but ${pointsRedeemed} pts were requested for redemption.`,
            400
          );
        }

        // Earn 1 point per 10 USD spent on payable total
        pointsEarned = Math.floor(grandTotal.toNumber() / 10);
        newCustomerPoints = Math.max(0, cust.points - pointsRedeemed + pointsEarned);

        await db
          .update(customers)
          .set({
            points: newCustomerPoints,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(customers.id, cust.id));
      }
    }

    // 5. Update dining table occupancy status if tableNo was specified
    if (req.tableNo) {
      try {
        if (req.isHold) {
          // Mark table as OCCUPIED with active hold ticket ID
          await db
            .update(diningTables)
            .set({
              status: 'OCCUPIED',
              activeHoldId: saleId,
              updatedAt: new Date().toISOString(),
            })
            .where(
              or(
                eq(diningTables.code, req.tableNo),
                eq(diningTables.name, req.tableNo),
                eq(diningTables.id, req.tableNo)
              )
            );
        } else {
          // Free table back to AVAILABLE
          await db
            .update(diningTables)
            .set({
              status: 'AVAILABLE',
              activeHoldId: null,
              updatedAt: new Date().toISOString(),
            })
            .where(
              or(
                eq(diningTables.code, req.tableNo),
                eq(diningTables.name, req.tableNo),
                eq(diningTables.id, req.tableNo)
              )
            );
        }
      } catch (err) {
        console.error('Failed to sync dining table status:', err);
      }
    }

    // Auto-post double-entry journal entry for the completed sale
    if (!req.isHold) {
      try {
        const { LedgerService } = await import('./ledger.service');
        const revenueAcc = req.channel && req.channel !== 'POS' ? '4020' : '4010';
        const tenderAcc = (req as any).isCod ? '1300' : '1010';

        const lines: any[] = [
          { accountId: tenderAcc, debit: grandTotal.toNumber(), credit: 0, description: `Cash/Tender Inflow (${invoiceNo})` },
          { accountId: revenueAcc, debit: 0, credit: grandTotal.toNumber(), description: `Sales Revenue (${invoiceNo})` },
        ];

        if (totalCost.toNumber() > 0) {
          lines.push(
            { accountId: '5010', debit: totalCost.toNumber(), credit: 0, description: `COGS Landed Cost (${invoiceNo})` },
            { accountId: '1200', debit: 0, credit: totalCost.toNumber(), description: `Inventory Asset Reduction (${invoiceNo})` }
          );
        }

        await LedgerService.postJournalEntry({
          referenceType: 'POS_SALE',
          referenceId: saleId,
          memo: `Sale: ${invoiceNo} (${req.channel || 'POS'})`,
          createdBy: req.cashierId,
          lines,
        });
      } catch (err) {
        console.warn('[checkout] Journal posting skipped or deferred:', err);
      }
    }

    return {
      saleId,
      invoiceNo,
      subtotal: subtotal.toNumber(),
      discountAmount: totalDiscount.toNumber(),
      taxAmount: totalTax.toNumber(),
      serviceCharge: serviceCharge.toNumber(),
      totalAmount: grandTotal.toNumber(),
      paidAmount: totalPaidInBase.toNumber(),
      changeAmount: changeAmount.toNumber(),
      pointsEarned,
      pointsRedeemed,
      newCustomerPoints,
      status: req.isHold ? 'HOLD' : 'COMPLETED',
      items: req.items,
      createdAt: new Date().toISOString(),
    };
  }

  public static async getHolds() {
    return db.select().from(sales).where(eq(sales.status, 'HOLD'));
  }

  public static async resumeHold(saleId: string) {
    const sale = (await db.select().from(sales).where(eq(sales.id, saleId)).limit(1))[0];
    if (!sale) throw new AppError('Held order not found', 404);

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
    return { sale, items };
  }

  public static async cancelHold(saleId: string) {
    const sale = (await db.select().from(sales).where(eq(sales.id, saleId)).limit(1))[0];
    if (sale?.tableNo) {
      // Free table when hold is cancelled
      await db
        .update(diningTables)
        .set({
          status: 'AVAILABLE',
          activeHoldId: null,
          updatedAt: new Date().toISOString(),
        })
        .where(
          or(
            eq(diningTables.code, sale.tableNo),
            eq(diningTables.name, sale.tableNo),
            eq(diningTables.id, sale.tableNo)
          )
        );
    }

    await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
    await db.delete(sales).where(eq(sales.id, saleId));
    return { message: 'Hold cancelled' };
  }

  public static async getRecentSales(limit: number = 50) {
    const list = await db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        customerId: sales.customerId,
        customerName: customers.name,
        customerSurname: customers.surname,
        customerPhone: customers.phone,
        customerGender: customers.gender,
        customerTier: customers.tier,
        isBlacklisted: customers.isBlacklisted,
        codRejectionCount: customers.codRejectionCount,
        totalAmount: sales.totalAmount,
        paidAmount: sales.paidAmount,
        status: sales.status,
        paymentStatus: sales.paymentStatus,
        channel: sales.channel,
        orderType: sales.orderType,
        fulfillmentStatus: sales.fulfillmentStatus,
        isCod: sales.isCod,
        pipelineStage: sales.pipelineStage,
        billPrinted: sales.billPrinted,
        courierName: sales.courierName,
        courierTrackingNo: sales.courierTrackingNo,
        deliveryFee: sales.deliveryFee,
        deliveryFeePayer: sales.deliveryFeePayer,
        deliveryFeeLoss: sales.deliveryFeeLoss,
        rejectionReason: sales.rejectionReason,
        externalOrderId: sales.externalOrderId,
        deliveryAddress: sales.deliveryAddress,
        deliveryContact: sales.deliveryContact,
        tableNo: sales.tableNo,
        itemsSummary: sql<string>`COALESCE((SELECT GROUP_CONCAT(sale_items.name || ' x' || CAST(sale_items.quantity AS INT), ', ') FROM sale_items WHERE sale_items.sale_id = ${sales.id}), '')`.as('items_summary'),
        itemNames: sql<string>`COALESCE((SELECT GROUP_CONCAT(sale_items.name, ', ') FROM sale_items WHERE sale_items.sale_id = ${sales.id}), '')`.as('item_names'),
        itemsCount: sql<number>`COALESCE((SELECT SUM(sale_items.quantity) FROM sale_items WHERE sale_items.sale_id = ${sales.id}), 0)`.as('items_count'),
        totalCost: sql<number>`COALESCE((SELECT SUM(sale_items.cost_price * sale_items.quantity) FROM sale_items WHERE sale_items.sale_id = ${sales.id}), 0)`.as('total_cost'),
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.status, 'COMPLETED'))
      .orderBy(sql`${sales.createdAt} DESC`)
      .limit(limit);

    if (list.length > 0) {
      const saleIds = list.map((s) => s.id);
      const allItems = await db
        .select({
          id: saleItems.id,
          saleId: saleItems.saleId,
          productId: saleItems.productId,
          variantId: saleItems.variantId,
          name: saleItems.name,
          sku: saleItems.sku,
          quantity: saleItems.quantity,
          unitPrice: saleItems.unitPrice,
          costPrice: saleItems.costPrice,
          totalPrice: saleItems.totalPrice,
          discountAmount: saleItems.discountAmount,
        })
        .from(saleItems)
        .where(inArray(saleItems.saleId, saleIds));

      const itemsBySaleId: Record<string, any[]> = {};
      allItems.forEach((it) => {
        if (!itemsBySaleId[it.saleId]) itemsBySaleId[it.saleId] = [];
        itemsBySaleId[it.saleId].push(it);
      });

      return list.map((s) => ({
        ...s,
        items: itemsBySaleId[s.id] || [],
      }));
    }

    return list;
  }

  public static async getSaleDetails(saleId: string) {
    const saleList = await db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        storeId: sales.storeId,
        customerId: sales.customerId,
        customerName: customers.name,
        customerSurname: customers.surname,
        customerPhone: customers.phone,
        customerTier: customers.tier,
        customerPoints: customers.points,
        customerAddress: customers.address,
        cashierId: sales.cashierId,
        cashierName: users.fullName,
        subtotal: sales.subtotal,
        discountAmount: sales.discountAmount,
        taxAmount: sales.taxAmount,
        serviceCharge: sales.serviceCharge,
        totalAmount: sales.totalAmount,
        paidAmount: sales.paidAmount,
        changeAmount: sales.changeAmount,
        status: sales.status,
        paymentStatus: sales.paymentStatus,
        channel: sales.channel,
        orderType: sales.orderType,
        fulfillmentStatus: sales.fulfillmentStatus,
        isCod: sales.isCod,
        pipelineStage: sales.pipelineStage,
        billPrinted: sales.billPrinted,
        courierName: sales.courierName,
        courierTrackingNo: sales.courierTrackingNo,
        deliveryFee: sales.deliveryFee,
        deliveryFeePayer: sales.deliveryFeePayer,
        deliveryFeeLoss: sales.deliveryFeeLoss,
        rejectionReason: sales.rejectionReason,
        externalOrderId: sales.externalOrderId,
        deliveryAddress: sales.deliveryAddress,
        deliveryContact: sales.deliveryContact,
        tableNo: sales.tableNo,
        notes: sales.notes,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.cashierId, users.id))
      .where(eq(sales.id, saleId))
      .limit(1);

    const sale = saleList[0];
    if (!sale) throw new AppError('Sale transaction not found', 404);

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
    const salePayments = await db.select().from(payments).where(eq(payments.saleId, saleId));

    return { sale, items, payments: salePayments };
  }

  public static async getLiveOrders(channel?: string) {
    const query = db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        customerId: sales.customerId,
        customerName: customers.name,
        customerSurname: customers.surname,
        customerPhone: customers.phone,
        customerGender: customers.gender,
        customerTier: customers.tier,
        isBlacklisted: customers.isBlacklisted,
        codRejectionCount: customers.codRejectionCount,
        totalAmount: sales.totalAmount,
        paidAmount: sales.paidAmount,
        subtotal: sales.subtotal,
        discountAmount: sales.discountAmount,
        taxAmount: sales.taxAmount,
        status: sales.status,
        paymentStatus: sales.paymentStatus,
        channel: sales.channel,
        orderType: sales.orderType,
        fulfillmentStatus: sales.fulfillmentStatus,
        isCod: sales.isCod,
        pipelineStage: sales.pipelineStage,
        billPrinted: sales.billPrinted,
        courierName: sales.courierName,
        courierTrackingNo: sales.courierTrackingNo,
        deliveryFee: sales.deliveryFee,
        deliveryFeePayer: sales.deliveryFeePayer,
        deliveryFeeLoss: sales.deliveryFeeLoss,
        rejectionReason: sales.rejectionReason,
        externalOrderId: sales.externalOrderId,
        deliveryAddress: sales.deliveryAddress,
        deliveryContact: sales.deliveryContact,
        notes: sales.notes,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.isCod, true))
      .orderBy(sql`${sales.createdAt} DESC`);

    const orderList = await query;

    // Fetch line items for each order
    const result = [];
    for (const ord of orderList) {
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, ord.id));
      result.push({ ...ord, items });
    }

    return result;
  }

  public static async updateOrderPipeline(
    saleId: string,
    data: {
      stage?: string;
      billPrinted?: boolean;
      courierName?: string;
      courierTrackingNo?: string;
      deliveryFee?: number;
      deliveryFeePayer?: string;
      fulfillmentStatus?: string;
    }
  ) {
    const sale = (await db.select().from(sales).where(eq(sales.id, saleId)).limit(1))[0];
    if (!sale) throw new AppError('Order not found', 404);

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (data.stage !== undefined) updates.pipelineStage = data.stage;
    if (data.billPrinted !== undefined) updates.billPrinted = data.billPrinted;
    if (data.courierName !== undefined) updates.courierName = data.courierName;
    if (data.courierTrackingNo !== undefined) updates.courierTrackingNo = data.courierTrackingNo;
    if (data.deliveryFee !== undefined) updates.deliveryFee = data.deliveryFee;
    if (data.deliveryFeePayer !== undefined) updates.deliveryFeePayer = data.deliveryFeePayer;
    if (data.fulfillmentStatus !== undefined) updates.fulfillmentStatus = data.fulfillmentStatus;

    await db.update(sales).set(updates).where(eq(sales.id, saleId));
    return { success: true, message: 'Pipeline stage updated', updates };
  }

  public static async completeCodOrder(saleId: string) {
    const sale = (await db.select().from(sales).where(eq(sales.id, saleId)).limit(1))[0];
    if (!sale) throw new AppError('Order not found', 404);

    const now = new Date().toISOString();

    // 1. Mark as PAID and COMPLETED
    await db
      .update(sales)
      .set({
        paymentStatus: 'PAID',
        paidAmount: sale.totalAmount,
        codCollectedAmount: sale.totalAmount,
        fulfillmentStatus: 'DELIVERED',
        pipelineStage: 'COMPLETED',
        updatedAt: now,
      })
      .where(eq(sales.id, saleId));

    // 2. Insert Payment entry for COD
    await db.insert(payments).values({
      id: `pay-cod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      saleId,
      paymentMethod: 'COD',
      amount: sale.totalAmount,
      currency: 'USD',
      exchangeRate: 1,
      tenderedAmount: sale.totalAmount,
      referenceNo: sale.courierTrackingNo || `COD-${sale.invoiceNo}`,
    });

    // 3. Accrue loyalty points for customer
    if (sale.customerId) {
      const cust = (await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1))[0];
      if (cust) {
        const pointsEarned = Math.floor(sale.totalAmount / 10);
        await db
          .update(customers)
          .set({
            points: cust.points + pointsEarned,
            updatedAt: now,
          })
          .where(eq(customers.id, cust.id));
      }
    }

    return { success: true, message: 'COD Order completed and settled as PAID' };
  }

  public static async rejectCodOrder(saleId: string, data: { reason?: string; deliveryFeeLoss?: number }) {
    const sale = (await db.select().from(sales).where(eq(sales.id, saleId)).limit(1))[0];
    if (!sale) throw new AppError('Order not found', 404);

    const now = new Date().toISOString();
    const deliveryLoss = Number(data.deliveryFeeLoss || 0);

    // 1. Mark sale as REJECTED
    await db
      .update(sales)
      .set({
        fulfillmentStatus: 'CANCELLED',
        pipelineStage: 'REJECTED',
        paymentStatus: 'UNPAID',
        rejectionReason: data.reason || 'Customer refused / rejected delivery',
        deliveryFeeLoss: deliveryLoss,
        updatedAt: now,
      })
      .where(eq(sales.id, saleId));

    // 2. Auto-Restock items back into inventory
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
    for (const item of items) {
      const inv = (await db.select().from(inventory).where(eq(inventory.productId, item.productId)).limit(1))[0];
      if (inv) {
        await db
          .update(inventory)
          .set({
            quantity: inv.quantity + item.quantity,
            updatedAt: now,
          })
          .where(eq(inventory.id, inv.id));

        await db.insert(inventoryMovements).values({
          id: `mov-ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: item.productId,
          variantId: item.variantId || null,
          warehouseId: inv.warehouseId || 'wh-main',
          type: 'IN',
          quantity: item.quantity,
          cost: item.costPrice || 0,
          referenceType: 'SALE_RETURN',
          referenceId: saleId,
          notes: `COD Refusal Restock: ${sale.invoiceNo}`,
          createdBy: sale.cashierId || 'system',
        });
      }
    }

    // 3. Track customer COD rejection count and auto-blacklist if >= 2
    let isNowBlacklisted = false;
    if (sale.customerId) {
      const cust = (await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1))[0];
      if (cust) {
        const newCount = (cust.codRejectionCount || 0) + 1;
        const autoBlacklist = newCount >= 2;
        isNowBlacklisted = autoBlacklist || Boolean(cust.isBlacklisted);

        await db
          .update(customers)
          .set({
            codRejectionCount: newCount,
            isBlacklisted: isNowBlacklisted,
            blacklistReason: autoBlacklist
              ? `Auto-blacklisted: ${newCount} COD deliveries rejected`
              : cust.blacklistReason,
            updatedAt: now,
          })
          .where(eq(customers.id, cust.id));
      }
    }

    // 4. Record Courier Freight Loss Expense if provided
    if (deliveryLoss > 0) {
      await db.insert(expenses).values({
        id: `exp-cod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        storeId: sale.storeId || 'store-flagship',
        category: 'Supplies',
        amount: deliveryLoss,
        currency: 'USD',
        exchangeRate: 1,
        description: `COD Delivery Refusal Loss (${sale.courierName || 'Courier'}): ${sale.invoiceNo} - Reason: ${data.reason || 'Refused'}`,
        expenseDate: now.split('T')[0],
        createdAt: now,
      });
    }

    return {
      success: true,
      message: 'COD Order rejected, items restocked to inventory',
      isNowBlacklisted,
    };
  }

  public static async batchUpdatePipeline(
    orderIds: string[],
    stage: string,
    extraData: {
      courierName?: string;
      courierTrackingNoPrefix?: string;
      deliveryFee?: number;
      deliveryFeePayer?: string;
      billPrinted?: boolean;
    } = {}
  ) {
    if (!orderIds || orderIds.length === 0) {
      throw new AppError('No order IDs provided', 400);
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (let i = 0; i < orderIds.length; i++) {
      const id = orderIds[i];
      const updatePayload: any = {
        pipelineStage: stage,
        updatedAt: now,
      };

      if (extraData.billPrinted !== undefined) {
        updatePayload.billPrinted = extraData.billPrinted;
      }
      if (extraData.courierName) {
        updatePayload.courierName = extraData.courierName;
      }
      if (extraData.deliveryFee !== undefined) {
        updatePayload.deliveryFee = extraData.deliveryFee;
      }
      if (extraData.deliveryFeePayer) {
        updatePayload.deliveryFeePayer = extraData.deliveryFeePayer;
      }
      if (extraData.courierTrackingNoPrefix) {
        updatePayload.courierTrackingNo = `${extraData.courierTrackingNoPrefix}-${Date.now().toString().slice(-4)}${i + 1}`;
      }

      await db.update(sales).set(updatePayload).where(eq(sales.id, id));
      updatedCount++;
    }

    return {
      success: true,
      updatedCount,
      message: `Batch updated ${updatedCount} orders to ${stage}`,
    };
  }

  public static async batchCompleteCod(orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) {
      throw new AppError('No order IDs provided', 400);
    }

    let completedCount = 0;
    for (const id of orderIds) {
      try {
        await PosService.completeCodOrder(id);
        completedCount++;
      } catch {}
    }

    return {
      success: true,
      completedCount,
      message: `Batch settled and completed ${completedCount} COD orders`,
    };
  }

  public static async scanAdvanceOrder(barcodeOrInvoice: string, targetStage?: string) {
    const raw = barcodeOrInvoice.trim();
    if (!raw) throw new AppError('Barcode / Invoice input required', 400);

    // Search for order matching invoiceNo, externalOrderId, courierTrackingNo, or ID
    const matches = await db
      .select()
      .from(sales)
      .where(
        or(
          eq(sales.invoiceNo, raw),
          eq(sales.externalOrderId, raw),
          eq(sales.courierTrackingNo, raw),
          eq(sales.id, raw)
        )
      )
      .limit(1);

    const order = matches[0];
    if (!order) {
      throw new AppError(`No order found matching: "${raw}"`, 404);
    }

    // Determine next sequential pipeline stage if targetStage is not provided
    const STAGE_FLOW: Record<string, string> = {
      NEW: 'PRINT_BILL',
      PRINT_BILL: 'EXPRESS_ASSIGNED',
      EXPRESS_ASSIGNED: 'OUT_FOR_DELIVERY',
      OUT_FOR_DELIVERY: 'WAITING_PICKUP',
      WAITING_PICKUP: 'COMPLETED',
    };

    const nextStage = targetStage || STAGE_FLOW[order.pipelineStage || 'NEW'] || 'COMPLETED';

    if (nextStage === 'COMPLETED' && order.isCod) {
      await PosService.completeCodOrder(order.id);
    } else {
      await PosService.updateOrderPipeline(order.id, {
        stage: nextStage,
        billPrinted: nextStage === 'PRINT_BILL' ? true : order.billPrinted,
      });
    }

    return {
      success: true,
      orderId: order.id,
      invoiceNo: order.invoiceNo,
      previousStage: order.pipelineStage,
      newStage: nextStage,
      customerContact: order.deliveryContact,
      totalAmount: order.totalAmount,
      isCod: order.isCod,
      message: `Order ${order.invoiceNo} successfully advanced to ${nextStage}`,
    };
  }

  public static async toggleCustomerBlacklist(customerId: string, reason?: string) {
    const cust = (await db.select().from(customers).where(eq(customers.id, customerId)).limit(1))[0];
    if (!cust) throw new AppError('Customer not found', 404);

    const newStatus = !cust.isBlacklisted;
    await db
      .update(customers)
      .set({
        isBlacklisted: newStatus,
        blacklistReason: newStatus ? (reason || 'Manually blacklisted by manager') : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(customers.id, customerId));

    return {
      success: true,
      isBlacklisted: newStatus,
      message: newStatus ? 'Customer added to COD Blacklist' : 'Customer removed from COD Blacklist',
    };
  }
}
