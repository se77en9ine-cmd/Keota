import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useWarehouseStore, WarehouseItem } from '../../store/useWarehouseStore';
import { soundFX } from '../../utils/audio';
import {
  Warehouse,
  Layers,
  Boxes,
  Plus,
  Search,
  Check,
  ChevronDown,
  X,
  Edit2,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  Flame,
  ShoppingCart,
  Building2,
  Package,
  RefreshCw,
  Star,
  MapPin,
  Settings,
  Store,
  Sparkles,
  LayoutGrid,
  Grid3X3,
  Eye,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Info,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { CustomCheckbox } from '../common/CustomCheckbox';

export const LocationManagerTab: React.FC<{ stockList: any[]; onRefreshStock: () => void }> = ({
  stockList,
  onRefreshStock,
}) => {
  const { t } = useTranslation();
  const { format, currentCurrency, baseCurrency } = useCurrencyStore();

  const { warehouses, fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouseStore();

  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<any[]>([]);

  // View Mode: Realistic Gondola Shelf Bay vs Store Floor 2D Grid
  const [viewMode, setViewMode] = useState<'BAY' | 'FLOORPLAN'>('BAY');

  // Filters & Active Selection
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'ALL' | 'PRODUCTION' | 'RETAIL' | 'STORAGE' | 'COLD_ROOM'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Warehouse Switcher Dropdown & Management Modal
  const [whDropdownOpen, setWhDropdownOpen] = useState(false);
  const [whManageModalOpen, setWhManageModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [whIsDefault, setWhIsDefault] = useState(false);
  const whDropdownRef = useRef<HTMLDivElement>(null);

  // Modals state for Zone, Shelf, Stock Placement, Transfer
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [zoneType, setZoneType] = useState('RETAIL_FLOOR');
  const [isProductionPlace, setIsProductionPlace] = useState(false);
  const [zoneDescription, setZoneDescription] = useState('');

  const [shelfModalOpen, setShelfModalOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<any | null>(null);
  const [shelfName, setShelfName] = useState('');
  const [shelfCode, setShelfCode] = useState('');
  const [shelfLevel, setShelfLevel] = useState(1);
  const [shelfMaxCapacity, setShelfMaxCapacity] = useState(50);
  const [shelfNotes, setShelfNotes] = useState('');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetShelfForAssign, setTargetShelfForAssign] = useState<any | null>(null);
  const [assignProductId, setAssignProductId] = useState('');
  const [assignQuantity, setAssignQuantity] = useState(10);
  const [assignBatchNumber, setAssignBatchNumber] = useState('');
  const [assignMinThreshold, setAssignMinThreshold] = useState(5);
  const [assignStockDropdownOpen, setAssignStockDropdownOpen] = useState(false);
  const [assignStockSearch, setAssignStockSearch] = useState('');
  const assignStockDropdownRef = useRef<HTMLDivElement>(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceShelf, setTransferSourceShelf] = useState<any | null>(null);
  const [transferDestShelfId, setTransferDestShelfId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferBatchNumber, setTransferBatchNumber] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);

  // Custom Toast & Delete Confirmation state (NO native browser alerts/confirms!)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await api.get('/locations/tree');
      const tree = res.data.tree || [];
      setTreeData(tree);

      // Auto-select first warehouse if not selected
      if (!selectedWarehouseId && tree.length > 0) {
        setSelectedWarehouseId(tree[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load location tree:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to load layout tree', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
    fetchWarehouses();
  }, []);

  // Sync selected warehouse default
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      const defaultWh = warehouses.find((w) => w.isDefault) || warehouses[0];
      setSelectedWarehouseId(defaultWh.id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Outside click for dropdowns
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (whDropdownRef.current && !whDropdownRef.current.contains(e.target as Node)) {
        setWhDropdownOpen(false);
      }
      if (assignStockDropdownRef.current && !assignStockDropdownRef.current.contains(e.target as Node)) {
        setAssignStockDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Active Warehouse Entity
  const currentWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0];
  }, [warehouses, selectedWarehouseId]);

  // Flattened zones for the active warehouse
  const currentWarehouseZones = useMemo(() => {
    const wh = treeData.find((w) => w.id === selectedWarehouseId);
    return wh?.zones || [];
  }, [treeData, selectedWarehouseId]);

  // Filtered zones list for left navigation column
  const filteredZones = useMemo(() => {
    return currentWarehouseZones.filter((z: any) => {
      if (activeTypeFilter === 'PRODUCTION' && !z.isProductionPlace && z.type !== 'PRODUCTION') return false;
      if (activeTypeFilter === 'RETAIL' && z.type !== 'RETAIL_FLOOR') return false;
      if (activeTypeFilter === 'STORAGE' && z.type !== 'STORAGE') return false;
      if (activeTypeFilter === 'COLD_ROOM' && z.type !== 'COLD_ROOM') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q);
        const matchShelf = z.racks?.some((r: any) =>
          r.shelves?.some((s: any) =>
            s.name.toLowerCase().includes(q) ||
            s.fullLocationCode?.toLowerCase().includes(q) ||
            s.assignments?.some((a: any) => a.productName?.toLowerCase().includes(q) || a.sku?.toLowerCase().includes(q))
          )
        );
        return matchName || matchShelf;
      }
      return true;
    });
  }, [currentWarehouseZones, activeTypeFilter, searchQuery]);

  // Auto-select first zone if active selection invalid
  useEffect(() => {
    if (filteredZones.length > 0) {
      const exists = filteredZones.some((z: any) => z.id === selectedZoneId);
      if (!exists) {
        setSelectedZoneId(filteredZones[0].id);
      }
    } else {
      setSelectedZoneId('');
    }
  }, [filteredZones, selectedZoneId]);

  // Active Zone Entity (Contains racks and shelves)
  const activeZone = useMemo(() => {
    return currentWarehouseZones.find((z: any) => z.id === selectedZoneId) || filteredZones[0];
  }, [currentWarehouseZones, selectedZoneId, filteredZones]);

  // Comprehensive Facility Stats
  const facilityStats = useMemo(() => {
    let totalZonesCount = currentWarehouseZones.length;
    let totalShelves = 0;
    let totalPlacedStock = 0;
    let totalMaxCap = 0;
    let overflowShelves = 0;
    let lowStockShelves = 0;

    currentWarehouseZones.forEach((z: any) => {
      z.racks?.forEach((r: any) => {
        r.shelves?.forEach((s: any) => {
          totalShelves += 1;
          const qty = s.totalQuantity || 0;
          const cap = s.maxItemCapacity || 50;
          totalPlacedStock += qty;
          totalMaxCap += cap;
          if (qty > cap) overflowShelves += 1;
          if (qty > 0 && qty <= (s.minRestockThreshold || 5)) lowStockShelves += 1;
        });
      });
    });

    const occupancyRate = totalMaxCap > 0 ? Math.round((totalPlacedStock / totalMaxCap) * 100) : 0;
    return {
      totalZonesCount,
      totalShelves,
      totalPlacedStock,
      totalMaxCap,
      occupancyRate,
      overflowShelves,
      lowStockShelves,
    };
  }, [currentWarehouseZones]);

  // Flatten all shelves for transfer destination dropdown
  const allShelves = useMemo(() => {
    const list: any[] = [];
    treeData.forEach((wh) => {
      wh.zones?.forEach((z: any) => {
        z.racks?.forEach((r: any) => {
          r.shelves?.forEach((s: any) => {
            list.push({ ...s, zoneName: z.name, rackName: r.name, warehouseName: wh.name });
          });
        });
      });
    });
    return list;
  }, [treeData]);

  // Filter selectable stocks in combobox
  const filteredAvailableStocks = useMemo(() => {
    if (!assignStockSearch.trim()) return stockList;
    const q = assignStockSearch.toLowerCase().trim();
    return stockList.filter(
      (s) =>
        (s.productName || '').toLowerCase().includes(q) ||
        (s.sku || '').toLowerCase().includes(q) ||
        (s.batchNumber || '').toLowerCase().includes(q)
    );
  }, [stockList, assignStockSearch]);

  const selectedStockItem = useMemo(() => {
    return stockList.find((s) => s.productId === assignProductId || s.id === assignProductId);
  }, [stockList, assignProductId]);

  // ─── WAREHOUSE MODAL HANDLERS ───
  const handleOpenAddWarehouse = () => {
    setEditingWarehouse(null);
    setWhName('');
    setWhCode('');
    setWhLocation('');
    setWhIsDefault(false);
    setWhManageModalOpen(true);
  };

  const handleOpenEditWarehouse = (wh: WarehouseItem) => {
    setEditingWarehouse(wh);
    setWhName(wh.name);
    setWhCode(wh.code);
    setWhLocation(wh.location || '');
    setWhIsDefault(wh.isDefault);
    setWhManageModalOpen(true);
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, {
          name: whName,
          code: whCode,
          location: whLocation,
          isDefault: whIsDefault,
        });
        showToast(t('locations.warehouseUpdated', 'Facility updated successfully'), 'success');
      } else {
        const created = await createWarehouse({
          name: whName,
          code: whCode,
          location: whLocation,
          isDefault: whIsDefault,
        });
        setSelectedWarehouseId(created.id);
        showToast(t('locations.warehouseCreated', 'New facility created successfully'), 'success');
      }
      soundFX.playCashSuccess();
      setWhManageModalOpen(false);
      fetchTree();
      onRefreshStock();
    } catch (err: any) {
      soundFX.playError();
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const requestDeleteWarehouse = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('locations.deleteWarehouseTitle', 'Delete Facility: {{name}}', { name }),
      description: t(
        'locations.deleteWarehouseConfirm',
        'Are you sure you want to delete this warehouse? All zones and stock must be emptied first.'
      ),
      onConfirm: async () => {
        try {
          await deleteWarehouse(id);
          soundFX.playBeep();
          showToast(t('locations.warehouseDeleted', 'Warehouse deleted successfully'), 'info');
          setSelectedWarehouseId(warehouses.find((w) => w.id !== id)?.id || '');
          fetchTree();
          onRefreshStock();
        } catch (err: any) {
          soundFX.playError();
          showToast(err.response?.data?.message || err.message, 'error');
        }
      },
    });
  };

  // ─── ZONE / AISLE MODAL HANDLERS ───
  const handleOpenAddZone = () => {
    setEditingZone(null);
    setZoneName('');
    setZoneCode('');
    setZoneType('RETAIL_FLOOR');
    setIsProductionPlace(false);
    setZoneDescription('');
    setZoneModalOpen(true);
  };

  const handleOpenEditZone = (zone: any) => {
    setEditingZone(zone);
    setZoneName(zone.name);
    setZoneCode(zone.code);
    setZoneType(zone.type);
    setIsProductionPlace(zone.isProductionPlace);
    setZoneDescription(zone.description || '');
    setZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingZone) {
        await api.put(`/locations/zones/${editingZone.id}`, {
          name: zoneName,
          code: zoneCode,
          type: zoneType,
          isProductionPlace,
          description: zoneDescription,
        });
        showToast(t('locations.zoneUpdated', 'Aisle/Area updated successfully'), 'success');
      } else {
        const res = await api.post('/locations/zones', {
          warehouseId: selectedWarehouseId || warehouses[0]?.id,
          name: zoneName,
          code: zoneCode,
          type: zoneType,
          isProductionPlace,
          description: zoneDescription,
        });
        if (res.data?.zone?.id) {
          setSelectedZoneId(res.data.zone.id);
        }
        showToast(t('locations.zoneCreated', 'New Aisle/Area created successfully'), 'success');
      }
      soundFX.playBeep();
      setZoneModalOpen(false);
      fetchTree();
    } catch (err: any) {
      soundFX.playError();
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const requestDeleteZone = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('locations.deleteZoneTitle', 'Delete Aisle/Area: {{name}}', { name }),
      description: t(
        'locations.deleteConfirm',
        'Are you sure you want to delete this aisle/area? All attached shelf tiers and allocations will be deleted.'
      ),
      onConfirm: async () => {
        try {
          await api.delete(`/locations/zones/${id}`);
          soundFX.playBeep();
          showToast(t('locations.zoneDeleted', 'Aisle/Area deleted'), 'info');
          fetchTree();
        } catch (err: any) {
          soundFX.playError();
          showToast(err.response?.data?.message || err.message, 'error');
        }
      },
    });
  };

  // ─── SHELF LEVEL HANDLERS ───
  const handleOpenAddShelf = (rackId?: string) => {
    setEditingShelf(null);
    const existingShelves = activeZone?.racks?.flatMap((r: any) => r.shelves || []) || [];
    const nextIndex = existingShelves.length + 1;
    const nextCode = `S0${nextIndex}`;
    setShelfName(`${activeZone?.name || 'Aisle'} - Level ${nextIndex}`);
    setShelfCode(nextCode);
    setShelfLevel(nextIndex);
    setShelfMaxCapacity(50);
    setShelfNotes(rackId || activeZone?.racks?.[0]?.id || '');
    setShelfModalOpen(true);
  };

  const handleOpenEditShelf = (shelf: any) => {
    setEditingShelf(shelf);
    setShelfName(shelf.name);
    setShelfCode(shelf.code);
    setShelfLevel(shelf.level || 1);
    setShelfMaxCapacity(shelf.maxItemCapacity || 50);
    setShelfNotes(shelf.rackId);
    setShelfModalOpen(true);
  };

  const handleSaveShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShelf) {
        await api.put(`/locations/shelves/${editingShelf.id}`, {
          name: shelfName,
          code: shelfCode,
          level: shelfLevel,
          maxItemCapacity: shelfMaxCapacity,
        });
        showToast(t('locations.shelfUpdated', 'Shelf tier updated'), 'success');
      } else {
        await api.post('/locations/shelves', {
          rackId: shelfNotes || activeZone?.racks?.[0]?.id || undefined,
          zoneId: activeZone?.id,
          name: shelfName,
          code: shelfCode,
          level: shelfLevel,
          maxItemCapacity: shelfMaxCapacity,
        });
        showToast(t('locations.shelfCreated', 'New shelf tier added to gondola'), 'success');
      }
      soundFX.playBeep();
      setShelfModalOpen(false);
      fetchTree();
    } catch (err: any) {
      soundFX.playError();
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const requestDeleteShelf = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('locations.deleteShelfTitle', 'Delete Shelf Tier: {{name}}', { name }),
      description: t(
        'locations.deleteShelfConfirm',
        'Are you sure you want to delete this shelf level? Any item placements will be cleared.'
      ),
      onConfirm: async () => {
        try {
          await api.delete(`/locations/shelves/${id}`);
          soundFX.playBeep();
          showToast(t('locations.shelfDeleted', 'Shelf tier deleted'), 'info');
          fetchTree();
        } catch (err: any) {
          soundFX.playError();
          showToast(err.response?.data?.message || err.message, 'error');
        }
      },
    });
  };

  // ─── STOCK ASSIGNMENT & TRANSFER ───
  const handleOpenAssignStock = (shelf: any) => {
    setTargetShelfForAssign(shelf);
    setAssignProductId(stockList[0]?.productId || stockList[0]?.id || '');
    setAssignQuantity(10);
    setAssignBatchNumber(stockList[0]?.batchNumber || '');
    setAssignMinThreshold(5);
    setAssignStockSearch('');
    setAssignModalOpen(true);
  };

  const handleSaveStockAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetShelfForAssign || !assignProductId) return;
    try {
      const prod = stockList.find((s) => s.productId === assignProductId || s.id === assignProductId);
      await api.post('/locations/assign-stock', {
        shelfId: targetShelfForAssign.id,
        productId: prod?.productId || assignProductId,
        variantId: prod?.variantId,
        batchNumber: assignBatchNumber || prod?.batchNumber,
        quantity: Number(assignQuantity),
        minRestockThreshold: Number(assignMinThreshold),
      });
      soundFX.playCashSuccess();
      showToast(t('locations.stockPlacedSuccess', 'Product batch placed onto shelf'), 'success');
      setAssignModalOpen(false);
      fetchTree();
      onRefreshStock();
    } catch (err: any) {
      soundFX.playError();
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleOpenTransfer = (shelf: any, assignment: any) => {
    setTransferSourceShelf(shelf);
    setTransferProductId(assignment.productId);
    setTransferBatchNumber(assignment.batchNumber || '');
    setTransferQuantity(Math.min(5, assignment.quantity));
    setTransferDestShelfId(allShelves.find((s) => s.id !== shelf.id)?.id || '');
    setTransferModalOpen(true);
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceShelf || !transferDestShelfId || !transferProductId) return;
    try {
      await api.post('/locations/transfer-stock', {
        fromShelfId: transferSourceShelf.id,
        toShelfId: transferDestShelfId,
        productId: transferProductId,
        batchNumber: transferBatchNumber,
        quantity: Number(transferQuantity),
      });
      soundFX.playCashSuccess();
      showToast(t('locations.transferSuccess', 'Stock successfully transferred between shelves'), 'success');
      setTransferModalOpen(false);
      fetchTree();
      onRefreshStock();
    } catch (err: any) {
      soundFX.playError();
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  // Helper for shelf tier naming badge
  const getTierMetadata = (level: number) => {
    switch (level) {
      case 4:
        return {
          title: t('locations.tierTop', 'Top Cap / Overhead Display'),
          tag: 'TOP CAP',
          color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400',
          icon: Sparkles,
        };
      case 3:
        return {
          title: t('locations.tierEyeLevel', 'Golden Zone • Eye Level (High Margin)'),
          tag: '🌟 EYE LEVEL',
          color: 'from-amber-500/25 to-yellow-500/25 border-amber-500/40 text-amber-400',
          icon: Star,
        };
      case 2:
        return {
          title: t('locations.tierReach', 'Reach Zone • Fast-Moving Stock'),
          tag: 'REACH ZONE',
          color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
          icon: ShoppingCart,
        };
      case 1:
      default:
        return {
          title: t('locations.tierBottom', 'Base Deck • Heavy / Bulk Storage'),
          tag: 'BASE DECK',
          color: 'from-blue-500/20 to-slate-500/20 border-blue-500/30 text-blue-400',
          icon: Boxes,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-200 shadow-rose-950/50'
                : 'bg-slate-900/90 border-slate-700 text-slate-200 shadow-black/50'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 1. Ultra-Luxe Facility Header Banner & Live Stats ─── */}
      <div className="p-6 neu-card-lg space-y-5 relative">
        {/* Top Row: Facility Switcher & View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Facility Popover Switcher */}
            <div ref={whDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setWhDropdownOpen(!whDropdownOpen)}
                className="h-11 px-4 neu-btn text-slate-800 dark:text-white font-extrabold text-xs flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
              >
                <div className="w-6 h-6 rounded-lg neu-sunken-sm text-emerald-500 flex items-center justify-center">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold tracking-wide max-w-[220px] truncate">
                  {currentWarehouse?.name || t('purchases.selectWarehousePlaceholder', 'Select Facility Hub')}
                </span>
                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 neu-pill text-emerald-600 dark:text-emerald-400">
                  {currentWarehouse?.code || 'HUB'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Warehouse Dropdown Menu */}
              {whDropdownOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-84 neu-card-lg p-3 space-y-1.5 shadow-2xl bg-[#edf2f8] dark:bg-[#171e2b] border border-slate-300/80 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('locations.selectActiveFacility', 'Select Facility / Store Hub')}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {warehouses.map((wh) => (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => {
                          setSelectedWarehouseId(wh.id);
                          setWhDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                          selectedWarehouseId === wh.id
                            ? 'neu-tab-active font-black text-emerald-600 dark:text-emerald-400'
                            : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-bold border border-transparent'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 dark:text-white">{wh.name}</span>
                            {wh.isDefault && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 font-bold">
                                {t('locations.defaultBadge', 'Primary Hub')}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {wh.code} {wh.location && `• ${wh.location}`}
                          </div>
                        </div>
                        {selectedWarehouseId === wh.id && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setWhDropdownOpen(false);
                        setWhManageModalOpen(true);
                      }}
                      className="w-full py-2.5 px-3 neu-btn text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{t('locations.manageWarehousesBranches', 'Manage Facilities & Branches')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* View Mode Toggle: 3D Gondola Bay vs Floor Grid */}
            <div className="p-1 neu-tab-container flex items-center gap-1 text-xs font-black">
              <button
                type="button"
                onClick={() => setViewMode('BAY')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'BAY'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('locations.viewGondolaBay', '3D Gondola Bay')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('FLOORPLAN')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'FLOORPLAN'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>{t('locations.viewFloorMap', 'Store Floorplan')}</span>
              </button>
            </div>
          </div>

          {/* Right Action: Add Aisle / Area */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddZone}
              className="h-11 px-5 neu-btn-primary text-white font-black text-xs flex items-center gap-2 shadow-neu-glow-emerald active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('locations.btnAddAisleArea', 'Add Aisle / Area')}</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 neu-card-interactive space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>{t('locations.kpiZones', 'Total Aisles / Zones')}</span>
              <div className="p-1.5 rounded-lg neu-sunken-sm text-indigo-500">
                <Store className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{facilityStats.totalZonesCount}</div>
          </div>

          <div className="p-3.5 neu-card-interactive space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>{t('locations.kpiShelves', 'Active Shelf Tiers')}</span>
              <div className="p-1.5 rounded-lg neu-sunken-sm text-emerald-500">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{facilityStats.totalShelves}</div>
          </div>

          <div className="p-3.5 neu-card-interactive space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>{t('locations.kpiStockPlaced', 'Stock on Shelves')}</span>
              <div className="p-1.5 rounded-lg neu-sunken-sm text-amber-500">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {facilityStats.totalPlacedStock}{' '}
              <span className="text-xs font-normal text-slate-400">/ {facilityStats.totalMaxCap} pcs</span>
            </div>
          </div>

          <div className="p-3.5 neu-card-interactive space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>{t('locations.occupancyLabel', 'Store Occupancy')}</span>
              <div className="p-1.5 rounded-lg neu-sunken-sm text-sky-500">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{facilityStats.occupancyRate}%</span>
              <div className="flex-1 h-2 rounded-full neu-sunken-sm overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    facilityStats.occupancyRate > 90
                      ? 'bg-rose-500'
                      : facilityStats.occupancyRate > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, facilityStats.occupancyRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Filter Ribbon & Search Bar ─── */}
      <div className="p-4 neu-card-lg flex flex-wrap items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="neu-tab-container p-1 flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTypeFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTypeFilter === 'ALL'
                ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('locations.allAreas', 'All Areas')} ({currentWarehouseZones.length})
          </button>

          <button
            onClick={() => setActiveTypeFilter('RETAIL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTypeFilter === 'RETAIL'
                ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{t('locations.minimarkAisles', 'Minimark Gondolas')}</span>
          </button>

          <button
            onClick={() => setActiveTypeFilter('PRODUCTION')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTypeFilter === 'PRODUCTION'
                ? 'neu-tab-active text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{t('locations.kitchenPrep', 'Kitchen & Prep')}</span>
          </button>

          <button
            onClick={() => setActiveTypeFilter('COLD_ROOM')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTypeFilter === 'COLD_ROOM'
                ? 'neu-tab-active text-cyan-600 dark:text-cyan-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('locations.zoneTypeCold', 'Cold Room / Freezers')}</span>
          </button>

          <button
            onClick={() => setActiveTypeFilter('STORAGE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTypeFilter === 'STORAGE'
                ? 'neu-tab-active text-sky-600 dark:text-sky-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span>{t('locations.storageCold', 'Bulk Warehouse')}</span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative flex-1 max-w-sm min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('locations.searchAislePlaceholder', 'Find aisle, shelf code, product SKU...')}
            className="w-full h-10 pl-10 pr-8 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. Main Workspace: Floor Grid vs 3D Gondola Bay ─── */}
      {loading ? (
        <div className="py-28 text-center text-slate-400 space-y-4">
          <RefreshCw className="w-10 h-10 mx-auto animate-spin text-indigo-500" />
          <p className="text-xs font-bold uppercase tracking-widest">{t('common.loading', 'Loading Store Planogram...')}</p>
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {t('locations.noAislesTitle', 'No Aisles or Areas Created in this Facility')}
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {t(
              'locations.noAislesSubtitle',
              'Click "+ Add Aisle / Area" to set up your store floor gondolas, kitchen prep tables, and storage racks.'
            )}
          </p>
          <button
            type="button"
            onClick={handleOpenAddZone}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('locations.createFirstAisle', 'Create First Store Aisle')}</span>
          </button>
        </div>
      ) : viewMode === 'FLOORPLAN' ? (
        /* ─── FLOORPLAN MAP MODE: 2D Interactive Store Layout Grid ─── */
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-indigo-500" />
                <span>{t('locations.storeFloorGridTitle', 'Interactive Store Floorplan Overview')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('locations.storeFloorGridDesc', 'Visual topology of all store aisles, gondola bays, prep stations & cold rooms. Click any tile to drill into shelf tiers.')}
              </p>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
              {filteredZones.length} {t('locations.zonesMapped', 'Zones Mapped')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredZones.map((zone: any) => {
              const isSelected = zone.id === selectedZoneId;
              const totalItems = zone.racks?.reduce(
                (sum: number, r: any) =>
                  sum + (r.shelves?.reduce((sSum: number, s: any) => sSum + (s.totalQuantity || 0), 0) || 0),
                0
              ) || 0;
              const totalShelvesCount = zone.racks?.reduce(
                (sum: number, r: any) => sum + (r.shelves?.length || 0),
                0
              ) || 0;
              const totalCapacity = zone.racks?.reduce(
                (sum: number, r: any) =>
                  sum + (r.shelves?.reduce((sSum: number, s: any) => sSum + (s.maxItemCapacity || 50), 0) || 0),
                0
              ) || 50;
              const occPct = totalCapacity > 0 ? Math.round((totalItems / totalCapacity) * 100) : 0;

              return (
                <div
                  key={zone.id}
                  onClick={() => {
                    setSelectedZoneId(zone.id);
                    setViewMode('BAY');
                  }}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500 shadow-xl shadow-indigo-500/10'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                          zone.isProductionPlace || zone.type === 'PRODUCTION'
                            ? 'bg-amber-500/20 text-amber-500'
                            : zone.type === 'RETAIL_FLOOR'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : zone.type === 'COLD_ROOM'
                            ? 'bg-cyan-500/20 text-cyan-500'
                            : 'bg-sky-500/20 text-sky-500'
                        }`}
                      >
                        {zone.isProductionPlace || zone.type === 'PRODUCTION' ? (
                          <Flame className="w-5 h-5" />
                        ) : zone.type === 'RETAIL_FLOOR' ? (
                          <ShoppingCart className="w-5 h-5" />
                        ) : zone.type === 'COLD_ROOM' ? (
                          <Sparkles className="w-5 h-5" />
                        ) : (
                          <Warehouse className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900 dark:text-white truncate max-w-[150px]">
                          {zone.name}
                        </div>
                        <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {zone.code}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        occPct > 90
                          ? 'bg-rose-500/20 text-rose-500'
                          : occPct > 60
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-emerald-500/20 text-emerald-500'
                      }`}
                    >
                      {occPct}% Full
                    </span>
                  </div>

                  {/* Visual Tier Slots Preview */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{totalShelvesCount} Shelf Tiers</span>
                      <span>{totalItems} / {totalCapacity} pcs</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          occPct > 90 ? 'bg-rose-500' : occPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, occPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-extrabold group-hover:translate-x-1 transition-transform">
                    <span>{t('locations.inspectGondolaBay', 'Inspect Gondola Bay')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── 2-PANEL SPLIT: Left Aisles Navigator | Right 3D Gondola Rack Bay ─── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT COLUMN: Aisles & Sections Navigator (4 cols / ~33%) ─── */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('locations.aislesAndStations', 'Aisles & Stations')}</span>
                <span className="text-slate-500">({filteredZones.length})</span>
              </span>
              <span>{t('locations.occupancyLabel', 'Occupancy')}</span>
            </div>

            <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
              {filteredZones.map((zone: any) => {
                const isSelected = zone.id === selectedZoneId;
                const totalItems = zone.racks?.reduce(
                  (sum: number, r: any) =>
                    sum + (r.shelves?.reduce((sSum: number, s: any) => sSum + (s.totalQuantity || 0), 0) || 0),
                  0
                ) || 0;
                const totalShelvesCount = zone.racks?.reduce(
                  (sum: number, r: any) => sum + (r.shelves?.length || 0),
                  0
                ) || 0;
                const totalCap = zone.racks?.reduce(
                  (sum: number, r: any) =>
                    sum + (r.shelves?.reduce((sSum: number, s: any) => sSum + (s.maxItemCapacity || 50), 0) || 0),
                  0
                ) || 50;
                const occ = totalCap > 0 ? Math.round((totalItems / totalCap) * 100) : 0;

                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-xs ${
                            zone.isProductionPlace || zone.type === 'PRODUCTION'
                              ? 'bg-amber-500/20 text-amber-500'
                              : zone.type === 'RETAIL_FLOOR'
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : zone.type === 'COLD_ROOM'
                              ? 'bg-cyan-500/20 text-cyan-500'
                              : 'bg-sky-500/20 text-sky-500'
                          }`}
                        >
                          {zone.isProductionPlace || zone.type === 'PRODUCTION' ? (
                            <Flame className="w-5 h-5" />
                          ) : zone.type === 'RETAIL_FLOOR' ? (
                            <ShoppingCart className="w-5 h-5" />
                          ) : zone.type === 'COLD_ROOM' ? (
                            <Sparkles className="w-5 h-5" />
                          ) : (
                            <Warehouse className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs truncate text-slate-900 dark:text-white">
                              {zone.name}
                            </span>
                            <span className="text-[9px] font-mono font-black bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                              {zone.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {t('locations.shelvesCountLabel', {
                              shelves: totalShelvesCount,
                              items: totalItems,
                              defaultValue: `${totalShelvesCount} Shelves • ${totalItems} items`,
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Right Occupancy & Hover Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                              occ > 90
                                ? 'bg-rose-500/15 text-rose-500'
                                : occ > 60
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-emerald-500/15 text-emerald-500'
                            }`}
                          >
                            {occ}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditZone(zone);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteZone(zone.id, zone.name);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── RIGHT COLUMN: Realistic 3D Gondola Supermarket Shelf Bay (8 cols / ~67%) ─── */}
          <div className="lg:col-span-8 space-y-4">
            {activeZone ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden">
                {/* Visual Aisle Header Banner */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/10 via-slate-50 dark:via-slate-800/40 to-transparent">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-black text-lg text-slate-900 dark:text-white">{activeZone.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-black">
                        {activeZone.code}
                      </span>
                      {activeZone.isProductionPlace && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>{t('locations.productionBenchBadge', 'PRODUCTION BENCH')}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeZone.description || t('locations.gondolaBaySubtitle', 'Retail Display Gondola & Multi-Tier Shelf Bay')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddShelf(activeZone.racks?.[0]?.id)}
                      className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>{t('locations.btnAddShelfLevel', 'Add Shelf Tier')}</span>
                    </button>
                  </div>
                </div>

                {/* ─── REALISTIC GONDOLA RACK STRUCTURE CANVAS ─── */}
                <div className="p-6 bg-slate-100/80 dark:bg-slate-950/60 relative">
                  {/* Steel Upright Posts Visual Simulation (Left & Right Industrial Columns) */}
                  <div className="relative">
                    {/* For each rack, render its shelf tiers */}
                    {activeZone.racks?.map((rack: any) => (
                      <div key={rack.id} className="space-y-5">
                        {!rack.shelves || rack.shelves.length === 0 ? (
                          <div className="py-16 text-center text-slate-400 space-y-3 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/40">
                            <Layers className="w-10 h-10 mx-auto opacity-30 text-indigo-500" />
                            <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                              {t('locations.noShelvesOnRack', 'No shelf tiers added to this gondola yet.')}
                            </div>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                              Add Tier 1 (Base deck), Tier 2 (Reach level), or Tier 3 (Eye level) to start stocking items.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenAddShelf(rack.id)}
                              className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>{t('locations.addShelfTier1', 'Add Base Shelf Tier 1')}</span>
                            </button>
                          </div>
                        ) : (
                          // Render Shelves stacked from Top (Level 4/3/2) to Bottom (Level 1)
                          [...rack.shelves]
                            .sort((a: any, b: any) => (b.level || 1) - (a.level || 1))
                            .map((shelf: any) => {
                              const meta = getTierMetadata(shelf.level || 1);
                              const TierIcon = meta.icon;
                              const currentQty = shelf.totalQuantity || 0;
                              const maxCap = shelf.maxItemCapacity || 50;
                              const occRate = maxCap > 0 ? Math.round((currentQty / maxCap) * 100) : 0;
                              const isOverloaded = currentQty > maxCap;

                              return (
                                <div
                                  key={shelf.id}
                                  className={`rounded-3xl bg-white dark:bg-slate-900 border-2 transition-all shadow-md overflow-hidden relative ${
                                    isOverloaded
                                      ? 'border-rose-500/80 ring-2 ring-rose-500/20'
                                      : 'border-slate-200/90 dark:border-slate-800'
                                  }`}
                                >
                                  {/* Heavy Duty Shelf Beam Header Bar */}
                                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/70">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                      {/* Tier Badge */}
                                      <span
                                        className={`px-2.5 py-1 rounded-xl font-black text-[10px] tracking-wide border flex items-center gap-1 bg-gradient-to-r ${meta.color}`}
                                      >
                                        <TierIcon className="w-3 h-3" />
                                        <span>L{shelf.level || 1} • {meta.tag}</span>
                                      </span>

                                      <span className="font-black text-xs text-slate-900 dark:text-white">
                                        {shelf.name}
                                      </span>

                                      <span className="text-[10px] font-mono text-slate-500 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md font-extrabold">
                                        {shelf.fullLocationCode}
                                      </span>
                                    </div>

                                    {/* Occupancy Progress & Action Buttons */}
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400">
                                        <span className={isOverloaded ? 'text-rose-500 font-black' : ''}>
                                          {currentQty} / {maxCap} pcs
                                        </span>
                                        <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                              isOverloaded
                                                ? 'bg-rose-500 animate-pulse'
                                                : occRate > 75
                                                ? 'bg-amber-500'
                                                : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${Math.min(100, occRate)}%` }}
                                          />
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenAssignStock(shelf)}
                                        className="h-7 px-2.5 rounded-xl bg-brand-500/15 hover:bg-brand-500/25 text-brand-600 dark:text-brand-400 font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3 stroke-[3]" />
                                        <span>{t('locations.btnPlaceItem', 'Stock SKU')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditShelf(shelf)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => requestDeleteShelf(shelf.id, shelf.name)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* ─── Shelf Deck Base (Products placed horizontally on this tier) ─── */}
                                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
                                    {shelf.assignments && shelf.assignments.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {shelf.assignments.map((item: any) => (
                                          <div
                                            key={item.id}
                                            className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between space-y-2 group"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                                                  {item.productName}
                                                </div>
                                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                                                  <span>SKU: {item.sku}</span>
                                                </div>
                                              </div>

                                              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs shrink-0">
                                                {item.quantity} pcs
                                              </span>
                                            </div>

                                            {/* Batch Tag & Move Button */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[10px]">
                                              <span className="text-slate-400 font-mono truncate max-w-[120px]">
                                                {item.batchNumber ? `Batch: ${item.batchNumber}` : t('locations.generalStock', 'General')}
                                              </span>

                                              <button
                                                type="button"
                                                onClick={() => handleOpenTransfer(shelf, item)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-500 hover:text-white text-slate-700 dark:text-slate-200 font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                              >
                                                <ArrowRightLeft className="w-3 h-3" />
                                                <span>{t('locations.btnMove', 'Move')}</span>
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => handleOpenAssignStock(shelf)}
                                        className="py-6 text-center text-slate-400 text-xs font-bold hover:text-indigo-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-indigo-500/5 transition-all space-y-1"
                                      >
                                        <div className="font-extrabold text-slate-600 dark:text-slate-300">
                                          {t('locations.emptyShelfBeamPrompt', '+ Empty Shelf Deck')}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          Click here to place products & batches onto this tier
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Physical Gondola Shelf Lip Effect */}
                                  <div className="h-1.5 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-t border-slate-200 dark:border-slate-700/50" />
                                </div>
                              );
                            })
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ─── MODAL: MANAGE WAREHOUSES & BRANCHES ─── */}
      {whManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <span>
                  {editingWarehouse
                    ? t('locations.modalEditWarehouseTitle', 'Edit Facility Hub')
                    : t('locations.manageWarehousesBranches', 'Manage Facilities & Branches')}
                </span>
              </h3>
              <button
                onClick={() => setWhManageModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Existing Warehouses List */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t('locations.selectActiveFacility', 'Configured Facilities')}
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {warehouses.map((w) => (
                    <div
                      key={w.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{w.name}</span>
                          <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-black">
                            {w.code}
                          </span>
                          {w.isDefault && (
                            <span className="text-[9px] text-emerald-400 font-black bg-emerald-500/20 px-1.5 py-0.5 rounded">
                              {t('locations.defaultBadge', 'PRIMARY')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {w.location || t('common.noData', 'No physical address')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWarehouse(w);
                            setWhName(w.name);
                            setWhCode(w.code);
                            setWhLocation(w.location || '');
                            setWhIsDefault(w.isDefault);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteWarehouse(w.id, w.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to Add/Edit */}
              <form onSubmit={handleSaveWarehouse} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
                  {editingWarehouse
                    ? t('locations.modalEditWarehouseTitle', 'Edit Selected Facility')
                    : t('locations.btnAddWarehouse', '+ Create New Facility')}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.warehouseName', 'Facility Name')}
                  </label>
                  <input
                    type="text"
                    required
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    placeholder="e.g. Downtown Flagship Store & Cold Hub"
                    className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      {t('locations.warehouseCode', 'Facility Code')}
                    </label>
                    <input
                      type="text"
                      required
                      value={whCode}
                      onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                      placeholder="WH-02"
                      className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      {t('locations.warehouseLocation', 'Address / Floor Location')}
                    </label>
                    <input
                      type="text"
                      value={whLocation}
                      onChange={(e) => setWhLocation(e.target.value)}
                      placeholder="e.g. Ground Floor, Building A"
                      className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div
                  onClick={() => setWhIsDefault(!whIsDefault)}
                  className="flex items-center gap-3 p-3 rounded-2xl neu-card-sm cursor-pointer text-slate-800 dark:text-slate-200 font-bold"
                >
                  <CustomCheckbox
                    checked={whIsDefault}
                    onChange={(checked) => setWhIsDefault(checked)}
                  />
                  <span className="text-xs">{t('locations.isDefaultWarehouse', 'Set as Default Primary Facility')}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {editingWarehouse && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWarehouse(null);
                        setWhName('');
                        setWhCode('');
                        setWhLocation('');
                        setWhIsDefault(false);
                      }}
                      className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-400 cursor-pointer"
                    >
                      {t('common.cancel', 'Clear')}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-md cursor-pointer"
                  >
                    {editingWarehouse ? t('common.save', 'Update Facility') : t('common.save', 'Save Facility')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT AISLE & ZONE ─── */}
      {zoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {editingZone ? t('locations.editStoreAisleTitle', 'Edit Store Aisle / Station') : t('locations.createStoreAisleTitle', 'Create Store Aisle / Station')}
              </h3>
              <button
                onClick={() => setZoneModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  {t('locations.aisleName', 'Aisle / Station Name')}
                </label>
                <input
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Aisle 1 - Beverages & Chilled Snacks"
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.aisleCode', 'Aisle Code')}
                  </label>
                  <input
                    type="text"
                    required
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value.toUpperCase())}
                    placeholder="A01"
                    className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.areaType', 'Area Type')}
                  </label>
                  <select
                    value={zoneType}
                    onChange={(e) => setZoneType(e.target.value)}
                    className="w-full h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="RETAIL_FLOOR">{t('locations.minimarkAisles', 'Minimark Gondola')}</option>
                    <option value="PRODUCTION">{t('locations.kitchenPrep', 'Kitchen & Prep')}</option>
                    <option value="STORAGE">{t('locations.storageCold', 'Warehouse Storage')}</option>
                    <option value="COLD_ROOM">{t('locations.zoneTypeCold', 'Cold Room / Freezer')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  {t('locations.zoneDescription', 'Description / Planogram Notes')}
                </label>
                <input
                  type="text"
                  value={zoneDescription}
                  onChange={(e) => setZoneDescription(e.target.value)}
                  placeholder="e.g. Front entrance display gondola, 4-tier steel rack"
                  className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div
                onClick={() => setIsProductionPlace(!isProductionPlace)}
                className="flex items-center gap-3 p-3.5 neu-card-interactive cursor-pointer text-slate-800 dark:text-slate-200 font-bold"
              >
                <CustomCheckbox
                  checked={isProductionPlace}
                  onChange={(checked) => setIsProductionPlace(checked)}
                />
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs">{t('locations.markAsKitchenStation', 'Mark as Kitchen / Prep Station')}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-md cursor-pointer"
                >
                  {t('locations.saveAisle', 'Save Aisle / Area')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT SHELF LEVEL ─── */}
      {shelfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {editingShelf ? t('locations.editShelfLevelTitle', 'Edit Shelf Tier') : t('locations.addShelfLevelTitle', 'Add Shelf Tier to Gondola')}
              </h3>
              <button
                onClick={() => setShelfModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShelf} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  {t('locations.shelfName', 'Shelf Tier Name')}
                </label>
                <input
                  type="text"
                  required
                  value={shelfName}
                  onChange={(e) => setShelfName(e.target.value)}
                  placeholder="e.g. Level 3 (Golden Eye Level)"
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.shelfCode', 'Shelf Code')}
                  </label>
                  <input
                    type="text"
                    required
                    value={shelfCode}
                    onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
                    placeholder="S01"
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.tierLevelLabel', 'Tier Level')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={shelfLevel}
                    onChange={(e) => setShelfLevel(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.maxCapacity', 'Capacity (pcs)')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={shelfMaxCapacity}
                    onChange={(e) => setShelfMaxCapacity(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShelfModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md cursor-pointer"
                >
                  {t('locations.saveShelf', 'Save Shelf Tier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PLACE PRODUCT BATCH ONTO SHELF ─── */}
      {assignModalOpen && targetShelfForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {t('locations.placeProductModalTitle', 'Stock SKU onto Shelf')}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {t('locations.targetShelf', 'Target')}: {targetShelfForAssign.fullLocationCode} ({targetShelfForAssign.name})
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAssign} className="p-6 space-y-4 text-xs">
              {/* Product Combobox */}
              <div ref={assignStockDropdownRef} className="relative">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  {t('locations.selectProductBatch', 'Select Product & SKU')}
                </label>

                <button
                  type="button"
                  onClick={() => setAssignStockDropdownOpen(!assignStockDropdownOpen)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-left flex items-center justify-between text-xs font-bold cursor-pointer"
                >
                  {selectedStockItem ? (
                    <div className="flex items-center gap-2.5 truncate">
                      <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-slate-900 dark:text-white truncate">{selectedStockItem.productName}</span>
                      <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                        {selectedStockItem.sku}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">{t('purchases.selectProductPlaceholder', 'Select product...')}</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {assignStockDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 space-y-2 max-h-60 overflow-y-auto">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={assignStockSearch}
                        onChange={(e) => setAssignStockSearch(e.target.value)}
                        placeholder="Search product name, SKU, batch..."
                        className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      {filteredAvailableStocks.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setAssignProductId(s.productId || s.id);
                            setAssignBatchNumber(s.batchNumber || '');
                            setAssignStockDropdownOpen(false);
                          }}
                          className="w-full p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div className="truncate pr-2">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{s.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {s.sku} • In Stock: {s.quantity} pcs
                            </div>
                          </div>
                          {(s.productId === assignProductId || s.id === assignProductId) && (
                            <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.quantityToPlace', 'Quantity to Stock (pcs)')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    {t('locations.minRestockAlertLevel', 'Min Alert Threshold')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={assignMinThreshold}
                    onChange={(e) => setAssignMinThreshold(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-md cursor-pointer"
                >
                  {t('locations.confirmPlacement', 'Confirm Stock Placement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: TRANSFER PRODUCT TO ANOTHER SHELF ─── */}
      {transferModalOpen && transferSourceShelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {t('locations.modalTransferTitle', 'Transfer Stock Between Shelves')}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {t('locations.sourceShelf', 'Origin')}: {transferSourceShelf.fullLocationCode} ({transferSourceShelf.name})
                </p>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  {t('locations.destShelf', 'Destination Shelf Tier')}
                </label>
                <select
                  value={transferDestShelfId}
                  onChange={(e) => setTransferDestShelfId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {allShelves
                    .filter((s) => s.id !== transferSourceShelf.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.zoneName} ➔ {s.name} ({s.fullLocationCode})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  {t('locations.transferQty', 'Transfer Quantity (pcs)')}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-md cursor-pointer"
                >
                  {t('locations.btnTransfer', 'Transfer Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CUSTOM SLEEK CONFIRMATION MODAL (Replaces archaic browser confirm()) ─── */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900 dark:text-white">{confirmDialog.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{confirmDialog.description}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  confirmDialog.onConfirm();
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {t('common.confirmDelete', 'Delete Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
