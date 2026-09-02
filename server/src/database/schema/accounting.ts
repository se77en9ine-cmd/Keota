import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { stores, users } from './users';

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  category: text('category').notNull(), // Rent, Utilities, Salaries, Supplies, Maintenance, Other
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  exchangeRate: real('exchange_rate').notNull().default(1.0),
  description: text('description'),
  receiptImage: text('receipt_image'),
  createdBy: text('created_by').references(() => users.id),
  expenseDate: text('expense_date').notNull().$defaultFn(() => new Date().toISOString().split('T')[0]),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const income = sqliteTable('income', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  category: text('category').notNull(), // Investment, Interest, Service Fee, Other
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  exchangeRate: real('exchange_rate').notNull().default(1.0),
  description: text('description'),
  createdBy: text('created_by').references(() => users.id),
  incomeDate: text('income_date').notNull().$defaultFn(() => new Date().toISOString().split('T')[0]),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const dailyClosings = sqliteTable('daily_closings', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  userId: text('user_id').notNull().references(() => users.id),
  openingTime: text('opening_time').notNull(),
  closingTime: text('closing_time').notNull(),
  openingCash: real('opening_cash').notNull().default(0),
  closingCashExpected: real('closing_cash_expected').notNull().default(0),
  closingCashActual: real('closing_cash_actual').notNull().default(0),
  cashDifference: real('cash_difference').notNull().default(0),
  totalSales: real('total_sales').notNull().default(0),
  totalRefunds: real('total_refunds').notNull().default(0),
  totalExpenses: real('total_expenses').notNull().default(0),
  notes: text('notes'),
  status: text('status').notNull().default('CLOSED'), // OPEN, CLOSED
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// --- General Ledger & Chart of Accounts ---

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(), // e.g. '1010', '1200', '4010'
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  category: text('category').notNull(), // 'CURRENT_ASSET', 'INVENTORY', 'CURRENT_LIABILITY', 'EQUITY', 'OPERATING_REVENUE', 'COGS', 'OPERATING_EXPENSE'
  description: text('description'),
  normalBalance: text('normal_balance').notNull().default('DEBIT'), // 'DEBIT' | 'CREDIT'
  isSystem: text('is_system').notNull().default('1'), // '1' | '0'
  isActive: text('is_active').notNull().default('1'), // '1' | '0'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  entryNo: text('entry_no').notNull().unique(),
  entryDate: text('entry_date').notNull().$defaultFn(() => new Date().toISOString().split('T')[0]),
  referenceType: text('reference_type').notNull(), // 'POS_SALE' | 'PURCHASE_ORDER' | 'EXPENSE' | 'INCOME' | 'STOCK_LOSS' | 'MANUAL'
  referenceId: text('reference_id'),
  memo: text('memo').notNull(),
  totalAmount: real('total_amount').notNull().default(0),
  status: text('status').notNull().default('POSTED'), // 'POSTED' | 'DRAFT' | 'VOID'
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const journalLines = sqliteTable('journal_lines', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => accounts.id),
  debit: real('debit').notNull().default(0),
  credit: real('credit').notNull().default(0),
  description: text('description'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const accountingPeriods = sqliteTable('accounting_periods', {
  id: text('id').primaryKey(), // e.g. 'period-2026-08', 'period-2026-Q2', 'period-2026-Y'
  periodType: text('period_type').notNull(), // 'MONTH' | 'QUARTER' | 'YEAR'
  periodName: text('period_name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('OPEN'), // 'OPEN' | 'CLOSED'
  closingJournalEntryId: text('closing_journal_entry_id').references(() => journalEntries.id),
  totalRevenue: real('total_revenue').notNull().default(0),
  totalExpense: real('total_expense').notNull().default(0),
  netIncome: real('net_income').notNull().default(0),
  closedBy: text('closed_by').references(() => users.id),
  closedAt: text('closed_at'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const accountPeriodBalances = sqliteTable('account_period_balances', {
  id: text('id').primaryKey(),
  periodId: text('period_id').notNull().references(() => accountingPeriods.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => accounts.id),
  beginningBalance: real('beginning_balance').notNull().default(0),
  periodDebit: real('period_debit').notNull().default(0),
  periodCredit: real('period_credit').notNull().default(0),
  endingBalance: real('ending_balance').notNull().default(0),
  closingBalance: real('closing_balance').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});


