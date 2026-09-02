import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { Truck, Layers, CheckCircle2, Ban } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const chartFontFamily = "'Noto Sans Lao', 'Noto Sans Thai', 'Inter', 'Noto Serif JP', 'Noto Serif SC', system-ui, -apple-system, sans-serif";
ChartJS.defaults.font.family = chartFontFamily;

interface CodAnalyticsChartsProps {
  codSales: any[];
  selectedStage: string;
  onSelectStage: (stage: string) => void;
}

export const CodAnalyticsCharts: React.FC<CodAnalyticsChartsProps> = ({
  codSales,
  selectedStage,
  onSelectStage,
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency } = useCurrencyStore();

  // ── 1. Courier Performance Matrix (Settled vs Refused per Courier) ──
  const courierData = useMemo(() => {
    const map: Record<string, { settled: number; refused: number; pending: number }> = {};

    codSales.forEach((s) => {
      const courier = !s.courierName || s.courierName === 'In-House / Custom'
        ? t('reports.inHouseCourierCustom', 'In-House / Custom')
        : s.courierName;
      if (!map[courier]) map[courier] = { settled: 0, refused: 0, pending: 0 };

      if (s.paymentStatus === 'PAID' || s.fulfillmentStatus === 'DELIVERED') {
        map[courier].settled += 1;
      } else if (s.fulfillmentStatus === 'CANCELLED' || s.pipelineStage === 'REJECTED') {
        map[courier].refused += 1;
      } else {
        map[courier].pending += 1;
      }
    });

    const labels = Object.keys(map);
    const settledCounts = labels.map((k) => map[k].settled);
    const refusedCounts = labels.map((k) => map[k].refused);
    const pendingCounts = labels.map((k) => map[k].pending);

    return { labels, settledCounts, refusedCounts, pendingCounts };
  }, [codSales, t]);

  // ── 2. COD Pipeline Stage Distribution ──
  const stageData = useMemo(() => {
    const stageMap: Record<string, { count: number; color: string; label: string }> = {
      NEW: { count: 0, color: '#38bdf8', label: t('reports.stageNewQueued', 'New / Queued') },
      PRINT_BILL: { count: 0, color: '#818cf8', label: t('reports.stageBillPrinted', 'Bill Printed') },
      EXPRESS_ASSIGNED: { count: 0, color: '#fbbf24', label: t('reports.stageExpressAssigned', 'Express Assigned') },
      OUT_FOR_DELIVERY: { count: 0, color: '#f97316', label: t('reports.stageOutForDelivery', 'Out for Delivery') },
      COMPLETED: { count: 0, color: '#10b981', label: t('reports.stageDeliveredSettled', 'Delivered & Settled') },
      REJECTED: { count: 0, color: '#f43f5e', label: t('reports.stageRefusedReturned', 'Refused & Returned') },
    };

    codSales.forEach((s) => {
      let st = (s.pipelineStage || 'NEW').toUpperCase();
      if (s.fulfillmentStatus === 'DELIVERED' || s.paymentStatus === 'PAID') st = 'COMPLETED';
      if (s.fulfillmentStatus === 'CANCELLED') st = 'REJECTED';

      if (stageMap[st]) {
        stageMap[st].count += 1;
      } else {
        stageMap['NEW'].count += 1;
      }
    });

    const activeStages = Object.entries(stageMap).filter(([, d]) => d.count > 0);
    const labels = activeStages.map(([, d]) => d.label);
    const values = activeStages.map(([, d]) => d.count);
    const bgColors = activeStages.map(([, d]) => d.color);
    const rawKeys = activeStages.map(([k]) => k);

    return { labels, values, bgColors, rawKeys };
  }, [codSales, t]);

  // Grouped Bar Chart Config
  const barChartData = {
    labels: courierData.labels.length > 0 ? courierData.labels : [t('reports.noCouriers', 'No Couriers')],
    datasets: [
      {
        label: t('reports.chartDeliveredPaid', 'Delivered & Paid'),
        data: courierData.settledCounts.length > 0 ? courierData.settledCounts : [0],
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
      {
        label: t('reports.chartInTransit', 'In Transit'),
        data: courierData.pendingCounts.length > 0 ? courierData.pendingCounts : [0],
        backgroundColor: '#fbbf24',
        borderRadius: 6,
      },
      {
        label: t('reports.chartRefusedReturn', 'Refused / Return'),
        data: courierData.refusedCounts.length > 0 ? courierData.refusedCounts : [0],
        backgroundColor: '#f43f5e',
        borderRadius: 6,
      },
    ],
  };

  const barChartOptions = {
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
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' as const, family: chartFontFamily } },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' as const, family: chartFontFamily }, stepSize: 1 },
      },
    },
  };

  // Donut Chart Config
  const doughnutData = {
    labels: stageData.labels.length > 0 ? stageData.labels : [t('reports.noActiveOrders', 'No Active Orders')],
    datasets: [
      {
        data: stageData.values.length > 0 ? stageData.values : [1],
        backgroundColor:
          stageData.bgColors.length > 0 ? stageData.bgColors : ['rgba(148, 163, 184, 0.2)'],
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
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Left 2 Cols: Courier Delivery Success vs Return Bar Chart ── */}
      <div className="lg:col-span-2 p-6 neu-card-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex items-center gap-3 font-black text-sm text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="leading-tight font-black">{t('reports.courierPerformance', 'Courier Delivery Performance')}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('reports.courierPerformanceDesc', 'Delivered vs In-Transit vs Refusal orders by shipping carrier')}
              </div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full neu-pill flex items-center gap-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{codSales.length} {t('reports.chartCodDeliveries', 'COD Deliveries')}</span>
          </div>
        </div>

        <div className="h-60 w-full pt-2">
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* ── Right Col: COD Pipeline Stage Funnel Donut ── */}
      <div className="p-6 neu-card-lg flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex items-center gap-3 font-black text-sm text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-sky-500 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="leading-tight font-black">{t('reports.codPipelineStage', 'COD Pipeline Stage Funnel')}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('reports.codPipelineStageDesc', 'Delivery status & fulfilment breakdown')}
              </div>
            </div>
          </div>
        </div>

        <div className="h-44 w-full relative flex items-center justify-center my-auto">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-black text-slate-400">{t('reports.chartTotalCod', 'Total COD')}</span>
            <span className="text-sm font-black text-amber-500 flex items-center justify-center gap-1">
              <span className="font-mono">{codSales.length}</span>
              <span>{t('reports.unitOrders', 'Orders')}</span>
            </span>
          </div>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 border-t border-slate-200/40 dark:border-slate-800 max-h-24 overflow-y-auto">
          {stageData.labels.map((lbl, idx) => (
            <button
              key={lbl}
              onClick={() => onSelectStage(stageData.rawKeys[idx] === selectedStage ? 'ALL' : stageData.rawKeys[idx])}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedStage === stageData.rawKeys[idx]
                  ? 'neu-tab-active text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                  : 'neu-pill text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: stageData.bgColors[idx] }}
              />
              <span className="truncate max-w-[100px]">{lbl}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
