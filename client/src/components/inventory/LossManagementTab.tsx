import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  PackageMinus,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  ShieldAlert,
  Boxes,
  Plus,
  RefreshCw,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { RecordLossModal } from './RecordLossModal';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

export type LossSortField = 'DATE' | 'PRODUCT' | 'INCIDENT' | 'QTY' | 'COST_LOSS';

interface LossManagementTabProps {
  stockList: any[];
  onRefreshStock: () => void;
}

export const LossManagementTab: React.FC<LossManagementTabProps> = ({
  stockList,
  onRefreshStock,
}) => {
  const { t, i18n } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalRecords: 0,
    totalItemsLost: 0,
    totalLossCost: 0,
    totalLossRetail: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedLossType, setSelectedLossType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<LossSortField>('DATE');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Export State Machine
  type ExportState = 'idle' | 'loading' | 'success' | 'error';
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLossHistory = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedLossType !== 'ALL') params.lossType = selectedLossType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/inventory/loss-history', { params });
      setHistory(res.data.history || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Failed to load loss history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLossHistory();
  }, [selectedLossType, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLossHistory();
  };

  const handleExportLoss = async () => {
    if (exportState === 'loading') return;
    setExportState('loading');
    try {
      const params: Record<string, string> = {
        currency: currentCurrency || 'USD',
        lang: i18n.language || 'en',
      };
      if (selectedLossType !== 'ALL') params.lossType = selectedLossType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

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

  // Memoized Sort & Slicing
  const sortedHistory = useMemo(() => {
    const list = [...history];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'DATE':
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'PRODUCT':
          comparison = (a.productName || '').localeCompare(b.productName || '');
          break;
        case 'INCIDENT':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        case 'QTY':
          comparison = (a.absQuantity || 0) - (b.absQuantity || 0);
          break;
        case 'COST_LOSS':
          comparison = (a.totalCostValue || 0) - (b.totalCostValue || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [history, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLossType, startDate, endDate, search]);

  const totalItems = sortedHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedHistory = useMemo(() => {
    return sortedHistory.slice(startIndex, endIndex);
  }, [sortedHistory, startIndex, endIndex]);

  const handleSort = (field: LossSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'DATE' || field === 'COST_LOSS' || field === 'QTY' ? 'desc' : 'asc');
    }
  };

  const lossBadgeConfig: Record<string, { label: string; icon: any; className: string }> = {
    DAMAGE: {
      label: t('loss.badgeDamage', 'Damaged'),
      icon: Flame,
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    EXPIRED: {
      label: t('loss.badgeExpired', 'Expired'),
      icon: Clock,
      className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    },
    DEFECTIVE: {
      label: t('loss.badgeDefective', 'Defective'),
      icon: ShieldAlert,
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
    LOST: {
      label: t('loss.badgeLost', 'Lost / Theft'),
      icon: PackageMinus,
      className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    },
    SHRINKAGE: {
      label: t('loss.badgeShrinkage', 'Discrepancy'),
      icon: AlertTriangle,
      className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    },
    INTERNAL_USE: {
      label: t('loss.badgeInternal', 'Store Use'),
      icon: Boxes,
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 neu-card-lg rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Loss */}
        <div className="p-5 rounded-3xl neu-card-sm space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiCostLoss', 'Total Cost Loss (OPEX)')}
            </span>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {format(convert(summary.totalLossCost || 0, baseCode, currentCurrency), currentCurrency)}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {t('loss.kpiCostLossSub', 'Direct write-off from COGS')}
          </p>
        </div>

        {/* Total Items Lost */}
        <div className="p-5 rounded-3xl neu-card-sm space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiItemsCount', 'Total Units Lost')}
            </span>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-amber-500 flex items-center justify-center">
              <PackageMinus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {(summary.totalItemsLost || 0).toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">{t('loss.unitPcs', 'pcs')}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {t('loss.kpiItemsCountSub', 'Across all batches & reasons')}
          </p>
        </div>

        {/* Total Retail Lost */}
        <div className="p-5 rounded-3xl neu-card-sm space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiRetailLoss', 'Retail Value Lost')}
            </span>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-purple-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono tracking-tight">
            {format(convert(summary.totalLossRetail || 0, baseCode, currentCurrency), currentCurrency)}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {t('loss.kpiRetailLossSub', 'Lost sales potential')}
          </p>
        </div>

        {/* Incidents Recorded */}
        <div className="p-5 rounded-3xl neu-card-sm space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t('loss.kpiIncidents', 'Total Loss Incidents')}
            </span>
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {(summary.totalRecords || 0).toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">{t('loss.unitRecords', 'records')}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {t('loss.kpiIncidentsSub', 'Audit log movements')}
          </p>
        </div>
      </div>

      {/* Control Header & Filters */}
      <div className="neu-card-lg rounded-3xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 neu-btn-danger text-white font-black text-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('loss.btnRecordLoss', 'Record Stock Loss / Write-off')}</span>
            </button>
            <button
              onClick={fetchLossHistory}
              className="w-9 h-9 neu-circle-btn text-slate-600 dark:text-slate-300 cursor-pointer"
              title={t('common.refresh', 'Refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Export & Date Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-36">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={t('reports.startDate', 'Start Date...')}
                  presets={false}
                />
              </div>
              <span className="text-slate-400 font-bold text-xs">—</span>
              <div className="w-36">
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={t('reports.endDate', 'End Date...')}
                  presets={false}
                />
              </div>
            </div>

            <button
              onClick={handleExportLoss}
              disabled={exportState === 'loading'}
              className="h-10 px-4 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-neu-glow-emerald active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {exportState === 'loading'
                  ? t('reports.generating', 'Generating…')
                  : t('loss.exportLossExcel', 'Export Loss Excel')}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Badges & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/60">
          <div className="neu-tab-container p-1 rounded-2xl flex flex-wrap items-center gap-1">
            {['ALL', 'DAMAGE', 'EXPIRED', 'DEFECTIVE', 'LOST', 'SHRINKAGE', 'INTERNAL_USE'].map((type) => {
              const label =
                type === 'ALL'
                  ? t('common.all', 'All Types')
                  : lossBadgeConfig[type]?.label || type;
              const isSelected = selectedLossType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedLossType(type)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                    isSelected
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('loss.searchPlaceholder', 'Search item, SKU, notes...')}
              className="w-full h-9 pl-10 pr-4 neu-input text-xs font-medium text-slate-800 dark:text-white outline-none"
            />
          </form>
        </div>
      </div>

      {/* Loss Records Table */}
      <div className="neu-card-lg rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between">
          <div className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <PackageMinus className="w-4 h-4 text-rose-500" />
            <span>{t('loss.historyTableTitle', 'Loss & Write-off Audit Trail')}</span>
          </div>
          <div className="text-xs text-slate-400 font-bold">
            {totalItems === 0
              ? t('loss.zeroRecords', '0 records')
              : t('loss.showingRecords', 'Showing {{start}}–{{end}} of {{total}} records', {
                  start: startIndex + 1,
                  end: endIndex,
                  total: totalItems,
                })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="neu-surface text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none">
              <tr>
                <th
                  onClick={() => handleSort('DATE')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('loss.colDate', 'Date & Time')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${sortField === 'DATE' ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('PRODUCT')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('loss.colProduct', 'Product & SKU')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'PRODUCT' ? 'text-emerald-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('INCIDENT')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('loss.colType', 'Loss Incident')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'INCIDENT' ? 'text-emerald-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>
                <th className="p-4">{t('loss.colBatch', 'Batch / WH')}</th>
                <th
                  onClick={() => handleSort('QTY')}
                  className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('loss.colQty', 'Qty Deducted')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${sortField === 'QTY' ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                  </div>
                </th>
                <th className="p-4 text-right">{t('loss.colUnitCost', 'Unit Cost')}</th>
                <th
                  onClick={() => handleSort('COST_LOSS')}
                  className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('loss.colCostLoss', 'Cost Loss (P&L)')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'COST_LOSS' ? 'text-emerald-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>
                <th className="p-4">{t('loss.colRecordedBy', 'Recorded By / Notes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    <span>{t('common.loading', 'Loading audit records...')}</span>
                  </td>
                </tr>
              ) : paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <PackageMinus className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-xs">{t('loss.noRecords', 'No loss records found for this period')}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('loss.noRecordsSub', 'Click "+ Record Stock Loss" to log damaged or expired inventory.')}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => {
                  const cfg = lossBadgeConfig[item.type] || {
                    label: item.type,
                    icon: AlertTriangle,
                    className: 'neu-pill text-slate-700 dark:text-slate-300',
                  };
                  const Icon = cfg.icon;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-500/5 transition-colors"
                    >
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {item.productName || t('loss.unknownProduct', 'Unknown Product')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.sku || item.barcode || '—'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black neu-pill ${cfg.className}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {item.batchNumber || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.warehouseName || t('inventory.centralWarehouse', 'Central Warehouse & Cold Storage')}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-black text-sm text-rose-600 dark:text-rose-400 font-mono">
                          -{item.absQuantity}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500">
                        {format(item.cost || 0, baseCode)}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        {format(
                          convert(item.totalCostValue || 0, baseCode, currentCurrency),
                          currentCurrency
                        )}
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {item.createdByName || t('loss.staffDefault', 'Staff')}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate" title={item.notes}>
                          {item.notes || '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Footer Bar */}
        <div className="p-4 border-t border-slate-200/40 dark:border-slate-800/60 neu-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Left: Page Size Selector */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-semibold">{t('loss.recordsPerPage', 'Records per page:')}</span>
            <div className="w-24">
              <CustomSelect
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                options={[
                  { value: '10', label: '10' },
                  { value: '25', label: '25' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                  { value: '999999', label: t('loss.allWithCount', `All (${totalItems})`, { total: totalItems }) },
                ]}
                size="sm"
                dropdownWidth="w-28"
              />
            </div>

            <span className="text-slate-400 font-medium">
              {t('loss.pageOf', 'Page {{current}} of {{total}}', { current: effectivePage, total: totalPages })}
            </span>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={effectivePage <= 1}
              className="w-8 h-8 rounded-xl neu-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              title={t('common.firstPage', 'First Page')}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={effectivePage <= 1}
              className="w-8 h-8 rounded-xl neu-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              title={t('common.previousPage', 'Previous Page')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 1)
              .map((pageNumber, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <React.Fragment key={pageNumber}>
                    {prev && pageNumber - prev > 1 && (
                      <span className="px-1 text-slate-400 font-bold select-none">…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        pageNumber === effectivePage
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                          : 'neu-btn text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={effectivePage >= totalPages}
              className="w-8 h-8 rounded-xl neu-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              title={t('common.nextPage', 'Next Page')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={effectivePage >= totalPages}
              className="w-8 h-8 rounded-xl neu-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              title={t('common.lastPage', 'Last Page')}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Loss Modal */}
      <RecordLossModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchLossHistory();
          onRefreshStock();
          showToast('Stock loss written off and updated in inventory and accounting', 'success');
        }}
        stockList={stockList}
      />
    </div>
  );
};
