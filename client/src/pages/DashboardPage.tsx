import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { ALL_CHANNELS } from '../store/useSettingsStore';
import { usePlatformStore } from '../store/usePlatformStore';
import { isChannelMatch } from './ReportsPage';
import { soundFX } from '../utils/audio';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Globe,
  Store,
  RefreshCw,
  Download,
  Printer,
  BarChart3,
  CreditCard,
  QrCode,
  Banknote,
  ChevronRight,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Layers,
  ShoppingBag,
  Zap,
  Award,
  Info,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';

interface PlatformBrandStyle {
  gradient: string;
  glow: string;
  badge: string;
  border: string;
  pillBg: string;
  text: string;
  accentBg: string;
}

const PLATFORM_BRAND_STYLES: Record<string, PlatformBrandStyle> = {
  GF: {
    gradient: 'from-emerald-600 via-emerald-500 to-teal-400',
    glow: 'shadow-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    border: 'border-emerald-500/30',
    pillBg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-500',
  },
  FP: {
    gradient: 'from-pink-600 via-rose-500 to-fuchsia-400',
    glow: 'shadow-pink-500/25',
    badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/40',
    border: 'border-pink-500/30',
    pillBg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    accentBg: 'bg-pink-500',
  },
  SP: {
    gradient: 'from-orange-600 via-amber-500 to-yellow-400',
    glow: 'shadow-orange-500/25',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40',
    border: 'border-orange-500/30',
    pillBg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    accentBg: 'bg-orange-500',
  },
  TT: {
    gradient: 'from-purple-600 via-pink-500 to-cyan-400',
    glow: 'shadow-purple-500/25',
    badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40',
    border: 'border-purple-500/30',
    pillBg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    accentBg: 'bg-purple-500',
  },
  WEB: {
    gradient: 'from-cyan-600 via-teal-500 to-sky-400',
    glow: 'shadow-cyan-500/25',
    badge: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/40',
    border: 'border-cyan-500/30',
    pillBg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    accentBg: 'bg-cyan-500',
  },
  WA: {
    gradient: 'from-teal-600 via-emerald-500 to-green-400',
    glow: 'shadow-teal-500/25',
    badge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/40',
    border: 'border-teal-500/30',
    pillBg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    accentBg: 'bg-teal-500',
  },
  LM: {
    gradient: 'from-emerald-500 via-teal-400 to-cyan-400',
    glow: 'shadow-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    border: 'border-emerald-500/30',
    pillBg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-500',
  },
  PH: {
    gradient: 'from-indigo-600 via-blue-500 to-violet-400',
    glow: 'shadow-indigo-500/25',
    badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/40',
    border: 'border-indigo-500/30',
    pillBg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    accentBg: 'bg-indigo-500',
  },
  POS: {
    gradient: 'from-slate-600 via-slate-500 to-zinc-400',
    glow: 'shadow-slate-500/25',
    badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/40',
    border: 'border-slate-500/30',
    pillBg: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    accentBg: 'bg-slate-500',
  },
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const { platforms, fetchPlatforms } = usePlatformStore();

  const [data, setData] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
  const [channelScope, setChannelScope] = useState<'ALL_TIME' | 'PERIOD'>('ALL_TIME');
  const [chartMode, setChartMode] = useState<'TREND' | 'HOURLY'>('TREND');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const formatMoney = (amount: number | string) => {
    return format(convert(amount, baseCode, currentCurrency), currentCurrency);
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, salesRes] = await Promise.all([
        api.get('/dashboard/analytics'),
        api.get('/pos/recent?limit=200'),
      ]);
      setData(analyticsRes.data);
      setSales(salesRes.data.sales || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchPlatforms();
  }, [fetchPlatforms]);

  // Filter sales based on selected time range
  const filteredSales = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter((s) => {
      const saleTime = new Date(s.createdAt || s.created_at).getTime();
      if (timeRange === 'TODAY') return saleTime >= todayStart;
      if (timeRange === 'YESTERDAY') return saleTime >= yesterdayStart && saleTime < todayStart;
      if (timeRange === 'WEEK') return saleTime >= weekStart;
      if (timeRange === 'MONTH') return saleTime >= monthStart;
      return true; // ALL
    });
  }, [sales, timeRange]);

  // Aggregate metrics based strictly on filtered sales
  const totalRevenue = useMemo(() => {
    if (filteredSales.length > 0) {
      return filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    }
    if (sales.length === 0) return 0;
    return 0;
  }, [filteredSales, sales]);

  const totalInvoices = filteredSales.length;
  const avgOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // Estimated profit (actual revenue - cost)
  const estimatedProfit = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return filteredSales.reduce((sum, s) => {
      const items = s.items || [];
      const cost = items.reduce((cSum: number, item: any) => cSum + ((item.costPrice || 0) * (item.quantity || 0)), 0);
      return sum + Math.max(0, (s.totalAmount || 0) - cost);
    }, 0);
  }, [filteredSales]);

  const profitMarginRate = totalRevenue > 0 ? ((estimatedProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const cogsAmount = Math.max(0, totalRevenue - estimatedProfit);

  // In-Store vs Online Channel Split
  const inStoreSales = filteredSales.filter((s) => !s.channel || s.channel === 'POS');
  const onlineSales = filteredSales.filter((s) => s.channel && s.channel !== 'POS');

  const inStoreRevenue = inStoreSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const onlineRevenue = onlineSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  // Total revenue across ALL sales stream transactions
  const allSalesTotalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  }, [sales]);

  // Channel breakdown dynamically linked from Online Platforms List tab and Sales Transaction Stream!
  const channelBreakdown = useMemo(() => {
    const baseList: any[] = platforms && platforms.length > 0 ? platforms : ALL_CHANNELS.map(c => ({
      id: c.id,
      code: c.id,
      name: c.label,
      icon: c.icon,
      color: 'emerald',
      commissionRate: 0,
      isActive: true,
    }));

    return baseList.map((plt) => {
      // 1. All-time stream sales matching Platform List tab
      const allTimeSalesList = sales.filter((s) => isChannelMatch(s.channel, plt.code || plt.id, s));
      // 2. Period stream sales matching dashboard filter
      const periodSalesList = filteredSales.filter((s) => isChannelMatch(s.channel, plt.code || plt.id, s));

      const activeList = channelScope === 'ALL_TIME' ? allTimeSalesList : periodSalesList;
      const currentScopeTotal = channelScope === 'ALL_TIME' ? allSalesTotalRevenue : totalRevenue;

      const rev = activeList.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const count = activeList.length;
      const share = currentScopeTotal > 0 ? (rev / currentScopeTotal) * 100 : 0;

      const lifetimeRev = allTimeSalesList.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const lifetimeCount = allTimeSalesList.length;

      return {
        id: plt.id,
        code: (plt.code || '').toUpperCase().trim(),
        label: plt.name || plt.label,
        icon: plt.icon || '📦',
        color: plt.color || 'emerald',
        commissionRate: plt.commissionRate ?? 0,
        isActive: plt.isActive !== false,
        count,
        revenue: rev,
        share,
        lifetimeCount,
        lifetimeRev,
      };
    }).sort((a, b) => b.revenue - a.revenue || b.count - a.count || b.lifetimeRev - a.lifetimeRev);
  }, [platforms, sales, filteredSales, channelScope, allSalesTotalRevenue, totalRevenue]);

  // Payment Methods Breakdown (Cash, QR, Card, App)
  const paymentMix = useMemo(() => {
    let cash = 0;
    let qr = 0;
    let card = 0;
    let other = 0;

    filteredSales.forEach((s) => {
      const pm = (s.paymentMethod || s.payment_method || 'CASH').toUpperCase();
      const amt = s.totalAmount || 0;
      if (pm.includes('CASH')) cash += amt;
      else if (pm.includes('QR') || pm.includes('BCEL') || pm.includes('TRANSFER')) qr += amt;
      else if (pm.includes('CARD') || pm.includes('VISA') || pm.includes('MASTER')) card += amt;
      else other += amt;
    });

    const total = cash + qr + card + other || 0;
    return [
      {
        id: 'QR',
        label: t('dashboard.qrPayment', 'QR Pay / Mobile Banking'),
        amount: qr,
        share: total > 0 ? (qr / total) * 100 : 0,
        icon: QrCode,
        color: 'text-brand-500 bg-brand-500/10'
      },
      {
        id: 'CASH',
        label: t('dashboard.cashPayment', 'Cash Drawer'),
        amount: cash,
        share: total > 0 ? (cash / total) * 100 : 0,
        icon: Banknote,
        color: 'text-emerald-500 bg-emerald-500/10'
      },
      {
        id: 'CARD',
        label: t('dashboard.cardPayment', 'Credit / Debit Card'),
        amount: card,
        share: total > 0 ? (card / total) * 100 : 0,
        icon: CreditCard,
        color: 'text-indigo-500 bg-indigo-500/10'
      },
      {
        id: 'APP',
        label: t('dashboard.appPayment', 'Delivery Platform Wallet'),
        amount: other,
        share: total > 0 ? (other / total) * 100 : 0,
        icon: Globe,
        color: 'text-amber-500 bg-amber-500/10'
      },
    ];
  }, [filteredSales, t]);

  // Hourly Peak Heatmap from backend data
  const hourlyData = useMemo(() => {
    if (data?.hourlyChart && data.hourlyChart.length > 0) {
      return data.hourlyChart;
    }
    return [
      { hour: '08:00', sales: 0, orders: 0, peak: false },
      { hour: '10:00', sales: 0, orders: 0, peak: false },
      { hour: '12:00', sales: 0, orders: 0, peak: false },
      { hour: '14:00', sales: 0, orders: 0, peak: false },
      { hour: '16:00', sales: 0, orders: 0, peak: false },
      { hour: '18:00', sales: 0, orders: 0, peak: false },
      { hour: '20:00', sales: 0, orders: 0, peak: false },
      { hour: '22:00', sales: 0, orders: 0, peak: false },
    ];
  }, [data]);

  const maxHourlySales = useMemo(() => {
    return Math.max(...hourlyData.map((h: any) => h.sales || 0), 100);
  }, [hourlyData]);

  // Weekly Trend Chart Data derived from sales and backend data
  const salesChart = useMemo(() => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = daysOfWeek[d.getDay()];

      const daySales = sales.filter((s) => {
        const timeStr = s.createdAt || s.created_at || '';
        return timeStr.startsWith(dateStr);
      });

      const dayRev = daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const dayCost = daySales.reduce((sum, s) => {
        const items = s.items || [];
        return sum + items.reduce((cSum: number, item: any) => cSum + ((item.costPrice || 0) * (item.quantity || 0)), 0);
      }, 0);
      const dayProfit = Math.max(0, dayRev - dayCost);

      result.push({
        day: dayLabel,
        date: dateStr,
        sales: dayRev,
        profit: dayProfit,
        ordersCount: daySales.length,
      });
    }
    return result;
  }, [sales]);

  const maxChartVal = useMemo(() => {
    const maxVal = Math.max(...salesChart.map((s: any) => Math.max(s.sales || 0, s.profit || 0)), 0);
    return maxVal > 0 ? maxVal : 100;
  }, [salesChart]);

  const totalWeeklyRev = useMemo(() => salesChart.reduce((sum: number, item: any) => sum + (item.sales || 0), 0), [salesChart]);
  const totalWeeklyProfit = useMemo(() => salesChart.reduce((sum: number, item: any) => sum + (item.profit || 0), 0), [salesChart]);
  const weeklyProfitMargin = totalWeeklyRev > 0 ? ((totalWeeklyProfit / totalWeeklyRev) * 100).toFixed(1) : '0.0';
  const peakDay = useMemo(() => {
    return salesChart.reduce((prev: any, current: any) => ((current.sales || 0) > (prev.sales || 0) ? current : prev), salesChart[0] || { day: '-', sales: 0 });
  }, [salesChart]);

  // Top 5 Best-Selling Products from backend real data
  const bestSellers: any[] = data?.topSellingProducts || [];

  // Low stock and expiring batch alerts
  const lowStockAlerts: any[] = data?.lowStockAlerts || [];
  const expiringAlerts: any[] = data?.expiringAlerts || [];

  // Export to CSV Function
  const handleExportCSV = () => {
    soundFX.playCashSuccess();
    const csvRows = [
      ['Metric', 'Value', 'Currency'],
      ['Time Range', timeRange, ''],
      ['Total Revenue', totalRevenue.toFixed(2), currentCurrency],
      ['In-Store Revenue', inStoreRevenue.toFixed(2), currentCurrency],
      ['Online Revenue', onlineRevenue.toFixed(2), currentCurrency],
      ['Estimated Net Profit', estimatedProfit.toFixed(2), currentCurrency],
      ['Average Order Value (AOV)', avgOrderValue.toFixed(2), currentCurrency],
      ['Total Invoices Count', totalInvoices.toString(), ''],
      [''],
      ['Top Best Sellers', 'Category', 'Units Sold', 'Revenue'],
      ...bestSellers.map((b) => [b.name, b.category, b.units.toString(), b.revenue.toString()]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `39POS_Executive_Analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportFeedback(t('dashboard.csvExported', 'Analytics CSV Exported!'));
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const handlePrintSummary = () => {
    soundFX.playBeep();
    window.print();
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-4 animate-in fade-in duration-200 text-xs">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin space-y-5">
        {/* 🌟 1. Top Glass Hero Banner with Dynamic Date Range & Action Buttons */}
        <div className="relative overflow-hidden neu-card-lg p-5">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('dashboard.realtimeIntelligence', 'Online Platform Financial Intelligence')}</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('dashboard.title', 'Executive Business Analytics')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                {t('dashboard.subtitle', 'Live multi-channel performance across delivery platforms, gross margins, dispatch velocity, and stock health.')}
              </p>
            </div>

            {/* Time Range Filter Pills & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-1 neu-tab-container flex items-center gap-1">
                {[
                  { id: 'TODAY', label: t('dashboard.rangeToday', 'Today') },
                  { id: 'YESTERDAY', label: t('dashboard.rangeYesterday', 'Yesterday') },
                  { id: 'WEEK', label: t('dashboard.range7d', 'Last 7 Days') },
                  { id: 'MONTH', label: t('dashboard.rangeMonth', 'This Month') },
                  { id: 'ALL', label: t('dashboard.rangeAllTime', 'All Time') },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setTimeRange(pill.id as any);
                      soundFX.playBeep();
                    }}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                      timeRange === pill.id
                        ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 shadow-neu-raised-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Quick Export & Refresh Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 neu-btn text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer text-slate-700 dark:text-slate-200 hover:text-emerald-500"
                  title={t('dashboard.btnExport', 'Export CSV')}
                >
                  {exportFeedback ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{exportFeedback || t('dashboard.btnExport', 'Export CSV')}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintSummary}
                  className="px-3 py-2 neu-btn text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer text-slate-700 dark:text-slate-200 hover:text-emerald-500"
                  title={t('dashboard.btnPrint', 'Print')}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('dashboard.btnPrint', 'Print')}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="p-2 neu-circle-btn text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer hover:text-emerald-500"
                  title={t('common.refresh', 'Refresh')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 2. Top 4 Interactive KPI Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Gross Sales Revenue */}
          <div
            onClick={() => navigate('/reports')}
            className="p-5 rounded-3xl neu-card-interactive space-y-3 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t('dashboard.revenueTitle', 'Gross Sales Revenue')}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatMoney(totalRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-1">
                <span>{totalInvoices} {t('dashboard.invoicesCount', 'Completed Orders')}</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{t('dashboard.aovBasket', 'AOV Basket:')} <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatMoney(avgOrderValue)}</strong></span>
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-extrabold group-hover:translate-x-0.5 transition-transform">
                {t('dashboard.btnLedger', 'Ledger')} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* KPI 2: Online Platform Revenue & Share */}
          <div
            onClick={() => navigate('/pos')}
            className="p-5 rounded-3xl neu-card-interactive space-y-3 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                {t('dashboard.onlinePlatformTitle', 'Online Platform Hub')}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatMoney(onlineRevenue || totalRevenue)}
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-1">
                {onlineSales.length || totalInvoices} {t('dashboard.dispatchedOrders', 'Dispatched Deliveries')}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Platform Share: <strong className="text-pink-600 dark:text-pink-400 font-mono font-extrabold">{totalRevenue > 0 ? (( (onlineRevenue || totalRevenue) / totalRevenue) * 100).toFixed(0) : '100'}%</strong></span>
              <span className="flex items-center gap-0.5 text-pink-600 dark:text-pink-400 font-extrabold group-hover:translate-x-0.5 transition-transform">
                {t('dashboard.btnDispatch', 'Dispatch')} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* KPI 3: Estimated Net Profit */}
          <div
            onClick={() => navigate('/reports')}
            className="p-5 rounded-3xl neu-card-interactive space-y-3 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                {t('dashboard.profitTitle', 'Estimated Net Margin')}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatMoney(estimatedProfit)}
              </div>
              <div className="text-[11px] font-extrabold text-cyan-600 dark:text-cyan-400 mt-1">
                {profitMarginRate}% {t('dashboard.grossMargin', 'Gross Margin Rate')}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{t('dashboard.cogs', 'COGS:')} <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatMoney(cogsAmount)}</strong></span>
              <span className="flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400 font-extrabold group-hover:translate-x-0.5 transition-transform">
                {t('dashboard.btnPnl', 'P&L')} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* KPI 4: Inventory Health & Valuation */}
          <div
            onClick={() => navigate('/inventory')}
            className="p-5 rounded-3xl neu-card-interactive space-y-3 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t('dashboard.inventoryTitle', 'Inventory Valuation')}
              </span>
              <div className="w-8 h-8 rounded-xl neu-sunken-sm text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatMoney(data?.kpi?.inventoryValue || 0)}
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-bold mt-1 ${
                (data?.kpi?.lowStockCount || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {(data?.kpi?.lowStockCount || 0) > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{t('dashboard.itemsRequireRestock', '{{count}} Items Require Restock', { count: data?.kpi?.lowStockCount })}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{t('dashboard.inventoryHealthy', 'Inventory Healthy')}</span>
                  </>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{t('dashboard.skusActive', 'SKUs: {{count}} Active', { count: data?.kpi?.productCount || 0 })}</span>
              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-extrabold group-hover:translate-x-0.5 transition-transform">
                {t('dashboard.btnStock', 'Stock')} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

      {/* 🌟 3. Middle Interactive Charts: Sales Trajectory & Omni-Channel Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart (7 Columns): Interactive Sales & Profit Trajectory / Hourly Heatmap */}
        <div className="lg:col-span-7 p-6 neu-card-lg space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/40 dark:border-slate-800/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>
                    {chartMode === 'TREND'
                      ? t('dashboard.salesProfitTrendTitle', 'Sales Velocity & Profit Trajectory')
                      : t('dashboard.hourlyRushTitle', 'Hourly Peak Rush Heatmap (Staff Scheduling)')}
                  </span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black neu-pill text-emerald-600 dark:text-emerald-400 uppercase">
                  7-Day Live
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {chartMode === 'TREND'
                  ? t('dashboard.salesProfitTrendSubtitle', 'Revenue vs Net Profit margin generated across all POS checkout registers.')
                  : t('dashboard.hourlyRushSubtitle', 'Identify high-traffic hours to optimize cashier and kitchen staffing.')}
              </p>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="p-1 neu-tab-container flex items-center gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMode('TREND')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                  chartMode === 'TREND'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 shadow-neu-raised-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('dashboard.modeTrajectory', 'Trajectory')}
              </button>
              <button
                type="button"
                onClick={() => setChartMode('HOURLY')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                  chartMode === 'HOURLY'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 shadow-neu-raised-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('dashboard.modeHourlyPeak', 'Hourly Peaks')}
              </button>
            </div>
          </div>

          {/* Micro KPI Insight Summary Strip */}
          <div className="grid grid-cols-3 gap-2.5 p-2.5 rounded-2xl neu-sunken-sm text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">7-Day Velocity</span>
              <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                {formatMoney(totalWeeklyRev)}
              </span>
            </div>
            <div className="flex flex-col border-x border-slate-200/50 dark:border-slate-800/60 px-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Peak Performance</span>
              <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                {peakDay.day} • {formatMoney(peakDay.sales || 0)}
              </span>
            </div>
            <div className="flex flex-col pl-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Avg Profit Margin</span>
              <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                {weeklyProfitMargin}%
              </span>
            </div>
          </div>

          {/* Visual Chart Rendering */}
          {chartMode === 'TREND' ? (
            <div className="space-y-3 pt-2">
              <div className="relative h-60 w-full flex items-end">
                {/* Horizontal Background Reference Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                  <div className="border-b border-dashed border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-50 dark:bg-slate-900 px-1">{formatMoney(maxChartVal)}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200/40 dark:border-slate-800/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-50 dark:bg-slate-900 px-1">{formatMoney(maxChartVal * 0.5)}</span>
                  </div>
                  <div className="border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-50 dark:bg-slate-900 px-1">{formatMoney(0)}</span>
                  </div>
                </div>

                {/* Vertical Bar Columns Deck */}
                <div className="relative z-10 w-full h-full flex items-end justify-between gap-2 sm:gap-4 pl-12 pr-2 pb-6">
                  {salesChart.map((item: any, idx: number) => {
                    const hasSales = (item.sales || 0) > 0;
                    const revHeight = maxChartVal > 0 ? ((item.sales || 0) / maxChartVal) * 100 : 0;
                    const profHeight = maxChartVal > 0 ? ((item.profit || 0) / maxChartVal) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Interactive Floating Hover Popover */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 neu-card-lg p-2 text-slate-900 dark:text-white text-[10px] font-mono pointer-events-none transition-all duration-200 whitespace-nowrap z-30 shadow-neu-raised-lg scale-95 group-hover:scale-100 space-y-0.5">
                          <div className="font-extrabold text-slate-700 dark:text-slate-200 border-b border-slate-200/40 dark:border-slate-800/60 pb-1">
                            {item.day} ({item.date}) • {item.ordersCount || 0} orders
                          </div>
                          <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                            <span>Revenue:</span>
                            <strong>{formatMoney(item.sales || 0)}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-indigo-600 dark:text-indigo-400">
                            <span>Profit:</span>
                            <strong>{formatMoney(item.profit || 0)}</strong>
                          </div>
                        </div>

                        {/* Top floating value pill on active days */}
                        {hasSales && (
                          <div className="mb-2 px-1.5 py-0.5 rounded-lg neu-card-sm text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400 shadow-xs animate-in fade-in zoom-in-95 duration-200">
                            {format(item.sales)}
                          </div>
                        )}

                        {/* Bar Pillars Container */}
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-40">
                          {hasSales ? (
                            <>
                              {/* Revenue Pillar */}
                              <div
                                style={{ height: `${Math.max(revHeight, 8)}%` }}
                                className="w-3.5 sm:w-5 rounded-t-xl bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-sm transition-all duration-500 group-hover:brightness-110 relative"
                              />

                              {/* Profit Pillar */}
                              <div
                                style={{ height: `${Math.max(profHeight, 6)}%` }}
                                className="w-3.5 sm:w-5 rounded-t-xl bg-gradient-to-t from-indigo-600 via-indigo-500 to-cyan-400 shadow-sm transition-all duration-500 group-hover:brightness-110 relative"
                              />
                            </>
                          ) : (
                            /* Zero Baseline Marker */
                            <div className="w-2.5 h-1.5 rounded-full bg-slate-300/60 dark:bg-slate-700/60 mb-0.5 group-hover:scale-125 transition-transform" />
                          )}
                        </div>

                        {/* X-Axis Day Label */}
                        <span className={`text-[11px] mt-2 transition-colors ${
                          hasSales
                            ? 'font-black text-slate-800 dark:text-white'
                            : 'font-semibold text-slate-400'
                        }`}>
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Legend & Indicators */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/40 dark:border-slate-800/60 text-[11px] font-bold">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-gradient-to-r from-emerald-600 to-teal-400" />
                    <span className="text-slate-600 dark:text-slate-300">{t('dashboard.legendRevenue', 'Gross Sales Revenue')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-gradient-to-r from-indigo-600 to-cyan-400" />
                    <span className="text-slate-600 dark:text-slate-300">{t('dashboard.legendProfit', 'Net Profit Margin')}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Multi-Channel Synchronized
                </span>
              </div>
            </div>
          ) : (
            /* Hourly Heatmap View */
            <div className="space-y-3 pt-2">
              <div className="relative h-60 w-full flex items-end">
                {/* Horizontal Reference Grid */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                  <div className="border-b border-dashed border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-50 dark:bg-slate-900 px-1">{formatMoney(maxHourlySales)}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200/40 dark:border-slate-800/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-50 dark:bg-slate-900 px-1">{formatMoney(maxHourlySales * 0.5)}</span>
                  </div>
                  <div className="border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-50 dark:bg-slate-900 px-1">{formatMoney(0)}</span>
                  </div>
                </div>

                <div className="relative z-10 w-full h-full flex items-end justify-between gap-2 pl-12 pr-2 pb-6">
                  {hourlyData.map((h: any, idx: number) => {
                    const barH = maxHourlySales > 0 ? ((h.sales || 0) / maxHourlySales) * 100 : 0;
                    const hasVolume = (h.sales || 0) > 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 neu-card-sm text-slate-900 dark:text-white text-[10px] font-mono font-bold px-2 py-1 pointer-events-none transition-all whitespace-nowrap z-20 shadow-neu-raised">
                          {t('dashboard.hourlyTooltip', '{{orders}} orders ({{sales}})', { orders: h.orders || 0, sales: formatMoney(h.sales || 0) })}
                        </div>

                        <div className="w-full flex items-end justify-center h-40">
                          {hasVolume ? (
                            <div
                              style={{ height: `${Math.max(barH, 8)}%` }}
                              className={`w-full max-w-[28px] rounded-t-xl transition-all shadow-sm ${
                                h.peak
                                  ? 'bg-gradient-to-t from-emerald-600 via-amber-500 to-amber-300 ring-2 ring-amber-400/50 animate-pulse'
                                  : 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:brightness-110'
                              }`}
                            />
                          ) : (
                            <div className="w-2.5 h-1.5 rounded-full bg-slate-300/60 dark:bg-slate-700/60 mb-0.5 group-hover:scale-125 transition-transform" />
                          )}
                        </div>

                        <span className={`text-[10px] mt-2 ${h.peak ? 'text-amber-500 font-black' : 'text-slate-400 font-bold'}`}>
                          {h.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hourly Peak Legend */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/40 dark:border-slate-800/60 text-[11px]">
                <span className="text-slate-400">{t('dashboard.peakRushStaff', '🔥 Peak Rush: Staff scheduling optimization based on active orders')}</span>
                <span className="text-emerald-500 font-bold">{t('dashboard.realtimeTraffic', 'Real-Time POS Traffic')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Card (5 Columns): Sales Channel & Payment Method Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Omni-Channel Breakdown */}
          <div className="p-6 neu-card-lg space-y-4">
            {/* Header with Title, Live Badge, and Scope Pill Toggle */}
            <div className="pb-3 border-b border-slate-200/40 dark:border-slate-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    onClick={() => navigate('/online-orders')}
                    className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer hover:text-emerald-500 transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <span>{t('dashboard.channelShareTitle', 'Omni-Channel Distribution')}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-500" />
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Stream Synced
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400">
                      {channelScope === 'ALL_TIME' ? 'Linked from Platform Hub' : `Filtered: ${timeRange}`}
                    </span>
                  </div>
                </div>

                {/* Quick Link Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate('/reports')}
                    className="text-[10px] font-bold text-slate-600 dark:text-slate-300 font-mono px-2 py-1 neu-btn rounded-xl flex items-center gap-1 cursor-pointer hover:text-emerald-500 active:scale-95 transition-all"
                    title="View Sales Transaction Stream"
                  >
                    <span>Stream</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/online-orders')}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono px-2.5 py-1 neu-btn rounded-xl flex items-center gap-1 cursor-pointer hover:brightness-105 active:scale-95 transition-all shadow-2xs"
                    title="Manage Platforms in Order Hub"
                  >
                    <span>{channelBreakdown.length} Platforms</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Scope Segmented Control: All-Time Hub vs Period */}
              <div className="flex items-center justify-between gap-2 p-1 rounded-2xl neu-sunken-sm text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setChannelScope('ALL_TIME');
                    soundFX.playBeep();
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    channelScope === 'ALL_TIME'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 shadow-neu-raised-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>Platform Hub (All-Time)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black">
                    {sales.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChannelScope('PERIOD');
                    soundFX.playBeep();
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    channelScope === 'PERIOD'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 shadow-neu-raised-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Period Scope ({timeRange})</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    {filteredSales.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Zero Sales Period Notice with 1-Click Switch */}
            {channelScope === 'PERIOD' && filteredSales.length === 0 && sales.length > 0 && (
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                  <span className="text-[11px]">
                    0 sales for <strong>{timeRange}</strong>. Hub has <strong>{sales.length} order ({formatMoney(allSalesTotalRevenue)})</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setChannelScope('ALL_TIME')}
                  className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-bold text-[10px] active:scale-95 transition-all cursor-pointer flex-shrink-0 shadow-xs"
                >
                  Show All-Time
                </button>
              </div>
            )}

            {/* Scrollable Channels List with Refined Rows */}
            <div className="max-h-64 overflow-y-auto scrollbar-thin pr-1 space-y-2.5">
              {channelBreakdown.map((ch, idx) => {
                const hasSales = ch.revenue > 0 || ch.count > 0;
                const isTop = hasSales && idx === 0;
                const isTop3 = hasSales && idx < 3;
                const brand = PLATFORM_BRAND_STYLES[ch.code] || PLATFORM_BRAND_STYLES.POS;
                const isImage = ch.icon && (ch.icon.startsWith('/uploads/') || ch.icon.startsWith('http') || ch.icon.startsWith('data:'));

                return (
                  <div
                    key={ch.id || idx}
                    className={`p-2.5 rounded-2xl transition-all space-y-2 group border ${
                      hasSales
                        ? 'neu-card-interactive border-black/5 dark:border-white/5 hover:border-emerald-500/30'
                        : 'border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      {/* Left: Rank, Brand Avatar, Title, Badges */}
                      <div className="flex items-center gap-2.5 min-w-0 truncate">
                        {/* Rank Badge */}
                        {isTop ? (
                          <span className="w-5 h-5 rounded-lg text-[10px] font-black font-mono flex items-center justify-center bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-sm shadow-amber-500/30 flex-shrink-0">
                            1
                          </span>
                        ) : isTop3 ? (
                          <span className={`w-5 h-5 rounded-lg text-[10px] font-black font-mono flex items-center justify-center border flex-shrink-0 ${
                            idx === 1
                              ? 'bg-slate-300/20 text-slate-700 dark:text-slate-200 border-slate-400/40'
                              : 'bg-orange-800/20 text-orange-600 dark:text-orange-400 border-orange-700/40'
                          }`}>
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="w-5 text-[10px] font-mono text-slate-400 text-center flex-shrink-0">
                            #{idx + 1}
                          </span>
                        )}

                        {/* Brand Icon */}
                        <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform bg-white/50 dark:bg-slate-800/50">
                          {isImage ? (
                            <img src={ch.icon} alt={ch.label} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{ch.icon || '📦'}</span>
                          )}
                        </div>

                        {/* Name & Code */}
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-500 transition-colors">
                              {ch.label}
                            </span>
                            {ch.code && (
                              <span className="text-[9px] font-mono font-bold neu-pill px-1.5 py-0.2 rounded text-slate-400 flex-shrink-0">
                                {ch.code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span className={`font-semibold ${ch.commissionRate > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {ch.commissionRate > 0 ? `${ch.commissionRate}% Comm.` : '0% Direct'}
                            </span>
                            {ch.count > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                  {ch.count} {ch.count === 1 ? 'order' : 'orders'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Revenue & Percentage Share */}
                      <div className="text-right flex-shrink-0 pl-2">
                        <div className="font-mono font-black text-slate-900 dark:text-white text-xs">
                          {formatMoney(ch.revenue)}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                          {ch.share > 0 ? `${ch.share.toFixed(1)}% share` : '0%'}
                        </div>
                      </div>
                    </div>

                    {/* Progress Track with Brand Gradient */}
                    <div className="w-full h-2 rounded-full neu-sunken-sm overflow-hidden relative">
                      <div
                        style={{ width: `${ch.share > 0 ? Math.max(ch.share, 5) : 0}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          hasSales
                            ? `bg-gradient-to-r ${brand.gradient} ${brand.glow}`
                            : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Omni-Channel Summary Footer Strip */}
            <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Channel Total</span>
                  <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                    {formatMoney(channelScope === 'ALL_TIME' ? allSalesTotalRevenue : totalRevenue)}
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Orders Dispatched</span>
                  <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {channelScope === 'ALL_TIME' ? sales.length : filteredSales.length} Total
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Full Ledger Stream</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Payment Method Mix */}
          <div className="p-6 neu-card-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800/60">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <span>{t('dashboard.paymentMixTitle', 'Settlement & Payment Mix')}</span>
              </h4>
              <span className="text-[10px] font-bold text-indigo-500 font-mono">{t('dashboard.realtime', 'Real-Time')}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {paymentMix.map((pm) => {
                const Icon = pm.icon;
                return (
                  <div
                    key={pm.id}
                    className="p-3 rounded-2xl neu-card-sm space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-6 h-6 rounded-lg ${pm.color} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                        {pm.share.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold truncate">{pm.label}</div>
                    <div className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 truncate">
                      {formatMoney(pm.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 4. Top 5 Best-Selling Products Leaderboard */}
      <div className="p-6 neu-card-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/40 dark:border-slate-800/60">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t('dashboard.bestSellersTitle', 'Top 5 Best-Selling Products & Inventory Health')}</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {t('dashboard.bestSellersSubtitle', 'Highest revenue generating items ranked by volume and real-time remaining stock.')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>{t('dashboard.viewAllCatalog', 'View Complete Catalog')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/40 dark:border-slate-800/60 text-[10px] uppercase font-extrabold text-slate-400">
                <th className="pb-2.5">{t('dashboard.colRank', 'Rank')}</th>
                <th className="pb-2.5">{t('dashboard.colProductName', 'Product Name')}</th>
                <th className="pb-2.5">{t('dashboard.colCategory', 'Category')}</th>
                <th className="pb-2.5 text-right">{t('dashboard.colUnitsSold', 'Units Sold')}</th>
                <th className="pb-2.5 text-right">{t('dashboard.colRevenueGenerated', 'Revenue Generated')}</th>
                <th className="pb-2.5 text-right">{t('dashboard.colStockHealth', 'Stock Health')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 font-medium">
              {bestSellers.length > 0 ? (
                bestSellers.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-3 text-slate-400 text-xs">
                      {item.category}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {t('dashboard.unitsPcs', '{{count}} pcs', { count: item.units })}
                    </td>
                    <td className="py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatMoney(item.revenue)}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold neu-pill ${
                          item.isLowStock
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.isLowStock && <AlertTriangle className="w-3 h-3" />}
                        {t('dashboard.leftInStock', '{{count}} left in stock', { count: item.stock })}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-slate-400 opacity-50" />
                      <span className="font-semibold text-xs">{t('dashboard.noSalesRecorded', 'No sales recorded yet')}</span>
                      <span className="text-[11px] text-slate-400 opacity-80">{t('dashboard.noSalesRecordedDesc', 'Once checkout orders are placed, top-selling items will appear here in real-time.')}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 5. Critical Inventory Alerts Ticker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lowStockAlerts.length > 0 ? (
          <div
            onClick={() => navigate('/purchases')}
            className="p-4 neu-card-interactive flex items-center justify-between gap-3 text-amber-700 dark:text-amber-300 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <div className="font-bold text-xs">{t('dashboard.lowStockAlertTitle', '{{count}} Products Below Minimum Safe Stock Level', { count: lowStockAlerts.length })}</div>
                <div className="text-[11px] opacity-80 mt-0.5 truncate max-w-sm">
                  {t('dashboard.lowStockAlertSubtitle', '{{names}} need procurement orders.', { names: lowStockAlerts.map((i: any) => i.name).join(', ') })}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>
        ) : (
          <div
            onClick={() => navigate('/inventory')}
            className="p-4 neu-card-interactive flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <div className="font-bold text-xs">{t('dashboard.allInventoryHealthy', 'All Inventory Levels Healthy')}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{t('dashboard.noProductsBelowThreshold', 'No products currently below the minimum reorder threshold.')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>
        )}

        {expiringAlerts.length > 0 ? (
          <div
            onClick={() => navigate('/inventory')}
            className="p-4 neu-card-interactive flex items-center justify-between gap-3 text-rose-700 dark:text-rose-300 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <div className="font-bold text-xs">{t('dashboard.expiringBatchesAlertTitle', '{{count}} Batches Expiring Soon', { count: expiringAlerts.length })}</div>
                <div className="text-[11px] opacity-80 mt-0.5 truncate max-w-sm">
                  {expiringAlerts.map((e: any) => `${e.name} (${e.daysLeft}d left)`).join(', ')}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>
        ) : (
          <div
            onClick={() => navigate('/inventory')}
            className="p-4 neu-card-interactive flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <div className="font-bold text-xs">{t('dashboard.noBatchesExpiringSoon', 'No Batches Expiring Soon')}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{t('dashboard.allStockHealthyValidity', 'All stock items are within healthy validity periods.')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
