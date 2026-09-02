import { eq, and, sql, desc, asc, inArray, gte, lte } from 'drizzle-orm';
import { db } from '../database/connection';
import { accounts, journalEntries, journalLines, users, expenses, income, sales, accountingPeriods, accountPeriodBalances } from '../database/schema';
import { AppError } from '../middlewares/errorHandler';
import Decimal from 'decimal.js';

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalInput {
  referenceType: 'POS_SALE' | 'PURCHASE_ORDER' | 'EXPENSE' | 'INCOME' | 'STOCK_LOSS' | 'MANUAL' | 'PERIOD_CLOSE';
  referenceId?: string;
  memo: string;
  createdBy?: string;
  entryDate?: string;
  lines: JournalLineInput[];
}

export const DEFAULT_ACCOUNTS = [
  // 1000 - ASSETS
  { id: '1010', code: '1010', name: 'Cash on Hand (Register Drawer)', type: 'ASSET', category: 'CURRENT_ASSET', normalBalance: 'DEBIT', description: 'Store cash drawer float and physical cash collections' },
  { id: '1020', code: '1020', name: 'Bank Account & Digital QR Settlements', type: 'ASSET', category: 'CURRENT_ASSET', normalBalance: 'DEBIT', description: 'Bank balances, OnePay, BCEL QR, and electronic tenders' },
  { id: '1200', code: '1200', name: 'Merchandise Inventory Asset', type: 'ASSET', category: 'INVENTORY', normalBalance: 'DEBIT', description: 'Current valuation of stock sitting in warehouses' },
  { id: '1300', code: '1300', name: 'Accounts Receivable (COD In-Transit)', type: 'ASSET', category: 'CURRENT_ASSET', normalBalance: 'DEBIT', description: 'Pending Cash on Delivery courier collections' },
  
  // 2000 - LIABILITIES
  { id: '2010', code: '2010', name: 'Accounts Payable (Supplier Invoices)', type: 'LIABILITY', category: 'CURRENT_LIABILITY', normalBalance: 'CREDIT', description: 'Outstanding payables to stock suppliers' },
  { id: '2100', code: '2100', name: 'Sales Tax & VAT Payable', type: 'LIABILITY', category: 'CURRENT_LIABILITY', normalBalance: 'CREDIT', description: 'Collected sales tax owed to government' },

  // 3000 - EQUITY
  { id: '3010', code: '3010', name: 'Owner Initial Capital', type: 'EQUITY', category: 'EQUITY', normalBalance: 'CREDIT', description: 'Initial seed capital invested into the business' },
  { id: '3020', code: '3020', name: 'Retained Earnings', type: 'EQUITY', category: 'EQUITY', normalBalance: 'CREDIT', description: 'Cumulative historical net operating profit' },

  // 4000 - REVENUE
  { id: '4010', code: '4010', name: 'POS In-Store Sales Revenue', type: 'REVENUE', category: 'OPERATING_REVENUE', normalBalance: 'CREDIT', description: 'Gross revenue from in-store counter & table orders' },
  { id: '4020', code: '4020', name: 'Online Platform Sales Revenue', type: 'REVENUE', category: 'OPERATING_REVENUE', normalBalance: 'CREDIT', description: 'Sales generated from GrabFood, Foodpanda, Shopee, WhatsApp' },
  { id: '4090', code: '4090', name: 'Miscellaneous Income', type: 'REVENUE', category: 'OPERATING_REVENUE', normalBalance: 'CREDIT', description: 'Service fees, interest, and other auxiliary income' },

  // 5000 - COST OF GOODS SOLD
  { id: '5010', code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', category: 'COGS', normalBalance: 'DEBIT', description: 'Direct acquisition cost of products sold to customers' },
  { id: '5020', code: '5020', name: 'Inventory Shrinkage, Spoilage & Loss', type: 'EXPENSE', category: 'COGS', normalBalance: 'DEBIT', description: 'Damaged, expired, or unaccounted stock write-offs' },

  // 6000 - OPERATING EXPENSES (OPEX)
  { id: '6010', code: '6010', name: 'Utilities & Electricity', type: 'EXPENSE', category: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', description: 'Power, water, internet, and telecom bills' },
  { id: '6020', code: '6020', name: 'Store Rent & Facility', type: 'EXPENSE', category: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', description: 'Physical store and warehouse lease charges' },
  { id: '6030', code: '6030', name: 'Staff Salaries & Wages', type: 'EXPENSE', category: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', description: 'Cashier, kitchen, and store employee payroll' },
  { id: '6040', code: '6040', name: 'Delivery Freight Loss (Refused COD)', type: 'EXPENSE', category: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', description: 'Delivery fees lost from rejected COD parcels' },
  { id: '6050', code: '6050', name: 'Repairs & Maintenance', type: 'EXPENSE', category: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', description: 'Equipment upkeep, hardware, and store refurbishment' },
  { id: '6090', code: '6090', name: 'General & Administrative Expenses', type: 'EXPENSE', category: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', description: 'Miscellaneous office and retail operating expenses' },
];

export class LedgerService {
  /**
   * Initializes the default Chart of Accounts if empty.
   */
  public static async seedDefaultChartOfAccounts() {
    const existing = await db.select().from(accounts).limit(1);
    if (existing.length === 0) {
      for (const acc of DEFAULT_ACCOUNTS) {
        await db.insert(accounts).values({
          ...acc,
          isSystem: '1',
          isActive: '1',
          createdAt: new Date().toISOString(),
        }).onConflictDoNothing();
      }
    }
  }

  /**
   * Retrieves all Chart of Accounts
   */
  public static async getChartOfAccounts() {
    await this.seedDefaultChartOfAccounts();
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, '1'))
      .orderBy(asc(accounts.code));
  }

  /**
   * Creates a custom account in Chart of Accounts
   */
  public static async createAccount(data: {
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    category: string;
    description?: string;
  }) {
    const existing = await db.select().from(accounts).where(eq(accounts.code, data.code)).limit(1);
    if (existing.length > 0) {
      throw new AppError(`Account code ${data.code} already exists`, 400);
    }

    let normalBalance: 'DEBIT' | 'CREDIT' = 'DEBIT';
    if (data.type === 'LIABILITY' || data.type === 'EQUITY' || data.type === 'REVENUE') {
      normalBalance = 'CREDIT';
    }

    const id = data.code;
    const newAcc = {
      id,
      code: data.code,
      name: data.name,
      type: data.type,
      category: data.category,
      description: data.description || '',
      normalBalance,
      isSystem: '0',
      isActive: '1',
      createdAt: new Date().toISOString(),
    };

    await db.insert(accounts).values(newAcc);
    return newAcc;
  }

  /**
   * Posts a validated Double-Entry Journal Entry.
   * Enforces that Sum(Debits) === Sum(Credits).
   */
  public static async postJournalEntry(input: PostJournalInput) {
    await this.seedDefaultChartOfAccounts();

    if (!input.lines || input.lines.length < 2) {
      throw new AppError('A valid journal entry must contain at least 2 line items', 400);
    }

    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const line of input.lines) {
      totalDebits = totalDebits.plus(Number(line.debit) || 0);
      totalCredits = totalCredits.plus(Number(line.credit) || 0);
    }

    // Check balance with 0.01 tolerance
    if (!totalDebits.equals(totalCredits)) {
      throw new AppError(
        `Journal entry is out of balance. Total Debits (${totalDebits.toNumber()}) must equal Total Credits (${totalCredits.toNumber()})`,
        400
      );
    }

    const entryId = `je-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const dateStr = input.entryDate || new Date().toISOString().split('T')[0];

    // Period Lock Check: Prevent posting or modifying transactions in a closed accounting period
    if (input.referenceType !== 'PERIOD_CLOSE') {
      const closedPeriods = await db
        .select()
        .from(accountingPeriods)
        .where(
          and(
            eq(accountingPeriods.status, 'CLOSED'),
            lte(accountingPeriods.startDate, dateStr),
            gte(accountingPeriods.endDate, dateStr)
          )
        )
        .limit(1);

      if (closedPeriods.length > 0) {
        throw new AppError(
          `Accounting Period is LOCKED/CLOSED: ${closedPeriods[0].periodName} (${closedPeriods[0].startDate} to ${closedPeriods[0].endDate}). Cannot post transactions to a closed period.`,
          403
        );
      }
    }

    const yearMonth = dateStr.replace(/-/g, '').slice(0, 6);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const entryNo = `JV-${yearMonth}-${randomSuffix}`;

    await db.insert(journalEntries).values({
      id: entryId,
      entryNo,
      entryDate: dateStr,
      referenceType: input.referenceType,
      referenceId: input.referenceId || null,
      memo: input.memo,
      totalAmount: totalDebits.toNumber(),
      status: 'POSTED',
      createdBy: input.createdBy || null,
      createdAt: new Date().toISOString(),
    });

    for (const line of input.lines) {
      const lineId = `jl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(journalLines).values({
        id: lineId,
        journalEntryId: entryId,
        accountId: line.accountId,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        description: line.description || input.memo,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      entryId,
      entryNo,
      totalAmount: totalDebits.toNumber(),
    };
  }

  /**
   * Retrieves journal entries with nested line items.
   */
  public static async getJournalEntries(filters: {
    startDate?: string;
    endDate?: string;
    referenceType?: string;
    search?: string;
    limit?: number;
  }) {
    await this.seedDefaultChartOfAccounts();
    const limit = filters.limit || 100;

    let query = db
      .select({
        id: journalEntries.id,
        entryNo: journalEntries.entryNo,
        entryDate: journalEntries.entryDate,
        referenceType: journalEntries.referenceType,
        referenceId: journalEntries.referenceId,
        memo: journalEntries.memo,
        totalAmount: journalEntries.totalAmount,
        status: journalEntries.status,
        createdByName: users.fullName,
        createdAt: journalEntries.createdAt,
      })
      .from(journalEntries)
      .leftJoin(users, eq(journalEntries.createdBy, users.id))
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
      .limit(limit);

    const entries = await query;

    if (entries.length === 0) return [];

    const entryIds = entries.map((e) => e.id);
    const lines = await db
      .select({
        id: journalLines.id,
        journalEntryId: journalLines.journalEntryId,
        accountId: journalLines.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        debit: journalLines.debit,
        credit: journalLines.credit,
        description: journalLines.description,
      })
      .from(journalLines)
      .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(inArray(journalLines.journalEntryId, entryIds));

    const linesByEntryId: Record<string, any[]> = {};
    lines.forEach((l) => {
      if (!linesByEntryId[l.journalEntryId]) linesByEntryId[l.journalEntryId] = [];
      linesByEntryId[l.journalEntryId].push(l);
    });

    return entries.map((e) => ({
      ...e,
      lines: linesByEntryId[e.id] || [],
    }));
  }

  /**
   * Deletes a journal voucher and all its associated line items.
   */
  public static async deleteJournalEntry(id: string) {
    await db.delete(journalLines).where(eq(journalLines.journalEntryId, id));
    await db.delete(journalEntries).where(eq(journalEntries.id, id));
    return { success: true, message: 'Journal entry and line items deleted successfully' };
  }

  /**
   * Identifies and purges any orphaned journal entries whose source records
   * (e.g. deleted expenses, deleted income, or deleted sales) no longer exist.
   */
  public static async purgeOrphanedJournals() {
    const allEntries = await db.select().from(journalEntries);
    const existingExpenses = new Set((await db.select({ id: expenses.id }).from(expenses)).map((e) => e.id));
    const existingIncome = new Set((await db.select({ id: income.id }).from(income)).map((i) => i.id));
    const existingSales = new Set((await db.select({ id: sales.id }).from(sales)).map((s) => s.id));

    const orphanedIds: string[] = [];
    for (const entry of allEntries) {
      if (entry.referenceType === 'EXPENSE' && entry.referenceId && !existingExpenses.has(entry.referenceId)) {
        orphanedIds.push(entry.id);
      } else if (entry.referenceType === 'INCOME' && entry.referenceId && !existingIncome.has(entry.referenceId)) {
        orphanedIds.push(entry.id);
      } else if (entry.referenceType === 'POS_SALE' && entry.referenceId && !existingSales.has(entry.referenceId)) {
        orphanedIds.push(entry.id);
      }
    }

    if (orphanedIds.length > 0) {
      await db.delete(journalLines).where(inArray(journalLines.journalEntryId, orphanedIds));
      await db.delete(journalEntries).where(inArray(journalEntries.id, orphanedIds));
    }

    return {
      success: true,
      purgedCount: orphanedIds.length,
      purgedEntryIds: orphanedIds,
      message: `Purged ${orphanedIds.length} orphaned journal entries from General Ledger`,
    };
  }

  /**
   * Retrieves General Ledger entries with running balance for a specific account or all accounts.
   */
  public static async getGeneralLedger(filters: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    await this.seedDefaultChartOfAccounts();

    const allAccs = await db.select().from(accounts).where(eq(accounts.isActive, '1')).orderBy(asc(accounts.code));
    
    // Fetch all journal lines with entry metadata
    const lines = await db
      .select({
        lineId: journalLines.id,
        journalEntryId: journalEntries.id,
        entryNo: journalEntries.entryNo,
        entryDate: journalEntries.entryDate,
        referenceType: journalEntries.referenceType,
        referenceId: journalEntries.referenceId,
        memo: journalEntries.memo,
        accountId: journalLines.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        normalBalance: accounts.normalBalance,
        debit: journalLines.debit,
        credit: journalLines.credit,
        lineDescription: journalLines.description,
        createdAt: journalEntries.createdAt,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
      .orderBy(asc(journalEntries.entryDate), asc(journalEntries.createdAt));

    // Group by account
    const ledgerMap: Record<string, {
      account: any;
      beginningBalance: number;
      periodDebit: number;
      periodCredit: number;
      totalDebit: number;
      totalCredit: number;
      netBalance: number; // Ending Balance
      transactions: any[];
    }> = {};

    allAccs.forEach((acc) => {
      ledgerMap[acc.id] = {
        account: acc,
        beginningBalance: 0,
        periodDebit: 0,
        periodCredit: 0,
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
        transactions: [],
      };
    });

    lines.forEach((l) => {
      if (!l.accountId || !ledgerMap[l.accountId]) return;

      const accData = ledgerMap[l.accountId];
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      const isDebitNormal = accData.account.normalBalance === 'DEBIT';

      // 1. Transactions before startDate => accumulate into Beginning Balance (ຍອດຍົກມາ)
      if (filters.startDate && l.entryDate && l.entryDate < filters.startDate) {
        if (isDebitNormal) {
          accData.beginningBalance += (debit - credit);
        } else {
          accData.beginningBalance += (credit - debit);
        }
        return;
      }

      // 2. Transactions after endDate => skip
      if (filters.endDate && l.entryDate && l.entryDate > filters.endDate) {
        return;
      }

      // 3. Transactions within active period
      accData.periodDebit += debit;
      accData.periodCredit += credit;
      accData.totalDebit += debit;
      accData.totalCredit += credit;

      // Running balance starts from beginningBalance and accumulates
      const prevBalance = accData.transactions.length > 0
        ? accData.transactions[accData.transactions.length - 1].runningBalance
        : accData.beginningBalance;

      const delta = isDebitNormal ? (debit - credit) : (credit - debit);
      const runningBalance = prevBalance + delta;

      accData.transactions.push({
        ...l,
        runningBalance,
      });
    });

    // Compute final Net Ending Balance and inject Beginning Balance row if filtered
    Object.values(ledgerMap).forEach((accData) => {
      const isDebitNormal = accData.account.normalBalance === 'DEBIT';
      const periodDelta = isDebitNormal
        ? (accData.periodDebit - accData.periodCredit)
        : (accData.periodCredit - accData.periodDebit);

      accData.netBalance = accData.beginningBalance + periodDelta;

      // If date filter is active and there is a beginning balance or prior history,
      // prepend a synthetic Beginning Balance row for visual clarity
      if (filters.startDate) {
        accData.transactions.unshift({
          lineId: `bb-${accData.account.id}`,
          journalEntryId: `bb-${accData.account.id}`,
          entryNo: 'CARRY-FORWARD',
          entryDate: filters.startDate,
          referenceType: 'BEGINNING_BALANCE',
          referenceId: null,
          memo: 'ຍອດຍົກມາ (Beginning Balance Carried Forward)',
          accountId: accData.account.id,
          accountCode: accData.account.code,
          accountName: accData.account.name,
          accountType: accData.account.type,
          normalBalance: accData.account.normalBalance,
          debit: isDebitNormal && accData.beginningBalance > 0 ? accData.beginningBalance : 0,
          credit: !isDebitNormal && accData.beginningBalance > 0 ? accData.beginningBalance : 0,
          lineDescription: 'Beginning balance carried forward from preceding periods',
          runningBalance: accData.beginningBalance,
          createdAt: filters.startDate,
          isBeginningBalance: true,
        });
      }
    });

    if (filters.accountId && filters.accountId !== 'ALL') {
      return ledgerMap[filters.accountId] ? [ledgerMap[filters.accountId]] : [];
    }

    return Object.values(ledgerMap).filter((item) => item.transactions.length > 0 || item.account.isSystem === '1');
  }

  /**
   * Computes the real-time Trial Balance verifying Total Debits == Total Credits.
   */
  public static async getTrialBalance() {
    await this.seedDefaultChartOfAccounts();
    const allAccs = await db.select().from(accounts).where(eq(accounts.isActive, '1')).orderBy(asc(accounts.code));

    const lines = await db
      .select({
        accountId: journalLines.accountId,
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines);

    const totalsByAcc: Record<string, { debit: number; credit: number }> = {};
    allAccs.forEach((a) => {
      totalsByAcc[a.id] = { debit: 0, credit: 0 };
    });

    lines.forEach((l) => {
      if (totalsByAcc[l.accountId]) {
        totalsByAcc[l.accountId].debit += Number(l.debit) || 0;
        totalsByAcc[l.accountId].credit += Number(l.credit) || 0;
      }
    });

    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    const rows = allAccs.map((acc) => {
      const totals = totalsByAcc[acc.id] || { debit: 0, credit: 0 };
      const netDebit = totals.debit > totals.credit ? totals.debit - totals.credit : 0;
      const netCredit = totals.credit > totals.debit ? totals.credit - totals.debit : 0;

      grandTotalDebit += netDebit;
      grandTotalCredit += netCredit;

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        category: acc.category,
        normalBalance: acc.normalBalance,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        netDebit,
        netCredit,
      };
    });

    const difference = Math.abs(grandTotalDebit - grandTotalCredit);
    const isBalanced = difference < 0.01;

    return {
      rows,
      grandTotalDebit,
      grandTotalCredit,
      difference,
      isBalanced,
    };
  }

  /**
   * Generates Balance Sheet: Assets = Liabilities + Equity
   */
  public static async getBalanceSheet() {
    const tb = await this.getTrialBalance();

    let currentAssets = 0;
    let inventoryAssets = 0;
    let totalAssets = 0;

    let currentLiabilities = 0;
    let totalLiabilities = 0;

    let ownerEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    const assetAccounts: any[] = [];
    const liabilityAccounts: any[] = [];
    const equityAccounts: any[] = [];

    tb.rows.forEach((row) => {
      if (row.type === 'ASSET') {
        const balance = row.netDebit;
        if (row.category === 'INVENTORY') inventoryAssets += balance;
        else currentAssets += balance;
        totalAssets += balance;
        assetAccounts.push({ ...row, balance });
      } else if (row.type === 'LIABILITY') {
        const balance = row.netCredit;
        currentLiabilities += balance;
        totalLiabilities += balance;
        liabilityAccounts.push({ ...row, balance });
      } else if (row.type === 'EQUITY') {
        const balance = row.netCredit;
        ownerEquity += balance;
        equityAccounts.push({ ...row, balance });
      } else if (row.type === 'REVENUE') {
        totalRevenue += row.netCredit;
      } else if (row.type === 'EXPENSE') {
        totalExpenses += row.netDebit;
      }
    });

    const netEarnings = totalRevenue - totalExpenses;
    const totalEquity = ownerEquity + netEarnings;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const balanceVariance = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = balanceVariance < 0.01;

    return {
      assets: {
        currentAssets,
        inventoryAssets,
        totalAssets,
        accounts: assetAccounts,
      },
      liabilities: {
        currentLiabilities,
        totalLiabilities,
        accounts: liabilityAccounts,
      },
      equity: {
        ownerEquity,
        netEarnings,
        totalEquity,
        accounts: equityAccounts,
      },
      totalLiabilitiesAndEquity,
      balanceVariance,
      isBalanced,
    };
  }

  /**
   * Generates a 6-column Extended Trial Balance showing:
   * - Beginning Balance (Debit & Credit)
   * - Period Movement (Debit & Credit)
   * - Ending Balance (Debit & Credit)
   */
  public static async getExtendedTrialBalance(filters: { startDate?: string; endDate?: string }) {
    await this.seedDefaultChartOfAccounts();
    const gl = await this.getGeneralLedger(filters);

    let totalBeginningDebit = 0;
    let totalBeginningCredit = 0;
    let totalPeriodDebit = 0;
    let totalPeriodCredit = 0;
    let totalEndingDebit = 0;
    let totalEndingCredit = 0;

    const rows = gl.map((item) => {
      const isDebit = item.account.normalBalance === 'DEBIT';
      const beg = item.beginningBalance || 0;
      const end = item.netBalance || 0;

      const begDebit = isDebit && beg > 0 ? beg : (!isDebit && beg < 0 ? Math.abs(beg) : 0);
      const begCredit = !isDebit && beg > 0 ? beg : (isDebit && beg < 0 ? Math.abs(beg) : 0);

      const endDebit = isDebit && end > 0 ? end : (!isDebit && end < 0 ? Math.abs(end) : 0);
      const endCredit = !isDebit && end > 0 ? end : (isDebit && end < 0 ? Math.abs(end) : 0);

      totalBeginningDebit += begDebit;
      totalBeginningCredit += begCredit;
      totalPeriodDebit += item.periodDebit;
      totalPeriodCredit += item.periodCredit;
      totalEndingDebit += endDebit;
      totalEndingCredit += endCredit;

      return {
        id: item.account.id,
        code: item.account.code,
        name: item.account.name,
        type: item.account.type,
        category: item.account.category,
        normalBalance: item.account.normalBalance,
        beginningDebit: begDebit,
        beginningCredit: begCredit,
        periodDebit: item.periodDebit,
        periodCredit: item.periodCredit,
        endingDebit: endDebit,
        endingCredit: endCredit,
      };
    });

    return {
      rows,
      totals: {
        totalBeginningDebit,
        totalBeginningCredit,
        totalPeriodDebit,
        totalPeriodCredit,
        totalEndingDebit,
        totalEndingCredit,
        isPeriodBalanced: Math.abs(totalPeriodDebit - totalPeriodCredit) < 0.01,
        isEndingBalanced: Math.abs(totalEndingDebit - totalEndingCredit) < 0.01,
      },
    };
  }

  /**
   * Retrieves list of accounting periods (closed or active).
   */
  public static async getAccountingPeriods() {
    return await db.select().from(accountingPeriods).orderBy(desc(accountingPeriods.endDate));
  }

  /**
   * Executes GAAP Period Closing.
   * - Clears Revenue (4000s) and Expense (5000s, 6000s) accounts to zero.
   * - Transfers Net Profit/Loss to 3020 Retained Earnings.
   * - Saves permanent period snapshots in account_period_balances.
   * - Locks the closed accounting period.
   */
  public static async closePeriod(input: {
    periodType: 'MONTH' | 'QUARTER' | 'YEAR';
    periodName: string;
    startDate: string;
    endDate: string;
    notes?: string;
    userId?: string;
  }) {
    await this.seedDefaultChartOfAccounts();

    // Check if period already closed
    const existing = await db
      .select()
      .from(accountingPeriods)
      .where(
        and(
          eq(accountingPeriods.startDate, input.startDate),
          eq(accountingPeriods.endDate, input.endDate),
          eq(accountingPeriods.status, 'CLOSED')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(`Accounting Period is already closed: ${existing[0].periodName}`, 400);
    }

    const allAccs = await db.select().from(accounts).where(eq(accounts.isActive, '1'));
    const gl = await this.getGeneralLedger({
      startDate: input.startDate,
      endDate: input.endDate,
    });

    let totalRevenue = new Decimal(0);
    let totalExpense = new Decimal(0);
    const closingLines: JournalLineInput[] = [];

    for (const item of gl) {
      const acc = item.account;
      const net = new Decimal(item.netBalance);

      if (acc.type === 'REVENUE' && !net.isZero()) {
        totalRevenue = totalRevenue.plus(net);
        if (net.greaterThan(0)) {
          closingLines.push({
            accountId: acc.id,
            debit: net.toNumber(),
            credit: 0,
            description: `Closing Entry: Clear ${acc.name}`,
          });
        } else {
          closingLines.push({
            accountId: acc.id,
            debit: 0,
            credit: net.abs().toNumber(),
            description: `Closing Entry: Clear ${acc.name}`,
          });
        }
      } else if (acc.type === 'EXPENSE' && !net.isZero()) {
        totalExpense = totalExpense.plus(net);
        if (net.greaterThan(0)) {
          closingLines.push({
            accountId: acc.id,
            debit: 0,
            credit: net.toNumber(),
            description: `Closing Entry: Clear ${acc.name}`,
          });
        } else {
          closingLines.push({
            accountId: acc.id,
            debit: net.abs().toNumber(),
            credit: 0,
            description: `Closing Entry: Clear ${acc.name}`,
          });
        }
      }
    }

    const netIncome = totalRevenue.minus(totalExpense);

    // Target: Account 3020 Retained Earnings (Equity)
    const retainedEarningsAcc =
      allAccs.find((a) => a.code === '3020' || a.name.includes('Retained') || a.name.includes('ກຳໄລສະສົມ')) ||
      allAccs.find((a) => a.type === 'EQUITY');

    if (!retainedEarningsAcc) {
      throw new AppError('Retained Earnings (3020) account not found in Chart of Accounts', 500);
    }

    if (!netIncome.isZero()) {
      if (netIncome.greaterThan(0)) {
        closingLines.push({
          accountId: retainedEarningsAcc.id,
          debit: 0,
          credit: netIncome.toNumber(),
          description: `Period Close: Net Profit transferred to Retained Earnings`,
        });
      } else {
        closingLines.push({
          accountId: retainedEarningsAcc.id,
          debit: netIncome.abs().toNumber(),
          credit: 0,
          description: `Period Close: Net Loss transferred to Retained Earnings`,
        });
      }
    }

    let closingJournalEntryId: string | null = null;
    if (closingLines.length >= 2) {
      const postRes = await this.postJournalEntry({
        referenceType: 'PERIOD_CLOSE',
        entryDate: input.endDate,
        memo: `Financial Statement Period Close: ${input.periodName}`,
        createdBy: input.userId,
        lines: closingLines,
      });
      closingJournalEntryId = postRes.entryId;
    }

    const periodId = `period-${input.periodType.toLowerCase()}-${input.endDate.replace(/-/g, '')}`;
    await db.insert(accountingPeriods).values({
      id: periodId,
      periodType: input.periodType,
      periodName: input.periodName,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'CLOSED',
      closingJournalEntryId,
      totalRevenue: totalRevenue.toNumber(),
      totalExpense: totalExpense.toNumber(),
      netIncome: netIncome.toNumber(),
      closedBy: input.userId || null,
      closedAt: new Date().toISOString(),
      notes: input.notes || null,
      createdAt: new Date().toISOString(),
    });

    // Save permanent account period balance snapshots
    for (const item of gl) {
      const isTemp = item.account.type === 'REVENUE' || item.account.type === 'EXPENSE';
      await db.insert(accountPeriodBalances).values({
        id: `pbal-${periodId}-${item.account.id}`,
        periodId,
        accountId: item.account.id,
        beginningBalance: item.beginningBalance,
        periodDebit: item.periodDebit,
        periodCredit: item.periodCredit,
        endingBalance: item.netBalance,
        closingBalance: isTemp ? 0 : item.netBalance,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      periodId,
      periodName: input.periodName,
      closingJournalEntryId,
      totalRevenue: totalRevenue.toNumber(),
      totalExpense: totalExpense.toNumber(),
      netIncome: netIncome.toNumber(),
      message: `Financial Statement period closed successfully. Net income of ${netIncome.toNumber()} transferred to Retained Earnings.`,
    };
  }

  /**
   * Reopens a closed accounting period and restores ledger state.
   */
  public static async reopenPeriod(periodId: string) {
    const period = await db.select().from(accountingPeriods).where(eq(accountingPeriods.id, periodId)).limit(1);
    if (!period.length) {
      throw new AppError('Accounting period not found', 404);
    }

    if (period[0].closingJournalEntryId) {
      await this.deleteJournalEntry(period[0].closingJournalEntryId);
    }

    await db.delete(accountPeriodBalances).where(eq(accountPeriodBalances.periodId, periodId));
    await db.delete(accountingPeriods).where(eq(accountingPeriods.id, periodId));

    return {
      success: true,
      message: `Accounting Period ${period[0].periodName} has been reopened successfully.`,
    };
  }

  /**
   * Computes multi-period summaries (Monthly, Quarterly, Yearly) for trend analysis.
   */
  public static async getPeriodSummaries(filters: {
    granularity: 'MONTH' | 'QUARTER' | 'YEAR';
    year?: number;
  }) {
    await this.seedDefaultChartOfAccounts();
    const currentYear = filters.year || new Date().getFullYear();

    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    const lines = await db
      .select({
        entryDate: journalEntries.entryDate,
        accountType: accounts.type,
        normalBalance: accounts.normalBalance,
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(gte(journalEntries.entryDate, startOfYear), lte(journalEntries.entryDate, endOfYear)));

    if (filters.granularity === 'MONTH') {
      const monthBuckets = Array.from({ length: 12 }, (_, i) => {
        const monthNum = (i + 1).toString().padStart(2, '0');
        return {
          periodKey: `${currentYear}-${monthNum}`,
          periodLabel: new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' }),
          monthIndex: i + 1,
          revenue: 0,
          expense: 0,
          netIncome: 0,
        };
      });

      lines.forEach((l) => {
        if (!l.entryDate) return;
        const m = parseInt(l.entryDate.split('-')[1], 10);
        if (m >= 1 && m <= 12) {
          const bucket = monthBuckets[m - 1];
          const debit = Number(l.debit) || 0;
          const credit = Number(l.credit) || 0;

          if (l.accountType === 'REVENUE') {
            bucket.revenue += (credit - debit);
          } else if (l.accountType === 'EXPENSE') {
            bucket.expense += (debit - credit);
          }
        }
      });

      monthBuckets.forEach((b) => {
        b.netIncome = b.revenue - b.expense;
      });

      return {
        year: currentYear,
        granularity: 'MONTH',
        periods: monthBuckets,
      };
    }

    if (filters.granularity === 'QUARTER') {
      const quarterBuckets = [
        { periodKey: `${currentYear}-Q1`, periodLabel: 'Q1 (Jan - Mar)', revenue: 0, expense: 0, netIncome: 0 },
        { periodKey: `${currentYear}-Q2`, periodLabel: 'Q2 (Apr - Jun)', revenue: 0, expense: 0, netIncome: 0 },
        { periodKey: `${currentYear}-Q3`, periodLabel: 'Q3 (Jul - Sep)', revenue: 0, expense: 0, netIncome: 0 },
        { periodKey: `${currentYear}-Q4`, periodLabel: 'Q4 (Oct - Dec)', revenue: 0, expense: 0, netIncome: 0 },
      ];

      lines.forEach((l) => {
        if (!l.entryDate) return;
        const m = parseInt(l.entryDate.split('-')[1], 10);
        const qIdx = Math.floor((m - 1) / 3);
        if (qIdx >= 0 && qIdx < 4) {
          const bucket = quarterBuckets[qIdx];
          const debit = Number(l.debit) || 0;
          const credit = Number(l.credit) || 0;

          if (l.accountType === 'REVENUE') {
            bucket.revenue += (credit - debit);
          } else if (l.accountType === 'EXPENSE') {
            bucket.expense += (debit - credit);
          }
        }
      });

      quarterBuckets.forEach((b) => {
        b.netIncome = b.revenue - b.expense;
      });

      return {
        year: currentYear,
        granularity: 'QUARTER',
        periods: quarterBuckets,
      };
    }

    // YEAR
    let totalRevenue = 0;
    let totalExpense = 0;
    lines.forEach((l) => {
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (l.accountType === 'REVENUE') totalRevenue += (credit - debit);
      else if (l.accountType === 'EXPENSE') totalExpense += (debit - credit);
    });

    return {
      year: currentYear,
      granularity: 'YEAR',
      periods: [
        {
          periodKey: `${currentYear}`,
          periodLabel: `FY ${currentYear}`,
          revenue: totalRevenue,
          expense: totalExpense,
          netIncome: totalRevenue - totalExpense,
        },
      ],
    };
  }
}
