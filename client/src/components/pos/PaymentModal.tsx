import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../store/useCartStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCustomerDisplayStore } from '../../store/useCustomerDisplayStore';
import { api } from '../../api/client';
import { soundFX } from '../../utils/audio';
import {
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Gift,
  CheckCircle2,
  X,
  Printer,
  Coins,
  ArrowRight,
  Globe,
  Wallet,
  Tv,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { PaymentTenderDTO } from '39pos-shared';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saleData: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const {
    items,
    getGrandTotal,
    getSubtotal,
    getTotalDiscount,
    getTotalTax,
    clearCart,
    selectedCustomerId,
    selectedCustomer,
    redeemedPoints,
    tableNo,
    notes,
    channel,
    orderType,
    externalOrderId,
    deliveryAddress,
    deliveryContact,
  } = useCartStore();

  const { currentCurrency, currencies, format, convert, engine, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const { user } = useAuthStore();
  const { showQrModal, hideQrModal, setPaymentSuccess: setDisplayPaymentSuccess } = useCustomerDisplayStore();

  const totalInBase = getGrandTotal(); // Total in System Base Currency (LAK)
  const [selectedMethod, setSelectedMethod] = useState<
    'CASH' | 'CARD' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'STORE_CREDIT' | 'LOYALTY_POINTS'
  >('CASH');

  const [tenderCurrency, setTenderCurrency] = useState<string>(currentCurrency);
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [payments, setPayments] = useState<PaymentTenderDTO[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTenderCurrency(currentCurrency);
      const convertedTotal = convert(totalInBase, baseCode, currentCurrency);
      setTenderAmount(convertedTotal.toString());
      setPayments([]);
    }
  }, [isOpen, currentCurrency, totalInBase, baseCode]);

  // Automatically broadcast QR to customer display ONLY when QR Pay is selected; IMMEDIATELY close when another tender is chosen
  useEffect(() => {
    if (isOpen && selectedMethod === 'QR_PAYMENT') {
      const convertedTotal = convert(totalInBase, baseCode, tenderCurrency);
      showQrModal({
        amount: convertedTotal,
        currency: tenderCurrency,
        bankName: 'BCEL One / PromptPay QR',
      });
    } else {
      hideQrModal();
    }
  }, [isOpen, selectedMethod, tenderCurrency, totalInBase, baseCode, convert, showQrModal, hideQrModal]);

  // Clean up when modal closes or unmounts
  useEffect(() => {
    return () => {
      hideQrModal();
    };
  }, [hideQrModal]);

  if (!isOpen) return null;

  const currentTenderCurConfig = currencies.find((c) => c.code === tenderCurrency) || {
    exchangeRate: 1,
    decimalPlaces: 2,
  };

  // Split calculation
  const splitResult = engine.calculateSplitChange(
    totalInBase,
    [
      ...payments.map((p) => ({
        currencyCode: p.currency,
        amount: p.tenderedAmount,
        exchangeRate: p.exchangeRate,
      })),
      ...(tenderAmount && Number(tenderAmount) > 0
        ? [
            {
              currencyCode: tenderCurrency,
              amount: Number(tenderAmount),
              exchangeRate: currentTenderCurConfig.exchangeRate,
            },
          ]
        : []),
    ],
    tenderCurrency
  );

  const handleQuickCash = (amt: number) => {
    soundFX.playBeep();
    setTenderAmount(amt.toString());
  };

  const handleAddPayment = () => {
    const val = Number(tenderAmount);
    if (!val || val <= 0) return;

    soundFX.playBeep();
    setPayments((prev) => [
      ...prev,
      {
        paymentMethod: selectedMethod,
        tenderedAmount: val,
        currency: tenderCurrency,
        exchangeRate: currentTenderCurConfig.exchangeRate,
        amount: val / currentTenderCurConfig.exchangeRate,
      },
    ]);

    setTenderAmount('');
  };

  const handleCompleteSale = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let finalPayments = [...payments];
      if (tenderAmount && Number(tenderAmount) > 0) {
        finalPayments.push({
          paymentMethod: selectedMethod,
          tenderedAmount: Number(tenderAmount),
          currency: tenderCurrency,
          exchangeRate: currentTenderCurConfig.exchangeRate,
          amount: Number(tenderAmount) / currentTenderCurConfig.exchangeRate,
        });
      }

      if (finalPayments.length === 0) {
        finalPayments.push({
          paymentMethod: 'CASH',
          tenderedAmount: convert(totalInBase, baseCode, tenderCurrency),
          currency: tenderCurrency,
          exchangeRate: currentTenderCurConfig.exchangeRate,
          amount: totalInBase,
        });
      }

      const { businessMode } = useSettingsStore.getState();
      let resolvedChannel = channel || 'POS';
      if (resolvedChannel === 'POS') {
        if (businessMode === 'RESTAURANT_CAFE' || Boolean(tableNo) || orderType === 'DINE_IN') {
          resolvedChannel = 'POS_RC';
        } else {
          resolvedChannel = 'POS_MR';
        }
      }

      const res = await api.post('/pos/checkout', {
        storeId: user?.storeId || 'store-flagship',
        cashierId: user?.id || 'user-admin',
        customerId: selectedCustomerId,
        items,
        payments: finalPayments,
        redeemedPoints,
        pointsDiscountAmount: redeemedPoints / 100,
        tableNo,
        notes,
        channel: resolvedChannel,
        orderType: orderType || (tableNo ? 'DINE_IN' : 'TAKEAWAY'),
        externalOrderId,
        deliveryAddress,
        deliveryContact,
      });

      soundFX.playCashSuccess();
      clearCart();
      setDisplayPaymentSuccess(res.data?.invoiceNo);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      soundFX.playError();
      alert(t('payment.checkoutFailed', 'Checkout failed: {{error}}', { error: err.response?.data?.message || err.message }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModalClose = () => {
    hideQrModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl neu-card-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{t('payment.title', 'Complete POS Payment')}</h3>
            <p className="text-xs text-slate-500">{t('payment.subtitle', 'Multi-tender, split currency, loyalty points, and cash checkout')}</p>
          </div>
          <button
            onClick={handleModalClose}
            className="p-2 neu-circle-btn text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Due Amount Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shadow-neu-raised-sm border border-slate-700/50">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">{t('payment.grandTotalDue', 'Grand Total Due')}</div>
              <div className="text-3xl font-black font-mono tracking-tight">{format(totalInBase, baseCode)}</div>
              {currentCurrency !== baseCode && (
                <div className="text-sm text-slate-300 font-semibold font-mono mt-0.5">
                  ≈ {format(convert(totalInBase, baseCode, currentCurrency), currentCurrency)}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-400">{t('payment.changeReturned', 'Change Returned')}</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {splitResult.changeInBase > 0
                  ? format(splitResult.changeInTargetCurrency, tenderCurrency)
                  : format(0, tenderCurrency)}
              </div>
            </div>
          </div>

          {/* Member Loyalty Banner if Attached */}
          {selectedCustomer && (
            <div className="p-3.5 neu-card flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full neu-sunken-sm text-emerald-500 font-black flex items-center justify-center text-xs">
                  {selectedCustomer.tier.slice(0, 1)}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {selectedCustomer.name} ({selectedCustomer.tier})
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {t('payment.pointsBalance', 'Points Balance:')} <span className="text-amber-500 font-bold">{selectedCustomer.points} pts</span> (≈ ${(selectedCustomer.points / 100).toFixed(2)})
                  </div>
                </div>
              </div>

              {selectedCustomer.points > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('LOYALTY_POINTS');
                    const maxPayableInCurrent = Math.min(
                      convert(selectedCustomer.points / 100, baseCode, tenderCurrency),
                      convert(totalInBase, baseCode, tenderCurrency)
                    );
                    setTenderAmount(maxPayableInCurrent.toFixed(2));
                  }}
                  className="px-3 py-1.5 neu-btn text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>{t('payment.payWithPoints', 'Pay with Points')}</span>
                </button>
              )}
            </div>
          )}

          {/* Payment Methods Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              {t('payment.selectTender', 'Select Payment Tender')}
            </label>
            <div className="p-1 neu-tab-container grid grid-cols-5 gap-2">
              {[
                { id: 'CASH', label: t('payment.cash', 'Cash'), icon: Banknote },
                { id: 'CARD', label: t('payment.card', 'Card'), icon: CreditCard },
                { id: 'QR_PAYMENT', label: t('payment.qrPay', 'QR Pay'), icon: QrCode },
                { id: 'BANK_TRANSFER', label: t('payment.transfer', 'Transfer'), icon: Building },
                { id: 'LOYALTY_POINTS', label: t('payment.points', 'Points'), icon: Coins },
              ].map((m) => {
                const Icon = m.icon;
                const active = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      soundFX.playBeep();
                      setSelectedMethod(m.id as any);
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 font-bold text-xs transition-all active:scale-95 cursor-pointer ${
                      active
                        ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tender Currency & Amount */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">{t('payment.tenderCurrency', 'Tender Currency')}</label>
              <CustomSelect
                value={tenderCurrency}
                onChange={(val) => setTenderCurrency(val)}
                options={currencies.map((c) => ({
                  value: c.code,
                  label: `${c.code} (${c.symbol})`,
                  subtitle: c.name,
                }))}
                placeholder="Currency..."
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 block mb-1">{t('payment.amountTendered', 'Amount Tendered')}</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  className="w-full h-10 px-3 neu-input text-lg font-black font-mono text-slate-900 dark:text-white outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Quick Cash Presets if Cash Method */}
          {selectedMethod === 'CASH' && (
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">{t('payment.quickCashPresets', 'Quick Cash Presets')}</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  convert(totalInBase, baseCode, tenderCurrency),
                  Math.ceil(convert(totalInBase, baseCode, tenderCurrency) / 10) * 10 || 10,
                  Math.ceil(convert(totalInBase, baseCode, tenderCurrency) / 50) * 50 || 50,
                  Math.ceil(convert(totalInBase, baseCode, tenderCurrency) / 100) * 100 || 100,
                ].map((val, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickCash(val)}
                    className="py-2.5 rounded-xl neu-btn hover:text-emerald-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all font-mono cursor-pointer active:scale-95"
                  >
                    {format(val, tenderCurrency)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* QR Payment Screen Cast Helper */}
          {selectedMethod === 'QR_PAYMENT' && (
            <div className="p-3.5 neu-card flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl neu-sunken-sm text-indigo-500">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Customer Screen QR Display</div>
                  <div className="text-[10px] text-slate-400">Live dynamic QR is automatically shown on the 2nd monitor</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const convertedTotal = convert(totalInBase, baseCode, tenderCurrency);
                  showQrModal({
                    amount: convertedTotal,
                    currency: tenderCurrency,
                    bankName: 'BCEL One / PromptPay QR',
                  });
                  soundFX.playBeep();
                }}
                className="px-3.5 py-1.5 neu-btn text-indigo-500 text-xs font-bold transition-all cursor-pointer"
              >
                Re-Cast QR
              </button>
            </div>
          )}

          {/* Multi-Tender List */}
          {payments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
              <div className="text-xs font-bold text-slate-400">{t('payment.addedPayments', 'Added Payments ({{count}}):', { count: payments.length })}</div>
              <div className="space-y-1.5">
                {payments.map((p, i) => (
                  <div
                    key={i}
                    className="p-2.5 neu-sunken-sm flex items-center justify-between text-xs font-bold"
                  >
                    <span className="text-slate-600 dark:text-slate-300">{p.paymentMethod}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {format(p.tenderedAmount, p.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddPayment}
            className="px-4 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer active:scale-95 transition-all"
          >
            {t('payment.addSplitTender', '+ Add Split Tender')}
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleCompleteSale}
            className="px-8 py-3 neu-btn-primary text-white font-black text-sm shadow-neu-glow-emerald transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>{t('payment.completeAndPrint', 'Complete Order & Print')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
