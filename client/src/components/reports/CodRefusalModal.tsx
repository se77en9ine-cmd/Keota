import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { X, Ban, AlertTriangle, RotateCcw, DollarSign } from 'lucide-react';

interface CodRefusalModalProps {
  sale: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CodRefusalModal: React.FC<CodRefusalModalProps> = ({
  sale,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentCurrency, convert, format, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [reason, setReason] = useState<string>('Customer unreachable by courier');
  const [freightLoss, setFreightLoss] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const reasons = [
    'Customer unreachable by courier / phone off',
    'Customer refused delivery at doorstep',
    'Wrong or incomplete delivery address',
    'Customer cancelled while in transit',
    'Courier damaged package during transit',
    'Fake order / spam customer',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const numLoss = parseFloat(freightLoss) || 0;
      const baseLoss = currentCurrency === baseCode ? numLoss : convert(numLoss, currentCurrency, baseCode);

      await api.post(`/pos/orders/${sale.id}/reject-cod`, {
        reason,
        deliveryFeeLoss: baseLoss,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reject COD order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md neu-card-lg overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center flex-shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Record COD Delivery Refusal</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Invoice: {sale.invoiceNo}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-2xl neu-sunken-sm text-rose-500 flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Summary Snapshot */}
          <div className="p-4 rounded-2xl neu-card-sm space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {sale.customerName ? `${sale.customerName} ${sale.customerSurname || ''}`.trim() : sale.deliveryContact || 'Guest'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Order Amount:</span>
              <span className="font-mono font-black text-slate-900 dark:text-white">
                {format(convert(sale.totalAmount, baseCode, currentCurrency), currentCurrency)}
              </span>
            </div>
            {sale.courierName && (
              <div className="flex justify-between">
                <span className="text-slate-400">Courier Partner:</span>
                <span className="font-bold text-amber-500">{sale.courierName}</span>
              </div>
            )}
          </div>

          {/* Refusal Reason */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              Refusal Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-11 px-3.5 neu-input font-bold text-xs text-slate-900 dark:text-white cursor-pointer outline-none"
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Courier Freight Loss Fee */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              Courier Freight Loss Fee ({currentCurrency})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={freightLoss}
              onChange={(e) => setFreightLoss(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3.5 neu-input font-mono font-black text-sm text-rose-500 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Shipping cost paid to courier that cannot be recovered from customer.
            </p>
          </div>

          {/* Auto Restock Notice */}
          <div className="p-3.5 rounded-2xl neu-sunken-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5 text-xs font-bold">
            <RotateCcw className="w-4 h-4 flex-shrink-0" />
            <span>Items will automatically be returned and restocked into store inventory.</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 neu-btn text-slate-600 dark:text-slate-400 font-bold text-xs cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 neu-btn-danger text-white font-black text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? <span className="export-spinner" /> : <Ban className="w-4 h-4" />}
              <span>Confirm Refusal & Restock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
