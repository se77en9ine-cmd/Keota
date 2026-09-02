import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scale,
  X,
  AlertCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { PeriodClosingModal } from './PeriodClosingModal';

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
}

export const GeneralLedgerTab: React.FC = () => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const localizeAccountName = (code: string, fallback: string): string => String(t(`accounting.accounts.${code}.name`, fallback));
  const localizeAccountType = (type: string): string => String(t(`accounting.accountTypes.${type}`, type));
  const localizeNormalBalance = (nb: string): string => String(t(`accounting.normalBalance.${nb}`, nb));
  const localizeRefType = (ref: string): string => String(t(`accounting.referenceTypes.${ref}`, ref));

  const [accountsList, setAccountsList] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'LEDGER' | 'JOURNAL_ENTRIES'>('LEDGER');

  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Manual Journal Modal State
  const [voucherModalOpen, setVoucherModalOpen] = useState<boolean>(false);
  const [voucherMemo, setVoucherMemo] = useState<string>('');
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [voucherLines, setVoucherLines] = useState<Array<{ accountId: string; debit: string; credit: string; description: string }>>([
    { accountId: '1010', debit: '', credit: '', description: '' },
    { accountId: '6090', debit: '', credit: '', description: '' },
  ]);
  const [submittingVoucher, setSubmittingVoucher] = useState<boolean>(false);
  const [periodClosingModalOpen, setPeriodClosingModalOpen] = useState<boolean>(false);

  const handleApplyGranularity = (type: 'TODAY' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (type === 'TODAY') {
      const todayStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'THIS_MONTH') {
      const lastDay = new Date(y, m + 1, 0).getDate();
      setStartDate(`${y}-${(m + 1).toString().padStart(2, '0')}-01`);
      setEndDate(`${y}-${(m + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`);
    } else if (type === 'THIS_QUARTER') {
      const qIdx = Math.floor(m / 3);
      const startM = qIdx * 3 + 1;
      const endM = startM + 2;
      const lastDay = new Date(y, endM, 0).getDate();
      setStartDate(`${y}-${startM.toString().padStart(2, '0')}-01`);
      setEndDate(`${y}-${endM.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`);
    } else {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  useEffect(() => {
    if (viewMode === 'LEDGER') {
      fetchLedger();
    } else {
      fetchJournalEntries();
    }
  }, [viewMode, selectedAccountId, startDate, endDate]);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounting/chart-of-accounts');
      setAccountsList(res.data.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedAccountId && selectedAccountId !== 'ALL') params.append('accountId', selectedAccountId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/accounting/general-ledger?${params.toString()}`);
      setLedgerData(res.data.ledger || []);
    } catch (err) {
      console.error('Failed to fetch general ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/accounting/journal-entries?${params.toString()}`);
      setJournalEntries(res.data.entries || []);
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const accountOptions = useMemo(() => {
    return [
      { value: 'ALL', label: t('accounting.glAllAccounts', 'All Ledger Accounts (Consolidated)') },
      ...accountsList.map((a) => {
        const localizedName = localizeAccountName(a.code, a.name);
        const localizedType = localizeAccountType(a.type);
        return {
          value: a.id,
          label: `${a.code} - ${localizedName} (${localizedType})`,
        };
      }),
    ];
  }, [accountsList, t]);

  // Handle Manual Journal Voucher Lines
  const handleAddVoucherLine = () => {
    setVoucherLines([...voucherLines, { accountId: accountsList[0]?.id || '1010', debit: '', credit: '', description: '' }]);
  };

  const handleRemoveVoucherLine = (idx: number) => {
    if (voucherLines.length <= 2) {
      setFeedbackMsg({ text: 'A journal entry must have at least 2 lines.', type: 'error' });
      return;
    }
    setVoucherLines(voucherLines.filter((_, i) => i !== idx));
  };

  const totalVoucherDebit = voucherLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalVoucherCredit = voucherLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const voucherDifference = Math.abs(totalVoucherDebit - totalVoucherCredit);
  const isVoucherBalanced = totalVoucherDebit > 0 && voucherDifference < 0.01;

  const handleSubmitManualVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherMemo.trim()) {
      setFeedbackMsg({ text: t('accounting.glEnterMemoError', 'Please enter a memo/description for this voucher.'), type: 'error' });
      return;
    }
    if (!isVoucherBalanced) {
      setFeedbackMsg({ text: t('accounting.glOutOfBalanceError', 'Out of balance! Debits ({{debit}}) must equal Credits ({{credit}}).', { debit: totalVoucherDebit, credit: totalVoucherCredit }), type: 'error' });
      return;
    }

    try {
      setSubmittingVoucher(true);
      const payload = {
        memo: voucherMemo,
        entryDate: voucherDate,
        lines: voucherLines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || voucherMemo,
        })),
      };

      await api.post('/accounting/journal-entries', payload);
      setFeedbackMsg({ text: t('accounting.glVoucherSuccess', 'Journal Voucher posted successfully!'), type: 'success' });
      setVoucherModalOpen(false);
      setVoucherMemo('');
      setVoucherLines([
        { accountId: '1010', debit: '', credit: '', description: '' },
        { accountId: '6090', debit: '', credit: '', description: '' },
      ]);
      fetchLedger();
      fetchJournalEntries();
    } catch (err: any) {
      setFeedbackMsg({ text: err.response?.data?.message || 'Failed to post journal entry', type: 'error' });
    } finally {
      setSubmittingVoucher(false);
    }
  };

  const handleDeleteJournalEntry = async (id: string, entryNo: string) => {
    if (!window.confirm(`Are you sure you want to delete and void journal voucher ${entryNo}? This will remove its debit/credit postings from the General Ledger.`)) {
      return;
    }
    try {
      await api.delete(`/accounting/journal-entries/${id}`);
      setFeedbackMsg({ text: `Voucher ${entryNo} deleted successfully.`, type: 'success' });
      fetchLedger();
      fetchJournalEntries();
    } catch (err: any) {
      setFeedbackMsg({ text: err.response?.data?.message || 'Failed to delete journal entry', type: 'error' });
    }
  };

  const handlePurgeOrphans = async () => {
    try {
      const res = await api.post('/accounting/journal-entries/purge-orphans');
      setFeedbackMsg({ text: res.data.message || 'Orphaned ledger entries cleaned successfully.', type: 'success' });
      fetchLedger();
      fetchJournalEntries();
    } catch (err: any) {
      setFeedbackMsg({ text: err.response?.data?.message || 'Failed to purge orphaned entries', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Inline Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                {t('accounting.glTitle', 'General Ledger & Double-Entry Journal')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 uppercase">
                {t('accounting.glGaapBadge', 'GAAP Auditing')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('accounting.glSubtitle', 'Chronological T-Account ledger postings, balanced debits/credits, and audit vouchers.')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-bold">
            <button
              onClick={() => setViewMode('LEDGER')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'LEDGER'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('accounting.glTAccountLedgers', 'T-Account Ledgers')}
            </button>
            <button
              onClick={() => setViewMode('JOURNAL_ENTRIES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'JOURNAL_ENTRIES'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('accounting.glJournalVouchersLog', 'Journal Vouchers Log')}
            </button>
          </div>

          <button
            onClick={handlePurgeOrphans}
            title="Clean and purge any orphaned ledger entries whose source records were deleted"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('accounting.glCleanOrphans', 'Sync & Clean Orphans')}</span>
          </button>

          <button
            onClick={() => setVoucherModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('accounting.glPostManualVoucher', 'Post Manual Voucher')}</span>
          </button>

          <button
            onClick={() => setPeriodClosingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('accounting.glClosePeriod', 'ປິດງວດບັນຊີ (Period Close)')}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-30">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {viewMode === 'LEDGER' && (
            <div className="w-full sm:w-80">
              <CustomSelect
                value={selectedAccountId}
                onChange={(val) => setSelectedAccountId(val)}
                options={accountOptions}
                placeholder={t('accounting.glSelectAccount', 'Select Account...')}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <CustomDatePicker
              value={startDate}
              onChange={(val) => setStartDate(val)}
              placeholder={t('accounting.glStartDate', 'Start Date')}
            />
            <span className="text-xs text-slate-400">-</span>
            <CustomDatePicker
              value={endDate}
              onChange={(val) => setEndDate(val)}
              placeholder={t('accounting.glEndDate', 'End Date')}
            />
          </div>

          {/* Period Granularity Quick Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleApplyGranularity('TODAY')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              {t('accounting.periodToday', 'ມື້ນີ້')}
            </button>
            <button
              type="button"
              onClick={() => handleApplyGranularity('THIS_MONTH')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              {t('accounting.periodThisMonth', 'ເດືອນນີ້')}
            </button>
            <button
              type="button"
              onClick={() => handleApplyGranularity('THIS_QUARTER')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              {t('accounting.periodThisQuarter', 'ໄຕຣມາດນີ້')}
            </button>
            <button
              type="button"
              onClick={() => handleApplyGranularity('THIS_YEAR')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              {t('accounting.periodThisYear', 'ປີນີ້')}
            </button>
          </div>
        </div>

        {(startDate || endDate || (selectedAccountId !== 'ALL' && viewMode === 'LEDGER')) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSelectedAccountId('ALL');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors self-start md:self-auto"
          >
            {t('accounting.glResetFilters', 'Reset Filters')}
          </button>
        )}
      </div>

      {/* LEDGER VIEW */}
      {viewMode === 'LEDGER' && (
        <div className="space-y-6">
          {loading ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              {t('accounting.glLoading', 'Loading General Ledger records...')}
            </div>
          ) : ledgerData.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 italic">
              {t('accounting.glNoTransactionsPeriod', 'No transactions recorded in this account period yet.')}
            </div>
          ) : (
            ledgerData.map((accItem) => (
              <div
                key={accItem.account.id}
                className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-lg overflow-hidden space-y-3"
              >
                {/* Account Header Ribbon */}
                <div className="p-4 bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      {accItem.account.code}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {localizeAccountName(accItem.account.code, accItem.account.name)}
                      </h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t('accounting.glType', 'Type')}: <strong className="text-slate-700 dark:text-slate-300">{localizeAccountType(accItem.account.type)}</strong> • {t('accounting.glNormalBalance', 'Normal Balance')}: <strong className="text-slate-700 dark:text-slate-300">{localizeNormalBalance(accItem.account.normalBalance)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
                    <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-extrabold block">
                        {t('accounting.glBeginningBalance', 'ຍອດຍົກມາ (Beginning)')}
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        {format(convert(accItem.beginningBalance || 0, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {t('accounting.glPeriodDebit', 'ເດບິດງວດນີ້ (DR)')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {format(convert(accItem.periodDebit || 0, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {t('accounting.glPeriodCredit', 'ເຄຣດິດງວດນີ້ (CR)')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {format(convert(accItem.periodCredit || 0, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-black block">
                        {t('accounting.glNetEndingBalance', 'ຍອດຍົກໄປສຸດທິ (Ending)')}
                      </span>
                      <span className="font-black text-sm text-indigo-700 dark:text-indigo-300">
                        {format(convert(accItem.netBalance, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="overflow-x-auto p-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px]">
                        <th className="p-3">{t('accounting.glColDate', 'Date')}</th>
                        <th className="p-3">{t('accounting.glColVoucher', 'Voucher #')}</th>
                        <th className="p-3">{t('accounting.glColReference', 'Reference / Memo')}</th>
                        <th className="p-3 text-right">{t('accounting.glColDebit', 'Debit (DR)')}</th>
                        <th className="p-3 text-right">{t('accounting.glColCredit', 'Credit (CR)')}</th>
                        <th className="p-3 text-right">{t('accounting.glColRunningBalance', 'Running Balance')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {accItem.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                            {t('accounting.glNoEntriesFilter', 'No ledger entries found for this specific date filter.')}
                          </td>
                        </tr>
                      ) : (
                        accItem.transactions.map((tx: any) => (
                          <tr
                            key={tx.lineId}
                            className={
                              tx.isBeginningBalance
                                ? 'bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors'
                            }
                          >
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {tx.entryDate}
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                              {tx.isBeginningBalance ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-500/30">
                                  CARRY-FORWARD
                                </span>
                              ) : (
                                tx.entryNo
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`font-semibold block ${tx.isBeginningBalance ? 'text-amber-800 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                                {tx.memo}
                              </span>
                              {tx.lineDescription && tx.lineDescription !== tx.memo && (
                                <span className="text-[10px] text-slate-400">{tx.lineDescription}</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {tx.debit > 0 ? format(convert(tx.debit, baseCode, currentCurrency), currentCurrency) : '—'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {tx.credit > 0 ? format(convert(tx.credit, baseCode, currentCurrency), currentCurrency) : '—'}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-300">
                              {format(convert(tx.runningBalance, baseCode, currentCurrency), currentCurrency)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* JOURNAL VOUCHER LOG VIEW */}
      {viewMode === 'JOURNAL_ENTRIES' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-sm text-slate-800 dark:text-white">
                {t('accounting.glVouchersRepo', 'Journal Vouchers Repository ({{count}} Vouchers)', { count: journalEntries.length })}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-slate-400">{t('accounting.glLoadingVouchers', 'Loading journal vouchers...')}</div>
            ) : journalEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">{t('accounting.glNoVouchers', 'No journal entries found.')}</div>
            ) : (
              journalEntries.map((je) => {
                const isExpanded = expandedEntryId === je.id;
                return (
                  <div
                    key={je.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden transition-all"
                  >
                    {/* Header bar */}
                    <div
                      onClick={() => setExpandedEntryId(isExpanded ? null : je.id)}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/40 select-none"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {je.entryNo}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {localizeRefType(je.referenceType)}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{je.memo}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-slate-500 dark:text-slate-400">{je.entryDate}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {format(convert(je.totalAmount, baseCode, currentCurrency), currentCurrency)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteJournalEntry(je.id, je.entryNo);
                          }}
                          title="Delete / Void Journal Voucher"
                          className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Split Lines */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                              <th className="py-2">{t('accounting.glColAccount', 'Account')}</th>
                              <th className="py-2">{t('accounting.glColLineDescription', 'Line Memo / Description')}</th>
                              <th className="py-2 text-right">{t('accounting.glColDebit', 'Debit (DR)')}</th>
                              <th className="py-2 text-right">{t('accounting.glColCredit', 'Credit (CR)')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/40 font-mono">
                            {je.lines.map((l: any) => (
                              <tr key={l.id}>
                                <td className="py-2 font-semibold text-slate-800 dark:text-slate-200">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold mr-1.5">{l.accountCode}</span>
                                  {localizeAccountName(l.accountCode, l.accountName)}
                                </td>
                                <td className="py-2 text-slate-500 text-[11px]">{l.description}</td>
                                <td className="py-2 text-right font-bold text-slate-800 dark:text-slate-200">
                                  {l.debit > 0 ? format(convert(l.debit, baseCode, currentCurrency), currentCurrency) : '—'}
                                </td>
                                <td className="py-2 text-right font-bold text-slate-800 dark:text-slate-200">
                                  {l.credit > 0 ? format(convert(l.credit, baseCode, currentCurrency), currentCurrency) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MANUAL JOURNAL VOUCHER MODAL */}
      {voucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {t('accounting.glModalVoucherTitle', 'Post Manual Journal Voucher')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('accounting.glModalVoucherSubtitle', 'Create custom double-entry debit & credit adjustments for accounting ledger audits.')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVoucherModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualVoucher} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('accounting.glVoucherMemo', 'Voucher Memo / General Description *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={voucherMemo}
                    onChange={(e) => setVoucherMemo(e.target.value)}
                    placeholder={t('accounting.glVoucherMemoPlaceholder', 'e.g. Monthly Depreciation or Owner Capital Injection adjustment')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('accounting.glPostingDate', 'Posting Date *')}
                  </label>
                  <CustomDatePicker
                    value={voucherDate}
                    onChange={(val) => setVoucherDate(val)}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('accounting.glJournalLineItems', 'Journal Line Items (Debits & Credits)')}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVoucherLine}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('accounting.glAddLine', 'Add Line')}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {voucherLines.map((line, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="w-full sm:w-1/3">
                        <select
                          value={line.accountId}
                          onChange={(e) => {
                            const copy = [...voucherLines];
                            copy[idx].accountId = e.target.value;
                            setVoucherLines(copy);
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        >
                          {accountsList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {localizeAccountName(a.code, a.name)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-1/4">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => {
                            const copy = [...voucherLines];
                            copy[idx].description = e.target.value;
                            setVoucherLines(copy);
                          }}
                          placeholder={t('accounting.glLineMemoPlaceholder', 'Description...')}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>

                      <div className="w-full sm:w-1/5">
                        <input
                          type="number"
                          step="any"
                          value={line.debit}
                          onChange={(e) => {
                            const copy = [...voucherLines];
                            copy[idx].debit = e.target.value;
                            if (e.target.value) copy[idx].credit = '';
                            setVoucherLines(copy);
                          }}
                          placeholder={t('accounting.glColDebit', 'Debit (DR)')}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>

                      <div className="w-full sm:w-1/5">
                        <input
                          type="number"
                          step="any"
                          value={line.credit}
                          onChange={(e) => {
                            const copy = [...voucherLines];
                            copy[idx].credit = e.target.value;
                            if (e.target.value) copy[idx].debit = '';
                            setVoucherLines(copy);
                          }}
                          placeholder={t('accounting.glColCredit', 'Credit (CR)')}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>

                      {voucherLines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVoucherLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Live Balance Status Ribbon */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <span>{t('accounting.glTotalDebits', 'Total Debits:')} <strong className="text-slate-900 dark:text-white">{totalVoucherDebit.toLocaleString()}</strong></span>
                    <span>{t('accounting.glTotalCredits', 'Total Credits:')} <strong className="text-slate-900 dark:text-white">{totalVoucherCredit.toLocaleString()}</strong></span>
                  </div>
                  <div>
                    {isVoucherBalanced ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('accounting.glBalanced', 'BALANCED')}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{t('accounting.glDifference', 'Difference:')} {voucherDifference.toLocaleString()} ({t('accounting.glOutOfBalance', 'OUT OF BALANCE')})</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('accounting.glBtnCancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!isVoucherBalanced || submittingVoucher}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submittingVoucher ? t('accounting.glPosting', 'Posting Voucher...') : t('accounting.glBtnPostVoucher', 'Post Journal Voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click GAAP Period Closing Wizard Modal */}
      <PeriodClosingModal
        isOpen={periodClosingModalOpen}
        onClose={() => setPeriodClosingModalOpen(false)}
        onSuccess={() => {
          setFeedbackMsg({
            text: 'Financial period closed successfully. Temporary accounts zeroed out and Net Income allocated to Retained Earnings.',
            type: 'success',
          });
          fetchLedger();
          fetchJournalEntries();
        }}
      />
    </div>
  );
};
