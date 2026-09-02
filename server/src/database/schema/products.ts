import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  icon: text('icon'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  logoUrl: text('logo_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull().unique(),
  baseUnitId: text('base_unit_id'),
  conversionRate: real('conversion_rate').notNull().default(1.0),
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  companyName: text('company_name'),
  taxId: text('tax_id'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  logoUrl: text('logo_url'),
  tier: text('tier', { enum: ['STRATEGIC', 'PREFERRED', 'STANDARD', 'ONE_OFF'] }).notNull().default('STANDARD'),
  creditLimit: real('credit_limit').notNull().default(0),
  balance: real('balance').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode').notNull().unique(),
  qrCode: text('qr_code'),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: text('category_id').references(() => categories.id),
  brandId: text('brand_id').references(() => brands.id),
  unitId: text('unit_id').references(() => units.id),
  supplierId: text('supplier_id').references(() => suppliers.id),
  purchasePrice: real('purchase_price').notNull().default(0),
  sellingPrice: real('selling_price').notNull().default(0),
  wholesalePrice: real('wholesale_price').default(0),
  minPrice: real('min_price').default(0),
  maxDiscount: real('max_discount').default(0), // max discount percent
  taxRate: real('tax_rate').notNull().default(0), // e.g. 7.0 for 7% VAT
  imageUrl: text('image_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  trackInventory: integer('track_inventory', { mode: 'boolean' }).notNull().default(true),
  hasVariants: integer('has_variants', { mode: 'boolean' }).notNull().default(false),
  stockLocation: text('stock_location'),
  posMode: text('pos_mode').notNull().default('ALL'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  name: text('name').notNull(),
  priceAdjustment: real('price_adjustment').notNull().default(0),
  costAdjustment: real('cost_adjustment').notNull().default(0),
  attributesJson: text('attributes_json'), // JSON string of attributes { "Size": "L", "Color": "Blue" }
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
