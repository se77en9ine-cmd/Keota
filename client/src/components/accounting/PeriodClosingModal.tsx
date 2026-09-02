import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Lock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { CustomSelect } from '../common/CustomSelect';

interface PeriodClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PeriodClosingModal: React.FC<PeriodClosingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { format, convert, baseCurrency, currentCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'USD';

  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalRevenue: number;
    totalExpense: number;
    netIncome: number;
    revenueCount: number;
    expenseCount: number;
  } | null>(null);

  const [confirmLocked, setConfirmLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fill dates based on periodType presets
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    if (periodType === 'MONTH') {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      const sStr = `${y}-${(m + 1).toString().padStart(2, '0')}-01`;
      const eStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
      setStartDate(sStr);
      setEndDate(eStr);
      setPeriodName(`Month Close: ${firstDay.toLocaleString('default', { month: 'long' })} ${y}`);
    } else if (periodType === 'QUARTER') {
      const qIdx = Math.floor(m / 3);
      const startM = qIdx * 3 + 1;
      const endM = startM + 2;
      const lastDay = new Date(y, endM, 0).getDate();
      setStartDate(`${y}-${startM.toString().padStart(2, '0')}-01`);
      setEndDate(`${y}-${endM.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`);
      setPeriodName(`Q${qIdx + 1} ${y} Financial Period Close`);
    } else {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
      setPeriodName(`Fiscal Year ${y} Annual Closing`);
    }
  }, [periodType]);

  // Fetch live preview from general-ledger when dates change
  useEffect(() => {
    if (!isOpen || !startDate || !endDate) return;

    let isMounted = true;
    const fetchPreview = async () => {
      try {
        setPreviewLoading(true);
        setErrorMessage('');
        const res = await fetch(`/api/accounting/general-ledger?startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        if (data.success && isMounted) {
          let totalRev = 0;
          let totalExp = 0;
          let revCount = 0;
          let expCount = 0;

          data.ledger.forEach((item: any) => {
            if (item.account.type === 'REVENUE') {
              totalRev += item.netBalance;
              if (item.netBalance !== 0) revCount++;
            } else if (item.account.type === 'EXPENSE') {
              totalExp += item.netBalance;
              if (item.netBalance !== 0) expCount++;
            }
          });

          setPreviewData({
            totalRevenue: totalRev,
            totalExpense: totalExp,
            netIncome: totalRev - totalExp,
            revenueCount: revCount,
            expenseCount: expCount,
          });
        }
      } catch (err: any) {
        if (isMounted) setErrorMessage(err.message || 'Failed to fetch period preview');
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmLocked) return;

    try {
      setSubmitting(true);
      setErrorMessage('');

      const res = await fetch('/api/accounting/periods/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodType,
          periodName,
          startDate,
          endDate,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to close accounting period');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while closing period');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-950/30 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('accounting.closePeriodTitle', 'ປິດງວດບັນຊີ ແລະ ໂອນກຳໄລສະສົມ')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  GAAP Standard
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('accounting.closePeriodSubtitle', 'Zero out temporary Revenue & Expense accounts and lock period transactions.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Period Type Switcher */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-700 dark:text-slate-300">
              {t('accounting.periodGranularity', 'Granularity / ປະເພດງວດບັນຊີ')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'MONTH', label: t('accounting.periodMonth', 'ລາຍເດືອນ (Monthly)') },
                { type: 'QUARTER', label: t('accounting.periodQuarter', 'ລາຍໄຕຣມາດ (Quarterly)') },
                { type: 'YEAR', label: t('accounting.periodYear', 'ປະຈຳປີ (Annual Closing)') },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setPeriodType(item.type as any)}
                  className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all border ${
                    periodType === item.type
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Name & Date Ranges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {t('accounting.periodName', 'ຊື່ງວດບັນຊີ')}
              </label>
              <input
                type="text"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {t('accounting.glStartDate', 'Start Date')}
              </label>
              <CustomDatePicker value={startDate} onChange={setStartDate} presets={false} />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {t('accounting.glEndDate', 'End Date (Lock Point)')}
              </label>
              <CustomDatePicker value={endDate} onChange={setEndDate} presets={false} />
            </div>
          </div>

          {/* Live Closing Audit Simulation Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {t('accounting.closingSimulation', 'Financial Period Summary & Allocation Preview')}
              </span>
              {previewLoading && (
                <span className="text-[10px] text-amber-500 font-bold animate-pulse">
                  {t('common.calculating', 'Calculating balances...')}
                </span>
              )}
            </div>

            {previewData ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">
                    {t('accounting.revenueToClear', 'Revenues to Zero')} ({previewData.revenueCount} {t('accounting.unitRecords', 'accs')})
                  </span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {format(convert(previewData.totalRevenue, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block uppercase">
                    {t('accounting.expenseToClear', 'Expenses to Zero')} ({previewData.expenseCount} {t('accounting.unitRecords', 'accs')})
                  </span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">
                    {format(convert(previewData.totalExpense, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase">
                    {t('accounting.netToRetainedEarnings', 'Transfer to 3020 Retained Earnings')}
                  </span>
                  <span className={`text-base font-black ${previewData.netIncome >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
                    {format(convert(previewData.netIncome, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Automated voucher <strong>JV-CLOSE</strong> will debit all revenues and credit all expenses.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>All Assets, Liabilities, and Equity balances will carry forward automatically into the next period.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>No user can post, modify, or back-date transactions into this closed period once locked.</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              {t('accounting.periodNotes', 'Audit Remarks / ໝາຍເຫດການປິດງວດ')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Audited and verified by head accountant"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
            />
          </div>

          {/* Verification Guard */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <input
              type="checkbox"
              id="confirmPeriodLock"
              checked={confirmLocked}
              onChange={(e) => setConfirmLocked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="confirmPeriodLock" className="text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer select-none leading-relaxed">
              {t('accounting.confirmLockDisclaimer', 'ຂ້າພະເຈົ້າຢືນຢັນວ່າໄດ້ກວດສອບຕົວເລກບັນຊີຄົບຖ້ວນແລ້ວ ແລະ ຕ້ອງການປິດງວດບັນຊີລວມທັງລັອກການແກ້ໄຂ')} (I confirm the financial records and approve the period lock).
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!confirmLocked || submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? t('common.saving', 'Closing Period...') : t('accounting.confirmClosePeriod', 'Confirm & Close Period')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
