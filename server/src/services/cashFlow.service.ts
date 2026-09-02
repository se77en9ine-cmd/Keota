import { db } from '../database/connection';
import { sales, payments, purchases, expenses, income } from '../database/schema';
import { sql, gte, lte, and, ne } from 'drizzle-orm';

export interface CashFlowFilter {
  granularity?: 'day' | 'month' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
  currency?: string;
  poOutflowMode?: 'ACTUAL_PAID' | 'TOTAL_COMMITTED';
}

export class CashFlowService {
  /**
   * Generates auto-summarized Cash Flow data grouped by day, month, year, or all-time.
   */
  public static async getCashFlowSummary(filters: CashFlowFilter) {
    const { granularity = 'day', startDate, endDate, poOutflowMode = 'ACTUAL_PAID' } = filters;

    // 1. Fetch Inflows: Payments linked to completed sales
    const salesPayments = await db
      .select({
        date: sql<string>`substr(${payments.createdAt}, 1, 10)`,
        month: sql<string>`substr(${payments.createdAt}, 1, 7)`,
        year: sql<string>`substr(${payments.createdAt}, 1, 4)`,
        method: payments.paymentMethod,
        amount: sql<number>`sum(${payments.amount})`,
      })
      .from(payments)
      .where(
        and(
          startDate ? gte(sql`substr(${payments.createdAt}, 1, 10)`, startDate) : undefined,
          endDate ? lte(sql`substr(${payments.createdAt}, 1, 10)`, endDate) : undefined
        )
      )
      .groupBy(sql`1, 2, 3, ${payments.paymentMethod}`);

    // 2. Fetch Inflows: Other Auxiliary Incomes
    const otherIncomes = await db
      .select({
        date: income.incomeDate,
        month: sql<string>`substr(${income.incomeDate}, 1, 7)`,
        year: sql<string>`substr(${income.incomeDate}, 1, 4)`,
        category: income.category,
        amount: sql<number>`sum(${income.amount})`,
      })
      .from(income)
      .where(
        and(
          startDate ? gte(income.incomeDate, startDate) : undefined,
          endDate ? lte(income.incomeDate, endDate) : undefined
        )
      )
      .groupBy(sql`1, 2, 3, ${income.category}`);

    // 3. Fetch Outflows: Purchases (Stock Procurement - Paid vs Total Committed)
    const purchasesOutflows = await db
      .select({
        date: sql<string>`substr(${purchases.createdAt}, 1, 10)`,
        month: sql<string>`substr(${purchases.createdAt}, 1, 7)`,
        year: sql<string>`substr(${purchases.createdAt}, 1, 4)`,
        totalPaid: sql<number>`sum(${purchases.paidAmount})`,
        totalCommitted: sql<number>`sum(${purchases.totalAmount})`,
      })
      .from(purchases)
      .where(
        and(
          ne(purchases.status, 'CANCELLED'),
          startDate ? gte(sql`substr(${purchases.createdAt}, 1, 10)`, startDate) : undefined,
          endDate ? lte(sql`substr(${purchases.createdAt}, 1, 10)`, endDate) : undefined
        )
      )
      .groupBy(sql`1, 2, 3`);

    // 4. Fetch Outflows: Store Operating Expenses (OPEX)
    const expensesOutflows = await db
      .select({
        date: expenses.expenseDate,
        month: sql<string>`substr(${expenses.expenseDate}, 1, 7)`,
        year: sql<string>`substr(${expenses.expenseDate}, 1, 4)`,
        category: expenses.category,
        totalExpense: sql<number>`sum(${expenses.amount})`,
      })
      .from(expenses)
      .where(
        and(
          startDate ? gte(expenses.expenseDate, startDate) : undefined,
          endDate ? lte(expenses.expenseDate, endDate) : undefined
        )
      )
      .groupBy(sql`1, 2, 3, ${expenses.category}`);

    // Helper to get bucket key
    const getKey = (row: { date?: string; month?: string; year?: string }) => {
      if (granularity === 'year') return row.year || 'Unknown';
      if (granularity === 'month') return row.month || 'Unknown';
      if (granularity === 'all') return 'All Time';
      return row.date || 'Unknown';
    };

    const timeSeriesMap: Record<
      string,
      {
        period: string;
        inflow: number;
        outflow: number;
        net: number;
        inflowSales: number;
        inflowIncome: number;
        outflowPurchases: number;
        outflowPurchasesPaid: number;
        outflowPurchasesCommitted: number;
        outflowExpenses: number;
      }
    > = {};

    const paymentMethodMap: Record<string, number> = {};
    const expenseCategoryMap: Record<string, number> = {};
    const incomeCategoryMap: Record<string, number> = {};

    // Inflow from Sales Payments
    salesPayments.forEach((sp) => {
      const key = getKey(sp);
      if (!timeSeriesMap[key]) {
        timeSeriesMap[key] = {
          period: key,
          inflow: 0,
          outflow: 0,
          net: 0,
          inflowSales: 0,
          inflowIncome: 0,
          outflowPurchases: 0,
          outflowPurchasesPaid: 0,
          outflowPurchasesCommitted: 0,
          outflowExpenses: 0,
        };
      }
      const val = Number(sp.amount || 0);
      timeSeriesMap[key].inflow += val;
      timeSeriesMap[key].inflowSales += val;

      const method = sp.method || 'CASH';
      paymentMethodMap[method] = (paymentMethodMap[method] || 0) + val;
    });

    // Inflow from Other Incomes
    otherIncomes.forEach((inc) => {
      const key = getKey(inc);
      if (!timeSeriesMap[key]) {
        timeSeriesMap[key] = {
          period: key,
          inflow: 0,
          outflow: 0,
          net: 0,
          inflowSales: 0,
          inflowIncome: 0,
          outflowPurchases: 0,
          outflowPurchasesPaid: 0,
          outflowPurchasesCommitted: 0,
          outflowExpenses: 0,
        };
      }
      const val = Number(inc.amount || 0);
      timeSeriesMap[key].inflow += val;
      timeSeriesMap[key].inflowIncome += val;

      const cat = inc.category || 'Other';
      incomeCategoryMap[cat] = (incomeCategoryMap[cat] || 0) + val;
    });

    // Outflow from Purchases (Paid vs Total Committed based on filter)
    purchasesOutflows.forEach((po) => {
      const key = getKey(po);
      if (!timeSeriesMap[key]) {
        timeSeriesMap[key] = {
          period: key,
          inflow: 0,
          outflow: 0,
          net: 0,
          inflowSales: 0,
          inflowIncome: 0,
          outflowPurchases: 0,
          outflowPurchasesPaid: 0,
          outflowPurchasesCommitted: 0,
          outflowExpenses: 0,
        };
      }
      const paidVal = Number(po.totalPaid || 0);
      const committedVal = Number(po.totalCommitted || 0);
      const effectivePoVal = poOutflowMode === 'TOTAL_COMMITTED' ? committedVal : paidVal;

      timeSeriesMap[key].outflow += effectivePoVal;
      timeSeriesMap[key].outflowPurchases += effectivePoVal;
      timeSeriesMap[key].outflowPurchasesPaid += paidVal;
      timeSeriesMap[key].outflowPurchasesCommitted += committedVal;
    });

    // Outflow from Operating Expenses
    expensesOutflows.forEach((exp) => {
      const key = getKey(exp);
      if (!timeSeriesMap[key]) {
        timeSeriesMap[key] = {
          period: key,
          inflow: 0,
          outflow: 0,
          net: 0,
          inflowSales: 0,
          inflowIncome: 0,
          outflowPurchases: 0,
          outflowPurchasesPaid: 0,
          outflowPurchasesCommitted: 0,
          outflowExpenses: 0,
        };
      }
      const val = Number(exp.totalExpense || 0);
      timeSeriesMap[key].outflow += val;
      timeSeriesMap[key].outflowExpenses += val;

      const cat = exp.category || 'Other';
      expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + val;
    });

    const timeSeries = Object.values(timeSeriesMap)
      .map((item) => ({
        ...item,
        net: item.inflow - item.outflow,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const totalInflowSales = timeSeries.reduce((acc, c) => acc + c.inflowSales, 0);
    const totalInflowIncome = timeSeries.reduce((acc, c) => acc + c.inflowIncome, 0);
    const totalInflow = totalInflowSales + totalInflowIncome;

    const totalOutflowPurchases = timeSeries.reduce((acc, c) => acc + c.outflowPurchases, 0);
    const totalOutflowPurchasesPaid = timeSeries.reduce((acc, c) => acc + c.outflowPurchasesPaid, 0);
    const totalOutflowPurchasesCommitted = timeSeries.reduce((acc, c) => acc + c.outflowPurchasesCommitted, 0);
    const totalOutflowPurchasesUnpaid = Math.max(0, totalOutflowPurchasesCommitted - totalOutflowPurchasesPaid);

    const totalOutflowExpenses = timeSeries.reduce((acc, c) => acc + c.outflowExpenses, 0);
    const totalOutflow = totalOutflowPurchases + totalOutflowExpenses;

    const netCashFlow = totalInflow - totalOutflow;

    return {
      summary: {
        totalInflow,
        totalInflowSales,
        totalInflowIncome,
        totalOutflow,
        totalOutflowPurchases,
        totalOutflowPurchasesPaid,
        totalOutflowPurchasesCommitted,
        totalOutflowPurchasesUnpaid,
        totalOutflowExpenses,
        netCashFlow,
        burnCoverageRatio: totalOutflow > 0 ? Number((totalInflow / totalOutflow).toFixed(2)) : 100,
        poOutflowMode,
      },
      breakdown: {
        paymentMethods: paymentMethodMap,
        expenseCategories: expenseCategoryMap,
        incomeCategories: incomeCategoryMap,
      },
      timeSeries,
    };
  }
}
