import React, { useState } from 'react';
import { Printer, Download, X, CheckCircle, Smartphone, FileText, Layers, Share2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { PrintEngine, PaperProfile, PrintableReceiptData } from '../../utils/printEngine';
import { generateUniversalQrImageUrl } from '../../utils/qrEngine';
import { MinimalPrintModal } from '../common/MinimalPrintModal';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: any;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, saleData }) => {
  const { store, receiptConfig } = useSettingsStore();
  const { user } = useAuthStore();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [selectedProfile, setSelectedProfile] = useState<PaperProfile>(
    receiptConfig.defaultPaperProfile || '80MM'
  );
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);

  if (!isOpen || !saleData) return null;

  const currencySymbol = currentCurrency === 'LAK' ? '₭' : currentCurrency === 'THB' ? '฿' : '$';

  const printableData: PrintableReceiptData = {
    invoiceNo: saleData.invoiceNo,
    createdAt: saleData.createdAt || Date.now(),
    cashierName: user?.fullName || 'Cashier Staff',
    channel: saleData.channel || 'In-Store POS',
    orderType: saleData.orderType || 'Retail Sale',
    tableNo: saleData.tableNo,
    customerName: saleData.customerName,
    customerPhone: saleData.customerPhone,
    customerTier: saleData.customerTier,
    items: (saleData.items || []).map((it: any) => ({
      name: it.name,
      variantName: it.variantName,
      code: it.code || it.sku,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discountAmount: Number(it.discountAmount) || 0,
      totalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discountAmount) || 0),
    })),
    subtotal: Number(saleData.subtotal || saleData.totalAmount || 0),
    discountAmount: Number(saleData.discountAmount || 0),
    taxAmount: Number(saleData.taxAmount || 0),
    taxRate: Number(saleData.taxRate || 7),
    taxName: saleData.taxName || 'VAT',
    serviceCharge: Number(saleData.serviceCharge || 0),
    totalAmount: Number(saleData.totalAmount || 0),
    paidAmount: Number(saleData.paidAmount || 0),
    changeAmount: Number(saleData.changeAmount || 0),
    payments: saleData.payments || [
      {
        paymentMethod: saleData.paymentMethod || 'CASH',
        amount: Number(saleData.paidAmount || saleData.totalAmount || 0),
        currency: currentCurrency,
      },
    ],
    currencySymbol,
  };

  const handlePrint = () => {
    setPrintModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg neu-card-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Sale Successful</h3>
              <div className="text-[10px] text-slate-400 font-mono">INV: {saleData.invoiceNo}</div>
            </div>
          </div>

          {/* Quick Paper Profile Selector */}
          <div className="p-1 neu-tab-container flex items-center gap-1">
            {(
              [
                { id: '80MM', label: '80mm', icon: Printer },
                { id: '58MM', label: '58mm', icon: Smartphone },
                { id: 'A4', label: 'A4 Sheet', icon: FileText },
              ] as const
            ).map((p) => {
              const Icon = p.icon;
              const isSelected = selectedProfile === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfile(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={`${p.label} Print Profile`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 neu-circle-btn text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Paper Simulation Viewport */}
        <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            className={`bg-white text-slate-900 p-6 rounded-2xl shadow-md border border-slate-200 font-mono text-xs leading-relaxed transition-all ${
              selectedProfile === '80MM' ? 'w-full max-w-[340px]' : selectedProfile === '58MM' ? 'w-full max-w-[260px] text-[11px] p-4' : 'w-full text-xs'
            }`}
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              {receiptConfig.showLogo && receiptConfig.logoUrl && (
                <img
                  src={receiptConfig.logoUrl}
                  alt="Logo"
                  className="max-h-12 object-contain mx-auto mb-1.5"
                  style={{ maxWidth: selectedProfile === '58MM' ? '80px' : '120px' }}
                />
              )}
              <div className="font-black text-base tracking-tight mb-1">
                {receiptConfig.storeNameOverride || store?.name || '39POS ENTERPRISE STORE'}
              </div>
              <div className="text-[11px] text-slate-600">{store?.address || 'Lane Xang Ave, Vientiane Capital'}</div>
              <div className="text-[11px] text-slate-600">Tel: {store?.phone || '+856 21 213939'}</div>
              {receiptConfig.showTaxId && (
                <div className="text-[11px] text-slate-600">Tax ID: {store?.taxId || 'LA-TAX-99887766'}</div>
              )}
              {receiptConfig.showWifiInfo && (receiptConfig.wifiSsid || receiptConfig.wifiPassword) && (
                <div className="text-[10px] text-slate-500 mt-1">
                  WiFi: <strong>{receiptConfig.wifiSsid}</strong> / Pass: <strong>{receiptConfig.wifiPassword}</strong>
                </div>
              )}
              {receiptConfig.customHeaderNote && (
                <div className="text-[10px] italic text-slate-500 mt-1">{receiptConfig.customHeaderNote}</div>
              )}
            </div>

            {/* Sale Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>Invoice: {saleData.invoiceNo}</span>
                <span>{new Date(saleData.createdAt || Date.now()).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date: {new Date(saleData.createdAt || Date.now()).toLocaleDateString()}</span>
                <span>Cashier: {user?.fullName || 'Cashier'}</span>
              </div>
              {saleData.tableNo && (
                <div className="text-brand-600 font-bold">Table: {saleData.tableNo}</div>
              )}
              {saleData.customerName && (
                <div className="text-slate-800 pt-0.5">
                  Customer: <strong>{saleData.customerName}</strong>
                </div>
              )}
            </div>

            {/* Item Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[11px] mb-1.5 uppercase">
                <span>Description / Qty</span>
                <span>Total</span>
              </div>

              <div className="space-y-2">
                {(saleData.items || []).map((item: any, i: number) => (
                  <div key={i} className="text-[11px]">
                    <div className="font-semibold text-slate-900 truncate">
                      {item.name} {item.variantName ? `(${item.variantName})` : ''}
                    </div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {item.quantity} x {format(convert(item.unitPrice, baseCode, currentCurrency), currentCurrency)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {format(convert(item.quantity * item.unitPrice, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{format(convert(saleData.subtotal || 0, baseCode, currentCurrency), currentCurrency)}</span>
              </div>
              {saleData.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{format(convert(saleData.discountAmount, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
              )}
              {saleData.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax (VAT {saleData.taxRate || 7}%):</span>
                  <span>{format(convert(saleData.taxAmount, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>GRAND TOTAL:</span>
                <span>{format(convert(saleData.totalAmount || 0, baseCode, currentCurrency), currentCurrency)}</span>
              </div>
            </div>

            {/* Payment & Change */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
              <div className="flex justify-between font-semibold">
                <span>Paid Tendered:</span>
                <span>{format(convert(saleData.paidAmount || 0, baseCode, currentCurrency), currentCurrency)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600">
                <span>Change Returned:</span>
                <span>{format(convert(saleData.changeAmount || 0, baseCode, currentCurrency), currentCurrency)}</span>
              </div>
            </div>

            {/* Dynamic Payment QR Simulator */}
            {receiptConfig.showPaymentQr && (() => {
              const convertedTotal = convert(saleData.totalAmount || 0, baseCode, currentCurrency);
              const qrRes = generateUniversalQrImageUrl(
                {
                  standard: receiptConfig.paymentQrType || 'LAO_QR_LAPNET',
                  bankCode: receiptConfig.paymentQrBankCode || 'ALL_BANKS',
                  accountNo: receiptConfig.paymentQrAccountNo || '030120000172042001',
                  accountName: receiptConfig.paymentQrAccountName || store?.name,
                  storeName: store?.name,
                  bankName: receiptConfig.paymentQrBankName,
                  amount: receiptConfig.paymentQrDynamicAmount !== false ? convertedTotal : undefined,
                  currency: currentCurrency,
                  invoiceNo: saleData.invoiceNo,
                  customImageUrl: receiptConfig.paymentQrImageUrl,
                },
                120
              );

              return (
                <div className="py-2.5 border-b border-dashed border-slate-300 text-center space-y-1">
                  <img
                    src={qrRes.qrImageUrl}
                    alt="Payment QR"
                    className="w-20 h-20 object-contain mx-auto"
                  />
                  <div className="font-bold text-[10px]">{receiptConfig.paymentQrBankName || qrRes.standardTitle}</div>
                  {receiptConfig.paymentQrAccountNo && (
                    <div className="text-[9px] text-slate-500 font-mono">A/C: {receiptConfig.paymentQrAccountNo}</div>
                  )}
                  {receiptConfig.paymentQrDynamicAmount !== false && saleData.totalAmount && (
                    <div className="text-[9px] text-emerald-600 font-mono font-bold">
                      Amount: {format(convertedTotal, currentCurrency)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
              <div className="font-bold text-slate-800">
                {receiptConfig.customFooterNote || '*** Thank You! Please Come Again ***'}
              </div>
              {receiptConfig.showReturnPolicy && receiptConfig.returnPolicyText && (
                <div className="text-[9px]">{receiptConfig.returnPolicyText}</div>
              )}
              <div className="text-[8.5px] text-slate-400">Powered by 39POS Enterprise System</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-3">
          <button
            onClick={() => setPrintModalOpen(true)}
            className="flex-1 py-3 neu-btn-primary text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-neu-glow-emerald active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print {selectedProfile} Bill</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 neu-btn font-bold text-sm text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>

      {/* Minimal Print Setup & Orientation Lock Modal */}
      <MinimalPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        receiptData={printableData}
        defaultProfile={selectedProfile}
      />
    </div>
  );
};
