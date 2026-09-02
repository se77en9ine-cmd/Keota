import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocalizedDate } from '../../utils/dateLocale';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  Layers,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  ArrowUpDown,
  Printer,
  Percent,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Coins,
  Receipt,
  Wallet,
  Building2,
  Sparkles,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import { CustomDatePicker } from '../common/CustomDatePicker';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartFontFamily = "'Noto Sans Lao Looped', 'Noto Sans Lao', 'Noto Sans Thai', 'Inter', 'Noto Serif JP', 'Noto Serif SC', system-ui, -apple-system, sans-serif";
ChartJS.defaults.font.family = chartFontFamily;

interface CashFlowReportProps {
  sales: any[];
  expenses: any[];
  incomes: any[];
  purchases?: any[];
  startDate: string;
  endDate: string;
  onDateChange?: (start: string, end: string) => void;
  onExportExcel?: () => void;
}

export const CashFlowReport: React.FC<CashFlowReportProps> = ({
  sales,
  expenses,
  incomes,
  purchases = [],
  startDate,
  endDate,
  onDateChange,
  onExportExcel,
}) => {
  const { t, i18n } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const { theme } = useSettingsStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const isDark = theme === 'dark';

  const [granularity, setGranularity] = useState<'day' | 'month' | 'year' | 'all'>('day');
  const [poOutflowMode, setPoOutflowMode] = useState<'ACTUAL_PAID' | 'TOTAL_COMMITTED'>('ACTUAL_PAID');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'PERIOD' | 'INFLOW' | 'OUTFLOW' | 'NET'>('PERIOD');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Date Presets Handler
  const handleApplyPreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'year' | 'all') => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    if (preset === 'today') {
      onDateChange?.(todayStr, todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = `${yest.getFullYear()}-${(yest.getMonth() + 1).toString().padStart(2, '0')}-${yest.getDate().toString().padStart(2, '0')}`;
      onDateChange?.(yestStr, yestStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      const past7Str = `${past7.getFullYear()}-${(past7.getMonth() + 1).toString().padStart(2, '0')}-${past7.getDate().toString().padStart(2, '0')}`;
      onDateChange?.(past7Str, todayStr);
    } else if (preset === 'month') {
      const firstDay = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
      onDateChange?.(firstDay, todayStr);
    } else if (preset === 'year') {
      const firstYearDay = `${now.getFullYear()}-01-01`;
      onDateChange?.(firstYearDay, todayStr);
    } else {
      onDateChange?.('', '');
    }
  };

  // ── Calculate Bucketed Time Series & Metrics ──
  const { summary, timeSeries, tenderBreakdown, expenseCatBreakdown } = useMemo(() => {
    const bucketMap: Record<
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
        salesCount: number;
      }
    > = {};

    const tendersMap: Record<string, number> = {};
    const expCatMap: Record<string, number> = {};

    const getBucketKey = (dateStr: string) => {
      if (!dateStr) return 'Unknown';
      const clean = dateStr.slice(0, 10);
      if (granularity === 'year') return clean.slice(0, 4);
      if (granularity === 'month') return clean.slice(0, 7);
      if (granularity === 'all') return 'All Time';
      return clean;
    };

    // 1. Process Sales Inflows (Filtered by Date)
    sales.forEach((s) => {
      if (s.fulfillmentStatus === 'CANCELLED' || s.status === 'CANCELLED' || s.pipelineStage === 'REJECTED') return;
      const saleDate = (s.createdAt || '').slice(0, 10);
      if (startDate && saleDate < startDate) return;
      if (endDate && saleDate > endDate) return;

      const key = getBucketKey(s.createdAt);
      if (!bucketMap[key]) {
        bucketMap[key] = {
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
          salesCount: 0,
        };
      }

      const paidVal = Number(s.paidAmount !== undefined && s.paidAmount !== null ? s.paidAmount : s.totalAmount || 0);
      bucketMap[key].inflow += paidVal;
      bucketMap[key].inflowSales += paidVal;
      bucketMap[key].salesCount += 1;

      // Extract Tender / Method
      const method = s.paymentMethod || 'CASH';
      tendersMap[method] = (tendersMap[method] || 0) + paidVal;
    });

    // 2. Process Other Incomes
    incomes.forEach((inc) => {
      const incDate = (inc.incomeDate || inc.createdAt || '').slice(0, 10);
      if (startDate && incDate < startDate) return;
      if (endDate && incDate > endDate) return;

      const key = getBucketKey(inc.incomeDate || inc.createdAt);
      if (!bucketMap[key]) {
        bucketMap[key] = {
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
          salesCount: 0,
        };
      }

      const val = Number(inc.amount || 0);
      bucketMap[key].inflow += val;
      bucketMap[key].inflowIncome += val;
    });

    // 3. Process Stock Purchases Outflow (Actual Paid vs Total Committed)
    purchases.forEach((po) => {
      if (po.status === 'CANCELLED') return;
      const poDate = (po.createdAt || '').slice(0, 10);
      if (startDate && poDate < startDate) return;
      if (endDate && poDate > endDate) return;

      const key = getBucketKey(po.createdAt);
      if (!bucketMap[key]) {
        bucketMap[key] = {
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
          salesCount: 0,
        };
      }

      const totalVal = Number(po.totalAmount || 0);
      const paidVal = Number(
        po.paidAmount !== undefined && po.paidAmount !== null
          ? po.paidAmount
          : po.paymentStatus === 'PAID'
          ? totalVal
          : 0
      );
      const effectivePoVal = poOutflowMode === 'TOTAL_COMMITTED' ? totalVal : paidVal;

      bucketMap[key].outflow += effectivePoVal;
      bucketMap[key].outflowPurchases += effectivePoVal;
      bucketMap[key].outflowPurchasesPaid += paidVal;
      bucketMap[key].outflowPurchasesCommitted += totalVal;
    });

    // 4. Process Operating Expenses Outflow
    expenses.forEach((e) => {
      const expDate = (e.expenseDate || e.createdAt || '').slice(0, 10);
      if (startDate && expDate < startDate) return;
      if (endDate && expDate > endDate) return;

      const key = getBucketKey(e.expenseDate || e.createdAt);
      if (!bucketMap[key]) {
        bucketMap[key] = {
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
          salesCount: 0,
        };
      }

      const expVal = Number(e.amount || 0);
      bucketMap[key].outflow += expVal;
      bucketMap[key].outflowExpenses += expVal;

      const cat = e.category || 'Other';
      expCatMap[cat] = (expCatMap[cat] || 0) + expVal;
    });

    const series = Object.values(bucketMap).map((b) => ({
      ...b,
      net: b.inflow - b.outflow,
    }));

    const totalInflowSales = series.reduce((acc, c) => acc + c.inflowSales, 0);
    const totalInflowIncome = series.reduce((acc, c) => acc + c.inflowIncome, 0);
    const totalInflow = totalInflowSales + totalInflowIncome;

    const totalOutflowPurchases = series.reduce((acc, c) => acc + c.outflowPurchases, 0);
    const totalOutflowPurchasesPaid = series.reduce((acc, c) => acc + c.outflowPurchasesPaid, 0);
    const totalOutflowPurchasesCommitted = series.reduce((acc, c) => acc + c.outflowPurchasesCommitted, 0);
    const totalOutflowPurchasesUnpaid = Math.max(0, totalOutflowPurchasesCommitted - totalOutflowPurchasesPaid);

    const totalOutflowExpenses = series.reduce((acc, c) => acc + c.outflowExpenses, 0);
    const totalOutflow = totalOutflowPurchases + totalOutflowExpenses;

    const netCashFlow = totalInflow - totalOutflow;
    const coverageRatio = totalOutflow > 0 ? (totalInflow / totalOutflow) * 100 : 100;

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
        coverageRatio,
        poOutflowMode,
      },
      timeSeries: series,
      tenderBreakdown: tendersMap,
      expenseCatBreakdown: expCatMap,
    };
  }, [sales, expenses, incomes, purchases, startDate, endDate, granularity, poOutflowMode]);

  // Sorting & Filtering Table
  const filteredAndSortedSeries = useMemo(() => {
    let list = [...timeSeries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => item.period.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortField === 'PERIOD') {
        return sortOrder === 'asc' ? a.period.localeCompare(b.period) : b.period.localeCompare(a.period);
      }
      if (sortField === 'INFLOW') {
        return sortOrder === 'asc' ? a.inflow - b.inflow : b.inflow - a.inflow;
      }
      if (sortField === 'OUTFLOW') {
        return sortOrder === 'asc' ? a.outflow - b.outflow : b.outflow - a.outflow;
      }
      if (sortField === 'NET') {
        return sortOrder === 'asc' ? a.net - b.net : b.net - a.net;
      }
      return 0;
    });

    return list;
  }, [timeSeries, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedSeries.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedSeries.slice(start, start + pageSize);
  }, [filteredAndSortedSeries, page, pageSize]);

  // Chart Setup: Bar & Area Hybrid
  const chartData = useMemo(() => {
    const sortedForChart = [...timeSeries].sort((a, b) => a.period.localeCompare(b.period));
    return {
      labels: sortedForChart.length > 0 ? sortedForChart.map((t) => formatLocalizedDate(t.period, i18n.language)) : [t('common.noData', 'No Data')],
      datasets: [
        {
          type: 'bar' as const,
          label: t('cashFlow.totalInflow', 'Cash Inflow (+)'),
          data: sortedForChart.length > 0 ? sortedForChart.map((t) => convert(t.inflow, baseCode, currentCurrency)) : [0],
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6,
          order: 2,
        },
        {
          type: 'bar' as const,
          label: t('cashFlow.totalOutflow', 'Cash Outflow (-)'),
          data: sortedForChart.length > 0 ? sortedForChart.map((t) => convert(t.outflow, baseCode, currentCurrency)) : [0],
          backgroundColor: isDark ? 'rgba(244, 63, 94, 0.8)' : 'rgba(244, 63, 94, 0.85)',
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          borderRadius: 6,
          order: 3,
        },
        {
          type: 'line' as const,
          label: t('cashFlow.netFlow', 'Net Cash Position'),
          data: sortedForChart.length > 0 ? sortedForChart.map((t) => convert(t.net, baseCode, currentCurrency)) : [0],
          borderColor: '#06b6d4',
          backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#06b6d4',
          pointRadius: 4,
          fill: true,
          tension: 0.35,
          order: 1,
        },
      ],
    };
  }, [timeSeries, convert, baseCode, currentCurrency, isDark, t, i18n.language]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── Unified Command Center: Title, Mode, Granularity & Date Filter Ribbon ── */}
      <div className="p-5 rounded-3xl neu-card-lg space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {t('cashFlow.title', 'Cash Flow Auto Summarize')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black neu-pill text-emerald-600 dark:text-emerald-400 uppercase">
                  {t('cashFlow.liveAudit', 'Live Ledger')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('cashFlow.subtitle', 'Auto-summarized cash inflows, operational outflows, and net liquid cash trajectory')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* PO Outflow Mode Toggle Switch */}
            <div className="flex items-center p-1 neu-tab-container text-xs font-bold rounded-2xl">
              <button
                type="button"
                onClick={() => setPoOutflowMode('ACTUAL_PAID')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  poOutflowMode === 'ACTUAL_PAID'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Liquid Cash Basis: Include only money actually paid for POs"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Paid POs (Cash Basis)</span>
              </button>
              <button
                type="button"
                onClick={() => setPoOutflowMode('TOTAL_COMMITTED')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  poOutflowMode === 'TOTAL_COMMITTED'
                    ? 'neu-tab-active text-purple-600 dark:text-purple-400 font-extrabold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Committed Basis: Include 100% of all Purchase Order totals regardless of payment status"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Total Committed POs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Filter & Presets Ribbon */}
        <div className="pt-3.5 border-t border-slate-200/50 dark:border-slate-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <span>{t('reports.cashFlowPeriod', 'Cash Flow Period:')}</span>
            </div>

            <div className="w-44">
              <CustomDatePicker
                value={startDate}
                onChange={(val) => onDateChange?.(val, endDate)}
                placeholder={t('reports.startDate', 'Start Date...')}
                presets={false}
              />
            </div>

            <span className="text-slate-400 font-bold text-xs">{t('common.to', 'to')}</span>

            <div className="w-44">
              <CustomDatePicker
                value={endDate}
                onChange={(val) => onDateChange?.(startDate, val)}
                placeholder={t('reports.endDate', 'End Date...')}
                presets={false}
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => onDateChange?.('', '')}
                className="neu-btn px-3 py-2 rounded-xl text-slate-500 hover:text-rose-500 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title={t('common.reset', 'Reset')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('common.reset', 'Reset')}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 neu-tab-container p-1 rounded-2xl text-xs">
              <button
                type="button"
                onClick={() => handleApplyPreset('today')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  startDate && startDate === endDate && startDate === `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-500'
                }`}
              >
                {t('reports.today', 'Today')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('7days')}
                className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
              >
                {t('reports.last7days', 'Last 7 Days')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('month')}
                className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
              >
                {t('reports.thisMonth', 'This Month')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  !startDate && !endDate
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-500'
                }`}
              >
                {t('reports.allTime', 'All Time')}
              </button>
            </div>

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="neu-btn-primary py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-bold shadow-md hover:shadow-lg transition-all"
                title={t('cashFlow.exportCashFlow', 'Export Excel (.xlsx)')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{t('reports.exportExcel', 'Export Excel')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 High-Density Bento KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Inflow */}
        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t('cashFlow.totalInflow', 'Total Inflows')}
            </span>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {format(convert(summary.totalInflow, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
            <span>Sales: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{format(convert(summary.totalInflowSales, baseCode, currentCurrency), currentCurrency)}</strong></span>
            <span>Other: <strong className="text-slate-700 dark:text-slate-300 font-bold">{format(convert(summary.totalInflowIncome, baseCode, currentCurrency), currentCurrency)}</strong></span>
          </div>
        </div>

        {/* Total Cash Outflow */}
        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                {t('cashFlow.totalOutflow', 'Total Outflows')}
              </span>
              <button
                type="button"
                onClick={() => setPoOutflowMode((m) => (m === 'ACTUAL_PAID' ? 'TOTAL_COMMITTED' : 'ACTUAL_PAID'))}
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                  poOutflowMode === 'TOTAL_COMMITTED'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-200'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200'
                }`}
                title="Click to toggle between Paid POs and Total Committed POs"
              >
                {poOutflowMode === 'TOTAL_COMMITTED' ? 'Committed POs' : 'Paid Cash'}
              </button>
            </div>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {format(convert(summary.totalOutflow, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] font-mono">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Stock PO: <strong className="text-rose-600 dark:text-rose-400 font-bold">{format(convert(summary.totalOutflowPurchases, baseCode, currentCurrency), currentCurrency)}</strong></span>
              <span>OPEX: <strong className="text-slate-700 dark:text-slate-300 font-bold">{format(convert(summary.totalOutflowExpenses, baseCode, currentCurrency), currentCurrency)}</strong></span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-900/60 px-2 py-0.5 rounded-lg">
              <span>Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{format(convert(summary.totalOutflowPurchasesPaid, baseCode, currentCurrency), currentCurrency)}</strong></span>
              <span>Pending Credit: <strong className="text-amber-600 dark:text-amber-400 font-bold">{format(convert(summary.totalOutflowPurchasesUnpaid, baseCode, currentCurrency), currentCurrency)}</strong></span>
            </div>
          </div>
        </div>

        {/* Net Cash Position */}
        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              {t('cashFlow.netCashFlow', 'Net Cash Flow')}
            </span>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-cyan-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${summary.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {summary.netCashFlow >= 0 ? `+${format(convert(summary.netCashFlow, baseCode, currentCurrency), currentCurrency)}` : format(convert(summary.netCashFlow, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
            <span>Status:</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${summary.netCashFlow >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'}`}>
              {summary.netCashFlow >= 0 ? 'Cash Surplus' : 'Cash Deficit (Burn)'}
            </span>
          </div>
        </div>

        {/* Liquidity Coverage Ratio */}
        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Cash Inflow Coverage
            </span>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-amber-500 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {summary.coverageRatio.toFixed(1)}%
            </div>
            {/* Visual mini progress track */}
            <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  summary.coverageRatio >= 100 ? 'bg-emerald-500' : summary.coverageRatio >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, summary.coverageRatio)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
            <span>{t('cashFlow.burnMultiplier', 'Burn Multiplier:')}</span>
            <strong className={summary.coverageRatio >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
              {(summary.coverageRatio / 100).toFixed(2)}x {t('cashFlow.inflowOutflowRatio', 'Inflow/Outflow')}
            </strong>
          </div>
        </div>
      </div>

      {/* ── Interactive Chart & Visualization Section ── */}
      <div className="p-6 rounded-3xl neu-card-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              {t('cashFlow.trajectoryChart', 'Cash Velocity & Trend Breakdown')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('cashFlow.chartSubtitle', 'Inflows vs Outflows and Net Liquid Trajectory grouped by')}{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {granularity === 'day'
                  ? t('cashFlow.granularityDay', 'Day')
                  : granularity === 'month'
                  ? t('cashFlow.granularityMonth', 'Month')
                  : granularity === 'year'
                  ? t('cashFlow.granularityYear', 'Year')
                  : t('cashFlow.granularityTotal', 'Total')}
              </span>
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <Chart
            type="bar"
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false,
              },
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    color: isDark ? '#94a3b8' : '#64748b',
                    font: { size: 11, weight: 'bold', family: chartFontFamily },
                    usePointStyle: true,
                    boxWidth: 6,
                  },
                },
                tooltip: {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  titleColor: isDark ? '#f8fafc' : '#0f172a',
                  bodyColor: isDark ? '#e2e8f0' : '#334155',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  borderWidth: 1,
                  padding: 12,
                  boxPadding: 6,
                  usePointStyle: true,
                  titleFont: { size: 12, weight: 'bold', family: chartFontFamily, lineHeight: 1.5 },
                  bodyFont: { size: 12, family: chartFontFamily, lineHeight: 1.5 },
                  callbacks: {
                    label: (context: any) => {
                      const label = context.dataset.label || '';
                      const val = context.parsed.y !== null ? context.parsed.y : 0;
                      return ` ${label}: ${format(convert(val, baseCode, currentCurrency), currentCurrency)}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { color: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.12)' },
                  ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 10, weight: 'bold', family: chartFontFamily } },
                },
                y: {
                  grid: { color: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.12)' },
                  ticks: {
                    color: isDark ? '#94a3b8' : '#64748b',
                    font: { size: 10, weight: 'bold', family: chartFontFamily },
                    callback: (value: any) => format(Number(value), currentCurrency).split(' ')[0],
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* ── Granular Period Stream Table ── */}
      <div className="rounded-3xl neu-card-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              {t('cashFlow.periodStream', 'Period Cash Flow Ledger')}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                ({filteredAndSortedSeries.length} {granularity === 'day' ? 'Days' : granularity === 'month' ? 'Months' : 'Periods'})
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t('common.search', 'Search period...')}
                className="pl-8 pr-3 py-1.5 rounded-xl neu-sunken-sm text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/80 dark:bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-mono">
              <tr>
                <th
                  onClick={() => {
                    if (sortField === 'PERIOD') setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortField('PERIOD');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    {t('cashFlow.period', 'Period / Time')}
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400">
                  {t('cashFlow.posSalesInflow', 'POS Sales Inflow')}
                </th>
                <th className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400">
                  {t('cashFlow.otherIncomes', 'Other Incomes')}
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'INFLOW') setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortField('INFLOW');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white text-emerald-600 dark:text-emerald-400"
                >
                  <div className="flex items-center gap-1.5">
                    {t('cashFlow.totalInflow', 'Total Inflow (+)')}
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-rose-600 dark:text-rose-400">
                  <div className="flex items-center gap-1">
                    <span>{t('cashFlow.stockPO', 'Stock PO')}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-sans">
                      ({poOutflowMode === 'TOTAL_COMMITTED' ? t('cashFlow.committed', 'Committed') : t('cashFlow.paid', 'Paid')})
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-rose-600 dark:text-rose-400">
                  {t('cashFlow.storeOpex', 'Store OPEX')}
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'OUTFLOW') setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortField('OUTFLOW');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white text-rose-600 dark:text-rose-400"
                >
                  <div className="flex items-center gap-1.5">
                    {t('cashFlow.totalOutflow', 'Total Outflow (-)')}
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'NET') setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortField('NET');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white text-cyan-600 dark:text-cyan-400"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {t('cashFlow.netFlow', 'Net Cash Flow')}
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-mono">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 font-sans">
                    {t('cashFlow.noRecords', 'No cash flow records found for this period.')}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.period} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span title={row.period}>{formatLocalizedDate(row.period, i18n.language)}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">+{format(convert(row.inflowSales, baseCode, currentCurrency), currentCurrency)}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">+{format(convert(row.inflowIncome, baseCode, currentCurrency), currentCurrency)}</td>
                    <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">+{format(convert(row.inflow, baseCode, currentCurrency), currentCurrency)}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>-{format(convert(row.outflowPurchases, baseCode, currentCurrency), currentCurrency)}</div>
                      {(row.outflowPurchasesCommitted > 0 || row.outflowPurchasesPaid > 0) && (
                        <span className="text-[9px] text-slate-400 block font-sans">
                          {t('cashFlow.paidPrefix', 'Paid:')} {format(convert(row.outflowPurchasesPaid || 0, baseCode, currentCurrency), currentCurrency)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">-{format(convert(row.outflowExpenses, baseCode, currentCurrency), currentCurrency)}</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-bold">-{format(convert(row.outflow, baseCode, currentCurrency), currentCurrency)}</td>
                    <td className={`py-3 px-4 text-right font-black text-sm ${row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {row.net >= 0 ? `+${format(convert(row.net, baseCode, currentCurrency), currentCurrency)}` : format(convert(row.net, baseCode, currentCurrency), currentCurrency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Grand Total Footer */}
            <tfoot className="bg-slate-100 dark:bg-slate-950 font-mono text-xs font-bold border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3.5 px-4 text-slate-900 dark:text-white uppercase tracking-wider font-extrabold font-sans">
                  {t('cashFlow.totalRecords', 'TOTAL ({{count}} Records)', { count: filteredAndSortedSeries.length })}
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">+{format(convert(summary.totalInflowSales, baseCode, currentCurrency), currentCurrency)}</td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">+{format(convert(summary.totalInflowIncome, baseCode, currentCurrency), currentCurrency)}</td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 text-sm font-black">+{format(convert(summary.totalInflow, baseCode, currentCurrency), currentCurrency)}</td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                  <div>-{format(convert(summary.totalOutflowPurchases, baseCode, currentCurrency), currentCurrency)}</div>
                  <span className="text-[9px] text-slate-400 block font-sans font-normal">
                    (Paid: {format(convert(summary.totalOutflowPurchasesPaid, baseCode, currentCurrency), currentCurrency)})
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">-{format(convert(summary.totalOutflowExpenses, baseCode, currentCurrency), currentCurrency)}</td>
                <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 text-sm font-black">-{format(convert(summary.totalOutflow, baseCode, currentCurrency), currentCurrency)}</td>
                <td className={`py-3.5 px-4 text-right text-sm font-black ${summary.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {summary.netCashFlow >= 0 ? `+${format(convert(summary.netCashFlow, baseCode, currentCurrency), currentCurrency)}` : format(convert(summary.netCashFlow, baseCode, currentCurrency), currentCurrency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredAndSortedSeries.length)} of {filteredAndSortedSeries.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
