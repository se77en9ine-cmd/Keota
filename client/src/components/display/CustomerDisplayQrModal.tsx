import React, { useState, useEffect } from 'react';
import { useCustomerDisplayStore } from '../../store/useCustomerDisplayStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  QrCode,
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Clock,
  RefreshCw,
  Smartphone,
  CreditCard,
  Building2,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

import { generateUniversalQrImageUrl, LAO_BANKS } from '../../utils/qrEngine';

interface CustomerDisplayQrModalProps {
  currentTotal: number;
  currentCurrencyCode: string;
  onBackToReceipt?: () => void;
}

export const CustomerDisplayQrModal: React.FC<CustomerDisplayQrModalProps> = ({
  currentTotal,
  currentCurrencyCode,
  onBackToReceipt,
}) => {
  const { qrModal, hideQrModal, config } = useCustomerDisplayStore();
  const { format, convert, baseCurrency } = useCurrencyStore();
  const { receiptConfig, store } = useSettingsStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(300); // 5 minutes expiry
  const [qrKey, setQrKey] = useState<number>(1);

  // Restart timer when modal opens
  useEffect(() => {
    if (qrModal.isOpen) {
      setTimeLeftSeconds(300);
      try {
        soundFX.playBeep();
      } catch {}
    }
  }, [qrModal.isOpen]);

  // Countdown timer interval
  useEffect(() => {
    if (!qrModal.isOpen || qrModal.isPaid || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [qrModal.isOpen, qrModal.isPaid, timeLeftSeconds]);

  // Auto-close on success after 4.5s
  useEffect(() => {
    if (qrModal.isOpen && qrModal.isPaid) {
      try {
        soundFX.playCashSuccess();
      } catch {}
      const timer = setTimeout(() => {
        hideQrModal();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [qrModal.isOpen, qrModal.isPaid, hideQrModal]);

  const displayAmount = qrModal.amount > 0 ? qrModal.amount : currentTotal;
  const displayCurrency = qrModal.currency || currentCurrencyCode || baseCode;
  const bankName = qrModal.bankName || receiptConfig.paymentQrBankName || 'Lao QR (LAPNet / All Banks)';
  const accountNo = qrModal.accountNo || receiptConfig.paymentQrAccountNo || '030120000172042001';
  const accountName = qrModal.accountName || receiptConfig.paymentQrAccountName || store?.name || '39POS Flagship Store';

  // Generate dynamic standard EMVCo QR with matching values
  const qrRes = generateUniversalQrImageUrl(
    {
      standard: receiptConfig.paymentQrType || 'LAO_QR_LAPNET',
      bankCode: receiptConfig.paymentQrBankCode || 'ALL_BANKS',
      accountNo: accountNo,
      accountName: accountName,
      storeName: store?.name,
      bankName: bankName,
      amount: displayAmount,
      currency: displayCurrency,
      invoiceNo: qrModal.invoiceNo,
      customImageUrl: qrModal.qrImageUrl || receiptConfig.paymentQrImageUrl,
    },
    320
  );

  const qrImageUrl = `${qrRes.qrImageUrl}&key=${qrKey}`;

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const progressPercent = (timeLeftSeconds / 300) * 100;

  return (
    <div className="flex-1 flex flex-col justify-between bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
      {/* Top Ambient Glow Aura on the Left side */}
      <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {onBackToReceipt && (
            <button
              type="button"
              onClick={onBackToReceipt}
              title="Back to Receipt Slip"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-black tracking-widest text-emerald-400 uppercase">
            {qrModal.isPaid ? 'Payment Confirmed' : 'Instant Scan & Pay'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
            {displayCurrency}
          </span>
          <button
            type="button"
            onClick={hideQrModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close QR Code"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conditional Content: Success Checkmark vs Active QR */}
      {qrModal.isPaid ? (
        /* ─── Payment Success Celebration ─── */
        <div className="relative z-10 py-6 space-y-4 animate-in zoom-in-90 duration-500 flex flex-col items-center text-center my-auto">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/40">
            <CheckCircle2 className="w-12 h-12 animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">Payment Received!</h3>
            <p className="text-sm text-emerald-400 font-bold">Transaction Confirmed</p>
            {qrModal.invoiceNo && (
              <div className="text-xs text-slate-400 font-mono pt-1">Invoice: {qrModal.invoiceNo}</div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 w-full text-center space-y-1">
            <div className="text-xs text-slate-400 font-medium">Total Amount Paid</div>
            <div className="text-2xl font-black font-mono text-white">
              {format(displayAmount, displayCurrency)}
            </div>
          </div>

          <p className="text-xs text-slate-400 animate-pulse">Thank you for shopping at {accountName}!</p>
        </div>
      ) : (
        /* ─── Active Scanning QR Mode ─── */
        <div className="relative z-10 flex flex-col items-center text-center space-y-3.5 my-auto py-1">
          {/* Bank Title */}
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>{bankName}</span>
              <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </h3>
            <p className="text-[10.5px] text-slate-400 font-medium">{accountName} • A/C {accountNo}</p>
          </div>

          {/* Total Payable Amount Banner */}
          <div className="w-full py-2 px-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 border border-slate-800 flex items-center justify-between shadow-inner">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Payable Total</span>
            <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
              {format(displayAmount, displayCurrency)}
            </span>
          </div>

          {/* Dynamic QR Code Canvas with Animated Neon Laser Scanner */}
          <div className="relative p-3.5 rounded-3xl bg-white shadow-2xl border-2 border-slate-700 flex items-center justify-center overflow-hidden">
            {/* QR Image */}
            <img
              src={qrImageUrl}
              alt="Dynamic Payment QR Code"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl select-none"
            />

            {/* ⚡ Animated Neon Laser Scanner Beam */}
            <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_#10b981] animate-qr-laser pointer-events-none rounded-full" />

            {/* Corner Targeting Accents */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-500 pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-500 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-500 pointer-events-none" />
          </div>

          {/* Supported Banking Badges */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {['BCEL One', 'PromptPay', 'Lao QR', 'WeChat', 'Alipay'].map((app) => (
              <span
                key={app}
                className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-800 border border-slate-700 text-slate-300 shadow-sm"
              >
                {app}
              </span>
            ))}
          </div>

          {/* 5-Minute Countdown Timer */}
          <div className="w-full space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Valid for: {formattedTime}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setTimeLeftSeconds(300);
                  setQrKey((k) => k + 1);
                  soundFX.playBeep();
                }}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-bold"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  timeLeftSeconds > 60
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-amber-500 to-rose-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer Tip */}
      <div className="relative z-10 pt-2 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-400 leading-tight">
          Scan QR with mobile banking app • Register confirms automatically
        </p>
      </div>
    </div>
  );
};
export default CustomerDisplayQrModal;
