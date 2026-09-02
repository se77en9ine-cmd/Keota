import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { X, Plus, DollarSign, ArrowDownRight, ArrowUpRight, Check, AlertCircle } from 'lucide-react';
import { CreatableCategorySelect } from '../common/CreatableCategorySelect';

interface QuickRecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickRecordTransactionModal: React.FC<QuickRecordTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentCurrency, convert, format, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [category, setCategory] = useState<string>('OPERATIONS');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const expenseCategories = [
    { value: 'OPERATIONS', label: 'Store Operations' },
    { value: 'SUPPLIES', label: 'Supplies & Packaging' },
    { value: 'RENT_UTILITIES', label: 'Rent & Utilities' },
    { value: 'SALARIES', label: 'Staff Salaries' },
    { value: 'MARKETING', label: 'Marketing & Ads' },
    { value: 'MISC', label: 'Miscellaneous' },
  ];

  const incomeCategories = [
    { value: 'SALES_MISC', label: 'Misc Store Income' },
    { value: 'SERVICES', label: 'Service & Catering Fee' },
    { value: 'REBATE', label: 'Vendor Rebate / Cashback' },
    { value: 'OTHER', label: 'Other Inflow' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a short description or title');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // If user inputs in active currency (e.g. LAK), convert to base currency
      const baseAmount = currentCurrency === baseCode ? numAmount : convert(numAmount, currentCurrency, baseCode);

      const payload = {
        storeId: 'store-flagship',
        category,
        amount: baseAmount,
        currency: baseCode,
        description: description.trim(),
      };

      if (type === 'EXPENSE') {
        await api.post('/accounting/expenses', payload);
      } else {
        await api.post('/accounting/income', payload);
      }

      setAmount('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md neu-card-lg overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center flex-shrink-0 ${
                type === 'EXPENSE' ? 'text-rose-500' : 'text-emerald-500'
              }`}
            >
              {type === 'EXPENSE' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {type === 'EXPENSE' ? 'Record Store Expense' : 'Record Misc Income'}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Log direct cash inflow or outflow in ledger</p>
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
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              Entry Type
            </label>
            <div className="grid grid-cols-2 gap-2 neu-tab-container p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setType('EXPENSE');
                  setCategory('OPERATIONS');
                }}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'EXPENSE'
                    ? 'neu-tab-active text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Expense (-)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('INCOME');
                  setCategory('SALES_MISC');
                }}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'INCOME'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Income (+)</span>
              </button>
            </div>
          </div>

          {/* Category Select / Input */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              Category
            </label>
            <CreatableCategorySelect
              value={category}
              onChange={(val) => setCategory(val)}
              options={type === 'EXPENSE' ? expenseCategories : incomeCategories}
              placeholder="Type or select a category..."
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              Amount ({currentCurrency})
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3.5 neu-input font-mono font-black text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              Title / Note
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Ice delivery, Packaging cups, Electricity bill..."
              className="w-full h-11 px-3.5 neu-input font-medium text-xs text-slate-900 dark:text-white outline-none"
            />
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
              className={`px-6 py-2.5 font-black text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                type === 'EXPENSE' ? 'neu-btn-danger text-white' : 'neu-btn-primary text-white'
              }`}
            >
              {loading ? <span className="export-spinner" /> : <Plus className="w-4 h-4" />}
              <span>{type === 'EXPENSE' ? 'Save Expense' : 'Save Income'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
