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
import { Line, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { TrendingUp, PieChart, Activity, Layers } from 'lucide-react';

// Register Chart.js components
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

const chartFontFamily = "'Noto Sans Lao Looped', 'Noto Sans Lao', 'Noto Sans Thai', 'Inter', 'Noto Serif JP', 'Noto Serif SC', system-ui, -apple-system, sans-serif";
ChartJS.defaults.font.family = chartFontFamily;


interface ReportsChartSectionProps {
  sales: any[];
  filteredSales: any[];
  allReportingChannels: Array<{
    id: string;
    code: string;
    label: string;
    icon?: string;
    color?: string;
  }>;
  selectedChannel: string;
  onSelectChannel: (channelCode: string) => void;
}

export const ReportsChartSection: React.FC<ReportsChartSectionProps> = ({
  sales,
  filteredSales,
  allReportingChannels,
  selectedChannel,
  onSelectChannel,
}) => {
  const { t } = useTranslation();
  const { theme } = useSettingsStore();
  const isDark = theme === 'dark';
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  // ── 1. Group Sales by Date for Timeline Velocity Chart ──
  const timelineData = useMemo(() => {
    const dateMap: Record<string, { label: string; revenue: number; count: number }> = {};

    filteredSales.forEach((sale) => {
      if (!sale.createdAt) return;
      const rawDate = sale.createdAt.slice(0, 10);
      const label = new Date(sale.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      if (!dateMap[rawDate]) {
        dateMap[rawDate] = { label, revenue: 0, count: 0 };
      }
      dateMap[rawDate].revenue += sale.totalAmount || 0;
      dateMap[rawDate].count += 1;
    });

    const sortedKeys = Object.keys(dateMap).sort((a, b) => a.localeCompare(b));
    const labels = sortedKeys.map((k) => dateMap[k].label);
    const revenues = sortedKeys.map((k) => dateMap[k].revenue);
    const counts = sortedKeys.map((k) => dateMap[k].count);

    return { labels, revenues, counts };
  }, [filteredSales]);

  // ── 2. Omnichannel Distribution for Donut Chart ──
  const donutData = useMemo(() => {
    const channelStats: Record<string, { label: string; count: number; revenue: number; color: string }> = {};

    const colorPalette = [
      '#10b981', // emerald
      '#06b6d4', // cyan
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#3b82f6', // blue
      '#14b8a6', // teal
      '#f97316', // orange
    ];

    allReportingChannels.forEach((chan, idx) => {
      channelStats[chan.code] = {
        label: chan.label,
        count: 0,
        revenue: 0,
        color: chan.color && chan.color.startsWith('#') ? chan.color : colorPalette[idx % colorPalette.length],
      };
    });

    filteredSales.forEach((sale) => {
      const chCode = (sale.channel || 'POS_MR').toUpperCase();
      if (!channelStats[chCode]) {
        channelStats[chCode] = {
          label: chCode,
          count: 0,
          revenue: 0,
          color: colorPalette[Object.keys(channelStats).length % colorPalette.length],
        };
      }
      channelStats[chCode].count += 1;
      channelStats[chCode].revenue += sale.totalAmount || 0;
    });

    const activeChannels = Object.entries(channelStats).filter(([, stat]) => stat.revenue > 0);
    const labels = activeChannels.map(([, stat]) => stat.label);
    const revenues = activeChannels.map(([, stat]) => stat.revenue);
    const counts = activeChannels.map(([, stat]) => stat.count);
    const bgColors = activeChannels.map(([, stat]) => stat.color);

    return { labels, revenues, counts, bgColors, rawCodes: activeChannels.map(([code]) => code) };
  }, [filteredSales, allReportingChannels, selectedChannel]);

  // Line Chart Config
  const lineChartData = {
    labels: timelineData.labels.length > 0 ? timelineData.labels : ['No Data'],
    datasets: [
      {
        type: 'line' as const,
        label: t('reports.revenue', 'Revenue'),
        data: timelineData.revenues.length > 0 ? timelineData.revenues : [0],
        borderColor: '#10b981',
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: t('reports.orderCount', 'Orders'),
        data: timelineData.counts.length > 0 ? timelineData.counts : [0],
        borderColor: isDark ? '#38bdf8' : '#0284c7',
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.2,
        pointRadius: 3,
        pointBackgroundColor: isDark ? '#38bdf8' : '#0284c7',
        yAxisID: 'y1',
      },
    ],
  };

  const lineChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: isDark ? '#94a3b8' : '#475569',
            font: { size: 11, weight: 'bold' as const },
            usePointStyle: true,
            boxWidth: 6,
          },
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#e2e8f0' : '#334155',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: (context: any) => {
              if (context.dataset.label === t('reports.revenue', 'Revenue')) {
                return ` Revenue: ${format(convert(context.parsed.y, baseCode, currentCurrency), currentCurrency)}`;
              }
              return ` Orders: ${context.parsed.y} orders`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
          ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 10, weight: 'bold' as const } },
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
          ticks: {
            color: '#10b981',
            font: { size: 10, weight: 'bold' as const },
            callback: (value: any) => format(convert(value, baseCode, currentCurrency), currentCurrency).split(' ')[0],
          },
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: { drawOnChartArea: false },
          ticks: { color: isDark ? '#38bdf8' : '#0284c7', font: { size: 10, weight: 'bold' as const }, stepSize: 1 },
        },
      },
    }),
    [isDark, format, convert, baseCode, currentCurrency, t]
  );

  // Donut Chart Config
  const doughnutData = {
    labels: donutData.labels.length > 0 ? donutData.labels : ['No Channel Sales'],
    datasets: [
      {
        data: donutData.revenues.length > 0 ? donutData.revenues : [1],
        backgroundColor:
          donutData.bgColors.length > 0 ? donutData.bgColors : ['rgba(148, 163, 184, 0.2)'],
        borderWidth: 0,
        borderRadius: 6,
        spacing: 3,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#e2e8f0' : '#334155',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
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
    }),
    [isDark, format, convert, baseCode, currentCurrency]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Left 2 Cols: Timeline Revenue Velocity ── */}
      <div className="lg:col-span-2 p-6 neu-card-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex items-center gap-3 font-black text-sm text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="leading-tight font-black">{t('reports.revenueVelocity', 'Sales Velocity & Volume Trend')}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('reports.revenueVelocityDesc', 'Daily revenue curve overlaid with order volume')}
              </div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full neu-pill flex items-center gap-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{filteredSales.length} {t('reports.transactions', 'Transactions')}</span>
          </div>
        </div>

        <div className="h-60 w-full pt-2">
          <Line data={lineChartData as any} options={lineChartOptions as any} />
        </div>
      </div>

      {/* ── Right Col: Channel Share Donut Matrix ── */}
      <div className="p-6 neu-card-lg flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex items-center gap-3 font-black text-sm text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-purple-500 flex items-center justify-center flex-shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="leading-tight font-black">{t('reports.channelShare', 'Omnichannel Revenue Share')}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('reports.channelShareDesc', 'Platform breakdown & origin matrix')}
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl neu-sunken-sm text-slate-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="h-44 w-full relative flex items-center justify-center my-auto">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-black text-slate-400">{t('reports.totalFiltered', 'TOTAL FILTERED')}</span>
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
              {format(
                convert(
                  filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
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
          {donutData.labels.map((label, idx) => (
            <button
              key={label}
              onClick={() => onSelectChannel(donutData.rawCodes[idx])}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedChannel === donutData.rawCodes[idx]
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                  : 'neu-pill text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: donutData.bgColors[idx] }}
              />
              <span className="truncate max-w-[90px]">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
