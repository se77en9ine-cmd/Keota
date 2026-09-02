import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { usePlatformStore } from '../store/usePlatformStore';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  FileText,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Receipt,
  User,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Ban,
  Coins,
  PackageCheck,
  Percent,
  Store,
  Utensils,
  MessageCircle,
  Globe,
  Phone,
  Bike,
  RotateCcw,
  ShoppingBag,
  Zap,
  Search,
  Eye,
  Plus,
  AlertTriangle,
  Layers,
  FileCheck2,
  PackageMinus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Scale,
  Clock,
  Boxes,
} from 'lucide-react';

import { CustomSelect } from '../components/common/CustomSelect';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { WhatsAppPhoneBadge } from '../components/common/WhatsAppPhoneBadge';
import { ReportsChartSection } from '../components/reports/ReportsChartSection';
import { TransactionAuditDrawer } from '../components/reports/TransactionAuditDrawer';
import { FinancialPnlCharts } from '../components/reports/FinancialPnlCharts';
import { FormalIncomeStatement } from '../components/reports/FormalIncomeStatement';
import { QuickRecordTransactionModal } from '../components/reports/QuickRecordTransactionModal';
import { CodAnalyticsCharts } from '../components/reports/CodAnalyticsCharts';
import { CodRefusalModal } from '../components/reports/CodRefusalModal';
import { LossShrinkageReport } from '../components/reports/LossShrinkageReport';
import { ShiftZReport } from '../components/reports/ShiftZReport';
import { ProductMarginMatrix } from '../components/reports/ProductMarginMatrix';
import { HourlyHeatmapReport } from '../components/reports/HourlyHeatmapReport';
import { ReorderForecastReport } from '../components/reports/ReorderForecastReport';
import { FxAnalyticsReport } from '../components/reports/FxAnalyticsReport';
import { CashFlowReport } from '../components/reports/CashFlowReport';

export type SalesSortField = 'DATE' | 'INVOICE' | 'CHANNEL' | 'CUSTOMER' | 'PAYMENT' | 'STATUS' | 'AMOUNT' | 'QTY';
export type CodSortField = 'DATE' | 'INVOICE' | 'COURIER' | 'RECIPIENT' | 'AMOUNT' | 'STAGE' | 'STATUS';

// Helper to normalize and match channels across codes and full names
export const isChannelMatch = (saleChannel: string | undefined | null, targetCodeOrId: string, saleItem?: any): boolean => {
  const sc = (saleChannel || 'POS').toUpperCase().replace(/-/g, '_');
  const tc = targetCodeOrId.toUpperCase().replace(/-/g, '_');

  if (sc === tc) return true;

  // POS-RC (Restaurant & Cafe)
  if (tc === 'POS_RC' || tc === 'RESTAURANT_CAFE' || tc === 'POS_RESTAURANT') {
    if (sc === 'POS_RC' || sc === 'RESTAURANT_CAFE') return true;
    if ((sc === 'POS' || sc === 'IN_STORE_POS' || sc === 'STORE_POS') && (saleItem?.orderType === 'DINE_IN' || Boolean(saleItem?.tableNo))) return true;
    return false;
  }

  // POS-MR (Minimart & Retail)
  if (tc === 'POS_MR' || tc === 'RETAIL_MINIMART' || tc === 'POS_MINIMART') {
    if (sc === 'POS_MR' || sc === 'RETAIL_MINIMART') return true;
    if ((sc === 'POS' || sc === 'IN_STORE_POS' || sc === 'STORE_POS') && (saleItem ? saleItem.orderType !== 'DINE_IN' && !saleItem.tableNo : true)) return true;
    return false;
  }

  // General POS
  if (tc === 'POS' || tc === 'IN_STORE_POS' || tc === 'STORE_POS') {
    return sc === 'POS' || sc === 'POS_RC' || sc === 'POS_MR' || sc === 'IN_STORE_POS' || sc === 'STORE_POS' || sc === '';
  }

  // Grab aliases
  if ((tc === 'GF' || tc === 'GRAB_FOOD' || tc === 'GRABFOOD') && (sc === 'GF' || sc === 'GRAB_FOOD' || sc === 'GRABFOOD')) return true;

  // Foodpanda aliases
  if ((tc === 'FP' || tc === 'FOODPANDA' || tc === 'FOOD_PANDA') && (sc === 'FP' || sc === 'FOODPANDA' || sc === 'FOOD_PANDA')) return true;

  // Shopee aliases
  if ((tc === 'SP' || tc === 'SHOPEE' || tc === 'SHOPEE_FOOD') && (sc === 'SP' || sc === 'SHOPEE' || sc === 'SHOPEE_FOOD')) return true;

  // TikTok aliases
  if ((tc === 'TT' || tc === 'TIKTOK' || tc === 'TIKTOK_SHOP') && (sc === 'TT' || sc === 'TIKTOK' || sc === 'TIKTOK_SHOP')) return true;

  // Web Store aliases
  if ((tc === 'WEB' || tc === 'WEB_STORE' || tc === 'WEBSTORE') && (sc === 'WEB' || sc === 'WEB_STORE' || sc === 'WEBSTORE')) return true;

  // WhatsApp aliases
  if ((tc === 'WA' || tc === 'WHATSAPP' || tc === 'WHATSAPP_ORDER') && (sc === 'WA' || sc === 'WHATSAPP' || sc === 'WHATSAPP_ORDER')) return true;

  // Lineman aliases
  if ((tc === 'LM' || tc === 'LINEMAN' || tc === 'LINE_MAN') && (sc === 'LM' || sc === 'LINEMAN' || sc === 'LINE_MAN')) return true;

  // Phone aliases
  if ((tc === 'PH' || tc === 'PHONE' || tc === 'PHONE_ORDER') && (sc === 'PH' || sc === 'PHONE' || sc === 'PHONE_ORDER')) return true;

  return false;
};

export const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<
    | 'SALES_STREAM'
    | 'CASH_FLOW'
    | 'HOURLY_HEATMAP'
    | 'REORDER_FORECAST'
    | 'FX_ANALYTICS'
    | 'PRODUCT_MARGINS'
    | 'SHIFT_Z_REPORT'
    | 'FINANCIAL_PNL'
    | 'COD_ANALYTICS'
    | 'LOSS_SHRINKAGE'
  >('SALES_STREAM');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [codFilter, setCodFilter] = useState<'ALL' | 'COD_ONLY' | 'PREPAID_ONLY'>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // P&L Specific Filters, View Mode & Modal
  const [pnlViewMode, setPnlViewMode] = useState<'CHARTS' | 'STATEMENT'>('CHARTS');
  const [selectedPnlCategory, setSelectedPnlCategory] = useState<string>('ALL');
  const [pnlSearchQuery, setPnlSearchQuery] = useState<string>('');
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);

  // Tab 1: Sales Stream Sorting & Pagination
  const [salesSortField, setSalesSortField] = useState<SalesSortField>('DATE');
  const [salesSortOrder, setSalesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [salesPage, setSalesPage] = useState<number>(1);
  const [salesPageSize, setSalesPageSize] = useState<number>(25);

  const handleToggleSalesSort = (field: SalesSortField) => {
    if (salesSortField === field) {
      setSalesSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSalesSortField(field);
      setSalesSortOrder(field === 'DATE' || field === 'AMOUNT' || field === 'QTY' ? 'desc' : 'asc');
    }
    setSalesPage(1);
  };

  // Tab 3: COD Specific Filters, Modal, Sorting & Pagination
  const [selectedCodStage, setSelectedCodStage] = useState<string>('ALL');
  const [codSearchQuery, setCodSearchQuery] = useState<string>('');
  const [refusalModalOpen, setRefusalModalOpen] = useState<boolean>(false);
  const [selectedSaleForRefusal, setSelectedSaleForRefusal] = useState<any | null>(null);

  const [codSortField, setCodSortField] = useState<CodSortField>('DATE');
  const [codSortOrder, setCodSortOrder] = useState<'asc' | 'desc'>('desc');
  const [codPage, setCodPage] = useState<number>(1);
  const [codPageSize, setCodPageSize] = useState<number>(25);

  const handleToggleCodSort = (field: CodSortField) => {
    if (codSortField === field) {
      setCodSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCodSortField(field);
      setCodSortOrder(field === 'DATE' || field === 'AMOUNT' ? 'desc' : 'asc');
    }
    setCodPage(1);
  };

  // Transaction Inspector Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedSaleData, setSelectedSaleData] = useState<any>(null);

  const { platforms, fetchPlatforms } = usePlatformStore();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  useEffect(() => {
    fetchPlatforms();
    fetchSales();
    fetchFinancialData();
  }, [fetchPlatforms]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pos/recent?limit=250');
      setSales(res.data.sales || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    try {
      const [expRes, incRes, poRes] = await Promise.all([
        api.get('/accounting/expenses').catch(() => ({ data: { expenses: [] } })),
        api.get('/accounting/income').catch(() => ({ data: { income: [] } })),
        api.get('/purchases').catch(() => ({ data: { purchases: [] } })),
      ]);
      setExpenses(expRes.data.expenses || []);
      setIncomes(incRes.data.income || []);
      setPurchases(poRes.data.purchases || []);
    } catch {}
  };

  // Preset Date filters
  const applyPreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      const past7Str = `${past7.getFullYear()}-${(past7.getMonth() + 1).toString().padStart(2, '0')}-${past7.getDate().toString().padStart(2, '0')}`;
      setStartDate(past7Str);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter sales by date range, sales channel, COD filter, payment status, and text search
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Channel
      if (selectedChannel !== 'ALL' && !isChannelMatch(s.channel, selectedChannel, s)) {
        return false;
      }

      // COD Filter
      if (codFilter === 'COD_ONLY' && !s.isCod) return false;
      if (codFilter === 'PREPAID_ONLY' && s.isCod) return false;

      // Payment Status Filter
      if (paymentStatusFilter !== 'ALL') {
        if (paymentStatusFilter === 'CANCELLED') {
          if (s.fulfillmentStatus !== 'CANCELLED' && s.status !== 'CANCELLED' && s.pipelineStage !== 'REJECTED') {
            return false;
          }
        } else if (s.paymentStatus !== paymentStatusFilter) {
          return false;
        }
      }

      // Date Range
      if (startDate || endDate) {
        const saleDate = s.createdAt ? s.createdAt.slice(0, 10) : '';
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
      }

      // Universal Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invoiceMatch = s.invoiceNo?.toLowerCase().includes(q);
        const customerMatch =
          (s.customerName || '').toLowerCase().includes(q) ||
          (s.customerSurname || '').toLowerCase().includes(q) ||
          (s.deliveryContact || '').toLowerCase().includes(q);
        const phoneMatch = (s.customerPhone || '').toLowerCase().includes(q);
        const refMatch =
          (s.externalOrderId || '').toLowerCase().includes(q) ||
          (s.courierTrackingNo || '').toLowerCase().includes(q);
        const itemsMatch = (s.itemsSummary || '').toLowerCase().includes(q);

        if (!invoiceMatch && !customerMatch && !phoneMatch && !refMatch && !itemsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [sales, selectedChannel, codFilter, paymentStatusFilter, startDate, endDate, searchQuery]);

  // Filtered Expenses by Date Range, Category, and Text Search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (startDate || endDate) {
        const expDate = exp.createdAt ? exp.createdAt.slice(0, 10) : (exp.expenseDate || '');
        if (startDate && expDate < startDate) return false;
        if (endDate && expDate > endDate) return false;
      }

      if (selectedPnlCategory !== 'ALL' && exp.category?.toUpperCase() !== selectedPnlCategory) {
        return false;
      }

      if (pnlSearchQuery.trim()) {
        const q = pnlSearchQuery.toLowerCase().trim();
        const descMatch = (exp.description || exp.title || '').toLowerCase().includes(q);
        const catMatch = (exp.category || '').toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [expenses, startDate, endDate, selectedPnlCategory, pnlSearchQuery]);

  // Filtered Incomes by Date Range, Category, and Text Search
  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => {
      if (startDate || endDate) {
        const incDate = inc.createdAt ? inc.createdAt.slice(0, 10) : '';
        if (startDate && incDate < startDate) return false;
        if (endDate && incDate > endDate) return false;
      }

      if (pnlSearchQuery.trim()) {
        const q = pnlSearchQuery.toLowerCase().trim();
        const descMatch = (inc.description || inc.title || '').toLowerCase().includes(q);
        const catMatch = (inc.category || '').toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [incomes, startDate, endDate, pnlSearchQuery]);

  // Filtered COD Orders by Date Range, Stage, and Search Query
  const filteredCodSales = useMemo(() => {
    return sales.filter((s) => {
      if (!s.isCod) return false;

      // Date Range
      if (startDate || endDate) {
        const saleDate = s.createdAt ? s.createdAt.slice(0, 10) : '';
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
      }

      // Stage Filter
      if (selectedCodStage !== 'ALL') {
        if (selectedCodStage === 'SETTLED') {
          if (s.paymentStatus !== 'PAID' && s.fulfillmentStatus !== 'DELIVERED') return false;
        } else if (selectedCodStage === 'IN_TRANSIT') {
          if (s.paymentStatus === 'PAID' || s.fulfillmentStatus === 'CANCELLED' || s.pipelineStage === 'REJECTED') return false;
        } else if (selectedCodStage === 'REFUSED') {
          if (s.fulfillmentStatus !== 'CANCELLED' && s.pipelineStage !== 'REJECTED') return false;
        } else if (s.pipelineStage?.toUpperCase() !== selectedCodStage) {
          return false;
        }
      }

      // Search Query
      if (codSearchQuery.trim()) {
        const q = codSearchQuery.toLowerCase().trim();
        const invoiceMatch = s.invoiceNo?.toLowerCase().includes(q);
        const customerMatch =
          (s.customerName || '').toLowerCase().includes(q) ||
          (s.customerSurname || '').toLowerCase().includes(q) ||
          (s.deliveryContact || '').toLowerCase().includes(q);
        const phoneMatch = (s.customerPhone || '').toLowerCase().includes(q);
        const refMatch =
          (s.externalOrderId || '').toLowerCase().includes(q) ||
          (s.courierTrackingNo || '').toLowerCase().includes(q) ||
          (s.courierName || '').toLowerCase().includes(q);

        if (!invoiceMatch && !customerMatch && !phoneMatch && !refMatch) {
          return false;
        }
      }

      return true;
    });
  }, [sales, startDate, endDate, selectedCodStage, codSearchQuery]);

  const totalFilteredRevenue = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const averageTicket = filteredSales.length > 0 ? totalFilteredRevenue / filteredSales.length : 0;

  // Financial Calculations (Filtered)
  const grossSalesRevenue = filteredSales.reduce(
    (sum, s) => sum + (s.paymentStatus === 'PAID' ? (s.totalAmount || 0) : 0),
    0
  );
  const totalCogs = filteredSales.reduce(
    (sum, s) => sum + (s.paymentStatus === 'PAID' ? (s.totalCost || 0) : 0),
    0
  );
  const otherIncomesTotal = filteredIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const totalGrossIncome = grossSalesRevenue + otherIncomesTotal;

  const recordedExpensesTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const deliveryFreightLosses = filteredSales.reduce((sum, s) => sum + (s.deliveryFeeLoss || 0), 0);
  const sellerPaidDeliveryFees = filteredSales.reduce(
    (sum, s) => sum + (s.paymentStatus === 'PAID' && s.deliveryFeePayer === 'SELLER_PAYS' ? (s.deliveryFee || 0) : 0),
    0
  );
  const totalDirectCosts = totalCogs + deliveryFreightLosses + sellerPaidDeliveryFees;
  const totalExpenses = recordedExpensesTotal + totalDirectCosts;

  const grossProfit = totalGrossIncome - totalDirectCosts;
  const grossMargin = totalGrossIncome > 0 ? (grossProfit / totalGrossIncome) * 100 : 0;

  const netProfit = grossProfit - recordedExpensesTotal;
  const profitMargin = totalGrossIncome > 0 ? (netProfit / totalGrossIncome) * 100 : 0;

  // COD Intelligence Calculations (Filtered)
  const codSettledAmount = filteredCodSales
    .filter((s) => s.paymentStatus === 'PAID' || s.fulfillmentStatus === 'DELIVERED')
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const codPendingAmount = filteredCodSales
    .filter((s) => s.paymentStatus !== 'PAID' && s.fulfillmentStatus !== 'CANCELLED' && s.pipelineStage !== 'REJECTED')
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const codRejectedOrders = filteredCodSales.filter((s) => s.fulfillmentStatus === 'CANCELLED' || s.pipelineStage === 'REJECTED');
  const codRejectionRate = filteredCodSales.length > 0 ? (codRejectedOrders.length / filteredCodSales.length) * 100 : 0;
  const codFreightLossTotal = filteredCodSales.reduce((sum, s) => sum + (s.deliveryFeeLoss || 0), 0);

  // ── Computed Sorted & Paginated Sales (Tab 1) ──
  const sortedSales = useMemo(() => {
    const list = [...filteredSales];
    list.sort((a, b) => {
      let comparison = 0;
      switch (salesSortField) {
        case 'DATE': {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          comparison = timeA - timeB;
          break;
        }
        case 'INVOICE':
          comparison = (a.invoiceNo || '').localeCompare(b.invoiceNo || '');
          break;
        case 'CHANNEL':
          comparison = (a.channel || '').localeCompare(b.channel || '');
          break;
        case 'CUSTOMER':
          comparison = (a.customerName || '').localeCompare(b.customerName || '');
          break;
        case 'PAYMENT':
          comparison = (a.paymentMethod || '').localeCompare(b.paymentMethod || '');
          break;
        case 'STATUS':
          comparison = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
          break;
        case 'AMOUNT':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'QTY':
          comparison = (a.itemsCount || 1) - (b.itemsCount || 1);
          break;
        default:
          comparison = 0;
      }
      return salesSortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredSales, salesSortField, salesSortOrder]);

  const salesTotalPages = salesPageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedSales.length / salesPageSize));
  const salesEffectivePage = Math.min(salesPage, salesTotalPages);
  const paginatedSales = useMemo(() => {
    if (salesPageSize === -1) return sortedSales;
    const start = (salesEffectivePage - 1) * salesPageSize;
    return sortedSales.slice(start, start + salesPageSize);
  }, [sortedSales, salesEffectivePage, salesPageSize]);

  // ── Computed Sorted & Paginated COD Orders (Tab 3) ──
  const sortedCodSales = useMemo(() => {
    const list = [...filteredCodSales];
    list.sort((a, b) => {
      let comparison = 0;
      switch (codSortField) {
        case 'DATE': {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          comparison = timeA - timeB;
          break;
        }
        case 'INVOICE':
          comparison = (a.invoiceNo || '').localeCompare(b.invoiceNo || '');
          break;
        case 'COURIER':
          comparison = (a.courierName || '').localeCompare(b.courierName || '');
          break;
        case 'RECIPIENT':
          comparison = (a.customerName || a.deliveryContact || '').localeCompare(b.customerName || b.deliveryContact || '');
          break;
        case 'AMOUNT':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'STAGE':
          comparison = (a.pipelineStage || '').localeCompare(b.pipelineStage || '');
          break;
        case 'STATUS':
          comparison = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
          break;
        default:
          comparison = 0;
      }
      return codSortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredCodSales, codSortField, codSortOrder]);

  const codTotalPages = codPageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedCodSales.length / codPageSize));
  const codEffectivePage = Math.min(codPage, codTotalPages);
  const paginatedCodSales = useMemo(() => {
    if (codPageSize === -1) return sortedCodSales;
    const start = (codEffectivePage - 1) * codPageSize;
    return sortedCodSales.slice(start, start + codPageSize);
  }, [sortedCodSales, codEffectivePage, codPageSize]);

  // Unified list of all channel definitions
  const allReportingChannels = [
    { id: 'POS_RC', code: 'POS_RC', label: 'In-Store POS-RC', subLabel: 'Restaurant & Cafe', icon: '🍴', color: 'amber' },
    { id: 'POS_MR', code: 'POS_MR', label: 'In-Store POS-MR', subLabel: 'Minimart & Retail', icon: '🏪', color: 'emerald' },
    ...platforms.map((p) => ({
      id: p.id,
      code: p.code,
      label: p.name,
      icon: p.icon,
      color: p.color || 'emerald',
    })),
  ];

  // Channel breakdown calculation
  const channelBreakdown = allReportingChannels.map((ch) => {
    const channelSales = sales.filter((s) => {
      if (!isChannelMatch(s.channel, ch.code, s)) return false;
      if (!startDate && !endDate) return true;
      const saleDate = s.createdAt ? s.createdAt.slice(0, 10) : '';
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });

    const revenue = channelSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const count = channelSales.length;
    const avg = count > 0 ? revenue / count : 0;
    const share = totalFilteredRevenue > 0 ? (revenue / totalFilteredRevenue) * 100 : 0;

    return {
      id: ch.id,
      code: ch.code,
      label: ch.label,
      subLabel: (ch as any).subLabel,
      icon: ch.icon,
      color: ch.color,
      count,
      revenue,
      avg,
      share,
    };
  }).filter((c) => c.count > 0 || selectedChannel === c.code || selectedChannel === c.id || c.code === 'POS_RC' || c.code === 'POS_MR');

  const renderChannelIcon = (code: string, rawIcon?: string) => {
    if (rawIcon && (rawIcon.startsWith('/uploads/') || rawIcon.startsWith('http') || rawIcon.startsWith('data:'))) {
      return <img src={rawIcon} alt={code} className="w-3.5 h-3.5 rounded object-cover flex-shrink-0" />;
    }

    const upper = (code || '').toUpperCase();
    if (upper === 'POS_RC' || upper === 'RESTAURANT_CAFE' || upper === 'RC') {
      return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (upper === 'POS_MR' || upper === 'RETAIL_MINIMART' || upper === 'MR' || upper === 'POS' || upper === 'IN_STORE_POS' || upper === 'STORE_POS' || !code) {
      return <Store className="w-3.5 h-3.5 text-emerald-500" />;
    }
    if (upper === 'WA' || upper === 'WHATSAPP') {
      return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (upper === 'WEB' || upper === 'WEB_STORE') {
      return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
    }
    if (upper === 'PH' || upper === 'PHONE') {
      return <Phone className="w-3.5 h-3.5 text-indigo-400" />;
    }
    if (upper === 'GF' || upper === 'GRAB_FOOD' || upper === 'LM' || upper === 'LINEMAN') {
      return <Bike className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (upper === 'FP' || upper === 'FOODPANDA') {
      return <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />;
    }
    if (upper === 'SP' || upper === 'SHOPEE') {
      return <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />;
    }
    return <span className="text-xs">{rawIcon || '🛵'}</span>;
  };

  const getPlatformDisplay = (s: any) => {
    const saleChannel = typeof s === 'string' ? s : s?.channel;
    const isRc = saleChannel === 'POS_RC' || saleChannel === 'RESTAURANT_CAFE' || (typeof s === 'object' && (saleChannel === 'POS' || !saleChannel) && (s.orderType === 'DINE_IN' || Boolean(s.tableNo)));
    if (isRc) {
      return {
        id: 'POS_RC',
        code: 'POS_RC',
        label: 'In-Store POS-RC',
        subLabel: 'Restaurant & Cafe',
        icon: '🍴',
        color: 'amber',
      };
    }
    const isMr = saleChannel === 'POS_MR' || saleChannel === 'RETAIL_MINIMART' || (typeof s === 'object' && (saleChannel === 'POS' || !saleChannel) && s.orderType !== 'DINE_IN' && !s.tableNo) || saleChannel === 'POS' || !saleChannel;
    if (isMr && (!saleChannel || saleChannel === 'POS' || saleChannel === 'POS_MR' || saleChannel === 'RETAIL_MINIMART')) {
      return {
        id: 'POS_MR',
        code: 'POS_MR',
        label: 'In-Store POS-MR',
        subLabel: 'Minimart & Retail',
        icon: '🏪',
        color: 'emerald',
      };
    }
    const match = allReportingChannels.find((c) => isChannelMatch(saleChannel, c.code, typeof s === 'object' ? s : undefined));
    if (match) return match;
    return {
      id: saleChannel || 'CUSTOM',
      code: saleChannel || 'CUSTOM',
      label: saleChannel || 'In-Store POS-MR',
      icon: '🏪',
      color: 'slate',
    };
  };

  // ── Export Button State Machine ──
  type ExportState = 'idle' | 'loading' | 'success' | 'error';
  const [exportStates, setExportStates] = useState<{
    sales: ExportState;
    pnl: ExportState;
    cod: ExportState;
    inventory: ExportState;
    products: ExportState;
    loss: ExportState;
    cashflow: ExportState;
  }>({ sales: 'idle', pnl: 'idle', cod: 'idle', inventory: 'idle', products: 'idle', loss: 'idle', cashflow: 'idle' });

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleExport = async (
    key: 'sales' | 'pnl' | 'cod' | 'inventory' | 'products' | 'loss' | 'cashflow',
    endpoint: string,
    filename: string
  ) => {
    setExportStates((prev) => ({ ...prev, [key]: 'loading' }));
    try {
      let url = endpoint;
      const params = new URLSearchParams();
      params.set('currency', currentCurrency || 'USD');
      params.set('lang', i18n.language || 'en');

      if (key === 'sales' || key === 'pnl' || key === 'cod' || key === 'loss' || key === 'cashflow') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (key === 'sales' && selectedChannel !== 'ALL') params.set('channel', selectedChannel);
        if (key === 'sales' && codFilter !== 'ALL') params.set('codFilter', codFilter);
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const localizedFilename = filename.replace('.xlsx', `_${currentCurrency || 'USD'}.xlsx`);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', localizedFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setExportStates((prev) => ({ ...prev, [key]: 'success' }));
      showToast(t('reports.toastExportSuccess', { name: localizedFilename, defaultValue: `Exported ${localizedFilename} successfully!` }), 'success');
    } catch (err: any) {
      console.error(`Export failed for ${key}:`, err);
      setExportStates((prev) => ({ ...prev, [key]: 'error' }));
      showToast(t('reports.toastExportFailed', { message: err.message || 'Server error', defaultValue: `Export failed: ${err.message || 'Server error'}` }), 'error');
    }
  };

  useEffect(() => {
    const activeKey = Object.entries(exportStates).find(([, s]) => s === 'success' || s === 'error')?.[0] as 'sales' | 'pnl' | 'cod' | 'inventory' | 'products' | 'loss' | 'cashflow' | undefined;
    if (activeKey) {
      const key = activeKey;
      setTimeout(() => {
        setExportStates((prev) => ({ ...prev, [key]: 'idle' }));
      }, 2000);
    }
  }, [exportStates]);

  const renderExportIcon = (state: ExportState) => {
    if (state === 'loading') return <span className="export-spinner" />;
    if (state === 'success') return <CheckCircle2 className="w-4 h-4 export-check" />;
    return <Download className="w-4 h-4" />;
  };

  const getExportLabel = (state: ExportState, label: string) => {
    if (state === 'loading') return t('reports.generating', 'Generating…');
    if (state === 'success') return t('reports.downloaded', 'Downloaded ✓');
    return label;
  };

  const openAuditDrawer = (sale: any) => {
    setSelectedSaleId(sale.id);
    setSelectedSaleData(sale);
    setDrawerOpen(true);
  };

  // Complete COD Settlement
  const handleCompleteCod = async (saleId: string) => {
    try {
      await api.post(`/pos/orders/${saleId}/complete-cod`);
      await fetchSales();
      showToast('COD payment collected and settled as PAID!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to complete COD', 'error');
    }
  };

  const openRefusalModal = (sale: any) => {
    setSelectedSaleForRefusal(sale);
    setRefusalModalOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Inline Toast Notification */}
      {toastMsg && (
        <div className={`export-toast ${toastMsg.type === 'error' ? 'export-toast--error' : 'export-toast--success'}`}>
          {toastMsg.type === 'error' ? '✕' : '✓'}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & Global Export Ribbon (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-500 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span>{t('reports.title', 'Reports, Exports & Auditing')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {t('reports.subtitle', 'POS Register synchronization, Omnichannel platform breakdown, sales analysis & Excel exports')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active Contextual Export Button */}
          {activeReportTab === 'SALES_STREAM' && (
            <button
              onClick={() => handleExport('sales', '/export/sales/excel', '39pos_sales_report.xlsx')}
              disabled={exportStates.sales === 'loading'}
              className="neu-btn-primary py-2.5 px-4 rounded-2xl text-xs flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
            >
              {renderExportIcon(exportStates.sales)}
              <span>{getExportLabel(exportStates.sales, t('reports.exportSalesReport', 'Export Sales (.xlsx)'))}</span>
            </button>
          )}

          {activeReportTab === 'CASH_FLOW' && (
            <button
              onClick={() => handleExport('cashflow', '/export/cash-flow/excel', '39pos_cash_flow_summary.xlsx')}
              disabled={exportStates.cashflow === 'loading'}
              className="neu-btn-accent py-2.5 px-4 rounded-2xl text-xs flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50 text-emerald-600 dark:text-emerald-300"
            >
              {renderExportIcon(exportStates.cashflow)}
              <span>{getExportLabel(exportStates.cashflow, t('cashFlow.exportCashFlow', 'Export Cash Flow (.xlsx)'))}</span>
            </button>
          )}

          {activeReportTab === 'FINANCIAL_PNL' && (
            <button
              onClick={() => handleExport('pnl', '/export/pnl/excel', '39pos_financial_pnl.xlsx')}
              disabled={exportStates.pnl === 'loading'}
              className="neu-btn-accent py-2.5 px-4 rounded-2xl text-xs flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50 text-emerald-600 dark:text-emerald-300"
            >
              {renderExportIcon(exportStates.pnl)}
              <span>{getExportLabel(exportStates.pnl, t('reports.exportPnl', 'Export P&L (.xlsx)'))}</span>
            </button>
          )}

          {activeReportTab === 'COD_ANALYTICS' && (
            <button
              onClick={() => handleExport('cod', '/export/cod/excel', '39pos_cod_deliveries.xlsx')}
              disabled={exportStates.cod === 'loading'}
              className="neu-btn-accent py-2.5 px-4 rounded-2xl text-xs flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50 text-amber-600 dark:text-amber-300"
            >
              {renderExportIcon(exportStates.cod)}
              <span>{getExportLabel(exportStates.cod, t('reports.exportCod', 'Export COD (.xlsx)'))}</span>
            </button>
          )}

          {activeReportTab === 'LOSS_SHRINKAGE' && (
            <button
              onClick={() => handleExport('loss', '/export/loss/excel', '39pos_loss_and_shrinkage_report.xlsx')}
              disabled={exportStates.loss === 'loading'}
              className="neu-btn-danger py-2.5 px-4 rounded-2xl text-xs flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
            >
              {renderExportIcon(exportStates.loss)}
              <span>{getExportLabel(exportStates.loss, t('reports.exportLoss', 'Export Loss (.xlsx)'))}</span>
            </button>
          )}

          {/* Master Catalog Quick Actions */}
          <button
            onClick={() => handleExport('inventory', '/export/inventory/excel', '39pos_inventory_valuation.xlsx')}
            disabled={exportStates.inventory === 'loading'}
            className="neu-btn py-2.5 px-4 rounded-2xl text-xs flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
            title={t('reports.exportInventoryValuation', 'Inventory Valuation (.xlsx)')}
          >
            {renderExportIcon(exportStates.inventory)}
            <span>{getExportLabel(exportStates.inventory, t('reports.exportInventoryShort', 'Stock Valuation'))}</span>
          </button>

          <button
            onClick={() => handleExport('products', '/export/products/excel', '39pos_products_catalog.xlsx')}
            disabled={exportStates.products === 'loading'}
            className="neu-btn py-2.5 px-4 rounded-2xl text-xs flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
            title={t('reports.exportProductMaster', 'Product Master (.xlsx)')}
          >
            {renderExportIcon(exportStates.products)}
            <span>{getExportLabel(exportStates.products, t('reports.exportProductsShort', 'Product Master'))}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar (Fixed) */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1 p-1 neu-tab-container text-xs font-bold rounded-2xl">
        <button
          onClick={() => setActiveReportTab('SALES_STREAM')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeReportTab === 'SALES_STREAM'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-500" />
          <span>{t('reports.tabSalesStream', 'Sales Stream')}</span>
        </button>

        <button
          onClick={() => setActiveReportTab('CASH_FLOW')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeReportTab === 'CASH_FLOW'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>{t('reports.tabCashFlow', 'Cash Flow Auto Summarize')}</span>
        </button>

        <button
          onClick={() => setActiveReportTab('HOURLY_HEATMAP')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeReportTab === 'HOURLY_HEATMAP'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-500" />
          <span>{t('reports.tabHourlyHeatmap', 'Hourly Heatmap')}</span>
        </button>

        <button
          onClick={() => setActiveReportTab('REORDER_FORECAST')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeReportTab === 'REORDER_FORECAST'
              ? 'neu-tab-active text-cyan-600 dark:text-cyan-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4 text-cyan-500" />
          <span>{t('reports.tabReorderForecast', 'Reorder Forecast')}</span>
        </button>

        <button
          onClick={() => setActiveReportTab('FINANCIAL_PNL')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeReportTab === 'FINANCIAL_PNL'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>{t('reports.tabFinancialPnl', 'Financial P&L')}</span>
        </button>

        <button
          onClick={() => setActiveReportTab('COD_ANALYTICS')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeReportTab === 'COD_ANALYTICS'
              ? 'neu-tab-active text-amber-600 dark:text-amber-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-500" />
          <span>{t('reports.tabCodAnalytics', 'COD Intelligence')}</span>
        </button>

        <button
          onClick={() => setActiveReportTab('LOSS_SHRINKAGE')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeReportTab === 'LOSS_SHRINKAGE'
              ? 'neu-tab-active text-rose-600 dark:text-rose-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <PackageMinus className="w-4 h-4 text-rose-500" />
          <span>{t('reports.tabLossShrinkage', 'Loss & Shrinkage')}</span>
        </button>
      </div>

      {/* Main Reports Scrollable Body Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin space-y-4">
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* SALES TRANSACTION STREAM & ANALYTICS VIEW */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {activeReportTab === 'SALES_STREAM' && (
        <div className="space-y-5">
          {/* Synchronized Date Filter Ribbon */}
          <div className="p-5 rounded-3xl neu-card-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <span>{t('reports.salesPeriod', 'Sales Period:')}</span>
              </div>

              <div className="w-44">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={t('reports.startDate', 'Start Date...')}
                  presets={false}
                />
              </div>

              <span className="text-slate-400 font-bold text-xs">{t('common.to', 'to')}</span>

              <div className="w-44">
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={t('reports.endDate', 'End Date...')}
                  presets={false}
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="neu-btn px-3 py-2 rounded-xl text-slate-500 hover:text-rose-500 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={t('common.reset', 'Reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('common.reset', 'Reset')}</span>
                </button>
              )}
            </div>

            {/* Quick Presets & Export */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 neu-tab-container p-1 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.today', 'Today')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('7days')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.last7days', 'Last 7 Days')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('month')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.thisMonth', 'This Month')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.allTime', 'All Time')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleExport('sales', '/export/sales/excel', '39pos_sales_report.xlsx')}
                disabled={exportStates.sales === 'loading'}
                className="neu-btn-primary py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
                title={t('reports.exportSalesReport', 'Export Sales Report (.xlsx)')}
              >
                {renderExportIcon(exportStates.sales)}
                <span>{getExportLabel(exportStates.sales, t('reports.exportSalesReportShort', 'Export Excel'))}</span>
              </button>
            </div>
          </div>

          {/* Top KPI Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.totalVolume', 'Sales Volume')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono flex items-baseline gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400">{filteredSales.length}</span>
                <span className="text-xs font-bold text-slate-400">{t('reports.unitOrders', 'Orders')}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.acrossAllChannels', 'Across all channels')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.grossSales', 'Total Sales Revenue')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                {format(convert(totalFilteredRevenue, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.grossRevenue', 'Gross settled revenue')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.averageTicket', 'Average Ticket')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-sky-500">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight font-mono">
                {format(convert(averageTicket, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.perTransaction', 'Per transaction average')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.channelCoverage', 'Active Channels')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-purple-500">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono flex items-baseline gap-1.5">
                <span>{channelBreakdown.length}</span>
                <span className="text-xs font-bold text-slate-400">{t('reports.unitChannels', 'Channels')}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.omnichannelMix', 'Omnichannel platform mix')}
              </div>
            </div>
          </div>

          {/* Visual Sales Analytics Charts */}
          <ReportsChartSection
            sales={sales}
            filteredSales={filteredSales}
            allReportingChannels={allReportingChannels}
            selectedChannel={selectedChannel}
            onSelectChannel={(ch) => setSelectedChannel(ch)}
          />

          {/* Channel Pills Filter Ribbon */}
          <div className="p-2 neu-tab-container rounded-2xl flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedChannel('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedChannel === 'ALL'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('reports.allChannels', 'All Channels')} ({sales.length})
            </button>

            {allReportingChannels.map((ch) => {
              const count = sales.filter((s) => isChannelMatch(s.channel, ch.code)).length;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.code)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedChannel === ch.code
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {renderChannelIcon(ch.code, (ch as any).icon)}
                  <span>{ch.label}</span>
                  <span className="opacity-60 text-[10px] font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Sales Transaction Stream Table & Actionable Ledger */}
          <div className="neu-card-lg rounded-3xl overflow-hidden">
            {/* Search & Status Filter Bar */}
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white block">{t('reports.salesTransactionLedger', 'Sales Transaction Ledger')}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({filteredSales.length} {t('reports.transactions', 'Transactions')})</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('reports.searchSalesPlaceholder', 'Search Invoice, Customer, Phone...')}
                    className="neu-input w-full pl-8 pr-7 py-2 rounded-xl text-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-1 neu-tab-container p-1 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setPaymentStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      paymentStatusFilter === 'ALL'
                        ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {t('common.all', 'All')}
                  </button>
                  <button
                    onClick={() => setPaymentStatusFilter('PAID')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      paymentStatusFilter === 'PAID'
                        ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'text-slate-500 hover:text-emerald-500'
                    }`}
                  >
                    {t('reports.paid', 'Paid')}
                  </button>
                  <button
                    onClick={() => setPaymentStatusFilter('PENDING_COD')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      paymentStatusFilter === 'PENDING_COD'
                        ? 'neu-tab-active text-amber-600 dark:text-amber-400 font-extrabold'
                        : 'text-slate-500 hover:text-amber-500'
                    }`}
                  >
                    {t('reports.pendingCod', 'Pending COD')}
                  </button>
                  <button
                    onClick={() => setPaymentStatusFilter('UNPAID')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      paymentStatusFilter === 'UNPAID'
                        ? 'neu-tab-active text-rose-600 dark:text-rose-400 font-extrabold'
                        : 'text-slate-500 hover:text-rose-500'
                    }`}
                  >
                    {t('reports.unpaid', 'Unpaid')}
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                  {t('reports.loadingSalesStream', 'Loading sales stream...')}
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs font-semibold">
                  <Receipt className="w-7 h-7 opacity-30" />
                  <span>{t('reports.noSalesTransactions', 'No sales transactions found for the selected filter')}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/80 select-none">
                    <tr>
                      <th
                        onClick={() => handleToggleSalesSort('INVOICE')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colInvoiceRef', 'Invoice / Ref')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'INVOICE' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleSalesSort('DATE')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colDateTime', 'Date & Time')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'DATE' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleSalesSort('CHANNEL')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colChannel', 'Channel')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'CHANNEL' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th className="p-4 min-w-[200px]">{t('reports.colItems', 'Items / Menu')}</th>

                      <th
                        onClick={() => handleToggleSalesSort('QTY')}
                        className="p-4 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{t('reports.colQty', 'QTY')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'QTY' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleSalesSort('CUSTOMER')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colCustomer', 'Customer')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'CUSTOMER' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleSalesSort('PAYMENT')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colPaymentMethod', 'Payment Method')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'PAYMENT' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleSalesSort('STATUS')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colStatus', 'Status')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'STATUS' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleSalesSort('AMOUNT')}
                        className="p-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{t('reports.colTotalAmount', 'Total Amount')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              salesSortField === 'AMOUNT' ? 'text-emerald-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th className="p-4 text-right">{t('reports.colActions', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/50 font-medium text-slate-700 dark:text-slate-300">
                    {paginatedSales.map((s) => {
                      const platform = getPlatformDisplay(s);
                      const isPaid = s.paymentStatus === 'PAID';
                      const isCod = s.isCod || s.paymentStatus === 'PENDING_COD';

                      // Extract item names without qty for the Items column
                      const itemNamesList = s.itemNames
                        ? s.itemNames.split(', ')
                        : s.itemsSummary
                        ? s.itemsSummary.split(', ').map((it: string) => it.replace(/\s*x\d+/g, ''))
                        : [];

                      return (
                        <tr
                          key={s.id}
                          onClick={() => openAuditDrawer(s)}
                          className="hover:bg-slate-200/30 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="p-4">
                            <div className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                              {s.invoiceNo}
                            </div>
                            {s.externalOrderId && (
                              <span className="font-mono text-[10px] text-slate-400 block">{s.externalOrderId}</span>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {s.createdAt ? new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>

                          <td className="p-4">
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                                platform.code === 'POS_RC'
                                  ? 'neu-pill text-amber-600 dark:text-amber-400'
                                  : platform.code === 'POS_MR'
                                  ? 'neu-pill text-emerald-600 dark:text-emerald-400'
                                  : 'neu-pill text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {renderChannelIcon(platform.code, (platform as any).icon)}
                              <span>{platform.label}</span>
                            </div>
                            {s.tableNo && (
                              <div className="text-[10px] text-amber-500 dark:text-amber-400 font-bold mt-0.5 flex items-center gap-1">
                                <span>🪑 Table {s.tableNo}</span>
                              </div>
                            )}
                          </td>

                          {/* 1. Items / Menu Column */}
                          <td className="p-4 max-w-xs">
                            {itemNamesList.length > 0 ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {itemNamesList.slice(0, 3).map((itName: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-lg neu-sunken-sm text-slate-800 dark:text-slate-200 text-[11px] font-medium"
                                  >
                                    {itName}
                                  </span>
                                ))}
                                {itemNamesList.length > 3 && (
                                  <span className="text-[10px] font-bold text-slate-400 px-1">
                                    +{itemNamesList.length - 3} {t('reports.moreItems', 'more')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">—</span>
                            )}
                          </td>

                          {/* 2. Quantity (QTY) Column */}
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg font-mono font-bold text-xs neu-sunken-sm text-slate-800 dark:text-slate-200">
                              {s.itemsCount || (s.itemsSummary ? s.itemsSummary.split(', ').reduce((acc: number, str: string) => {
                                const match = str.match(/x(\d+)/);
                                return acc + (match ? parseInt(match[1], 10) : 1);
                              }, 0) : 1)}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {s.customerName ? `${s.customerName} ${s.customerSurname || ''}`.trim() : s.deliveryContact || t('reports.guestCustomer', 'Guest Customer')}
                            </div>
                            {s.customerPhone ? (
                              <div className="mt-1">
                                <WhatsAppPhoneBadge
                                  phone={s.customerPhone}
                                  text={`Hello! Regarding your invoice ${s.invoiceNo} from 39POS.`}
                                  size="xs"
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-[10px] text-slate-400 block">—</span>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="font-mono text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">
                              {s.paymentMethod || (isCod ? 'COD' : 'CASH')}
                            </span>
                          </td>

                          <td className="p-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill ${
                                isPaid
                                  ? 'text-emerald-500'
                                  : isCod
                                  ? 'text-amber-500'
                                  : 'text-rose-500'
                              }`}
                            >
                              {isPaid
                                ? t('reports.statusPaid', 'PAID')
                                : isCod
                                ? t('reports.statusPendingCod', 'PENDING_COD')
                                : t('reports.statusUnpaid', 'UNPAID')}
                            </span>
                          </td>

                          <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                            {format(convert(s.totalAmount, baseCode, currentCurrency), currentCurrency)}
                          </td>

                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openAuditDrawer(s)}
                              className="neu-circle-btn w-8 h-8 text-slate-500 hover:text-emerald-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title={t('reports.inspectPosSlip', 'Inspect POS Slip & Audit')}
                            >
                              <Eye className="w-3.5 h-3.5" />
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
            {sortedSales.length > 0 && (
              <div className="p-3.5 border-t border-slate-200/40 dark:border-slate-800/80 neu-sunken-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                  {(() => {
                    const start = salesPageSize === -1 ? 1 : (salesEffectivePage - 1) * salesPageSize + 1;
                    const end = salesPageSize === -1 ? sortedSales.length : Math.min(salesEffectivePage * salesPageSize, sortedSales.length);
                    return (
                      <span>
                        Showing {start === end ? start : `${start}–${end}`} of{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{sortedSales.length}</span>{' '}
                        {sortedSales.length === 1 ? 'order' : 'orders'}
                      </span>
                    );
                  })()}
                  <div className="w-32">
                    <CustomSelect
                      value={String(salesPageSize)}
                      onChange={(val) => {
                        setSalesPageSize(Number(val));
                        setSalesPage(1);
                      }}
                      options={[
                        { value: '10', label: '10 / page' },
                        { value: '25', label: '25 / page' },
                        { value: '50', label: '50 / page' },
                        { value: '100', label: '100 / page' },
                        { value: '-1', label: 'All orders' },
                      ]}
                      placement="up"
                      size="sm"
                    />
                  </div>
                </div>

                {salesPageSize !== -1 && salesTotalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSalesPage(1)}
                      disabled={salesEffectivePage === 1}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                      disabled={salesEffectivePage === 1}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: salesTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === salesTotalPages || Math.abs(p - salesEffectivePage) <= 1)
                        .reduce((acc: (number | string)[], p, idx, arr) => {
                          if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                            acc.push('...');
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((pageItem, idx) => {
                          if (pageItem === '...') {
                            return (
                              <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-mono">
                                …
                              </span>
                            );
                          }
                          const p = pageItem as number;
                          const isActive = p === salesEffectivePage;
                          return (
                            <button
                              key={p}
                              onClick={() => setSalesPage(p)}
                              className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                                isActive
                                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                                  : 'neu-btn text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => setSalesPage((p) => Math.min(salesTotalPages, p + 1))}
                      disabled={salesEffectivePage === salesTotalPages}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSalesPage(salesTotalPages)}
                      disabled={salesEffectivePage === salesTotalPages}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* FINANCIAL P&L VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'FINANCIAL_PNL' && (
        <div className="space-y-5">
          {/* Synchronized Date Filter Ribbon for Financial P&L */}
          <div className="p-5 rounded-3xl neu-card-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <span>{t('reports.pnlPeriod', 'P&L Period:')}</span>
              </div>

              <div className="w-44">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={t('reports.startDate', 'Start Date...')}
                  presets={false}
                />
              </div>

              <span className="text-slate-400 font-bold text-xs">{t('common.to', 'to')}</span>

              <div className="w-44">
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={t('reports.endDate', 'End Date...')}
                  presets={false}
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="neu-btn px-3 py-2 rounded-xl text-slate-500 hover:text-rose-500 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={t('common.reset', 'Reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('common.reset', 'Reset')}</span>
                </button>
              )}
            </div>

            {/* View Mode Toggle & Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 neu-tab-container p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPnlViewMode('CHARTS')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    pnlViewMode === 'CHARTS'
                      ? 'neu-tab-active text-purple-600 dark:text-purple-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                  <span>{t('reports.visualAnalytics', 'Visual Analytics')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPnlViewMode('STATEMENT')}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    pnlViewMode === 'STATEMENT'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('reports.incomeStatement', 'Income Statement')}</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 neu-tab-container p-1 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.today', 'Today')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('7days')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.last7days', 'Last 7 Days')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('month')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.thisMonth', 'This Month')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all cursor-pointer"
                >
                  {t('reports.allTime', 'All Time')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleExport('pnl', '/export/pnl/excel', '39pos_financial_pnl.xlsx')}
                disabled={exportStates.pnl === 'loading'}
                className="neu-btn-primary py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
                title={t('reports.exportPnl', 'Export P&L Statement (.xlsx)')}
              >
                {renderExportIcon(exportStates.pnl)}
                <span>{getExportLabel(exportStates.pnl, t('reports.exportPnlShort', 'Export P&L (.xlsx)'))}</span>
              </button>
            </div>
          </div>

          {/* Top Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.colRevenue', 'Gross Incomes')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                {format(convert(totalGrossIncome, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.subSalesMiscIncomes', 'Sales + Misc Incomes')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.colExpenses', 'Total Costs & OPEX')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-rose-500">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
                {format(convert(totalExpenses, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.subOperatingFreightLosses', 'COGS + Freight + OPEX')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.colProfitLoss', 'Net Profit')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl lg:text-3xl font-black tracking-tight font-mono ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {format(convert(netProfit, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.subIncomesMinusExpenses', 'Incomes minus Expenses')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.netProfitMargin', 'Net Profit Margin')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-purple-500">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono">
                {profitMargin.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.subProfitabilityRatio', 'Profitability Ratio')}
              </div>
            </div>
          </div>

          {/* Conditional Rendering: Visual Charts View VS Formal Income Statement */}
          {pnlViewMode === 'CHARTS' ? (
            <>
              {/* Visual P&L Charts */}
              <FinancialPnlCharts
                filteredSales={filteredSales}
                filteredExpenses={filteredExpenses}
                filteredIncomes={filteredIncomes}
                deliveryFreightLosses={deliveryFreightLosses}
                selectedCategory={selectedPnlCategory}
                onSelectCategory={(c) => setSelectedPnlCategory(c)}
              />

              {/* Quick Action & Category Filtering Bar */}
              <div className="p-4 rounded-3xl neu-card-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pnlSearchQuery}
                      onChange={(e) => setPnlSearchQuery(e.target.value)}
                      placeholder={t('reports.filterExpensesIncomes', 'Filter expenses & incomes...')}
                      className="neu-input w-full pl-8 pr-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1 neu-tab-container p-1 rounded-xl text-[11px] font-bold overflow-x-auto">
                    {['ALL', 'OPERATIONS', 'SUPPLIES', 'RENT_UTILITIES', 'SALARIES', 'FREIGHT_LOSS'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedPnlCategory(cat)}
                        className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                          selectedPnlCategory === cat
                            ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {cat === 'ALL' ? t('common.all', 'ALL') : t(`expenseCategory.${cat}`, cat)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* + Record Expense / Income Button */}
                <button
                  onClick={() => setRecordModalOpen(true)}
                  className="neu-btn-primary px-4 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('reports.btnRecordExpenseIncome', '+ Record Expense / Income')}</span>
                </button>
              </div>

              {/* Income vs Expenses Side-by-Side Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                {/* Income Streams */}
                <div className="p-5 rounded-3xl neu-card-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/80 pb-2.5">
                    <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg neu-sunken-sm flex items-center justify-center text-emerald-500">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <span>{t('reports.incomesRevenueStreams', 'Incomes & Revenue Streams')}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-500">{format(convert(totalGrossIncome, baseCode, currentCurrency), currentCurrency)}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3.5 rounded-2xl neu-card-sm flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{t('reports.posOnlineSalesRev', 'POS & Online Sales Revenue')}</div>
                        <div className="text-[10px] text-slate-400">
                          {t('reports.totalSettledReceipts', 'Total settled customer receipts ({{count}} orders)', { count: filteredSales.length })}
                        </div>
                      </div>
                      <span className="font-mono font-black text-slate-900 dark:text-white">{format(convert(grossSalesRevenue, baseCode, currentCurrency), currentCurrency)}</span>
                    </div>

                    {filteredIncomes.map((inc) => (
                      <div key={inc.id} className="p-3.5 rounded-2xl neu-card-sm flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white">{inc.title || inc.description || t('reports.otherIncome', 'Other Income')}</div>
                          <div className="text-[10px] text-slate-400">{inc.category ? String(t(`expenseCategory.${inc.category}`, inc.category)) : 'MISC'} • {new Date(inc.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span className="font-mono font-black text-emerald-500">+{format(convert(inc.amount, baseCode, currentCurrency), currentCurrency)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expense Streams */}
                <div className="p-5 rounded-3xl neu-card-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/80 pb-2.5">
                    <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg neu-sunken-sm flex items-center justify-center text-rose-500">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      </div>
                      <span>{t('reports.operationalFreightExpenses', 'Operational & Freight Expenses')}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-500">{format(convert(totalExpenses, baseCode, currentCurrency), currentCurrency)}</span>
                  </div>

                  <div className="space-y-2">
                    {deliveryFreightLosses > 0 && (selectedPnlCategory === 'ALL' || selectedPnlCategory === 'FREIGHT_LOSS') && (
                      <div className="p-3.5 rounded-2xl neu-card-sm border-l-4 border-rose-500 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-rose-600 dark:text-rose-400">{t('reports.codLosses', 'COD Freight / Return Losses')}</div>
                          <div className="text-[10px] text-rose-500/80">{t('reports.courierShippingFeesLost', 'Courier shipping fees lost on refused COD orders')}</div>
                        </div>
                        <span className="font-mono font-black text-rose-500">-{format(convert(deliveryFreightLosses, baseCode, currentCurrency), currentCurrency)}</span>
                      </div>
                    )}

                    {filteredExpenses.length === 0 && deliveryFreightLosses === 0 ? (
                      <div className="py-8 text-center text-slate-400">{t('reports.noRecordedExpenses', 'No recorded operating expenses for this filter.')}</div>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <div key={exp.id} className="p-3.5 rounded-2xl neu-card-sm flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white">{exp.description || exp.title || t('reports.storeExpense', 'Store Expense')}</div>
                            <div className="text-[10px] text-slate-400">{exp.category ? String(t(`expenseCategory.${exp.category}`, exp.category)) : 'OPERATIONS'} • {new Date(exp.createdAt).toLocaleDateString()}</div>
                          </div>
                          <span className="font-mono font-black text-rose-500">-{format(convert(exp.amount, baseCode, currentCurrency), currentCurrency)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </>

          ) : (
            /* 3-Tier Formal Income Statement Mode */
            <FormalIncomeStatement
              startDate={startDate}
              endDate={endDate}
              grossSalesRevenue={grossSalesRevenue}
              filteredIncomes={filteredIncomes}
              totalCogs={totalCogs}
              deliveryFreightLosses={deliveryFreightLosses}
              sellerPaidDeliveryFees={sellerPaidDeliveryFees}
              filteredExpenses={filteredExpenses}
              totalGrossIncome={totalGrossIncome}
              totalExpenses={totalExpenses}
              netProfit={netProfit}
              profitMargin={profitMargin}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* COD INTELLIGENCE & DELIVERY LOSSES VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'COD_ANALYTICS' && (
        <div className="space-y-5">
          {/* Synchronized Date Filter Ribbon */}
          {/* Date Filter & Control Bar */}
          <div className="p-5 rounded-3xl neu-card-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <span>{t('reports.codDispatchPeriod', 'COD Dispatch Period:')}</span>
              </div>

              <div className="w-44">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={t('reports.startDate', 'Start Date...')}
                  presets={false}
                />
              </div>

              <span className="text-slate-400 font-bold text-xs">{t('common.to', 'to')}</span>

              <div className="w-44">
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={t('reports.endDate', 'End Date...')}
                  presets={false}
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="neu-btn px-3 py-2 rounded-xl text-slate-500 hover:text-rose-500 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={t('common.reset', 'Reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('common.reset', 'Reset')}</span>
                </button>
              )}
            </div>

            {/* Quick Presets & Export */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 neu-tab-container p-1 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all cursor-pointer"
                >
                  {t('reports.today', 'Today')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('7days')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all cursor-pointer"
                >
                  {t('reports.last7days', 'Last 7 Days')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('month')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all cursor-pointer"
                >
                  {t('reports.thisMonth', 'This Month')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all cursor-pointer"
                >
                  {t('reports.allTime', 'All Time')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleExport('cod', '/export/cod/excel', '39pos_cod_deliveries.xlsx')}
                disabled={exportStates.cod === 'loading'}
                className="neu-btn-accent py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50 text-amber-600 dark:text-amber-300"
                title={t('reports.exportCod', 'Export COD Deliveries (.xlsx)')}
              >
                {renderExportIcon(exportStates.cod)}
                <span>{getExportLabel(exportStates.cod, t('reports.exportCodShort', 'Export COD (.xlsx)'))}</span>
              </button>
            </div>
          </div>

          {/* Top COD KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.totalCodOrders', 'Total COD Orders')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-amber-500 tracking-tight font-mono flex items-baseline gap-1.5">
                <span>{filteredCodSales.length}</span>
                <span className="text-xs font-bold text-slate-400">{t('reports.unitOrders', 'Orders')}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.codSubOnlineInHouse', 'Online & In-House COD')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.collectedCodRev', 'Collected COD Rev')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                {format(convert(codSettledAmount, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.settledCashInDrawer', 'Settled cash in drawer')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.pendingCodTransit', 'Pending COD in Transit')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-sky-500">
                  <PackageCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight font-mono">
                {format(convert(codPendingAmount, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.riderInTransit', 'Rider / Courier in transit')}
              </div>
            </div>

            <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('reports.codReturnRate', 'COD Return / Refusal Rate')}
                </span>
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-rose-500">
                  <Ban className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
                {codRejectionRate.toFixed(1)}%
              </div>
              <div className="text-[11px] text-rose-500 font-medium pt-1.5 border-t border-slate-200/40 dark:border-slate-800/50">
                {t('reports.lossLabel', 'Loss:')} {format(convert(codFreightLossTotal, baseCode, currentCurrency), currentCurrency)}
              </div>
            </div>
          </div>

          {/* Visual COD Analytics (Courier Performance & Pipeline Stage Funnel) */}
          <CodAnalyticsCharts
            codSales={filteredCodSales}
            selectedStage={selectedCodStage}
            onSelectStage={(st) => setSelectedCodStage(st)}
          />

          {/* COD Delivery Stream Section & Actionable Ledger */}
          <div className="neu-card-lg rounded-3xl overflow-hidden">
            {/* Table Search & Filter Bar */}
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white block">{t('reports.codDeliveryStream', 'COD Delivery Stream & Settlement')}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({filteredCodSales.length} {t('reports.unitOrders', 'Orders')})</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={codSearchQuery}
                    onChange={(e) => setCodSearchQuery(e.target.value)}
                    placeholder={t('reports.searchCodPlaceholder', 'Search Tracking#, Invoice, Customer...')}
                    className="neu-input w-full pl-8 pr-7 py-2 rounded-xl text-xs"
                  />
                  {codSearchQuery && (
                    <button
                      onClick={() => setCodSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Stage Filters */}
                <div className="flex items-center gap-1 neu-tab-container p-1 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setSelectedCodStage('ALL')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedCodStage === 'ALL'
                        ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {t('common.all', 'All')}
                  </button>
                  <button
                    onClick={() => setSelectedCodStage('IN_TRANSIT')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedCodStage === 'IN_TRANSIT'
                        ? 'neu-tab-active text-amber-600 dark:text-amber-400 font-extrabold'
                        : 'text-slate-500 hover:text-amber-500'
                    }`}
                  >
                    {t('reports.stageInTransit', 'In Transit')}
                  </button>
                  <button
                    onClick={() => setSelectedCodStage('SETTLED')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedCodStage === 'SETTLED'
                        ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'text-slate-500 hover:text-emerald-500'
                    }`}
                  >
                    {t('reports.stageSettled', 'Settled')}
                  </button>
                  <button
                    onClick={() => setSelectedCodStage('REFUSED')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedCodStage === 'REFUSED'
                        ? 'neu-tab-active text-rose-600 dark:text-rose-400 font-extrabold'
                        : 'text-slate-500 hover:text-rose-500'
                    }`}
                  >
                    {t('reports.stageRefused', 'Refused')}
                  </button>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                  {t('reports.loadingCod', 'Loading COD orders...')}
                </div>
              ) : filteredCodSales.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-xs font-semibold">
                  <Truck className="w-7 h-7 opacity-30" />
                  <span>{t('reports.noCodDeliveries', 'No COD deliveries found for the selected filter')}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/80 select-none">
                    <tr>
                      <th
                        onClick={() => handleToggleCodSort('INVOICE')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colInvoiceRef', 'Invoice / Ref')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              codSortField === 'INVOICE' ? 'text-amber-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleCodSort('COURIER')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colCourierTracking', 'Courier & Tracking')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              codSortField === 'COURIER' ? 'text-amber-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleCodSort('RECIPIENT')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colRecipientRisk', 'Recipient & Risk')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              codSortField === 'RECIPIENT' ? 'text-amber-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleCodSort('AMOUNT')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colCodCollectable', 'COD Collectable')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              codSortField === 'AMOUNT' ? 'text-amber-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleCodSort('STAGE')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colDeliveryStage', 'Delivery Stage')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              codSortField === 'STAGE' ? 'text-amber-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th
                        onClick={() => handleToggleCodSort('STATUS')}
                        className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('reports.colSettlementStatus', 'Settlement Status')}</span>
                          <ArrowUpDown
                            className={`w-3.5 h-3.5 ${
                              codSortField === 'STATUS' ? 'text-amber-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      </th>

                      <th className="p-4 text-right">{t('reports.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/50 font-medium text-slate-700 dark:text-slate-300">
                    {paginatedCodSales.map((s) => {
                      const isSettled = s.paymentStatus === 'PAID' || s.fulfillmentStatus === 'DELIVERED';
                      const isRefused = s.fulfillmentStatus === 'CANCELLED' || s.pipelineStage === 'REJECTED';
                      const isBlacklisted = Boolean(s.isBlacklisted || (s.codRejectionCount && s.codRejectionCount >= 2));

                      return (
                        <tr
                          key={s.id}
                          onClick={() => openAuditDrawer(s)}
                          className="hover:bg-slate-200/30 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="p-4">
                            <div className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                              {s.invoiceNo}
                            </div>
                            {s.externalOrderId && (
                              <span className="font-mono text-[10px] text-slate-400 block">{s.externalOrderId}</span>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {s.courierName || t('reports.inHouseCourier', 'In-House Courier')}
                            </div>
                            <span className="font-mono text-[11px] text-slate-400 block">
                              {s.courierTrackingNo || t('reports.noTrackingNo', 'No Tracking #')}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {s.customerName ? `${s.customerName} ${s.customerSurname || ''}`.trim() : s.deliveryContact || t('reports.guestDelivery', 'Guest Delivery')}
                              </span>
                              {isBlacklisted && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1"
                                  title="Customer has multiple past COD returns"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>{t('reports.highRisk', 'High Risk')}</span>
                                </span>
                              )}
                            </div>
                            {s.customerPhone || (s.deliveryContact && /[\d+]/.test(s.deliveryContact)) ? (
                              <div className="mt-1">
                                <WhatsAppPhoneBadge
                                  phone={s.customerPhone || s.deliveryContact}
                                  text={`Hello! Regarding your COD delivery ${s.invoiceNo} from 39POS.`}
                                  size="xs"
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-[10px] text-slate-400 block">—</span>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="font-mono font-bold text-amber-500">
                              {format(convert(s.totalAmount, baseCode, currentCurrency), currentCurrency)}
                            </div>
                            {s.deliveryFee > 0 && (
                              <div className="mt-0.5">
                                {s.deliveryFeePayer === 'SELLER_PAYS' ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Store Free Shipping Promotion (OPEX Cost)">
                                    🏪 Free Ship (-{format(convert(s.deliveryFee, baseCode, currentCurrency), currentCurrency)})
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500" title="Customer Paid on Arrival">
                                    👤 Ship (+{format(convert(s.deliveryFee, baseCode, currentCurrency), currentCurrency)})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold neu-pill text-slate-700 dark:text-slate-300">
                              {s.pipelineStage || 'NEW'}
                            </span>
                          </td>

                          <td className="p-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill ${
                                isSettled
                                  ? 'text-emerald-500'
                                  : isRefused
                                  ? 'text-rose-500'
                                  : 'text-amber-500'
                              }`}
                            >
                              {isSettled
                                ? t('reports.statusSettledPaid', 'SETTLED (PAID)')
                                : isRefused
                                ? t('reports.statusRefusedReturned', 'REFUSED / RETURNED')
                                : t('reports.statusPendingCash', 'PENDING CASH')}
                            </span>
                          </td>

                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {!isSettled && !isRefused && (
                                <>
                                  <button
                                    onClick={() => handleCompleteCod(s.id)}
                                    className="neu-btn-primary px-2.5 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    title="Settle COD Cash into drawer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{t('reports.btnSettleCash', 'Settle Cash')}</span>
                                  </button>

                                  <button
                                    onClick={() => openRefusalModal(s)}
                                    className="neu-btn-danger px-2.5 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    title="Mark Refused / Auto Restock"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>{t('reports.btnRefuse', 'Refuse')}</span>
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => openAuditDrawer(s)}
                                className="neu-circle-btn w-8 h-8 text-slate-500 hover:text-amber-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Inspect POS Slip"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            {sortedCodSales.length > 0 && (
              <div className="p-3.5 border-t border-slate-200/40 dark:border-slate-800/80 neu-sunken-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                  {(() => {
                    const start = codPageSize === -1 ? 1 : (codEffectivePage - 1) * codPageSize + 1;
                    const end = codPageSize === -1 ? sortedCodSales.length : Math.min(codEffectivePage * codPageSize, sortedCodSales.length);
                    return (
                      <span>
                        Showing {start === end ? start : `${start}–${end}`} of{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{sortedCodSales.length}</span>{' '}
                        {sortedCodSales.length === 1 ? 'order' : 'orders'}
                      </span>
                    );
                  })()}
                  <div className="w-32">
                    <CustomSelect
                      value={String(codPageSize)}
                      onChange={(val) => {
                        setCodPageSize(Number(val));
                        setCodPage(1);
                      }}
                      options={[
                        { value: '10', label: '10 / page' },
                        { value: '25', label: '25 / page' },
                        { value: '50', label: '50 / page' },
                        { value: '100', label: '100 / page' },
                        { value: '-1', label: 'All orders' },
                      ]}
                      placement="up"
                      size="sm"
                    />
                  </div>
                </div>

                {codPageSize !== -1 && codTotalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCodPage(1)}
                      disabled={codEffectivePage === 1}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCodPage((p) => Math.max(1, p - 1))}
                      disabled={codEffectivePage === 1}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: codTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === codTotalPages || Math.abs(p - codEffectivePage) <= 1)
                        .reduce((acc: (number | string)[], p, idx, arr) => {
                          if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                            acc.push('...');
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((pageItem, idx) => {
                          if (pageItem === '...') {
                            return (
                              <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-mono">
                                …
                              </span>
                            );
                          }
                          const p = pageItem as number;
                          const isActive = p === codEffectivePage;
                          return (
                            <button
                              key={p}
                              onClick={() => setCodPage(p)}
                              className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                                isActive
                                  ? 'neu-tab-active text-amber-600 dark:text-amber-400 font-extrabold'
                                  : 'neu-btn text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => setCodPage((p) => Math.min(codTotalPages, p + 1))}
                      disabled={codEffectivePage === codTotalPages}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCodPage(codTotalPages)}
                      disabled={codEffectivePage === codTotalPages}
                      className="neu-circle-btn w-7 h-7 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* CASH FLOW AUTO SUMMARIZE VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'CASH_FLOW' && (
        <CashFlowReport
          sales={sales}
          expenses={expenses}
          incomes={incomes}
          purchases={purchases}
          startDate={startDate}
          endDate={endDate}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          onExportExcel={() => handleExport('cashflow', '/export/cash-flow/excel', '39pos_cash_flow_summary.xlsx')}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* 24-HOUR SALES VELOCITY & HEATMAP VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'HOURLY_HEATMAP' && (
        <HourlyHeatmapReport sales={sales} filteredSales={filteredSales} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* STOCKOUT RISK & AUTOMATED REORDER FORECAST VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'REORDER_FORECAST' && (
        <ReorderForecastReport sales={sales} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MULTI-CURRENCY REALIZED FX GAIN/LOSS VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'FX_ANALYTICS' && (
        <FxAnalyticsReport sales={sales} filteredSales={filteredSales} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* SHIFT Z-REPORT & CASH DRAWER RECONCILIATION VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'SHIFT_Z_REPORT' && (
        <ShiftZReport sales={sales} startDate={startDate} endDate={endDate} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* SKU PROFITABILITY & PRODUCT MARGIN MATRIX VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'PRODUCT_MARGINS' && (
        <ProductMarginMatrix sales={sales} startDate={startDate} endDate={endDate} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* LOSS & SHRINKAGE ANALYTICS VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeReportTab === 'LOSS_SHRINKAGE' && (
        <LossShrinkageReport startDate={startDate} endDate={endDate} />
      )}
      </div>

      {/* Slide-over POS Slip & Transaction Audit Drawer */}

      <TransactionAuditDrawer
        saleId={selectedSaleId}
        initialSaleData={selectedSaleData}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedSaleId(null);
          setSelectedSaleData(null);
        }}
      />

      {/* Quick Record Expense / Income Modal */}
      <QuickRecordTransactionModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSuccess={() => {
          fetchFinancialData();
          showToast('Transaction entry recorded successfully!', 'success');
        }}
      />

      {/* COD Delivery Refusal & Restock Modal */}
      <CodRefusalModal
        sale={selectedSaleForRefusal}
        isOpen={refusalModalOpen}
        onClose={() => {
          setRefusalModalOpen(false);
          setSelectedSaleForRefusal(null);
        }}
        onSuccess={() => {
          fetchSales();
          showToast('COD delivery marked as refused and restocked', 'success');
        }}
      />
    </div>
  );
};
