import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Globe,
  ArrowRightLeft,
  DollarSign,
  PieChart as PieChartIcon,
  Layers,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CreditCard,
  QrCode,
  Banknote,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';

ChartJS.register(ArcElement, Tooltip, Legend);

interface FxAnalyticsReportProps {
  sales: any[];
  filteredSales: any[];
}

export const FxAnalyticsReport: React.FC<FxAnalyticsReportProps> = ({
  sales,
  filteredSales,
}) => {
  const { t } = useTranslation();
  const { theme } = useSettingsStore();
  const isDark = theme === 'dark';
  const { currencies, baseCurrency, currentCurrency, format, convert } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // ── 1. Calculate Multi-Currency Aggregations ──
  const fxData = useMemo(() => {
    const currencyMap: Record<
      string,
      {
        code: string;
        name: string;
        symbol: string;
        orderCount: number;
        totalTenderAmount: number;
        convertedBaseAmount: number;
        currentBaseValue: number;
        realizedGainLoss: number;
      }
    > = {};

    // Initialize map with all known currencies
    currencies.forEach((c) => {
      currencyMap[c.code] = {
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        orderCount: 0,
        totalTenderAmount: 0,
        convertedBaseAmount: 0,
        currentBaseValue: 0,
        realizedGainLoss: 0,
      };
    });

    const foreignTransactions: any[] = [];
    let totalNonBaseVolumeInBase = 0;
    let netRealizedGainLoss = 0;
    let foreignOrderCount = 0;

    filteredSales.forEach((sale) => {
      const tenderCode = (sale.currency || sale.tenderCurrency || baseCode).toUpperCase();
      const isBase = tenderCode === baseCode;
      const tenderAmount = Number(sale.tenderAmount || sale.paidAmount || sale.totalAmount) || 0;
      const recordedBaseAmount = Number(sale.totalAmount) || 0; // Stored in store base currency

      // Current converted equivalent using active store rates
      const currentBaseEquivalent = isBase
        ? recordedBaseAmount
        : convert(tenderAmount, tenderCode, baseCode);

      // Realized FX Variance = Current market value - Recorded transaction amount
      const fxVariance = isBase ? 0 : currentBaseEquivalent - recordedBaseAmount;

      if (!currencyMap[tenderCode]) {
        currencyMap[tenderCode] = {
          code: tenderCode,
          name: tenderCode,
          symbol: tenderCode,
          orderCount: 0,
          totalTenderAmount: 0,
          convertedBaseAmount: 0,
          currentBaseValue: 0,
          realizedGainLoss: 0,
        };
      }

      currencyMap[tenderCode].orderCount += 1;
      currencyMap[tenderCode].totalTenderAmount += tenderAmount;
      currencyMap[tenderCode].convertedBaseAmount += recordedBaseAmount;
      currencyMap[tenderCode].currentBaseValue += currentBaseEquivalent;
      currencyMap[tenderCode].realizedGainLoss += fxVariance;

      if (!isBase) {
        totalNonBaseVolumeInBase += recordedBaseAmount;
        netRealizedGainLoss += fxVariance;
        foreignOrderCount += 1;

        foreignTransactions.push({
          id: sale.id,
          invoiceNo: sale.invoiceNo || 'N/A',
          createdAt: sale.createdAt,
          paymentMethod: sale.paymentMethod || 'CASH',
          tenderCurrency: tenderCode,
          tenderAmount,
          recordedBaseAmount,
          currentBaseEquivalent,
          fxVariance,
          exchangeRateRecorded: sale.exchangeRate || (recordedBaseAmount / Math.max(1, tenderAmount)),
        });
      }
    });

    return {
      currencyMap,
      foreignTransactions,
      totalNonBaseVolumeInBase,
      netRealizedGainLoss,
      foreignOrderCount,
      totalTransactions: filteredSales.length,
    };
  }, [filteredSales, currencies, baseCode, convert]);

  // ── 2. Filter & Paginate Foreign Transactions Ledger ──
  const filteredTransactions = useMemo(() => {
    return fxData.foreignTransactions.filter((tx) => {
      if (selectedCurrencyFilter !== 'ALL' && tx.tenderCurrency !== selectedCurrencyFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invoiceMatch = tx.invoiceNo.toLowerCase().includes(q);
        const currMatch = tx.tenderCurrency.toLowerCase().includes(q);
        const methodMatch = tx.paymentMethod.toLowerCase().includes(q);
        if (!invoiceMatch && !currMatch && !methodMatch) return false;
      }
      return true;
    });
  }, [fxData.foreignTransactions, selectedCurrencyFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // ── 3. Doughnut Chart Config: Currency Volume Share ──
  const chartData = useMemo(() => {
    const activeEntries = Object.values(fxData.currencyMap).filter((c) => c.orderCount > 0);
    const labels = activeEntries.map((c) => `${c.code} (${c.orderCount})`);
    const data = activeEntries.map((c) => c.convertedBaseAmount);

    const colors = [
      '#10b981', // Base Emerald
      '#3b82f6', // Blue
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#ef4444', // Red
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, activeEntries.length),
          borderColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [fxData.currencyMap, isDark]);

  const chartOptions: any = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: isDark ? '#94a3b8' : '#475569',
            font: { size: 11, weight: '600' },
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          boxPadding: 4,
          callbacks: {
            label: (context: any) => {
              const val = context.parsed;
              return `${context.label}: ${format(val, baseCode)}`;
            },
          },
        },
      },
    }),
    [isDark, format, baseCode]
  );

  const getMethodIcon = (method: string) => {
    const m = (method || '').toUpperCase();
    if (m.includes('QR') || m.includes('ONEPAY') || m.includes('PROMPTPAY')) {
      return <QrCode className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />;
    }
    if (m.includes('CARD') || m.includes('VISA') || m.includes('MASTER')) {
      return <CreditCard className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
    }
    return <Banknote className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
  };

  return (
    <div className="space-y-6">
      {/* ── Top Executive KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Base Currency */}
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              {t('reports.baseCurrencyLabel', 'Base Currency')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
              {baseCode}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {baseCurrency?.name || baseCode}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Store anchor currency for accounting & P&L
          </div>
        </div>

        {/* Foreign Currency Volume */}
        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              {t('reports.totalFxVolume', 'Foreign Currency Volume')}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
              {fxData.foreignOrderCount} {t('reports.unitOrders', 'Orders')}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-cyan-100 tracking-tight">
            {format(fxData.totalNonBaseVolumeInBase, baseCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {fxData.totalTransactions > 0
              ? `${((fxData.foreignOrderCount / fxData.totalTransactions) * 100).toFixed(1)}% of total store revenue`
              : 'No foreign tender orders'}
          </div>
        </div>

        {/* Realized FX Gain/Loss */}
        <div
          className={`glass-panel p-4 rounded-2xl border relative overflow-hidden shadow-sm ${
            fxData.netRealizedGainLoss >= 0
              ? 'border-emerald-500/25 bg-emerald-500/5'
              : 'border-rose-500/25 bg-rose-500/5'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-medium flex items-center gap-1.5 ${
                fxData.netRealizedGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {fxData.netRealizedGainLoss >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              )}
              {t('reports.realizedFxGainLoss', 'Realized FX Spread')}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                fxData.netRealizedGainLoss >= 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              }`}
            >
              {fxData.netRealizedGainLoss >= 0 ? '+ PROFIT' : '- LOSS'}
            </span>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              fxData.netRealizedGainLoss >= 0 ? 'text-slate-800 dark:text-emerald-100' : 'text-slate-800 dark:text-rose-100'
            }`}
          >
            {format(fxData.netRealizedGainLoss, baseCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Exchange spread variance vs live rates
          </div>
        </div>

        {/* Active Currencies */}
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              {t('reports.activeCurrencies', 'Active Tender Currencies')}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
              Multi-Tender
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-purple-100 tracking-tight">
            {Object.values(fxData.currencyMap).filter((c) => c.orderCount > 0).length} /{' '}
            {currencies.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Accepted currencies in selected date range
          </div>
        </div>
      </div>

      {/* ── Currency Distribution & Breakdown Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doughnut Chart: Currency Share */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                {t('reports.fxExposureShare', 'Tender Currency Distribution')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Relative share in base currency equivalent</p>
            </div>
          </div>
          <div className="h-60 flex items-center justify-center">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Currency Summary Cards */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-3">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              {t('reports.tabFxAnalytics', 'Currency Performance & Spread Ledger')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Summary of tender amounts, base conversion, and realized gains/losses</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {Object.values(fxData.currencyMap).map((curr) => {
              const isBase = curr.code === baseCode;
              const isGain = curr.realizedGainLoss >= 0;

              return (
                <div
                  key={curr.code}
                  className={`p-3.5 rounded-xl border transition-all ${
                    curr.orderCount > 0
                      ? 'border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                      : 'border-slate-200/60 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-950/20 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs flex items-center justify-center text-slate-800 dark:text-slate-200">
                        {curr.code}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{curr.name}</div>
                        <div className="text-[10px] text-slate-500">{curr.orderCount} transactions</div>
                      </div>
                    </div>

                    {!isBase && curr.orderCount > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isGain
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isGain ? '+' : ''}
                        {format(curr.realizedGainLoss, baseCode)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200 dark:border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Tender Collected</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {curr.totalTenderAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                        {curr.code}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Converted ({baseCode})</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {format(curr.convertedBaseAmount, baseCode)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Multi-Currency Transaction Stream ── */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Foreign Currency Receipt Audit
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Transactions settled in non-base foreign currencies</p>
          </div>

          {/* Currency Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCurrencyFilter}
              onChange={(e) => {
                setSelectedCurrencyFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Foreign Currencies</option>
              {currencies
                .filter((c) => c.code !== baseCode)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.name})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 font-bold">Invoice #</th>
                <th className="py-3 px-3 font-bold">Date & Time</th>
                <th className="py-3 px-3 font-bold">Tender Paid</th>
                <th className="py-3 px-3 font-bold">Method</th>
                <th className="py-3 px-3 font-bold text-right">Settled in {baseCode}</th>
                <th className="py-3 px-4 font-bold text-right">FX Gain / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    No foreign currency transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isGain = tx.fxVariance >= 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Invoice */}
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {tx.invoiceNo}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>

                      {/* Tender Paid */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {tx.tenderAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">{tx.tenderCurrency}</span>
                      </td>

                      {/* Method */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          {getMethodIcon(tx.paymentMethod)}
                          <span className="capitalize font-medium">{tx.paymentMethod.toLowerCase()}</span>
                        </div>
                      </td>

                      {/* Settled in Base */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {format(tx.recordedBaseAmount, baseCode)}
                      </td>

                      {/* FX Variance */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isGain
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isGain ? '+' : ''}
                          {format(tx.fxVariance, baseCode)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, filteredTransactions.length)} of{' '}
            {filteredTransactions.length} items
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-800 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
