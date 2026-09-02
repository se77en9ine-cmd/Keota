import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  X,
  AlertTriangle,
  Flame,
  Clock,
  ShieldAlert,
  PackageMinus,
  CheckCircle2,
  DollarSign,
  Boxes,
  Search,
  ChevronDown,
  Check,
  Package,
  Layers,
  Building2,
  Tag,
} from 'lucide-react';
import { CustomCheckbox } from '../common/CustomCheckbox';

interface RecordLossModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockList: any[];
}

export const RecordLossModal: React.FC<RecordLossModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  stockList,
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [stockDropdownOpen, setStockDropdownOpen] = useState<boolean>(false);
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [reasonDropdownOpen, setReasonDropdownOpen] = useState<boolean>(false);

  const [lossType, setLossType] = useState<string>('DAMAGE');
  const [reason, setReason] = useState<string>('Damaged in transit / delivery');
  const [customReason, setCustomReason] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [postToAccounting, setPostToAccounting] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stockDropdownRef = useRef<HTMLDivElement>(null);
  const stockSearchInputRef = useRef<HTMLInputElement>(null);
  const reasonDropdownRef = useRef<HTMLDivElement>(null);

  // Filter selectable stocks that have quantity > 0
  const availableStocks = useMemo(() => {
    return stockList.filter((s) => s.quantity > 0);
  }, [stockList]);

  // Reactive search filter across product name, sku, batch, warehouse
  const filteredAvailableStocks = useMemo(() => {
    if (!stockSearchQuery.trim()) return availableStocks;
    const q = stockSearchQuery.toLowerCase().trim();
    return availableStocks.filter((s) => {
      const nameMatch = (s.productName || '').toLowerCase().includes(q);
      const skuMatch = (s.sku || '').toLowerCase().includes(q);
      const batchMatch = (s.batchNumber || '').toLowerCase().includes(q);
      const whMatch = (s.warehouseName || '').toLowerCase().includes(q);
      return nameMatch || skuMatch || batchMatch || whMatch;
    });
  }, [availableStocks, stockSearchQuery]);

  // Selected stock item details
  const selectedItem = useMemo(() => {
    return availableStocks.find((s) => s.id === selectedStockId) || null;
  }, [availableStocks, selectedStockId]);

  // Outside click listener for custom dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (stockDropdownRef.current && !stockDropdownRef.current.contains(e.target as Node)) {
        setStockDropdownOpen(false);
      }
      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(e.target as Node)) {
        setReasonDropdownOpen(false);
      }
    };
    if (stockDropdownOpen || reasonDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [stockDropdownOpen, reasonDropdownOpen]);

  // Auto focus search input when stock combobox opens
  useEffect(() => {
    if (stockDropdownOpen) {
      setTimeout(() => stockSearchInputRef.current?.focus(), 50);
    } else {
      setStockSearchQuery('');
    }
  }, [stockDropdownOpen]);

  // Default select first item if none selected
  useEffect(() => {
    if (isOpen && availableStocks.length > 0 && !selectedStockId) {
      setSelectedStockId(availableStocks[0].id);
    }
  }, [isOpen, availableStocks, selectedStockId]);

  // Adjust max quantity when item changes
  useEffect(() => {
    if (selectedItem && quantity > selectedItem.quantity) {
      setQuantity(Math.max(1, selectedItem.quantity));
    }
  }, [selectedItem]);

  // Preset reasons based on loss type
  const reasonPresets: Record<string, string[]> = {
    DAMAGE: [
      'Damaged in transit / delivery',
      'Dropped or crushed during shelving',
      'Packaging water leak / compromised seal',
      'Customer mishandling in store',
      'Refrigeration / Temperature fluctuation',
    ],
    EXPIRED: [
      'Past best-before / expiry date on shelf',
      'Near-expiry unsellable clearance fail',
      'Fresh perishable spoiled',
      'Batch recalled due to expiration',
    ],
    DEFECTIVE: [
      'Supplier factory defect / missing seal',
      'Product malfunction or spoiled inside seal',
      'Misprinted barcode / packaging error',
      'Customer return - defective quality',
    ],
    LOST: [
      'Discrepancy found during routine stock audit',
      'Suspected store theft / shoplifting',
      'Lost during inter-warehouse transit',
      'Unknown stock shrinkage',
    ],
    SHRINKAGE: [
      'Shift-end cashier physical recount mismatch',
      'Monthly cycle count shortage adjustment',
      'Data entry / scanning omission correction',
    ],
    INTERNAL_USE: [
      'Store cleaning & maintenance supply',
      'Staff sampling / demonstration use',
      'Store customer complimentary service',
    ],
  };

  const lossTypeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    DAMAGE: {
      label: t('loss.typeDamage', 'Damaged'),
      icon: Flame,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/30',
    },
    EXPIRED: {
      label: t('loss.typeExpired', 'Expired'),
      icon: Clock,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10 border-rose-500/30',
    },
    DEFECTIVE: {
      label: t('loss.typeDefective', 'Defective'),
      icon: ShieldAlert,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10 border-purple-500/30',
    },
    LOST: {
      label: t('loss.typeLost', 'Lost / Theft'),
      icon: PackageMinus,
      color: 'text-red-500',
      bg: 'bg-red-500/10 border-red-500/30',
    },
    SHRINKAGE: {
      label: t('loss.typeShrinkage', 'Stock Discrepancy'),
      icon: AlertTriangle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10 border-orange-500/30',
    },
    INTERNAL_USE: {
      label: t('loss.typeInternal', 'Store Internal Use'),
      icon: Boxes,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/30',
    },
  };


  const handleTypeSelect = (typeKey: string) => {
    setLossType(typeKey);
    const presets = reasonPresets[typeKey] || [];
    setReason(presets[0] || 'Other reason');
  };

  const unitCost = selectedItem?.avgCost || 0;
  const sellingPrice = selectedItem?.sellingPrice || 0;
  const totalCostLoss = quantity * unitCost;
  const totalRetailLoss = quantity * sellingPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setErrorMsg(t('loss.selectItemReq', 'Please select an inventory item'));
      return;
    }
    if (quantity <= 0 || quantity > selectedItem.quantity) {
      setErrorMsg(t('loss.invalidQty', `Quantity must be between 1 and ${selectedItem.quantity}`));
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const finalReason = reason === 'OTHER' ? customReason || 'Unspecified reason' : reason;

      await api.post('/inventory/loss', {
        inventoryId: selectedItem.id,
        productId: selectedItem.productId,
        warehouseId: selectedItem.warehouseId,
        batchNumber: selectedItem.batchNumber,
        lossType,
        reason: finalReason,
        quantity: Number(quantity),
        notes: notes.trim(),
        postToAccounting,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record stock loss';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl neu-card-lg rounded-3xl p-6 overflow-hidden flex flex-col max-h-[92vh] space-y-4">
        {/* Modal Header */}
        <div className="pb-3 border-b border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center font-black">
              <PackageMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {t('loss.modalTitle', 'Record Stock Loss & Shrinkage')}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {t('loss.modalSubtitle', 'Deduct damaged, expired, or missing items with automatic accounting write-off')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-5 flex-1 text-xs pr-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl neu-card-sm text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Loss Category Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              1. {t('loss.selectLossType', 'Loss Incident Type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(lossTypeConfig).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const isSelected = lossType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTypeSelect(key)}
                    className={`p-3 rounded-2xl text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'neu-tab-active text-rose-600 dark:text-rose-400 font-black'
                        : 'neu-btn text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-rose-500' : cfg.color}`} />
                      <span className="text-[11px]">{cfg.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Select Product / Inventory Batch with Searchable Combobox */}
          <div ref={stockDropdownRef} className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                2. {t('loss.selectProductBatch', 'Select Product & Batch')}
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {t('loss.batchesAvailable', '{{count}} batches available', { count: availableStocks.length })}
              </span>
            </div>

            {/* Custom Trigger Button */}
            <button
              type="button"
              onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
              className="w-full min-h-[52px] p-3 neu-input rounded-2xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer select-none outline-none"
            >
              {selectedItem ? (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                        {selectedItem.productName}
                      </span>
                      {selectedItem.sku && (
                        <span className="px-1.5 py-0.5 rounded neu-sunken-sm text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                          {selectedItem.sku}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {selectedItem.quantity} pcs on-hand
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        Batch: {selectedItem.batchNumber || 'N/A'}
                      </span>
                      <span>•</span>
                      <span className="truncate text-slate-500">
                        {selectedItem.warehouseName || 'Central WH'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Package className="w-4 h-4" />
                  <span>{t('loss.selectProductPrompt', 'Select a product & batch...')}</span>
                </div>
              )}

              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  stockDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                }`}
              />
            </button>

            {/* Glassmorphic Dropdown Menu with Integrated Search */}
            {stockDropdownOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 neu-card-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-80">
                {/* Search Bar Header */}
                <div className="p-2.5 border-b border-slate-200/40 dark:border-slate-800/60 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={stockSearchInputRef}
                      type="text"
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      placeholder={t('loss.searchStockPlaceholder', 'Search product name, SKU, batch #, or warehouse...')}
                      className="w-full h-9 pl-9 pr-8 neu-input text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    />
                    {stockSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStockSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
                  {filteredAvailableStocks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                      <Package className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs font-semibold">{t('loss.noProductsFound', 'No products or batches match your search query')}</p>
                    </div>
                  ) : (
                    filteredAvailableStocks.map((s) => {
                      const isSelected = s.id === selectedStockId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStockId(s.id);
                            setStockDropdownOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                              : 'border-transparent hover:bg-slate-500/5'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-black text-xs ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                {s.productName}
                              </span>
                              {s.sku && (
                                <span className="px-1.5 py-0.5 rounded neu-sunken-sm text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold">
                                  {s.sku}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded neu-sunken-sm text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                                {s.warehouseName || 'Central WH'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 text-[10px] text-slate-400 mt-1 flex-wrap font-medium">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {s.quantity} pcs
                              </span>
                              <span>•</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                Batch: {s.batchNumber || 'N/A'}
                              </span>
                              {s.expiryDate && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500 font-mono">
                                    Exp: {s.expiryDate}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                Cost: {format(s.avgCost || 0, baseCode)}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-6 h-6 rounded-full neu-btn-primary text-white flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Active Selected Item Summary Badge */}
            {selectedItem && (
              <div className="mt-2.5 p-3 rounded-2xl neu-sunken-sm flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">
                    {t('inventory.onHand', 'On-Hand Stock')}: <strong className="text-slate-900 dark:text-white">{selectedItem.quantity} pcs</strong>
                  </span>
                  <span className="text-slate-500">
                    {t('inventory.unitCost', 'Avg Cost')}: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{format(unitCost, baseCode)}</strong>
                  </span>
                  {selectedItem.expiryDate && (
                    <span className="text-slate-500">
                      {t('inventory.expiry', 'Expiry')}: <strong className="text-amber-500 font-mono">{selectedItem.expiryDate}</strong>
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                  {selectedItem.warehouseName || 'Central Warehouse'}
                </span>
              </div>
            )}
          </div>

          {/* 3. Reason & Quantity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                3. {t('loss.quantity', 'Quantity to Deduct')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={selectedItem ? selectedItem.quantity : 9999}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-11 px-3.5 neu-input text-sm font-black text-rose-600 dark:text-rose-400 outline-none"
                />
              </div>
            </div>

            {/* Reason Presets */}
            <div ref={reasonDropdownRef} className="sm:col-span-2 relative">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                4. {t('loss.reasonClassification', 'Reason Classification')}
              </label>

              <button
                type="button"
                onClick={() => setReasonDropdownOpen(!reasonDropdownOpen)}
                className="w-full h-11 px-3.5 neu-input rounded-2xl text-left flex items-center justify-between text-xs font-semibold transition-all cursor-pointer outline-none"
              >
                <span className="truncate">
                  {reason === 'OTHER' ? t('loss.otherCustomReason', 'Other custom reason...') : reason}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    reasonDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                  }`}
                />
              </button>

              {reasonDropdownOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl neu-card-lg shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto">
                  {(reasonPresets[lossType] || []).map((preset) => {
                    const isSelected = reason === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setReason(preset);
                          setReasonDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-500/5 font-medium'
                        }`}
                      >
                        <span className="truncate">{preset}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setReason('OTHER');
                      setReasonDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                      reason === 'OTHER'
                        ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-500/5 font-medium'
                    }`}
                  >
                    <span className="truncate">{t('loss.otherCustomReason', 'Other custom reason...')}</span>
                    {reason === 'OTHER' && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {reason === 'OTHER' && (
            <div>
              <input
                type="text"
                placeholder={t('loss.customReasonPlaceholder', 'Enter specific reason description...')}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full h-10 px-3.5 neu-input text-xs text-slate-800 dark:text-white outline-none"
              />
            </div>
          )}

          {/* Notes & Explanation */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              {t('loss.incidentNotes', 'Incident Notes / Evidence Details (Optional)')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('loss.notesPlaceholder', 'e.g., Damaged during unloading pallet #3 by delivery driver')}
              className="w-full p-3 neu-input text-xs text-slate-800 dark:text-white outline-none resize-none"
            />
          </div>

          {/* 4. Financial & Accounting Impact Preview Box */}
          <div className="p-4 rounded-2xl neu-sunken-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-rose-500" />
                <span>{t('loss.financialValuation', 'Loss Valuation & P&L Impact')}</span>
              </div>
              <div
                onClick={() => setPostToAccounting(!postToAccounting)}
                className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                <CustomCheckbox
                  checked={postToAccounting}
                  onChange={(checked) => setPostToAccounting(checked)}
                />
                <span>{t('loss.postToAccounting', 'Post to Accounting (Loss & Shrinkage Expense)')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl neu-card-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase">{t('loss.totalCostLoss', 'Total Cost Value Loss (COGS Impact)')}</div>
                <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                  {format(convert(totalCostLoss, baseCode, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {quantity} × {format(convert(unitCost, baseCode, currentCurrency), currentCurrency)}
                </div>
              </div>

              <div className="p-3 rounded-xl neu-card-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase">{t('loss.potentialRetailLoss', 'Potential Lost Revenue')}</div>
                <div className="text-base font-black text-slate-700 dark:text-slate-200 font-mono mt-0.5">
                  {format(convert(totalRetailLoss, baseCode, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {quantity} × {format(convert(sellingPrice, baseCode, currentCurrency), currentCurrency)}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !selectedItem || quantity <= 0}
              className="px-6 py-2.5 neu-btn-danger text-white font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{t('loss.confirmWriteOff', 'Confirm Stock Deduction & Write-off')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
