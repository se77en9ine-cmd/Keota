import { eq } from 'drizzle-orm';
import { db, initDatabaseTables } from '../connection';
import * as schema from '../schema';
import { getSeedData } from './seedData';

export async function seedDatabase() {
  console.log('🌱 Starting 39POS Enterprise database initialization...');

  initDatabaseTables();

  const data = await getSeedData();

  // 1. Roles (System)
  for (const role of data.roles) {
    await db.insert(schema.roles).values(role).onConflictDoNothing();
  }

  // 2. Permissions (System)
  for (const perm of data.permissions) {
    await db.insert(schema.permissions).values(perm).onConflictDoNothing();
  }

  // 3. Stores (System)
  for (const store of data.stores) {
    await db.insert(schema.stores).values(store).onConflictDoNothing();
  }

  // 4. Users (System)
  for (const user of data.users) {
    await db.insert(schema.users).values(user).onConflictDoNothing();
  }

  // 5. Currencies (System)
  for (const cur of data.currencies) {
    await db.insert(schema.currencies).values(cur).onConflictDoNothing();
  }

  // 6. Warehouses (System)
  for (const wh of data.warehouses) {
    await db.insert(schema.warehouses).values(wh).onConflictDoNothing();
  }

  // 7. Categories (System)
  for (const cat of data.categories) {
    await db.insert(schema.categories).values(cat).onConflictDoNothing();
  }

  // 8. Brands (System)
  for (const brand of data.brands) {
    await db.insert(schema.brands).values(brand).onConflictDoNothing();
  }

  // 9. Units (System)
  for (const unit of data.units) {
    await db.insert(schema.units).values(unit).onConflictDoNothing();
  }

  // 10. Suppliers (System)
  for (const sup of data.suppliers) {
    await db.insert(schema.suppliers).values(sup).onConflictDoNothing();
  }

  // 11. Settings (System)
  for (const set of data.settings) {
    await db.insert(schema.settings).values(set).onConflictDoNothing();
  }

  // Products
  for (const prod of data.products) {
    await db.insert(schema.products).values(prod).onConflictDoNothing();
  }

  // Product Variants
  for (const variant of data.productVariants) {
    await db.insert(schema.productVariants).values(variant).onConflictDoNothing();
  }

  // Inventory
  for (const inv of data.inventory) {
    await db.insert(schema.inventory).values(inv).onConflictDoNothing();
  }

  // Customers
  for (const cust of data.customers) {
    await db.insert(schema.customers).values(cust).onConflictDoNothing();
  }

  // Mark as initialized
  await db.insert(schema.settings).values({
    id: 'set-system-initialized',
    key: 'SYSTEM_INITIALIZED',
    valueJson: JSON.stringify({ initialized: true, timestamp: new Date().toISOString() }),
    category: 'GENERAL',
  }).onConflictDoNothing();

  console.log('✅ 39POS Enterprise Database Initialization Complete!');
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  });
}
