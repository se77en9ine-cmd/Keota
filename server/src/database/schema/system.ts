import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const currencies = sqliteTable('currencies', {
  code: text('code').primaryKey(), // USD, LAK, THB, etc.
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  isBase: integer('is_base', { mode: 'boolean' }).notNull().default(false),
  exchangeRate: real('exchange_rate').notNull().default(1.0),
  decimalPlaces: integer('decimal_places').notNull().default(2),
  symbolPosition: text('symbol_position').notNull().default('before'), // before, after
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const exchangeRates = sqliteTable('exchange_rates', {
  id: text('id').primaryKey(),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: real('rate').notNull(),
  effectiveDate: text('effective_date').notNull().$defaultFn(() => new Date().toISOString()),
  source: text('source').default('MANUAL'), // MANUAL, API
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, BACKUP, RESTORE
  module: text('module').notNull(), // POS, PRODUCTS, INVENTORY, AUTH, SETTINGS
  entityId: text('entity_id'),
  oldValuesJson: text('old_values_json'),
  newValuesJson: text('new_values_json'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('INFO'), // INFO, WARNING, SUCCESS, ERROR
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  actionUrl: text('action_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  format: text('format').notNull(), // ZIP, JSON, SQL
  sizeBytes: integer('size_bytes').notNull(),
  storageType: text('storage_type').notNull().default('LOCAL'), // LOCAL, NAS, S3, DROPBOX, ONEDRIVE
  storagePath: text('storage_path').notNull(),
  isEncrypted: integer('is_encrypted', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull().default('COMPLETED'), // PENDING, COMPLETED, FAILED
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  valueJson: text('value_json').notNull(),
  category: text('category').notNull(), // GENERAL, PRINTER, POS, SECURITY, STORAGE, BACKUP
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
