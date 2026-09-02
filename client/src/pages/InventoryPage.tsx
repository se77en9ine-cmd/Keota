import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { soundFX } from '../utils/audio';
import {
  Boxes,
  ArrowLeftRight,
  AlertTriangle,
  Clock,
  Search,
  Download,
  CheckCircle2,
  PackageMinus,
  Plus,
  Layers,
  Sparkles,
  Edit,
  Package,
  TrendingUp,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Warehouse,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  RotateCcw,
  Tag,
  Calendar,
} from 'lucide-react';
import { RecordLossModal } from '../components/inventory/RecordLossModal';
import { LossManagementTab } from '../components/inventory/LossManagementTab';
import { LocationManagerTab } from '../components/inventory/LocationManagerTab';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { ExpiryBadge } from '../components/common/ExpiryBadge';
import { useSettingsStore } from '../store/useSettingsStore';

export type StockSortField = 'NAME_SKU' | 'WAREHOUSE' | 'BATCH' | 'EXPIRY' | 'QTY' | 'AVG_COST' | 'TOTAL_VALUE';

export const InventoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { expiryTagConfig } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LOSS' | 'LOCATIONS'>('STOCK');
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Expiry Thresholds from Config
  const criticalDays = expiryTagConfig?.tiers?.critical?.daysThreshold ?? 7;
  const warningDays = expiryTagConfig?.tiers?.warning?.daysThreshold ?? 30;

  // ── Multi-Facet Filter & Sort State ──
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL'); // ALL, LOW, OUT_OF_STOCK, EXPIRING_CRITICAL, EXPIRING_WARNING, EXPIRED
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<StockSortField>('TOTAL_VALUE');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25); // 10, 25, 50, 100, 999999

  const [isRecordLossModalOpen, setIsRecordLossModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory');
      setStock(res.data.inventory || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Calculate Metrics
  const totalValuationBase = stock.reduce((sum, item) => sum + (item.quantity || 0) * (item.avgCost || 0), 0);
  const totalValuation = convert(totalValuationBase, baseCode, currentCurrency);
  const totalUnits = stock.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const nowStr = new Date().toISOString().split('T')[0];
  const inCriticalDays = new Date(Date.now() + criticalDays * 86400000).toISOString().split('T')[0];
  const inWarningDays = new Date(Date.now() + warningDays * 86400000).toISOString().split('T')[0];

  const lowStockItems = stock.filter((s) => (s.quantity || 0) <= 10);
  const expiringCriticalItems = stock.filter((s) => s.expiryDate && s.expiryDate <= inCriticalDays && s.quantity > 0);
  const expiringWarningItems = stock.filter((s) => s.expiryDate && s.expiryDate <= inWarningDays && s.quantity > 0);

  // Distinct Warehouses
  const warehouses = useMemo(() => {
    return Array.from(new Set(stock.map((s) => s.warehouseName).filter(Boolean)));
  }, [stock]);

  // High-Performance Memoized Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let list = stock.filter((s) => {
      // Warehouse Filter
      if (warehouseFilter !== 'ALL' && s.warehouseName !== warehouseFilter) return false;

      // Status / Expiry Filter
      if (filterMode === 'LOW' && (s.quantity || 0) > 10) return false;
      if (filterMode === 'OUT_OF_STOCK' && (s.quantity || 0) > 0) return false;
      if (filterMode === 'EXPIRING_CRITICAL' && (!s.expiryDate || s.expiryDate > inCriticalDays || s.quantity <= 0)) return false;
      if (filterMode === 'EXPIRING_WARNING' && (!s.expiryDate || s.expiryDate > inWarningDays || s.quantity <= 0)) return false;
      if (filterMode === 'EXPIRED' && (!s.expiryDate || s.expiryDate >= nowStr || s.quantity <= 0)) return false;

      // Search Query
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matchesSearch =
          s.productName?.toLowerCase().includes(term) ||
          s.sku?.toLowerCase().includes(term) ||
          s.barcode?.toLowerCase().includes(term) ||
          s.batchNumber?.toLowerCase().includes(term) ||
          s.warehouseName?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'NAME_SKU':
          comparison = (a.productName || '').localeCompare(b.productName || '');
          break;
        case 'WAREHOUSE':
          comparison = (a.warehouseName || '').localeCompare(b.warehouseName || '');
          break;
        case 'BATCH':
          comparison = (a.batchNumber || '').localeCompare(b.batchNumber || '');
          break;
        case 'EXPIRY':
          if (!a.expiryDate && !b.expiryDate) comparison = 0;
          else if (!a.expiryDate) comparison = 1;
          else if (!b.expiryDate) comparison = -1;
          else comparison = a.expiryDate.localeCompare(b.expiryDate);
          break;
        case 'QTY':
          comparison = (a.quantity || 0) - (b.quantity || 0);
          break;
        case 'AVG_COST':
          comparison = (a.avgCost || 0) - (b.avgCost || 0);
          break;
        case 'TOTAL_VALUE':
          const valA = (a.quantity || 0) * (a.avgCost || 0);
          const valB = (b.quantity || 0) * (b.avgCost || 0);
          comparison = valA - valB;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [stock, warehouseFilter, filterMode, search, sortField, sortDirection, inCriticalDays, inWarningDays, nowStr]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [warehouseFilter, filterMode, search]);

  // Pagination Slicing
  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedStock = useMemo(() => {
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, startIndex, endIndex]);

  const handleSort = (field: StockSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'TOTAL_VALUE' || field === 'QTY' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters =
    filterMode !== 'ALL' ||
    warehouseFilter !== 'ALL' ||
    search.trim().length > 0;

  const resetAllFilters = () => {
    setFilterMode('ALL');
    setWarehouseFilter('ALL');
    setSearch('');
    setCurrentPage(1);
  };

  // ── Export Button State Machine ──
  type ExportState = 'idle' | 'loading' | 'success' | 'error';
  const [inventoryExportState, setInventoryExportState] = useState<ExportState>('idle');
  const [exportToast, setExportToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const exportToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showExportToast = (text: string, type: 'success' | 'error') => {
    if (exportToastTimer.current) clearTimeout(exportToastTimer.current);
    setExportToast({ text, type });
    exportToastTimer.current = setTimeout(() => setExportToast(null), 3200);
  };

  const handleExportInventory = async () => {
    if (inventoryExportState === 'loading') return;
    setInventoryExportState('loading');
    soundFX.playCashSuccess();
    try {
      const res = await api.get('/export/inventory/excel', {
        params: {
          currency: currentCurrency || 'USD',
          lang: i18n.language || 'en',
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `39pos_inventory_valuation_${currentCurrency || 'USD'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setInventoryExportState('success');
      showExportToast(t('inventory.excelDownloaded', { defaultValue: `${filename} downloaded successfully (${currentCurrency})` }), 'success');
      setTimeout(() => setInventoryExportState('idle'), 2500);
    } catch (err: any) {
      setInventoryExportState('error');
      const msg = err?.response?.data?.message || err?.message || 'Download failed';
      showExportToast(`Export failed: ${msg}`, 'error');
      setTimeout(() => setInventoryExportState('idle'), 2000);
    }
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-200 text-xs">
      {/* Toast Notification */}
      {exportToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            exportToast.type === 'success'
              ? 'neu-card-sm text-emerald-600 dark:text-emerald-400'
              : 'neu-card-sm text-rose-600 dark:text-rose-400'
          }`}
        >
          {exportToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
          <span>{exportToast.text}</span>
        </div>
      )}

      {/* 🌟 1. Executive Inventory Hero & Action Header (Fixed) */}
      <div className="flex-shrink-0 p-4 sm:p-5 neu-card-lg rounded-3xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-pill text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'LOCATIONS'
                    ? t('locations.badgeVisualMapping', 'Visual 2D Shelf & Aisle Layout')
                    : t('inventory.badgeFifoCosting', 'FIFO Costing & Batch Real-Time Ledger')}
                </span>
              </span>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold neu-sunken-sm text-slate-500 dark:text-slate-400">
                {t('inventory.badgeActiveBatches', '{{count}} Active Batches & SKUs', { count: stock.length })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center">
                {activeTab === 'STOCK' ? (
                  <Boxes className="w-6 h-6 text-emerald-500" />
                ) : activeTab === 'LOSS' ? (
                  <PackageMinus className="w-6 h-6 text-rose-500" />
                ) : (
                  <Layers className="w-6 h-6 text-indigo-500" />
                )}
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {activeTab === 'STOCK'
                    ? t('inventory.heroTitle', 'Inventory & Stock Valuation Control')
                    : activeTab === 'LOSS'
                    ? t('loss.heroTitle', 'Stock Loss & Waste Audit Trail')
                    : t('locations.heroTitle', 'Store Floor Layout & Shelf Mapping')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {activeTab === 'STOCK'
                    ? t(
                        'inventory.heroSubtitle',
                        'Multi-warehouse stock balances, FIFO asset valuation, batch expiry tracking, and instant stocktake adjustments.'
                      )
                    : activeTab === 'LOSS'
                    ? t(
                        'loss.heroSubtitle',
                        'Comprehensive shrinkage ledger tracking damaged, expired, lost, and internal-use stock deductions.'
                      )
                    : t(
                        'locations.heroSubtitle',
                        'Interactive visual minimark gondolas, kitchen prep stations, and tiered shelf space allocation.'
                      )}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            {activeTab === 'STOCK' && (
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="px-4 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('inventory.btnAddProduct', '+ Add New Product')}</span>
              </button>
            )}

            {activeTab !== 'LOCATIONS' && (
              <button
                type="button"
                onClick={() => setIsRecordLossModalOpen(true)}
                className="px-4 py-2.5 neu-btn-danger text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <PackageMinus className="w-4 h-4" />
                <span>{t('inventory.btnRecordLoss', 'Record Stock Loss')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 2. Tab Switcher (Fixed) */}
      <div className="flex-shrink-0 p-1 neu-tab-container rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('STOCK');
            soundFX.playBeep();
          }}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'STOCK'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{t('inventory.tabStockValuation', 'Stock & Batch Valuation')}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono neu-pill text-emerald-600 dark:text-emerald-400">
            {stock.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('LOSS');
            soundFX.playBeep();
          }}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'LOSS'
              ? 'neu-tab-active text-rose-600 dark:text-rose-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <PackageMinus className="w-4 h-4 text-rose-500" />
          <span>{t('inventory.tabLossManagement', 'Loss & Waste Management')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('LOCATIONS');
            soundFX.playBeep();
          }}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'LOCATIONS'
              ? 'neu-tab-active text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>{t('locations.tabTitle', 'Locations & Shelf Mapping')}</span>
        </button>
      </div>

      {/* Main Tab Content Pane (Scrollable Body) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin space-y-4">
        {/* 🌟 3. Top 4 Stock Health Summary Cards (Rendered ONLY on Stock tab) */}
        {activeTab === 'STOCK' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
          {/* KPI 1: Total Valuation */}
          <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {t('inventory.totalValuationTitle', 'Total Inventory Valuation')}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div
              title={format(totalValuation, currentCurrency)}
              className={`font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono tabular-nums break-all leading-tight min-h-[2.5rem] flex items-center ${
                format(totalValuation, currentCurrency).length > 24
                  ? 'text-sm sm:text-base xl:text-lg'
                  : format(totalValuation, currentCurrency).length > 18
                  ? 'text-base sm:text-lg xl:text-xl'
                  : format(totalValuation, currentCurrency).length > 13
                  ? 'text-lg sm:text-xl xl:text-2xl'
                  : 'text-2xl lg:text-3xl'
              }`}
            >
              {format(totalValuation, currentCurrency)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50 truncate">
              {currentCurrency !== baseCode && (
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  ≈ {format(totalValuationBase, baseCode)} •{' '}
                </span>
              )}
              <span>{t('inventory.fifoAssetBalance', 'FIFO Average Cost Asset Balance')}</span>
            </div>
          </div>

          {/* KPI 2: Total Units */}
          <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {t('inventory.totalUnitsTitle', 'Total Physical Stock')}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-indigo-500 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div
              title={`${(totalUnits || 0).toLocaleString()} Units`}
              className={`font-black text-slate-900 dark:text-white tracking-tight font-mono tabular-nums break-all leading-tight min-h-[2.5rem] flex items-center flex-wrap gap-1 ${
                `${(totalUnits || 0).toLocaleString()} Units`.length > 24
                  ? 'text-sm sm:text-base xl:text-lg'
                  : `${(totalUnits || 0).toLocaleString()} Units`.length > 18
                  ? 'text-base sm:text-lg xl:text-xl'
                  : `${(totalUnits || 0).toLocaleString()} Units`.length > 13
                  ? 'text-lg sm:text-xl xl:text-2xl'
                  : 'text-2xl lg:text-3xl'
              }`}
            >
              <span>{(totalUnits || 0).toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400">{t('inventory.unitUnits', 'Units')}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50 truncate">
              {t('inventory.acrossWarehouses', 'Across {{count}} Store Warehouses', { count: warehouses.length || 1 })}
            </div>
          </div>

          {/* KPI 3: Low Stock Alerts */}
          <div
            onClick={() => setFilterMode(filterMode === 'LOW' ? 'ALL' : 'LOW')}
            className={`p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3 min-w-0 cursor-pointer transition-all ${
              filterMode === 'LOW'
                ? 'neu-sunken text-amber-600 dark:text-amber-400'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {t('inventory.lowStockAlertTitle', 'Low Stock Alert')}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-amber-500 tracking-tight font-mono">
              {lowStockItems.length} <span className="text-xs font-bold text-amber-500">{t('inventory.skusRequireReorder', 'SKUs')}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50 truncate">
              {t('inventory.clickToFilterLow', 'Click to filter ≤10 items remaining')}
            </div>
          </div>

          {/* KPI 4: Expiry Urgent Warning */}
          <div
            onClick={() => setFilterMode(filterMode === 'EXPIRING_CRITICAL' ? 'ALL' : 'EXPIRING_CRITICAL')}
            className={`p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3 cursor-pointer transition-all ${
              filterMode === 'EXPIRING_CRITICAL'
                ? 'neu-sunken text-rose-600 dark:text-rose-400'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {t('inventory.expiring14Title', 'Expiring in ≤{{days}} Days', { days: criticalDays })}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-rose-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-rose-500 tracking-tight font-mono">
              {expiringCriticalItems.length} <span className="text-xs font-bold text-rose-500">{t('inventory.batchesActive', 'Batches')}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
              {t('inventory.clickToFilterExpiry', 'Click to filter urgent FEFO items')}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 4. TAB 1: Stock & Batch Valuation Table */}
      {activeTab === 'STOCK' ? (
        <div className="rounded-3xl neu-card-lg overflow-hidden space-y-0 text-xs">
          {/* Multi-Facet Filter Toolbar */}
          <div className="p-4 border-b border-slate-200/40 dark:border-slate-800/60 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative min-w-[220px] flex-1 max-w-xs">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('inventory.searchPlaceholder', 'Search product, batch, SKU, warehouse...')}
                    className="w-full pl-10 pr-3.5 py-2 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                {/* Warehouse Dropdown Filter */}
                <div className="w-44">
                  <CustomSelect
                    value={warehouseFilter}
                    onChange={(val) => setWarehouseFilter(val)}
                    options={[
                      {
                        value: 'ALL',
                        label: t('inventory.allWarehouses', 'All Warehouses'),
                        icon: <Building2 className="w-3.5 h-3.5 text-emerald-500" />,
                      },
                      ...warehouses.map((wh) => ({
                        value: wh,
                        label: wh,
                        icon: <Warehouse className="w-3.5 h-3.5 text-slate-400" />,
                      })),
                    ]}
                    size="sm"
                    dropdownWidth="w-56"
                  />
                </div>

                {/* Stock & Expiry Status Dropdown Filter */}
                <div className="w-52">
                  <CustomSelect
                    value={filterMode}
                    onChange={(val) => setFilterMode(val)}
                    options={[
                      {
                        value: 'ALL',
                        label: t('inventory.allStockStatuses', 'All Stock Statuses'),
                        icon: <Boxes className="w-3.5 h-3.5 text-emerald-500" />,
                      },
                      {
                        value: 'LOW',
                        label: t('inventory.lowStockOption', 'Low Stock (≤ 10)'),
                        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
                      },
                      {
                        value: 'OUT_OF_STOCK',
                        label: t('inventory.outOfStockOption', 'Out of Stock (0)'),
                        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
                      },
                      {
                        value: 'EXPIRING_CRITICAL',
                        label: t('inventory.expiring14Option', 'Urgent Expiry (≤ {{days}}d)', { days: criticalDays }),
                        icon: <Clock className="w-3.5 h-3.5 text-rose-500" />,
                      },
                      {
                        value: 'EXPIRING_WARNING',
                        label: t('inventory.expiring30Option', 'Near Expiry (≤ {{days}}d)', { days: warningDays }),
                        icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
                      },
                      {
                        value: 'EXPIRED',
                        label: t('inventory.expiredOption', 'Expired Batches'),
                        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
                      },
                    ]}
                    size="sm"
                    dropdownWidth="w-64"
                  />
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="w-8 h-8 neu-circle-btn text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                    title={t('inventory.resetActiveFilters', 'Clear all active filters')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Right: Summary, Tag Styles Launcher & Export Excel */}
              <div className="flex items-center gap-2.5 justify-between lg:justify-end flex-shrink-0">
                <div className="text-xs text-slate-400 font-bold hidden sm:block">
                  {totalItems === 0
                    ? t('inventory.zeroItemsFound', '0 items found')
                    : t('inventory.showingBatches', 'Showing {{start}}–{{end}} of {{total}} batches', {
                        start: startIndex + 1,
                        end: endIndex,
                        total: totalItems,
                      })}
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/settings?tab=EXPIRY_TAGS')}
                  className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-200 hover:text-rose-500 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={t('expiryTags.tagStylesTooltip', 'Configure expiration tag colors, opacity, and days thresholds')}
                >
                  <Tag className="w-3.5 h-3.5 text-rose-500" />
                  <span>{t('expiryTags.tagStylesLauncher', 'Tag Styles')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportInventory}
                  disabled={inventoryExportState === 'loading'}
                  className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {inventoryExportState === 'loading'
                      ? t('common.exporting', 'Exporting...')
                      : t('inventory.btnExportExcel', 'Export Stock Excel')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop View: Multi-Column Table with Interactive Header Sorting */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('NAME_SKU')}
                    className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('inventory.colProductNameSku', 'PRODUCT NAME & SKU')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortField === 'NAME_SKU' ? 'text-emerald-500' : 'opacity-30'
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('WAREHOUSE')}
                    className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('inventory.colWarehouse', 'WAREHOUSE')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortField === 'WAREHOUSE' ? 'text-emerald-500' : 'opacity-30'
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('BATCH')}
                    className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('inventory.colBatchNumber', 'BATCH NUMBER')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortField === 'BATCH' ? 'text-emerald-500' : 'opacity-30'
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('EXPIRY')}
                    className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('inventory.colExpiryDate', 'EXPIRY DATE (FEFO)')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortField === 'EXPIRY' ? 'text-emerald-500' : 'opacity-30'
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('QTY')}
                    className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t('inventory.colQuantity', 'QUANTITY')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${sortField === 'QTY' ? 'text-emerald-500' : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('AVG_COST')}
                    className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t('inventory.colAvgCost', 'AVERAGE COST')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortField === 'AVG_COST' ? 'text-emerald-500' : 'opacity-30'
                        }`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('TOTAL_VALUE')}
                    className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t('inventory.colTotalValue', 'TOTAL VALUE')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortField === 'TOTAL_VALUE' ? 'text-emerald-500' : 'opacity-30'
                        }`}
                      />
                    </div>
                  </th>
                  <th className="p-4 text-center">{t('common.actions', 'ACTIONS')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                        <span className="font-semibold">{t('common.loading', 'Loading inventory ledger...')}</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedStock.length > 0 ? (
                  paginatedStock.map((item) => {
                    const isLow = (item.quantity || 0) <= 10;
                    const rawBaseValuation = (item.quantity || 0) * (item.avgCost || 0);
                    const rowValuation = convert(rawBaseValuation, baseCode, currentCurrency);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-500/5 transition-colors"
                      >
                        {/* Product Name & SKU */}
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {item.productName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {item.sku || 'SKU-NONE'}
                          </div>
                        </td>

                        {/* Warehouse */}
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold neu-sunken-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{item.warehouseName || t('inventory.centralWarehouse', 'Central Warehouse & Cold Storage')}</span>
                          </span>
                        </td>

                        {/* Batch Number */}
                        <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                          {item.batchNumber || '—'}
                        </td>

                        {/* Expiry Date */}
                        <td className="p-4">
                          {item.expiryDate ? (
                            <div className="flex flex-col items-start gap-1">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg neu-sunken-sm font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                <Calendar className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                <span>{item.expiryDate}</span>
                              </div>
                              <ExpiryBadge expiryDate={item.expiryDate} forceShow={true} />
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="p-4 text-right font-mono font-black text-sm whitespace-nowrap tabular-nums">
                          <span className={isLow ? 'text-amber-500' : 'text-slate-900 dark:text-white'}>
                            {(item.quantity || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Average Cost */}
                        <td className="p-4 text-right font-mono whitespace-nowrap tabular-nums">
                          <div className="font-bold text-slate-700 dark:text-slate-200">
                            {format(convert(item.avgCost || 0, baseCode, currentCurrency), currentCurrency)}
                          </div>
                          {currentCurrency !== baseCode && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {format(item.avgCost || 0, baseCode)}
                            </div>
                          )}
                        </td>

                        {/* Total Value */}
                        <td className="p-4 text-right font-mono whitespace-nowrap tabular-nums">
                          <div className="font-black text-emerald-600 dark:text-emerald-400">
                            {format(rowValuation, currentCurrency)}
                          </div>
                          {currentCurrency !== baseCode && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {format(rawBaseValuation, baseCode)}
                            </div>
                          )}
                        </td>

                        {/* Quick Actions (Adjust Stock & Edit Product) */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingItem(item);
                                soundFX.playBeep();
                              }}
                              className="px-2.5 py-1 neu-btn text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] cursor-pointer"
                              title={t('inventory.adjustTitle', 'Adjust Stock Quantity')}
                            >
                              {t('inventory.btnAdjust', 'Adjust')}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/products?search=${encodeURIComponent(item.productName || item.sku)}`
                                )
                              }
                              className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                              title={t('inventory.editTitle', 'Edit Product Details')}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-slate-400 opacity-50" />
                        <span className="font-semibold text-xs">{t('inventory.noMatchingItems', 'No matching inventory items found')}</span>
                        <span className="text-[11px] text-slate-400 opacity-80">
                          {hasActiveFilters ? (
                            <button
                              type="button"
                              onClick={resetAllFilters}
                              className="text-emerald-600 dark:text-emerald-400 underline font-bold cursor-pointer"
                            >
                              {t('inventory.resetActiveFilters', 'Reset active filters')}
                            </button>
                          ) : (
                            t('inventory.addOrImportHint', 'Add or import products to track physical stock.')
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Enterprise Pagination Footer Bar */}
          <div className="p-3.5 neu-sunken-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Left: Page Size Selector */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold">{t('inventory.batchesPerPage', 'Batches per page:')}</span>
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
                    { value: '999999', label: t('inventory.allWithCount', `All (${totalItems})`, { total: totalItems }) },
                  ]}
                  size="sm"
                  placement="up"
                  dropdownWidth="w-28"
                />
              </div>

              <span className="text-slate-400 font-medium">
                {t('inventory.pageOf', 'Page {{current}} of {{total}}', { current: effectivePage, total: totalPages })}
              </span>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={effectivePage <= 1}
                className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title={t('common.firstPage', 'First Page')}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={effectivePage <= 1}
                className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
                            ? 'neu-btn-primary text-white'
                            : 'neu-btn text-slate-700 dark:text-slate-300'
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
                className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title={t('common.nextPage', 'Next Page')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={effectivePage >= totalPages}
                className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title={t('common.lastPage', 'Last Page')}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'LOSS' ? (
        <LossManagementTab stockList={stock} onRefreshStock={fetchInventory} />
      ) : (
        <LocationManagerTab stockList={stock} onRefreshStock={fetchInventory} />
      )}
      </div>

      {/* Record Loss Modal */}
      <RecordLossModal
        isOpen={isRecordLossModalOpen}
        onClose={() => setIsRecordLossModalOpen(false)}
        onSuccess={fetchInventory}
        stockList={stock}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        onSuccess={fetchInventory}
        inventoryItem={adjustingItem}
      />
    </div>
  );
};

export default InventoryPage;
