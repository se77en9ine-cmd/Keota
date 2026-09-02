import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { TrendingUp, PieChart, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartFontFamily = "'Noto Sans Lao', 'Noto Sans Thai', 'Inter', 'Noto Serif JP', 'Noto Serif SC', system-ui, -apple-system, sans-serif";
ChartJS.defaults.font.family = chartFontFamily;


interface FinancialPnlChartsProps {
  filteredSales: any[];
  filteredExpenses: any[];
  filteredIncomes: any[];
  deliveryFreightLosses: number;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const FinancialPnlCharts: React.FC<FinancialPnlChartsProps> = ({
  filteredSales,
  filteredExpenses,
  filteredIncomes,
  deliveryFreightLosses,
  selectedCategory,
  onSelectCategory,
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  // ── 1. Timeline Comparison (Income vs Expense vs Net Profit) ──
  const timelineComparison = useMemo(() => {
    const datesMap: Record<string, { rawDate: string; label: string; income: number; expense: number }> = {};

    // Group sales into income and COGS
    filteredSales.forEach((s) => {
      if (s.paymentStatus === 'PAID' && s.createdAt) {
        const rawDate = s.createdAt.slice(0, 10);
        const label = new Date(s.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        if (!datesMap[rawDate]) datesMap[rawDate] = { rawDate, label, income: 0, expense: 0 };
        datesMap[rawDate].income += s.totalAmount || 0;
        datesMap[rawDate].expense += s.totalCost || 0; // Include COGS wholesale costs
      }
    });

    // Group misc incomes
    filteredIncomes.forEach((inc) => {
      if (inc.createdAt) {
        const rawDate = inc.createdAt.slice(0, 10);
        const label = new Date(inc.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        if (!datesMap[rawDate]) datesMap[rawDate] = { rawDate, label, income: 0, expense: 0 };
        datesMap[rawDate].income += inc.amount || 0;
      }
    });

    // Group store expenses
    filteredExpenses.forEach((exp) => {
      const expDateStr = exp.createdAt || exp.expenseDate || '';
      if (expDateStr) {
        const rawDate = expDateStr.slice(0, 10);
        const label = new Date(expDateStr).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        if (!datesMap[rawDate]) datesMap[rawDate] = { rawDate, label, income: 0, expense: 0 };
        datesMap[rawDate].expense += exp.amount || 0;
      }
    });

    // Sort chronologically ascending (oldest to newest, left to right)
    const sortedKeys = Object.keys(datesMap).sort((a, b) => a.localeCompare(b));

    const labels = sortedKeys.map((k) => datesMap[k].label);
    const incomes = sortedKeys.map((k) => datesMap[k].income);
    const expenses = sortedKeys.map((k) => datesMap[k].expense);
    const profits = sortedKeys.map((k) => datesMap[k].income - datesMap[k].expense);

    return { labels, incomes, expenses, profits };
  }, [filteredSales, filteredExpenses, filteredIncomes]);

  // ── 2. Expense Category Breakdown for Donut Chart ──
  const expenseCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {};

    // Cost of Goods Sold (COGS from PO unit costs)
    const totalCogs = filteredSales.reduce((sum, s) => sum + (s.paymentStatus === 'PAID' ? (s.totalCost || 0) : 0), 0);
    if (totalCogs > 0) {
      catMap['COGS'] = totalCogs;
    }

    // Recorded expenses
    filteredExpenses.forEach((exp) => {
      const cat = (exp.category || 'OPERATIONS').toUpperCase();
      catMap[cat] = (catMap[cat] || 0) + (exp.amount || 0);
    });

    // Freight loss category
    if (deliveryFreightLosses > 0) {
      catMap['FREIGHT_LOSS'] = (catMap['FREIGHT_LOSS'] || 0) + deliveryFreightLosses;
    }

    const rawKeys = Object.keys(catMap);
    const labels = rawKeys.map((cat) => String(t(`expenseCategory.${cat}`, cat)));
    const values = Object.values(catMap);

    const colors = [
      '#f43f5e', // rose
      '#f97316', // orange
      '#fbbf24', // amber
      '#a855f7', // purple
      '#06b6d4', // cyan
      '#64748b', // slate
    ];

    return { labels, rawKeys, values, colors };
  }, [filteredExpenses, deliveryFreightLosses, t]);

  // Mixed Bar + Line Chart Config
  const chartData = {
    labels: timelineComparison.labels.length > 0 ? timelineComparison.labels : [t('common.noData', 'No Data')],
    datasets: [
      {
        type: 'bar' as const,
        label: t('reports.grossIncomes', 'Gross Incomes'),
        data: timelineComparison.incomes.length > 0 ? timelineComparison.incomes : [0],
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'bar' as const,
        label: t('reports.totalExpenses', 'Total Expenses'),
        data: timelineComparison.expenses.length > 0 ? timelineComparison.expenses : [0],
        backgroundColor: 'rgba(244, 63, 94, 0.75)',
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'line' as const,
        label: t('reports.netProfit', 'Net Profit Trend'),
        data: timelineComparison.profits.length > 0 ? timelineComparison.profits : [0],
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#a855f7',
        borderWidth: 2,
        order: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11, weight: 'bold' as const, family: chartFontFamily },
          usePointStyle: true,
          boxWidth: 6,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        titleFont: { family: chartFontFamily },
        bodyFont: { family: chartFontFamily },
        callbacks: {
          label: (context: any) => {
            return ` ${context.dataset.label}: ${format(convert(context.raw, baseCode, currentCurrency), currentCurrency)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' as const, family: chartFontFamily } },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const, family: chartFontFamily },
          callback: (value: any) => format(convert(value, baseCode, currentCurrency), currentCurrency).split(' ')[0],
        },
      },
    },
  };

  // Donut Chart Config
  const doughnutData = {
    labels: expenseCategoryData.labels.length > 0 ? expenseCategoryData.labels : [t('reports.noExpenses', 'No Expenses')],
    datasets: [
      {
        data: expenseCategoryData.values.length > 0 ? expenseCategoryData.values : [1],
        backgroundColor:
          expenseCategoryData.colors.length > 0
            ? expenseCategoryData.colors
            : ['rgba(148, 163, 184, 0.2)'],
        borderWidth: 0,
        borderRadius: 6,
        spacing: 3,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        titleFont: { family: chartFontFamily },
        bodyFont: { family: chartFontFamily },
        callbacks: {
          label: (context: any) => {
            const rawVal = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = total > 0 ? ((rawVal / total) * 100).toFixed(1) : '0';
            return ` ${context.label}: ${format(convert(rawVal, baseCode, currentCurrency), currentCurrency)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Left 2 Cols: Income vs Expense vs Net Profit Trend ── */}
      <div className="lg:col-span-2 p-6 neu-card-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex items-center gap-3 font-black text-sm text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-purple-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="leading-tight font-black">{t('reports.pnlTimeline', 'Income vs Expense vs Net Profit')}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('reports.pnlTimelineDesc', 'Daily cash inflow and outflow performance analysis')}
              </div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full neu-pill flex items-center gap-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span>{timelineComparison.labels.length} {t('reports.daysActive', 'Days Active')}</span>
          </div>
        </div>

        <div className="h-60 w-full pt-2">
          <Chart type="bar" data={chartData} options={chartOptions as any} />
        </div>
      </div>

      {/* ── Right Col: Expense Breakdown Donut ── */}
      <div className="p-6 neu-card-lg flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex items-center gap-3 font-black text-sm text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center flex-shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="leading-tight font-black">{t('reports.expenseShare', 'Expense Category Distribution')}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('reports.expenseShareDesc', 'Cost centers & Freight loss split')}
              </div>
            </div>
          </div>
        </div>

        <div className="h-44 w-full relative flex items-center justify-center my-auto">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-black text-slate-400">{t('reports.totalOutflow', 'TOTAL OUTFLOW')}</span>
            <span className="text-xs font-mono font-black text-rose-500">
              {format(
                convert(
                  expenseCategoryData.values.reduce((a, b) => a + b, 0),
                  baseCode,
                  currentCurrency
                ),
                currentCurrency
              )}
            </span>
          </div>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 border-t border-slate-200/40 dark:border-slate-800 max-h-24 overflow-y-auto">
          {expenseCategoryData.labels.map((lbl, idx) => {
            const rawCat = expenseCategoryData.rawKeys[idx];
            return (
              <button
                key={rawCat}
                onClick={() => onSelectCategory(rawCat === selectedCategory ? 'ALL' : rawCat)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCategory === rawCat
                    ? 'neu-tab-active text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                    : 'neu-pill text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: expenseCategoryData.colors[idx] }}
                />
                <span className="truncate max-w-[100px]">{lbl}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
