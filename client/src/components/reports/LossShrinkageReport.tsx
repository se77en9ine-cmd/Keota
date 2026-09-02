import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  PackageMinus,
  TrendingDown,
  AlertTriangle,
  Flame,
  Clock,
  ShieldAlert,
  Boxes,
  Download,
  CheckCircle2,
  Filter,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

export type LossSortField = 'DATE' | 'PRODUCT' | 'TYPE' | 'QTY' | 'COST' | 'RETAIL';

interface LossShrinkageReportProps {
  startDate?: string;
  endDate?: string;
}

export const LossShrinkageReport: React.FC<LossShrinkageReportProps> = ({
  startDate: propStartDate,
  endDate: propEndDate,
}) => {
  const { t, i18n } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [analytics, setAnalytics] = useState<any>({
    summary: { totalRecords: 0, totalItemsLost: 0, totalLossCost: 0, totalLossRetail: 0 },
    byType: {},
    topLostProducts: [],
    timeline: [],
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Sorting & Pagination State
  const [lossSortField, setLossSortField] = useState<LossSortField>('DATE');
  const [lossSortOrder, setLossSortOrder] = useState<'asc' | 'desc'>('desc');
  const [lossPage, setLossPage] = useState<number>(1);
  const [lossPageSize, setLossPageSize] = useState<number>(25);

  const handleToggleLossSort = (field: LossSortField) => {
    if (lossSortField === field) {
      setLossSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLossSortField(field);
      setLossSortOrder(field === 'DATE' || field === 'QTY' || field === 'COST' || field === 'RETAIL' ? 'desc' : 'asc');
    }
    setLossPage(1);
  };

  // Export State Machine
  type ExportState = 'idle' | 'loading' | 'success' | 'error';
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (propStartDate) params.startDate = propStartDate;
      if (propEndDate) params.endDate = propEndDate;
      if (selectedType !== 'ALL') params.lossType = selectedType;
      if (search) params.search = search;

      const [analyticsRes, historyRes] = await Promise.all([
        api.get('/inventory/loss-analytics', { params }),
        api.get('/inventory/loss-history', { params }),
      ]);

      setAnalytics(analyticsRes.data || {});
      setHistory(historyRes.data.history || []);
    } catch (err) {
      console.error('Failed to load loss analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [propStartDate, propEndDate, selectedType]);

  // ── Computed Sorted & Paginated Loss History ──
  const sortedHistory = useMemo(() => {
    const list = [...history];
    list.sort((a, b) => {
      let comparison = 0;
      switch (lossSortField) {
        case 'DATE': {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          comparison = timeA - timeB;
          break;
        }
        case 'PRODUCT':
          comparison = (a.productName || '').localeCompare(b.productName || '');
          break;
        case 'TYPE':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        case 'QTY':
          comparison = (a.absQuantity || 0) - (b.absQuantity || 0);
          break;
        case 'COST':
          comparison = (a.totalCostValue || 0) - (b.totalCostValue || 0);
          break;
        case 'RETAIL':
          comparison = (a.totalRetailValue || 0) - (b.totalRetailValue || 0);
          break;
        default:
          comparison = 0;
      }
      return lossSortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [history, lossSortField, lossSortOrder]);

  const lossTotalPages = lossPageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedHistory.length / lossPageSize));
  const lossEffectivePage = Math.min(lossPage, lossTotalPages);
  const paginatedHistory = useMemo(() => {
    if (lossPageSize === -1) return sortedHistory;
    const start = (lossEffectivePage - 1) * lossPageSize;
    return sortedHistory.slice(start, start + lossPageSize);
  }, [sortedHistory, lossEffectivePage, lossPageSize]);

  const handleExportLoss = async () => {
    if (exportState === 'loading') return;
    setExportState('loading');
    try {
      const params: Record<string, string> = {
        currency: currentCurrency || 'USD',
        lang: i18n.language || 'en',
      };
      if (propStartDate) params.startDate = propStartDate;
      if (propEndDate) params.endDate = propEndDate;
      if (selectedType !== 'ALL') params.lossType = selectedType;

      const res = await api.get('/export/loss/excel', { params, responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `39pos_loss_and_shrinkage_report_${currentCurrency || 'USD'}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportState('success');
      showToast(`${filename} downloaded successfully (${currentCurrency})`, 'success');
      setTimeout(() => setExportState('idle'), 2500);
    } catch (err: any) {
      setExportState('error');
      showToast(`Export failed: ${err?.message || 'Error'}`, 'error');
      setTimeout(() => setExportState('idle'), 2000);
    }
  };

  const lossBadgeConfig: Record<string, { label: string; icon: any; color: string; barColor: string }> = {
    DAMAGE: {
      label: t('loss.badgeDamage', 'Damaged'),
      icon: Flame,
      color: 'text-amber-500',
      barColor: 'bg-amber-500',
    },
    EXPIRED: {
      label: t('loss.badgeExpired', 'Expired'),
      icon: Clock,
      color: 'text-rose-500',
      barColor: 'bg-rose-500',
    },
    DEFECTIVE: {
      label: t('loss.badgeDefective', 'Defective'),
      icon: ShieldAlert,
      color: 'text-purple-500',
      barColor: 'bg-purple-500',
    },
    LOST: {
      label: t('loss.badgeLost', 'Lost / Theft'),
      icon: PackageMinus,
      color: 'text-red-500',
      barColor: 'bg-red-500',
    },
    SHRINKAGE: {
      label: t('loss.badgeShrinkage', 'Discrepancy'),
      icon: AlertTriangle,
      color: 'text-orange-500',
      barColor: 'bg-orange-500',
    },
    INTERNAL_USE: {
      label: t('loss.badgeInternal', 'Store Use'),
      icon: Boxes,
      color: 'text-blue-500',
      barColor: 'bg-blue-500',
    },
  };

  const totalCost = analytics.summary?.totalLossCost || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div
          className={`export-toast ${
            toast.type === 'error' ? 'export-toast--error' : 'export-toast--success'
          }`}
        >
          {toast.type === 'error' ? '✕' : '✓'}
          <span>{toast.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Value */}
        <div className="p-5 neu-card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiCostLoss', 'Total Cost Loss')}
            </span>
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {format(convert(totalCost, baseCode, currentCurrency), currentCurrency)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {t('loss.kpiCostLossSub', 'Direct write-off from COGS')}
          </p>
        </div>

        {/* Units Lost */}
        <div className="p-5 neu-card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiItemsCount', 'Total Units Lost')}
            </span>
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0">
              <PackageMinus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {(analytics.summary?.totalItemsLost || 0).toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">{t('loss.unitPcs', 'pcs')}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {t('loss.kpiItemsCountSub', 'Across all registered batches')}
          </p>
        </div>

        {/* Potential Retail Value Lost */}
        <div className="p-5 neu-card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiRetailLoss', 'Lost Retail Opportunity')}
            </span>
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-purple-500 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-800 dark:text-slate-200 font-mono tracking-tight">
            {format(
              convert(analytics.summary?.totalLossRetail || 0, baseCode, currentCurrency),
              currentCurrency
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {t('loss.kpiRetailLossSub', 'Lost sales potential')}
          </p>
        </div>

        {/* Audit Movements */}
        <div className="p-5 neu-card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiIncidents', 'Total Loss Incidents')}
            </span>
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {(analytics.summary?.totalRecords || 0).toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">{t('loss.unitRecords', 'records')}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {t('loss.kpiIncidentsSub', 'Audit log movements')}
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Breakdown by Loss Incident Reason */}
        <div className="p-6 neu-card-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/40 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm text-rose-500 flex items-center justify-center">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <span>{t('loss.breakdownTitle', 'Loss Breakdown by Incident Type')}</span>
              </h3>
              <span className="text-[10px] font-black neu-pill px-2.5 py-0.5 rounded-full text-slate-400 uppercase tracking-wider">
                {t('loss.pctOfLossCost', '% of Total Loss Cost')}
              </span>
            </div>

            <div className="space-y-3.5">
              {Object.keys(analytics.byType || {}).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  {t('loss.noBreakdownData', 'No loss breakdown data available for this range')}
                </div>
              ) : (
                Object.entries(analytics.byType).map(([typeKey, data]: [string, any]) => {
                  const cfg = lossBadgeConfig[typeKey] || {
                    label: typeKey,
                    color: 'text-slate-400',
                    barColor: 'bg-slate-400',
                  };
                  const pct = totalCost > 0 ? ((data.cost / totalCost) * 100).toFixed(1) : '0';

                  return (
                    <div key={typeKey} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${cfg.barColor}`} />
                          <span>{cfg.label}</span>
                          <span className="text-[10px] font-normal text-slate-400 font-mono">
                            ({data.quantity} {t('loss.unitPcs', 'pcs')})
                          </span>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-900 dark:text-white font-black">
                            {format(convert(data.cost, baseCode, currentCurrency), currentCurrency)}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      {/* Bar progress */}
                      <div className="w-full h-2 rounded-full neu-sunken overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full ${cfg.barColor} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(2, parseFloat(pct)))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 2. Top 10 Most Lost Products */}
        <div className="p-6 neu-card-lg">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/40 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-amber-500 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>{t('loss.topProductsTitle', 'Top High-Loss Products (Ranked by Cost)')}</span>
            </h3>
            <span className="text-[10px] font-black neu-pill px-2.5 py-0.5 rounded-full text-slate-400 uppercase tracking-wider">{t('loss.topSkus', 'Top SKUs')}</span>
          </div>

          <div className="space-y-2.5">
            {(analytics.topLostProducts || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                {t('loss.noTopProducts', 'No product losses recorded for this period')}
              </div>
            ) : (
              (analytics.topLostProducts || []).map((p: any, idx: number) => {
                return (
                  <div
                    key={p.productId}
                    className="p-3 rounded-2xl neu-card-sm flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-xl neu-sunken-sm font-mono text-[11px] font-black text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <div className="font-black text-rose-600 dark:text-rose-400 font-mono">
                          {format(convert(p.cost, baseCode, currentCurrency), currentCurrency)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.quantity} {t('loss.unitPcs', 'pcs')}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Filterable Audit Table */}
      <div className="p-6 neu-card-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              {t('loss.auditLogTitle', 'Loss Detail Audit Logs')}
            </span>
            <div className="flex items-center gap-1.5 neu-tab-container p-1 rounded-2xl">
              {['ALL', 'DAMAGE', 'EXPIRED', 'DEFECTIVE', 'LOST'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedType === type
                      ? 'neu-tab-active text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'ALL' ? t('common.all', 'All') : lossBadgeConfig[type]?.label || type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('loss.searchPlaceholder', 'Filter item / notes...')}
                className="w-full h-9 pl-9 pr-3 neu-input text-xs text-slate-800 dark:text-white outline-none"
              />
            </div>

            <button
              onClick={handleExportLoss}
              disabled={exportState === 'loading'}
              className={`h-9 px-4 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50`}
            >
              {exportState === 'loading' ? (
                <span className="export-spinner" />
              ) : exportState === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{t('loss.exportLossExcel', 'Export Loss Excel')}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl neu-sunken p-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800 select-none">
              <tr>
                <th
                  onClick={() => handleToggleLossSort('DATE')}
                  className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('loss.colDate', 'Date')}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleLossSort('PRODUCT')}
                  className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('loss.colProduct', 'Product / SKU')}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleLossSort('TYPE')}
                  className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('loss.colType', 'Incident Type')}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleLossSort('QTY')}
                  className="p-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{t('loss.colQty', 'Qty Lost')}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleLossSort('COST')}
                  className="p-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{t('loss.colCostLoss', 'Cost Loss')}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleLossSort('RETAIL')}
                  className="p-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{t('loss.colRetailLoss', 'Retail Value')}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4">{t('loss.colNotes', 'Notes & Cause')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    {t('loss.noAuditRecords', 'No loss records found matching the current filters')}
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => {
                  const cfg = lossBadgeConfig[item.lossType] || {
                    label: item.lossType,
                    color: 'text-slate-400',
                  };
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {item.createdAt ? item.createdAt.slice(0, 10) : '—'}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.productName || 'Product'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full font-black text-[10px] neu-pill text-rose-600 dark:text-rose-400">
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-rose-600 dark:text-rose-400">
                        -{item.absQuantity}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        {format(
                          convert(item.totalCostValue || 0, baseCode, currentCurrency),
                          currentCurrency
                        )}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500">
                        {format(
                          convert(item.totalRetailValue || 0, baseCode, currentCurrency),
                          currentCurrency
                        )}
                      </td>
                      <td className="p-4 text-slate-500 max-w-xs truncate" title={item.notes}>
                        {item.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedHistory.length > 0 && (
          <div className="p-3.5 border-t border-slate-200/40 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
              {(() => {
                const start = lossPageSize === -1 ? 1 : (lossEffectivePage - 1) * lossPageSize + 1;
                const end = lossPageSize === -1 ? sortedHistory.length : Math.min(lossEffectivePage * lossPageSize, sortedHistory.length);
                return (
                  <span>
                    Showing {start === end ? start : `${start}–${end}`} of{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{sortedHistory.length}</span>{' '}
                    {sortedHistory.length === 1 ? 'incident' : 'incidents'}
                  </span>
                );
              })()}
              <div className="w-32">
                <CustomSelect
                  value={String(lossPageSize)}
                  onChange={(val) => {
                    setLossPageSize(Number(val));
                    setLossPage(1);
                  }}
                  options={[
                    { value: '10', label: '10 / page' },
                    { value: '25', label: '25 / page' },
                    { value: '50', label: '50 / page' },
                    { value: '100', label: '100 / page' },
                    { value: '-1', label: 'All incidents' },
                  ]}
                  placement="up"
                  size="sm"
                />
              </div>
            </div>

            {lossPageSize !== -1 && lossTotalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLossPage(1)}
                  disabled={lossEffectivePage === 1}
                  className="neu-circle-btn w-8 h-8 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLossPage((p) => Math.max(1, p - 1))}
                  disabled={lossEffectivePage === 1}
                  className="neu-circle-btn w-8 h-8 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: lossTotalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === lossTotalPages || Math.abs(p - lossEffectivePage) <= 1)
                    .reduce((acc: (number | string)[], p, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((pageItem, idx) => {
                      if (pageItem === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-mono">
                            …
                          </span>
                        );
                      }
                      const p = pageItem as number;
                      const isActive = p === lossEffectivePage;
                      return (
                        <button
                          key={p}
                          onClick={() => setLossPage(p)}
                          className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'neu-tab-active text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                              : 'neu-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                </div>

                <button
                  onClick={() => setLossPage((p) => Math.min(lossTotalPages, p + 1))}
                  disabled={lossEffectivePage === lossTotalPages}
                  className="neu-circle-btn w-8 h-8 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLossPage(lossTotalPages)}
                  disabled={lossEffectivePage === lossTotalPages}
                  className="neu-circle-btn w-8 h-8 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
