import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  TrendingUp,
  Zap,
  ShoppingBag,
  Flame,
  Moon,
  Sun,
  Coffee,
  Utensils,
  BarChart3,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HourlyHeatmapReportProps {
  sales: any[];
  filteredSales: any[];
}

export const HourlyHeatmapReport: React.FC<HourlyHeatmapReportProps> = ({
  sales,
  filteredSales,
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useSettingsStore();
  const isDark = theme === 'dark';
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [hoveredCell, setHoveredCell] = useState<{
    dayIndex: number;
    hour: number;
    revenue: number;
    count: number;
    avgTicket: number;
  } | null>(null);

  const [selectedDaypart, setSelectedDaypart] = useState<string>('ALL');

  const DAYS = useMemo(() => {
    return [
      t('common.sun', 'Sun'),
      t('common.mon', 'Mon'),
      t('common.tue', 'Tue'),
      t('common.wed', 'Wed'),
      t('common.thu', 'Thu'),
      t('common.fri', 'Fri'),
      t('common.sat', 'Sat'),
    ];
  }, [t]);

  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // ── 1. Calculate 7x24 Matrix ──
  const matrixData = useMemo(() => {
    // 7 rows (days 0-6), 24 cols (hours 0-23)
    const grid: { revenue: number; count: number }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ revenue: 0, count: 0 }))
    );

    const hourlyTotals: { revenue: number; count: number }[] = Array.from({ length: 24 }, () => ({
      revenue: 0,
      count: 0,
    }));

    const dayTotals: { revenue: number; count: number }[] = Array.from({ length: 7 }, () => ({
      revenue: 0,
      count: 0,
    }));

    let maxCellRevenue = 0;
    let totalFilteredRev = 0;
    let totalFilteredCount = 0;

    filteredSales.forEach((sale) => {
      if (!sale.createdAt) return;
      const date = new Date(sale.createdAt);
      const day = date.getDay(); // 0 = Sun ... 6 = Sat
      const hour = date.getHours(); // 0 - 23
      const amount = Number(sale.totalAmount) || 0;

      grid[day][hour].revenue += amount;
      grid[day][hour].count += 1;

      hourlyTotals[hour].revenue += amount;
      hourlyTotals[hour].count += 1;

      dayTotals[day].revenue += amount;
      dayTotals[day].count += 1;

      totalFilteredRev += amount;
      totalFilteredCount += 1;

      if (grid[day][hour].revenue > maxCellRevenue) {
        maxCellRevenue = grid[day][hour].revenue;
      }
    });

    // Determine Peak Rush Hour (highest hourly revenue)
    let peakHour = 12;
    let peakHourRev = 0;
    let peakHourCount = 0;
    hourlyTotals.forEach((h, idx) => {
      if (h.revenue > peakHourRev) {
        peakHourRev = h.revenue;
        peakHour = idx;
        peakHourCount = h.count;
      }
    });

    // Determine Busiest Day
    let busiestDayIdx = 0;
    let busiestDayRev = 0;
    dayTotals.forEach((d, idx) => {
      if (d.revenue > busiestDayRev) {
        busiestDayRev = d.revenue;
        busiestDayIdx = idx;
      }
    });

    // Daypart Aggregations
    const dayparts = {
      MORNING: { label: t('reports.morningRush', 'Morning (06:00 - 10:59)'), rev: 0, count: 0, icon: Coffee },
      LUNCH: { label: t('reports.lunchRush', 'Lunch Rush (11:00 - 13:59)'), rev: 0, count: 0, icon: Utensils },
      AFTERNOON: { label: t('reports.afternoonPace', 'Afternoon (14:00 - 16:59)'), rev: 0, count: 0, icon: Sun },
      DINNER: { label: t('reports.dinnerRush', 'Dinner Rush (17:00 - 20:59)'), rev: 0, count: 0, icon: Flame },
      NIGHT: { label: t('reports.lateNight', 'Late Night (21:00 - 05:59)'), rev: 0, count: 0, icon: Moon },
    };

    HOURS.forEach((h) => {
      const rev = hourlyTotals[h].revenue;
      const count = hourlyTotals[h].count;
      if (h >= 6 && h <= 10) {
        dayparts.MORNING.rev += rev;
        dayparts.MORNING.count += count;
      } else if (h >= 11 && h <= 13) {
        dayparts.LUNCH.rev += rev;
        dayparts.LUNCH.count += count;
      } else if (h >= 14 && h <= 16) {
        dayparts.AFTERNOON.rev += rev;
        dayparts.AFTERNOON.count += count;
      } else if (h >= 17 && h <= 20) {
        dayparts.DINNER.rev += rev;
        dayparts.DINNER.count += count;
      } else {
        dayparts.NIGHT.rev += rev;
        dayparts.NIGHT.count += count;
      }
    });

    return {
      grid,
      hourlyTotals,
      dayTotals,
      maxCellRevenue: maxCellRevenue || 1,
      totalFilteredRev,
      totalFilteredCount,
      peakHour,
      peakHourRev,
      peakHourCount,
      busiestDayIdx,
      busiestDayRev,
      dayparts,
    };
  }, [filteredSales, t, HOURS]);

  // ── 2. Chart.js Config: 24-Hour Velocity Curve ──
  const hourlyChartData = useMemo(() => {
    const labels = HOURS.map((h) => `${h.toString().padStart(2, '0')}:00`);
    const revenues = matrixData.hourlyTotals.map((h) => convert(h.revenue, baseCode, currentCurrency));
    const orders = matrixData.hourlyTotals.map((h) => h.count);

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: `${t('reports.revenue', 'Revenue')} (${currentCurrency})`,
          data: revenues,
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.65)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6,
          yAxisID: 'yRev',
          order: 2,
        },
        {
          type: 'line' as const,
          label: t('reports.orderCount', 'Orders'),
          data: orders,
          borderColor: '#06b6d4',
          backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.25)',
          borderWidth: 2.5,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#ffffff',
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          yAxisID: 'yOrders',
          order: 1,
        },
      ],
    };
  }, [matrixData.hourlyTotals, convert, baseCode, currentCurrency, t, HOURS, isDark]);

  const chartOptions: any = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
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
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: (context: any) => {
              if (context.dataset.yAxisID === 'yRev') {
                return `${context.dataset.label}: ${format(context.parsed.y, currentCurrency)}`;
              }
              return `${context.dataset.label}: ${context.parsed.y} orders`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
          ticks: { color: isDark ? '#64748b' : '#64748b', font: { size: 10 } },
        },
        yRev: {
          type: 'linear',
          position: 'left',
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
          ticks: {
            color: isDark ? '#10b981' : '#059669',
            font: { size: 10, weight: '600' },
            callback: (val: any) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return val;
            },
          },
        },
        yOrders: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: isDark ? '#06b6d4' : '#0891b2', font: { size: 10, weight: '600' } },
        },
      },
    }),
    [isDark, currentCurrency, format]
  );

  // Helper for Heatmap Cell Color
  const getCellBg = (rev: number) => {
    if (rev <= 0) return isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    const ratio = Math.min(1, Math.max(0.14, rev / matrixData.maxCellRevenue));
    return isDark
      ? `rgba(16, 185, 129, ${ratio * 0.9 + 0.1})`
      : `rgba(16, 185, 129, ${ratio * 0.85 + 0.15})`;
  };

  return (
    <div className="space-y-6">
      {/* ── Top Executive KPI Ribbon ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peak Rush Hour */}
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-500 dark:text-emerald-400 animate-pulse" />
              {t('reports.peakRushHour', 'Peak Rush Hour')}
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              {matrixData.peakHour.toString().padStart(2, '0')}:00 - {(matrixData.peakHour + 1).toString().padStart(2, '0')}:00
            </span>
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {format(matrixData.peakHourRev, baseCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-slate-400" />
            <span>{matrixData.peakHourCount} {t('reports.unitOrders', 'Orders handled')}</span>
          </div>
        </div>

        {/* Busiest Day */}
        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              {t('reports.busiestDay', 'Busiest Day')}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
              {DAYS[matrixData.busiestDayIdx]}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {format(matrixData.busiestDayRev, baseCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
            <span>{matrixData.dayTotals[matrixData.busiestDayIdx]?.count || 0} {t('reports.unitOrders', 'Orders')}</span>
          </div>
        </div>

        {/* Average Hourly Run-Rate */}
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              {t('reports.avgHourlyRevenue', 'Avg Hourly Revenue')}
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
              24h Span
            </span>
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {format(matrixData.totalFilteredRev / 24, baseCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>{((matrixData.totalFilteredCount || 0) / 24).toFixed(1)} {t('reports.orderVelocity', 'Orders/hr')}</span>
          </div>
        </div>

        {/* Average Basket Size */}
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              {t('reports.avgTicketSize', 'Average Ticket Size')}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
              Per Order
            </span>
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {format(matrixData.totalFilteredCount > 0 ? matrixData.totalFilteredRev / matrixData.totalFilteredCount : 0, baseCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {t('reports.totalSettledReceipts', 'Total settled customer receipts ({{count}} orders)', { count: matrixData.totalFilteredCount })}
          </div>
        </div>
      </div>

      {/* ── 5 Dayparts Strategic Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(matrixData.dayparts).map(([key, dp]) => {
          const IconComponent = dp.icon;
          const share = matrixData.totalFilteredRev > 0 ? ((dp.rev / matrixData.totalFilteredRev) * 100).toFixed(1) : '0';
          return (
            <div
              key={key}
              className="glass-panel p-3 rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{dp.label.split('(')[0]}</span>
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{format(dp.rev, baseCode)}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                <span>{dp.count} {t('reports.unitOrders', 'orders')}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{share}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 7x24 Interactive Heatmap Matrix Grid ── */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t('reports.tabHourlyHeatmap', '7-Day × 24-Hour Sales Intensity Heatmap')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('reports.hourlyHeatmapDesc', 'Color depth correlates with revenue velocity during each hour')}
            </p>
          </div>

          {/* Intensity Legend */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('reports.quietPeriod', 'Quiet')}</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/20" />
              <span className="w-3 h-3 rounded bg-emerald-500/30" />
              <span className="w-3 h-3 rounded bg-emerald-500/60" />
              <span className="w-3 h-3 rounded bg-emerald-500/90" />
            </div>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t('reports.rushPeriod', 'Peak Rush')}</span>
          </div>
        </div>

        {/* Heatmap Grid Wrapper */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[850px]">
            {/* Header: 24 Hours */}
            <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 mb-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 text-center">
              <div className="text-left pl-1 font-bold">{t('reports.dayOfWeek', 'DAY')}</div>
              {HOURS.map((h) => (
                <div key={h} className="py-1 select-none">
                  {h.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Matrix Rows: 7 Days */}
            {DAYS.map((dayName, dayIdx) => (
              <div
                key={dayIdx}
                className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 mb-1 items-center"
              >
                {/* Day Label */}
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 pl-1 select-none flex items-center justify-between pr-2">
                  <span>{dayName}</span>
                </div>

                {/* 24 Hourly Cells */}
                {HOURS.map((hour) => {
                  const cell = matrixData.grid[dayIdx][hour];
                  const hasData = cell.revenue > 0;
                  const isPeak = hasData && cell.revenue === matrixData.maxCellRevenue;

                  return (
                    <div
                      key={hour}
                      style={{ backgroundColor: getCellBg(cell.revenue) }}
                      onMouseEnter={() =>
                        setHoveredCell({
                          dayIndex: dayIdx,
                          hour,
                          revenue: cell.revenue,
                          count: cell.count,
                          avgTicket: cell.count > 0 ? cell.revenue / cell.count : 0,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-9 rounded-md transition-all duration-150 relative cursor-pointer flex items-center justify-center border ${
                        isPeak
                          ? 'border-amber-500 ring-2 ring-amber-400/50'
                          : hasData
                          ? 'border-emerald-500/25 hover:border-emerald-400 hover:scale-105 shadow-sm'
                          : 'border-slate-200/60 dark:border-white/5 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {hasData && cell.count > 0 && (
                        <span className="text-[9px] font-mono font-bold text-slate-900 dark:text-slate-100 select-none">
                          {cell.count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Hovered Cell Live Inspector */}
        <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          {hoveredCell ? (
            <div className="flex flex-wrap items-center gap-4 text-slate-700 dark:text-slate-200">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {DAYS[hoveredCell.dayIndex]} @ {hoveredCell.hour.toString().padStart(2, '0')}:00 -{' '}
                {(hoveredCell.hour + 1).toString().padStart(2, '0')}:00
              </span>
              <span>
                {t('reports.revenue', 'Revenue')}:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{format(hoveredCell.revenue, baseCode)}</strong>
              </span>
              <span>
                {t('reports.orderCount', 'Orders')}:{' '}
                <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{hoveredCell.count}</strong>
              </span>
              <span>
                {t('reports.avgTicketSize', 'Avg Ticket')}:{' '}
                <strong className="text-amber-600 dark:text-amber-400 font-mono">{format(hoveredCell.avgTicket, baseCode)}</strong>
              </span>
            </div>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 italic">
              <Info className="w-3.5 h-3.5" />
              Hover over any cell above to inspect localized volume, order count, and ticket average.
            </span>
          )}
        </div>
      </div>

      {/* ── 24-Hour Velocity & Ticket Volume Chart ── */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/60 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              {t('reports.revenueVelocity', '24-Hour Aggregate Revenue & Order Frequency')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('reports.revenueVelocityDesc', 'Dual-axis comparison of hourly revenue vs order dispatch volume')}
            </p>
          </div>
        </div>

        <div className="h-64">
          <Chart type="bar" data={hourlyChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};
