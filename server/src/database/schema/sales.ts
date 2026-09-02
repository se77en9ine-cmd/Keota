import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { stores, users } from './users';
import { products, productVariants } from './products';
import { purchases } from './inventory';

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  surname: text('surname'),
  gender: text('gender').notNull().default('UNSPECIFIED'), // MALE, FEMALE, OTHER, UNSPECIFIED
  phone: text('phone'),
  email: text('email'),
  memberCode: text('member_code').unique(),
  points: integer('points').notNull().default(0),
  creditLimit: real('credit_limit').notNull().default(0),
  balance: real('balance').notNull().default(0), // outstanding debt/credit
  tier: text('tier').notNull().default('BRONZE'), // BRONZE, SILVER, GOLD, PLATINUM, VIP
  avatarUrl: text('avatar_url'),
  address: text('address'),
  currency: text('currency').notNull().default('USD'),
  manualOrdersCount: integer('manual_orders_count').notNull().default(0),
  manualTotalSpent: real('manual_total_spent').notNull().default(0),
  isBlacklisted: integer('is_blacklisted', { mode: 'boolean' }).notNull().default(false),
  codRejectionCount: integer('cod_rejection_count').notNull().default(0),
  blacklistReason: text('blacklist_reason'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  invoiceNo: text('invoice_no').notNull().unique(),
  storeId: text('store_id').notNull().references(() => stores.id),
  customerId: text('customer_id').references(() => customers.id),
  cashierId: text('cashier_id').notNull().references(() => users.id),
  status: text('status').notNull().default('COMPLETED'), // COMPLETED, REFUNDED, CANCELLED, HOLD
  subtotal: real('subtotal').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  serviceCharge: real('service_charge').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  paidAmount: real('paid_amount').notNull().default(0),
  changeAmount: real('change_amount').notNull().default(0),
  paymentStatus: text('payment_status').notNull().default('PAID'), // PAID, PARTIAL, UNPAID, PENDING_COD
  isHold: integer('is_hold', { mode: 'boolean' }).notNull().default(false),
  holdReference: text('hold_reference'),
  tableNo: text('table_no'),
  channel: text('channel').notNull().default('POS'), // POS, WEB_STORE, GRAB_FOOD, FOODPANDA, SHOPEE, TIKTOK_SHOP, WHATSAPP, PHONE
  orderType: text('order_type').notNull().default('DINE_IN'), // DINE_IN, TAKEAWAY, DELIVERY, PICKUP
  fulfillmentStatus: text('fulfillment_status').notNull().default('DELIVERED'), // PENDING, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REJECTED
  isCod: integer('is_cod', { mode: 'boolean' }).notNull().default(false),
  pipelineStage: text('pipeline_stage').notNull().default('NEW'), // NEW, PRINT_BILL, EXPRESS_ASSIGNED, OUT_FOR_DELIVERY, WAITING_PICKUP, COMPLETED, REJECTED
  billPrinted: integer('bill_printed', { mode: 'boolean' }).notNull().default(false),
  courierName: text('courier_name'), // Flash Express, J&T, Kerry, GrabExpress, etc.
  courierTrackingNo: text('courier_tracking_no'),
  deliveryFee: real('delivery_fee').default(0),
  deliveryFeePayer: text('delivery_fee_payer').default('CUSTOMER_PAYS'), // 'CUSTOMER_PAYS' | 'SELLER_PAYS'
  rejectionReason: text('rejection_reason'),
  codCollectedAmount: real('cod_collected_amount').default(0),
  deliveryFeeLoss: real('delivery_fee_loss').default(0),
  externalOrderId: text('external_order_id'), // Platform reference (e.g. GF-19284)
  deliveryAddress: text('delivery_address'),
  deliveryContact: text('delivery_contact'),
  notes: text('notes'),
  syncStatus: text('sync_status').notNull().default('SYNCED'), // SYNCED, PENDING_SYNC
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull().references(() => sales.id),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  name: text('name').notNull(),
  sku: text('sku'),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  costPrice: real('cost_price').notNull().default(0),
  discountRate: real('discount_rate').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  totalPrice: real('total_price').notNull(),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').references(() => sales.id),
  purchaseId: text('purchase_id').references(() => purchases.id),
  paymentMethod: text('payment_method').notNull(), // CASH, CARD, QR_PAYMENT, BANK_TRANSFER, STORE_CREDIT, GIFT_CARD, LOYALTY_POINTS
  amount: real('amount').notNull(), // amount in base currency
  currency: text('currency').notNull().default('USD'),
  exchangeRate: real('exchange_rate').notNull().default(1.0),
  tenderedAmount: real('tendered_amount').notNull(), // tendered in payment currency
  referenceNo: text('reference_no'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const diningTables = sqliteTable('dining_tables', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g. Table T-01
  code: text('code').notNull().unique(), // e.g. T-01
  zone: text('zone').notNull().default('Main Dining'), // Main Dining, Outdoor Terrace, VIP Lounge, Bar Area
  capacity: integer('capacity').notNull().default(4), // 2, 4, 6, 8 seats
  shape: text('shape').notNull().default('SQUARE'), // SQUARE, RECTANGLE, ROUND
  status: text('status').notNull().default('AVAILABLE'), // AVAILABLE, OCCUPIED, RESERVED, CLEANING
  activeHoldId: text('active_hold_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

