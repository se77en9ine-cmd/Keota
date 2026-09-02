import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { soundFX } from '../utils/audio';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Square,
  Circle,
  RectangleHorizontal,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RotateCcw,
  Sparkles,
  Layers,
  LayoutGrid,
  Grid2X2,
  List,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Armchair,
  Clock,
  Filter,
  Settings,
  FolderPlus,
  Check,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomCheckbox } from '../components/common/CustomCheckbox';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';

export type TableViewDensity = 'CARDS' | 'MATRIX' | 'LIST';
export type TableStatusType = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
export type TableSortField = 'CODE' | 'NAME' | 'CAPACITY' | 'STATUS' | 'ZONE';

export interface DiningTableItem {
  id: string;
  name: string;
  code: string;
  zone: string;
  capacity: number;
  shape: 'SQUARE' | 'RECTANGLE' | 'ROUND';
  status: TableStatusType;
  activeHoldId?: string | null;
  sortOrder: number;
}

const STATUS_CONFIG: Record<
  TableStatusType,
  { label: string; badge: string; border: string; bg: string; dot: string; lightBg: string }
> = {
  AVAILABLE: {
    label: 'Available',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    dot: 'bg-emerald-500',
    lightBg: 'hover:border-emerald-500/60',
  },
  OCCUPIED: {
    label: 'Occupied',
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    dot: 'bg-rose-500',
    lightBg: 'hover:border-rose-500/60',
  },
  RESERVED: {
    label: 'Reserved',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    dot: 'bg-amber-500',
    lightBg: 'hover:border-amber-500/60',
  },
  CLEANING: {
    label: 'Cleaning',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    dot: 'bg-blue-500',
    lightBg: 'hover:border-blue-500/60',
  },
};

const DEFAULT_ZONES = ['Main Dining', 'Outdoor Terrace', 'VIP Lounge', 'Bar Area'];

export const getZoneName = (zone: string, t: any) => {
  switch (zone) {
    case 'Main Dining':
      return t('tables.zoneMainDining', 'Main Dining');
    case 'Outdoor Terrace':
      return t('tables.zoneOutdoorTerrace', 'Outdoor Terrace');
    case 'VIP Lounge':
      return t('tables.zoneVipLounge', 'VIP Lounge');
    case 'Bar Area':
      return t('tables.zoneBarArea', 'Bar Area');
    default:
      return zone;
  }
};

export const getTableName = (name: string, t: any) => {
  if (name.startsWith('Bar Counter ')) {
    const num = name.replace('Bar Counter ', '');
    return t('tables.barCounterNum', 'Bar Counter {{num}}', { num });
  }
  if (name.startsWith('Terrace OT-')) {
    const num = name.replace('Terrace OT-', '');
    return t('tables.terraceNum', 'Terrace OT-{{num}}', { num });
  }
  if (name.startsWith('Table T-')) {
    const num = name.replace('Table T-', '');
    return t('tables.tableNum', 'Table T-{{num}}', { num });
  }
  return name;
};

export const TablesPage: React.FC = () => {
  const { t } = useTranslation();
  const [tables, setTables] = useState<DiningTableItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Multi-Density View, Filtering & Sorting State ──
  const [viewDensity, setViewDensity] = useState<TableViewDensity>('CARDS');
  const [activeZone, setActiveZone] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [capacityFilter, setCapacityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<TableSortField>('CODE');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Custom zones persisted in localStorage if user creates empty zones
  const [customZonesList, setCustomZonesList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_custom_dining_zones');
      return saved ? JSON.parse(saved) : DEFAULT_ZONES;
    } catch {
      return DEFAULT_ZONES;
    }
  });

  // Pagination State (for large 50-200+ table venues)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24); // 24, 48, 96, 999999

  // Batch Selection State
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());

  // Table Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<DiningTableItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Zone Management Modal State
  const [manageZonesModalOpen, setManageZonesModalOpen] = useState(false);
  const [newZoneInput, setNewZoneInput] = useState('');
  const [editingZoneItem, setEditingZoneItem] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<{
    name: string;
    tableCount: number;
    targetFallbackZone: string;
  } | null>(null);
  const [isZoneSaving, setIsZoneSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    zone: 'Main Dining',
    capacity: 4,
    shape: 'SQUARE' as 'SQUARE' | 'RECTANGLE' | 'ROUND',
    status: 'AVAILABLE' as TableStatusType,
    sortOrder: 1,
  });
  const [showQuickAddZoneInForm, setShowQuickAddZoneInForm] = useState(false);
  const [quickZoneInput, setQuickZoneInput] = useState('');

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tables');
      setTables(res.data.tables || []);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Save custom zones list to localStorage
  const saveCustomZones = (updated: string[]) => {
    setCustomZonesList(updated);
    try {
      localStorage.setItem('pos_custom_dining_zones', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom zones', e);
    }
  };

  // Distinct Zones union of preset, custom, and table zones
  const distinctZones = useMemo(() => {
    return Array.from(new Set([...DEFAULT_ZONES, ...customZonesList, ...tables.map((t) => t.zone)])).filter(
      Boolean
    );
  }, [tables, customZonesList]);

  const zonePills = useMemo(() => {
    return ['ALL', ...distinctZones];
  }, [distinctZones]);

  // Zone CRUD Handlers
  const handleCreateZone = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (distinctZones.some((z) => z.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Zone "${trimmed}" already exists`, 'error');
      return;
    }
    const updated = [...customZonesList, trimmed];
    saveCustomZones(updated);
    setNewZoneInput('');
    soundFX.playCashSuccess();
    showToast(`Zone "${trimmed}" created successfully`, 'success');
  };

  const handleRenameZone = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingZoneItem(null);
      return;
    }
    try {
      setIsZoneSaving(true);
      await api.post('/tables/zones/rename', { oldZone: oldName, newZone: trimmed });

      // Update custom zones list
      const updated = customZonesList.map((z) => (z === oldName ? trimmed : z));
      if (!updated.includes(trimmed)) updated.push(trimmed);
      saveCustomZones(updated);

      // If activeZone was this, update it
      if (activeZone === oldName) setActiveZone(trimmed);

      soundFX.playCashSuccess();
      showToast(`Renamed zone to "${trimmed}" & updated all tables`, 'success');
      setEditingZoneItem(null);
      await fetchTables();
    } catch (err: any) {
      soundFX.playError();
      showToast(`Failed to rename zone: ${err.message}`, 'error');
    } finally {
      setIsZoneSaving(false);
    }
  };

  const handleDeleteZone = async (zoneName: string, targetFallbackZone: string) => {
    try {
      setIsZoneSaving(true);
      await api.post('/tables/zones/delete', {
        zoneName,
        targetZone: targetFallbackZone || 'Main Dining',
      });

      const updated = customZonesList.filter((z) => z !== zoneName);
      saveCustomZones(updated);

      if (activeZone === zoneName) setActiveZone('ALL');

      soundFX.playCashSuccess();
      showToast(`Deleted zone "${zoneName}" & reassigned tables`, 'success');
      setDeleteZoneTarget(null);
      await fetchTables();
    } catch (err: any) {
      soundFX.playError();
      showToast(`Failed to delete zone: ${err.message}`, 'error');
    } finally {
      setIsZoneSaving(false);
    }
  };

  // Table Modal Handlers
  const handleOpenCreate = () => {
    setEditingTable(null);
    setModalError(null);
    setIsSaving(false);
    setShowQuickAddZoneInForm(false);
    const nextNum = tables.length + 1;
    const defaultZ = activeZone === 'ALL' ? (distinctZones[0] || 'Main Dining') : activeZone;
    setFormData({
      name: `Table T-${String(nextNum).padStart(2, '0')}`,
      code: `T-${String(nextNum).padStart(2, '0')}`,
      zone: defaultZ,
      capacity: 4,
      shape: 'SQUARE',
      status: 'AVAILABLE',
      sortOrder: nextNum,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (tItem: DiningTableItem) => {
    setEditingTable(tItem);
    setModalError(null);
    setIsSaving(false);
    setShowQuickAddZoneInForm(false);
    setFormData({
      name: tItem.name,
      code: tItem.code,
      zone: tItem.zone,
      capacity: tItem.capacity,
      shape: tItem.shape,
      status: tItem.status,
      sortOrder: tItem.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      setModalError(null);
      if (editingTable) {
        await api.put(`/tables/${editingTable.id}`, formData);
        showToast(`Table "${formData.name}" updated successfully`, 'success');
      } else {
        await api.post('/tables', formData);
        showToast(`Table "${formData.name}" created successfully`, 'success');
      }
      soundFX.playCashSuccess();
      setModalOpen(false);
      fetchTables();
    } catch (err: any) {
      soundFX.playError();
      const msg = err.response?.data?.message || err.message || 'Failed to save table';
      setModalError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: TableStatusType) => {
    try {
      await api.patch(`/tables/${tableId}/status`, { status: newStatus });
      soundFX.playBeep();
      setTables((prev) =>
        prev.map((tItem) => (tItem.id === tableId ? { ...tItem, status: newStatus } : tItem))
      );
      showToast(`Table status updated to ${newStatus}`, 'success');
    } catch (err: any) {
      soundFX.playError();
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleQuickCycleStatus = async (tItem: DiningTableItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const cycleMap: Record<TableStatusType, TableStatusType> = {
      AVAILABLE: 'OCCUPIED',
      OCCUPIED: 'CLEANING',
      CLEANING: 'AVAILABLE',
      RESERVED: 'OCCUPIED',
    };
    const nextStatus = cycleMap[tItem.status] || 'AVAILABLE';
    handleStatusChange(tItem.id, nextStatus);
  };

  const handleDelete = async (tableId: string) => {
    try {
      await api.delete(`/tables/${tableId}`);
      soundFX.playCashSuccess();
      setDeleteConfirmId(null);
      fetchTables();
      showToast('Table deleted successfully', 'success');
    } catch (err: any) {
      soundFX.playError();
      showToast(`Failed to delete table: ${err.message}`, 'error');
    }
  };

  // High-Performance Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let list = tables.filter((tItem) => {
      if (activeZone !== 'ALL' && tItem.zone !== activeZone) return false;
      if (statusFilter !== 'ALL' && tItem.status !== statusFilter) return false;
      if (capacityFilter === '1-2' && tItem.capacity > 2) return false;
      if (capacityFilter === '3-4' && (tItem.capacity < 3 || tItem.capacity > 4)) return false;
      if (capacityFilter === '5-8' && (tItem.capacity < 5 || tItem.capacity > 8)) return false;
      if (capacityFilter === '9+' && tItem.capacity < 9) return false;

      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const matches =
          tItem.name.toLowerCase().includes(s) ||
          tItem.code.toLowerCase().includes(s) ||
          tItem.zone.toLowerCase().includes(s);
        if (!matches) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'CODE':
          comparison = a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'NAME':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'ZONE':
          comparison = a.zone.localeCompare(b.zone);
          break;
        case 'CAPACITY':
          comparison = a.capacity - b.capacity;
          break;
        case 'STATUS':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [tables, activeZone, statusFilter, capacityFilter, search, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeZone, statusFilter, capacityFilter, search]);

  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedTables = useMemo(() => {
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, startIndex, endIndex]);

  const handleSort = (field: TableSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = paginatedTables.map((t) => t.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedTableIds.has(id));

    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusUpdate = async (newStatus: TableStatusType) => {
    if (selectedTableIds.size === 0) return;
    try {
      const ids = Array.from(selectedTableIds);
      await Promise.all(ids.map((id) => api.patch(`/tables/${id}/status`, { status: newStatus })));
      soundFX.playCashSuccess();
      setTables((prev) =>
        prev.map((t) => (selectedTableIds.has(t.id) ? { ...t, status: newStatus } : t))
      );
      showToast(`Updated ${ids.length} tables to ${newStatus}`, 'success');
      setSelectedTableIds(new Set());
    } catch (err: any) {
      soundFX.playError();
      showToast(`Bulk update failed: ${err.message}`, 'error');
    }
  };

  const hasActiveFilters =
    activeZone !== 'ALL' ||
    statusFilter !== 'ALL' ||
    capacityFilter !== 'ALL' ||
    search.trim().length > 0;

  const resetAllFilters = () => {
    setActiveZone('ALL');
    setStatusFilter('ALL');
    setCapacityFilter('ALL');
    setSearch('');
    setCurrentPage(1);
  };

  const availableCount = tables.filter((tItem) => tItem.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((tItem) => tItem.status === 'OCCUPIED').length;
  const reservedCount = tables.filter((tItem) => tItem.status === 'RESERVED').length;

  const renderShapeIcon = (shape: string) => {
    if (shape === 'ROUND') return <Circle className="w-4 h-4 text-slate-400" />;
    if (shape === 'RECTANGLE') return <RectangleHorizontal className="w-4 h-4 text-slate-400" />;
    return <Square className="w-4 h-4 text-slate-400" />;
  };

  const getStatusLabel = (status: TableStatusType) => {
    switch (status) {
      case 'AVAILABLE':
        return t('tables.statusAvailable', 'Available (Free)');
      case 'OCCUPIED':
        return t('tables.statusOccupied', 'Occupied (Seated)');
      case 'RESERVED':
      case 'CLEANING':
        return t('tables.statusCleaning', 'Cleaning');
      default:
        return status;
    }
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-200">
      {/* Inline Toast Banner */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-4 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-500/90 text-white border-rose-400 backdrop-blur-md shadow-rose-500/20'
              : 'bg-emerald-500/90 text-white border-emerald-400 backdrop-blur-md shadow-emerald-500/20'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-emerald-500" />
            <span>{t('tables.title', 'Dining Table Management')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('tables.subtitle', 'Configure restaurant floor plan zones, table seating capacity, and live occupancy')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Density Switcher (Cards / Matrix / List) */}
          <div className="p-1 neu-tab-container flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewDensity('CARDS')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewDensity === 'CARDS'
                  ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={t('tables.viewCards', 'Visual Cards View')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewDensity('MATRIX')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewDensity === 'MATRIX'
                  ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={t('tables.viewMatrix', 'High-Density Matrix (50+ Tables on 1 Screen)')}
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewDensity('LIST')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewDensity === 'LIST'
                  ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={t('tables.viewList', 'Detailed Table Master List')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Manage Zones Button */}
          <button
            type="button"
            onClick={() => setManageZonesModalOpen(true)}
            className="px-3 py-2 neu-btn text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title={t('tables.manageZonesModalTitle', 'Manage Restaurant Floors & Zones')}
          >
            <Settings className="w-4 h-4 text-emerald-500" />
            <span>{t('tables.btnManageZones', 'Manage Zones')}</span>
          </button>

          {/* Add New Table Button */}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-neu-glow-emerald"
          >
            <Plus className="w-4 h-4" />
            <span>{t('tables.addTable', 'Add New Table')}</span>
          </button>
        </div>
      </div>

      {/* KPI Status Summary Cards (Fixed) */}
      <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-2xl neu-card-interactive text-left transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'ring-2 ring-emerald-500/30'
              : ''
          }`}
        >
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('tables.totalTables', 'Total Tables')}</div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {tables.length}
          </div>
          <div className="text-[10px] text-emerald-500 font-bold mt-1">
            {t('tables.allFloors', 'All Floors & Zones')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('AVAILABLE')}
          className={`p-4 neu-card-interactive text-left transition-all cursor-pointer ${
            statusFilter === 'AVAILABLE'
              ? 'ring-2 ring-emerald-500/30'
              : ''
          }`}
        >
          <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
            {t('tables.availableFree', 'Available (Free)')}
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {availableCount}
          </div>
          <div className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
            {t('tables.readyForGuests', 'Ready for guests')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('OCCUPIED')}
          className={`p-4 neu-card-interactive text-left transition-all cursor-pointer ${
            statusFilter === 'OCCUPIED'
              ? 'ring-2 ring-rose-500/30'
              : ''
          }`}
        >
          <div className="text-xs font-bold text-rose-500 uppercase tracking-wider">{t('tables.occupied', 'Occupied')}</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {occupiedCount}
          </div>
          <div className="text-[11px] text-rose-600/70 dark:text-rose-400/70 mt-0.5">
            {t('tables.activeDiningOrders', 'Active dining orders')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('RESERVED')}
          className={`p-4 neu-card-interactive text-left transition-all cursor-pointer ${
            statusFilter === 'RESERVED'
              ? 'ring-2 ring-amber-500/30'
              : ''
          }`}
        >
          <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">{t('tables.reserved', 'Reserved')}</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {reservedCount}
          </div>
          <div className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">
            {t('tables.bookedInAdvance', 'Booked in advance')}
          </div>
        </button>
      </div>

      {/* Main Table Management Container (Fills Viewport) */}
      <div className="neu-card-lg rounded-3xl overflow-hidden flex-1 min-h-0 flex flex-col space-y-0 text-xs">
        {/* Multi-Facet Toolbar */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
          {/* Row 1: Zone Floor Tabs + Quick Manage Pill */}
          <div className="p-1 neu-tab-container flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {zonePills.map((zone) => {
              const count =
                zone === 'ALL'
                  ? tables.length
                  : tables.filter((tItem) => tItem.zone === zone).length;
              const active = activeZone === zone;
              return (
                <button
                  key={zone}
                  onClick={() => setActiveZone(zone)}
                  className={`h-9 px-3.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 flex-shrink-0 cursor-pointer ${
                    active
                      ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{zone === 'ALL' ? t('tables.allZones', '🏢 All Zones') : getZoneName(zone, t)}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                      active ? 'bg-emerald-500/20 text-emerald-500' : 'neu-pill text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Inline Quick Add/Manage Zone Pill */}
            <button
              type="button"
              onClick={() => setManageZonesModalOpen(true)}
              className="h-9 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:border-emerald-500 font-extrabold text-xs flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('tables.addManageZone', '+ Add / Manage Zone')}</span>
            </button>
          </div>

          {/* Row 2: Search, Status Filter, Capacity Filter & Batch Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('tables.searchPlaceholder', 'Search code, name, zone...')}
                  className="w-full h-9 pl-9 pr-3 neu-input text-xs font-medium text-slate-800 dark:text-white outline-none"
                />
              </div>

              {/* Status Filter Dropdown */}
              <div className="w-48">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('tables.allStatuses', 'All Table Statuses'),
                      icon: <LayoutGrid className="w-3.5 h-3.5 text-brand-500" />,
                    },
                    {
                      value: 'AVAILABLE',
                      label: t('tables.statusAvailable', 'Available (Free)'),
                      icon: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />,
                    },
                    {
                      value: 'OCCUPIED',
                      label: t('tables.statusOccupied', 'Occupied (Seated)'),
                      icon: <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />,
                    },
                    {
                      value: 'RESERVED',
                      label: t('tables.statusReserved', 'Reserved'),
                      icon: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />,
                    },
                    {
                      value: 'CLEANING',
                      label: t('tables.statusCleaning', 'Cleaning'),
                      icon: <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />,
                    },
                  ]}
                  size="md"
                  dropdownWidth="w-52"
                />
              </div>

              {/* Capacity Filter Dropdown */}
              <div className="w-52">
                <CustomSelect
                  value={capacityFilter}
                  onChange={(val) => setCapacityFilter(val)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('tables.allCapacities', 'All Seating Capacities'),
                      icon: <Users className="w-3.5 h-3.5 text-brand-500" />,
                    },
                    {
                      value: '1-2',
                      label: t('tables.cap1to2', '1–2 Seats (Couple/Solo)'),
                      icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
                    },
                    {
                      value: '3-4',
                      label: t('tables.cap3to4', '3–4 Seats (Standard)'),
                      icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
                    },
                    {
                      value: '5-8',
                      label: t('tables.cap5to8', '5–8 Seats (Family/Group)'),
                      icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
                    },
                    {
                      value: '9+',
                      label: t('tables.cap9plus', '9+ Seats (VIP/Banquet)'),
                      icon: <Users className="w-3.5 h-3.5 text-brand-400" />,
                    },
                  ]}
                  size="md"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title={t('common.reset', 'Reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('common.reset', 'Reset')}</span>
                </button>
              )}
            </div>

            {/* Right: Summary & Bulk Actions */}
            <div className="flex items-center gap-3 justify-between lg:justify-end flex-shrink-0">
              {selectedTableIds.size > 0 ? (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                  <span className="px-2 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-xs">
                    {t('tables.selectedCount', '{{count}} Selected', { count: selectedTableIds.size })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkStatusUpdate('AVAILABLE')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                  >
                    {t('tables.setAvailable', 'Set Available')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStatusUpdate('CLEANING')}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                  >
                    {t('tables.setCleaning', 'Set Cleaning')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTableIds(new Set())}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-bold">
                  {totalItems === 0
                    ? t('tables.zeroTablesFound', '0 tables found')
                    : t('tables.showingTablesCount', 'Showing {{start}}–{{end}} of {{total}} tables', {
                        start: startIndex + 1,
                        end: endIndex,
                        total: totalItems,
                      })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Display Body (Scrollable Viewport) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin p-3 sm:p-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <span className="text-xs font-semibold">{t('common.loading', 'Loading tables...')}</span>
            </div>
          ) : paginatedTables.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <UtensilsCrossed className="w-10 h-10 opacity-30" />
              <span className="text-xs font-semibold">{t('tables.noTablesFound', 'No dining tables found')}</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="mt-2 text-xs text-brand-500 font-bold underline cursor-pointer"
                >
                  {t('common.reset', 'Reset all filters')}
                </button>
              )}
            </div>
          ) : viewDensity === 'MATRIX' ? (
            /* View 2: High-Density Fast Matrix View (50-100+ Tables On Screen) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
              {paginatedTables.map((tItem) => {
                const statusInfo = STATUS_CONFIG[tItem.status] || STATUS_CONFIG.AVAILABLE;
                const isSelected = selectedTableIds.has(tItem.id);

                return (
                  <div
                    key={tItem.id}
                    onClick={() => handleOpenEdit(tItem)}
                    className={`p-3 rounded-2xl border ${statusInfo.border} ${statusInfo.bg} bg-white dark:bg-slate-800/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group select-none relative flex flex-col justify-between h-28 ${
                      isSelected ? 'ring-2 ring-brand-500' : ''
                    }`}
                  >
                    {/* Top Row: Code & Shape */}
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900 dark:text-white font-mono group-hover:text-brand-500 transition-colors">
                        {tItem.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 font-mono">
                          {tItem.capacity} <Users className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>

                    {/* Middle: Zone / Name */}
                    <div className="text-[10px] text-slate-400 truncate font-semibold">
                      {getZoneName(tItem.zone, t)}
                    </div>

                    {/* Bottom: 1-Tap Quick Status Cycle */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickCycleStatus(tItem, e)}
                      className={`w-full py-1 rounded-xl text-[10px] font-black border flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer ${statusInfo.badge}`}
                      title="Click to cycle table status"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                      <span>{getStatusLabel(tItem.status)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : viewDensity === 'LIST' ? (
            /* View 3: Detailed Table Master List */
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100 dark:border-slate-800 select-none">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <CustomCheckbox
                        checked={
                          paginatedTables.length > 0 &&
                          paginatedTables.every((t) => selectedTableIds.has(t.id))
                        }
                        indeterminate={
                          selectedTableIds.size > 0 &&
                          !paginatedTables.every((t) => selectedTableIds.has(t.id))
                        }
                        onChange={handleToggleSelectAllVisible}
                        size="sm"
                        ariaLabel="Select all visible tables"
                      />
                    </th>
                    <th
                      onClick={() => handleSort('CODE')}
                      className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t('tables.colCode', 'Code')}</span>
                        <ArrowUpDown
                          className={`w-3.5 h-3.5 ${sortField === 'CODE' ? 'text-brand-500' : 'opacity-30'}`}
                        />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('NAME')}
                      className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t('tables.colTableName', 'Table Name')}</span>
                        <ArrowUpDown
                          className={`w-3.5 h-3.5 ${sortField === 'NAME' ? 'text-brand-500' : 'opacity-30'}`}
                        />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('ZONE')}
                      className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t('tables.colZone', 'Floor / Zone')}</span>
                        <ArrowUpDown
                          className={`w-3.5 h-3.5 ${sortField === 'ZONE' ? 'text-brand-500' : 'opacity-30'}`}
                        />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('CAPACITY')}
                      className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t('tables.colCapacity', 'Capacity')}</span>
                        <ArrowUpDown
                          className={`w-3.5 h-3.5 ${
                            sortField === 'CAPACITY' ? 'text-brand-500' : 'opacity-30'
                          }`}
                        />
                      </div>
                    </th>
                    <th className="p-3.5">{t('tables.colShape', 'Shape')}</th>
                    <th
                      onClick={() => handleSort('STATUS')}
                      className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t('tables.colLiveStatus', 'Live Status')}</span>
                        <ArrowUpDown
                          className={`w-3.5 h-3.5 ${
                            sortField === 'STATUS' ? 'text-brand-500' : 'opacity-30'
                          }`}
                        />
                      </div>
                    </th>
                    <th className="p-3.5 text-right">{t('tables.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {paginatedTables.map((tItem) => {
                    const statusInfo = STATUS_CONFIG[tItem.status] || STATUS_CONFIG.AVAILABLE;
                    const isSelected = selectedTableIds.has(tItem.id);

                    return (
                      <tr
                        key={tItem.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-brand-500/5 hover:bg-brand-500/10'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <CustomCheckbox
                            checked={isSelected}
                            onChange={() => handleToggleSelect(tItem.id)}
                            size="sm"
                            ariaLabel={`Select table ${tItem.code}`}
                          />
                        </td>
                        <td className="p-3.5 font-mono font-black text-slate-900 dark:text-white">
                          {tItem.code}
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-800 dark:text-slate-200">
                          {getTableName(tItem.name, t)}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                            {getZoneName(tItem.zone, t)}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold">
                          {t('tables.seatsCount', '{{count}} Seats', { count: tItem.capacity })}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            {renderShapeIcon(tItem.shape)}
                            <span>
                              {tItem.shape === 'SQUARE' && t('tables.shapeSquare', 'Square')}
                              {tItem.shape === 'RECTANGLE' && t('tables.shapeRectangle', 'Rectangle')}
                              {tItem.shape === 'ROUND' && t('tables.shapeRound', 'Round')}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="w-36">
                            <CustomSelect
                              value={tItem.status}
                              onChange={(val) => handleStatusChange(tItem.id, val as TableStatusType)}
                              options={[
                                { value: 'AVAILABLE', label: t('tables.statusAvailable', 'Available (Free)'), icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
                                { value: 'OCCUPIED', label: t('tables.statusOccupied', 'Occupied (Seated)'), icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
                                { value: 'RESERVED', label: t('tables.statusReserved', 'Reserved'), icon: <span className="w-2 h-2 rounded-full bg-amber-500" /> },
                                { value: 'CLEANING', label: t('tables.statusCleaning', 'Cleaning'), icon: <span className="w-2 h-2 rounded-full bg-blue-500" /> },
                              ]}
                              size="sm"
                              placement="auto"
                              dropdownWidth="w-40"
                            />
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(tItem)}
                              className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                              title={t('tables.editTableModalTitle', 'Edit Dining Table')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(tItem.id)}
                              className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                              title={t('tables.deleteTableTitle', 'Delete Dining Table')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* View 1: Visual Table Cards (Standard) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedTables.map((tItem) => {
                const statusInfo = STATUS_CONFIG[tItem.status] || STATUS_CONFIG.AVAILABLE;
                const isSelected = selectedTableIds.has(tItem.id);

                return (
                  <div
                    key={tItem.id}
                    className={`p-4 neu-card-interactive flex flex-col justify-between gap-4 transition-all ${
                      isSelected ? 'ring-2 ring-emerald-500/40' : ''
                    }`}
                  >
                    {/* Top: Code, Shape & Actions */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl neu-sunken-sm text-emerald-500">
                          {renderShapeIcon(tItem.shape)}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-900 dark:text-white font-mono">
                            {tItem.code}
                          </div>
                          <div className="text-[11px] font-bold text-slate-400">{getZoneName(tItem.zone, t)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(tItem)}
                          className="p-1.5 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(tItem.id)}
                          className="p-1.5 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Info */}
                    <div>
                      <div className="font-extrabold text-sm text-slate-800 dark:text-white line-clamp-1">
                        {getTableName(tItem.name, t)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-bold">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('tables.seatsCount', '{{count}} Seats', { count: tItem.capacity })}</span>
                        </span>
                        <span>•</span>
                        <span>
                          {tItem.shape === 'SQUARE' && t('tables.shapeSquare', 'Square')}
                          {tItem.shape === 'RECTANGLE' && t('tables.shapeRectangle', 'Rectangle')}
                          {tItem.shape === 'ROUND' && t('tables.shapeRound', 'Round')}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Status Changer */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`}></span>
                        <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                          {t('tables.statusColon', 'Status:')}
                        </span>
                      </div>

                      <div className="w-36">
                        <CustomSelect
                          value={tItem.status}
                          onChange={(val) => handleStatusChange(tItem.id, val as TableStatusType)}
                          options={[
                            { value: 'AVAILABLE', label: t('tables.statusAvailable', 'Available (Free)'), icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
                            { value: 'OCCUPIED', label: t('tables.statusOccupied', 'Occupied (Seated)'), icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
                            { value: 'RESERVED', label: t('tables.statusReserved', 'Reserved'), icon: <span className="w-2 h-2 rounded-full bg-amber-500" /> },
                            { value: 'CLEANING', label: t('tables.statusCleaning', 'Cleaning'), icon: <span className="w-2 h-2 rounded-full bg-blue-500" /> },
                          ]}
                          size="sm"
                          placement="auto"
                          dropdownWidth="w-40"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Enterprise Pagination Footer Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Left: Page Size Selector */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-semibold">{t('tables.tablesPerPage', 'Tables per page:')}</span>
            <div className="w-24">
              <CustomSelect
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                options={[
                  { value: '24', label: '24' },
                  { value: '48', label: '48' },
                  { value: '96', label: '96' },
                  { value: '999999', label: t('tables.allTablesCount', 'All ({{count}})', { count: totalItems }) },
                ]}
                size="sm"
                dropdownWidth="w-28"
              />
            </div>

            <span className="text-slate-400 font-medium">
              {t('tables.pageCurrentOfTotal', 'Page {{current}} of {{total}}', { current: effectivePage, total: totalPages })}
            </span>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={effectivePage <= 1}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={effectivePage <= 1}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Previous Page"
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
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all active:scale-95 shadow-2xs cursor-pointer ${
                        pageNumber === effectivePage
                          ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={effectivePage >= totalPages}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Manage Zones / Floor Plan Modal ── */}
      {manageZonesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg neu-card-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl neu-sunken-sm text-emerald-500">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {t('tables.manageZonesModalTitle', 'Manage Restaurant Floors & Zones')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('tables.manageZonesModalSubtitle', 'Add, rename, or remove dining sections & floors')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setManageZonesModalOpen(false);
                  setEditingZoneItem(null);
                }}
                className="p-2 neu-circle-btn text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Zone Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateZone(newZoneInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newZoneInput}
                onChange={(e) => setNewZoneInput(e.target.value)}
                placeholder={t('tables.zoneInputPlaceholder', 'e.g. 2nd Floor VIP, Poolside Terrace, Rooftop...')}
                className="flex-1 h-10 px-3.5 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
              <button
                type="submit"
                disabled={!newZoneInput.trim()}
                className="h-10 px-4 neu-btn-primary disabled:opacity-40 text-white font-extrabold text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('tables.btnAddZone', 'Add Zone')}</span>
              </button>
            </form>

            {/* List of Existing Zones with Rename & Delete */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                {t('tables.existingZonesTitle', 'Existing Dining Zones ({{count}})', { count: distinctZones.length })}
              </div>

              {distinctZones.map((zone) => {
                const tableCount = tables.filter((t) => t.zone === zone).length;
                const isEditing = editingZoneItem?.oldName === zone;

                return (
                  <div
                    key={zone}
                    className="p-3 neu-card flex items-center justify-between gap-3 group transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingZoneItem.newName}
                          onChange={(e) =>
                            setEditingZoneItem({ ...editingZoneItem, newName: e.target.value })
                          }
                          autoFocus
                          className="flex-1 h-8 px-2.5 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameZone(editingZoneItem.oldName, editingZoneItem.newName)}
                          disabled={isZoneSaving}
                          className="p-1.5 neu-circle-btn text-emerald-500 hover:text-emerald-400 cursor-pointer"
                          title="Save Rename"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingZoneItem(null)}
                          className="p-1.5 neu-circle-btn text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title={t('common.cancel', 'Cancel')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {zone}
                          </span>
                          <span className="px-2 py-0.5 neu-pill text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            {t('tables.zoneTableCount', '{{count}} Tables', { count: tableCount })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingZoneItem({ oldName: zone, newName: zone })}
                            className="p-1.5 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                            title="Rename Zone"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const fallback = distinctZones.find((z) => z !== zone) || 'Main Dining';
                              setDeleteZoneTarget({
                                name: zone,
                                tableCount,
                                targetFallbackZone: fallback,
                              });
                            }}
                            className="p-1.5 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setManageZonesModalOpen(false);
                  setEditingZoneItem(null);
                }}
                className="px-4 py-2 neu-btn text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Zone Confirmation & Reassignment Modal */}
      {deleteZoneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm neu-card-lg p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {t('tables.deleteZoneTitle', 'Delete Zone "{{name}}"?', { name: deleteZoneTarget.name })}
              </h3>
              <p className="text-xs text-slate-400">
                {deleteZoneTarget.tableCount > 0
                  ? t('tables.deleteZoneWarningReassign', 'There are {{count}} tables currently in this zone. Please select a fallback zone to reassign them to:', { count: deleteZoneTarget.tableCount })
                  : t('tables.deleteZoneWarningSimple', 'Are you sure you want to remove this zone?')}
              </p>
            </div>

            {deleteZoneTarget.tableCount > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{t('tables.reassignTablesLabel', 'Reassign tables to:')}</label>
                <CustomSelect
                  value={deleteZoneTarget.targetFallbackZone}
                  onChange={(val) =>
                    setDeleteZoneTarget({ ...deleteZoneTarget, targetFallbackZone: val })
                  }
                  options={distinctZones
                    .filter((z) => z !== deleteZoneTarget.name)
                    .map((z) => ({ value: z, label: z }))}
                  size="md"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteZoneTarget(null)}
                className="py-2.5 neu-btn text-xs font-bold text-slate-500 cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={isZoneSaving}
                onClick={() =>
                  handleDeleteZone(deleteZoneTarget.name, deleteZoneTarget.targetFallbackZone)
                }
                className="py-2.5 neu-btn-danger text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isZoneSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t('tables.btnConfirmDeleteZone', 'Delete Zone')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Table Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md neu-card-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <div className="p-2 rounded-xl neu-sunken-sm text-emerald-500">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span>{editingTable ? t('tables.editTableModalTitle', 'Edit Dining Table') : t('tables.addTableModalTitle', 'Add New Table')}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 neu-circle-btn text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {t('tables.fieldTableCode', 'Table Code')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. T-01"
                    className="w-full h-10 px-3.5 neu-input text-xs font-bold font-mono text-slate-900 dark:text-white uppercase outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {t('tables.fieldTableName', 'Table Name')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Table T-01"
                    className="w-full h-10 px-3.5 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Zone / Floor Dropdown + Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500">
                    {t('tables.fieldZoneFloor', 'Zone / Floor')} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddZoneInForm(!showQuickAddZoneInForm)}
                    className="text-[11px] font-extrabold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showQuickAddZoneInForm ? t('tables.selectExistingZone', 'Select Existing Zone') : t('tables.createNewZone', 'Create New Zone')}</span>
                  </button>
                </div>

                {showQuickAddZoneInForm ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={quickZoneInput}
                      onChange={(e) => setQuickZoneInput(e.target.value)}
                      placeholder={t('tables.typeNewZonePlaceholder', 'Type new zone name (e.g. Rooftop)...')}
                      className="flex-1 h-10 px-3.5 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (quickZoneInput.trim()) {
                          handleCreateZone(quickZoneInput);
                          setFormData({ ...formData, zone: quickZoneInput.trim() });
                          setShowQuickAddZoneInForm(false);
                          setQuickZoneInput('');
                        }
                      }}
                      className="h-10 px-3.5 neu-btn-primary text-white font-bold text-xs cursor-pointer"
                    >
                      {t('tables.btnAddAndUse', 'Add & Use')}
                    </button>
                  </div>
                ) : (
                  <CustomSelect
                    value={formData.zone}
                    onChange={(val) => setFormData({ ...formData, zone: val })}
                    options={distinctZones.map((z) => ({ value: z, label: z }))}
                    size="md"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {t('tables.fieldCapacity', 'Seating Capacity')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full h-10 px-3.5 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">{t('tables.fieldShape', 'Table Shape')}</label>
                  <CustomSelect
                    value={formData.shape}
                    onChange={(val) => setFormData({ ...formData, shape: val as any })}
                    options={[
                      { value: 'SQUARE', label: t('tables.shapeSquareOption', 'Square (2-4 pax)') },
                      { value: 'RECTANGLE', label: t('tables.shapeRectangleOption', 'Rectangle (6-10 pax)') },
                      { value: 'ROUND', label: t('tables.shapeRoundOption', 'Round (Round table)') },
                    ]}
                    size="md"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">{t('tables.fieldInitialStatus', 'Initial Status')}</label>
                <CustomSelect
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val as TableStatusType })}
                  options={[
                    { value: 'AVAILABLE', label: t('tables.statusAvailable', 'Available (Free)'), icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
                    { value: 'OCCUPIED', label: t('tables.statusOccupied', 'Occupied (Seated)'), icon: <span className="w-2 h-2 rounded-full bg-rose-500" /> },
                    { value: 'RESERVED', label: t('tables.statusReserved', 'Reserved'), icon: <span className="w-2 h-2 rounded-full bg-amber-500" /> },
                    { value: 'CLEANING', label: t('tables.statusCleaning', 'Cleaning'), icon: <span className="w-2 h-2 rounded-full bg-blue-500" /> },
                  ]}
                  size="md"
                />
              </div>

              {modalError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold">
                  {modalError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTable ? t('tables.btnUpdateTable', 'Update Table') : t('tables.btnSaveTable', 'Save Table')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Table Confirmation Modal */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (deleteConfirmId) {
            await handleDelete(deleteConfirmId);
          }
        }}
        title={t('tables.deleteTableTitle', 'Delete Dining Table')}
        message={t('tables.deleteTableWarning', 'Are you sure you want to delete this table? Active orders associated with this table will be detached.')}
        itemName={tables.find((t) => t.id === deleteConfirmId)?.name || tables.find((t) => t.id === deleteConfirmId)?.code}
        itemDetails={
          tables.find((t) => t.id === deleteConfirmId)
            ? [
                { label: 'Code', value: tables.find((t) => t.id === deleteConfirmId)!.code },
                { label: 'Zone', value: tables.find((t) => t.id === deleteConfirmId)!.zone },
                { label: 'Capacity', value: `${tables.find((t) => t.id === deleteConfirmId)!.capacity} pax` },
              ]
            : undefined
        }
        variant="danger"
        confirmLabel={t('tables.btnConfirmDeleteTable', 'Delete Table')}
        cancelLabel={t('common.cancel', 'Cancel')}
      />
    </div>
  );
};

export default TablesPage;
