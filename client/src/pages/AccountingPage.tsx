import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  Receipt,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  X,
  Search,
  Calendar,
  Filter,
  Trash2,
  Coins,
  DollarSign,
  AlertTriangle,
  FileText,
  Printer,
  History,
  TrendingDown,
  TrendingUp,
  Tag,
  Building2,
  Zap,
  Users,
  Package,
  Wrench,
  HelpCircle,
  RotateCcw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  BookOpen,
  Landmark,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { CreatableCategorySelect } from '../components/common/CreatableCategorySelect';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';
import { GeneralLedgerTab } from '../components/accounting/GeneralLedgerTab';
import { ChartOfAccountsTab } from '../components/accounting/ChartOfAccountsTab';

export type ExpSortField = 'DATE' | 'AMOUNT' | 'CATEGORY' | 'DESCRIPTION';
export type IncSortField = 'DATE' | 'AMOUNT' | 'CATEGORY' | 'DESCRIPTION';
export type ClosingSortField = 'DATE' | 'CASHIER' | 'FLOAT' | 'EXPECTED' | 'ACTUAL' | 'VARIANCE';

export const AccountingPage: React.FC = () => {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [income, setIncome] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Main Sub-Tab
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'INCOME' | 'CLOSING' | 'GENERAL_LEDGER' | 'CHART_OF_ACCOUNTS'>('EXPENSES');

  // Filters for Expenses & Income
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expenses Sorting & Pagination
  const [expSortField, setExpSortField] = useState<ExpSortField>('DATE');
  const [expSortDirection, setExpSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expPage, setExpPage] = useState<number>(1);
  const [expPageSize, setExpPageSize] = useState<number>(25);

  // Income Sorting & Pagination
  const [incSortField, setIncSortField] = useState<IncSortField>('DATE');
  const [incSortDirection, setIncSortDirection] = useState<'asc' | 'desc'>('desc');
  const [incPage, setIncPage] = useState<number>(1);
  const [incPageSize, setIncPageSize] = useState<number>(25);

  // Shift Closings Filters, Sorting & Pagination
  const [closingSearchQuery, setClosingSearchQuery] = useState('');
  const [closingStartDate, setClosingStartDate] = useState('');
  const [closingEndDate, setClosingEndDate] = useState('');
  const [closingSortField, setClosingSortField] = useState<ClosingSortField>('DATE');
  const [closingSortDirection, setClosingSortDirection] = useState<'asc' | 'desc'>('desc');
  const [closingPage, setClosingPage] = useState<number>(1);
  const [closingPageSize, setClosingPageSize] = useState<number>(25);

  // Modals State
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);

  const { format, convert, currentCurrency, baseCurrency, currencies } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const { user } = useAuthStore();

  // Forms State
  const [expForm, setExpForm] = useState({
    category: 'Utilities',
    amount: '',
    description: '',
    receiptImage: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const [incForm, setIncForm] = useState({
    category: 'Other',
    amount: '',
    description: '',
    incomeDate: new Date().toISOString().split('T')[0],
  });

  const [closingForm, setClosingForm] = useState({
    openingCash: '',
    actualCash: '',
    notes: '',
  });

  const [closingResult, setClosingResult] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, incRes, closeRes] = await Promise.all([
        api.get('/accounting/expenses').catch(() => ({ data: { expenses: [] } })),
        api.get('/accounting/income').catch(() => ({ data: { income: [] } })),
        api.get('/accounting/daily-closing').catch(() => ({ data: { closings: [] } })),
      ]);
      setExpenses(expRes.data.expenses || []);
      setIncome(incRes.data.income || []);
      setClosings(closeRes.data.closings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Handlers ──
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.amount || Number(expForm.amount) <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }

    try {
      // Amount entered in active currency -> normalize to system base currency for database storage
      const rawAmt = Number(expForm.amount);
      const baseAmount = convert(rawAmt, currentCurrency, baseCode);

      await api.post('/accounting/expenses', {
        category: expForm.category,
        amount: baseAmount,
        currency: baseCode,
        description: expForm.description,
        expenseDate: expForm.expenseDate || new Date().toISOString().split('T')[0],
        receiptImage: expForm.receiptImage || null,
      });

      setExpenseModalOpen(false);
      setExpForm({
        category: 'Utilities',
        amount: '',
        description: '',
        receiptImage: '',
        expenseDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
      showToast('Operating expense recorded successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to add expense', 'error');
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incForm.amount || Number(incForm.amount) <= 0) {
      showToast('Please enter a valid income amount', 'error');
      return;
    }

    try {
      const rawAmt = Number(incForm.amount);
      const baseAmount = convert(rawAmt, currentCurrency, baseCode);

      await api.post('/accounting/income', {
        category: incForm.category,
        amount: baseAmount,
        currency: baseCode,
        description: incForm.description,
        incomeDate: incForm.incomeDate || new Date().toISOString().split('T')[0],
      });

      setIncomeModalOpen(false);
      setIncForm({
        category: 'Other',
        amount: '',
        description: '',
        incomeDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
      showToast('Income entry recorded successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to add income', 'error');
    }
  };

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'EXPENSE' | 'INCOME'; item: any } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      if (deleteTarget.type === 'EXPENSE') {
        await api.delete(`/accounting/expenses/${deleteTarget.item.id}`);
        showToast('Expense record deleted successfully', 'success');
      } else {
        await api.delete(`/accounting/income/${deleteTarget.item.id}`);
        showToast('Income record deleted successfully', 'success');
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete record', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRecordClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rawOpen = Number(closingForm.openingCash) || 0;
      const rawActual = Number(closingForm.actualCash) || 0;
      const openBase = convert(rawOpen, currentCurrency, baseCode);
      const actualBase = convert(rawActual, currentCurrency, baseCode);

      const res = await api.post('/accounting/daily-closing', {
        storeId: user?.storeId || 'store-flagship',
        openingTime: new Date(Date.now() - 8 * 3600000).toISOString(),
        closingTime: new Date().toISOString(),
        openingCash: openBase,
        closingCashActual: actualBase,
        notes: closingForm.notes,
      });
      setClosingResult(res.data);
      fetchData();
      showToast('Shift register closed and reconciled successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Closing shift failed', 'error');
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (startDate || endDate) {
        const d = exp.createdAt ? exp.createdAt.slice(0, 10) : (exp.expenseDate || '');
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
      if (selectedCategory !== 'ALL' && exp.category?.toUpperCase() !== selectedCategory.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const descMatch = (exp.description || '').toLowerCase().includes(q);
        const catMatch = (exp.category || '').toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate, selectedCategory, searchQuery]);

  // Filtered Incomes
  const filteredIncomes = useMemo(() => {
    return income.filter((inc) => {
      if (startDate || endDate) {
        const d = inc.createdAt ? inc.createdAt.slice(0, 10) : (inc.incomeDate || '');
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
      if (selectedCategory !== 'ALL' && inc.category?.toUpperCase() !== selectedCategory.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const descMatch = (inc.description || '').toLowerCase().includes(q);
        const catMatch = (inc.category || '').toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [income, startDate, endDate, selectedCategory, searchQuery]);

  // Total sums (in base USD)
  const totalExp = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalInc = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);

  // Sorting helper for Expenses
  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (expSortField === 'DATE') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (expSortField === 'AMOUNT') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      } else if (expSortField === 'CATEGORY') {
        valA = (a.category || '').toLowerCase();
        valB = (b.category || '').toLowerCase();
      } else if (expSortField === 'DESCRIPTION') {
        valA = (a.description || '').toLowerCase();
        valB = (b.description || '').toLowerCase();
      }

      if (valA < valB) return expSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return expSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredExpenses, expSortField, expSortDirection]);

  // Paginated Expenses
  const expTotalPages = expPageSize === -1 ? 1 : Math.ceil(sortedExpenses.length / expPageSize);
  const expEffectivePage = Math.min(Math.max(1, expPage), Math.max(1, expTotalPages));
  const paginatedExpenses = useMemo(() => {
    if (expPageSize === -1) return sortedExpenses;
    const start = (expEffectivePage - 1) * expPageSize;
    return sortedExpenses.slice(start, start + expPageSize);
  }, [sortedExpenses, expEffectivePage, expPageSize]);

  // Sorting helper for Incomes
  const sortedIncomes = useMemo(() => {
    return [...filteredIncomes].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (incSortField === 'DATE') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (incSortField === 'AMOUNT') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      } else if (incSortField === 'CATEGORY') {
        valA = (a.category || '').toLowerCase();
        valB = (b.category || '').toLowerCase();
      } else if (incSortField === 'DESCRIPTION') {
        valA = (a.description || '').toLowerCase();
        valB = (b.description || '').toLowerCase();
      }

      if (valA < valB) return incSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return incSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredIncomes, incSortField, incSortDirection]);

  // Paginated Incomes
  const incTotalPages = incPageSize === -1 ? 1 : Math.ceil(sortedIncomes.length / incPageSize);
  const incEffectivePage = Math.min(Math.max(1, incPage), Math.max(1, incTotalPages));
  const paginatedIncomes = useMemo(() => {
    if (incPageSize === -1) return sortedIncomes;
    const start = (incEffectivePage - 1) * incPageSize;
    return sortedIncomes.slice(start, start + incPageSize);
  }, [sortedIncomes, incEffectivePage, incPageSize]);

  // Filtered & Sorted Shift Closings
  const filteredAndSortedClosings = useMemo(() => {
    const filtered = closings.filter((c) => {
      if (closingStartDate || closingEndDate) {
        const d = c.closingTime ? c.closingTime.slice(0, 10) : (c.createdAt ? c.createdAt.slice(0, 10) : '');
        if (closingStartDate && d < closingStartDate) return false;
        if (closingEndDate && d > closingEndDate) return false;
      }
      if (closingSearchQuery.trim()) {
        const q = closingSearchQuery.toLowerCase().trim();
        const userMatch = (c.userId || '').toLowerCase().includes(q);
        const storeMatch = (c.storeId || '').toLowerCase().includes(q);
        const notesMatch = (c.notes || '').toLowerCase().includes(q);
        const idMatch = (c.id || '').toLowerCase().includes(q);
        if (!userMatch && !storeMatch && !notesMatch && !idMatch) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (closingSortField === 'DATE') {
        valA = a.closingTime ? new Date(a.closingTime).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        valB = b.closingTime ? new Date(b.closingTime).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      } else if (closingSortField === 'CASHIER') {
        valA = (a.userId || '').toLowerCase();
        valB = (b.userId || '').toLowerCase();
      } else if (closingSortField === 'FLOAT') {
        valA = a.openingCash || 0;
        valB = b.openingCash || 0;
      } else if (closingSortField === 'EXPECTED') {
        valA = a.closingCashExpected || 0;
        valB = b.closingCashExpected || 0;
      } else if (closingSortField === 'ACTUAL') {
        valA = a.closingCashActual || 0;
        valB = b.closingCashActual || 0;
      } else if (closingSortField === 'VARIANCE') {
        valA = a.cashDifference || 0;
        valB = b.cashDifference || 0;
      }

      if (valA < valB) return closingSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return closingSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [closings, closingStartDate, closingEndDate, closingSearchQuery, closingSortField, closingSortDirection]);

  // Paginated Shift Closings
  const closingTotalPages = closingPageSize === -1 ? 1 : Math.ceil(filteredAndSortedClosings.length / closingPageSize);
  const closingEffectivePage = Math.min(Math.max(1, closingPage), Math.max(1, closingTotalPages));
  const paginatedClosings = useMemo(() => {
    if (closingPageSize === -1) return filteredAndSortedClosings;
    const start = (closingEffectivePage - 1) * closingPageSize;
    return filteredAndSortedClosings.slice(start, start + closingPageSize);
  }, [filteredAndSortedClosings, closingEffectivePage, closingPageSize]);

  // Sort handlers
  const handleExpSort = (field: ExpSortField) => {
    if (expSortField === field) {
      setExpSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setExpSortField(field);
      setExpSortDirection(field === 'DATE' || field === 'AMOUNT' ? 'desc' : 'asc');
    }
  };

  const handleIncSort = (field: IncSortField) => {
    if (incSortField === field) {
      setIncSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setIncSortField(field);
      setIncSortDirection(field === 'DATE' || field === 'AMOUNT' ? 'desc' : 'asc');
    }
  };

  const handleClosingSort = (field: ClosingSortField) => {
    if (closingSortField === field) {
      setClosingSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setClosingSortField(field);
      setClosingSortDirection(field === 'DATE' ? 'desc' : 'asc');
    }
  };

  // Top Cost Category calculation
  const topExpenseCategory = useMemo(() => {
    if (filteredExpenses.length === 0) return 'None';
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const c = e.category || 'Other';
      catMap[c] = (catMap[c] || 0) + (e.amount || 0);
    });
    let maxCat = 'None';
    let maxVal = -1;
    Object.entries(catMap).forEach(([k, v]) => {
      if (v > maxVal) {
        maxVal = v;
        maxCat = k;
      }
    });
    return maxCat;
  }, [filteredExpenses]);

  // Helper for category styling and icons
  const getCategoryBadge = (cat: string) => {
    const upper = (cat || '').toUpperCase();
    if (upper.includes('RENT') || upper.includes('LEASE')) {
      return { bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', icon: Building2 };
    }
    if (upper.includes('UTIL') || upper.includes('ELEC') || upper.includes('POWER')) {
      return { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Zap };
    }
    if (upper.includes('SALAR') || upper.includes('WAGE') || upper.includes('PAYROLL')) {
      return { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Users };
    }
    if (upper.includes('SUPPL') || upper.includes('PACKAG')) {
      return { bg: 'bg-sky-500/10 text-sky-500 border-sky-500/20', icon: Package };
    }
    if (upper.includes('MAINT') || upper.includes('REPAIR')) {
      return { bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Wrench };
    }
    return { bg: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: Tag };
  };

  const printZReport = (closing: any) => {
    const printWin = window.open('', '_blank', 'width=450,height=700');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Z-Report Shift Closing Slip</title>
        <style>
          body { font-family: monospace; font-size: 12px; color: #000; padding: 15px; width: 300px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          .large { font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center bold large">39POS ENTERPRISE</div>
        <div class="center">REGISTER SHIFT CLOSING (Z-REPORT)</div>
        <div class="center">${new Date(closing.closingTime || closing.createdAt).toLocaleString()}</div>
        <div class="divider"></div>
        <div class="flex"><span>Shift ID:</span><span>${closing.id}</span></div>
        <div class="flex"><span>Cashier/User:</span><span>${closing.userId || 'Cashier'}</span></div>
        <div class="flex"><span>Open Time:</span><span>${new Date(closing.openingTime).toLocaleTimeString()}</span></div>
        <div class="flex"><span>Close Time:</span><span>${new Date(closing.closingTime).toLocaleTimeString()}</span></div>
        <div class="divider"></div>
        <div class="flex"><span>Opening Float:</span><span>${format(convert(closing.openingCash, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="flex"><span>Gross Sales:</span><span>+${format(convert(closing.totalSales, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="flex"><span>Petty Expenses:</span><span>-${format(convert(closing.totalExpenses, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="divider"></div>
        <div class="flex bold"><span>Expected Drawer:</span><span>${format(convert(closing.closingCashExpected, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="flex bold"><span>Actual Counted:</span><span>${format(convert(closing.closingCashActual, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="flex bold large" style="color: ${closing.cashDifference >= 0 ? '#059669' : '#dc2626'};">
          <span>Variance (Over/Short):</span>
          <span>${closing.cashDifference >= 0 ? '+' : ''}${format(convert(closing.cashDifference, baseCode, currentCurrency), currentCurrency)}</span>
        </div>
        <div class="divider"></div>
        <div>Notes: ${closing.notes || 'Normal shift close'}</div>
        <div class="divider"></div>
        <div class="center" style="margin-top: 25px;">Cashier Signature: __________________</div>
        <div class="center" style="margin-top: 20px;">Manager Signature: __________________</div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Inline Toast */}
      {toastMsg && (
        <div className={`export-toast ${toastMsg.type === 'error' ? 'export-toast--error' : 'export-toast--success'}`}>
          {toastMsg.type === 'error' ? '✕' : '✓'}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-500">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {t('accounting.title', 'Financials, Expenses & Shift Register Closing')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('accounting.subtitle', 'Cash drawer shift reconciliation, operational expense logs, and petty cash control')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="px-3.5 py-2 neu-btn text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:text-rose-500 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-rose-500" />
            <span>{t('accounting.btnRecordExpense', 'Record Expense')}</span>
          </button>

          <button
            onClick={() => setIncomeModalOpen(true)}
            className="px-3.5 py-2 neu-btn text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:text-emerald-500 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>{t('accounting.btnRecordIncome', 'Record Income')}</span>
          </button>

          <button
            onClick={() => setClosingModalOpen(true)}
            className="px-4 py-2 neu-btn-primary text-xs font-extrabold text-white flex items-center gap-2 shadow-neu-glow-emerald transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('accounting.btnCloseShift', 'Close Shift Register (Z-Report)')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Ribbon (Fixed) */}
      <div className="flex-shrink-0 flex items-center gap-1.5 p-1 neu-tab-container text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setActiveTab('EXPENSES');
            setSelectedCategory('ALL');
          }}
          className={`flex-1 min-w-[150px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'EXPENSES'
              ? 'neu-tab-active text-rose-600 dark:text-rose-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <span>{t('accounting.tabExpenses', 'Operational Expenses')} ({expenses.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('INCOME');
            setSelectedCategory('ALL');
          }}
          className={`flex-1 min-w-[150px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'INCOME'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>{t('accounting.tabIncome', 'Other Incomes')} ({income.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CLOSING')}
          className={`flex-1 min-w-[150px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'CLOSING'
              ? 'neu-tab-active text-amber-600 dark:text-amber-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-500" />
          <span>{t('accounting.tabShiftClosing', 'Shift Closings (Z-Report)')} ({closings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('GENERAL_LEDGER')}
          className={`flex-1 min-w-[160px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'GENERAL_LEDGER'
              ? 'neu-tab-active text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span>{t('accounting.tabGeneralLedger', 'General Ledger (GL)')}</span>
        </button>

        <button
          onClick={() => setActiveTab('CHART_OF_ACCOUNTS')}
          className={`flex-1 min-w-[170px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'CHART_OF_ACCOUNTS'
              ? 'neu-tab-active text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4 text-teal-500" />
          <span>{t('accounting.tabChartOfAccounts', 'Chart of Accounts & Trial Balance')}</span>
        </button>
      </div>

      {/* Main Work Pane (Scrollable Body) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin space-y-4">

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OPERATIONAL EXPENSES */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          {/* Top KPI Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.totalRecordedExpenses', 'Total Recorded Expenses')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-rose-500">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
                {format(convert(totalExp, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.filteredPeriodBurn', 'Filtered period burn')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.expenseEntries', 'Expense Entries')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-slate-500">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono flex items-baseline gap-1.5">
                <span>{filteredExpenses.length}</span>
                <span className="text-xs font-bold text-slate-400">{t('accounting.unitRecords', 'Records')}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.pettyCashInvoices', 'Petty cash + invoices')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.topSpendCategory', 'Top Spend Category')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
                  <Tag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-black text-amber-500 truncate tracking-tight">
                {topExpenseCategory !== 'None' ? String(t(`expenseCategory.${topExpenseCategory.toUpperCase()}`, topExpenseCategory)) : t('common.none', 'None')}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.highestCostCenter', 'Highest cost center')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.activeStoreCurrency', 'Active Store Currency')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {currentCurrency}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.autoConvertedRates', 'Auto-converted rates')}
              </div>
            </div>
          </div>

          {/* Filter Ribbon */}
          <div className="p-4 rounded-3xl neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs relative z-20">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('accounting.searchExpensePlaceholder', 'Search expense description...')}
                  className="w-full pl-9 pr-3.5 py-2 neu-input text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 neu-tab-container p-1 text-[11px] font-bold overflow-x-auto">
                {['ALL', 'Utilities', 'Rent', 'Salaries', 'Supplies', 'Maintenance', 'Other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory.toUpperCase() === cat.toUpperCase()
                        ? 'neu-tab-active text-slate-900 dark:text-white font-extrabold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cat === 'ALL' ? t('common.all', 'ALL') : String(t(`expenseCategory.${cat.toUpperCase()}`, cat))}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <div className="w-36">
                <CustomDatePicker value={startDate} onChange={setStartDate} placeholder={t('accounting.fromDate', 'From date...')} presets={false} />
              </div>
              <span className="text-slate-400 font-bold text-xs">-</span>
              <div className="w-36">
                <CustomDatePicker value={endDate} onChange={setEndDate} placeholder={t('accounting.toDate', 'To date...')} presets={false} />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-8 h-8 neu-circle-btn text-slate-500 hover:text-rose-500 transition-colors"
                  title={t('common.reset', 'Reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="neu-card-lg rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <span className="text-slate-800 dark:text-white">{t('accounting.pettyCashLedger', 'Petty Cash & Expense Ledger')}</span>
                <span className="text-[11px] text-slate-400 font-mono">({filteredExpenses.length} {t('accounting.unitEntries', 'Entries')})</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                  {t('accounting.loadingExpenses', 'Loading expenses...')}
                </div>
              ) : sortedExpenses.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs font-semibold">
                  <Receipt className="w-7 h-7 opacity-30" />
                  <span>{t('accounting.noExpenseRecords', 'No expense records found for this filter')}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none">
                    <tr>
                      <th
                        onClick={() => handleExpSort('CATEGORY')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colCategory', 'Category')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              expSortField === 'CATEGORY' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleExpSort('DESCRIPTION')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colDescriptionNotes', 'Description / Notes')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              expSortField === 'DESCRIPTION' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleExpSort('DATE')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colDateTime', 'Date & Time')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              expSortField === 'DATE' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleExpSort('AMOUNT')}
                        className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{t('reports.colAmountCurrency', 'Amount ({{currency}})', { currency: currentCurrency })}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              expSortField === 'AMOUNT' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th className="p-4 text-right">{t('reports.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                    {paginatedExpenses.map((exp) => {
                      const badge = getCategoryBadge(exp.category);
                      const IconComp = badge.icon;
                      return (
                        <tr key={exp.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${badge.bg}`}
                            >
                              <IconComp className="w-3 h-3" />
                              <span>{String(t(`expenseCategory.${(exp.category || '').toUpperCase()}`, exp.category || 'Other'))}</span>
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white">{exp.description || '—'}</div>
                            <span className="font-mono text-[10px] text-slate-400 block">{exp.id}</span>
                          </td>

                          <td className="p-4">
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              {exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : exp.expenseDate || '—'}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {exp.createdAt ? new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>

                          <td className="p-4 text-right font-mono font-black text-rose-500 text-sm">
                            -{format(convert(exp.amount, baseCode, currentCurrency), currentCurrency)}
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={() => setDeleteTarget({ type: 'EXPENSE', item: exp })}
                              className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 transition-colors"
                              title={t('accounting.deleteExpenseTitle', 'Delete Expense Record')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            {sortedExpenses.length > 0 && (
              <div className="p-3.5 border-t border-slate-200/40 dark:border-slate-800/60 neu-sunken-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                  {(() => {
                    const start = expPageSize === -1 ? 1 : (expEffectivePage - 1) * expPageSize + 1;
                    const end = expPageSize === -1 ? sortedExpenses.length : Math.min(expEffectivePage * expPageSize, sortedExpenses.length);
                    return (
                      <span>
                        Showing {start === end ? start : `${start}–${end}`} of{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{sortedExpenses.length}</span>{' '}
                        {sortedExpenses.length === 1 ? 'entry' : 'entries'}
                      </span>
                    );
                  })()}
                  <div className="w-32">
                    <CustomSelect
                      value={String(expPageSize)}
                      onChange={(val) => {
                        setExpPageSize(Number(val));
                        setExpPage(1);
                      }}
                      options={[
                        { value: '10', label: '10 / page' },
                        { value: '25', label: '25 / page' },
                        { value: '50', label: '50 / page' },
                        { value: '100', label: '100 / page' },
                        { value: '-1', label: 'All records' },
                      ]}
                      placement="up"
                      size="sm"
                    />
                  </div>
                </div>

                {expPageSize !== -1 && expTotalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpPage(1)}
                      disabled={expEffectivePage === 1}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpPage((p) => Math.max(1, p - 1))}
                      disabled={expEffectivePage === 1}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: expTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === expTotalPages || Math.abs(p - expEffectivePage) <= 1)
                        .map((p, idx, arr) => (
                          <React.Fragment key={p}>
                            {idx > 0 && p - arr[idx - 1] > 1 && (
                              <span className="px-1 text-slate-400 select-none">…</span>
                            )}
                            <button
                              onClick={() => setExpPage(p)}
                              className={`w-7 h-7 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                                p === expEffectivePage
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'neu-btn text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>

                    <button
                      onClick={() => setExpPage((p) => Math.min(expTotalPages, p + 1))}
                      disabled={expEffectivePage === expTotalPages}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpPage(expTotalPages)}
                      disabled={expEffectivePage === expTotalPages}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: OTHER INCOMES */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'INCOME' && (
        <div className="space-y-4">
          {/* Top KPI Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.totalRecordedIncomes', 'Total Recorded Incomes')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {format(convert(totalInc, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.nonPosInflows', 'Non-POS miscellaneous inflows')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.incomeStreamsCount', 'Income Streams Count')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-slate-500">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono flex items-baseline gap-1.5">
                <span>{filteredIncomes.length}</span>
                <span className="text-xs font-bold text-slate-400">{t('accounting.unitRecords', 'Records')}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.rebatesInterestFees', 'Rebates, interest, fees')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.storeCurrency', 'Store Currency')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {currentCurrency}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.activeDisplayFormat', 'Active display format')}
              </div>
            </div>
          </div>

          {/* Filter Ribbon */}
          <div className="p-4 rounded-3xl neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('accounting.searchIncomePlaceholder', 'Search income description...')}
                  className="w-full pl-9 pr-3.5 py-2 neu-input text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 neu-tab-container p-1 text-[11px] font-bold overflow-x-auto">
                {['ALL', 'Investment', 'Interest', 'Service Fee', 'Other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory.toUpperCase() === cat.toUpperCase()
                        ? 'neu-tab-active text-slate-900 dark:text-white font-extrabold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cat === 'ALL' ? t('common.all', 'ALL') : String(t(`accounting.category.${cat.toUpperCase().replace(/\s+/g, '_')}`, cat))}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <div className="w-36">
                <CustomDatePicker value={startDate} onChange={setStartDate} placeholder={t('accounting.fromDate', 'From date...')} presets={false} />
              </div>
              <span className="text-slate-400 font-bold text-xs">-</span>
              <div className="w-36">
                <CustomDatePicker value={endDate} onChange={setEndDate} placeholder={t('accounting.toDate', 'To date...')} presets={false} />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-8 h-8 neu-circle-btn text-slate-500 hover:text-rose-500 transition-colors"
                  title={t('common.reset', 'Reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Income Table */}
          <div className="neu-card-lg rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-800 dark:text-white">{t('accounting.otherIncomesLedger', 'Other Incomes Ledger')}</span>
                <span className="text-[11px] text-slate-400 font-mono">({sortedIncomes.length} {t('accounting.unitEntries', 'Entries')})</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                  {t('accounting.loadingIncome', 'Loading income records...')}
                </div>
              ) : sortedIncomes.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs font-semibold">
                  <Receipt className="w-7 h-7 opacity-30" />
                  <span>{t('accounting.noIncomeRecords', 'No income records found for this filter')}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none">
                    <tr>
                      <th
                        onClick={() => handleIncSort('CATEGORY')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colCategory', 'Category')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              incSortField === 'CATEGORY' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleIncSort('DESCRIPTION')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colDescriptionNotes', 'Description / Notes')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              incSortField === 'DESCRIPTION' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleIncSort('DATE')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colDateTime', 'Date & Time')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              incSortField === 'DATE' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleIncSort('AMOUNT')}
                        className="p-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{t('reports.colAmountCurrency', 'Amount ({{currency}})', { currency: currentCurrency })}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              incSortField === 'AMOUNT' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th className="p-4 text-right">{t('reports.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                    {paginatedIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            <Tag className="w-3 h-3" />
                            <span>{String(t(`accounting.category.${(inc.category || 'Other').toUpperCase().replace(/\s+/g, '_')}`, inc.category || 'Other'))}</span>
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{inc.description || '—'}</div>
                          <span className="font-mono text-[10px] text-slate-400 block">{inc.id}</span>
                        </td>

                        <td className="p-4">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : inc.incomeDate || '—'}
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {inc.createdAt ? new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </td>

                        <td className="p-4 text-right font-mono font-black text-emerald-500 text-sm">
                          +{format(convert(inc.amount, baseCode, currentCurrency), currentCurrency)}
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() => setDeleteTarget({ type: 'INCOME', item: inc })}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 transition-colors"
                            title={t('accounting.deleteIncomeTitle', 'Delete Income Record')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            {sortedIncomes.length > 0 && (
              <div className="p-3.5 border-t border-slate-200/40 dark:border-slate-800/60 neu-sunken-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                  {(() => {
                    const start = incPageSize === -1 ? 1 : (incEffectivePage - 1) * incPageSize + 1;
                    const end = incPageSize === -1 ? sortedIncomes.length : Math.min(incEffectivePage * incPageSize, sortedIncomes.length);
                    return (
                      <span>
                        Showing {start === end ? start : `${start}–${end}`} of{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{sortedIncomes.length}</span>{' '}
                        {sortedIncomes.length === 1 ? 'entry' : 'entries'}
                      </span>
                    );
                  })()}
                  <div className="w-32">
                    <CustomSelect
                      value={String(incPageSize)}
                      onChange={(val) => {
                        setIncPageSize(Number(val));
                        setIncPage(1);
                      }}
                      options={[
                        { value: '10', label: '10 / page' },
                        { value: '25', label: '25 / page' },
                        { value: '50', label: '50 / page' },
                        { value: '100', label: '100 / page' },
                        { value: '-1', label: 'All records' },
                      ]}
                      placement="up"
                      size="sm"
                    />
                  </div>
                </div>

                {incPageSize !== -1 && incTotalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIncPage(1)}
                      disabled={incEffectivePage === 1}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIncPage((p) => Math.max(1, p - 1))}
                      disabled={incEffectivePage === 1}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: incTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === incTotalPages || Math.abs(p - incEffectivePage) <= 1)
                        .map((p, idx, arr) => (
                          <React.Fragment key={p}>
                            {idx > 0 && p - arr[idx - 1] > 1 && (
                              <span className="px-1 text-slate-400 select-none">…</span>
                            )}
                            <button
                              onClick={() => setIncPage(p)}
                              className={`w-7 h-7 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                                p === incEffectivePage
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'neu-btn text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>

                    <button
                      onClick={() => setIncPage((p) => Math.min(incTotalPages, p + 1))}
                      disabled={incEffectivePage === incTotalPages}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIncPage(incTotalPages)}
                      disabled={incEffectivePage === incTotalPages}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: SHIFT REGISTER CLOSINGS (Z-REPORTS) */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'CLOSING' && (
        <div className="space-y-4">
          {/* Top KPI Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.totalClosedShifts', 'Total Closed Shifts')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5 tracking-tight font-mono">
                <span>{closings.length}</span>
                <span className="text-xs font-bold text-slate-400">{t('accounting.unitShifts', 'Shifts')}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.reconciledSessions', 'Reconciled register sessions')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.lastShiftStatus', 'Last Shift Status')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-black text-emerald-500 font-mono tracking-tight">
                {closings.length > 0 ? t('accounting.statusBalanced', 'BALANCED') : t('accounting.statusNoSessions', 'NO SESSIONS')}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.drawerAuditStatus', 'Drawer audit status')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('accounting.storeCurrency', 'Store Currency')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {currentCurrency}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('accounting.drawerUnit', 'Drawer reconciliation unit')}
              </div>
            </div>
          </div>

          {/* Shift Closings Filter Ribbon */}
          <div className="p-4 rounded-3xl neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={closingSearchQuery}
                onChange={(e) => setClosingSearchQuery(e.target.value)}
                placeholder={t('accounting.searchClosingsPlaceholder', 'Search cashier, notes, shift ID...')}
                className="w-full pl-9 pr-3.5 py-2 neu-input text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <div className="w-36">
                <CustomDatePicker
                  value={closingStartDate}
                  onChange={setClosingStartDate}
                  placeholder={t('accounting.fromDate', 'From date...')}
                  presets={false}
                />
              </div>
              <span className="text-slate-400 font-bold text-xs">-</span>
              <div className="w-36">
                <CustomDatePicker
                  value={closingEndDate}
                  onChange={setClosingEndDate}
                  placeholder={t('accounting.toDate', 'To date...')}
                  presets={false}
                />
              </div>
              {(closingStartDate || closingEndDate || closingSearchQuery) && (
                <button
                  onClick={() => {
                    setClosingStartDate('');
                    setClosingEndDate('');
                    setClosingSearchQuery('');
                  }}
                  className="w-8 h-8 neu-circle-btn text-slate-500 hover:text-rose-500 transition-colors"
                  title={t('common.reset', 'Reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Historical Closings Table */}
          <div className="neu-card-lg rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-800 dark:text-white">{t('accounting.closingAuditLog', 'Register Closing Audit Log (Z-Reports)')}</span>
                <span className="text-[11px] text-slate-400 font-mono">({filteredAndSortedClosings.length} {t('accounting.unitShifts', 'Shifts')})</span>
              </div>

              <button
                onClick={() => {
                  setClosingResult(null);
                  setClosingModalOpen(true);
                }}
                className="px-3.5 py-1.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t('accounting.btnCloseRegisterShort', 'Close Shift Register')}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                  {t('accounting.loadingClosings', 'Loading shift closings...')}
                </div>
              ) : filteredAndSortedClosings.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs font-semibold">
                  <Lock className="w-7 h-7 opacity-30" />
                  <span>{t('accounting.noShiftClosings', 'No shift register closings recorded yet')}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none">
                    <tr>
                      <th
                        onClick={() => handleClosingSort('DATE')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colClosingTime', 'Closing Time / Shift')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              closingSortField === 'DATE' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleClosingSort('CASHIER')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colCashierStaff', 'Cashier / Staff')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              closingSortField === 'CASHIER' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleClosingSort('FLOAT')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colOpeningFloat', 'Opening Float')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              closingSortField === 'FLOAT' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleClosingSort('EXPECTED')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colExpectedCash', 'Expected Cash')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              closingSortField === 'EXPECTED' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleClosingSort('ACTUAL')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colActualCounted', 'Actual Counted')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              closingSortField === 'ACTUAL' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleClosingSort('VARIANCE')}
                        className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('accounting.colVariance', 'Variance (Over/Short)')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              closingSortField === 'VARIANCE' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th className="p-4 text-right">{t('accounting.colPrintZReport', 'Print Z-Report')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                    {paginatedClosings.map((c) => {
                      const diff = c.cashDifference || 0;
                      const isOverOrExact = diff >= 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {new Date(c.closingTime || c.createdAt).toLocaleDateString()}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(c.closingTime || c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{c.userId || 'Cashier'}</div>
                            <span className="text-[10px] text-slate-400 block font-mono">{c.storeId || 'store-flagship'}</span>
                          </td>

                          <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                            {format(convert(c.openingCash || 0, baseCode, currentCurrency), currentCurrency)}
                          </td>

                          <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                            {format(convert(c.closingCashExpected || 0, baseCode, currentCurrency), currentCurrency)}
                          </td>

                          <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                            {format(convert(c.closingCashActual || 0, baseCode, currentCurrency), currentCurrency)}
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                                Math.abs(diff) < 0.01
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : isOverOrExact
                                  ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              }`}
                            >
                              {isOverOrExact ? '+' : ''}
                              {format(convert(diff, baseCode, currentCurrency), currentCurrency)}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={() => printZReport(c)}
                              className="px-3 py-1.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                              title={t('accounting.printSlipTitle', 'Print Z-Report Thermal Slip')}
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{t('accounting.btnPrintSlip', 'Print Slip')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            {filteredAndSortedClosings.length > 0 && (
              <div className="p-3.5 border-t border-slate-200/40 dark:border-slate-800/60 neu-sunken-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                  {(() => {
                    const start = closingPageSize === -1 ? 1 : (closingEffectivePage - 1) * closingPageSize + 1;
                    const end = closingPageSize === -1 ? filteredAndSortedClosings.length : Math.min(closingEffectivePage * closingPageSize, filteredAndSortedClosings.length);
                    return (
                      <span>
                        Showing {start === end ? start : `${start}–${end}`} of{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{filteredAndSortedClosings.length}</span>{' '}
                        {filteredAndSortedClosings.length === 1 ? 'shift' : 'shifts'}
                      </span>
                    );
                  })()}
                  <div className="w-32">
                    <CustomSelect
                      value={String(closingPageSize)}
                      onChange={(val) => {
                        setClosingPageSize(Number(val));
                        setClosingPage(1);
                      }}
                      options={[
                        { value: '10', label: '10 / page' },
                        { value: '25', label: '25 / page' },
                        { value: '50', label: '50 / page' },
                        { value: '100', label: '100 / page' },
                        { value: '-1', label: 'All shifts' },
                      ]}
                      placement="up"
                      size="sm"
                    />
                  </div>
                </div>

                {closingPageSize !== -1 && closingTotalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setClosingPage(1)}
                      disabled={closingEffectivePage === 1}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setClosingPage((p) => Math.max(1, p - 1))}
                      disabled={closingEffectivePage === 1}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: closingTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === closingTotalPages || Math.abs(p - closingEffectivePage) <= 1)
                        .map((p, idx, arr) => (
                          <React.Fragment key={p}>
                            {idx > 0 && p - arr[idx - 1] > 1 && (
                              <span className="px-1 text-slate-400 select-none">…</span>
                            )}
                            <button
                              onClick={() => setClosingPage(p)}
                              className={`w-7 h-7 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                                p === closingEffectivePage
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'neu-btn text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>

                    <button
                      onClick={() => setClosingPage((p) => Math.min(closingTotalPages, p + 1))}
                      disabled={closingEffectivePage === closingTotalPages}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setClosingPage(closingTotalPages)}
                      disabled={closingEffectivePage === closingTotalPages}
                      className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: GENERAL LEDGER & DOUBLE-ENTRY JOURNALS */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'GENERAL_LEDGER' && <GeneralLedgerTab />}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: CHART OF ACCOUNTS & TRIAL BALANCE */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'CHART_OF_ACCOUNTS' && <ChartOfAccountsTab />}
      </div>


      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: RECORD EXPENSE */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl neu-sunken-sm text-rose-500 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('accounting.modalRecordExpenseTitle', 'Record Operating Expense')}
                </h3>
              </div>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('accounting.expenseCategory', 'Expense Category')}
                </label>
                <CreatableCategorySelect
                  value={expForm.category}
                  onChange={(val) => setExpForm({ ...expForm, category: val })}
                  options={[
                    { value: 'Utilities', label: t('expenseCategory.UTILITIES', 'Utilities & Electricity'), subtitle: t('accounting.subUtilities', 'Power, water, internet') },
                    { value: 'Rent', label: t('expenseCategory.RENT_UTILITIES', 'Store Rent & Lease'), subtitle: t('accounting.subRent', 'Building lease & space fees') },
                    { value: 'Salaries', label: t('expenseCategory.SALARIES', 'Staff Wages & Payroll'), subtitle: t('accounting.subSalaries', 'Employee compensation') },
                    { value: 'Supplies', label: t('expenseCategory.SUPPLIES', 'Packaging & Supplies'), subtitle: t('accounting.subSupplies', 'Bags, cups, paper, toner') },
                    { value: 'Maintenance', label: t('expenseCategory.MAINTENANCE', 'Maintenance & Repairs'), subtitle: t('accounting.subMaintenance', 'Equipment & facility upkeep') },
                    { value: 'Marketing', label: t('expenseCategory.MARKETING', 'Marketing & Promotion'), subtitle: t('accounting.subMarketing', 'Ads, printing, social media') },
                    { value: 'Transportation', label: t('expenseCategory.TRANSPORTATION', 'Fuel & Logistics'), subtitle: t('accounting.subLogistics', 'Delivery fuel & vehicle upkeep') },
                    { value: 'Other', label: t('expenseCategory.MISC', 'Other Operating Expenses'), subtitle: t('accounting.subOther', 'General petty cash') },
                  ]}
                  placeholder={t('accounting.typeOrSelectExpenseCategory', 'Type or select expense category...')}
                />
              </div>

              {/* Mini-Mart Quick Preset Chips */}
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">{t('accounting.quickPresetsTitle', 'Mini-Mart Quick Cost Presets:')}</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExpForm({ ...expForm, category: 'Utilities', description: t('accounting.presetElectricityText', 'Store Electricity & Freezers Bill') })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-card-sm hover:text-amber-500 font-extrabold text-[10px] transition-all cursor-pointer text-slate-600 dark:text-slate-300"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{t('accounting.presetElectricity', 'Electricity (Freezers)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpForm({ ...expForm, category: 'Salaries', description: t('accounting.presetAdvanceText', 'Staff Cashier Advance / Daily Wage') })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-card-sm hover:text-indigo-500 font-extrabold text-[10px] transition-all cursor-pointer text-slate-600 dark:text-slate-300"
                  >
                    <Users className="w-3 h-3 text-indigo-500" />
                    <span>{t('accounting.presetAdvance', 'Staff Advance / Wage')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpForm({ ...expForm, category: 'Utilities', description: t('accounting.presetWaterText', 'Monthly Water & Store Sanitation') })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-card-sm hover:text-cyan-500 font-extrabold text-[10px] transition-all cursor-pointer text-slate-600 dark:text-slate-300"
                  >
                    <Droplets className="w-3 h-3 text-cyan-500" />
                    <span>{t('accounting.presetWater', 'Water Bill')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpForm({ ...expForm, category: 'Rent', description: t('accounting.presetRentText', 'Monthly Store Lease & Space Rent') })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-card-sm hover:text-purple-500 font-extrabold text-[10px] transition-all cursor-pointer text-slate-600 dark:text-slate-300"
                  >
                    <Building2 className="w-3 h-3 text-purple-500" />
                    <span>{t('accounting.presetRent', 'Store Rent')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpForm({ ...expForm, category: 'Supplies', description: t('accounting.presetSuppliesText', 'Shopping Bags & POS Receipt Rolls') })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-card-sm hover:text-emerald-500 font-extrabold text-[10px] transition-all cursor-pointer text-slate-600 dark:text-slate-300"
                  >
                    <Package className="w-3 h-3 text-emerald-500" />
                    <span>{t('accounting.presetSupplies', 'Bags & Rolls')}</span>
                  </button>
                </div>
              </div>

              {/* Date and Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('accounting.expenseDate', 'Expense Date')}
                  </label>
                  <CustomDatePicker
                    value={expForm.expenseDate}
                    onChange={(val) => setExpForm({ ...expForm, expenseDate: val })}
                    placeholder={t('reports.today', 'Today')}
                    presets={false}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('accounting.expenseAmountCurrency', 'Amount ({{currency}})', { currency: currentCurrency })}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={expForm.amount}
                    onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                    className="w-full pl-3.5 pr-3.5 py-2.5 neu-input font-mono font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('accounting.descriptionReason', 'Description / Reason')}
                </label>
                <textarea
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full p-3 rounded-2xl neu-input text-slate-900 dark:text-white placeholder:text-slate-400"
                  rows={2}
                  placeholder={t('accounting.expensePlaceholder', 'e.g. Paid electricity bill for August or purchased cleaning supplies')}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2.5 neu-btn font-extrabold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 neu-btn-danger text-white font-extrabold cursor-pointer"
                >
                  {t('accounting.btnSaveExpense', 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: RECORD INCOME */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {incomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('accounting.modalRecordIncomeTitle', 'Record Miscellaneous Income')}
                </h3>
              </div>
              <button
                onClick={() => setIncomeModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIncome} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('accounting.incomeCategory', 'Income Category')}
                </label>
                <CreatableCategorySelect
                  value={incForm.category}
                  onChange={(val) => setIncForm({ ...incForm, category: val })}
                  options={[
                    { value: 'Service Fee', label: t('accounting.category.SERVICE_FEE', 'Service & Consulting Fee'), subtitle: t('accounting.subServiceFee', 'Delivery or extra services') },
                    { value: 'Investment', label: t('accounting.category.INVESTMENT', 'Capital Injection / Owner Float'), subtitle: t('accounting.subInvestment', 'Owner deposit to cash drawer') },
                    { value: 'Interest', label: t('accounting.category.INTEREST', 'Interest & Vendor Rebate'), subtitle: t('accounting.subInterest', 'Supplier rewards / bank yield') },
                    { value: 'Other', label: t('accounting.category.OTHER', 'Other Miscellaneous Inflow'), subtitle: t('accounting.subOtherInflow', 'Scrap sales or one-off items') },
                  ]}
                  placeholder={t('accounting.typeOrSelectIncomeCategory', 'Type or select income category...')}
                />
              </div>

              {/* Date and Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('accounting.incomeDate', 'Income Date')}
                  </label>
                  <CustomDatePicker
                    value={incForm.incomeDate}
                    onChange={(val) => setIncForm({ ...incForm, incomeDate: val })}
                    placeholder={t('reports.today', 'Today')}
                    presets={false}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('accounting.incomeAmountCurrency', 'Amount ({{currency}})', { currency: currentCurrency })}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={incForm.amount}
                    onChange={(e) => setIncForm({ ...incForm, amount: e.target.value })}
                    className="w-full pl-3.5 pr-3.5 py-2.5 neu-input font-mono font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('accounting.descriptionNotes', 'Description / Notes')}
                </label>
                <textarea
                  value={incForm.description}
                  onChange={(e) => setIncForm({ ...incForm, description: e.target.value })}
                  className="w-full p-3 rounded-2xl neu-input text-slate-900 dark:text-white placeholder:text-slate-400"
                  rows={2}
                  placeholder={t('accounting.incomePlaceholder', 'e.g. Supplier trade discount rebate or packaging recycling income')}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIncomeModalOpen(false)}
                  className="px-4 py-2.5 neu-btn font-extrabold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
                >
                  {t('accounting.btnSaveIncome', 'Save Income')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: CLOSE SHIFT REGISTER (Z-REPORT) */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {closingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {t('accounting.modalCloseShiftTitle', 'Close Shift Register (Z-Report)')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {t('accounting.modalCloseShiftSubtitle', 'Reconcile physical cash drawer with POS sales & petty cash logs')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClosingModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {closingResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm">{t('accounting.shiftReconciledTitle', 'Shift Register Reconciled!')}</div>
                    <div className="text-[11px] opacity-80">{t('accounting.shiftSavedMsg', 'Shift #{{id}} has been permanently saved.', { id: closingResult.id })}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl neu-sunken-sm space-y-2.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('accounting.colExpectedCash', 'Expected Cash')}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {format(convert(closingResult.expectedCash, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('accounting.colActualCounted', 'Actual Counted')}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {format(convert(Number(closingForm.actualCash), currentCurrency, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/50 dark:border-slate-800/80 pt-2 font-bold text-sm">
                    <span>{t('accounting.colVariance', 'Variance (Over/Short)')}:</span>
                    <span className={closingResult.cashDifference >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                      {closingResult.cashDifference >= 0 ? '+' : ''}
                      {format(convert(closingResult.cashDifference, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => printZReport({ ...closingResult, ...closingForm, closingTime: new Date().toISOString() })}
                    className="px-4 py-2.5 neu-btn text-slate-900 dark:text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-500" />
                    <span>{t('accounting.printZReportSlip', 'Print Z-Report Slip')}</span>
                  </button>
                  <button
                    onClick={() => setClosingModalOpen(false)}
                    className="px-4 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
                  >
                    {t('common.done', 'Done')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecordClosing} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('accounting.openingFloatCurrency', 'Opening Cash Float ({{currency}})', { currency: currentCurrency })}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={closingForm.openingCash}
                    onChange={(e) => setClosingForm({ ...closingForm, openingCash: e.target.value })}
                    className="w-full pl-3.5 pr-3.5 py-2.5 neu-input font-mono font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="e.g. 500,000"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('accounting.actualCountedCurrency', 'Actual Counted Cash in Drawer ({{currency}})', { currency: currentCurrency })}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={closingForm.actualCash}
                    onChange={(e) => setClosingForm({ ...closingForm, actualCash: e.target.value })}
                    className="w-full pl-3.5 pr-3.5 py-2.5 neu-input font-mono font-bold text-sm text-slate-900 dark:text-white"
                    placeholder={t('accounting.countDrawerPlaceholder', 'Count bills + coins in drawer')}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('accounting.closingNotesShiftSummary', 'Closing Notes / Shift Summary')}
                  </label>
                  <textarea
                    value={closingForm.notes}
                    onChange={(e) => setClosingForm({ ...closingForm, notes: e.target.value })}
                    className="w-full p-3 rounded-2xl neu-input text-slate-900 dark:text-white"
                    rows={2}
                    placeholder={t('accounting.closingNotesPlaceholder', 'e.g. Register balanced. Handed float over to evening cashier.')}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setClosingModalOpen(false)}
                    className="px-4 py-2.5 neu-btn font-extrabold text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
                  >
                    {t('accounting.btnReconcileClose', 'Reconcile & Close Register')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Animated Confirm Modal */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExecuteDelete}
        isLoading={deleteLoading}
        title={deleteTarget?.type === 'EXPENSE' ? t('accounting.deleteExpensePromptTitle', 'Delete Expense Record?') : t('accounting.deleteIncomePromptTitle', 'Delete Income Record?')}
        message={
          deleteTarget?.type === 'EXPENSE'
            ? t('accounting.deleteExpenseMsg', 'Are you sure you want to delete this expense record? This transaction will be permanently removed from your financial ledger.')
            : t('accounting.deleteIncomeMsg', 'Are you sure you want to delete this income record? This transaction will be permanently removed from your ledger.')
        }
        itemName={
          deleteTarget?.item?.description ||
          deleteTarget?.item?.title ||
          (deleteTarget?.type === 'EXPENSE' ? t('reports.storeExpense', 'Store Operating Expense') : t('reports.otherIncome', 'Miscellaneous Income'))
        }
        itemDetails={
          deleteTarget
            ? [
                {
                  label: t('reports.colCategory', 'Category'),
                  value: deleteTarget.item.category || 'General',
                  badgeColor: deleteTarget.type === 'EXPENSE' ? 'text-amber-500' : 'text-emerald-500',
                },
                {
                  label: t('reports.colTotalAmount', 'Amount'),
                  value: format(convert(deleteTarget.item.amount, baseCode, currentCurrency), currentCurrency),
                  badgeColor: deleteTarget.type === 'EXPENSE' ? 'text-rose-500' : 'text-emerald-500',
                },
                {
                  label: t('reports.colDateTime', 'Date'),
                  value: deleteTarget.item.createdAt
                    ? new Date(deleteTarget.item.createdAt).toLocaleDateString()
                    : deleteTarget.item.expenseDate || deleteTarget.item.incomeDate || t('reports.today', 'Today'),
                },
              ]
            : []
        }
        confirmLabel={t('accounting.btnYesDeleteRecord', 'Yes, Delete Record')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
      />
    </div>
  );
};

