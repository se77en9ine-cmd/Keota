import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore, CurrencyItem } from '../../store/useCurrencyStore';
import { soundFX } from '../../utils/audio';
import {
  Coins,
  X,
  Save,
  Loader2,
  Sparkles,
  AlertCircle,
  Hash,
  Type,
  TrendingUp,
} from 'lucide-react';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyToEdit?: CurrencyItem | null;
}

const PRESET_CURRENCIES = [
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.52, decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rate: 1.37, decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rate: 0.88, decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.5, decimals: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', rate: 16200, decimals: 0 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', rate: 58.5, decimals: 2 },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', rate: 32.4, decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 7.82, decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', rate: 1.64, decimals: 2 },
];

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  onClose,
  currencyToEdit,
}) => {
  const { t } = useTranslation();
  const { currencies, createCurrency, updateCurrency } = useCurrencyStore();
  const baseCurrency = currencies.find((c) => c.isBase) || currencies[0] || { code: 'USD', symbol: '$', name: 'US Dollar' };

  const isEditing = Boolean(currencyToEdit);

  const [form, setForm] = useState({
    code: '',
    name: '',
    symbol: '',
    exchangeRate: 1,
    decimalPlaces: 2,
    symbolPosition: 'before' as 'before' | 'after',
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currencyToEdit) {
      setForm({
        code: currencyToEdit.code,
        name: currencyToEdit.name,
        symbol: currencyToEdit.symbol,
        exchangeRate: currencyToEdit.exchangeRate,
        decimalPlaces: currencyToEdit.decimalPlaces ?? 2,
        symbolPosition: currencyToEdit.symbolPosition ?? 'before',
        isActive: currencyToEdit.isActive ?? true,
      });
      setErrorMsg('');
    } else {
      setForm({
        code: '',
        name: '',
        symbol: '',
        exchangeRate: 1,
        decimalPlaces: 2,
        symbolPosition: 'before',
        isActive: true,
      });
      setErrorMsg('');
    }
  }, [currencyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.code.trim() || form.code.trim().length < 2) {
      setErrorMsg('Please enter a valid 2-5 letter currency code (e.g. AUD, CAD)');
      return;
    }
    if (!form.name.trim()) {
      setErrorMsg('Please enter the currency name');
      return;
    }
    if (!form.symbol.trim()) {
      setErrorMsg('Please enter the currency symbol (e.g. $, ₭, ฿, £, ¥)');
      return;
    }
    if (form.exchangeRate <= 0) {
      setErrorMsg('Exchange rate must be greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && currencyToEdit) {
        const res = await updateCurrency(currencyToEdit.code, {
          name: form.name,
          symbol: form.symbol,
          exchangeRate: Number(form.exchangeRate),
          decimalPlaces: Number(form.decimalPlaces),
          symbolPosition: form.symbolPosition,
          isActive: form.isActive,
        });

        if (res.success) {
          soundFX.playCashSuccess();
          onClose();
        } else {
          setErrorMsg(res.message || 'Failed to update currency');
          soundFX.playError();
        }
      } else {
        const res = await createCurrency({
          code: form.code.toUpperCase().trim(),
          name: form.name,
          symbol: form.symbol,
          exchangeRate: Number(form.exchangeRate),
          decimalPlaces: Number(form.decimalPlaces),
          symbolPosition: form.symbolPosition,
          isActive: form.isActive,
        });

        if (res.success) {
          soundFX.playCashSuccess();
          onClose();
        } else {
          setErrorMsg(res.message || 'Failed to create currency');
          soundFX.playError();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
      soundFX.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (p: typeof PRESET_CURRENCIES[0]) => {
    setForm((prev) => ({
      ...prev,
      code: p.code,
      name: p.name,
      symbol: p.symbol,
      exchangeRate: p.rate,
      decimalPlaces: p.decimals,
    }));
    soundFX.playBeep();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg neu-card-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {isEditing
                  ? t('currencies.modalTitleEdit', 'Edit Currency ({{code}})', { code: currencyToEdit?.code })
                  : t('currencies.modalTitleNew', 'Add New Currency')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEditing
                  ? t('currencies.modalSubtitleEdit', 'Modify currency properties and live conversion rate')
                  : t('currencies.modalSubtitleNew', 'Define new foreign currency & exchange rate vs {{base}}', { base: baseCurrency.code })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Presets (when creating new) */}
          {!isEditing && (
            <div className="space-y-1.5 pb-2 border-b border-slate-200/40 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{t('currencies.quickPresets', 'Quick Global Presets:')}</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {PRESET_CURRENCIES.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono neu-pill text-slate-700 dark:text-slate-300 font-bold flex-shrink-0 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {preset.code} ({preset.symbol})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Currency Code & Symbol */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('currencies.codeLabel', 'Currency Code (ISO)')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  maxLength={5}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. AUD"
                  className="w-full h-10 px-3 pl-8 neu-input font-mono font-black text-slate-900 dark:text-white uppercase disabled:opacity-60 outline-none"
                />
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('currencies.symbolLabel', 'Symbol / Sign')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                placeholder="e.g. A$, £, ¥, ₭"
                className="w-full h-10 px-3 neu-input font-mono font-black text-slate-900 dark:text-white text-center outline-none"
              />
            </div>
          </div>

          {/* Currency Full Name */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {t('currencies.fullNameLabel', 'Full Currency Name')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Australian Dollar (AUD)"
                className="w-full h-10 px-3 pl-8 neu-input font-bold text-slate-900 dark:text-white outline-none"
              />
              <Type className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Exchange Rate vs 1 Base Currency */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {t('currencies.rateLabel', 'Exchange Rate (Value against 1 {{base}})', { base: baseCurrency.code })} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.00000001"
                required
                value={form.exchangeRate}
                onChange={(e) => setForm({ ...form, exchangeRate: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 1.52 or 0.000045"
                className="w-full h-10 px-3 pl-8 neu-input font-mono font-black text-slate-900 dark:text-white outline-none"
              />
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {t('currencies.rateFormula', '1 {{base}} = {{rate}} {{code}}', {
                base: baseCurrency.code,
                rate: form.exchangeRate || 1,
                code: form.code || 'CURRENCY',
              })}
            </p>
          </div>

          {/* Decimals & Position */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('currencies.decimalsLabel', 'Decimal Places')}
              </label>
              <select
                value={form.decimalPlaces}
                onChange={(e) => setForm({ ...form, decimalPlaces: Number(e.target.value) })}
                className="w-full h-10 px-3 neu-input font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value={0}>0 (e.g. JPY, LAK, VND, KRW)</option>
                <option value={2}>2 (e.g. USD, EUR, THB, AUD)</option>
                <option value={3}>3 (e.g. BHD, KWD)</option>
                <option value={4}>4 (High Precision)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('currencies.symbolPosLabel', 'Symbol Position')}
              </label>
              <select
                value={form.symbolPosition}
                onChange={(e) => setForm({ ...form, symbolPosition: e.target.value as any })}
                className="w-full h-10 px-3 neu-input font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="before">{t('currencies.posBefore', 'Before Amount ($100)')}</option>
                <option value="after">{t('currencies.posAfter', 'After Amount (100 ₭)')}</option>
              </select>
            </div>
          </div>

          {/* Active / Hidden Switch Toggle */}
          <div className="p-4 neu-card-sm flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                {t('currencies.showOnPos', 'Show on POS & Customer Display')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('currencies.showOnPosDesc', 'Active currencies appear in the cashier currency switcher')}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                form.isActive ? 'bg-emerald-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  form.isActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 neu-btn-primary text-white font-extrabold flex items-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('common.saving', 'Saving...')}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEditing ? t('currencies.updateCurrency', 'Update Currency') : t('currencies.createCurrency', 'Create Currency')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CurrencyModal;
