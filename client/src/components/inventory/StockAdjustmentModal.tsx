import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { soundFX } from '../../utils/audio';
import {
  X,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Plus,
  Minus,
  Sparkles,
  RotateCcw,
  Calendar,
  Hash,
} from 'lucide-react';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { ExpiryBadge } from '../common/ExpiryBadge';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventoryItem: {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    warehouseId?: string;
    warehouseName?: string;
    batchNumber?: string;
    expiryDate?: string;
    quantity: number;
    avgCost: number;
    sellingPrice?: number;
  } | null;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  inventoryItem,
}) => {
  const { t } = useTranslation();
  const { format, currentCurrency } = useCurrencyStore();

  const [adjustType, setAdjustType] = useState<'AUDIT_CORRECTION' | 'RESTOCK' | 'DAMAGE' | 'SURPLUS'>('AUDIT_CORRECTION');
  const [adjustMode, setAdjustMode] = useState<'DELTA' | 'EXACT'>('DELTA');
  const [quantityDelta, setQuantityDelta] = useState<number>(0);
  const [exactQuantity, setExactQuantity] = useState<number>(inventoryItem?.quantity || 0);
  const [unitCost, setUnitCost] = useState<number>(inventoryItem?.avgCost || 0);
  const [batchNumber, setBatchNumber] = useState<string>(inventoryItem?.batchNumber || '');
  const [expiryDate, setExpiryDate] = useState<string>(inventoryItem?.expiryDate || '');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (inventoryItem) {
      setExactQuantity(inventoryItem.quantity);
      setUnitCost(inventoryItem.avgCost);
      setBatchNumber(inventoryItem.batchNumber || '');
      setExpiryDate(inventoryItem.expiryDate || '');
      setQuantityDelta(0);
      setError(null);
    }
  }, [inventoryItem]);

  if (!isOpen || !inventoryItem) return null;

  const currentQty = inventoryItem.quantity;
  const calculatedFinalQty =
    adjustMode === 'EXACT'
      ? Math.max(0, exactQuantity)
      : Math.max(0, currentQty + quantityDelta);

  const delta = calculatedFinalQty - currentQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/inventory/adjust', {
        inventoryId: inventoryItem.id,
        productId: inventoryItem.productId,
        warehouseId: inventoryItem.warehouseId,
        type: adjustType,
        quantityDelta: delta,
        newQuantity: calculatedFinalQty,
        unitCost: Number(unitCost) || inventoryItem.avgCost,
        batchNumber: batchNumber?.trim() || null,
        expiryDate: expiryDate?.trim() || null,
        notes: notes || `Manual stock adjustment (${adjustType})`,
      });

      soundFX.playCashSuccess();
      onSuccess();
      onClose();
    } catch (err: any) {
      soundFX.playError();
      setError(err?.response?.data?.message || err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg neu-card-lg rounded-3xl p-6 space-y-4 my-8 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {t('inventory.adjustTitle', 'Quick Stock Adjustment')}
              </h3>
              <p className="text-slate-400 text-xs font-mono mt-0.5">
                {inventoryItem.productName} ({inventoryItem.sku})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-2xl neu-card-sm text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Adjustment Reason Type */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
              {t('inventory.adjustTypeLabel', 'Reason for Adjustment')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'AUDIT_CORRECTION', label: t('inventory.typeAudit', 'Audit Stocktake Difference') },
                { id: 'RESTOCK', label: t('inventory.typeRestock', 'Inbound New Stock') },
                { id: 'DAMAGE', label: t('inventory.typeDamage', 'Damaged / Spoilage') },
                { id: 'SURPLUS', label: t('inventory.typeSurplus', 'Found Inventory Surplus') },
              ].map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => {
                    setAdjustType(tp.id as any);
                    soundFX.playBeep();
                  }}
                  className={`p-2.5 rounded-xl font-bold text-left transition-all cursor-pointer ${
                    adjustType === tp.id
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : 'neu-btn text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="truncate">{tp.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Calculator: Current -> Change -> Final */}
          <div className="p-4 rounded-2xl neu-sunken-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Current Stock: <strong className="text-slate-900 dark:text-white font-mono text-xs">{currentQty}</strong></span>
              <span>Adjustment: <strong className={`font-mono text-xs ${delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{delta >= 0 ? `+${delta}` : delta}</strong></span>
              <span>New Total: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{calculatedFinalQty}</strong></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('inventory.changeQtyLabel', 'Add / Subtract Qty (+/-)')}
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuantityDelta((prev) => prev - 1);
                      setAdjustMode('DELTA');
                    }}
                    className="w-9 h-9 neu-circle-btn font-bold cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={quantityDelta}
                    onChange={(e) => {
                      setQuantityDelta(Number(e.target.value));
                      setAdjustMode('DELTA');
                    }}
                    className="w-full h-9 px-2 text-center neu-input font-mono font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setQuantityDelta((prev) => prev + 1);
                      setAdjustMode('DELTA');
                    }}
                    className="w-9 h-9 neu-circle-btn font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('inventory.exactQtyLabel', 'Or Set Exact Stock Count')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={exactQuantity}
                  onChange={(e) => {
                    setExactQuantity(Number(e.target.value));
                    setAdjustMode('EXACT');
                  }}
                  className="w-full h-9 px-3 neu-input font-mono font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Batch # & Expiry Date Correction */}
          <div className="p-4 rounded-2xl neu-sunken-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('inventory.batchAndExpiryCorrection', 'Batch # & Expiry Date Correction')}</span>
              </span>
              {expiryDate && <ExpiryBadge expiryDate={expiryDate} forceShow={true} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1 text-[11px]">
                  {t('inventory.batchLotNo', 'Batch / Lot Number')}
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g., BATCH-8012"
                    className="w-full h-9 pl-8 pr-3 neu-input font-mono font-bold text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1 text-[11px]">
                  {t('inventory.expiryDateLabel', 'Expiration Date (FEFO)')}
                </label>
                <CustomDatePicker
                  value={expiryDate}
                  onChange={(val) => setExpiryDate(val)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>
          </div>

          {/* Reason Note */}
          <div>
            <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
              {t('inventory.notesLabel', 'Audit Reason & Notes (Optional)')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Expiry date typo correction / Weekly physical stock check"
              className="w-full h-10 px-3 neu-input text-xs outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200/40 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 neu-btn text-slate-600 dark:text-slate-400 font-bold cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 neu-btn-primary text-white font-extrabold flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>{t('common.saving', 'Saving...')}</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('inventory.btnApplyAdjustment', 'Confirm & Save Stock')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
