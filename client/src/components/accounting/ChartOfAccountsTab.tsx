import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  Layers,
  Plus,
  Scale,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Package,
  Landmark,
  FileSpreadsheet,
  Search,
  Lock,
  X,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

export const ChartOfAccountsTab: React.FC = () => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const localizeAccountName = (code: string, fallback: string): string => String(t(`accounting.accounts.${code}.name`, fallback));
  const localizeAccountType = (type: string): string => String(t(`accounting.accountTypes.${type}`, type));
  const localizeNormalBalance = (nb: string): string => String(t(`accounting.normalBalance.${nb}`, nb));

  const [activeSubTab, setActiveSubTab] = useState<'COA' | 'TRIAL_BALANCE' | 'BALANCE_SHEET' | 'PERIODS'>('COA');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [extendedTrialBalance, setExtendedTrialBalance] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add Account Modal
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);
  const [newAccCode, setNewAccCode] = useState<string>('');
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccType, setNewAccType] = useState<string>('EXPENSE');
  const [newAccCategory, setNewAccCategory] = useState<string>('OPERATING_EXPENSE');
  const [newAccDesc, setNewAccDesc] = useState<string>('');
  const [submittingAccount, setSubmittingAccount] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeSubTab === 'COA') {
        const res = await api.get('/accounting/chart-of-accounts');
        setAccounts(res.data.accounts || []);
      } else if (activeSubTab === 'TRIAL_BALANCE') {
        const res = await api.get('/accounting/trial-balance-extended');
        setExtendedTrialBalance(res.data.extendedTrialBalance || null);
      } else if (activeSubTab === 'BALANCE_SHEET') {
        const res = await api.get('/accounting/balance-sheet');
        setBalanceSheet(res.data.balanceSheet || null);
      } else if (activeSubTab === 'PERIODS') {
        const res = await api.get('/accounting/periods');
        setPeriods(res.data.periods || []);
      }
    } catch (err) {
      console.error('Failed to load accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReopenPeriod = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to REOPEN and UNLOCK period "${name}"? This will reverse the closing entry and restore transactions.`)) {
      return;
    }
    try {
      await api.post(`/accounting/periods/${id}/reopen`);
      setFeedbackMsg({ text: `Period ${name} reopened and unlocked successfully.`, type: 'success' });
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.response?.data?.message || 'Failed to reopen period', type: 'error' });
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode.trim() || !newAccName.trim()) {
      setFeedbackMsg({ text: 'Please enter both account code and account name.', type: 'error' });
      return;
    }

    try {
      setSubmittingAccount(true);
      await api.post('/accounting/chart-of-accounts', {
        code: newAccCode.trim(),
        name: newAccName.trim(),
        type: newAccType,
        category: newAccCategory,
        description: newAccDesc,
      });

      setFeedbackMsg({ text: 'Account added to Chart of Accounts!', type: 'success' });
      setAccountModalOpen(false);
      setNewAccCode('');
      setNewAccName('');
      setNewAccDesc('');
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.response?.data?.message || 'Failed to create account', type: 'error' });
    } finally {
      setSubmittingAccount(false);
    }
  };

  // Group accounts by class
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, any[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };

    const filtered = accounts.filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q);
    });

    filtered.forEach((a) => {
      if (groups[a.type]) groups[a.type].push(a);
    });

    return groups;
  }, [accounts, searchQuery]);

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

      {/* Header & Sub-Tabs */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 border border-teal-500/20">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                {t('accounting.coaTitle', 'Chart of Accounts & Trial Balance Audit')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20 uppercase">
                COA Framework
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('accounting.coaSubtitle', 'Standard double-entry accounting structure, balance sheet accounts, and trial balance verification.')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-Tab Selector */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('COA')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'COA'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('accounting.coaTabStructure', 'Chart of Accounts Structure')}
            </button>
            <button
              onClick={() => setActiveSubTab('TRIAL_BALANCE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'TRIAL_BALANCE'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('accounting.coaTabTrialBalance', 'Trial Balance Audit')}
            </button>
            <button
              onClick={() => setActiveSubTab('BALANCE_SHEET')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'BALANCE_SHEET'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('accounting.coaTabBalanceSheet', 'Balance Sheet (Assets vs Liabilities)')}
            </button>
            <button
              onClick={() => setActiveSubTab('PERIODS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'PERIODS'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('accounting.coaTabPeriods', 'Closed Periods & Statement Audit')}
            </button>
          </div>

          {activeSubTab === 'COA' && (
            <button
              onClick={() => setAccountModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('accounting.coaAddAccount', 'Add New Account')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. CHART OF ACCOUNTS VIEW */}
      {activeSubTab === 'COA' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('accounting.coaSearchPlaceholder', 'Search by account code, name, category...')}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Account Category Cards */}
          {(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const).map((typeKey) => {
            const list = groupedAccounts[typeKey] || [];
            if (list.length === 0 && searchQuery) return null;

            const typeMeta: Record<string, { label: string; range: string; color: string; bg: string }> = {
              ASSET: { label: '1000s: Assets', range: 'Current Assets, Cash, Bank, Merchandise Inventory', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              LIABILITY: { label: '2000s: Liabilities', range: 'Accounts Payable, VAT / Sales Tax Payable', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              EQUITY: { label: '3000s: Equity', range: 'Owner Capital, Cumulative Retained Earnings', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
              REVENUE: { label: '4000s: Revenue & Inflows', range: 'POS In-Store Sales, Online Deliveries, Misc Incomes', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
              EXPENSE: { label: '5000s / 6000s: Expenses & COGS', range: 'Cost of Goods Sold, Rent, Utilities, Payroll, Losses', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
            };

            const meta = typeMeta[typeKey];

            return (
              <div
                key={typeKey}
                className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-lg overflow-hidden space-y-2"
              >
                <div className={`p-4 ${meta.bg} border-b border-slate-200 dark:border-slate-800 flex items-center justify-between`}>
                  <div>
                    <h3 className={`font-bold text-sm ${meta.color}`}>{meta.label}</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{meta.range}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300">
                    {t('accounting.coaActiveAccounts', '{{count}} Active Accounts', { count: list.length })}
                  </span>
                </div>

                <div className="overflow-x-auto p-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3 w-28">{t('accounting.coaColCode', 'Code')}</th>
                        <th className="p-3">{t('accounting.coaColAccountName', 'Account Name')}</th>
                        <th className="p-3">{t('accounting.coaColClassification', 'Classification')}</th>
                        <th className="p-3 w-32">{t('accounting.coaColNormalBalance', 'Normal Balance')}</th>
                        <th className="p-3">{t('accounting.description', 'Description')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {list.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
                              {acc.code}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{localizeAccountName(acc.code, acc.name)}</span>
                            {acc.isSystem === '1' && (
                              <span title="System Master Account">
                                <Lock className="w-3 h-3 text-slate-400" />
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{acc.category}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                acc.normalBalance === 'DEBIT'
                                   ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {localizeNormalBalance(acc.normalBalance)}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-xs">{acc.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. EXTENDED 6-COLUMN TRIAL BALANCE VIEW */}
      {activeSubTab === 'TRIAL_BALANCE' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-white block">
                {t('accounting.coaTrialBalanceTitle', 'Extended 6-Column Trial Balance Audit')}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('accounting.coaAllBalancedMsg', 'Full reconciliation: Beginning Balance ➔ Period Movement ➔ Ending Balance.')}
              </span>
            </div>

            {extendedTrialBalance?.totals && (
              <div>
                {extendedTrialBalance.totals.isEndingBalanced ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>{t('accounting.coaBalancedLedger', 'Balanced Ledger (Total Ending DR = CR)')}</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>{t('accounting.coaDiscrepancyWarning', 'Imbalance Detected in Ending Balances!')}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px]">
                  <th rowSpan={2} className="p-3 w-24 align-bottom">{t('accounting.coaColCode', 'Code')}</th>
                  <th rowSpan={2} className="p-3 font-sans align-bottom">{t('accounting.coaColAccountName', 'Account Name')}</th>
                  <th colSpan={2} className="p-2 text-center border-l border-r border-slate-200 dark:border-slate-800 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {t('accounting.glBeginningBalance', 'ຍອດຍົກມາ (Beginning Balance)')}
                  </th>
                  <th colSpan={2} className="p-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50">
                    {t('accounting.glPeriodMovement', 'ການເຄື່ອນໄຫວງວດນີ້ (Period Activity)')}
                  </th>
                  <th colSpan={2} className="p-2 text-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {t('accounting.glNetEndingBalance', 'ຍອດຍົກໄປສຸດທິ (Ending Balance)')}
                  </th>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2 text-right border-l border-slate-200 dark:border-slate-800">DR</th>
                  <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800">CR</th>
                  <th className="p-2 text-right">DR</th>
                  <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800">CR</th>
                  <th className="p-2 text-right">DR</th>
                  <th className="p-2 text-right">CR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {extendedTrialBalance?.rows?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{row.code}</td>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">{localizeAccountName(row.code, row.name)}</td>
                    <td className="p-2 text-right border-l border-slate-200 dark:border-slate-800">
                      {row.beginningDebit > 0 ? format(convert(row.beginningDebit, baseCode, currentCurrency), currentCurrency) : '—'}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 dark:border-slate-800">
                      {row.beginningCredit > 0 ? format(convert(row.beginningCredit, baseCode, currentCurrency), currentCurrency) : '—'}
                    </td>
                    <td className="p-2 text-right">
                      {row.periodDebit > 0 ? format(convert(row.periodDebit, baseCode, currentCurrency), currentCurrency) : '—'}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 dark:border-slate-800">
                      {row.periodCredit > 0 ? format(convert(row.periodCredit, baseCode, currentCurrency), currentCurrency) : '—'}
                    </td>
                    <td className="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {row.endingDebit > 0 ? format(convert(row.endingDebit, baseCode, currentCurrency), currentCurrency) : '—'}
                    </td>
                    <td className="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {row.endingCredit > 0 ? format(convert(row.endingCredit, baseCode, currentCurrency), currentCurrency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {extendedTrialBalance?.totals && (
                <tfoot>
                  <tr className="bg-slate-100/90 dark:bg-slate-950/90 font-black border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                    <td colSpan={2} className="p-3 font-sans uppercase">
                      {t('accounting.coaTrialBalanceTitle', 'Total Grand Balances')}
                    </td>
                    <td className="p-2 text-right text-amber-600 dark:text-amber-400 border-l border-slate-200 dark:border-slate-800">
                      {format(convert(extendedTrialBalance.totals.totalBeginningDebit, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-2 text-right text-amber-600 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800">
                      {format(convert(extendedTrialBalance.totals.totalBeginningCredit, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-2 text-right text-slate-900 dark:text-white">
                      {format(convert(extendedTrialBalance.totals.totalPeriodDebit, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-2 text-right text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                      {format(convert(extendedTrialBalance.totals.totalPeriodCredit, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">
                      {format(convert(extendedTrialBalance.totals.totalEndingDebit, baseCode, currentCurrency), currentCurrency)}
                    </td>
                    <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">
                      {format(convert(extendedTrialBalance.totals.totalEndingCredit, baseCode, currentCurrency), currentCurrency)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 4. CLOSED PERIODS & STATEMENT AUDIT VIEW */}
      {activeSubTab === 'PERIODS' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                {t('accounting.closedPeriodsAuditTitle', 'ບັນຊີງວດທີ່ປິດແລ້ວ (Closed Accounting Periods & Audit Trail)')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('accounting.closedPeriodsSubtitle', 'Permanent GAAP closing snapshots and back-dated transaction locks.')}
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{periods.length} {t('accounting.unitPeriodsClosed', 'Periods Closed')}</span>
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px]">
                  <th className="p-3">{t('accounting.periodName', 'Period Name')}</th>
                  <th className="p-3">{t('accounting.periodType', 'Type')}</th>
                  <th className="p-3">{t('accounting.periodDateRange', 'Date Range (Locked)')}</th>
                  <th className="p-3 text-right">{t('accounting.revenueCleared', 'Revenue Cleared')}</th>
                  <th className="p-3 text-right">{t('accounting.expenseCleared', 'Expense Cleared')}</th>
                  <th className="p-3 text-right">{t('accounting.netToRetainedEarnings', 'Net Profit to Retained Earnings')}</th>
                  <th className="p-3 text-center">{t('accounting.status', 'Status')}</th>
                  <th className="p-3 text-center">{t('common.actions', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      {t('accounting.noClosedPeriodsYet', 'No financial periods closed yet. Click "Period Close" on the General Ledger tab to execute your first GAAP close.')}
                    </td>
                  </tr>
                ) : (
                  periods.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {p.periodName}
                        {p.notes && <span className="text-[10px] text-slate-400 block font-normal">{p.notes}</span>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {p.periodType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.startDate} ➔ {p.endDate}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {format(convert(p.totalRevenue, baseCode, currentCurrency), currentCurrency)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {format(convert(p.totalExpense, baseCode, currentCurrency), currentCurrency)}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                        {format(convert(p.netIncome, baseCode, currentCurrency), currentCurrency)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleReopenPeriod(p.id, p.periodName)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer border border-rose-500/20"
                        >
                          {t('accounting.reopenPeriod', 'Unlock & Reopen')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. BALANCE SHEET VIEW */}
      {activeSubTab === 'BALANCE_SHEET' && (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">1. {t('accounting.coaTotalAssets', 'Total Assets')}</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {format(convert(balanceSheet?.assets?.totalAssets || 0, baseCode, currentCurrency), currentCurrency)}
              </div>
              <span className="text-[11px] text-slate-500 block">Current Assets + Inventory On-Hand</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">2. {t('accounting.coaTotalLiabilities', 'Total Liabilities')}</span>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {format(convert(balanceSheet?.liabilities?.totalLiabilities || 0, baseCode, currentCurrency), currentCurrency)}
              </div>
              <span className="text-[11px] text-slate-500 block">Accounts Payable + Tax Liabilities</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">3. {t('accounting.coaTotalEquity', 'Total Owner\'s Equity')}</span>
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {format(convert(balanceSheet?.equity?.totalEquity || 0, baseCode, currentCurrency), currentCurrency)}
              </div>
              <span className="text-[11px] text-slate-500 block">Owner Capital + Cumulative Earnings</span>
            </div>
          </div>

          {/* Balance Sheet Breakdown Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Assets */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t('accounting.coaTotalAssets', 'ASSETS')}</h3>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {format(convert(balanceSheet?.assets?.totalAssets || 0, baseCode, currentCurrency), currentCurrency)}
                </span>
              </div>

              <div className="space-y-2">
                {balanceSheet?.assets?.accounts?.map((acc: any) => (
                  <div key={acc.accountId} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="text-slate-700 dark:text-slate-300">
                      <strong className="font-mono text-slate-400 mr-2">{acc.code}</strong>
                      {localizeAccountName(acc.code, acc.name)}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {format(convert(acc.balance, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Liabilities & Equity */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-6">
              {/* Liabilities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t('accounting.coaTotalLiabilities', 'LIABILITIES')}</h3>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {format(convert(balanceSheet?.liabilities?.totalLiabilities || 0, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>
                <div className="space-y-2">
                  {balanceSheet?.liabilities?.accounts?.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No outstanding liabilities.</div>
                  ) : (
                    balanceSheet?.liabilities?.accounts?.map((acc: any) => (
                      <div key={acc.accountId} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300">
                          <strong className="font-mono text-slate-400 mr-2">{acc.code}</strong>
                          {localizeAccountName(acc.code, acc.name)}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {format(convert(acc.balance, baseCode, currentCurrency), currentCurrency)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{t('accounting.coaTotalEquity', 'EQUITY')}</h3>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {format(convert(balanceSheet?.equity?.totalEquity || 0, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>
                <div className="space-y-2">
                  {balanceSheet?.equity?.accounts?.map((acc: any) => (
                    <div key={acc.accountId} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/40">
                      <span className="text-slate-700 dark:text-slate-300">
                        <strong className="font-mono text-slate-400 mr-2">{acc.code}</strong>
                        {localizeAccountName(acc.code, acc.name)}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {format(convert(acc.balance, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">
                      Current Period Net Profit (P&L)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {format(convert(balanceSheet?.equity?.netEarnings || 0, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD ACCOUNT MODAL */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {t('accounting.coaModalAddTitle', 'Add Account to Chart of Accounts')}
                </h3>
              </div>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('accounting.coaAccountCode', 'Account Code (e.g. 1030, 5060) *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('accounting.coaAccountCodePlaceholder', 'e.g. 1030')}
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('accounting.coaAccountName', 'Account Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('accounting.coaAccountNamePlaceholder', 'e.g. Petty Cash Vault - Branch 2')}
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('accounting.coaAccountType', 'Account Type *')}
                  </label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="ASSET">ASSET (1000s)</option>
                    <option value="LIABILITY">LIABILITY (2000s)</option>
                    <option value="EQUITY">EQUITY (3000s)</option>
                    <option value="REVENUE">REVENUE (4000s)</option>
                    <option value="EXPENSE">EXPENSE (5000s/6000s)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('accounting.coaAccountCategory', 'Account Sub-Category *')}
                  </label>
                  <input
                    type="text"
                    value={newAccCategory}
                    onChange={(e) => setNewAccCategory(e.target.value)}
                    placeholder="e.g. OPERATING_EXPENSE"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('accounting.coaDescriptionNotes', 'Description / Purpose (Optional)')}
                </label>
                <textarea
                  rows={2}
                  value={newAccDesc}
                  onChange={(e) => setNewAccDesc(e.target.value)}
                  placeholder={t('accounting.coaDescriptionNotesPlaceholder', 'Explain what this account is used for...')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold"
                >
                  {t('accounting.coaBtnCancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingAccount}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-500/20 active:scale-95 transition-all"
                >
                  {submittingAccount ? t('accounting.coaCreating', 'Creating Account...') : t('accounting.coaBtnCreate', 'Create Ledger Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
