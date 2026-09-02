import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';
import { resolveDbPath } from './dbConfigManager';

const DB_DIR = path.resolve(__dirname, '../../../database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _activeDbPath = resolveDbPath();
let _resolvedDir = path.dirname(_activeDbPath);
if (!fs.existsSync(_resolvedDir)) {
  fs.mkdirSync(_resolvedDir, { recursive: true });
}

let _rawSqlite = new Database(_activeDbPath);
_rawSqlite.pragma('journal_mode = WAL');
_rawSqlite.pragma('foreign_keys = ON');

let _rawDb = drizzle(_rawSqlite, { schema });

/**
 * Proxy wrapper for sqlite Database instance to allow hot-swapping
 * the underlying file connection without restarting the server process.
 */
export const sqlite: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const val = (_rawSqlite as any)[prop];
    return typeof val === 'function' ? val.bind(_rawSqlite) : val;
  },
  set(_target, prop, value) {
    (_rawSqlite as any)[prop] = value;
    return true;
  },
});

/**
 * Proxy wrapper for Drizzle ORM instance to allow hot-swapping
 * the underlying SQLite connection seamlessly with zero downtime.
 */
export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const val = (_rawDb as any)[prop];
    return typeof val === 'function' ? val.bind(_rawDb) : val;
  },
});

export function getActiveDbPath(): string {
  return _activeDbPath;
}

export const DB_PATH = _activeDbPath;

/**
 * Hot-reconnects the SQLite database to a new file location in < 5ms with zero downtime.
 */
export function hotReconnectDatabase(newPath: string): string {
  const targetPath = path.resolve(newPath);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    if (_rawSqlite && _rawSqlite.open) {
      _rawSqlite.close();
    }
  } catch (closeErr) {
    console.warn('[hotReconnectDatabase] Warning closing old database:', closeErr);
  }

  _activeDbPath = targetPath;
  _rawSqlite = new Database(targetPath);
  _rawSqlite.pragma('journal_mode = WAL');
  _rawSqlite.pragma('foreign_keys = ON');
  _rawDb = drizzle(_rawSqlite, { schema });

  // Ensure tables and migrations are initialized on the newly mounted database
  initDatabaseTables();

  console.log(`[hotReconnectDatabase] ⚡ Zero-downtime hot-reconnected to: ${targetPath}`);
  return targetPath;
}

export function initDatabaseTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id),
      permission_id TEXT NOT NULL REFERENCES permissions(id)
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      address TEXT,
      phone TEXT,
      email TEXT,
      tax_id TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      receipt_header TEXT,
      receipt_footer TEXT,
      logo_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      role_id TEXT NOT NULL REFERENCES roles(id),
      store_id TEXT REFERENCES stores(id),
      language TEXT NOT NULL DEFAULT 'en',
      currency TEXT NOT NULL DEFAULT 'USD',
      theme TEXT NOT NULL DEFAULT 'dark',
      phone TEXT,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      icon TEXT,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL UNIQUE,
      base_unit_id TEXT,
      conversion_rate REAL NOT NULL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_name TEXT,
      tax_id TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      credit_limit REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT NOT NULL UNIQUE,
      qr_code TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT REFERENCES categories(id),
      brand_id TEXT REFERENCES brands(id),
      unit_id TEXT REFERENCES units(id),
      supplier_id TEXT REFERENCES suppliers(id),
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      min_price REAL DEFAULT 0,
      max_discount REAL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      track_inventory INTEGER NOT NULL DEFAULT 1,
      has_variants INTEGER NOT NULL DEFAULT 0,
      stock_location TEXT,
      pos_mode TEXT NOT NULL DEFAULT 'ALL',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT,
      name TEXT NOT NULL,
      price_adjustment REAL NOT NULL DEFAULT 0,
      cost_adjustment REAL NOT NULL DEFAULT 0,
      attributes_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      store_id TEXT REFERENCES stores(id),
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      location TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      batch_number TEXT,
      serial_number TEXT,
      expiry_date TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      reserved_quantity REAL NOT NULL DEFAULT 0,
      avg_cost REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      reference_type TEXT,
      reference_id TEXT,
      batch_number TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      invoice_no TEXT NOT NULL UNIQUE,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
      status TEXT NOT NULL DEFAULT 'PENDING',
      total_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      payment_method TEXT,
      due_date TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      batch_number TEXT,
      expiry_date TEXT,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      member_code TEXT UNIQUE,
      points INTEGER NOT NULL DEFAULT 0,
      credit_limit REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'BRONZE',
      avatar_url TEXT,
      address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_no TEXT NOT NULL UNIQUE,
      store_id TEXT NOT NULL REFERENCES stores(id),
      customer_id TEXT REFERENCES customers(id),
      cashier_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      service_charge REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      change_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PAID',
      is_hold INTEGER NOT NULL DEFAULT 0,
      hold_reference TEXT,
      table_no TEXT,
      channel TEXT NOT NULL DEFAULT 'POS',
      order_type TEXT NOT NULL DEFAULT 'DINE_IN',
      fulfillment_status TEXT NOT NULL DEFAULT 'DELIVERED',
      external_order_id TEXT,
      delivery_address TEXT,
      delivery_contact TEXT,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'SYNCED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT REFERENCES product_variants(id),
      name TEXT NOT NULL,
      sku TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      discount_rate REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT REFERENCES sales(id),
      purchase_id TEXT REFERENCES purchases(id),
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      exchange_rate REAL NOT NULL DEFAULT 1.0,
      tendered_amount REAL NOT NULL,
      reference_no TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      exchange_rate REAL NOT NULL DEFAULT 1.0,
      description TEXT,
      receipt_image TEXT,
      created_by TEXT REFERENCES users(id),
      expense_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      exchange_rate REAL NOT NULL DEFAULT 1.0,
      description TEXT,
      created_by TEXT REFERENCES users(id),
      income_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_closings (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      opening_time TEXT NOT NULL,
      closing_time TEXT NOT NULL,
      opening_cash REAL NOT NULL DEFAULT 0,
      closing_cash_expected REAL NOT NULL DEFAULT 0,
      closing_cash_actual REAL NOT NULL DEFAULT 0,
      cash_difference REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      total_refunds REAL NOT NULL DEFAULT 0,
      total_expenses REAL NOT NULL DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'CLOSED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS currencies (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      is_base INTEGER NOT NULL DEFAULT 0,
      exchange_rate REAL NOT NULL DEFAULT 1.0,
      decimal_places INTEGER NOT NULL DEFAULT 2,
      symbol_position TEXT NOT NULL DEFAULT 'before',
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      effective_date TEXT NOT NULL,
      source TEXT DEFAULT 'MANUAL'
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      entity_id TEXT,
      old_values_json TEXT,
      new_values_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      is_read INTEGER NOT NULL DEFAULT 0,
      action_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      format TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_type TEXT NOT NULL DEFAULT 'LOCAL',
      storage_path TEXT NOT NULL,
      is_encrypted INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value_json TEXT NOT NULL,
      category TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dining_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      zone TEXT NOT NULL DEFAULT 'Main Dining',
      capacity INTEGER NOT NULL DEFAULT 4,
      shape TEXT NOT NULL DEFAULT 'SQUARE',
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      active_hold_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS online_platforms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL DEFAULT '📦',
      color TEXT NOT NULL DEFAULT 'emerald',
      commission_rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warehouse_zones (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'STORAGE',
      temperature_zone TEXT DEFAULT 'AMBIENT',
      is_production_place INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warehouse_racks (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      max_weight_capacity_kg REAL DEFAULT 500,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warehouse_shelves (
      id TEXT PRIMARY KEY,
      rack_id TEXT NOT NULL REFERENCES warehouse_racks(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      full_location_code TEXT NOT NULL UNIQUE,
      barcode TEXT UNIQUE,
      max_item_capacity INTEGER DEFAULT 50,
      is_occupied INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_location_assignments (
      id TEXT PRIMARY KEY,
      shelf_id TEXT NOT NULL REFERENCES warehouse_shelves(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_id TEXT REFERENCES product_variants(id),
      batch_number TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      min_restock_threshold INTEGER DEFAULT 5,
      max_facing_capacity INTEGER DEFAULT 20,
      is_primary_picking INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      normal_balance TEXT NOT NULL DEFAULT 'DEBIT',
      is_system TEXT NOT NULL DEFAULT '1',
      is_active TEXT NOT NULL DEFAULT '1',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_no TEXT NOT NULL UNIQUE,
      entry_date TEXT NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id TEXT,
      memo TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'POSTED',
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id TEXT PRIMARY KEY,
      journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounting_periods (
      id TEXT PRIMARY KEY,
      period_type TEXT NOT NULL,
      period_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      closing_journal_entry_id TEXT REFERENCES journal_entries(id),
      total_revenue REAL NOT NULL DEFAULT 0,
      total_expense REAL NOT NULL DEFAULT 0,
      net_income REAL NOT NULL DEFAULT 0,
      closed_by TEXT REFERENCES users(id),
      closed_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_period_balances (
      id TEXT PRIMARY KEY,
      period_id TEXT NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      beginning_balance REAL NOT NULL DEFAULT 0,
      period_debit REAL NOT NULL DEFAULT 0,
      period_credit REAL NOT NULL DEFAULT 0,
      ending_balance REAL NOT NULL DEFAULT 0,
      closing_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // ── Migrations (safe for existing databases) ──────────────────
  const safeAlter = (sql: string) => {
    try { sqlite.exec(sql); } catch { /* column already exists */ }
  };

  safeAlter(`ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0`);
  safeAlter(`ALTER TABLE customers ADD COLUMN avatar_url TEXT`);
  safeAlter(`ALTER TABLE customers ADD COLUMN surname TEXT`);
  safeAlter(`ALTER TABLE customers ADD COLUMN gender TEXT DEFAULT 'UNSPECIFIED'`);
  safeAlter(`ALTER TABLE customers ADD COLUMN currency TEXT DEFAULT 'USD'`);
  safeAlter(`ALTER TABLE customers ADD COLUMN manual_orders_count INTEGER DEFAULT 0`);
  safeAlter(`ALTER TABLE customers ADD COLUMN manual_total_spent REAL DEFAULT 0`);
  safeAlter(`ALTER TABLE customers ADD COLUMN is_blacklisted INTEGER DEFAULT 0`);
  safeAlter(`ALTER TABLE customers ADD COLUMN cod_rejection_count INTEGER DEFAULT 0`);
  safeAlter(`ALTER TABLE customers ADD COLUMN blacklist_reason TEXT`);
  safeAlter(`ALTER TABLE suppliers ADD COLUMN logo_url TEXT`);
  safeAlter(`ALTER TABLE suppliers ADD COLUMN tier TEXT DEFAULT 'STANDARD'`);
  safeAlter(`ALTER TABLE sales ADD COLUMN channel TEXT DEFAULT 'POS'`);
  safeAlter(`ALTER TABLE sales ADD COLUMN order_type TEXT DEFAULT 'DINE_IN'`);
  safeAlter(`ALTER TABLE sales ADD COLUMN fulfillment_status TEXT DEFAULT 'DELIVERED'`);
  safeAlter(`ALTER TABLE sales ADD COLUMN external_order_id TEXT`);
  safeAlter(`ALTER TABLE sales ADD COLUMN delivery_address TEXT`);
  safeAlter(`ALTER TABLE sales ADD COLUMN delivery_contact TEXT`);
  safeAlter(`ALTER TABLE sales ADD COLUMN is_cod INTEGER DEFAULT 0`);
  safeAlter(`ALTER TABLE sales ADD COLUMN pipeline_stage TEXT DEFAULT 'NEW'`);
  safeAlter(`ALTER TABLE sales ADD COLUMN bill_printed INTEGER DEFAULT 0`);
  safeAlter(`ALTER TABLE sales ADD COLUMN courier_name TEXT`);
  safeAlter(`ALTER TABLE sales ADD COLUMN courier_tracking_no TEXT`);
  safeAlter(`ALTER TABLE sales ADD COLUMN delivery_fee REAL DEFAULT 0`);
  safeAlter(`ALTER TABLE sales ADD COLUMN delivery_fee_payer TEXT DEFAULT 'CUSTOMER_PAYS'`);
  safeAlter(`ALTER TABLE sales ADD COLUMN rejection_reason TEXT`);
  safeAlter(`ALTER TABLE sales ADD COLUMN cod_collected_amount REAL DEFAULT 0`);
  safeAlter(`ALTER TABLE sales ADD COLUMN delivery_fee_loss REAL DEFAULT 0`);
  safeAlter(`ALTER TABLE products ADD COLUMN pos_mode TEXT DEFAULT 'ALL'`);
  safeAlter(`ALTER TABLE purchases ADD COLUMN shipping_amount REAL DEFAULT 0`);
  safeAlter(`ALTER TABLE purchase_items ADD COLUMN base_cost REAL`);
  safeAlter(`ALTER TABLE purchase_items ADD COLUMN freight_cost REAL DEFAULT 0`);

  // ── Correct historical sale_items line totals if tax was added to total_price ──
  try {
    sqlite.prepare(`
      UPDATE sale_items 
      SET total_price = (unit_price * quantity) - COALESCE(discount_amount, 0)
    `).run();
  } catch (_) {}

  // ── Seed Initial Online Platforms if Empty ────────────────────
  try {
    const platformCount = sqlite.prepare('SELECT count(*) as total FROM online_platforms').get() as { total: number };
    if (!platformCount || platformCount.total === 0) {
      const now = new Date().toISOString();
      const insertPlatform = sqlite.prepare(`
        INSERT INTO online_platforms (id, name, code, icon, color, commission_rate, is_active, sort_order, created_at, updated_at)
        VALUES (@id, @name, @code, @icon, @color, @commissionRate, @isActive, @sortOrder, @createdAt, @updatedAt)
      `);

      const defaultPlatforms = [
        { id: 'grab-food', name: 'GrabFood', code: 'GF', icon: '🟢', color: 'emerald', commissionRate: 25, isActive: 1, sortOrder: 1, createdAt: now, updatedAt: now },
        { id: 'foodpanda', name: 'Foodpanda', code: 'FP', icon: '🩷', color: 'pink', commissionRate: 25, isActive: 1, sortOrder: 2, createdAt: now, updatedAt: now },
        { id: 'shopee', name: 'Shopee', code: 'SP', icon: '🟠', color: 'orange', commissionRate: 5, isActive: 1, sortOrder: 3, createdAt: now, updatedAt: now },
        { id: 'tiktok-shop', name: 'TikTok Shop', code: 'TT', icon: '🎵', color: 'purple', commissionRate: 8, isActive: 1, sortOrder: 4, createdAt: now, updatedAt: now },
        { id: 'web-store', name: 'Official Web Store', code: 'WEB', icon: '🌐', color: 'cyan', commissionRate: 0, isActive: 1, sortOrder: 5, createdAt: now, updatedAt: now },
        { id: 'whatsapp', name: 'WhatsApp Order', code: 'WA', icon: '💬', color: 'teal', commissionRate: 0, isActive: 1, sortOrder: 6, createdAt: now, updatedAt: now },
        { id: 'lineman', name: 'Lineman', code: 'LM', icon: '🛵', color: 'emerald', commissionRate: 20, isActive: 1, sortOrder: 7, createdAt: now, updatedAt: now },
        { id: 'phone', name: 'Phone Order', code: 'PH', icon: '📞', color: 'indigo', commissionRate: 0, isActive: 1, sortOrder: 8, createdAt: now, updatedAt: now },
      ];

      for (const p of defaultPlatforms) {
        insertPlatform.run(p);
      }
    }
  } catch (err) {
    console.error('Error seeding online platforms:', err);
  }

  // ── Seed Initial Dining Tables if Empty ────────────────────────
  try {
    const count = sqlite.prepare('SELECT count(*) as total FROM dining_tables').get() as { total: number };
    if (!count || count.total === 0) {
      const now = new Date().toISOString();
      const insertStmt = sqlite.prepare(`
        INSERT INTO dining_tables (id, name, code, zone, capacity, shape, status, sort_order, created_at, updated_at)
        VALUES (@id, @name, @code, @zone, @capacity, @shape, @status, @sortOrder, @createdAt, @updatedAt)
      `);

      const initialTables = [
        { id: 'tbl-t01', name: 'Table T-01', code: 'T-01', zone: 'Main Dining', capacity: 2, shape: 'SQUARE', status: 'AVAILABLE', sortOrder: 1, createdAt: now, updatedAt: now },
        { id: 'tbl-t02', name: 'Table T-02', code: 'T-02', zone: 'Main Dining', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', sortOrder: 2, createdAt: now, updatedAt: now },
        { id: 'tbl-t03', name: 'Table T-03', code: 'T-03', zone: 'Main Dining', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE', sortOrder: 3, createdAt: now, updatedAt: now },
        { id: 'tbl-t04', name: 'Table T-04', code: 'T-04', zone: 'Main Dining', capacity: 6, shape: 'RECTANGLE', status: 'AVAILABLE', sortOrder: 4, createdAt: now, updatedAt: now },
        { id: 'tbl-out01', name: 'Terrace OT-01', code: 'OT-01', zone: 'Outdoor Terrace', capacity: 2, shape: 'ROUND', status: 'AVAILABLE', sortOrder: 5, createdAt: now, updatedAt: now },
        { id: 'tbl-out02', name: 'Terrace OT-02', code: 'OT-02', zone: 'Outdoor Terrace', capacity: 4, shape: 'ROUND', status: 'AVAILABLE', sortOrder: 6, createdAt: now, updatedAt: now },
        { id: 'tbl-vip01', name: 'VIP Suite 1', code: 'VIP-01', zone: 'VIP Lounge', capacity: 8, shape: 'RECTANGLE', status: 'AVAILABLE', sortOrder: 7, createdAt: now, updatedAt: now },
        { id: 'tbl-vip02', name: 'VIP Suite 2', code: 'VIP-02', zone: 'VIP Lounge', capacity: 10, shape: 'ROUND', status: 'AVAILABLE', sortOrder: 8, createdAt: now, updatedAt: now },
        { id: 'tbl-bar01', name: 'Bar Counter 1', code: 'BAR-01', zone: 'Bar Area', capacity: 1, shape: 'ROUND', status: 'AVAILABLE', sortOrder: 9, createdAt: now, updatedAt: now },
        { id: 'tbl-bar02', name: 'Bar Counter 2', code: 'BAR-02', zone: 'Bar Area', capacity: 1, shape: 'ROUND', status: 'AVAILABLE', sortOrder: 10, createdAt: now, updatedAt: now },
      ];

      for (const t of initialTables) {
        insertStmt.run(t);
      }
    }
  } catch (err) {
    console.error('Error seeding dining tables:', err);
  }
}

// Ensure tables exist on boot
initDatabaseTables();
