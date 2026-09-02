import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { usePlatformStore } from '../../store/usePlatformStore';
import { useCourierStore, DeliveryFeePayer } from '../../store/useCourierStore';
import { useLiveOrdersStore } from '../../store/useLiveOrdersStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PrintEngine, PrintableReceiptData } from '../../utils/printEngine';
import { MinimalPrintModal } from '../common/MinimalPrintModal';
import { soundFX } from '../../utils/audio';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { WhatsAppPhoneBadge } from '../common/WhatsAppPhoneBadge';
import {
  ShoppingBag,
  Truck,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign,
  Building,
  CheckSquare,
  Square,
  Check,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  Calendar,
  Package,
  Sparkles,
  SlidersHorizontal,
  Undo2,
  Banknote,
  Coins,
  Receipt,
  ShieldCheck,
  ArrowUpDown,
  Filter,
  X,
  Layers,
  Flame,
  CreditCard,
  Archive,
  ArchiveRestore,
  FolderArchive,
} from 'lucide-react';

export type OrderSortField = 'TIME' | 'INVOICE' | 'CUSTOMER' | 'ITEMS' | 'COURIER' | 'AMOUNT' | 'STAGE';

export type PipelineStage =
  | 'ALL'
  | 'NEW'
  | 'PRINT_BILL'
  | 'EXPRESS_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'WAITING_PICKUP'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ARCHIVED';

const STAGES_CONFIG: { id: PipelineStage; label: string; Icon: React.ComponentType<{ className?: string }>; color: string; badge: string }[] = [
  { id: 'ALL', label: 'All Orders', Icon: ShoppingBag, color: 'text-brand-400', badge: 'bg-brand-500/10 text-brand-400 border-brand-500/30' },
  { id: 'NEW', label: '1. COD New', Icon: Clock, color: 'text-amber-400', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { id: 'PRINT_BILL', label: '2. Bill Printed', Icon: Printer, color: 'text-sky-400', badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { id: 'EXPRESS_ASSIGNED', label: '3. Express Assigned', Icon: Building, color: 'text-purple-400', badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { id: 'OUT_FOR_DELIVERY', label: '4. Out for Delivery', Icon: Truck, color: 'text-blue-400', badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { id: 'WAITING_PICKUP', label: '5. Waiting Pick Up', Icon: MapPin, color: 'text-indigo-400', badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
  { id: 'COMPLETED', label: '6. Completed (Settled)', Icon: CheckCircle2, color: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { id: 'REJECTED', label: '7. Rejected / Returned', Icon: XCircle, color: 'text-rose-400', badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { id: 'ARCHIVED', label: '8. Archive Orders', Icon: Archive, color: 'text-slate-400', badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
];

const PIPELINE_STEPS = [
  { stage: 'NEW', stepNum: 1, label: 'COD New', icon: Clock },
  { stage: 'PRINT_BILL', stepNum: 2, label: 'Bill Printed', icon: Printer },
  { stage: 'EXPRESS_ASSIGNED', stepNum: 3, label: 'Express Assigned', icon: Building },
  { stage: 'OUT_FOR_DELIVERY', stepNum: 4, label: 'Out for Delivery', icon: Truck },
  { stage: 'WAITING_PICKUP', stepNum: 5, label: 'Waiting Pickup', icon: MapPin },
  { stage: 'COMPLETED', stepNum: 6, label: 'Settled & Paid', icon: CheckCircle2 },
];

const STAGE_ORDER_MAP: Record<string, number> = {
  NEW: 1,
  PRINT_BILL: 2,
  EXPRESS_ASSIGNED: 3,
  OUT_FOR_DELIVERY: 4,
  WAITING_PICKUP: 5,
  COMPLETED: 6,
  REJECTED: 7,
  ARCHIVED: 8,
};

const getStageHeroConfig = (
  stage: string,
  t: any
): { title: string; subtitle: string; bg: string; border: string; text: string; glow: string } => {
  switch (stage) {
    case 'NEW':
      return {
        title: t('pipeline.heroStep1Title', 'STEP 1/6 • COD NEW ORDER'),
        subtitle: t('pipeline.heroStep1Sub', 'Waiting for bill receipt to be printed'),
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-500/20',
      };
    case 'PRINT_BILL':
      return {
        title: t('pipeline.heroStep2Title', 'STEP 2/6 • BILL PRINTED & PACKING'),
        subtitle: t('pipeline.heroStep2Sub', 'Ready to assign express courier / rider'),
        bg: 'bg-sky-500/10 dark:bg-sky-500/15',
        border: 'border-sky-500/30',
        text: 'text-sky-600 dark:text-sky-400',
        glow: 'shadow-sky-500/20',
      };
    case 'EXPRESS_ASSIGNED':
      return {
        title: t('pipeline.heroStep3Title', 'STEP 3/6 • COURIER ASSIGNED'),
        subtitle: t('pipeline.heroStep3Sub', 'Ready for rider pickup & dispatch'),
        bg: 'bg-purple-500/10 dark:bg-purple-500/15',
        border: 'border-purple-500/30',
        text: 'text-purple-600 dark:text-purple-400',
        glow: 'shadow-purple-500/20',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        title: t('pipeline.heroStep4Title', 'STEP 4/6 • OUT FOR DELIVERY (IN TRANSIT)'),
        subtitle: t('pipeline.heroStep4Sub', 'Rider is on the way to customer location'),
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        border: 'border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-500/20',
      };
    case 'WAITING_PICKUP':
      return {
        title: t('pipeline.heroStep5Title', 'STEP 5/6 • WAITING AT PICKUP POINT'),
        subtitle: t('pipeline.heroStep5Sub', 'Staged at collection depot / customer point'),
        bg: 'bg-teal-500/10 dark:bg-teal-500/15',
        border: 'border-teal-500/30',
        text: 'text-teal-600 dark:text-teal-400',
        glow: 'shadow-teal-500/20',
      };
    case 'COMPLETED':
      return {
        title: t('pipeline.heroStep6Title', 'STEP 6/6 • COMPLETED & COD CASH COLLECTED'),
        subtitle: t('pipeline.heroStep6Sub', 'Payment settled as PAID • Points awarded'),
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-500/20',
      };
    case 'REJECTED':
      return {
        title: t('pipeline.heroRejectedTitle', 'REJECTED / RETURNED DELIVERY'),
        subtitle: t('pipeline.heroRejectedSub', 'Items auto-restocked to inventory'),
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        border: 'border-rose-500/30',
        text: 'text-rose-600 dark:text-rose-400',
        glow: 'shadow-rose-500/20',
      };
    case 'ARCHIVED':
      return {
        title: t('pipeline.heroArchivedTitle', '8. ARCHIVE ORDERS • COMPLETED & ARCHIVED'),
        subtitle: t('pipeline.heroArchivedSub', 'Archived delivery orders stored securely'),
        bg: 'bg-slate-500/10 dark:bg-slate-500/15',
        border: 'border-slate-500/30',
        text: 'text-slate-600 dark:text-slate-400',
        glow: 'shadow-slate-500/20',
      };
    default:
      return {
        title: t('pipeline.heroStep1Title', 'STEP 1/6 • COD NEW ORDER'),
        subtitle: t('pipeline.heroStep1Sub', 'Waiting for bill receipt to be printed'),
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-500/20',
      };
  }
};

const COURIER_PRESETS = [
  'Flash Express',
  'J&T Express',
  'Kerry Express',
  'GrabExpress',
  'Lineman Rider',
  'Lalamove',
  'Shopee Xpress',
  'In-House Rider',
  'Customer Self-Pickup',
];

export const LiveOrdersPipeline: React.FC = () => {
  const { t } = useTranslation();
  const { store, receiptConfig } = useSettingsStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<PipelineStage>('NEW');
  const [search, setSearch] = useState('');

  // View Mode: GRID vs LIST
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Multi-Column Sorting State
  const [orderSortField, setOrderSortField] = useState<OrderSortField>('TIME');
  const [orderSortOrder, setOrderSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleToggleOrderSort = (field: OrderSortField) => {
    if (orderSortField === field) {
      setOrderSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderSortField(field);
      setOrderSortOrder(field === 'TIME' || field === 'AMOUNT' || field === 'ITEMS' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Advanced Filters State
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<string>('ALL');
  const [selectedTender, setSelectedTender] = useState<'ALL' | 'COD' | 'PAID'>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Date Range Filter State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDatePreset, setActiveDatePreset] = useState<'today' | '7days' | 'month' | 'all'>('all');

  // Quick Date Presets
  const applyPreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    setActiveDatePreset(preset);
    setCurrentPage(1);

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

  // Detailed Modal Pop-Up State & Transition Wrapping Animation
  const [detailModalOrder, setDetailModalOrder] = useState<any | null>(null);
  const [isClosingModal, setIsClosingModal] = useState<boolean>(false);

  const [highlightStage, setHighlightStage] = useState<string | null>(null);
  const [showStageSelector, setShowStageSelector] = useState<boolean>(false);

  // Pagination for High Volume (50+ / 100+ orders)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Bulk Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkExpressModalOpen, setBulkExpressModalOpen] = useState(false);
  const [bulkExpressForm, setBulkExpressForm] = useState<{
    courierName: string;
    trackingPrefix: string;
    deliveryFee: number;
    deliveryFeePayer: DeliveryFeePayer;
  }>({
    courierName: 'Flash Express',
    trackingPrefix: 'FLX',
    deliveryFee: 25000,
    deliveryFeePayer: 'CUSTOMER_PAYS',
  });
  const [bulkPrintOrders, setBulkPrintOrders] = useState<any[] | null>(null);

  // Single Modals & Dropdown
  const [activeMoreMenuId, setActiveMoreMenuId] = useState<string | null>(null);
  const [expressModalOrder, setExpressModalOrder] = useState<any | null>(null);
  const [expressForm, setExpressForm] = useState<{
    courierName: string;
    trackingNo: string;
    deliveryFee: number;
    deliveryFeePayer: DeliveryFeePayer;
  }>({
    courierName: 'Flash Express',
    trackingNo: '',
    deliveryFee: 25000,
    deliveryFeePayer: 'CUSTOMER_PAYS',
  });

  const [rejectModalOrder, setRejectModalOrder] = useState<any | null>(null);
  const [rejectForm, setRejectForm] = useState({ reason: 'Customer refused / rejected delivery', courierFee: 0 });

  const [printModalOrder, setPrintModalOrder] = useState<any | null>(null);
  const [codConfirmModalOrder, setCodConfirmModalOrder] = useState<any | null>(null);
  const [bulkCodConfirmOpen, setBulkCodConfirmOpen] = useState(false);
  const [isSettlingCod, setIsSettlingCod] = useState(false);

  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const { platforms } = usePlatformStore();
  const { couriers, fetchCouriers } = useCourierStore();

  const fetchLiveOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pos/live-orders');
      const liveOrders = res.data.orders || [];
      setOrders(liveOrders);

      // Sync Step 1 COD New orders count to global store for Sidebar badge
      const step1Count = liveOrders.filter((o: any) => (o.pipelineStage || 'NEW') === 'NEW').length;
      useLiveOrdersStore.getState().setActiveCodCount(step1Count);

      // Keep active detail modal updated if open
      if (detailModalOrder) {
        const updated = liveOrders.find((o: any) => o.id === detailModalOrder.id);
        if (updated) setDetailModalOrder(updated);
      }
    } catch (err) {
      console.error('Failed to fetch live orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
    fetchCouriers();
    const interval = setInterval(fetchLiveOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchCouriers]);

  // Modal Close with Smooth Process Wrapping Transition
  const handleCloseModalWithTransition = (order: any) => {
    if (!order) {
      setDetailModalOrder(null);
      return;
    }
    soundFX.playBeep();
    const targetStage = order.pipelineStage || 'NEW';

    // Start morph & fly upwards wrapping animation
    setIsClosingModal(true);

    // Transition the stage filter tab directly to this order's current process stage!
    setSelectedStage(targetStage as PipelineStage);
    setCurrentPage(1);

    // Trigger stage card catch pulse right as modal arrives at top
    setTimeout(() => {
      setHighlightStage(targetStage);
      soundFX.playCashSuccess();
    }, 150);

    setTimeout(() => {
      setDetailModalOrder(null);
      setIsClosingModal(false);
    }, 320);

    setTimeout(() => {
      setHighlightStage(null);
    }, 2000);
  };

  // Bulk Selection Helpers
  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(paginatedOrders.map((o) => o.id));
    }
  };

  // Single Pipeline Update
  const handleUpdatePipeline = async (orderId: string, stage: string, extra: any = {}) => {
    try {
      soundFX.playCashSuccess();
      await api.patch(`/pos/orders/${orderId}/pipeline`, { stage, ...extra });
      await fetchLiveOrders();
    } catch (err: any) {
      soundFX.playError();
      alert(`Update failed: ${err.message}`);
    }
  };

  // Bulk Pipeline Update
  const handleBulkUpdatePipeline = async (stage: string, extra: any = {}) => {
    if (selectedOrderIds.length === 0) return;
    try {
      soundFX.playCashSuccess();
      await api.post('/pos/orders/batch-pipeline', {
        orderIds: selectedOrderIds,
        stage,
        extraData: extra,
      });
      setSelectedOrderIds([]);
      await fetchLiveOrders();
    } catch (err: any) {
      soundFX.playError();
      alert(`Batch update failed: ${err.message}`);
    }
  };

  const handleBulkCompleteCod = () => {
    if (selectedOrderIds.length === 0) return;
    soundFX.playBeep();
    setBulkCodConfirmOpen(true);
  };

  const handleConfirmBulkCod = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsSettlingCod(true);
    try {
      soundFX.playCashSuccess();
      await api.post('/pos/orders/batch-complete-cod', { orderIds: selectedOrderIds });
      setBulkCodConfirmOpen(false);
      setSelectedOrderIds([]);
      await fetchLiveOrders();
    } catch (err: any) {
      soundFX.playError();
      alert(`Batch settle failed: ${err.message}`);
    } finally {
      setIsSettlingCod(false);
    }
  };

  const handleBulkPrintBills = () => {
    const ordersToPrint = orders.filter((o) => selectedOrderIds.includes(o.id));
    setBulkPrintOrders(ordersToPrint);
    handleBulkUpdatePipeline('PRINT_BILL', { billPrinted: true });
  };

  const handleCompleteCod = (order: any) => {
    soundFX.playBeep();
    setCodConfirmModalOrder(order);
  };

  const handleConfirmSingleCod = async () => {
    if (!codConfirmModalOrder) return;
    setIsSettlingCod(true);
    try {
      soundFX.playCashSuccess();
      await api.post(`/pos/orders/${codConfirmModalOrder.id}/complete-cod`, {});
      const completedId = codConfirmModalOrder.id;
      setCodConfirmModalOrder(null);
      
      // If the detail modal is currently showing this order, close or refresh it
      if (detailModalOrder?.id === completedId) {
        setDetailModalOrder((prev: any) => (prev ? { ...prev, pipelineStage: 'COMPLETED' } : null));
      }
      await fetchLiveOrders();
    } catch (err: any) {
      soundFX.playError();
      alert(`Complete COD failed: ${err.message}`);
    } finally {
      setIsSettlingCod(false);
    }
  };

  const openExpressModal = (order: any) => {
    const activeCouriers = couriers.filter((c) => c.isActive);
    const matched = activeCouriers.find((c) => c.name === order.courierName) || activeCouriers[0] || couriers[0];
    setExpressModalOrder(order);
    setExpressForm({
      courierName: order.courierName || matched?.name || 'Flash Express',
      trackingNo: order.courierTrackingNo || '',
      deliveryFee: order.deliveryFee !== undefined && order.deliveryFee !== null ? Number(order.deliveryFee) : (matched?.defaultFee || 20000),
      deliveryFeePayer: (order.deliveryFeePayer as DeliveryFeePayer) || matched?.defaultFeePayer || 'CUSTOMER_PAYS',
    });
  };

  const handleSaveExpress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expressModalOrder) return;
    try {
      soundFX.playCashSuccess();
      await api.patch(`/pos/orders/${expressModalOrder.id}/pipeline`, {
        stage: 'EXPRESS_ASSIGNED',
        courierName: expressForm.courierName,
        courierTrackingNo: expressForm.trackingNo,
        deliveryFee: expressForm.deliveryFee,
        deliveryFeePayer: expressForm.deliveryFeePayer,
      });
      setExpressModalOrder(null);
      await fetchLiveOrders();
    } catch (err: any) {
      soundFX.playError();
      alert(`Failed to assign express: ${err.message}`);
    }
  };

  const handleSaveReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalOrder) return;
    try {
      soundFX.playError();
      const res = await api.post(`/pos/orders/${rejectModalOrder.id}/reject-cod`, {
        reason: rejectForm.reason,
        deliveryFeeLoss: Number(rejectForm.courierFee) || 0,
      });
      if (res.data?.isNowBlacklisted) {
        alert('⚠️ Customer has now been AUTO-BLACKLISTED from COD due to 2+ delivery refusals.');
      }
      setRejectModalOrder(null);
      await fetchLiveOrders();
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    }
  };

  const [archivingOrderId, setArchivingOrderId] = useState<string | null>(null);

  const handleMoveToArchive = async (order: any) => {
    try {
      setArchivingOrderId(order.id);
      soundFX.playCashSuccess();
      await api.patch(`/pos/orders/${order.id}/pipeline`, {
        stage: 'ARCHIVED',
        fulfillmentStatus: 'DELIVERED',
      });
      await fetchLiveOrders();
    } catch (err: any) {
      soundFX.playError();
      alert(`Failed to archive order: ${err.message}`);
    } finally {
      setArchivingOrderId(null);
    }
  };

  const handleRestoreFromArchive = async (order: any) => {
    try {
      soundFX.playCashSuccess();
      await api.patch(`/pos/orders/${order.id}/pipeline`, {
        stage: 'COMPLETED',
      });
      await fetchLiveOrders();
    } catch (err: any) {
      soundFX.playError();
      alert(`Failed to restore order: ${err.message}`);
    }
  };

  const handlePrintBill = async (order: any) => {
    setPrintModalOrder(order);
    try {
      await api.patch(`/pos/orders/${order.id}/pipeline`, {
        billPrinted: true,
        stage: order.pipelineStage === 'NEW' ? 'PRINT_BILL' : order.pipelineStage,
      });
      await fetchLiveOrders();
    } catch {}
  };

  // Channel & Courier Options for Select Filters
  const channelOptions = useMemo(() => {
    const base = [{ value: 'ALL', label: 'All Channels' }];
    platforms.forEach((p) => {
      base.push({ value: p.code, label: `${p.name} (${p.code})` });
    });
    return base;
  }, [platforms]);

  const courierOptions = useMemo(() => {
    const base = [{ value: 'ALL', label: 'All Couriers' }];
    couriers.forEach((c) => {
      base.push({ value: c.name, label: c.name });
    });
    return base;
  }, [couriers]);

  const isFilterActive =
    selectedChannel !== 'ALL' ||
    selectedCourierFilter !== 'ALL' ||
    selectedTender !== 'ALL' ||
    selectedTimeframe !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const handleResetFilters = () => {
    setSelectedChannel('ALL');
    setSelectedCourierFilter('ALL');
    setSelectedTender('ALL');
    setSelectedTimeframe('ALL');
    setStartDate('');
    setEndDate('');
    setActiveDatePreset('all');
    setSearch('');
    setCurrentPage(1);
  };

  // Base filtered orders (filtered by date range, channel, courier, tender, timeframe, search)
  // Strictly monitors Cash-On-Delivery (COD) orders only!
  const baseFilteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // COD Orders Only
      if (!o.isCod) return false;

      // 0. Date Range filter
      if (startDate || endDate) {
        const d = o.createdAt ? o.createdAt.slice(0, 10) : '';
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      // 1. Channel / Platform filter
      if (selectedChannel !== 'ALL') {
        const orderChannel = (o.channel || '').toUpperCase();
        if (orderChannel !== selectedChannel.toUpperCase()) return false;
      }

      // 2. Courier partner filter
      if (selectedCourierFilter !== 'ALL') {
        const courierName = (o.courierName || '').toLowerCase();
        if (!courierName.includes(selectedCourierFilter.toLowerCase())) return false;
      }

      // 3. Payment tender filter
      if (selectedTender === 'COD' && !o.isCod) return false;
      if (selectedTender === 'PAID' && o.isCod) return false;

      // 4. Timeframe filter
      if (selectedTimeframe !== 'ALL' && o.createdAt) {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

        if (selectedTimeframe === 'TODAY' && orderDate < startOfToday) return false;
        if (selectedTimeframe === 'YESTERDAY' && (orderDate < startOfYesterday || orderDate >= startOfToday)) return false;
        if (selectedTimeframe === 'WEEK' && orderDate < startOfWeek) return false;
      }

      // 5. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchInv = (o.invoiceNo || '').toLowerCase().includes(q);
        const matchExt = (o.externalOrderId || '').toLowerCase().includes(q);
        const matchCust = (o.customerName || o.deliveryContact || '').toLowerCase().includes(q);
        const matchPhone = (o.customerPhone || o.deliveryContact || '').toLowerCase().includes(q);
        const matchCourier = (o.courierName || o.courierTrackingNo || '').toLowerCase().includes(q);
        if (!matchInv && !matchExt && !matchCust && !matchPhone && !matchCourier) return false;
      }

      return true;
    });
  }, [orders, startDate, endDate, selectedChannel, selectedCourierFilter, selectedTender, selectedTimeframe, search]);

  // Filtered orders matching selected stage
  const filteredOrders = useMemo(() => {
    if (selectedStage === 'ALL') return baseFilteredOrders;
    return baseFilteredOrders.filter((o) => o.pipelineStage === selectedStage);
  }, [baseFilteredOrders, selectedStage]);

  // Sorted orders with multi-column sorting
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      let comparison = 0;
      switch (orderSortField) {
        case 'TIME': {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        case 'INVOICE': {
          const invA = (a.invoiceNo || a.id || '').toString();
          const invB = (b.invoiceNo || b.id || '').toString();
          comparison = invA.localeCompare(invB);
          break;
        }
        case 'CUSTOMER': {
          const custA = (a.customerName || a.deliveryContact || '').toString();
          const custB = (b.customerName || b.deliveryContact || '').toString();
          comparison = custA.localeCompare(custB);
          break;
        }
        case 'ITEMS': {
          const itemsA = a.items?.length || 0;
          const itemsB = b.items?.length || 0;
          comparison = itemsA - itemsB;
          break;
        }
        case 'COURIER': {
          const courA = (a.courierName || '').toString();
          const courB = (b.courierName || '').toString();
          comparison = courA.localeCompare(courB);
          break;
        }
        case 'AMOUNT': {
          const amtA = Number(a.totalAmount || 0);
          const amtB = Number(b.totalAmount || 0);
          comparison = amtA - amtB;
          break;
        }
        case 'STAGE': {
          const stageA = STAGE_ORDER_MAP[a.pipelineStage] || 0;
          const stageB = STAGE_ORDER_MAP[b.pipelineStage] || 0;
          comparison = stageA - stageB;
          break;
        }
        default:
          comparison = 0;
      }
      return orderSortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredOrders, orderSortField, orderSortOrder]);

  // Pagination Slice
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    if (pageSize === -1) return sortedOrders;
    const start = (effectivePage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, effectivePage, pageSize]);

  // KPI Calculations
  const pendingCodOrders = baseFilteredOrders.filter((o) => o.isCod && o.pipelineStage !== 'COMPLETED' && o.pipelineStage !== 'REJECTED' && o.pipelineStage !== 'ARCHIVED');
  const totalPendingCodAmount = pendingCodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const outForDeliveryCount = baseFilteredOrders.filter((o) => o.pipelineStage === 'OUT_FOR_DELIVERY').length;
  const completedToday = baseFilteredOrders.filter((o) => o.pipelineStage === 'COMPLETED').length;
  const rejectedCount = baseFilteredOrders.filter((o) => o.pipelineStage === 'REJECTED').length;
  const archivedCount = baseFilteredOrders.filter((o) => o.pipelineStage === 'ARCHIVED').length;

  return (
    <div className="space-y-4">
      {/* High-Volume KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 neu-card-interactive flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('pipeline.activePipeline', 'Active Pipeline')}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight mt-0.5 truncate">{baseFilteredOrders.length} <span className="text-xs font-bold text-slate-500">{t('pipeline.ordersCount', 'Orders')}</span></div>
          </div>
          <div className="p-3 rounded-2xl neu-sunken-sm text-emerald-500 flex-shrink-0"><ShoppingBag className="w-4 h-4" /></div>
        </div>

        <div className="p-4 neu-card-interactive flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('pipeline.outForDelivery', 'Out for Delivery')}</div>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums tracking-tight mt-0.5">{outForDeliveryCount}</div>
          </div>
          <div className="p-3 rounded-2xl neu-sunken-sm text-blue-500 flex-shrink-0"><Truck className="w-4 h-4" /></div>
        </div>

        <div className="p-4 neu-card-interactive flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('pipeline.pendingCodInTransit', 'Pending COD In Transit')}</div>
            <div className="text-xl font-black text-amber-500 font-mono tabular-nums tracking-tight mt-0.5 truncate">{format(convert(totalPendingCodAmount, baseCode, currentCurrency), currentCurrency)}</div>
          </div>
          <div className="p-3 rounded-2xl neu-sunken-sm text-amber-500 flex-shrink-0"><DollarSign className="w-4 h-4" /></div>
        </div>

        <div className="p-4 neu-card-interactive flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('pipeline.completedSettled', 'Completed / Settled')}</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums tracking-tight mt-0.5">{completedToday}</div>
          </div>
          <div className="p-3 rounded-2xl neu-sunken-sm text-emerald-500 flex-shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
        </div>

        <div className="p-4 neu-card-interactive flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('pipeline.rejectedReturned', 'Rejected / Returned')}</div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums tracking-tight mt-0.5">{rejectedCount}</div>
          </div>
          <div className="p-3 rounded-2xl neu-sunken-sm text-rose-500 flex-shrink-0"><XCircle className="w-4 h-4" /></div>
        </div>
      </div>

      {/* Synchronized Date Filter Ribbon */}
      <div className="p-4 rounded-3xl neu-card-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-emerald-500" />
            <span>{t('pipeline.orderPeriod', 'Order Period:')}</span>
          </div>

          <div className="w-44">
            <CustomDatePicker
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                setActiveDatePreset('all');
                setCurrentPage(1);
              }}
              placeholder={t('accounting.fromDate', 'From date...')}
              presets={false}
            />
          </div>

          <span className="text-slate-400 font-bold text-xs">{t('common.to', 'to')}</span>

          <div className="w-44">
            <CustomDatePicker
              value={endDate}
              onChange={(val) => {
                setEndDate(val);
                setActiveDatePreset('all');
                setCurrentPage(1);
              }}
              placeholder={t('accounting.toDate', 'To date...')}
              presets={false}
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setActiveDatePreset('all');
                setCurrentPage(1);
              }}
              className="w-8 h-8 neu-circle-btn text-rose-500 cursor-pointer flex items-center justify-center transition-transform active:scale-95"
              title={t('common.reset', 'Reset')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 p-1 neu-tab-container text-xs rounded-2xl">
          <button
            type="button"
            onClick={() => applyPreset('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeDatePreset === 'today'
                ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('reports.today', 'Today')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('7days')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeDatePreset === '7days'
                ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('reports.last7days', 'Last 7 Days')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('month')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeDatePreset === 'month'
                ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('reports.thisMonth', 'This Month')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeDatePreset === 'all' && !startDate && !endDate
                ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('reports.allTime', 'All Time')}
          </button>
        </div>
      </div>

      {/* Visual 6-Step Connected Pipeline Stepper & Controls */}
      <div className="p-5 neu-card-lg space-y-4">
        {/* Top bar: All Orders, Rejected, & Archive quick-tabs + Search & Bulk Select Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
          <div className="neu-tab-container p-1.5 flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setSelectedStage('ALL');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                selectedStage === 'ALL'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{t('pipeline.allOrders', 'All Orders')}</span>
              <span className="px-2 py-0.5 rounded-full font-mono text-xs neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-black">
                {baseFilteredOrders.length}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedStage('REJECTED');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                selectedStage === 'REJECTED'
                  ? 'neu-tab-active text-rose-600 dark:text-rose-400 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{t('pipeline.step7Rejected', '7. Rejected / Returned')}</span>
              <span className="px-2 py-0.5 rounded-full font-mono text-xs neu-sunken-sm text-rose-600 dark:text-rose-400 font-black">
                {rejectedCount}
              </span>
            </button>

            {/* 8. Archive Orders Tab */}
            <button
              onClick={() => {
                setSelectedStage('ARCHIVED');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                selectedStage === 'ARCHIVED'
                  ? 'neu-tab-active text-purple-600 dark:text-purple-400 font-black shadow-neu-raised-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Archive className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
              <span>{t('pipeline.step8Archived', '8. Archive Orders')}</span>
              <span className="px-2 py-0.5 rounded-full font-mono text-xs neu-sunken-sm text-purple-600 dark:text-purple-400 font-black">
                {archivedCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* View Mode Switcher (Grid vs List Layout Toggle) */}
            <div className="p-1 neu-tab-container flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  soundFX.playBeep();
                  setViewMode('GRID');
                }}
                className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  viewMode === 'GRID'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={t('pipeline.viewGrid', 'Grid / Card View')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playBeep();
                  setViewMode('LIST');
                }}
                className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={t('pipeline.viewList', 'List / Table View')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSelectAllVisible}
              className="px-4 py-2 neu-btn text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 text-sm whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-emerald-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{t('pipeline.selectAll', 'Select All ({{count}})', { count: selectedOrderIds.length })}</span>
            </button>

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('pipeline.searchPlaceholder', 'Search order, customer...')}
                className="w-full pl-10 pr-4 py-2 neu-input text-sm text-slate-800 dark:text-white placeholder:text-slate-400 rounded-xl focus:outline-none"
              />
            </div>

            <button
              onClick={fetchLiveOrders}
              className="w-9 h-9 neu-circle-btn text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
              title={t('pipeline.refreshOrders', 'Refresh Orders')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* 6-Step Visual Interactive Stepper Chain */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STEPS.map((step, idx) => {
            const count = baseFilteredOrders.filter((o) => o.pipelineStage === step.stage).length;
            const isSelected = selectedStage === step.stage;
            const isHighlighted = highlightStage === step.stage;
            const StepIcon = step.icon;

            const stepTranslationKeys: Record<string, string> = {
              NEW: t('pipeline.step1CodNew', '1. COD New'),
              PRINT_BILL: t('pipeline.step2BillPrinted', '2. Bill Printed'),
              EXPRESS_ASSIGNED: t('pipeline.step3ExpressAssigned', '3. Express Assigned'),
              OUT_FOR_DELIVERY: t('pipeline.step4OutForDelivery', '4. Out for Delivery'),
              WAITING_PICKUP: t('pipeline.step5WaitingPickup', '5. Waiting Pick Up'),
              COMPLETED: t('pipeline.step6Completed', '6. Completed (Settled)'),
            };

            const colorThemes: Record<
              string,
              {
                accentText: string;
                borderInactive: string;
                borderActive: string;
                bgActive: string;
                iconBgInactive: string;
                iconBgActive: string;
                badgeInactive: string;
                badgeActive: string;
              }
            > = {
              NEW: {
                accentText: 'text-amber-600 dark:text-amber-400',
                borderInactive: 'border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                borderActive: 'border-amber-500/50 dark:border-amber-400/50',
                bgActive: 'neu-sunken-sm bg-amber-500/[0.04] dark:bg-amber-500/[0.07]',
                iconBgInactive: 'neu-sunken-sm text-slate-400 dark:text-slate-500',
                iconBgActive: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                badgeInactive: 'neu-sunken-sm text-slate-500 dark:text-slate-400',
                badgeActive: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25',
              },
              PRINT_BILL: {
                accentText: 'text-sky-600 dark:text-sky-400',
                borderInactive: 'border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                borderActive: 'border-sky-500/50 dark:border-sky-400/50',
                bgActive: 'neu-sunken-sm bg-sky-500/[0.04] dark:bg-sky-500/[0.07]',
                iconBgInactive: 'neu-sunken-sm text-slate-400 dark:text-slate-500',
                iconBgActive: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
                badgeInactive: 'neu-sunken-sm text-slate-500 dark:text-slate-400',
                badgeActive: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25',
              },
              EXPRESS_ASSIGNED: {
                accentText: 'text-purple-600 dark:text-purple-400',
                borderInactive: 'border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                borderActive: 'border-purple-500/50 dark:border-purple-400/50',
                bgActive: 'neu-sunken-sm bg-purple-500/[0.04] dark:bg-purple-500/[0.07]',
                iconBgInactive: 'neu-sunken-sm text-slate-400 dark:text-slate-500',
                iconBgActive: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                badgeInactive: 'neu-sunken-sm text-slate-500 dark:text-slate-400',
                badgeActive: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25',
              },
              OUT_FOR_DELIVERY: {
                accentText: 'text-blue-600 dark:text-blue-400',
                borderInactive: 'border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                borderActive: 'border-blue-500/50 dark:border-blue-400/50',
                bgActive: 'neu-sunken-sm bg-blue-500/[0.04] dark:bg-blue-500/[0.07]',
                iconBgInactive: 'neu-sunken-sm text-slate-400 dark:text-slate-500',
                iconBgActive: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                badgeInactive: 'neu-sunken-sm text-slate-500 dark:text-slate-400',
                badgeActive: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25',
              },
              WAITING_PICKUP: {
                accentText: 'text-teal-600 dark:text-teal-400',
                borderInactive: 'border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                borderActive: 'border-teal-500/50 dark:border-teal-400/50',
                bgActive: 'neu-sunken-sm bg-teal-500/[0.04] dark:bg-teal-500/[0.07]',
                iconBgInactive: 'neu-sunken-sm text-slate-400 dark:text-slate-500',
                iconBgActive: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
                badgeInactive: 'neu-sunken-sm text-slate-500 dark:text-slate-400',
                badgeActive: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25',
              },
              COMPLETED: {
                accentText: 'text-emerald-600 dark:text-emerald-400',
                borderInactive: 'border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                borderActive: 'border-emerald-500/50 dark:border-emerald-400/50',
                bgActive: 'neu-sunken-sm bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07]',
                iconBgInactive: 'neu-sunken-sm text-slate-400 dark:text-slate-500',
                iconBgActive: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                badgeInactive: 'neu-sunken-sm text-slate-500 dark:text-slate-400',
                badgeActive: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
              },
            };

            const theme = colorThemes[step.stage] || colorThemes.NEW;

            return (
              <button
                key={step.stage}
                type="button"
                onClick={() => {
                  setSelectedStage(step.stage as PipelineStage);
                  setCurrentPage(1);
                }}
                className={`relative p-3.5 rounded-2xl text-left transition-all duration-150 flex flex-col justify-between space-y-2 group active:scale-[0.98] cursor-pointer ${
                  isHighlighted
                    ? `${theme.bgActive} border ${theme.borderActive} scale-[1.02] z-10`
                    : isSelected
                    ? `${theme.bgActive} border ${theme.borderActive} z-10`
                    : `neu-card-sm border ${theme.borderInactive} hover:border-slate-300 dark:hover:border-slate-700`
                }`}
              >
                {/* Floating Beacon when Order is Wrapped to this Stage */}
                {isHighlighted && (
                  <span className="absolute -top-2.5 right-2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-md animate-bounce flex items-center gap-1 z-30">
                    <Sparkles className="w-3 h-3" />
                    <span>{t('pipeline.stageActiveBeacon', 'Stage {{step}} Active', { step: step.stepNum })}</span>
                  </span>
                )}

                {/* Step Header: Icon + Step # vs Facebook-Style Notification Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected || isHighlighted ? theme.iconBgActive : theme.iconBgInactive
                        }`}
                      >
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      {/* Live FB Corner Beacon when active orders exist */}
                      {count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-1.5 ring-white dark:ring-slate-900 animate-ping" />
                      )}
                    </div>

                    <span
                      className={`text-[11px] font-extrabold uppercase tracking-wider font-mono ${
                        isSelected || isHighlighted ? theme.accentText : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {t('pipeline.stepPrefix', 'STEP {{step}}', { step: step.stepNum })}
                    </span>
                  </div>

                  {/* Facebook-Style Notification Counter Badge */}
                  {count > 0 ? (
                    <div className="flex items-center gap-1">
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-mono text-[10px] font-black flex items-center justify-center shadow-md shadow-rose-500/40 ring-1.5 ring-white dark:ring-slate-900 animate-pulse">
                        {count > 99 ? '99+' : count}
                      </span>
                    </div>
                  ) : (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center neu-sunken-sm">
                      0
                    </span>
                  )}
                </div>

                {/* Step Name & Direction Indicator */}
                <div className="flex items-center justify-between pt-0.5">
                  <span
                    className={`font-extrabold text-xs sm:text-sm truncate ${
                      isSelected || isHighlighted
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                    }`}
                  >
                    {stepTranslationKeys[step.stage] || step.label}
                  </span>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ChevronRight
                      className={`w-3.5 h-3.5 flex-shrink-0 ml-1 transition-all ${
                        isSelected || isHighlighted
                          ? `${theme.accentText} opacity-80`
                          : 'text-slate-400 opacity-30 group-hover:opacity-60'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Batch Processing Dock when Orders are Selected */}
      {selectedOrderIds.length > 0 && (
        <div className="sticky top-4 z-40 p-3 rounded-2xl bg-slate-900/95 text-white backdrop-blur-md border border-brand-500/50 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-xs font-mono">
              {selectedOrderIds.length}
            </span>
            <span className="font-extrabold text-sm">{t('pipeline.ordersSelectedBatch', 'Orders Selected for Batch Operation:')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Batch Print Bills */}
            <button
              onClick={handleBulkPrintBills}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('pipeline.bulkPrintBillsBtn', 'Bulk Print Bills ({{count}})', { count: selectedOrderIds.length })}</span>
            </button>

            {/* Batch Assign Express */}
            <button
              onClick={() => setBulkExpressModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{t('pipeline.batchAssignExpressBtn', 'Batch Assign Express')}</span>
            </button>

            {/* Batch Out for Delivery */}
            <button
              onClick={() => handleBulkUpdatePipeline('OUT_FOR_DELIVERY')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{t('pipeline.batchOutForDeliveryBtn', 'Batch Out for Delivery')}</span>
            </button>

            {/* Batch Settle Completed */}
            <button
              onClick={handleBulkCompleteCod}
              className="px-3 py-1.5 rounded-xl neu-btn-primary text-white font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('pipeline.batchSettlePaidBtn', 'Batch Settle Paid ({{count}})', { count: selectedOrderIds.length })}</span>
            </button>

            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ✕ {t('common.clear', 'Clear')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Loading / Empty / Grid / List */}
      {loading && orders.length === 0 ? (
        <div className="p-12 text-center text-slate-400 neu-card-lg space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
          <p className="text-xs font-bold">{t('pipeline.loadingActiveOrders', 'Loading active pipeline orders...')}</p>
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="p-12 text-center text-slate-400 neu-card-lg space-y-3">
          <div className="w-16 h-16 rounded-3xl neu-sunken-sm flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8 stroke-[1.5] text-emerald-500 opacity-60" />
          </div>
          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{t('pipeline.noOrdersInStage', 'No Orders in this Pipeline Stage')}</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{t('pipeline.noOrdersSubtitle', 'Orders dispatched from the POS cart will automatically flow here in real time.')}</p>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID VIEW: Small Compact Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {paginatedOrders.map((ord) => {
            const customerName = ord.customerName
              ? `${ord.customerName} ${ord.customerSurname || ''}`.trim()
              : (!ord.deliveryContact || ord.deliveryContact === 'Guest Delivery' || ord.deliveryContact === 'Guest')
              ? t('pipeline.guestDelivery', 'Guest Delivery')
              : ord.deliveryContact;
            const isSelected = selectedOrderIds.includes(ord.id);
            const currentStepNum = STAGE_ORDER_MAP[ord.pipelineStage || 'NEW'] || 1;
            const heroConfig = getStageHeroConfig(ord.pipelineStage || 'NEW', t);

            const stepShortNames: Record<string, string> = {
              NEW: t('pipeline.step1Short', 'COD New'),
              PRINT_BILL: t('pipeline.step2Short', 'Bill Printed'),
              EXPRESS_ASSIGNED: t('pipeline.step3Short', 'Express Assigned'),
              OUT_FOR_DELIVERY: t('pipeline.step4Short', 'Out for Delivery'),
              WAITING_PICKUP: t('pipeline.step5Short', 'Waiting Pickup'),
              COMPLETED: t('pipeline.step6Short', 'Settled & Paid'),
            };

            return (
              <div
                key={ord.id}
                onClick={() => {
                  soundFX.playBeep();
                  setDetailModalOrder(ord);
                }}
                className={`p-3.5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-2.5 text-xs cursor-pointer group ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : ord.pipelineStage === 'REJECTED'
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : ord.pipelineStage === 'COMPLETED'
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : ''
                }`}
              >
                {/* Top Row: Checkbox, Invoice# & Amount */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectOrder(ord.id);
                      }}
                      className="text-slate-400 hover:text-brand-500 active:scale-95 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-brand-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="truncate">
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white truncate block">
                        {ord.invoiceNo}
                      </span>
                      {ord.externalOrderId && (
                        <span className="font-mono text-[9px] font-bold text-brand-500 bg-brand-500/10 px-1 py-0.2 rounded">
                          {ord.externalOrderId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-black text-xs text-slate-900 dark:text-white">
                      {format(convert(ord.totalAmount, baseCode, currentCurrency), currentCurrency)}
                    </div>
                    <span
                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                        ord.isCod
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {ord.isCod ? (
                        <>
                          <Coins className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />
                          <span>{t('pipeline.badgeCod', 'COD')}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-2.5 h-2.5 flex-shrink-0 text-emerald-500" />
                          <span>{t('pipeline.badgePaid', 'Paid')}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Middle: Customer Name & Date */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <div className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white truncate text-[11px]">
                        {customerName}
                      </span>
                    </div>

                    {ord.customerTier && (
                      <span className="text-[8px] font-black uppercase text-amber-500 border border-amber-500/30 px-1 rounded flex-shrink-0">
                        {ord.customerTier}
                      </span>
                    )}
                  </div>

                  {ord.customerPhone && (
                    <div className="pt-0.5">
                      <WhatsAppPhoneBadge
                        phone={ord.customerPhone}
                        text={`Hello! Regarding your order ${ord.invoiceNo} from 39POS.`}
                        size="xs"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                    <span>{t('pipeline.itemsCount', '{{count}} items', { count: ord.items?.length || 0 })}</span>
                  </div>

                  {/* Courier & Delivery Fee */}
                  {ord.courierName && (
                    <div className="flex items-center justify-between text-[10px] bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-xl">
                      <div className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 truncate">
                        <Truck className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{ord.courierName}</span>
                      </div>
                      {ord.deliveryFee > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-1 ${
                          ord.deliveryFeePayer === 'SELLER_PAYS'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          <Coins className="w-2.5 h-2.5 text-amber-500" />
                          <span>{format(convert(ord.deliveryFee, baseCode, currentCurrency), currentCurrency)}</span>
                          <span>{ord.deliveryFeePayer === 'SELLER_PAYS' ? `(${t('pipeline.payerStoreShort', 'Store')})` : `(${t('pipeline.payerCustShort', 'Cust')})`}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Stage Badge & Pop-up Trigger */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-xl border text-[9px] font-black uppercase tracking-wider truncate inline-flex items-center gap-1 ${heroConfig.bg} ${heroConfig.border} ${heroConfig.text}`}>
                    {ord.pipelineStage === 'REJECTED' ? (
                      <>
                        <XCircle className="w-2.5 h-2.5 text-rose-500" />
                        <span>{t('pipeline.rejected', 'Rejected')}</span>
                      </>
                    ) : ord.pipelineStage === 'ARCHIVED' ? (
                      <>
                        <Archive className="w-2.5 h-2.5 text-purple-500" />
                        <span>{t('pipeline.archived', 'Archived')}</span>
                      </>
                    ) : (
                      `${t('pipeline.stepPrefix', 'Step {{step}}', { step: currentStepNum })}/6 • ${stepShortNames[ord.pipelineStage] || ord.pipelineStage}`
                    )}
                  </span>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Move to Archive Orders Icon Button - WHEN IN STEP 6 ONLY */}
                    {ord.pipelineStage === 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToArchive(ord);
                        }}
                        disabled={archivingOrderId === ord.id}
                        className="px-2 py-1 rounded-xl neu-btn text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow-neu-raised-sm hover:shadow-neu-raised active:scale-95 transition-all group/arch animate-in fade-in zoom-in-95 duration-200"
                        title={t('pipeline.moveToArchiveTooltip', 'Move to 8. Archive Orders tab')}
                      >
                        <Archive className={`w-3.5 h-3.5 text-purple-500 dark:text-purple-400 group-hover/arch:scale-110 group-hover/arch:-rotate-12 transition-transform duration-200 ${archivingOrderId === ord.id ? 'animate-spin' : ''}`} />
                        <span className="font-bold">{t('pipeline.archive', 'Archive')}</span>
                      </button>
                    )}

                    {/* Restore from Archive Button - WHEN IN ARCHIVED TAB */}
                    {ord.pipelineStage === 'ARCHIVED' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreFromArchive(ord);
                        }}
                        className="px-2 py-1 rounded-xl neu-btn text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow-neu-raised-sm hover:shadow-neu-raised active:scale-95 transition-all animate-in fade-in zoom-in-95 duration-200"
                        title={t('pipeline.restoreFromArchiveTooltip', 'Restore back to Step 6')}
                      >
                        <Undo2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-bold">{t('pipeline.restore', 'Restore')}</span>
                      </button>
                    )}

                    <span className="text-[10px] font-bold text-brand-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer">
                      <span>{t('pipeline.inspectBtn', 'Inspect')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW: Compact Data Table for High-Density Operations */
        <div className="neu-card-lg rounded-3xl overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="text-slate-400 hover:text-brand-500 cursor-pointer"
                    >
                      {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-brand-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th
                    onClick={() => handleToggleOrderSort('TIME')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('pipeline.colInvoiceTime', 'Invoice & Time')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${orderSortField === 'TIME' || orderSortField === 'INVOICE' ? 'text-brand-500' : 'opacity-30'}`} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleOrderSort('CUSTOMER')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('pipeline.colCustomerProfile', 'Customer Profile')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${orderSortField === 'CUSTOMER' ? 'text-brand-500' : 'opacity-30'}`} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleOrderSort('ITEMS')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('pipeline.colItemsSummary', 'Items Summary')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${orderSortField === 'ITEMS' ? 'text-brand-500' : 'opacity-30'}`} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleOrderSort('COURIER')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('pipeline.colCourierExpress', 'Courier Express')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${orderSortField === 'COURIER' ? 'text-brand-500' : 'opacity-30'}`} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleOrderSort('AMOUNT')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t('pipeline.colAmountTender', 'Amount & Tender')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${orderSortField === 'AMOUNT' ? 'text-brand-500' : 'opacity-30'}`} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleOrderSort('STAGE')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('pipeline.colPipelineStage', 'Pipeline Stage')}</span>
                      <ArrowUpDown className={`w-3 h-3 ${orderSortField === 'STAGE' ? 'text-brand-500' : 'opacity-30'}`} />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">{t('common.action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedOrders.map((ord) => {
                  const customerName = ord.customerName
                    ? `${ord.customerName} ${ord.customerSurname || ''}`.trim()
                    : (!ord.deliveryContact || ord.deliveryContact === 'Guest Delivery' || ord.deliveryContact === 'Guest')
                    ? t('pipeline.guestDelivery', 'Guest Delivery')
                    : ord.deliveryContact;
                  const isSelected = selectedOrderIds.includes(ord.id);
                  const currentStepNum = STAGE_ORDER_MAP[ord.pipelineStage || 'NEW'] || 1;
                  const heroConfig = getStageHeroConfig(ord.pipelineStage || 'NEW', t);

                  const stepShortNames: Record<string, string> = {
                    NEW: t('pipeline.step1Short', 'COD New'),
                    PRINT_BILL: t('pipeline.step2Short', 'Bill Printed'),
                    EXPRESS_ASSIGNED: t('pipeline.step3Short', 'Express Assigned'),
                    OUT_FOR_DELIVERY: t('pipeline.step4Short', 'Out for Delivery'),
                    WAITING_PICKUP: t('pipeline.step5Short', 'Waiting Pickup'),
                    COMPLETED: t('pipeline.step6Short', 'Settled & Paid'),
                  };

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => {
                        soundFX.playBeep();
                        setDetailModalOrder(ord);
                      }}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-brand-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOrder(ord.id)}
                          className="text-slate-400 hover:text-brand-500 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Invoice & Time */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-black text-xs text-slate-900 dark:text-white">
                          {ord.invoiceNo}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <span>{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>{ord.channel || 'POS'}</span>
                          {ord.externalOrderId && (
                            <span className="bg-brand-500/10 text-brand-500 px-1 py-0.2 rounded text-[9px] font-bold">
                              {ord.externalOrderId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer Profile */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{customerName}</span>
                          {ord.customerTier && (
                            <span className="text-[8px] font-black uppercase text-amber-500 border border-amber-500/30 px-1 rounded">
                              {ord.customerTier}
                            </span>
                          )}
                        </div>
                        {ord.customerPhone && (
                          <div className="mt-1">
                            <WhatsAppPhoneBadge
                              phone={ord.customerPhone}
                              text={`Hello! Regarding your order ${ord.invoiceNo} from 39POS.`}
                              size="xs"
                            />
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {t('pipeline.itemsCount', '{{count}} items', { count: ord.items?.length || 0 })}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {ord.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                      </td>

                      {/* Courier Express */}
                      <td className="py-3 px-3">
                        {ord.courierName ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
                              <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{ord.courierName}</span>
                              {ord.courierTrackingNo && (
                                <span className="font-mono text-[9px] text-slate-400">#{ord.courierTrackingNo}</span>
                              )}
                            </div>
                            {ord.deliveryFee > 0 && (
                              <div className="text-[10px]">
                                <span className={`font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                                  ord.deliveryFeePayer === 'SELLER_PAYS'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                                }`}>
                                  <Truck className="w-3 h-3" />
                                  <span>{format(convert(ord.deliveryFee, baseCode, currentCurrency), currentCurrency)}</span>
                                  <span>{ord.deliveryFeePayer === 'SELLER_PAYS' ? `• ${t('pipeline.storePaid', 'Store Paid')}` : `• ${t('pipeline.custPaid', 'Cust Paid')}`}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">{t('pipeline.unassigned', 'Unassigned')}</span>
                        )}
                      </td>

                      {/* Amount & Tender */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-black text-xs text-slate-900 dark:text-white">
                          {format(convert(ord.totalAmount, baseCode, currentCurrency), currentCurrency)}
                        </div>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            ord.isCod
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {ord.isCod ? (
                            <>
                              <Coins className="w-2.5 h-2.5 text-amber-500" />
                              <span>{t('pipeline.badgeCod', 'COD')}</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-2.5 h-2.5 text-emerald-500" />
                              <span>{t('pipeline.badgePaid', 'Paid')}</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Stage Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-xl border text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${heroConfig.bg} ${heroConfig.border} ${heroConfig.text}`}
                        >
                          {ord.pipelineStage === 'REJECTED' ? (
                            <>
                              <XCircle className="w-2.5 h-2.5 text-rose-500" />
                              <span>{t('pipeline.rejected', 'Rejected')}</span>
                            </>
                          ) : ord.pipelineStage === 'ARCHIVED' ? (
                            <>
                              <Archive className="w-2.5 h-2.5 text-purple-500" />
                              <span>{t('pipeline.archived', 'Archived')}</span>
                            </>
                          ) : (
                            `${t('pipeline.stepPrefix', 'Step {{step}}', { step: currentStepNum })}/6 • ${stepShortNames[ord.pipelineStage] || ord.pipelineStage}`
                          )}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {ord.pipelineStage === 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => handleMoveToArchive(ord)}
                              disabled={archivingOrderId === ord.id}
                              className="px-2.5 py-1 rounded-xl neu-btn text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer shadow-neu-raised-sm hover:shadow-neu-raised active:scale-95 transition-all group/arch"
                              title={t('pipeline.moveToArchiveTooltip', 'Move to 8. Archive Orders tab')}
                            >
                              <Archive className={`w-3.5 h-3.5 text-purple-500 dark:text-purple-400 group-hover/arch:scale-110 group-hover/arch:-rotate-12 transition-transform duration-200 ${archivingOrderId === ord.id ? 'animate-spin' : ''}`} />
                              <span className="hidden sm:inline font-bold">{t('pipeline.archive', 'Archive')}</span>
                            </button>
                          )}

                          {ord.pipelineStage === 'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() => handleRestoreFromArchive(ord)}
                              className="px-2.5 py-1 rounded-xl neu-btn text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer shadow-neu-raised-sm hover:shadow-neu-raised active:scale-95 transition-all"
                              title={t('pipeline.restoreFromArchiveTooltip', 'Restore back to Step 6')}
                            >
                              <Undo2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="hidden sm:inline font-bold">{t('pipeline.restore', 'Restore')}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playBeep();
                              setDetailModalOrder(ord);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{t('pipeline.inspectBtn', 'Inspect')}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Orders Pagination Footer */}
      {sortedOrders.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
            {(() => {
              const start = pageSize === -1 ? 1 : (effectivePage - 1) * pageSize + 1;
              const end = pageSize === -1 ? sortedOrders.length : Math.min(effectivePage * pageSize, sortedOrders.length);
              return (
                <span>
                  {t('pipeline.showingOrdersPagination', 'Showing {{range}} of {{total}} orders in pipeline', {
                    range: start === end ? `${start}` : `${start}–${end}`,
                    total: sortedOrders.length,
                  })}
                </span>
              );
            })()}
            <div className="w-36">
              <CustomSelect
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                options={[
                  { value: '12', label: `12 / ${t('common.page', 'page')}` },
                  { value: '24', label: `24 / ${t('common.page', 'page')}` },
                  { value: '48', label: `48 / ${t('common.page', 'page')}` },
                  { value: '96', label: `96 / ${t('common.page', 'page')}` },
                  { value: '-1', label: t('pipeline.allOrders', 'All orders') },
                ]}
                placement="up"
                size="sm"
              />
            </div>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={effectivePage === 1}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={effectivePage === 1}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 1)
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
                    const isActive = p === effectivePage;
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={effectivePage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={effectivePage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* FULL DETAILED POP-UP MODAL (When Card or Row is Clicked) */}
      {detailModalOrder && (
        <div
          onClick={() => handleCloseModalWithTransition(detailModalOrder)}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-opacity duration-200 overflow-y-auto ${
            isClosingModal ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-150'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg neu-card-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-xs max-h-[92vh] overflow-y-auto ${
              isClosingModal
                ? 'modal-wrap-animate'
                : 'scale-100 opacity-100 translate-y-0 animate-in zoom-in-95 duration-150'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                    {detailModalOrder.invoiceNo}
                  </span>
                  {detailModalOrder.externalOrderId && (
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 neu-sunken-sm px-2 py-0.5 rounded-md">
                      {detailModalOrder.externalOrderId}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {new Date(detailModalOrder.createdAt).toLocaleString()} • {t('pipeline.channelLabel', 'Channel')}: {detailModalOrder.channel || 'POS'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                    {format(convert(detailModalOrder.totalAmount, baseCode, currentCurrency), currentCurrency)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider neu-sunken-sm ${
                      detailModalOrder.isCod
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {detailModalOrder.isCod ? `💵 ${t('pipeline.codPendingBadge', 'COD Pending')}` : `💳 ${t('pipeline.prepaidBadge', 'Prepaid')}`}
                  </span>
                </div>

                {/* Cross Icon with Animated Transition to Current Process */}
                <button
                  type="button"
                  onClick={() => handleCloseModalWithTransition(detailModalOrder)}
                  className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 hover:rotate-90 transition-all duration-200 flex items-center justify-center font-bold text-sm ml-1 active:scale-90 cursor-pointer"
                  title={t('pipeline.closeTransitionTitle', 'Close & Transition to Process Stage')}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* VISUAL 6-STEP PROGRESS TRACKER */}
            {detailModalOrder.pipelineStage !== 'REJECTED' && (
              <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-2">
                <div className="relative flex items-center justify-between px-1">
                  {/* Background connecting track */}
                  <div className="absolute left-2.5 right-2.5 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700/60 -z-0 rounded-full" />
                  
                  {/* Active progress fill */}
                  <div
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-brand-500 to-emerald-500 -z-0 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (((STAGE_ORDER_MAP[detailModalOrder.pipelineStage || 'NEW'] || 1) - 1) /
                            (PIPELINE_STEPS.length - 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />

                  {PIPELINE_STEPS.map((step) => {
                    const currentStepNum = STAGE_ORDER_MAP[detailModalOrder.pipelineStage || 'NEW'] || 1;
                    const isDone = currentStepNum > step.stepNum;
                    const isCurrent = currentStepNum === step.stepNum;

                    const stepLabelMap: Record<string, string> = {
                      NEW: t('pipeline.step1CodNew', 'COD New'),
                      PRINT_BILL: t('pipeline.step2BillPrinted', 'Bill Printed'),
                      EXPRESS_ASSIGNED: t('pipeline.step3ExpressAssigned', 'Express Assigned'),
                      OUT_FOR_DELIVERY: t('pipeline.step4OutForDelivery', 'Out for Delivery'),
                      WAITING_PICKUP: t('pipeline.step5WaitingPickup', 'Waiting Pickup'),
                      COMPLETED: t('pipeline.step6Completed', 'Settled & Paid'),
                    };

                    return (
                      <button
                        key={step.stage}
                        type="button"
                        onClick={() => {
                          if (!isCurrent) {
                            handleUpdatePipeline(detailModalOrder.id, step.stage);
                          }
                        }}
                        title={`Click to jump / rollback to Step ${step.stepNum}: ${stepLabelMap[step.stage] || step.label}`}
                        className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all group-hover:scale-125 group-active:scale-95 shadow-xs ${
                            isDone
                              ? 'bg-emerald-500 text-white shadow-xs group-hover:ring-2 group-hover:ring-emerald-400'
                              : isCurrent
                              ? 'bg-brand-500 text-white ring-4 ring-brand-500/25 shadow-md scale-110'
                              : 'neu-circle-btn text-slate-400 group-hover:text-emerald-500'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.stepNum}
                        </div>
                        <span
                          className={`text-[9px] font-bold mt-1 tracking-tight transition-colors ${
                            isCurrent
                              ? 'text-emerald-600 dark:text-emerald-400 font-black'
                              : isDone
                              ? 'text-slate-600 dark:text-slate-300 group-hover:text-emerald-500'
                              : 'text-slate-400/60 group-hover:text-slate-200'
                          }`}
                        >
                          {stepLabelMap[step.stage] || step.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PROMINENT STAGE HERO BANNER WITH QUICK EDIT / ROLLBACK */}
            {(() => {
              const heroConfig = getStageHeroConfig(detailModalOrder.pipelineStage || 'NEW', t);
              return (
                <div className={`p-3.5 rounded-2xl neu-card-sm border ${heroConfig.border} flex flex-col gap-2`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ${heroConfig.text}`}>
                        <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                        <span>{heroConfig.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        {heroConfig.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowStageSelector(!showStageSelector)}
                        title="Change or rollback stage manually"
                        className="px-2.5 py-1 neu-btn text-[10px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-emerald-500" />
                        <span>{showStageSelector ? t('common.close', 'Close') : t('pipeline.editStageBtn', 'Edit Stage')}</span>
                      </button>

                      <span className="text-[10px] font-mono text-slate-400 font-bold hidden sm:inline">
                        {detailModalOrder.billPrinted ? `🖨️ ${t('pipeline.billPrintedStatus', 'Bill Printed')}` : `⏳ ${t('pipeline.unprintedStatus', 'Unprinted')}`}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Quick Stage Picker Popover */}
                  {showStageSelector && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {t('pipeline.selectStageToJump', 'Select Stage to Jump or Revert:')}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                        {PIPELINE_STEPS.map((s) => {
                          const stepLabelMap: Record<string, string> = {
                            NEW: t('pipeline.step1CodNew', '1. COD New'),
                            PRINT_BILL: t('pipeline.step2BillPrinted', '2. Bill Printed'),
                            EXPRESS_ASSIGNED: t('pipeline.step3ExpressAssigned', '3. Express Assigned'),
                            OUT_FOR_DELIVERY: t('pipeline.step4OutForDelivery', '4. Out for Delivery'),
                            WAITING_PICKUP: t('pipeline.step5WaitingPickup', '5. Waiting Pickup'),
                            COMPLETED: t('pipeline.step6Completed', '6. Completed (Settled)'),
                          };
                          return (
                            <button
                              key={s.stage}
                              type="button"
                              onClick={() => {
                                handleUpdatePipeline(detailModalOrder.id, s.stage);
                                setShowStageSelector(false);
                              }}
                              className={`p-2 rounded-xl text-left font-extrabold transition-all active:scale-95 cursor-pointer ${
                                detailModalOrder.pipelineStage === s.stage
                                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                                  : 'neu-card-interactive text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {stepLabelMap[s.stage] || s.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalOrder(detailModalOrder);
                            setShowStageSelector(false);
                          }}
                          className="p-2 rounded-xl neu-btn-danger font-extrabold cursor-pointer"
                        >
                          {t('pipeline.step7Rejected', '7. Refused / Reject')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Customer Profile & Demographics */}
            <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {detailModalOrder.customerName
                      ? `${detailModalOrder.customerName} ${detailModalOrder.customerSurname || ''}`.trim()
                      : detailModalOrder.deliveryContact || t('pipeline.guestCustomer', 'Guest Customer')}
                  </span>
                </div>
                {detailModalOrder.customerTier && (
                  <span className="text-[9px] font-black uppercase text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    {detailModalOrder.customerTier}
                  </span>
                )}
              </div>

              {(detailModalOrder.customerPhone || detailModalOrder.deliveryContact) && (
                <div className="flex items-center gap-2 pt-0.5">
                  <WhatsAppPhoneBadge
                    phone={detailModalOrder.customerPhone || detailModalOrder.deliveryContact}
                    text={`Hello! Regarding your order ${detailModalOrder.invoiceNo} (Total: ${format(convert(detailModalOrder.totalAmount, baseCode, currentCurrency), currentCurrency)}) from 39POS.`}
                    size="sm"
                  />
                </div>
              )}

              {detailModalOrder.deliveryAddress && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{detailModalOrder.deliveryAddress}</span>
                </div>
              )}

              {detailModalOrder.isBlacklisted && (
                <div className="flex items-center gap-1 text-[11px] font-black text-rose-500 pt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  <span>{t('pipeline.blacklistedWarning', '⚠️ Blacklisted Customer ({{count}} Rejections)', { count: detailModalOrder.codRejectionCount || 2 })}</span>
                </div>
              )}
            </div>

            {/* Order Items Table Breakdown */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('pipeline.orderedProductsBreakdown', 'Ordered Products Breakdown ({{count}})', { count: detailModalOrder.items?.length || 0 })}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-200/40 dark:divide-slate-800/60 text-xs neu-sunken-sm p-3 rounded-2xl">
                {detailModalOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between pt-1.5 first:pt-0">
                    <span className="text-slate-800 dark:text-slate-200 truncate font-medium">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 font-bold ml-2">
                      {format(convert(item.totalPrice, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Courier, Delivery Fee & Payer Info */}
            {(detailModalOrder.courierName || (detailModalOrder.deliveryFee !== undefined && detailModalOrder.deliveryFee > 0)) && (
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                    <Truck className="w-4 h-4" />
                    <span>{detailModalOrder.courierName || t('pipeline.inHouseExpress', 'In-House Express')}</span>
                  </div>
                  {detailModalOrder.courierTrackingNo && (
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      #{detailModalOrder.courierTrackingNo}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-purple-500/20 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">{t('pipeline.deliveryFeeLabel', 'Delivery Fee:')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {format(convert(detailModalOrder.deliveryFee || 0, baseCode, currentCurrency), currentCurrency)}
                    </span>
                    {detailModalOrder.deliveryFeePayer === 'SELLER_PAYS' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        🏪 {t('pipeline.payerStoreFull', 'Seller Pays (Store Free Shipping)')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
                        👤 {t('pipeline.payerCustFull', 'Customer Pays')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Details */}
            {detailModalOrder.pipelineStage === 'REJECTED' && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                <span className="font-bold block">{t('pipeline.refusalReasonLabel', 'Refusal Reason:')}</span>
                <span>{detailModalOrder.rejectionReason || t('pipeline.customerRejectedDefault', 'Customer rejected order')}</span>
              </div>
            )}

            {/* Modal Primary Action Stepper Footer */}
            {(() => {
              const currentStepNum = STAGE_ORDER_MAP[detailModalOrder.pipelineStage || 'NEW'] || 1;
              const prevStep = currentStepNum > 1 ? PIPELINE_STEPS[currentStepNum - 2] : null;

              return (
                <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center gap-2">
                  {/* Step Back Action for Accidental Advances */}
                  {prevStep && detailModalOrder.pipelineStage !== 'COMPLETED' && detailModalOrder.pipelineStage !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdatePipeline(detailModalOrder.id, prevStep.stage)}
                      title={`Step back to ${prevStep.label}`}
                      className="py-3 px-3 neu-btn text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">{t('pipeline.stepBackBtn', 'Step Back')}</span>
                    </button>
                  )}

                  {/* Stage 1: NEW ➔ Print Bill */}
                  {detailModalOrder.pipelineStage === 'NEW' && (
                    <button
                      type="button"
                      onClick={() => handlePrintBill(detailModalOrder)}
                      className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{t('pipeline.step1ActionBtn', 'Print Bill (Step 2) ➔')}</span>
                    </button>
                  )}

                  {/* Stage 2: PRINT_BILL ➔ Assign Express */}
                  {detailModalOrder.pipelineStage === 'PRINT_BILL' && (
                    <button
                      type="button"
                      onClick={() => openExpressModal(detailModalOrder)}
                      className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{t('pipeline.step2ActionBtn', 'Assign Express (Step 3) ➔')}</span>
                    </button>
                  )}

                  {/* Stage 3: EXPRESS_ASSIGNED ➔ Out for Delivery */}
                  {detailModalOrder.pipelineStage === 'EXPRESS_ASSIGNED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdatePipeline(detailModalOrder.id, 'OUT_FOR_DELIVERY')}
                      className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>{t('pipeline.step3ActionBtn', 'Dispatch Out for Delivery (Step 4) ➔')}</span>
                    </button>
                  )}

                  {/* Stage 4: OUT_FOR_DELIVERY ➔ Waiting Pickup or Settle */}
                  {detailModalOrder.pipelineStage === 'OUT_FOR_DELIVERY' && (
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdatePipeline(detailModalOrder.id, 'WAITING_PICKUP')}
                        className="py-3 px-2 rounded-2xl neu-btn text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Building className="w-3.5 h-3.5" />
                        <span>{t('pipeline.step4AtDepotBtn', 'At Depot (Step 5)')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteCod(detailModalOrder)}
                        className="py-3 px-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('pipeline.step4SettlePaidBtn', 'Settle Paid ➔')}</span>
                      </button>
                    </div>
                  )}

                  {/* Stage 5: WAITING_PICKUP ➔ Complete */}
                  {detailModalOrder.pipelineStage === 'WAITING_PICKUP' && (
                    <button
                      type="button"
                      onClick={() => handleCompleteCod(detailModalOrder)}
                      className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('pipeline.step5CollectCashBtn', 'Collect Cash & Settle Paid ➔')}</span>
                    </button>
                  )}

                  {/* Stage 6: COMPLETED */}
                  {detailModalOrder.pipelineStage === 'COMPLETED' && (
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 py-3 px-4 rounded-2xl neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{t('pipeline.step6SettledMsg', 'Settled & Payment Received')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleMoveToArchive(detailModalOrder);
                          setDetailModalOrder(null);
                        }}
                        disabled={archivingOrderId === detailModalOrder.id}
                        className="py-3 px-4 rounded-2xl neu-btn text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-neu-raised-sm hover:shadow-neu-raised cursor-pointer active:scale-95 transition-all group/arch"
                        title={t('pipeline.moveToArchiveTooltip', 'Move to 8. Archive Orders tab')}
                      >
                        <Archive className={`w-4 h-4 text-purple-500 dark:text-purple-400 group-hover/arch:scale-110 group-hover/arch:-rotate-12 transition-transform duration-200 ${archivingOrderId === detailModalOrder.id ? 'animate-spin' : ''}`} />
                        <span>{t('pipeline.moveToArchiveModalBtn', 'Move to 8. Archive Orders ➔')}</span>
                      </button>
                    </div>
                  )}

                  {/* ARCHIVED */}
                  {detailModalOrder.pipelineStage === 'ARCHIVED' && (
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 py-3 px-4 rounded-2xl neu-sunken-sm text-purple-600 dark:text-purple-400 font-black text-xs flex items-center justify-center gap-1.5">
                        <Archive className="w-4 h-4 text-purple-500" />
                        <span>{t('pipeline.archivedStoredMsg', 'Stored in 8. Archive Orders')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleRestoreFromArchive(detailModalOrder);
                          setDetailModalOrder(null);
                        }}
                        className="py-3 px-4 rounded-2xl neu-btn text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-neu-raised-sm hover:shadow-neu-raised cursor-pointer active:scale-95 transition-all"
                        title={t('pipeline.restoreFromArchiveTooltip', 'Restore back to Step 6 Completed')}
                      >
                        <Undo2 className="w-4 h-4 text-emerald-500" />
                        <span>{t('pipeline.restoreToStep6Btn', 'Restore to Step 6')}</span>
                      </button>
                    </div>
                  )}

                  {/* REJECTED */}
                  {detailModalOrder.pipelineStage === 'REJECTED' && (
                    <div className="flex-1 py-3 px-4 rounded-2xl neu-sunken-sm text-rose-600 dark:text-rose-400 font-black text-xs flex items-center justify-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>{t('pipeline.rejectedRestockedMsg', 'Delivery Refused & Restocked')}</span>
                    </div>
                  )}

                  {/* Secondary Actions: Reject / Refuse */}
                  {detailModalOrder.pipelineStage !== 'COMPLETED' && detailModalOrder.pipelineStage !== 'REJECTED' && detailModalOrder.pipelineStage !== 'ARCHIVED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalOrder(detailModalOrder);
                        setRejectForm({ reason: t('pipeline.customerRefusedDefault', 'Customer refused / rejected delivery'), courierFee: 0 });
                      }}
                      className="px-3.5 py-3 rounded-2xl neu-btn-danger text-rose-500 font-bold active:scale-95 transition-all cursor-pointer"
                      title={t('pipeline.rejectCodTitle', 'Reject / Refuse COD')}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bulk Assign Express Modal */}
      {bulkExpressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{t('pipeline.batchAssignExpressTitle', 'Batch Assign Express Courier')}</h3>
                  <p className="text-[10px] text-slate-400">{t('pipeline.applyingToCountOrders', 'Applying to {{count}} selected orders', { count: selectedOrderIds.length })}</p>
                </div>
              </div>
              <button onClick={() => setBulkExpressModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBulkUpdatePipeline('EXPRESS_ASSIGNED', {
                  courierName: bulkExpressForm.courierName,
                  courierTrackingNoPrefix: bulkExpressForm.trackingPrefix,
                  deliveryFee: bulkExpressForm.deliveryFee,
                  deliveryFeePayer: bulkExpressForm.deliveryFeePayer,
                });
                setBulkExpressModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="font-bold block mb-1">{t('pipeline.courierPartnerLabel', 'Courier Partner')}</label>
                <select
                  value={bulkExpressForm.courierName}
                  onChange={(e) => {
                    const cName = e.target.value;
                    const matched = couriers.find((c) => c.name === cName);
                    setBulkExpressForm({
                      ...bulkExpressForm,
                      courierName: cName,
                      deliveryFee: matched ? matched.defaultFee : bulkExpressForm.deliveryFee,
                      deliveryFeePayer: matched ? matched.defaultFeePayer : bulkExpressForm.deliveryFeePayer,
                    });
                  }}
                  className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {couriers.filter((c) => c.isActive).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon && !c.icon.startsWith('http') && !c.icon.startsWith('/') && !c.icon.startsWith('data:') ? c.icon : '🚚'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">{t('pipeline.batchWaybillPrefixLabel', 'Batch Waybill Prefix (Auto-Generates Sequences)')}</label>
                <input
                  type="text"
                  placeholder="e.g. FLX-TH"
                  value={bulkExpressForm.trackingPrefix}
                  onChange={(e) => setBulkExpressForm({ ...bulkExpressForm, trackingPrefix: e.target.value })}
                  className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Delivery Fee & Payer Control */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('pipeline.stdDeliveryFeePerOrder', 'Standard Delivery Fee per Order')}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={bulkExpressForm.deliveryFee}
                      onChange={(e) => setBulkExpressForm({ ...bulkExpressForm, deliveryFee: Number(e.target.value) || 0 })}
                      className="w-24 h-7 px-2 text-right rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                    />
                    <span className="text-[10px] font-bold text-slate-400">{baseCode}</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">{t('pipeline.whoHandlesDeliveryFee', 'Who Handles Delivery Fee?')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkExpressForm({ ...bulkExpressForm, deliveryFeePayer: 'CUSTOMER_PAYS' })}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        bulkExpressForm.deliveryFeePayer === 'CUSTOMER_PAYS'
                          ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <div className="text-xs font-black">👤 {t('pipeline.payerCustFull', 'Customer Pays')}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{t('pipeline.payerCustDescShort', 'Excluded from store P&L')}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkExpressForm({ ...bulkExpressForm, deliveryFeePayer: 'SELLER_PAYS' })}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        bulkExpressForm.deliveryFeePayer === 'SELLER_PAYS'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <div className="text-xs font-black">🏪 {t('pipeline.payerStoreShort', 'Seller Pays')}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{t('pipeline.payerStoreDescShort', 'Logged into OPEX Expense')}</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBulkExpressModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-md active:scale-95 cursor-pointer"
                >
                  {t('pipeline.confirmBatchAssignBtn', 'Confirm Batch Assign ({{count}})', { count: selectedOrderIds.length })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Print Multi-Orders Receipt Sheet Modal */}
      {bulkPrintOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 font-mono text-xs my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-base">{t('pipeline.bulkShippingManifestTitle', 'Bulk Shipping Manifest & Bills ({{count}} Invoices)', { count: bulkPrintOrders.length })}</h3>
                <p className="text-[10px] text-slate-500">{t('pipeline.bulkShippingManifestSubtitle', 'Ready for batch thermal printing and warehouse packing')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setBulkPrintOrders(null)} className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold cursor-pointer">
                  {t('common.close', 'Close')}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('pipeline.printAllBillsBtn', 'Print All {{count}} Bills', { count: bulkPrintOrders.length })}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bulkPrintOrders.map((ord) => (
                <div key={ord.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-[11px]">
                  <div className="border-b border-slate-300 pb-1.5">
                    <div className="font-black text-xs">{ord.invoiceNo}</div>
                    <div className="text-[10px] text-slate-500">{ord.channel} • {new Date(ord.createdAt).toLocaleTimeString()}</div>
                  </div>

                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex items-center justify-between">
                      <div><strong>{t('pipeline.customerLabel', 'Customer')}:</strong> {ord.customerName || ord.deliveryContact || t('pipeline.guestCustomer', 'Guest')}</div>
                      {ord.customerPhone && (
                        <WhatsAppPhoneBadge
                          phone={ord.customerPhone}
                          text={`Hello! Regarding your order ${ord.invoiceNo} from 39POS.`}
                          size="xs"
                        />
                      )}
                    </div>
                    {ord.deliveryAddress && <div className="truncate"><strong>{t('pipeline.addressLabel', 'Addr')}:</strong> {ord.deliveryAddress}</div>}
                  </div>

                  <div className="border-t border-b border-dashed border-slate-300 py-1 space-y-0.5">
                    {ord.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="truncate">{item.quantity}x {item.name}</span>
                        <span>{format(convert(item.totalPrice, baseCode, currentCurrency), currentCurrency)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between font-black text-xs pt-1">
                    <span>{t('pipeline.codPayableLabel', 'COD PAYABLE:')}</span>
                    <span className="text-amber-600">{format(convert(ord.totalAmount, baseCode, currentCurrency), currentCurrency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Single Assign Express Modal */}
      {expressModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-purple-500 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{t('pipeline.assignExpressModalTitle', 'Assign Express / Courier')}</h3>
                  <p className="text-[10px] text-slate-400 font-mono font-bold">{t('pipeline.orderLabel', 'Order')}: {expressModalOrder.invoiceNo}</p>
                </div>
              </div>
              <button onClick={() => setExpressModalOrder(null)} className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveExpress} className="space-y-3">
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">{t('pipeline.selectCourierPartnerLabel', 'Select Courier / Delivery Partner')}</label>
                <select
                  value={expressForm.courierName}
                  onChange={(e) => {
                    const cName = e.target.value;
                    const matched = couriers.find((c) => c.name === cName);
                    setExpressForm({
                      ...expressForm,
                      courierName: cName,
                      deliveryFee: matched ? matched.defaultFee : expressForm.deliveryFee,
                      deliveryFeePayer: matched ? matched.defaultFeePayer : expressForm.deliveryFeePayer,
                    });
                  }}
                  className="w-full h-9 px-3 rounded-xl neu-input text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {couriers.filter((c) => c.isActive).map((c) => (
                    <option key={c.id} value={c.name} className="dark:bg-slate-900">
                      {c.icon && !c.icon.startsWith('http') && !c.icon.startsWith('/') && !c.icon.startsWith('data:') ? c.icon : '🚚'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">{t('pipeline.waybillTrackingOptional', 'Waybill / Tracking Number (Optional)')}</label>
                <input
                  type="text"
                  placeholder="e.g. TH01928472910 / ANOU-8492"
                  value={expressForm.trackingNo}
                  onChange={(e) => setExpressForm({ ...expressForm, trackingNo: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl neu-input text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Delivery Fee & Fee Payer Controller */}
              <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('pipeline.deliveryShippingFeeLabel', 'Delivery Shipping Fee')}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={expressForm.deliveryFee}
                      onChange={(e) => setExpressForm({ ...expressForm, deliveryFee: Number(e.target.value) || 0 })}
                      className="w-24 h-8 px-2 text-right rounded-xl neu-input font-mono font-bold text-xs"
                    />
                    <span className="text-[10px] font-bold text-slate-400">{baseCode}</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[10px] text-slate-400 block mb-1.5 uppercase tracking-wider">{t('pipeline.whoHandlesDeliveryFee', 'Who Handles Delivery Fee?')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExpressForm({ ...expressForm, deliveryFeePayer: 'CUSTOMER_PAYS' })}
                      className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        expressForm.deliveryFeePayer === 'CUSTOMER_PAYS'
                          ? 'neu-sunken text-brand-600 dark:text-brand-400 font-bold border border-brand-500/30'
                          : 'neu-card-sm hover:shadow-neu-raised-sm text-slate-500'
                      }`}
                    >
                      <div className="text-xs font-black">👤 {t('pipeline.payerCustFull', 'Customer Pays')}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{t('pipeline.payerCustArrivalDesc', 'Paid on arrival • Excluded from store P&L')}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpressForm({ ...expressForm, deliveryFeePayer: 'SELLER_PAYS' })}
                      className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        expressForm.deliveryFeePayer === 'SELLER_PAYS'
                          ? 'neu-sunken text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                          : 'neu-card-sm hover:shadow-neu-raised-sm text-slate-500'
                      }`}
                    >
                      <div className="text-xs font-black">🏪 {t('pipeline.payerStoreShort', 'Seller Pays')}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{t('pipeline.payerStoreOpexDesc', 'Store freight cost • Accounted in OPEX')}</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setExpressModalOrder(null)}
                  className="px-4 py-2 rounded-xl neu-btn font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl neu-btn-primary text-white font-extrabold active:scale-95 cursor-pointer"
                >
                  {t('pipeline.confirmAssignmentBtn', 'Confirm Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Reject COD Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{t('pipeline.rejectCodModalTitle', 'Reject / Return COD Order')}</h3>
                  <p className="text-[10px] text-slate-400 font-mono font-bold">{t('pipeline.orderLabel', 'Order')}: {rejectModalOrder.invoiceNo}</p>
                </div>
              </div>
              <button onClick={() => setRejectModalOrder(null)} className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveReject} className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-1">
                <p className="font-bold">{t('pipeline.whatHappensNext', 'What happens next?')}</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>{t('pipeline.rejectConsequence1', 'All products in this order are automatically restocked back into inventory.')}</li>
                  <li>{t('pipeline.rejectConsequence2', 'Customer COD refusal count increases. (2 refusals = auto-blacklisted).')}</li>
                  <li>{t('pipeline.rejectConsequence3', 'Delivery courier freight loss (if any) is logged to Operating Expenses.')}</li>
                </ul>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">{t('pipeline.refusalReasonField', 'Refusal / Rejection Reason')}</label>
                <select
                  value={rejectForm.reason}
                  onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl neu-input text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Customer refused / rejected delivery" className="dark:bg-slate-900">{t('pipeline.reasonRefusedDelivery', 'Customer refused / rejected delivery')}</option>
                  <option value="Customer unreachable by courier" className="dark:bg-slate-900">{t('pipeline.reasonUnreachable', 'Customer unreachable by courier')}</option>
                  <option value="Wrong delivery address / fake order" className="dark:bg-slate-900">{t('pipeline.reasonWrongAddress', 'Wrong delivery address / fake order')}</option>
                  <option value="Customer cancelled after dispatch" className="dark:bg-slate-900">{t('pipeline.reasonCancelledAfterDispatch', 'Customer cancelled after dispatch')}</option>
                  <option value="Courier damaged package" className="dark:bg-slate-900">{t('pipeline.reasonCourierDamaged', 'Courier damaged package')}</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">{t('pipeline.courierFreightLossField', 'Courier Freight / Return Shipping Loss ($)')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rejectForm.courierFee}
                  onChange={(e) => setRejectForm({ ...rejectForm, courierFee: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-xl neu-input text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setRejectModalOrder(null)}
                  className="px-4 py-2 rounded-xl neu-btn font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl neu-btn-danger text-white font-extrabold active:scale-95 cursor-pointer"
                >
                  {t('pipeline.confirmRejectRestockBtn', 'Confirm Reject & Restock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Print Setup & Orientation Lock Modal for Live Orders */}
      {printModalOrder && (
        <MinimalPrintModal
          isOpen={Boolean(printModalOrder)}
          onClose={() => setPrintModalOrder(null)}
          defaultTemplate="DELIVERY_COD"
          receiptData={{
            invoiceNo: printModalOrder.invoiceNo,
            createdAt: printModalOrder.createdAt,
            cashierName: printModalOrder.cashierName || 'Staff',
            channel: printModalOrder.channel || 'Online Delivery Hub',
            orderType: printModalOrder.orderType || 'Online Order',
            customerName: printModalOrder.customerName || printModalOrder.deliveryContact || 'Guest',
            customerPhone: printModalOrder.customerPhone || printModalOrder.deliveryContact,
            deliveryAddress: printModalOrder.deliveryAddress,
            courierName: printModalOrder.courierName,
            courierTrackingNo: printModalOrder.courierTrackingNo,
            deliveryFee: Number(printModalOrder.deliveryFee || 0),
            deliveryFeePayer: printModalOrder.deliveryFeePayer,
            items: (printModalOrder.items || []).map((it: any) => ({
              name: it.name,
              variantName: it.variantName,
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice) || (Number(it.totalPrice) / (Number(it.quantity) || 1)) || 0,
              totalPrice: Number(it.totalPrice) || 0,
            })),
            subtotal: Number(printModalOrder.subtotal || printModalOrder.totalAmount),
            discountAmount: Number(printModalOrder.discountAmount || 0),
            taxAmount: Number(printModalOrder.taxAmount || 0),
            totalAmount: Number(printModalOrder.totalAmount),
            paidAmount: printModalOrder.isCod ? 0 : Number(printModalOrder.totalAmount),
            paymentStatus: printModalOrder.isCod ? 'PENDING_COD' : 'PAID',
            payments: [
              {
                paymentMethod: printModalOrder.isCod ? 'CASH ON DELIVERY' : 'ONLINE PREPAID',
                amount: Number(printModalOrder.totalAmount),
                currency: currentCurrency,
              },
            ],
            currencySymbol: currentCurrency === 'LAK' ? '₭' : currentCurrency === 'THB' ? '฿' : '$',
          }}
        />
      )}

      {/* GLORIOUS COD CASH COLLECTION CONFIRMATION MODAL */}
      {codConfirmModalOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-xs relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header with Glowing Icon */}
            <div className="text-center space-y-2 relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20 animate-bounce">
                <Banknote className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                  {t('pipeline.confirmCodCollectionTitle', 'Confirm COD Cash Collection')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t('pipeline.confirmCodCollectionSubtitle', 'Settle Cash-on-Delivery payment into cash register')}
                </p>
              </div>
            </div>

            {/* Main Amount Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 border border-emerald-500/30 text-center space-y-1 relative">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t('pipeline.amountCollectedByCourier', 'Amount Collected by Courier / Rider')}
              </span>
              <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {format(convert(codConfirmModalOrder.totalAmount, baseCode, currentCurrency), currentCurrency)}
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {codConfirmModalOrder.invoiceNo}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase text-[10px] font-black">
                  {codConfirmModalOrder.channel || 'POS'}
                </span>
              </div>
            </div>

            {/* Customer & Courier Summary Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">{t('pipeline.customerLabel', 'Customer')}:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {codConfirmModalOrder.customerName
                    ? `${codConfirmModalOrder.customerName} ${codConfirmModalOrder.customerSurname || ''}`.trim()
                    : codConfirmModalOrder.deliveryContact || t('pipeline.guestCustomer', 'Guest Customer')}
                </span>
              </div>

              {codConfirmModalOrder.courierName && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">{t('pipeline.deliveryCourierLabel', 'Delivery Courier:')}</span>
                  <div className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                    <Truck className="w-3.5 h-3.5" />
                    <span>{codConfirmModalOrder.courierName}</span>
                    {codConfirmModalOrder.courierTrackingNo && (
                      <span className="font-mono text-[10px] text-slate-400">#{codConfirmModalOrder.courierTrackingNo}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t('pipeline.settlementActionLabel', 'Settlement Action:')}</span>
                </div>
                <span>{t('pipeline.markAsPaidStep6', 'Mark as PAID • Move to Step 6')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSettlingCod}
                onClick={() => setCodConfirmModalOrder(null)}
                className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs active:scale-95 transition-all cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={isSettlingCod}
                onClick={handleConfirmSingleCod}
                className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSettlingCod ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('pipeline.settlingPayment', 'Settling Payment...')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('pipeline.confirmCashCollectedBtn', 'Confirm Cash Collected ➔')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH COD CASH COLLECTION CONFIRMATION MODAL */}
      {bulkCodConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-xs relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header with Glowing Icon */}
            <div className="text-center space-y-2 relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20 animate-bounce">
                <Coins className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                  {t('pipeline.batchCodSettlementTitle', 'Batch COD Cash Settlement')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t('pipeline.batchCodSettlementSubtitle', 'Settle multiple Cash-on-Delivery orders at once')}
                </p>
              </div>
            </div>

            {/* Selected Orders Total Amount Card */}
            {(() => {
              const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
              const totalSum = selectedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

              return (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 border border-emerald-500/30 text-center space-y-1 relative">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('pipeline.totalCashPayableSelected', 'Total Cash Payable for {{count}} Selected Orders', { count: selectedOrders.length })}
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {format(convert(totalSum, baseCode, currentCurrency), currentCurrency)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {t('pipeline.allOrdersSettledPaidNotice', 'All {{count}} orders will be marked as Settled & PAID', { count: selectedOrders.length })}
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSettlingCod}
                onClick={() => setBulkCodConfirmOpen(false)}
                className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs active:scale-95 transition-all cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={isSettlingCod}
                onClick={handleConfirmBulkCod}
                className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSettlingCod ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('pipeline.settlingBatch', 'Settling Batch...')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('pipeline.confirmBatchSettlementBtn', 'Confirm Batch Settlement ➔')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

