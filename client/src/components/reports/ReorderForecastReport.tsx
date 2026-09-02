import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Download,
  Search,
  ArrowUpDown,
  Filter,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Building2,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { CustomSelect } from '../common/CustomSelect';

export type ReorderRiskTier = 'ALL' | 'CRITICAL' | 'WARNING' | 'MODERATE' | 'HEALTHY';
export type ReorderSortField = 'NAME' | 'STOCK' | 'VELOCITY' | 'RUNWAY' | 'SUGGESTED_QTY' | 'EST_COST';

interface ReorderForecastReportProps {
  sales: any[];
}

export const ReorderForecastReport: React.FC<ReorderForecastReportProps> = ({ sales }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [products, setProducts] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Configuration Controls
  const [velocityDays, setVelocityDays] = useState<number>(14); // 7, 14, 30
  const [targetCoverageDays, setTargetCoverageDays] = useState<number>(30); // 14, 30, 45, 60
  const [leadTimeDays, setLeadTimeDays] = useState<number>(5); // 1, 3, 5, 7, 14
  const [safetyBufferPercent, setSafetyBufferPercent] = useState<number>(15); // 0, 10, 15, 25

  // Table Filters & Pagination
  const [tierFilter, setTierFilter] = useState<ReorderRiskTier>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<ReorderSortField>('RUNWAY');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [copiedIndex, setCopiedIndex] = useState<boolean>(false);

  useEffect(() => {
    fetchInventoryAndProducts();
  }, []);

  const fetchInventoryAndProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, stockRes] = await Promise.all([
        api.get('/products').catch(() => ({ data: { products: [] } })),
        api.get('/inventory/stock').catch(() => ({ data: { stock: [] } })),
      ]);
      setProducts(prodRes.data.products || prodRes.data || []);
      setStockItems(stockRes.data.stock || stockRes.data || []);
    } catch (err) {
      console.error('Failed to load inventory for reorder forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── 1. Calculate Daily Sales Velocity & Forecast Metrics per Product ──
  const forecastData = useMemo(() => {
    // Determine time cutoff for sales velocity
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - velocityDays * 86400000);
    const cutoffStr = cutoffDate.toISOString();

    // Map units sold per productId or SKU
    const unitsSoldMap: Record<string, number> = {};

    sales.forEach((sale) => {
      if (!sale.createdAt || sale.createdAt < cutoffStr) return;
      if (sale.paymentStatus !== 'PAID' && !sale.isCod) return;

      const items = Array.isArray(sale.items) ? sale.items : [];
      items.forEach((item: any) => {
        const prodId = item.productId || item.id || item.product?.id;
        const sku = item.sku || item.product?.sku;
        const qty = Number(item.quantity || item.qty || 1);

        if (prodId) {
          unitsSoldMap[prodId] = (unitsSoldMap[prodId] || 0) + qty;
        }
        if (sku) {
          unitsSoldMap[sku] = (unitsSoldMap[sku] || 0) + qty;
        }
      });
    });

    // Map total on-hand stock and weighted unit cost per product
    const stockMap: Record<string, { totalQty: number; avgCost: number; batchesCount: number }> = {};

    stockItems.forEach((st: any) => {
      const prodId = st.productId || st.product_id;
      const sku = st.sku || st.product?.sku;
      const qty = Number(st.quantity || 0);
      const cost = Number(st.cost_price || st.costPrice || st.unitCost || 0);

      const updateKey = (key: string) => {
        if (!stockMap[key]) {
          stockMap[key] = { totalQty: 0, avgCost: cost, batchesCount: 0 };
        }
        stockMap[key].totalQty += qty;
        stockMap[key].batchesCount += 1;
        if (cost > 0) stockMap[key].avgCost = cost;
      };

      if (prodId) updateKey(prodId);
      if (sku) updateKey(sku);
    });

    // Combine into unified forecasting rows
    return products.map((prod: any) => {
      const prodId = prod.id;
      const sku = prod.sku || 'N/A';
      const name = prod.name || prod.productName || 'Unknown Item';
      const barcode = prod.barcode || 'N/A';
      const category = prod.category?.name || prod.categoryName || 'General';

      const stockInfo = stockMap[prodId] || stockMap[sku] || {
        totalQty: Number(prod.stockQuantity || prod.stock || 0),
        avgCost: Number(prod.costPrice || prod.cost || 0),
        batchesCount: 0,
      };

      const currentStock = stockInfo.totalQty;
      const unitCost = stockInfo.avgCost || Number(prod.costPrice || prod.cost || 0);
      const sellingPrice = Number(prod.sellingPrice || prod.price || 0);

      const totalSold = unitsSoldMap[prodId] || unitsSoldMap[sku] || 0;
      const dailyVelocity = totalSold / Math.max(1, velocityDays);

      // Runway Days Calculation
      let daysRunway = 999;
      if (dailyVelocity > 0) {
        daysRunway = Math.round(currentStock / dailyVelocity);
      } else if (currentStock === 0) {
        daysRunway = 0;
      }

      // Target Required Quantity = Velocity * (Target Days + Lead Time) * (1 + Safety Buffer)
      const targetDays = targetCoverageDays + leadTimeDays;
      const safetyMultiplier = 1 + safetyBufferPercent / 100;
      const targetRequiredStock = Math.ceil(dailyVelocity * targetDays * safetyMultiplier);

      const suggestedReorderQty = Math.max(0, targetRequiredStock - currentStock);
      const estReorderCost = suggestedReorderQty * unitCost;

      // Classify Risk Tier
      let tier: 'CRITICAL' | 'WARNING' | 'MODERATE' | 'HEALTHY' = 'HEALTHY';
      if (daysRunway <= 3 || (currentStock === 0 && dailyVelocity > 0)) {
        tier = 'CRITICAL';
      } else if (daysRunway <= 7) {
        tier = 'WARNING';
      } else if (daysRunway <= 14) {
        tier = 'MODERATE';
      }

      return {
        id: prodId,
        sku,
        barcode,
        name,
        category,
        currentStock,
        unitCost,
        sellingPrice,
        totalSold,
        dailyVelocity,
        daysRunway,
        targetRequiredStock,
        suggestedReorderQty,
        estReorderCost,
        tier,
      };
    });
  }, [
    products,
    stockItems,
    sales,
    velocityDays,
    targetCoverageDays,
    leadTimeDays,
    safetyBufferPercent,
  ]);

  // ── 2. Filter & Sort Table Rows ──
  const filteredRows = useMemo(() => {
    return forecastData.filter((row) => {
      // Risk Tier Filter
      if (tierFilter !== 'ALL' && row.tier !== tierFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = row.name.toLowerCase().includes(q);
        const skuMatch = row.sku.toLowerCase().includes(q);
        const barcodeMatch = row.barcode.toLowerCase().includes(q);
        const catMatch = row.category.toLowerCase().includes(q);
        if (!nameMatch && !skuMatch && !barcodeMatch && !catMatch) return false;
      }

      return true;
    });
  }, [forecastData, tierFilter, searchQuery]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA: any = a.daysRunway;
      let valB: any = b.daysRunway;

      if (sortField === 'NAME') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'STOCK') {
        valA = a.currentStock;
        valB = b.currentStock;
      } else if (sortField === 'VELOCITY') {
        valA = a.dailyVelocity;
        valB = b.dailyVelocity;
      } else if (sortField === 'SUGGESTED_QTY') {
        valA = a.suggestedReorderQty;
        valB = b.suggestedReorderQty;
      } else if (sortField === 'EST_COST') {
        valA = a.estReorderCost;
        valB = b.estReorderCost;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  // ── 3. High-Level Summary Analytics ──
  const summary = useMemo(() => {
    let criticalCount = 0;
    let warningCount = 0;
    let moderateCount = 0;
    let healthyCount = 0;
    let totalSuggestedQty = 0;
    let totalEstimatedCost = 0;
    let skusNeedingReorder = 0;

    forecastData.forEach((row) => {
      if (row.tier === 'CRITICAL') criticalCount++;
      else if (row.tier === 'WARNING') warningCount++;
      else if (row.tier === 'MODERATE') moderateCount++;
      else healthyCount++;

      if (row.suggestedReorderQty > 0) {
        skusNeedingReorder++;
        totalSuggestedQty += row.suggestedReorderQty;
        totalEstimatedCost += row.estReorderCost;
      }
    });

    return {
      criticalCount,
      warningCount,
      moderateCount,
      healthyCount,
      totalSuggestedQty,
      totalEstimatedCost,
      skusNeedingReorder,
      totalSKUs: forecastData.length,
    };
  }, [forecastData]);

  const handleToggleSort = (field: ReorderSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'RUNWAY' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  // ── 4. CSV Draft Export (UTF-8 BOM for Lao / Thai / Chinese) ──
  const handleExportCsv = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Current Stock',
      'Daily Velocity (units/d)',
      'Days Runway',
      'Risk Tier',
      'Suggested Reorder Qty',
      `Unit Cost (${baseCode})`,
      `Est. Total Cost (${baseCode})`,
    ];

    const rows = sortedRows.map((r) => [
      `"${r.sku}"`,
      `"${r.barcode}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      r.currentStock,
      r.dailyVelocity.toFixed(2),
      r.daysRunway >= 999 ? '999+' : r.daysRunway,
      r.tier,
      r.suggestedReorderQty,
      r.unitCost.toFixed(2),
      r.estReorderCost.toFixed(2),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `39pos_reorder_forecast_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopyPoDraft = () => {
    const poItems = sortedRows
      .filter((r) => r.suggestedReorderQty > 0)
      .slice(0, 30)
      .map(
        (r, i) =>
          `${i + 1}. [${r.sku}] ${r.name} - Qty: ${r.suggestedReorderQty} (Runway: ${
            r.daysRunway >= 999 ? '999+' : r.daysRunway
          }d)`
      )
      .join('\n');

    const draftText = `📦 39POS Purchase Order Draft (${new Date().toLocaleDateString()}):\n\n${poItems}\n\nTotal Est. Cost: ${format(
      summary.totalEstimatedCost,
      baseCode
    )}`;

    navigator.clipboard.writeText(draftText);
    setCopiedIndex(true);
    setTimeout(() => setCopiedIndex(false), 2000);
  };

  const getTierBadge = (tier: string, days: number) => {
    if (tier === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
          <Flame className="w-3 h-3 text-rose-400" />
          {t('reports.tierCritical', 'Critical')} ({days}d)
        </span>
      );
    }
    if (tier === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          {t('reports.tierWarning', 'Warning')} ({days}d)
        </span>
      );
    }
    if (tier === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3 text-amber-400" />
          {t('reports.tierModerate', 'Moderate')} ({days}d)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
        {t('reports.tierHealthy', 'Healthy')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Executive KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Stockouts */}
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/25 bg-rose-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400 animate-pulse" />
              {t('reports.criticalStockouts', 'Critical Stockouts')}
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
              {'< 3 Days'}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-rose-100 tracking-tight">
            {summary.criticalCount} <span className="text-xs font-normal text-rose-500 dark:text-rose-400">SKUs</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Immediate purchase order required to avoid lost sales
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="glass-panel p-4 rounded-2xl border border-orange-500/25 bg-orange-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              {t('reports.warningStockouts', 'Low Stock Runway')}
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300">
              {'< 7 Days'}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-orange-100 tracking-tight">
            {summary.warningCount} <span className="text-xs font-normal text-orange-500 dark:text-orange-400">SKUs</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Approaching reorder point within current supplier lead time
          </div>
        </div>

        {/* SKUs Requiring PO */}
        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              {t('reports.skusNeedingReorder', 'SKUs Requiring PO')}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
              {summary.totalSuggestedQty} Units
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-cyan-100 tracking-tight">
            {summary.skusNeedingReorder} / {summary.totalSKUs}{' '}
            <span className="text-xs font-normal text-cyan-600 dark:text-cyan-400">Products</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {(((summary.skusNeedingReorder || 0) / Math.max(1, summary.totalSKUs)) * 100).toFixed(0)}% of product catalog
          </div>
        </div>

        {/* Estimated Reorder Value */}
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              {t('reports.suggestedPoValue', 'Est. Reorder Capital')}
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              {targetCoverageDays}d Target
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-emerald-100 tracking-tight">
            {format(summary.totalEstimatedCost, baseCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Estimated capital required for suggested replenishment
          </div>
        </div>
      </div>

      {/* ── Forecast Configuration & Parameters Panel ── */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/60 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('reports.dailySalesRunRate', 'Sales Velocity Horizon')}:</span>
            <select
              value={velocityDays}
              onChange={(e) => setVelocityDays(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value={7}>Last 7 Days (Fast response)</option>
              <option value={14}>Last 14 Days (Balanced)</option>
              <option value={30}>Last 30 Days (Smooth baseline)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('reports.coverageTargetDays', 'Stock Coverage Target')}:</span>
            <select
              value={targetCoverageDays}
              onChange={(e) => setTargetCoverageDays(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value={14}>14 Days (Lean / Fast Turn)</option>
              <option value={30}>30 Days (Standard 1 Month)</option>
              <option value={45}>45 Days (Bulk / Buffer)</option>
              <option value={60}>60 Days (Seasonal / Long Lead)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('reports.leadTimeDays', 'Lead Time')}:</span>
            <select
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value={1}>1 Day (Local Express)</option>
              <option value={3}>3 Days</option>
              <option value={5}>5 Days (Standard)</option>
              <option value={7}>7 Days (1 Week)</option>
              <option value={14}>14 Days (Cross-Border Import)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons: Export CSV & Copy PO */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPoDraft}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Copy suggested PO lines to clipboard for WhatsApp/Supplier"
          >
            {copiedIndex ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedIndex ? 'Copied ✓' : 'Copy PO Draft'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('reports.exportPoDraft', 'Export PO (.csv)')}</span>
          </button>
        </div>
      </div>

      {/* ── Table Toolbar & Filters ── */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/60 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Product Name, SKU, Barcode..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Risk Tier Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setTierFilter('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                tierFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All SKUs ({forecastData.length})
            </button>
            <button
              onClick={() => {
                setTierFilter('CRITICAL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                tierFilter === 'CRITICAL'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Flame className="w-3 h-3" />
              Critical ({summary.criticalCount})
            </button>
            <button
              onClick={() => {
                setTierFilter('WARNING');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                tierFilter === 'WARNING'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-orange-600 dark:text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Warning ({summary.warningCount})
            </button>
            <button
              onClick={() => {
                setTierFilter('HEALTHY');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                tierFilter === 'HEALTHY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Healthy ({summary.healthyCount})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th
                  onClick={() => handleToggleSort('NAME')}
                  className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Product / SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort('STOCK')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>On Hand</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort('VELOCITY')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Velocity (Run-rate)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort('RUNWAY')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Stock Runway</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort('SUGGESTED_QTY')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Suggested PO Qty</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleSort('EST_COST')}
                  className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Est. Reorder Cost</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    {t('reports.noReorderNeeded', 'No inventory items match the selected filter.')}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isCritical = row.tier === 'CRITICAL';
                  const needsReorder = row.suggestedReorderQty > 0;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isCritical ? 'bg-rose-500/[0.04]' : ''
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>SKU: {row.sku}</span>
                          {row.barcode && row.barcode !== 'N/A' && <span>• Barcode: {row.barcode}</span>}
                          <span className="text-slate-400 dark:text-slate-500">[{row.category}]</span>
                        </div>
                      </td>

                      {/* On Hand Stock */}
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        <span
                          className={
                            row.currentStock <= 0
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : row.currentStock <= 5
                              ? 'text-orange-600 dark:text-orange-400 font-semibold'
                              : 'text-slate-800 dark:text-slate-200'
                          }
                        >
                          {row.currentStock}
                        </span>
                      </td>

                      {/* Daily Velocity */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        <div>{row.dailyVelocity.toFixed(1)} <span className="text-[10px] text-slate-400 dark:text-slate-500">u/d</span></div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          ({row.totalSold} in {velocityDays}d)
                        </div>
                      </td>

                      {/* Runway & Risk Tier Badge */}
                      <td className="py-3 px-3 text-center">
                        {getTierBadge(row.tier, row.daysRunway)}
                      </td>

                      {/* Suggested Reorder Qty */}
                      <td className="py-3 px-3 text-right font-mono">
                        {needsReorder ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25">
                            +{row.suggestedReorderQty}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-medium">0</span>
                        )}
                      </td>

                      {/* Est Reorder Cost */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {needsReorder ? (
                          format(row.estReorderCost, baseCode)
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length} items
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-800 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
