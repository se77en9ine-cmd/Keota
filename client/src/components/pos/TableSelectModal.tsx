import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useCartStore } from '../../store/useCartStore';
import { soundFX } from '../../utils/audio';
import {
  UtensilsCrossed,
  X,
  Check,
  Users,
  Search,
  Loader2,
  Square,
  Circle,
  RectangleHorizontal,
  PlayCircle,
  Plus,
  Sparkles,
} from 'lucide-react';

export interface DiningTable {
  id: string;
  name: string;
  code: string;
  zone: string;
  capacity: number;
  shape: 'SQUARE' | 'RECTANGLE' | 'ROUND';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  activeHoldId?: string | null;
  sortOrder: number;
}

interface TableSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTableNo?: string;
  onSelectTable: (tableCode: string | undefined) => void;
}

const STATUS_COLORS: Record<
  string,
  { badge: string; border: string; bg: string; dot: string; label: string }
> = {
  AVAILABLE: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    border: 'border-emerald-500/30 hover:border-emerald-500',
    bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
    dot: 'bg-emerald-500',
    label: 'Available',
  },
  OCCUPIED: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    border: 'border-rose-500/30 hover:border-rose-500',
    bg: 'bg-rose-500/5 hover:bg-rose-500/10',
    dot: 'bg-rose-500',
    label: 'Occupied',
  },
  RESERVED: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    border: 'border-amber-500/30 hover:border-amber-500',
    bg: 'bg-amber-500/5 hover:bg-amber-500/10',
    dot: 'bg-amber-500',
    label: 'Reserved',
  },
  CLEANING: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    border: 'border-blue-500/30 hover:border-blue-500',
    bg: 'bg-blue-500/5 hover:bg-blue-500/10',
    dot: 'bg-blue-500',
    label: 'Cleaning',
  },
};

export const TableSelectModal: React.FC<TableSelectModalProps> = ({
  isOpen,
  onClose,
  selectedTableNo,
  onSelectTable,
}) => {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeZone, setActiveZone] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const { loadHeldOrder } = useCartStore();

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tables');
      setTables(res.data.tables || []);
    } catch (err) {
      console.error('Failed to fetch dining tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTables();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const zones = ['ALL', ...Array.from(new Set(tables.map((t) => t.zone)))];

  const filteredTables = tables.filter((t) => {
    const matchesZone = activeZone === 'ALL' || t.zone === activeZone;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.zone.toLowerCase().includes(search.toLowerCase());
    return matchesZone && matchesSearch;
  });

  const handleResumeTableOrder = async (holdId: string, tableCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/pos/holds/${holdId}`);
      if (res.data.success && res.data.sale) {
        soundFX.playCashSuccess();
        loadHeldOrder(
          res.data.items,
          res.data.sale.holdReference,
          tableCode,
          res.data.sale.notes
        );
        onSelectTable(tableCode);
        onClose();
      }
    } catch (err: any) {
      alert(`Could not resume table order: ${err.message}`);
    }
  };

  const renderShapeIcon = (shape: string) => {
    if (shape === 'ROUND') return <Circle className="w-3.5 h-3.5 text-slate-400" />;
    if (shape === 'RECTANGLE') return <RectangleHorizontal className="w-3.5 h-3.5 text-slate-400" />;
    return <Square className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl neu-card-lg p-6 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                Restaurant Floor Plan & Tables
              </h3>
              <p className="text-xs text-slate-400">
                Select a dining table to assign or resume an active table ticket
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 neu-circle-btn text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Zone Tabs, Search & Clear Table */}
        <div className="space-y-3 flex-shrink-0">
          {/* Zone Filter Tabs */}
          <div className="p-1 neu-tab-container flex items-center gap-1.5 overflow-x-auto pb-1">
            {zones.map((zone) => {
              const count =
                zone === 'ALL'
                  ? tables.length
                  : tables.filter((t) => t.zone === zone).length;
              const active = activeZone === zone;
              return (
                <button
                  key={zone}
                  onClick={() => setActiveZone(zone)}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{zone === 'ALL' ? '🏢 All Zones' : zone}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? 'bg-emerald-500/20 text-emerald-500 font-bold' : 'neu-pill text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Takeout Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search table number (T-01, OT-02, VIP)..."
                className="w-full h-9 pl-9 pr-3 neu-input text-xs font-medium text-slate-800 dark:text-white outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectTable(undefined);
                onClose();
              }}
              className="h-9 px-3.5 neu-btn text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 transition-all"
            >
              <span>🥡 Takeout / No Table</span>
              {!selectedTableNo && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </div>
        </div>

        {/* Tables Floor Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px] pr-1">
          {loading ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Loading dining floor plan...</span>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 neu-card">
              <UtensilsCrossed className="w-8 h-8 opacity-30" />
              <span>No dining tables found matching criteria</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredTables.map((table) => {
                const isSelected = selectedTableNo === table.code || selectedTableNo === table.name;
                const statusStyle = STATUS_COLORS[table.status] || STATUS_COLORS.AVAILABLE;

                return (
                  <div
                    key={table.id}
                    onClick={() => {
                      soundFX.playBeep();
                      onSelectTable(table.code);
                      onClose();
                    }}
                    className={`p-3.5 neu-card-interactive flex flex-col justify-between gap-3 relative cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-emerald-500/40 shadow-neu-raised-sm'
                        : ''
                    }`}
                  >
                    {/* Top Row: Code & Shape */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        {renderShapeIcon(table.shape)}
                        <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                          {table.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${statusStyle.dot} animate-pulse`}
                        ></span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-black border ${statusStyle.badge}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                    </div>

                    {/* Middle Info */}
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {table.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{table.zone}</span>
                        <span className="flex items-center gap-1 font-bold">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{table.capacity} seats</span>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action / Resume Active Order */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      {table.status === 'OCCUPIED' && table.activeHoldId ? (
                        <button
                          type="button"
                          onClick={(e) => handleResumeTableOrder(table.activeHoldId!, table.code, e)}
                          className="w-full py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-extrabold text-[10px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <PlayCircle className="w-3 h-3" />
                          <span>Resume Order</span>
                        </button>
                      ) : isSelected ? (
                        <div className="w-full text-center text-brand-500 font-extrabold flex items-center justify-center gap-1 text-[11px]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </div>
                      ) : (
                        <div className="w-full text-center text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 text-[10px]">
                          Tap to assign
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
