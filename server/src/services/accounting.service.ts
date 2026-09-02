import { eq, and, sql } from 'drizzle-orm';
import { db } from '../database/connection';
import { expenses, income, dailyClosings, sales, journalEntries, journalLines } from '../database/schema';

export class AccountingService {
  public static async getExpenses() {
    return db.select().from(expenses).orderBy(sql`${expenses.createdAt} DESC`);
  }

  public static async addExpense(data: {
    storeId: string;
    category: string;
    amount: number;
    currency?: string;
    exchangeRate?: number;
    description?: string;
    receiptImage?: string;
    userId?: string;
    expenseDate?: string;
  }) {
    const id = `exp-${Date.now()}`;
    const dateStr = data.expenseDate || new Date().toISOString().split('T')[0];
    const createdAt = data.expenseDate
      ? new Date(`${data.expenseDate}T${new Date().toTimeString().split(' ')[0]}.000Z`).toISOString()
      : new Date().toISOString();

    await db.insert(expenses).values({
      id,
      storeId: data.storeId || 'store-flagship',
      category: data.category,
      amount: Number(data.amount),
      currency: data.currency || 'USD',
      exchangeRate: data.exchangeRate || 1.0,
      description: data.description || '',
      receiptImage: data.receiptImage || null,
      createdBy: data.userId,
      expenseDate: dateStr,
      createdAt,
    });

    // Auto-post double-entry journal voucher
    try {
      const { LedgerService } = await import('./ledger.service');
      let opexAccount = '6090'; // Default General OPEX
      const catUpper = (data.category || '').toUpperCase();
      if (catUpper.includes('UTIL') || catUpper.includes('ELECTRIC') || catUpper.includes('WATER') || catUpper.includes('POWER')) opexAccount = '6010';
      else if (catUpper.includes('RENT') || catUpper.includes('FACILITY') || catUpper.includes('LEASE')) opexAccount = '6020';
      else if (catUpper.includes('SALAR') || catUpper.includes('WAGE') || catUpper.includes('PAYROLL') || catUpper.includes('STAFF')) opexAccount = '6030';
      else if (catUpper.includes('FREIGHT') || catUpper.includes('DELIVERY') || catUpper.includes('SHIPPING')) opexAccount = '6040';
      else if (catUpper.includes('REPAIR') || catUpper.includes('MAINTAIN') || catUpper.includes('HARDWARE')) opexAccount = '6050';

      await LedgerService.postJournalEntry({
        referenceType: 'EXPENSE',
        referenceId: id,
        memo: `Expense: ${data.category} - ${data.description || 'Store Operating Cost'}`,
        createdBy: data.userId,
        entryDate: dateStr,
        lines: [
          { accountId: opexAccount, debit: Number(data.amount), credit: 0, description: data.description || data.category },
          { accountId: '1010', debit: 0, credit: Number(data.amount), description: 'Cash Outflow for Expense' },
        ],
      });
    } catch (err) {
      console.warn('[addExpense] Journal posting skipped or deferred:', err);
    }

    return { id, message: 'Expense recorded' };
  }

  public static async getIncome() {
    return db.select().from(income).orderBy(sql`${income.createdAt} DESC`);
  }

  public static async addIncome(data: {
    storeId: string;
    category: string;
    amount: number;
    currency?: string;
    exchangeRate?: number;
    description?: string;
    userId?: string;
    incomeDate?: string;
  }) {
    const id = `inc-${Date.now()}`;
    const dateStr = data.incomeDate || new Date().toISOString().split('T')[0];
    const createdAt = data.incomeDate
      ? new Date(`${data.incomeDate}T${new Date().toTimeString().split(' ')[0]}.000Z`).toISOString()
      : new Date().toISOString();

    await db.insert(income).values({
      id,
      storeId: data.storeId || 'store-flagship',
      category: data.category,
      amount: Number(data.amount),
      currency: data.currency || 'USD',
      exchangeRate: data.exchangeRate || 1.0,
      description: data.description || '',
      createdBy: data.userId,
      incomeDate: dateStr,
      createdAt,
    });

    // Auto-post double-entry journal voucher
    try {
      const { LedgerService } = await import('./ledger.service');
      await LedgerService.postJournalEntry({
        referenceType: 'INCOME',
        referenceId: id,
        memo: `Income: ${data.category} - ${data.description || 'Auxiliary Inflow'}`,
        createdBy: data.userId,
        entryDate: dateStr,
        lines: [
          { accountId: '1010', debit: Number(data.amount), credit: 0, description: 'Cash Inflow from Misc Income' },
          { accountId: '4090', debit: 0, credit: Number(data.amount), description: data.description || data.category },
        ],
      });
    } catch (err) {
      console.warn('[addIncome] Journal posting skipped or deferred:', err);
    }

    return { id, message: 'Income recorded' };
  }

  public static async deleteExpense(id: string) {
    // 1. Cascade delete corresponding journal voucher and line items
    try {
      const entries = await db
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(and(eq(journalEntries.referenceType, 'EXPENSE'), eq(journalEntries.referenceId, id)));

      for (const e of entries) {
        await db.delete(journalLines).where(eq(journalLines.journalEntryId, e.id));
        await db.delete(journalEntries).where(eq(journalEntries.id, e.id));
      }
    } catch (err) {
      console.warn('[deleteExpense] Journal cleanup warning:', err);
    }

    // 2. Delete expense record
    await db.delete(expenses).where(eq(expenses.id, id));
    return { success: true, message: 'Expense and corresponding ledger entries deleted' };
  }

  public static async deleteIncome(id: string) {
    // 1. Cascade delete corresponding journal voucher and line items
    try {
      const entries = await db
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(and(eq(journalEntries.referenceType, 'INCOME'), eq(journalEntries.referenceId, id)));

      for (const e of entries) {
        await db.delete(journalLines).where(eq(journalLines.journalEntryId, e.id));
        await db.delete(journalEntries).where(eq(journalEntries.id, e.id));
      }
    } catch (err) {
      console.warn('[deleteIncome] Journal cleanup warning:', err);
    }

    // 2. Delete income record
    await db.delete(income).where(eq(income.id, id));
    return { success: true, message: 'Income and corresponding ledger entries deleted' };
  }

  public static async getDailyClosings() {
    return db.select().from(dailyClosings).orderBy(sql`${dailyClosings.createdAt} DESC`);
  }

  public static async recordDailyClosing(data: {
    storeId: string;
    userId: string;
    openingTime: string;
    closingTime: string;
    openingCash: number;
    closingCashActual: number;
    notes?: string;
  }) {
    // Calculate total sales and expenses for shift
    const allSales = await db.select().from(sales).where(eq(sales.paymentStatus, 'PAID'));
    const totalSales = allSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    const allExp = await db.select().from(expenses);
    const totalExpenses = allExp.reduce((acc, e) => acc + (e.amount || 0), 0);

    const expectedCash = Number(data.openingCash || 0) + totalSales - totalExpenses;
    const diff = Number(data.closingCashActual || 0) - expectedCash;

    const id = `close-${Date.now()}`;
    await db.insert(dailyClosings).values({
      id,
      storeId: data.storeId || 'store-flagship',
      userId: data.userId,
      openingTime: data.openingTime,
      closingTime: data.closingTime || new Date().toISOString(),
      openingCash: Number(data.openingCash || 0),
      closingCashExpected: expectedCash,
      closingCashActual: Number(data.closingCashActual || 0),
      cashDifference: diff,
      totalSales,
      totalRefunds: 0,
      totalExpenses,
      notes: data.notes || '',
      status: 'CLOSED',
    });

    return { id, expectedCash, cashDifference: diff, totalSales, totalExpenses };
  }
}
