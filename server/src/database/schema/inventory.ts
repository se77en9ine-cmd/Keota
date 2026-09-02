import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { stores, users } from './users';
import { products, productVariants, suppliers } from './products';

export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey(),
  storeId: text('store_id').references(() => stores.id),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  location: text('location'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  batchNumber: text('batch_number'),
  serialNumber: text('serial_number'),
  expiryDate: text('expiry_date'), // YYYY-MM-DD
  quantity: real('quantity').notNull().default(0),
  reservedQuantity: real('reserved_quantity').notNull().default(0),
  avgCost: real('avg_cost').notNull().default(0),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const inventoryMovements = sqliteTable('inventory_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  type: text('type').notNull(), // IN, OUT, TRANSFER, ADJUSTMENT, DAMAGE, RETURN
  quantity: real('quantity').notNull(),
  cost: real('cost').notNull().default(0),
  referenceType: text('reference_type'), // SALE, PURCHASE, TRANSFER_ORDER, MANUAL
  referenceId: text('reference_id'),
  batchNumber: text('batch_number'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const purchases = sqliteTable('purchases', {
  id: text('id').primaryKey(),
  invoiceNo: text('invoice_no').notNull().unique(),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  status: text('status').notNull().default('PENDING'), // PENDING, RECEIVED, CANCELLED
  totalAmount: real('total_amount').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  shippingAmount: real('shipping_amount').default(0),
  paidAmount: real('paid_amount').notNull().default(0),
  paymentStatus: text('payment_status').notNull().default('UNPAID'), // PAID, PARTIAL, UNPAID
  paymentMethod: text('payment_method'),
  dueDate: text('due_date'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const purchaseItems = sqliteTable('purchase_items', {
  id: text('id').primaryKey(),
  purchaseId: text('purchase_id').notNull().references(() => purchases.id),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  batchNumber: text('batch_number'),
  expiryDate: text('expiry_date'),
  quantity: real('quantity').notNull(),
  baseCost: real('base_cost'),
  freightCost: real('freight_cost'),
  unitCost: real('unit_cost').notNull(),
  totalCost: real('total_cost').notNull(),
});
