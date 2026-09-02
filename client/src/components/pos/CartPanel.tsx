import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../store/useCartStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { usePlatformStore } from '../../store/usePlatformStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLiveOrdersStore } from '../../store/useLiveOrdersStore';
import { soundFX } from '../../utils/audio';
import { WhatsAppPhoneBadge } from '../common/WhatsAppPhoneBadge';
import { CodDispatchFlyer } from './CodDispatchFlyer';
import {
  Trash2,
  Plus,
  Minus,
  PauseCircle,
  PlayCircle,
  Percent,
  UserCheck,
  ShoppingBag,
  CreditCard,
  UtensilsCrossed,
  UserX,
  Coins,
  Sparkles,
  Gift,
  X,
  SlidersHorizontal,
  Check,
  Phone,
  User,
  Users,
  HeartHandshake,
  MapPin,
  FileText,
  Dice5,
  Globe,
  Store,
  Zap,
  UserPlus,
  Truck,
  AlertTriangle,
  AlertCircle,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../api/client';
import { CustomerSelectModal, PosCustomer } from './CustomerSelectModal';
import { QuickAddCustomerModal } from './QuickAddCustomerModal';
import { TableSelectModal } from './TableSelectModal';
import { PlatformManagerModal } from '../platforms/PlatformManagerModal';

interface CartPanelProps {
  onOpenPayment: () => void;
  onOpenHolds: () => void;
}

const TIER_BADGES: Record<string, string> = {
  PLATINUM: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  GOLD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  SILVER: 'bg-slate-400/20 text-slate-200 border-slate-400/30',
  BRONZE: 'bg-orange-800/20 text-orange-400 border-orange-700/30',
};

export const CartPanel: React.FC<CartPanelProps> = ({ onOpenPayment, onOpenHolds }) => {
  const { t } = useTranslation();
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTierDiscountAmount,
    getPointsDiscountAmount,
    getTotalDiscount,
    getTotalTax,
    getGrandTotal,
    discountRate,
    setOrderDiscount,
    selectedCustomer,
    setCustomerData,
    redeemedPoints,
    setRedeemedPoints,
    tableNo,
    setTableNo,
    enableTax,
    taxName,
    taxRate,
    taxCalculationMode,
    channel = 'POS',
    setChannel,
    orderType = 'DINE_IN',
    setOrderType,
    externalOrderId = '',
    setExternalOrderId,
    deliveryAddress = '',
    setDeliveryAddress,
    deliveryContact = '',
    setDeliveryContact,
  } = useCartStore();

  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const { businessMode } = useSettingsStore();
  const { platforms, fetchPlatforms } = usePlatformStore();

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const triggerCodDispatch = useLiveOrdersStore((s) => s.triggerCodDispatch);

  const [discountVal, setDiscountVal] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [showPointsRedeem, setShowPointsRedeem] = useState(false);
  const [showPlatformManager, setShowPlatformManager] = useState(false);
  const [codSuccessModal, setCodSuccessModal] = useState<{
    invoiceNo: string;
    totalAmount: number;
    customer: string;
    channel: string;
  } | null>(null);
  const [dropAlert, setDropAlert] = useState<string | null>(null);

  useEffect(() => {
    if (dropAlert) {
      const timer = setTimeout(() => setDropAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [dropAlert]);

  // Customer Autocomplete & Search State
  const [customerDirectory, setCustomerDirectory] = useState<PosCustomer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [dismissedMatchId, setDismissedMatchId] = useState<string | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const platformScrollRef = useRef<HTMLDivElement>(null);
  // Platform Slide Navigation State
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkPlatformScrollBounds = () => {
    if (platformScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = platformScrollRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  };

  const slidePlatforms = (direction: 'left' | 'right') => {
    if (platformScrollRef.current) {
      soundFX.playBeep();
      const amount = direction === 'left' ? -140 : 140;
      platformScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkPlatformScrollBounds, 250);
    }
  };

  const handlePlatformWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (platformScrollRef.current && e.deltaY !== 0) {
      platformScrollRef.current.scrollLeft += e.deltaY;
      checkPlatformScrollBounds();
    }
  };

  const fetchCustomerDirectory = async () => {
    try {
      const res = await api.get('/customers');
      setCustomerDirectory(res.data.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers in CartPanel:', err);
    }
  };

  useEffect(() => {
    fetchPlatforms();
    fetchCustomerDirectory();
  }, [fetchPlatforms]);

  // Track platform scroll limits
  useEffect(() => {
    checkPlatformScrollBounds();
    const el = platformScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkPlatformScrollBounds, { passive: true });
      window.addEventListener('resize', checkPlatformScrollBounds);
      return () => {
        el.removeEventListener('scroll', checkPlatformScrollBounds);
        window.removeEventListener('resize', checkPlatformScrollBounds);
      };
    }
  }, [platforms, businessMode]);

  // Click outside to close customer auto-suggest dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-sync channel and defaults when businessMode changes
  useEffect(() => {
    if (businessMode === 'ONLINE_HUB') {
      const firstOnline = platforms.find((p) => p.isActive)?.code || 'GF';
      setChannel(firstOnline);
      setOrderType('DELIVERY');
    } else if (businessMode === 'RESTAURANT_CAFE') {
      setChannel('POS');
      setOrderType('DINE_IN');
    } else if (businessMode === 'RETAIL_MINIMART') {
      setChannel('POS');
      setOrderType('TAKEAWAY');
    }
  }, [businessMode, platforms, setChannel, setOrderType]);

  const subtotal = getSubtotal();
  const tierDiscountAmt = getTierDiscountAmount();
  const pointsDiscountAmt = getPointsDiscountAmount();
  const totalDiscount = getTotalDiscount();
  const totalTax = getTotalTax();
  const grandTotal = getGrandTotal();

  const isMinimartMode = businessMode === 'RETAIL_MINIMART';
  const isRestaurantMode = businessMode === 'RESTAURANT_CAFE';
  const isOnlineMode = businessMode === 'ONLINE_HUB' || (businessMode === 'HYBRID' && channel !== 'POS');
  const showPlatformSelectorBar = businessMode === 'HYBRID' || businessMode === 'ONLINE_HUB';

  // Active platforms
  const activePlatforms = platforms.filter((p) => p.isActive);

  // Generate random order reference code based on current channel
  const handleGenerateOrderId = () => {
    const matchedPlatform = platforms.find((p) => p.code === channel || p.id === channel);
    const prefix = matchedPlatform?.code || 'ONL';
    const randDigits = Math.floor(100000 + Math.random() * 900000);
    const generated = `${prefix}-${randDigits}`;
    setExternalOrderId(generated);
    soundFX.playBeep();
  };

  const customerSuggestions = customerDirectory
    .filter((c) => {
      if (!deliveryContact.trim()) return true;
      const s = deliveryContact.toLowerCase().trim();
      const fullName = `${c.name || ''} ${c.surname || ''}`.toLowerCase();
      return (
        fullName.includes(s) ||
        (c.phone && c.phone.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.address && c.address.toLowerCase().includes(s)) ||
        (c.memberCode && c.memberCode.toLowerCase().includes(s))
      );
    })
    .slice(0, 6);

  // Dynamic matching CRM member detection
  const matchedCrmCustomer = React.useMemo(() => {
    if (!deliveryContact.trim()) return null;
    const s = deliveryContact.toLowerCase().trim();
    return (
      customerDirectory.find((c) => {
        const fullName = `${c.name || ''} ${c.surname || ''}`.toLowerCase().trim();
        const firstName = (c.name || '').toLowerCase().trim();
        return (
          fullName === s ||
          firstName === s ||
          (c.phone && c.phone.trim().toLowerCase() === s) ||
          (c.memberCode && c.memberCode.toLowerCase() === s)
        );
      }) || null
    );
  }, [deliveryContact, customerDirectory]);

  const showMatchBanner =
    matchedCrmCustomer &&
    (!selectedCustomer || selectedCustomer.id !== matchedCrmCustomer.id) &&
    dismissedMatchId !== matchedCrmCustomer.id;

  const handleSelectCustomer = (c: PosCustomer) => {
    const fullName = `${c.name} ${c.surname || ''}`.trim();
    setDeliveryContact(fullName);
    setCustomerData(c as any);
    setDismissedMatchId(null);
    setShowCustomerDropdown(false);
    soundFX.playCashSuccess();
  };

  const handleClearCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeliveryContact('');
    setCustomerData(null);
    setDismissedMatchId(null);
    setShowCustomerDropdown(false);
  };

  const handleCustomerCreated = (newCust: PosCustomer) => {
    fetchCustomerDirectory();
    const fullName = `${newCust.name} ${newCust.surname || ''}`.trim();
    setDeliveryContact(fullName);
    setCustomerData(newCust as any);
    setDismissedMatchId(null);
  };

  const isCustomerBlacklisted = Boolean(
    (selectedCustomer as any)?.isBlacklisted ||
    (matchedCrmCustomer && (matchedCrmCustomer as any).isBlacklisted)
  );

  const handleDispatchCod = async () => {
    if (items.length === 0) return;
    if (isCustomerBlacklisted) {
      soundFX.playError();
      alert('⚠️ This customer is blacklisted from Cash On Delivery due to past refused orders. Please collect upfront payment.');
      return;
    }

    try {
      const res = await api.post('/pos/checkout', {
        storeId: 'store-flagship',
        cashierId: 'user-admin',
        customerId: selectedCustomer?.id,
        items,
        isHold: false,
        isCod: true,
        channel: channel || 'POS',
        externalOrderId: externalOrderId || `COD-${Math.floor(100000 + Math.random() * 900000)}`,
        deliveryAddress: deliveryAddress || null,
        deliveryContact: deliveryContact || (selectedCustomer ? `${selectedCustomer.name} ${(selectedCustomer as any).surname || ''}`.trim() : 'Guest Delivery'),
        notes: null,
        discountAmount: getTotalDiscount(),
      });

      soundFX.playCashSuccess();
      const invoiceNo = res.data?.invoiceNo || `INV-COD-${Date.now()}`;
      setCodSuccessModal({
        invoiceNo,
        totalAmount: getGrandTotal(),
        customer: deliveryContact || selectedCustomer?.name || 'Guest',
        channel: channel || 'POS',
      });
      clearCart();
    } catch (err: any) {
      soundFX.playError();
      alert(`COD Dispatch failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleHoldOrder = async () => {
    if (items.length === 0) return;
    try {
      await api.post('/pos/checkout', {
        storeId: 'store-flagship',
        cashierId: 'user-admin',
        customerId: selectedCustomer?.id,
        items,
        isHold: true,
        holdReference: `HOLD-${Date.now()}`,
        tableNo: isOnlineMode ? undefined : tableNo,
        channel,
        externalOrderId,
        deliveryAddress,
        deliveryContact,
      });
      soundFX.playBeep();
      clearCart();
    } catch (err: any) {
      alert(`Hold order failed: ${err.message}`);
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountVal) || 0;
    setOrderDiscount(val, true);
    setShowDiscountInput(false);
  };

  const maxRedeemablePoints = selectedCustomer
    ? Math.min(selectedCustomer.points, Math.floor(subtotal * 100))
    : 0;

  // ─── Drag and Drop Catalog Products to Cart ───
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const product = JSON.parse(raw);
        if (product && product.id) {
          const stock = product.stockQuantity ?? 0;
          if (stock <= 0) {
            soundFX.playError();
            setDropAlert(
              t('pos.cannotAddOutOfStock', 'Cannot add: "{{name}}" is out of stock (0 in stock)', {
                name: product.name,
              })
            );
            return;
          }

          soundFX.playCashSuccess();
          if (product.hasVariants && product.variants && product.variants.length > 0) {
            addItem(product, product.variants[0]);
          } else {
            addItem(product);
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse dropped product:', err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-96 flex flex-col h-full neu-card-lg overflow-hidden relative transition-all duration-200 ${
        isDragOver
          ? 'border-2 border-dashed border-emerald-500 shadow-neu-glow-emerald'
          : ''
      }`}
    >
      {/* ─── Out of Stock Drop Alert Banner ─── */}
      {dropAlert && (
        <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-150 pointer-events-none">
          <div className="px-3.5 py-2.5 rounded-2xl bg-rose-600/95 text-white border border-rose-400/50 backdrop-blur-md shadow-xl flex items-center gap-2.5 text-xs font-black shadow-rose-500/30">
            <AlertCircle className="w-4 h-4 text-white animate-pulse flex-shrink-0" />
            <span className="truncate">{dropAlert}</span>
          </div>
        </div>
      )}

      {/* ─── Glowing Dropzone Overlay ─── */}
      {isDragOver && (
        <div className="absolute inset-2 z-40 rounded-3xl border-2 border-dashed border-emerald-400 bg-emerald-500/20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl neu-btn-primary text-white flex items-center justify-center shadow-neu-glow-emerald animate-bounce">
            <Plus className="w-8 h-8 stroke-[3]" />
          </div>
          <div>
            <div className="font-black text-base text-emerald-600 dark:text-emerald-300 drop-shadow-sm">
              {t('pos.dropToAdd', 'Drop to Add to Ticket!')}
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-200 font-bold mt-0.5">
              {t('pos.dropToAddSub', '+1 Item automatically added & recalculated')}
            </p>
          </div>
        </div>
      )}

      {/* Top Header: Platform Selector & Mode */}
      <div className="p-3.5 border-b border-black/5 dark:border-white/5 neu-surface space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnlineMode ? (
              <ShoppingBag className="w-4 h-4 text-pink-500" />
            ) : isRestaurantMode ? (
              <UtensilsCrossed className="w-4 h-4 text-amber-500" />
            ) : isMinimartMode ? (
              <Store className="w-4 h-4 text-emerald-500" />
            ) : (
              <Zap className="w-4 h-4 text-indigo-500" />
            )}
            <span className="font-extrabold text-sm text-slate-800 dark:text-white">
              {isOnlineMode
                ? t('pos.onlinePlatformOrder', 'Online Platform Order')
                : isRestaurantMode
                ? t('pos.restaurantTableOrder', 'Restaurant Table Order')
                : isMinimartMode
                ? t('pos.minimartFastCheckout', 'Minimart Fast Checkout')
                : t('pos.activeInStoreOrder', 'Active In-Store Order')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenHolds}
              title={t('pos.heldOrders', 'View Held Orders')}
              className="px-2.5 py-1 neu-btn text-[11px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>{t('pos.held', 'Held')}</span>
            </button>

            <button
              onClick={clearCart}
              title={t('pos.clearCart', 'Clear Cart')}
              disabled={items.length === 0}
              className="neu-circle-btn !w-7 !h-7 text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Platform Selector Bar (Only in Hybrid or Online Platform Hub modes) */}
        {showPlatformSelectorBar && (
          <div className="flex items-center gap-1">
            {/* Slide Left Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => slidePlatforms('left')}
                title="Scroll Left"
                className="w-6 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-brand-500 hover:text-white text-slate-500 dark:text-slate-400 border border-slate-300/80 dark:border-slate-700/80 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 shadow-xs animate-in fade-in zoom-in-95 duration-150"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}

            {/* Scrollable Tabs Track */}
            <div
              ref={platformScrollRef}
              onWheel={handlePlatformWheel}
              className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] scrollbar-none no-scrollbar smooth-scroll scroll-smooth select-none min-w-0"
            >
              {/* In-Store POS (unless in pure Online Hub mode) */}
              {businessMode !== 'ONLINE_HUB' && (
                <button
                  type="button"
                  onClick={(e) => {
                    setChannel('POS');
                    setOrderType('DINE_IN');
                    (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    soundFX.playBeep();
                  }}
                  className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 border transition-all ${
                    channel === 'POS'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                      : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-brand-500" />
                  <span>{t('pos.inStorePos', 'In-Store POS')}</span>
                </button>
              )}

              {/* Dynamic Online Platforms */}
              {activePlatforms.map((plt) => {
                const isSelected = channel === plt.code || channel === plt.id;
                return (
                  <button
                    key={plt.id}
                    type="button"
                    onClick={(e) => {
                      setChannel(plt.code);
                      setOrderType('DELIVERY');
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                      // Auto-update prefix when switching platform
                      if (externalOrderId) {
                        const parts = externalOrderId.split('-');
                        const digits = parts.length > 1 ? parts[1] : Math.floor(100000 + Math.random() * 900000);
                        setExternalOrderId(`${plt.code}-${digits}`);
                      } else {
                        const randDigits = Math.floor(100000 + Math.random() * 900000);
                        setExternalOrderId(`${plt.code}-${randDigits}`);
                      }
                      soundFX.playBeep();
                    }}
                    className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-brand-500/20 to-emerald-500/20 text-brand-600 dark:text-brand-300 border-brand-500/80 shadow-md shadow-brand-500/10 ring-1 ring-brand-500/40'
                        : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {plt.icon && (plt.icon.startsWith('/uploads/') || plt.icon.startsWith('http') || plt.icon.startsWith('data:')) ? (
                      <img src={plt.icon} alt={plt.name} className="w-3.5 h-3.5 rounded object-cover flex-shrink-0" />
                    ) : (
                      <span>{plt.icon}</span>
                    )}
                    <span>{plt.name}</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 text-slate-400 font-bold">{plt.code}</span>
                  </button>
                );
              })}
            </div>

            {/* Slide Right Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => slidePlatforms('right')}
                title="Scroll Right"
                className="w-6 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-brand-500 hover:text-white text-slate-500 dark:text-slate-400 border border-slate-300/80 dark:border-slate-700/80 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 shadow-xs animate-in fade-in zoom-in-95 duration-150"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}

            {/* Manage Platforms Button */}
            <button
              type="button"
              onClick={() => setShowPlatformManager(true)}
              title="Add, Edit, or Customize Online Platforms"
              className="p-1 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-brand-500 hover:border-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 flex items-center gap-1 px-2 py-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">{t('common.manage', 'Manage')}</span>
            </button>
          </div>
        )}

        {/* ADAPTIVE CART CONTROLS */}
        {isOnlineMode ? (
          /* ONLINE PLATFORM HUB ORDER FIELDS (Neumorphic Suite) */
          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
            {/* External Order ID & Auto Generator */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 flex items-center neu-sunken-sm rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-brand-500 transition-all">
                <span className="px-2.5 py-1.5 neu-card-sm text-[10px] font-mono font-black text-brand-600 dark:text-brand-400 select-none">
                  {channel || 'ONL'}
                </span>
                <input
                  type="text"
                  placeholder={t('pos.orderIdPlaceholder', 'Order ID / Ref (e.g. 982143)')}
                  value={externalOrderId}
                  onChange={(e) => setExternalOrderId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-transparent text-[11px] font-mono font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateOrderId}
                title="Generate Random Order ID"
                className="h-8 px-3 rounded-xl neu-btn text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Dice5 className="w-3.5 h-3.5 text-brand-500" />
                <span>{t('common.auto', 'Auto')}</span>
              </button>
            </div>

            {/* Customer Name Input with Dynamic Match & CRM Linking */}
            <div className="space-y-1.5 relative">
              <div className="relative" ref={customerDropdownRef}>
                <input
                  type="text"
                  placeholder={t('pos.customerPlaceholder', 'Customer name / phone...')}
                  value={deliveryContact}
                  onFocus={() => {
                    fetchCustomerDirectory();
                    setShowCustomerDropdown(true);
                  }}
                  onChange={(e) => {
                    setDeliveryContact(e.target.value);
                    setDismissedMatchId(null);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full h-8 pl-7 pr-14 rounded-xl neu-sunken-sm text-[11px] text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-brand-500 outline-none"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                
                {/* Actions inside input: Clear & Quick Add */}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {deliveryContact && (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      title="Clear customer"
                      className="w-5 h-5 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setQuickAddModalOpen(true)}
                    title="Quick Add New Customer (Saves to CRM)"
                    className="w-5 h-5 neu-circle-btn text-emerald-600 dark:text-emerald-400 flex items-center justify-center active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                  </button>
                </div>

                {/* Interactive Auto-Suggest Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute left-0 top-full mt-2 w-full neu-card-lg rounded-2xl shadow-neu-raised-lg z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100 border border-black/5 dark:border-white/5">
                    <div className="p-2.5 border-b border-black/5 dark:border-white/5 neu-surface flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-brand-500" />
                        <span>{t('pos.customerLookup', 'Customer CRM Lookup')}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {customerSuggestions.length} found
                      </span>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1 p-1.5">
                      {customerSuggestions.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 space-y-1">
                          <p className="text-[11px] font-bold">No existing customer found for "{deliveryContact}"</p>
                          <p className="text-[10px] text-slate-500">Will be saved as guest / custom customer</p>
                        </div>
                      ) : (
                        customerSuggestions.map((c) => {
                          const fullName = `${c.name} ${c.surname || ''}`.trim();
                          const isSelected = selectedCustomer?.id === c.id;
                          const tierBadge = TIER_BADGES[c.tier] || TIER_BADGES.BRONZE;

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'neu-sunken text-brand-600 dark:text-brand-400 font-bold border border-brand-500/30'
                                  : 'neu-card-sm hover:shadow-neu-raised-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center flex-shrink-0 text-xs font-black">
                                  {c.avatarUrl ? (
                                    <img src={c.avatarUrl} alt={fullName} className="w-full h-full object-cover rounded-xl" />
                                  ) : c.gender === 'FEMALE' ? (
                                    <HeartHandshake className="w-3.5 h-3.5 text-pink-400" />
                                  ) : c.gender === 'MALE' ? (
                                    <User className="w-3.5 h-3.5 text-sky-400" />
                                  ) : (
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-[11px] text-slate-900 dark:text-white truncate">
                                    {fullName}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono truncate flex items-center gap-1 mt-0.5">
                                    <span>{c.memberCode || 'STANDARD'}</span>
                                    {c.phone && (
                                      <WhatsAppPhoneBadge
                                        phone={c.phone}
                                        text={`Hello ${fullName}! Greetings from 39POS.`}
                                        size="xs"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${tierBadge}`}>
                                  {c.tier}
                                </span>
                                <span className="text-[9px] text-brand-600 dark:text-brand-400 font-mono font-bold mt-0.5">
                                  {c.points} pts
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2 border-t border-black/5 dark:border-white/5 neu-surface flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          setQuickAddModalOpen(true);
                        }}
                        className="text-[10px] text-brand-600 dark:text-brand-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Add New Customer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          setCustomerModalOpen(true);
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold hover:underline"
                      >
                        Browse all directory →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Animated CRM Match Recognition Popover */}
              {showMatchBanner && matchedCrmCustomer && (
                <div className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/40 crm-match-card crm-match-glow space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                      <span className="font-extrabold text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                        Matching CRM Member Found
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${TIER_BADGES[matchedCrmCustomer.tier] || TIER_BADGES.BRONZE}`}>
                      {matchedCrmCustomer.tier} VIP
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-white/70 dark:bg-slate-800/70 p-1.5 rounded-xl border border-emerald-500/20">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {matchedCrmCustomer.name} {matchedCrmCustomer.surname || ''}
                    </div>
                    <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-extrabold flex-shrink-0">
                      {matchedCrmCustomer.points} pts available
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerData(matchedCrmCustomer as any);
                        soundFX.playCashSuccess();
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[10px] flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Link Member & Apply Perks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDismissedMatchId(matchedCrmCustomer.id)}
                      className="py-1.5 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold text-[10px] active:scale-95 transition-all"
                      title="Do not use CRM points/tier benefits for this customer"
                    >
                      Guest Only
                    </button>
                  </div>
                </div>
              )}

              {/* Active Linked CRM Member Badge */}
              {selectedCustomer && (
                <div className="p-2 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between gap-2 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-black shadow-xs">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[11px] text-slate-900 dark:text-white truncate">
                          {selectedCustomer.name}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${TIER_BADGES[selectedCustomer.tier] || TIER_BADGES.BRONZE}`}>
                          {selectedCustomer.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-brand-600 dark:text-brand-400 font-mono font-bold mt-0.5">
                        <span>Loyalty Active • {selectedCustomer.points} pts</span>
                        {selectedCustomer.phone && (
                          <WhatsAppPhoneBadge
                            phone={selectedCustomer.phone}
                            text={`Hello ${selectedCustomer.name}! Greetings from 39POS.`}
                            size="xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomerData(null);
                      soundFX.playBeep();
                    }}
                    title="Unlink member profile (Revert to guest order)"
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 text-slate-400 text-[10px] font-bold transition-all flex items-center gap-1 flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                    <span>Unlink</span>
                  </button>
                </div>
              )}

              {/* COD Blacklist Warning Banner */}
              {isCustomerBlacklisted && (
                <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 animate-in fade-in zoom-in-95">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <div className="font-black text-[11px] uppercase tracking-wider">🚫 COD Blacklisted Customer</div>
                    <p className="text-[10px] text-rose-600/90 dark:text-rose-400/90 font-medium leading-tight mt-0.5">
                      This customer has refused past COD deliveries. Cash On Delivery is disabled. Collect upfront payment via Card, QR, or Cash.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* IN-STORE POS CONTROLS (Minimart vs Restaurant vs Hybrid) */
          <div className="space-y-1.5">
            {isRestaurantMode ? (
              <div className="flex items-center gap-2 text-xs">
                {/* Prominent Table Picker */}
                <div className="flex-1 flex items-center min-w-0">
                  <button
                    type="button"
                    onClick={() => setTableModalOpen(true)}
                    className={`w-full px-3 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      tableNo
                        ? 'border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-sm ring-1 ring-amber-500/30'
                        : 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 font-extrabold animate-pulse'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="truncate text-[11px]">{tableNo ? `Table: ${tableNo}` : 'Tap to Pick Table #'}</span>
                    </div>
                  </button>
                  {tableNo && (
                    <button
                      type="button"
                      onClick={() => setTableNo(undefined)}
                      title="Clear Table Selection"
                      className="ml-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Customer Pill */}
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all truncate flex-1 min-w-0 ${
                    selectedCustomer
                      ? 'border-brand-500/80 bg-brand-500/10 text-slate-900 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className={`w-3.5 h-3.5 flex-shrink-0 ${selectedCustomer ? 'text-brand-500' : 'text-slate-400'}`} />
                    <span className="truncate text-[11px]">{selectedCustomer?.name || 'Walk-in Guest'}</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className={isMinimartMode ? 'w-full text-xs' : 'grid grid-cols-2 gap-2 text-xs'}>
                {/* Customer Pill */}
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all truncate w-full ${
                    selectedCustomer
                      ? 'border-brand-500/80 bg-brand-500/10 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {selectedCustomer ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                        <span className="font-bold truncate text-[11px]">{selectedCustomer.name}</span>
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-400 truncate text-[11px]">{t('pos.walkInCustomer', 'Walk-in Customer')}</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Table Picker (Hybrid Mode) */}
                {!isMinimartMode && (
                  <button
                    type="button"
                    onClick={() => setTableModalOpen(true)}
                    className={`px-3 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all truncate ${
                      tableNo
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                      <span className="truncate text-[11px]">{tableNo ? `${t('tables.title', 'Table')}: ${tableNo}` : t('pos.tableFloor', 'Table # (Floor)')}</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Items Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 p-6 text-center">
            <ShoppingBag className="w-12 h-12 stroke-[1.2] opacity-30" />
            <div className="font-extrabold text-sm text-slate-600 dark:text-slate-400">{t('pos.ticketEmpty', 'Ticket is Empty')}</div>
            <p className="text-[11px] text-slate-400">
              {isOnlineMode
                ? t('pos.selectProductsOnline', 'Select products or scan items for this online delivery order')
                : t('pos.scanBarcodeTicket', 'Scan a barcode or tap products to build customer ticket')}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div key={`${item.productId}-${item.variantId || 'base'}`} className="pt-2.5 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-800 dark:text-white truncate">
                    {item.name}
                  </div>
                  {item.variantName && (
                    <div className="text-[10px] font-semibold text-brand-500">
                      {item.variantName}
                    </div>
                  )}
                  <div className="text-[11px] font-mono text-slate-400">
                    {format(convert(item.unitPrice, baseCode, currentCurrency), currentCurrency)} each
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                    {format(convert(item.totalPrice, baseCode, currentCurrency), currentCurrency)}
                  </div>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-50 shadow-xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-black text-xs font-mono text-slate-800 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-50 shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.productId, item.variantId)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{t('pos.subtotal', 'Subtotal')}:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {format(convert(subtotal, baseCode, currentCurrency), currentCurrency)}
          </span>
        </div>

        {/* Tier Discount Line */}
        {tierDiscountAmt > 0 && (
          <div className="flex justify-between text-xs font-bold text-amber-500">
            <span>{t('pos.vipDiscount', 'VIP Loyalty Discount')}:</span>
            <span className="font-mono">
              -{format(convert(tierDiscountAmt, baseCode, currentCurrency), currentCurrency)}
            </span>
          </div>
        )}

        {/* Points Discount Line */}
        {pointsDiscountAmt > 0 && (
          <div className="flex justify-between text-xs font-bold text-purple-500">
            <span>{t('pos.pointsDiscount', 'Points Discount')} ({redeemedPoints} pts):</span>
            <span className="font-mono">
              -{format(convert(pointsDiscountAmt, baseCode, currentCurrency), currentCurrency)}
            </span>
          </div>
        )}

        {/* Tax Line */}
        {enableTax && taxRate > 0 && (
          <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>
              {taxName} ({taxRate}%) [{taxCalculationMode === 'INCLUSIVE' ? 'Inc.' : 'Add.'}]:
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {taxCalculationMode === 'INCLUSIVE' ? 'Included' : format(convert(totalTax, baseCode, currentCurrency), currentCurrency)}
            </span>
          </div>
        )}

        {/* Total Payable */}
        <div className="pt-3 pb-1 border-t border-black/5 dark:border-white/5 flex justify-between items-end">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
              <span>{t('pos.totalPayable', 'Total Payable')}</span>
              {currentCurrency !== baseCode && (
                <span className="px-1.5 py-0.5 rounded-md neu-pill text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  {currentCurrency}
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none mt-1">
              {format(convert(grandTotal, baseCode, currentCurrency), currentCurrency)}
            </div>
          </div>

          {/* Discount Trigger Button */}
          <button
            onClick={() => setShowDiscountInput(!showDiscountInput)}
            className={`px-3 py-1.5 neu-btn text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              totalDiscount > 0
                ? 'neu-sunken text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-emerald-500" />
            <span>{totalDiscount > 0 ? `${format(convert(totalDiscount, baseCode, currentCurrency), currentCurrency)} OFF` : t('pos.discount', 'Discount')}</span>
          </button>
        </div>

        {/* Custom Discount Input */}
        {showDiscountInput && (
          <div className="flex items-center gap-2 pt-2 animate-in fade-in">
            <input
              type="number"
              placeholder={t('pos.discount', 'Discount') + ' %'}
              value={discountVal}
              onChange={(e) => setDiscountVal(e.target.value)}
              className="w-full h-9 px-3 neu-input text-xs font-mono font-bold outline-none"
            />
            <button
              onClick={handleApplyDiscount}
              className="px-4 h-9 neu-btn-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              {t('common.apply', 'Apply')}
            </button>
          </div>
        )}

        {/* Checkout Action Buttons (Consistent Height & State-of-the-Art Typography) */}
        <div className={`grid ${isOnlineMode ? 'grid-cols-5' : 'grid-cols-3'} gap-2 pt-2 w-full`}>
          {/* Hold Button */}
          <button
            onClick={handleHoldOrder}
            disabled={items.length === 0}
            className={`${
              isOnlineMode ? 'col-span-1' : 'col-span-1'
            } min-h-[58px] py-2 px-1 neu-btn transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 overflow-hidden cursor-pointer ${
              items.length === 0
                ? 'opacity-40 cursor-not-allowed shadow-none'
                : 'active:scale-95'
            }`}
          >
            <PauseCircle className={`w-4 h-4 flex-shrink-0 ${items.length === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-amber-500'}`} />
            <span className="text-[10px] sm:text-[11px] font-extrabold truncate w-full text-center px-0.5">{t('pos.hold', 'Hold')}</span>
          </button>

          {/* Dispatch COD Button (Online Mode Only) */}
          {isOnlineMode && (
            <button
              onClick={handleDispatchCod}
              disabled={items.length === 0 || isCustomerBlacklisted}
              title={
                isCustomerBlacklisted
                  ? 'COD blocked for blacklisted customer'
                  : 'Dispatch order as Cash On Delivery (Sends to Live Orders Hub)'
              }
              className={`col-span-2 min-h-[58px] py-2 px-1.5 neu-btn-accent transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 overflow-hidden w-full cursor-pointer ${
                isCustomerBlacklisted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 cursor-not-allowed opacity-50'
                  : items.length === 0
                  ? 'opacity-40 cursor-not-allowed shadow-none'
                  : 'shadow-neu-glow-amber active:scale-95'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-black min-w-0 w-full px-0.5">
                <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t('pos.dispatchCod', 'Dispatch COD')}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold opacity-90 leading-none truncate w-full text-center px-0.5">
                {t('pos.livePipeline', 'Live Pipeline')}
              </span>
            </button>
          )}

          {/* Pay / Prepaid Button */}
          <button
            onClick={onOpenPayment}
            disabled={items.length === 0}
            className={`${
              isOnlineMode ? 'col-span-2' : 'col-span-2'
            } min-h-[58px] py-2 px-1.5 neu-btn-primary transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 overflow-hidden w-full cursor-pointer ${
              items.length === 0
                ? 'opacity-40 cursor-not-allowed shadow-none'
                : 'shadow-neu-glow-emerald active:scale-95'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-black min-w-0 w-full px-0.5">
              <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {isOnlineMode ? t('pos.prepaidPay', 'Prepaid / Pay') : t('pos.pay', 'Pay Now')}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold opacity-95 leading-none truncate w-full text-center px-0.5">
              ({t('pos.itemsCount', '{{count}} items', { count: items.reduce((sum, i) => sum + i.quantity, 0) })})
            </span>
          </button>
        </div>
      </div>

      {/* Customer Select Modal */}
      <CustomerSelectModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        selectedCustomerId={selectedCustomer?.id}
        onSelectCustomer={(cust) => setCustomerData(cust)}
      />

      {/* Quick Add Customer Modal */}
      <QuickAddCustomerModal
        isOpen={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
        initialQuery={deliveryContact}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* Table Select Modal */}
      <TableSelectModal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        selectedTableNo={tableNo}
        onSelectTable={(code) => setTableNo(code)}
      />

      {/* Online Platforms CRUD Manager Modal */}
      <PlatformManagerModal
        isOpen={showPlatformManager}
        onClose={() => setShowPlatformManager(false)}
      />

      {/* COD Dispatch Confirmation Modal */}
      {codSuccessModal && (
        <div
          onClick={() => setCodSuccessModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm neu-card-lg rounded-3xl p-6 space-y-4 text-center relative animate-in zoom-in-95 duration-150"
          >
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => setCodSuccessModal(null)}
              className="absolute top-4 right-4 w-7 h-7 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">COD Order Dispatched!</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Order <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{codSuccessModal.invoiceNo}</span> is now active in the <span className="text-amber-500 font-bold">Live Orders Hub</span>.
              </p>
            </div>

            <div className="p-3 rounded-2xl neu-sunken-sm text-xs space-y-1.5 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-slate-800 dark:text-white truncate">{codSuccessModal.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform / Channel:</span>
                <span className="font-bold text-emerald-500">{codSuccessModal.channel}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/40 dark:border-slate-700/60 pt-1">
                <span className="text-slate-400">COD Total Payable:</span>
                <span className="font-black text-amber-500">{format(convert(codSuccessModal.totalAmount, baseCode, currentCurrency), currentCurrency)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (codSuccessModal) {
                  triggerCodDispatch(codSuccessModal);
                }
                setCodSuccessModal(null);
              }}
              className="w-full py-2.5 neu-btn-accent text-amber-700 dark:text-amber-300 font-extrabold text-xs shadow-neu-glow-amber active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Continue POS Selling</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Flying Delivery Capsule Animation */}
      <CodDispatchFlyer />
    </div>
  );
};
