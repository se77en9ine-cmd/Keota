import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  module: text('module').notNull(),
  description: text('description'),
});

export const rolePermissions = sqliteTable('role_permissions', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull().references(() => roles.id),
  permissionId: text('permission_id').notNull().references(() => permissions.id),
});

export const stores = sqliteTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  taxId: text('tax_id'),
  currency: text('currency').notNull().default('USD'),
  receiptHeader: text('receipt_header'),
  receiptFooter: text('receipt_footer'),
  logoUrl: text('logo_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  pinCode: text('pin_code').notNull(), // 4-6 digit cashier PIN
  fullName: text('full_name').notNull(),
  avatarUrl: text('avatar_url'),
  roleId: text('role_id').notNull().references(() => roles.id),
  storeId: text('store_id').references(() => stores.id),
  language: text('language').notNull().default('en'),
  currency: text('currency').notNull().default('USD'),
  theme: text('theme').notNull().default('dark'),
  phone: text('phone'),
  address: text('address'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
