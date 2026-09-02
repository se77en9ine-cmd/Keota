import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { sales, saleItems, products, customers } from '../database/schema';
import { eq, desc, ne, sql, and } from 'drizzle-orm';
import Decimal from 'decimal.js';

export class OnlineOrdersController {
  /**
   * GET /api/online-orders — List omnichannel online platform orders
   */
  public static async getOnlineOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const channelFilter = req.query.channel as string;
      const statusFilter = req.query.status as string;

      const orderList = await db
        .select({
          id: sales.id,
          invoiceNo: sales.invoiceNo,
          storeId: sales.storeId,
          customerId: sales.customerId,
          channel: sales.channel,
          orderType: sales.orderType,
          fulfillmentStatus: sales.fulfillmentStatus,
          externalOrderId: sales.externalOrderId,
          deliveryAddress: sales.deliveryAddress,
          deliveryContact: sales.deliveryContact,
          subtotal: sales.subtotal,
          discountAmount: sales.discountAmount,
          taxAmount: sales.taxAmount,
          totalAmount: sales.totalAmount,
          paidAmount: sales.paidAmount,
          paymentStatus: sales.paymentStatus,
          tableNo: sales.tableNo,
          courierName: sales.courierName,
          courierTrackingNo: sales.courierTrackingNo,
          deliveryFee: sales.deliveryFee,
          deliveryFeePayer: sales.deliveryFeePayer,
          deliveryFeeLoss: sales.deliveryFeeLoss,
          notes: sales.notes,
          createdAt: sales.createdAt,
          updatedAt: sales.updatedAt,
        })
        .from(sales)
        .orderBy(desc(sales.createdAt))
        .limit(100);

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        orderList.map(async (order) => {
          const items = await db
            .select()
            .from(saleItems)
            .where(eq(saleItems.saleId, order.id));

          let customerName = 'Guest Customer';
          if (order.customerId) {
            const cust = (
              await db
                .select()
                .from(customers)
                .where(eq(customers.id, order.customerId))
                .limit(1)
            )[0];
            if (cust) customerName = cust.name;
          }

          return {
            ...order,
            customerName,
            items,
          };
        })
      );

      // Filter in memory if query param provided
      const filtered = ordersWithItems.filter((o) => {
        const matchesChannel =
          !channelFilter || channelFilter === 'ALL' || o.channel === channelFilter;
        const matchesStatus =
          !statusFilter || statusFilter === 'ALL' || o.fulfillmentStatus === statusFilter;
        return matchesChannel && matchesStatus;
      });

      res.json({ success: true, orders: filtered });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/online-orders — Create a manual online platform order
   */
  public static async createOnlineOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        channel,
        externalOrderId,
        customerName,
        deliveryContact,
        deliveryAddress,
        notes,
        items,
        orderType = 'DELIVERY',
      } = req.body;

      const saleId = `sale-${Date.now()}`;
      const invoiceNo = `INV-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

      let subtotal = new Decimal(0);
      const itemsToInsert = [];

      for (const item of items || []) {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const lineTotal = new Decimal(unitPrice).times(qty);
        subtotal = subtotal.plus(lineTotal);

        itemsToInsert.push({
          id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          saleId,
          productId: item.productId || 'custom-item',
          name: item.name || 'Custom Product',
          sku: item.sku || null,
          quantity: qty,
          unitPrice,
          costPrice: Number(item.costPrice) || 0,
          discountRate: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          totalPrice: lineTotal.toNumber(),
        });
      }

      await db.insert(sales).values({
        id: saleId,
        invoiceNo,
        storeId: 'store-flagship',
        cashierId: (req as any).user?.id || 'user-admin',
        channel: channel || 'GRAB_FOOD',
        orderType,
        fulfillmentStatus: 'PENDING',
        externalOrderId: externalOrderId || `${channel.slice(0, 2)}-${Date.now().toString().slice(-6)}`,
        deliveryAddress: deliveryAddress || null,
        deliveryContact: `${customerName || 'Customer'} • ${deliveryContact || ''}`.trim(),
        status: 'COMPLETED',
        subtotal: subtotal.toNumber(),
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        totalAmount: subtotal.toNumber(),
        paidAmount: subtotal.toNumber(),
        changeAmount: 0,
        paymentStatus: 'PAID',
        notes: notes || null,
        syncStatus: 'SYNCED',
      });

      for (const it of itemsToInsert) {
        await db.insert(saleItems).values(it);
      }

      res.status(201).json({
        success: true,
        message: 'Online order created successfully',
        orderId: saleId,
        invoiceNo,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/online-orders/:id — Update online platform order details
   */
  public static async updateOnlineOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        channel,
        externalOrderId,
        deliveryContact,
        deliveryAddress,
        notes,
        fulfillmentStatus,
      } = req.body;

      await db
        .update(sales)
        .set({
          ...(channel ? { channel } : {}),
          ...(externalOrderId !== undefined ? { externalOrderId } : {}),
          ...(deliveryContact !== undefined ? { deliveryContact } : {}),
          ...(deliveryAddress !== undefined ? { deliveryAddress } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(sales.id, id));

      res.json({ success: true, message: 'Order updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/online-orders/:id — Cancel or delete an online order
   */
  public static async deleteOnlineOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Delete items
      await db.delete(saleItems).where(eq(saleItems.saleId, id));
      // Delete sale
      await db.delete(sales).where(eq(sales.id, id));

      res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/online-orders/:id/status — Advance fulfillment stage
   */
  public static async updateFulfillmentStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await db
        .update(sales)
        .set({
          fulfillmentStatus: status,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(sales.id, id));

      res.json({ success: true, message: `Order status updated to ${status}` });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/online-orders/simulate — Generate a simulated online order for testing
   */
  public static async simulateIncomingOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const channels = ['GRAB_FOOD', 'FOODPANDA', 'SHOPEE', 'TIKTOK_SHOP', 'WEB_STORE', 'WHATSAPP'];
      const randomChannel =
        req.body.channel || channels[Math.floor(Math.random() * channels.length)];

      const prefixes: Record<string, string> = {
        GRAB_FOOD: 'GF',
        FOODPANDA: 'FP',
        SHOPEE: 'SP',
        TIKTOK_SHOP: 'TT',
        WEB_STORE: 'WEB',
        WHATSAPP: 'WA',
      };

      const prefix = prefixes[randomChannel] || 'ORD';
      const externalOrderId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
      const saleId = `sale-${Date.now()}`;
      const invoiceNo = `INV-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Pick 1-3 random products from db
      const availableProds = await db.select().from(products).limit(10);
      const selected = availableProds.length > 0
        ? [availableProds[Math.floor(Math.random() * availableProds.length)]]
        : [];

      let subtotal = new Decimal(0);
      const itemsToInsert = [];

      for (const p of selected) {
        const qty = Math.floor(Math.random() * 2) + 1;
        const lineTotal = new Decimal(p.sellingPrice).times(qty);
        subtotal = subtotal.plus(lineTotal);

        itemsToInsert.push({
          id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          saleId,
          productId: p.id,
          name: p.name,
          sku: p.sku,
          quantity: qty,
          unitPrice: p.sellingPrice,
          costPrice: p.purchasePrice || 0,
          discountRate: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          totalPrice: lineTotal.toNumber(),
        });
      }

      if (itemsToInsert.length === 0) {
        subtotal = new Decimal(15.5);
      }

      const sampleNames = ['Ketsana Somxay', 'Alex Phommachanh', 'Dao Duangdy', 'Somsack Vongsa'];
      const randomCustomer = sampleNames[Math.floor(Math.random() * sampleNames.length)];

      // Insert Sale
      await db.insert(sales).values({
        id: saleId,
        invoiceNo,
        storeId: 'store-flagship',
        cashierId: 'user-admin',
        channel: randomChannel,
        orderType: 'DELIVERY',
        fulfillmentStatus: 'PENDING',
        externalOrderId,
        deliveryAddress: 'Unit 402, Sunset Boulevard, Vientiane',
        deliveryContact: `${randomCustomer} • +856 20 555 ${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'COMPLETED',
        subtotal: subtotal.toNumber(),
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        totalAmount: subtotal.toNumber(),
        paidAmount: subtotal.toNumber(),
        changeAmount: 0,
        paymentStatus: 'PAID',
        notes: `Simulated order from ${randomChannel}`,
        syncStatus: 'SYNCED',
      });

      // Insert Items
      for (const it of itemsToInsert) {
        await db.insert(saleItems).values(it);
      }

      res.status(201).json({
        success: true,
        message: `Incoming ${randomChannel} order ${externalOrderId} received!`,
        orderId: saleId,
        externalOrderId,
        channel: randomChannel,
      });
    } catch (err) {
      next(err);
    }
  }
}
