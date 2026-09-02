import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { warehouses } from './inventory';
import { products, productVariants } from './products';

// 1. Warehouse Zones & Production Places (CRUD)
export const warehouseZones = sqliteTable('warehouse_zones', {
  id: text('id').primaryKey(), // e.g. 'zone-prod-01'
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // e.g. 'ZN-PROD-01', 'ZN-RETAIL-01'
  name: text('name').notNull(), // 'Bakery Production Area', 'Minimark Floor Aisle'
  type: text('type').notNull().default('STORAGE'), // 'PRODUCTION', 'RETAIL_FLOOR', 'STORAGE', 'COLD_ROOM', 'RECEIVING', 'DISPATCH'
  temperatureZone: text('temperature_zone').default('AMBIENT'), // 'AMBIENT', 'CHILLED', 'FROZEN'
  isProductionPlace: integer('is_production_place', { mode: 'boolean' }).notNull().default(false),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// 2. Racks & Aisles (CRUD)
export const warehouseRacks = sqliteTable('warehouse_racks', {
  id: text('id').primaryKey(),
  zoneId: text('zone_id').notNull().references(() => warehouseZones.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // 'RACK-01', 'GONDOLA-A'
  name: text('name').notNull(), // 'Snack Display Gondola 1', 'Flour Prep Rack'
  barcode: text('barcode').unique(), // Scannable rack barcode e.g., 'LOC-RK-01'
  maxWeightCapacityKg: real('max_weight_capacity_kg').default(500),
  sortOrder: integer('sort_order').default(0), // For picking route sequence
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// 3. Shelves & Specific Minimark Bin Positions (CRUD)
export const warehouseShelves = sqliteTable('warehouse_shelves', {
  id: text('id').primaryKey(),
  rackId: text('rack_id').notNull().references(() => warehouseRacks.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // 'S01' (Shelf 1), 'BIN-A1'
  name: text('name').notNull(), // 'Top Shelf (Eye Level)'
  level: integer('level').default(1), // 1 = Bottom, 2 = Middle, 3 = Eye-level, 4 = Top
  fullLocationCode: text('full_location_code').notNull().unique(), // 'WH01-RETAIL-A02-S03'
  barcode: text('barcode').unique(), // 'LOC-WH01-R02-S03'
  maxItemCapacity: integer('max_item_capacity').default(50),
  isOccupied: integer('is_occupied', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// 4. Product-to-Location Assignment & On-Shelf Stock (CRUD)
export const stockLocationAssignments = sqliteTable('stock_location_assignments', {
  id: text('id').primaryKey(),
  shelfId: text('shelf_id').notNull().references(() => warehouseShelves.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => productVariants.id),
  batchNumber: text('batch_number'),
  quantity: real('quantity').notNull().default(0),
  minRestockThreshold: integer('min_restock_threshold').default(5), // Low stock trigger on shelf
  maxFacingCapacity: integer('max_facing_capacity').default(20),
  isPrimaryPickingLocation: integer('is_primary_picking', { mode: 'boolean' }).default(true),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
