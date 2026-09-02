import { eq } from 'drizzle-orm';
import { db } from '../database/connection';
import { sales, saleItems, products, categories, customers, suppliers, expenses, income, inventory, payments } from '../database/schema';

export class DashboardService {
  public static async getAnalytics() {
    const allSales = await db.select().from(sales).where(eq(sales.status, 'COMPLETED'));
    const allSaleItems = await db.select().from(saleItems);
    const allProducts = await db.select().from(products);
    const allCategories = await db.select().from(categories);
    const allCustomers = await db.select().from(customers);
    const allSuppliers = await db.select().from(suppliers);
    const allExpenses = await db.select().from(expenses);
    const allIncome = await db.select().from(income);
    const allStock = await db.select().from(inventory);
    const allPayments = await db.select().from(payments);

    // Sales metrics
    const totalRevenue = allSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalExpenses = allExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalOtherIncome = allIncome.reduce((acc, i) => acc + (i.amount || 0), 0);

    const totalCostOfGoods = allSaleItems.reduce((acc, item) => acc + (item.costPrice || 0) * (item.quantity || 0), 0);
    const totalProfit = totalRevenue - totalCostOfGoods - totalExpenses + totalOtherIncome;

    const inventoryValue = allStock.reduce((acc, s) => acc + (s.quantity || 0) * (s.avgCost || 0), 0);

    // Product map for quick lookup
    const productMap = new Map<string, any>();
    allProducts.forEach((p) => productMap.set(p.id, p));

    // Category map for quick lookup
    const categoryMap = new Map<string, string>();
    allCategories.forEach((c) => categoryMap.set(c.id, c.name));

    // Stock map per product
    const stockMap = new Map<string, number>();
    allStock.forEach((s) => {
      stockMap.set(s.productId, (stockMap.get(s.productId) || 0) + (s.quantity || 0));
    });

    // Low stock items: items with stock <= 10
    const lowStockItems: Array<{ id: string; name: string; stock: number }> = [];
    allProducts.forEach((p) => {
      const stock = stockMap.get(p.id) || 0;
      if (stock <= 10) {
        lowStockItems.push({ id: p.id, name: p.name, stock });
      }
    });

    // Expiring items: inventory items with expiryDate within 30 days
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringItems: Array<{ id: string; name: string; batchNumber?: string; expiryDate: string; daysLeft: number }> = [];
    allStock.forEach((s) => {
      if (s.expiryDate) {
        const exp = new Date(s.expiryDate);
        if (exp.getTime() >= now.getTime() && exp.getTime() <= in30Days.getTime()) {
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const prod = productMap.get(s.productId);
          expiringItems.push({
            id: s.id,
            name: prod?.name || 'Unknown Item',
            batchNumber: s.batchNumber || undefined,
            expiryDate: s.expiryDate,
            daysLeft: diffDays,
          });
        }
      }
    });

    // Today's sales
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = allSales.filter((s) => s.createdAt && s.createdAt.startsWith(todayStr));
    const dailyRevenue = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    // Top selling products with real categories and stock
    const productSalesMap: Record<string, { id: string; name: string; category: string; units: number; revenue: number; stock: number; isLowStock: boolean }> = {};
    for (const item of allSaleItems) {
      if (!productSalesMap[item.productId]) {
        const prod = productMap.get(item.productId);
        const catName = (prod?.categoryId && categoryMap.get(prod.categoryId)) || 'General';
        const currentStock = stockMap.get(item.productId) || 0;
        productSalesMap[item.productId] = {
          id: item.productId,
          name: item.name || prod?.name || 'Unknown Product',
          category: catName,
          units: 0,
          revenue: 0,
          stock: currentStock,
          isLowStock: currentStock <= 10,
        };
      }
      productSalesMap[item.productId].units += item.quantity || 0;
      productSalesMap[item.productId].revenue += item.totalPrice || 0;
    }

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Category Sales breakdown from sale items
    const categorySalesMap: Record<string, number> = {};
    for (const item of allSaleItems) {
      const prod = productMap.get(item.productId);
      const catName = (prod?.categoryId && categoryMap.get(prod.categoryId)) || 'General';
      categorySalesMap[catName] = (categorySalesMap[catName] || 0) + (item.totalPrice || 0);
    }
    const categorySales = Object.entries(categorySalesMap).map(([name, value]) => ({ name, value }));

    // Weekly sales trend (past 7 days including today)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = daysOfWeek[d.getDay()];

      const daySales = allSales.filter((s) => s.createdAt && s.createdAt.startsWith(dateStr));
      const dayRev = daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      const daySaleIds = new Set(daySales.map((s) => s.id));
      const dayItems = allSaleItems.filter((item) => daySaleIds.has(item.saleId));
      const dayCost = dayItems.reduce((sum, item) => sum + (item.costPrice || 0) * (item.quantity || 0), 0);
      const dayProfit = Math.max(0, dayRev - dayCost);

      salesChart.push({
        day: dayLabel,
        sales: dayRev,
        profit: dayProfit,
      });
    }

    // Hourly peak distribution
    const hourSlots = [
      { hour: '08:00', start: 8, end: 10 },
      { hour: '10:00', start: 10, end: 12 },
      { hour: '12:00', start: 12, end: 14 },
      { hour: '14:00', start: 14, end: 16 },
      { hour: '16:00', start: 16, end: 18 },
      { hour: '18:00', start: 18, end: 20 },
      { hour: '20:00', start: 20, end: 22 },
      { hour: '22:00', start: 22, end: 24 },
    ];

    const hourlyChart = hourSlots.map((slot) => {
      const matchingSales = allSales.filter((s) => {
        if (!s.createdAt) return false;
        const hour = new Date(s.createdAt).getHours();
        return hour >= slot.start && hour < slot.end;
      });
      const rev = matchingSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      return {
        hour: slot.hour,
        sales: rev,
        orders: matchingSales.length,
        peak: matchingSales.length >= 10,
      };
    });

    return {
      kpi: {
        dailySales: dailyRevenue,
        monthlySales: totalRevenue,
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        totalExpenses: totalExpenses,
        inventoryValue: inventoryValue,
        productCount: allProducts.length,
        customerCount: allCustomers.length,
        supplierCount: allSuppliers.length,
        lowStockCount: lowStockItems.length,
        expiringCount: expiringItems.length,
      },
      topSellingProducts,
      categorySales,
      salesChart,
      hourlyChart,
      lowStockAlerts: lowStockItems.slice(0, 5),
      expiringAlerts: expiringItems.slice(0, 5),
      recentTransactions: allSales.slice(0, 5),
    };
  }
}
