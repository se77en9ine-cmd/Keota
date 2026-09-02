import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const onlinePlatforms = sqliteTable('online_platforms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // e.g. GF, FP, SP, TT, WA, LM
  icon: text('icon').notNull().default('📦'), // Emoji or icon code
  color: text('color').notNull().default('emerald'), // emerald, pink, orange, purple, cyan, teal, indigo
  commissionRate: real('commission_rate').notNull().default(0), // % platform commission fee
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type OnlinePlatform = typeof onlinePlatforms.$inferSelect;
export type NewOnlinePlatform = typeof onlinePlatforms.$inferInsert;
