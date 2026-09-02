import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import {
  Truck,
  Plus,
  FileText,
  CheckCircle2,
  Search,
  X,
  Building2,
  Warehouse,
  Boxes,
  Calendar,
  DollarSign,
  Coins,
  Clock,
  Ban,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Filter,
  ArrowDownRight,
  Printer,
  PackageCheck,
  Package,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { PurchaseAuditDrawer } from '../components/purchases/PurchaseAuditDrawer';
import { CreatePurchaseOrderModal } from '../components/purchases/CreatePurchaseOrderModal';
import { EditPurchaseOrderModal } from '../components/purchases/EditPurchaseOrderModal';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';

export type PoSortField = 'DATE' | 'PO_NO' | 'SUPPLIER' | 'WAREHOUSE' | 'ITEMS' | 'AMOUNT' | 'STATUS';

export const PurchasesPage: React.FC = () => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<PoSortField>('DATE');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25); // 10, 25, 50, 100, 999999

  // Modals & Drawer State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetPo, setEditTargetPo] = useState<any | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Delete Confirm Modal State
  const [deleteTargetPo, setDeleteTargetPo] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'USD';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purRes, metaRes, prodRes, whRes] = await Promise.all([
        api.get('/purchases').catch(() => ({ data: { purchases: [] } })),
        api.get('/products/meta').catch(() => ({ data: { suppliers: [] } })),
        api.get('/products').catch(() => ({ data: { products: [] } })),
        api.get('/inventory/warehouses').catch(() => ({ data: { warehouses: [] } })),
      ]);
      setPurchases(purRes.data.purchases || []);
      setSuppliers(metaRes.data.suppliers || []);
      setProducts(prodRes.data.products || []);
      setWarehouses(whRes.data.warehouses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Date Presets
  const applyPreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      const past7Str = `${past7.getFullYear()}-${(past7.getMonth() + 1).toString().padStart(2, '0')}-${past7.getDate().toString().padStart(2, '0')}`;
      setStartDate(past7Str);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // High-Performance Memoized Filter & Sort
  const filteredAndSortedPurchases = useMemo(() => {
    let list = purchases.filter((po) => {
      // Date Range
      if (startDate || endDate) {
        const d = po.createdAt ? po.createdAt.slice(0, 10) : '';
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ORDERED') {
          if (po.status !== 'ORDERED' && po.status !== 'PENDING') return false;
        } else if (po.status !== statusFilter) {
          return false;
        }
      }

      // Supplier Filter
      if (selectedSupplier !== 'ALL' && po.supplierId !== selectedSupplier) {
        return false;
      }

      // Warehouse Filter
      if (selectedWarehouse !== 'ALL' && po.warehouseId !== selectedWarehouse) {
        return false;
      }

      // Universal Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invoiceMatch = (po.invoiceNo || '').toLowerCase().includes(q);
        const supplierMatch = (po.supplierName || '').toLowerCase().includes(q);
        const whMatch = (po.warehouseName || '').toLowerCase().includes(q);
        const notesMatch = (po.notes || '').toLowerCase().includes(q);
        if (!invoiceMatch && !supplierMatch && !whMatch && !notesMatch) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'DATE':
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'PO_NO':
          comparison = (a.invoiceNo || '').localeCompare(b.invoiceNo || '', undefined, { numeric: true });
          break;
        case 'SUPPLIER':
          comparison = (a.supplierName || '').localeCompare(b.supplierName || '');
          break;
        case 'WAREHOUSE':
          comparison = (a.warehouseName || '').localeCompare(b.warehouseName || '');
          break;
        case 'ITEMS':
          const itemsA = a.itemsCount ?? a.items?.length ?? 0;
          const itemsB = b.itemsCount ?? b.items?.length ?? 0;
          comparison = itemsA - itemsB;
          break;
        case 'AMOUNT':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'STATUS':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [
    purchases,
    startDate,
    endDate,
    statusFilter,
    selectedSupplier,
    selectedWarehouse,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, statusFilter, selectedSupplier, selectedWarehouse, searchQuery]);

  // Pagination Slicing
  const totalItems = filteredAndSortedPurchases.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedPurchases = useMemo(() => {
    return filteredAndSortedPurchases.slice(startIndex, endIndex);
  }, [filteredAndSortedPurchases, startIndex, endIndex]);

  const handleSort = (field: PoSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'DATE' || field === 'AMOUNT' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    selectedSupplier !== 'ALL' ||
    selectedWarehouse !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    searchQuery.trim().length > 0;

  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setSelectedSupplier('ALL');
    setSelectedWarehouse('ALL');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Procurement KPIs
  const totalProcurementSpend = filteredAndSortedPurchases.reduce(
    (sum, po) => sum + (po.totalAmount || 0),
    0
  );
  const pendingArrivalsCount = filteredAndSortedPurchases.filter(
    (po) => po.status === 'ORDERED' || po.status === 'PENDING'
  ).length;
  const receivedShipmentsCount = filteredAndSortedPurchases.filter((po) => po.status === 'RECEIVED').length;

  const handleQuickReceive = async (poId: string) => {
    try {
      await api.post(`/purchases/${poId}/receive`);
      showToast('Purchase Order marked as RECEIVED and inventory stock updated', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to receive stock', 'error');
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTargetPo) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/purchases/${deleteTargetPo.id}`);
      showToast(`Purchase Order ${deleteTargetPo.invoiceNo} deleted successfully`, 'success');
      setDeleteTargetPo(null);
      if (drawerOpen && selectedPoId === deleteTargetPo.id) {
        setDrawerOpen(false);
        setSelectedPoId(null);
      }
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete Purchase Order', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDrawer = (id: string) => {
    setSelectedPoId(id);
    setDrawerOpen(true);
  };

  const openEditModal = (po: any) => {
    setEditTargetPo(po);
    setEditModalOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 ${
            toast.type === 'success'
              ? 'neu-card-sm text-emerald-600 dark:text-emerald-400'
              : 'neu-card-sm text-rose-600 dark:text-rose-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Ban className="w-4 h-4 text-rose-500" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-500">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {t('purchases.title', 'Purchases, Procurement & Receiving')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('purchases.subtitle', 'Manage vendor purchase orders, incoming stock dock receiving, batch lots, and inventory replenishment')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-neu-glow-emerald"
        >
          <Plus className="w-4 h-4" />
          <span>{t('purchases.btnCreatePo', 'Create Purchase Order')}</span>
        </button>
      </div>

      {/* Synchronized Date Filter Ribbon */}
      <div className="p-5 rounded-3xl neu-card-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-emerald-500" />
            <span>{t('purchases.procurementPeriod', 'Procurement Period:')}</span>
          </div>

          <div className="w-44">
            <CustomDatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder={t('accounting.fromDate', 'Start Date...')}
              presets={false}
            />
          </div>

          <span className="text-slate-400 font-bold text-xs">{t('common.to', 'to')}</span>

          <div className="w-44">
            <CustomDatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder={t('accounting.toDate', 'End Date...')}
              presets={false}
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="w-8 h-8 neu-circle-btn text-rose-500 cursor-pointer"
              title={t('common.reset', 'Reset')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 p-1 neu-tab-container text-xs rounded-2xl">
          <button
            type="button"
            onClick={() => applyPreset('today')}
            className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {t('reports.today', 'Today')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('7days')}
            className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {t('reports.last7days', 'Last 7 Days')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('month')}
            className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {t('reports.thisMonth', 'This Month')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {t('reports.allTime', 'All Time')}
          </button>
        </div>
      </div>

      {/* Bento Top KPI Cards (Fixed) */}
      <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('purchases.kpiTotalPurchaseValue', 'Total Purchase Value')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {format(convert(totalProcurementSpend, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('purchases.allProcurementOrders', 'All procurement expenditure')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('purchases.kpiTotalPoCount', 'Total Purchase Orders')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-indigo-500">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {filteredAndSortedPurchases.length} <span className="text-xs font-bold text-slate-400">Orders</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('purchases.acrossSuppliers', 'Across {{count}} suppliers', { count: suppliers.length })}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('purchases.kpiPendingDockArrival', 'Pending Dock Arrival')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {pendingArrivalsCount} <span className="text-xs font-bold text-amber-500">Inbound</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('purchases.awaitingReceiving', 'Awaiting physical receiving')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('purchases.kpiReceivedStocked', 'Received & Stocked')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {receivedShipmentsCount} <span className="text-xs font-bold text-emerald-500">Restocked</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('purchases.inInventoryStorage', 'In inventory storage')}
          </div>
        </div>
      </div>

      {/* Main Purchase Orders Table Section (Fills viewport) */}
      <div className="neu-card-lg rounded-3xl overflow-hidden flex-1 min-h-0 flex flex-col space-y-0 text-xs">
        {/* Table Search & Multi-Facet Filter Bar */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-slate-200/40 dark:border-slate-800/60 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('purchases.searchPlaceholder', 'Search PO#, Supplier, Warehouse...')}
                  className="w-full pl-9 pr-3.5 py-2 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Supplier Dropdown Filter */}
              <div className="w-44">
                <CustomSelect
                  value={selectedSupplier}
                  onChange={(val) => setSelectedSupplier(val)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('purchases.allSuppliers', 'All Suppliers'),
                      icon: <Building2 className="w-3.5 h-3.5 text-emerald-500" />,
                    },
                    ...suppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                      icon: <Building2 className="w-3.5 h-3.5 text-slate-400" />,
                    })),
                  ]}
                  size="sm"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Warehouse Dropdown Filter */}
              <div className="w-44">
                <CustomSelect
                  value={selectedWarehouse}
                  onChange={(val) => setSelectedWarehouse(val)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('purchases.allWarehouses', 'All Warehouses'),
                      icon: <Warehouse className="w-3.5 h-3.5 text-emerald-500" />,
                    },
                    ...warehouses.map((wh) => ({
                      value: wh.id,
                      label: wh.name,
                      icon: <Warehouse className="w-3.5 h-3.5 text-slate-400" />,
                    })),
                  ]}
                  size="sm"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="w-8 h-8 neu-circle-btn text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                  title={t('purchases.resetAllFilters', 'Clear all active filters')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Status Filter Badges & Summary */}
            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end flex-shrink-0">
              <div className="flex items-center gap-1 p-1 neu-tab-container rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {t('common.all', 'All')}
                </button>
                <button
                  onClick={() => setStatusFilter('ORDERED')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'ORDERED'
                      ? 'neu-tab-active text-amber-600 dark:text-amber-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {t('purchases.statusOrdered', 'Ordered')}
                </button>
                <button
                  onClick={() => setStatusFilter('RECEIVED')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'RECEIVED'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {t('purchases.statusReceived', 'Received')}
                </button>
                <button
                  onClick={() => setStatusFilter('CANCELLED')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'CANCELLED'
                      ? 'neu-tab-active text-rose-600 dark:text-rose-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {t('purchases.statusCancelled', 'Cancelled')}
                </button>
              </div>

              <div className="text-xs text-slate-400 font-bold ml-2">
                {totalItems === 0
                  ? t('purchases.zeroRecords', '0 records')
                  : t('purchases.showingRange', 'Showing {{start}}–{{end}} of {{total}}', {
                      start: startIndex + 1,
                      end: endIndex,
                      total: totalItems,
                    })}
              </div>
            </div>
          </div>
        </div>

        {/* PO Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none">
              <tr>
                <th
                  onClick={() => handleSort('PO_NO')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('purchases.colInvoiceNo', 'PO INVOICE #')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${sortField === 'PO_NO' ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('DATE')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('purchases.colOrderDate', 'ORDER DATE')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${sortField === 'DATE' ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('SUPPLIER')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('purchases.colSupplier', 'VENDOR SUPPLIER')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'SUPPLIER' ? 'text-emerald-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('WAREHOUSE')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('purchases.colDestinationWh', 'DESTINATION WH')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'WAREHOUSE' ? 'text-emerald-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ITEMS')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('purchases.colItemsLots', 'ITEMS / LOTS')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${sortField === 'ITEMS' ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('AMOUNT')}
                  className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('purchases.colTotalAmount', 'TOTAL AMOUNT')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${sortField === 'AMOUNT' ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('STATUS')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('purchases.colStatus', 'STATUS')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${sortField === 'STATUS' ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                  </div>
                </th>
                <th className="p-4 text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    <span>{t('purchases.loadingPo', 'Loading purchase orders...')}</span>
                  </td>
                </tr>
              ) : paginatedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-xs">{t('purchases.noPoFound', 'No purchase orders found for the selected filter')}</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 underline font-bold cursor-pointer"
                      >
                        {t('purchases.resetAllFilters', 'Reset all filters')}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((po) => {
                  const isReceived = po.status === 'RECEIVED';
                  const isOrdered = po.status === 'ORDERED' || po.status === 'PENDING';
                  const isCancelled = po.status === 'CANCELLED';

                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-500/5 transition-colors"
                    >
                      {/* PO Invoice No */}
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => openDrawer(po.id)}
                          className="font-mono font-black text-emerald-600 dark:text-emerald-400 hover:underline text-left cursor-pointer"
                        >
                          {po.invoiceNo || 'PO-DRAFT'}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {po.createdAt ? po.createdAt.slice(0, 10) : '—'}
                      </td>

                      {/* Supplier */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {po.supplierName || t('purchases.generalSupplier', 'General Supplier')}
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-lg neu-sunken-sm text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                          {po.warehouseName || t('purchases.centralWarehouse', 'Central Warehouse')}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="p-4">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {t('purchases.skuCount', '{{count}} SKUs', { count: po.itemsCount ?? po.items?.length ?? 0 })}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        {format(
                          convert(po.totalAmount || 0, baseCode, currentCurrency),
                          currentCurrency
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {isReceived && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black neu-pill text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{t('purchases.statusReceived', 'Received')}</span>
                          </span>
                        )}
                        {isOrdered && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black neu-pill text-amber-600 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>{t('purchases.statusOrdered', 'Ordered')}</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black neu-pill text-rose-600 dark:text-rose-400">
                            <Ban className="w-3 h-3" />
                            <span>{t('purchases.statusCancelled', 'Cancelled')}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOrdered && (
                            <button
                              type="button"
                              onClick={() => handleQuickReceive(po.id)}
                              className="px-2.5 py-1 neu-btn-primary text-white font-extrabold text-[11px] cursor-pointer mr-1"
                              title={t('purchases.receiveDockBtn', 'Receive Dock')}
                            >
                              {t('purchases.receiveDockBtn', 'Receive Dock')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDrawer(po.id)}
                            className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                            title={t('purchases.viewAuditTitle', 'View PO Audit & Items')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(po)}
                            className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                            title={t('purchases.editPoTitle', 'Edit PO')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetPo(po)}
                            className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                            title={t('purchases.deletePoTitle', 'Delete PO')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
        <div className="p-3.5 neu-sunken-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Left: Page Size Selector */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-semibold">{t('purchases.ordersPerPage', 'Orders per page:')}</span>
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
                  { value: '999999', label: t('purchases.allWithCount', `All (${totalItems})`, { total: totalItems }) },
                ]}
                size="sm"
                placement="up"
                dropdownWidth="w-28"
              />
            </div>

            <span className="text-slate-400 font-medium">
              {t('purchases.pageOf', 'Page {{current}} of {{total}}', { current: effectivePage, total: totalPages })}
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

      {/* Drawer for PO Audit and Details */}
      <PurchaseAuditDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedPoId(null);
        }}
        purchaseId={selectedPoId}
        onReceiveSuccess={fetchData}
        onEdit={openEditModal}
        onDelete={(po) => setDeleteTargetPo(po)}
      />

      {/* Modal for Creating Purchase Orders */}
      <CreatePurchaseOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          fetchData();
          showToast('Purchase Order created successfully', 'success');
        }}
        suppliers={suppliers}
        warehouses={warehouses}
        products={products}
      />

      {/* Modal for Editing Purchase Orders */}
      <EditPurchaseOrderModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditTargetPo(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setEditTargetPo(null);
          fetchData();
          showToast('Purchase Order updated successfully', 'success');
        }}
        purchase={editTargetPo}
        suppliers={suppliers}
        warehouses={warehouses}
      />

      {/* Animated Confirm Delete Modal */}
      <AnimatedConfirmModal
        isOpen={!!deleteTargetPo}
        title={t('purchases.deleteModalTitle', 'Delete Purchase Order')}
        message={t('purchases.deleteModalMessage', 'Are you sure you want to permanently delete purchase order {{invoiceNo}}? This action cannot be undone.', { invoiceNo: deleteTargetPo?.invoiceNo })}
        confirmLabel={t('purchases.deletePoBtn', 'Delete PO')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        isLoading={deleteLoading}
        onConfirm={handleExecuteDelete}
        onClose={() => setDeleteTargetPo(null)}
      />
    </div>
  );
};

export default PurchasesPage;
