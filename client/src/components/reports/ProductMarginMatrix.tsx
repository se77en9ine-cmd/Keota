import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  TrendingUp,
  Percent,
  Search,
  ArrowUpDown,
  Filter,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Award,
  AlertCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

interface ProductMarginMatrixProps {
  sales: any[];
  startDate?: string;
  endDate?: string;
}

export const ProductMarginMatrix: React.FC<ProductMarginMatrixProps> = ({ sales, startDate, endDate }) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [marginTierFilter, setMarginTierFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'PROFIT' | 'MARGIN' | 'QTY' | 'REVENUE'>('PROFIT');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter sales for the date range
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.fulfillmentStatus === 'CANCELLED' || s.status === 'CANCELLED' || s.pipelineStage === 'REJECTED') {
        return false;
      }
      if (startDate || endDate) {
        const saleDate = s.createdAt ? s.createdAt.slice(0, 10) : '';
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
      }
      return true;
    });
  }, [sales, startDate, endDate]);

  // Aggregate item-level metrics across all filtered transactions
  const productAggregates = useMemo(() => {
    const map = new Map<string, {
      productId: string;
      name: string;
      sku: string;
      category?: string;
      unitsSold: number;
      totalRevenue: number;
      totalCost: number;
    }>();

    filteredSales.forEach((sale) => {
      const items = Array.isArray(sale.items) && sale.items.length > 0 ? sale.items : [];
      
      if (items.length > 0) {
        items.forEach((item: any) => {
          const key = item.productId || item.name || 'unknown';
          const existing = map.get(key) || {
            productId: item.productId || key,
            name: item.name || 'Product',
            sku: item.sku || '—',
            category: item.categoryName || item.category || 'General',
            unitsSold: 0,
            totalRevenue: 0,
            totalCost: 0,
          };

          const qty = Number(item.quantity) || 1;
          const itemRev = Number(item.totalPrice) || (qty * Number(item.unitPrice || 0));
          const unitCost = Number(item.costPrice || item.unitCost || 0);
          const itemCost = qty * unitCost;

          existing.unitsSold += qty;
          existing.totalRevenue += itemRev;
          existing.totalCost += itemCost;

          map.set(key, existing);
        });
      } else if (sale.totalAmount) {
        // Fallback if individual items are not loaded
        const fallbackName = sale.itemsSummary || sale.itemNames || `Order ${sale.invoiceNo}`;
        const key = `order-${sale.id}`;
        const existing = map.get(key) || {
          productId: key,
          name: fallbackName,
          sku: sale.invoiceNo || 'INV',
          category: sale.channel || 'POS',
          unitsSold: Number(sale.itemsCount) || 1,
          totalRevenue: 0,
          totalCost: 0,
        };

        const rev = Number(sale.totalAmount) || 0;
        const cost = Number(sale.totalCost) || 0;

        existing.totalRevenue += rev;
        existing.totalCost += cost;

        map.set(key, existing);
      }
    });

    const list = Array.from(map.values()).map((p) => {
      const grossProfit = p.totalRevenue - p.totalCost;
      const marginPercent = p.totalRevenue > 0 ? (grossProfit / p.totalRevenue) * 100 : 0;
      const avgSellingPrice = p.unitsSold > 0 ? p.totalRevenue / p.unitsSold : 0;
      const avgUnitCost = p.unitsSold > 0 ? p.totalCost / p.unitsSold : 0;

      let tier: 'STAR' | 'HEALTHY' | 'SLIM' | 'LOSS' = 'HEALTHY';
      if (marginPercent >= 50) tier = 'STAR';
      else if (marginPercent >= 25) tier = 'HEALTHY';
      else if (marginPercent >= 10) tier = 'SLIM';
      else tier = 'LOSS';

      return {
        ...p,
        grossProfit,
        marginPercent,
        avgSellingPrice,
        avgUnitCost,
        tier,
      };
    });

    return list;
  }, [filteredSales]);

  // Unique categories
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    productAggregates.forEach((p) => {
      if (p.category && p.category !== 'General') cats.add(p.category);
    });
    return [
      { value: 'ALL', label: t('pos.allCategories', 'All Categories') },
      ...Array.from(cats).map((c) => ({ value: c, label: c })),
    ];
  }, [productAggregates, t]);

  // Overall totals
  const totalRevenueAll = productAggregates.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalCostAll = productAggregates.reduce((sum, p) => sum + p.totalCost, 0);
  const totalProfitAll = totalRevenueAll - totalCostAll;
  const overallMargin = totalRevenueAll > 0 ? (totalProfitAll / totalRevenueAll) * 100 : 0;
  const totalUnitsSold = productAggregates.reduce((sum, p) => sum + p.unitsSold, 0);

  // Filter and Sort
  const filteredProducts = useMemo(() => {
    return productAggregates.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (marginTierFilter !== 'ALL' && p.tier !== marginTierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [productAggregates, selectedCategory, marginTierFilter, search]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let diff = 0;
      if (sortField === 'PROFIT') diff = a.grossProfit - b.grossProfit;
      else if (sortField === 'MARGIN') diff = a.marginPercent - b.marginPercent;
      else if (sortField === 'QTY') diff = a.unitsSold - b.unitsSold;
      else if (sortField === 'REVENUE') diff = a.totalRevenue - b.totalRevenue;
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [filteredProducts, sortField, sortOrder]);

  const handleToggleSort = (field: 'PROFIT' | 'MARGIN' | 'QTY' | 'REVENUE') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                {t('reports.productMarginTitle', 'SKU Gross Margin & Profitability Matrix')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase">
                COGS Analysis
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('reports.productMarginSubtitle', 'Track revenue, product landed cost, gross profits, and profit margins per SKU.')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <CustomSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={categoryOptions}
              placeholder={t('pos.allCategories', 'All Categories')}
            />
          </div>

          <div className="w-44">
            <CustomSelect
              value={marginTierFilter}
              onChange={(val) => setMarginTierFilter(val)}
              options={[
                { value: 'ALL', label: 'All Margin Tiers' },
                { value: 'STAR', label: '⭐ Star (≥50%)' },
                { value: 'HEALTHY', label: '🟢 Healthy (25-50%)' },
                { value: 'SLIM', label: '🟡 Slim (10-25%)' },
                { value: 'LOSS', label: '🔴 Low/Loss (<10%)' },
              ]}
              placeholder="Margin Tier..."
            />
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-emerald-400 font-mono tracking-tight">
            {format(convert(totalRevenueAll, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {totalUnitsSold.toLocaleString()} total units sold
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Product COGS</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-amber-400 font-mono tracking-tight">
            {format(convert(totalCostAll, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Direct inventory acquisition cost
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Gross Profit</span>
            <Award className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-sky-400 font-mono tracking-tight">
            {format(convert(totalProfitAll, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Revenue minus product cost
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Average Gross Margin</span>
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-purple-600 dark:text-purple-400 font-mono tracking-tight">
            {overallMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {overallMargin >= 25 ? '🟢 Healthy store margin' : '🟡 Review pricing strategy'}
          </div>
        </div>
      </div>

      {/* SKU Table & Search */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-white block">
                Product Profitability Ledger ({sortedProducts.length} Items)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Ranked by profitability and gross margin contribution</span>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, SKU..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px]">
                <th className="p-3.5">Product Details</th>
                <th className="p-3.5 cursor-pointer select-none text-right" onClick={() => handleToggleSort('QTY')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Units Sold</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-right">Avg Price</th>
                <th className="p-3.5 text-right">Avg Cost</th>
                <th className="p-3.5 cursor-pointer select-none text-right" onClick={() => handleToggleSort('REVENUE')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-right">Total COGS</th>
                <th className="p-3.5 cursor-pointer select-none text-right" onClick={() => handleToggleSort('PROFIT')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Profit</span>
                    <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer select-none text-right" onClick={() => handleToggleSort('MARGIN')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3 text-purple-500" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                    No sales data found matching the selected filters.
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p, idx) => (
                  <tr key={p.productId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {p.tier === 'STAR' && <span className="text-amber-400" title="Star Profit Performer">⭐</span>}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{p.name}</div>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 block">{p.sku} • {p.category}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{p.unitsSold}</td>
                    <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      {format(convert(p.avgSellingPrice, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500 dark:text-slate-400">
                      {format(convert(p.avgUnitCost, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {format(convert(p.totalRevenue, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-amber-600 dark:text-amber-400">
                      {format(convert(p.totalCost, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {format(convert(p.grossProfit, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-3.5 text-right">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono inline-block ${
                          p.tier === 'STAR'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                            : p.tier === 'HEALTHY'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : p.tier === 'SLIM'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {p.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
