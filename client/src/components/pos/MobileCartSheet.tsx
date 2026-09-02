import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  CreditCard,
  UserCheck,
  Percent,
  ShoppingBag,
  Truck,
  Store,
  Dice5,
  Banknote,
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLiveOrdersStore } from '../../store/useLiveOrdersStore';
import { usePlatformStore } from '../../store/usePlatformStore';
import { api } from '../../api/client';
import { soundFX } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { CustomerSelectModal } from './CustomerSelectModal';

interface MobileCartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPayment: () => void;
  onOpenHolds: () => void;
}

export const MobileCartSheet: React.FC<MobileCartSheetProps> = ({
  isOpen,
  onClose,
  onOpenPayment,
  onOpenHolds,
}) => {
  const { t } = useTranslation();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTotalDiscount,
    getTotalTax,
    getGrandTotal,
    discountRate,
    setOrderDiscount,
    selectedCustomer,
    setCustomerData,
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
  const { platforms, fetchPlatforms } = usePlatformStore();

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [discountInputOpen, setDiscountInputOpen] = useState(false);
  const [deliveryInfoOpen, setDeliveryInfoOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState<string>(
    discountRate > 0 ? (discountRate * 100).toString() : ''
  );
  const [isDispatchingCod, setIsDispatchingCod] = useState(false);
  const [codSuccessData, setCodSuccessData] = useState<{
    invoiceNo: string;
    totalAmount: number;
    channel: string;
    customer: string;
  } | null>(null);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const totalDiscount = getTotalDiscount();
  const totalTax = getTotalTax();
  const grandTotal = getGrandTotal();

  const isOnlineChannel = channel !== 'POS';
  const activePlatforms = platforms.filter((p) => p.isActive);

  // Generate random order reference code based on current channel
  const handleGenerateOrderId = () => {
    const matchedPlatform = platforms.find((p) => p.code === channel || p.id === channel);
    const prefix = matchedPlatform?.code || 'ONL';
    const randDigits = Math.floor(100000 + Math.random() * 900000);
    const generated = `${prefix}-${randDigits}`;
    setExternalOrderId(generated);
    soundFX.playBeep();
    haptics.light();
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountValue);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setOrderDiscount(val / 100, true);
      soundFX.playBeep();
      haptics.light();
    } else {
      setOrderDiscount(0);
    }
    setDiscountInputOpen(false);
  };

  // 1-Tap Cash On Delivery (COD) Dispatch for Online / Delivery Platforms
  const handleDispatchCod = async () => {
    if (items.length === 0 || isDispatchingCod) return;

    try {
      setIsDispatchingCod(true);
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
        deliveryContact: deliveryContact || (selectedCustomer ? selectedCustomer.name : 'Online Customer'),
        notes: null,
        discountAmount: getTotalDiscount(),
      });

      soundFX.playCashSuccess();
      haptics.success();

      const invoiceNo = res.data?.invoiceNo || `INV-COD-${Date.now()}`;
      setCodSuccessData({
        invoiceNo,
        totalAmount: grandTotal,
        channel: channel || 'POS',
        customer: deliveryContact || selectedCustomer?.name || 'Online Customer',
      });
      clearCart();
    } catch (err: any) {
      soundFX.playError();
      haptics.error();
      alert(`COD Dispatch failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsDispatchingCod(false);
    }
  };

  return (
    <div className="lg:hidden fixed inset-0 z-50 overflow-hidden select-none animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={() => {
          haptics.light();
          onClose();
        }}
      />

      {/* Bottom Sheet Container */}
      <div className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col z-10 border-t border-slate-200 dark:border-slate-800 animate-slideUp">
        {/* Handle Bar & Header */}
        <div className="pt-2 px-4 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-xl ${
                  isOnlineChannel
                    ? 'bg-pink-500/15 text-pink-500'
                    : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                }`}
              >
                {isOnlineChannel ? <ShoppingBag className="w-5 h-5" /> : <Store className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{t('pos.cart', 'Current Order Ticket')}</span>
                  {isOnlineChannel && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-pink-500/10 text-pink-500 border border-pink-500/20">
                      {channel}
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {items.reduce((s, i) => s + i.quantity, 0)} {t('pos.items', 'items')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    clearCart();
                    soundFX.playBeep();
                  }}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-bold transition-colors"
                  title="Clear Cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onClose();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 🛵 Online Platform / Sales Channel Selector Chips */}
        <div className="px-3 py-2 bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setChannel('POS');
              setOrderType('TAKEAWAY');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
              channel === 'POS'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>POS In-Store</span>
          </button>

          {activePlatforms.map((p) => {
            const isSelected = channel === p.code || channel === p.id;
            const isImageUrl = p.icon && (p.icon.startsWith('/uploads/') || p.icon.startsWith('http') || p.icon.startsWith('data:'));
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  setChannel(p.code);
                  setOrderType('DELIVERY');
                  if (!externalOrderId) {
                    const rand = Math.floor(100000 + Math.random() * 900000);
                    setExternalOrderId(`${p.code}-${rand}`);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white border-pink-400 shadow-md shadow-pink-500/25 ring-1 ring-pink-400/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isImageUrl ? (
                  <img src={p.icon} alt={p.name} className="w-4 h-4 rounded object-cover flex-shrink-0" />
                ) : (
                  <span className="text-xs">{p.icon || '🛵'}</span>
                )}
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Action Pills Bar (Customer, Delivery Info, Discount, Holds) */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Customer Selection Pill */}
          {selectedCustomer ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl text-xs font-bold shrink-0 border border-brand-500/20">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="truncate max-w-[110px]">{selectedCustomer.name}</span>
              <button
                type="button"
                onClick={() => setCustomerData(null)}
                className="ml-1 text-slate-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('pos.addCustomer', '+ Customer')}</span>
            </button>
          )}

          {/* Delivery & Rider Info Pill */}
          {isOnlineChannel && (
            <button
              type="button"
              onClick={() => setDeliveryInfoOpen(!deliveryInfoOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                deliveryAddress || externalOrderId
                  ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-pink-500" />
              <span>{externalOrderId ? `${externalOrderId}` : 'Rider / Address'}</span>
            </button>
          )}

          {/* Discount Pill */}
          <button
            type="button"
            onClick={() => setDiscountInputOpen(!discountInputOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              discountRate > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>
              {discountRate > 0 ? `${(discountRate * 100).toFixed(0)}% Off` : t('pos.discount', '+ Discount')}
            </span>
          </button>

          {/* Hold Orders Trigger */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHolds();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-auto"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('pos.holds', 'Holds')}</span>
          </button>
        </div>

        {/* 🛵 Online Platform Tracking Drawer */}
        {deliveryInfoOpen && isOnlineChannel && (
          <div className="p-3.5 bg-pink-50/50 dark:bg-pink-950/20 border-b border-pink-500/20 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Online Platform & Delivery Order Info</span>
              </span>
              <button
                type="button"
                onClick={handleGenerateOrderId}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-400 font-bold text-[10px] active:scale-95"
              >
                <Dice5 className="w-3 h-3" />
                <span>Gen Code</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Order / Rider Ref</label>
                <input
                  type="text"
                  placeholder="e.g. GF-92812"
                  value={externalOrderId}
                  onChange={(e) => setExternalOrderId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Rider / Contact Phone</label>
                <input
                  type="text"
                  placeholder="Customer Phone"
                  value={deliveryContact}
                  onChange={(e) => setDeliveryContact(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Delivery Address / Destination</label>
              <input
                type="text"
                placeholder="House / Road / Dropoff notes..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>
        )}

        {/* Inline Discount Input Drawer */}
        {discountInputOpen && (
          <div className="p-3 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 shrink-0">
              Discount %:
            </span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="0-100"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
            />
            <button
              type="button"
              onClick={handleApplyDiscount}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Apply
            </button>
          </div>
        )}

        {/* Line Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[34vh]">
          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-semibold">{t('pos.cartEmpty', 'Cart is empty')}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tap products to add items</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const lineKey = `${item.productId}_${item.variantId || 'default'}_${idx}`;
              return (
                <div
                  key={lineKey}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60"
                >
                  <div className="flex-1 pr-3">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {item.name}
                    </h4>
                    {item.variantName && (
                      <span className="text-[10px] text-brand-500 font-semibold">
                        {item.variantName}
                      </span>
                    )}
                    <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {format(convert(item.totalPrice, baseCode, currentCurrency), currentCurrency)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        if (item.quantity > 1) {
                          updateQuantity(item.productId, item.variantId, item.quantity - 1);
                        } else {
                          removeItem(item.productId, item.variantId);
                        }
                      }}
                      className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition-transform"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <span className="w-6 text-center font-black text-sm text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        updateQuantity(item.productId, item.variantId, item.quantity + 1);
                      }}
                      className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm shadow-brand-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Calculations & Dual COD / Charge CTAs */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{t('pos.subtotal', 'Subtotal')}</span>
                <span className="font-semibold">{format(convert(subtotal, baseCode, currentCurrency), currentCurrency)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                  <span>{t('pos.discount', 'Discount')}</span>
                  <span>-{format(convert(totalDiscount, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>{t('pos.tax', 'Tax')}</span>
                  <span>+{format(convert(totalTax, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>{t('pos.total', 'Grand Total')}</span>
                <span className="text-base text-emerald-600 dark:text-emerald-400">
                  {format(convert(grandTotal, baseCode, currentCurrency), currentCurrency)}
                </span>
              </div>
            </div>

            {/* Action Buttons: COD vs Upfront Pay vs In-Store Hold */}
            {isOnlineChannel ? (
              <div className="flex items-center gap-2">
                {/* 1-Tap Cash On Delivery (COD) Dispatch */}
                <button
                  type="button"
                  onClick={handleDispatchCod}
                  disabled={isDispatchingCod}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-amber-500/25 active:scale-95 transition-all min-h-[48px]"
                >
                  <Banknote className="w-4 h-4" />
                  <span>
                    {isDispatchingCod ? 'Dispatching...' : `Dispatch COD (${format(convert(grandTotal, baseCode, currentCurrency), currentCurrency)})`}
                  </span>
                </button>

                {/* Prepaid / Upfront Pay */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onClose();
                    onOpenPayment();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 active:scale-95 transition-all min-h-[48px]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Upfront</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onClose();
                    onOpenHolds();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold active:scale-95 transition-all min-h-[48px] shrink-0"
                >
                  <PauseCircle className="w-4 h-4 text-amber-500" />
                  <span>Hold</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onClose();
                    onOpenPayment();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/30 active:scale-95 transition-all min-h-[48px]"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>{t('pos.charge', 'Charge')} {format(convert(grandTotal, baseCode, currentCurrency), currentCurrency)}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Select Modal */}
      {customerModalOpen && (
        <CustomerSelectModal
          isOpen={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          onSelectCustomer={(c) => {
            setCustomerData(c);
            setCustomerModalOpen(false);
          }}
        />
      )}

      {/* COD Dispatch Success Popup Dialog */}
      {codSuccessData && (
        <div
          onClick={() => {
            setCodSuccessData(null);
            onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4 relative"
          >
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => {
                setCodSuccessData(null);
                onClose();
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Truck className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                COD Dispatch Successful
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Rider Handover Ready
              </h3>
              <p className="text-xs font-mono font-bold text-slate-400">
                {codSuccessData.invoiceNo}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Channel:</span>
                <span className="font-extrabold text-pink-500 uppercase">{codSuccessData.channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{codSuccessData.customer}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-extrabold">
                <span className="text-slate-700 dark:text-slate-300">Amount to Collect:</span>
                <span className="text-amber-500 font-black">
                  {format(convert(codSuccessData.totalAmount, baseCode, currentCurrency), currentCurrency)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (codSuccessData) {
                  useLiveOrdersStore.getState().triggerCodDispatch(codSuccessData);
                }
                setCodSuccessData(null);
                onClose();
              }}
              className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Done / Next Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default MobileCartSheet;
