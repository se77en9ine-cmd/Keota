import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useCartStore } from '../../store/useCartStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { soundFX } from '../../utils/audio';
import { Clock, Play, Trash2, X, AlertCircle } from 'lucide-react';

interface HoldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HoldOrdersModal: React.FC<HoldOrdersModalProps> = ({ isOpen, onClose }) => {
  const [holds, setHolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadHeldOrder } = useCartStore();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const fetchHolds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pos/holds');
      setHolds(res.data.holds || []);
    } catch {
      setHolds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchHolds();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResume = async (holdId: string) => {
    try {
      const res = await api.get(`/pos/holds/${holdId}/resume`);
      const { sale, items } = res.data;

      // Delete from holds on server
      await api.delete(`/pos/holds/${holdId}`);

      loadHeldOrder(items, sale.holdReference, sale.tableNo, sale.notes);
      soundFX.playBeep();
      onClose();
    } catch (err: any) {
      alert(`Failed to resume order: ${err.message}`);
    }
  };

  const handleCancel = async (holdId: string) => {
    if (!confirm('Cancel and discard this held order?')) return;
    try {
      await api.delete(`/pos/holds/${holdId}`);
      fetchHolds();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg neu-card-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Active Held Orders</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 neu-circle-btn text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="text-center py-8 text-sm text-slate-400 font-semibold">Loading held tickets...</div>
          ) : holds.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center gap-2 text-slate-400 neu-card">
              <AlertCircle className="w-8 h-8 opacity-40 text-emerald-500" />
              <p className="text-sm font-bold">No held tickets currently</p>
            </div>
          ) : (
            holds.map((h) => (
              <div
                key={h.id}
                className="p-4 neu-card-interactive flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <span>{h.invoiceNo}</span>
                    {h.tableNo && (
                      <span className="text-[10px] neu-pill text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                        Table {h.tableNo}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(h.createdAt).toLocaleTimeString()} • {format(convert(h.totalAmount, baseCode, currentCurrency), currentCurrency)}
                  </div>
                  {h.notes && <div className="text-xs text-slate-500 italic mt-1">{h.notes}</div>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResume(h.id)}
                    className="px-3.5 py-2 neu-btn-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-neu-glow-emerald cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => handleCancel(h.id)}
                    className="p-2 neu-circle-btn text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
