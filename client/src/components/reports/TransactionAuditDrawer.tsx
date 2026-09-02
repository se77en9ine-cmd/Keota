import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PrintEngine, PrintableReceiptData } from '../../utils/printEngine';
import { MinimalPrintModal } from '../common/MinimalPrintModal';
import { WhatsAppPhoneBadge } from '../common/WhatsAppPhoneBadge';
import {
  X,
  Printer,
  Copy,
  Check,
  Receipt,
  User,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface TransactionAuditDrawerProps {
  saleId: string | null;
  initialSaleData?: any;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionAuditDrawer: React.FC<TransactionAuditDrawerProps> = ({
  saleId,
  initialSaleData,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const { store, receiptConfig } = useSettingsStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const [sale, setSale] = useState<any>(initialSaleData || null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [printModalData, setPrintModalData] = useState<PrintableReceiptData | null>(null);

  useEffect(() => {
    if (saleId && isOpen) {
      fetchDetails(saleId);
    }
  }, [saleId, isOpen]);

  const fetchDetails = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/pos/sales/${id}`);
      if (res.data.success) {
        setSale(res.data.sale);
        setItems(res.data.items || []);
        setPayments(res.data.payments || []);
      }
    } catch (err) {
      console.warn('Could not fetch full sale details, using cached row:', err);
      if (initialSaleData) {
        setSale(initialSaleData);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!sale) return;
    const summaryText = `
🧾 39POS INVOICE SUMMARY
------------------------
Invoice: ${sale.invoiceNo}
Date: ${new Date(sale.createdAt).toLocaleString()}
Customer: ${sale.customerName ? `${sale.customerName} ${sale.customerSurname || ''}`.trim() : sale.deliveryContact || 'Guest'}
Phone: ${sale.customerPhone || '—'}
Channel: ${sale.channel || 'In-Store POS'}
Status: ${sale.paymentStatus}
Total: ${format(convert(sale.totalAmount, baseCode, currentCurrency), currentCurrency)}
------------------------
Items (${items.length}):
${items.map((it) => {
  const lineTotal = ((Number(it.quantity) || 1) * Number(it.unitPrice)) - (Number(it.discountAmount) || 0);
  return `• ${it.name} x${it.quantity} @ ${format(convert(it.unitPrice, baseCode, currentCurrency), currentCurrency)} = ${format(convert(lineTotal, baseCode, currentCurrency), currentCurrency)}`;
}).join('\n')}
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSlip = () => {
    if (!sale) return;
    const currencySymbol = currentCurrency === 'LAK' ? '₭' : currentCurrency === 'THB' ? '฿' : '$';

    const printableData: PrintableReceiptData = {
      invoiceNo: sale.invoiceNo,
      createdAt: sale.createdAt,
      cashierName: sale.cashierName || 'Staff',
      channel: sale.channel || 'In-Store POS',
      orderType: sale.orderType,
      tableNo: sale.tableNo,
      customerName: sale.customerName || sale.deliveryContact,
      customerPhone: sale.customerPhone,
      customerTier: sale.customerTier,
      deliveryAddress: sale.deliveryAddress,
      courierName: sale.courierName,
      courierTrackingNo: sale.courierTrackingNo,
      deliveryFee: Number(sale.deliveryFee || 0),
      deliveryFeePayer: sale.deliveryFeePayer,
      items: items.length > 0
        ? items.map((it) => ({
            name: it.name,
            variantName: it.variantName,
            code: it.code,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            discountAmount: Number(it.discountAmount) || 0,
            totalPrice: ((Number(it.quantity) || 1) * Number(it.unitPrice)) - (Number(it.discountAmount) || 0),
          }))
        : [
            {
              name: 'General Order Items',
              quantity: 1,
              unitPrice: Number(sale.totalAmount),
              totalPrice: Number(sale.totalAmount),
            },
          ],
      subtotal: Number(sale.subtotal || sale.totalAmount),
      discountAmount: Number(sale.discountAmount || 0),
      taxAmount: Number(sale.taxAmount || 0),
      taxRate: Number(sale.taxRate || 7),
      taxName: sale.taxName || 'VAT',
      serviceCharge: Number(sale.serviceCharge || 0),
      totalAmount: Number(sale.totalAmount),
      paidAmount: Number(sale.paidAmount || sale.totalAmount),
      changeAmount: Number(sale.changeAmount || 0),
      paymentStatus: sale.paymentStatus,
      payments: payments.map((p) => ({
        paymentMethod: p.paymentMethod,
        amount: Number(p.amount),
        currency: currentCurrency,
        referenceNo: p.referenceNo,
      })),
      currencySymbol,
    };

    setPrintModalData(printableData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-lg neu-card-lg border-l border-slate-200/40 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-6 pb-4 border-b border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {t('reports.transactionAudit', 'Transaction Audit & POS Slip')}
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white font-mono flex items-center gap-2 mt-0.5">
                {sale?.invoiceNo || 'INV-LOADING...'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopySummary}
              className="neu-circle-btn w-8 h-8 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Copy Summary"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrintSlip}
              className="neu-circle-btn w-8 h-8 text-slate-500 hover:text-emerald-500 cursor-pointer"
              title="Print POS Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {loading && !sale ? (
            <div className="h-40 flex items-center justify-center text-slate-400 font-bold">
              Loading slip details...
            </div>
          ) : sale ? (
            <>
              {/* Top Highlights Banner */}
              <div className="p-4 rounded-2xl neu-card-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Grand Total</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {format(convert(sale.totalAmount, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-200/40 dark:border-slate-800">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black neu-pill ${
                      sale.paymentStatus === 'PAID'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : sale.paymentStatus === 'PENDING_COD'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {sale.paymentStatus}
                  </span>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold neu-pill text-slate-600 dark:text-slate-300">
                    Channel: {sale.channel || 'In-Store POS'}
                  </span>

                  {sale.orderType && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold neu-pill text-sky-600 dark:text-sky-400">
                      {sale.orderType}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer & Delivery Information */}
              <div className="p-4 rounded-2xl neu-card-sm space-y-3">
                <div className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>Customer & Recipient</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Customer Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sale.customerName
                        ? `${sale.customerName} ${sale.customerSurname || ''}`.trim()
                        : sale.deliveryContact || 'Guest'}
                    </span>
                    {sale.customerTier && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase neu-pill text-amber-500">
                        {sale.customerTier} VIP
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Contact Phone</span>
                    {sale.customerPhone || (sale.deliveryContact && /[\d+]/.test(sale.deliveryContact)) ? (
                      <div className="pt-0.5">
                        <WhatsAppPhoneBadge
                          phone={sale.customerPhone || sale.deliveryContact}
                          text={`Hello! Regarding your invoice ${sale.invoiceNo} (Amount: ${format(convert(sale.totalAmount, baseCode, currentCurrency), currentCurrency)}) from 39POS.`}
                          size="xs"
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-slate-700 dark:text-slate-300">—</span>
                    )}
                  </div>
                </div>

                {sale.deliveryAddress && (
                  <div className="pt-2.5 border-t border-slate-200/40 dark:border-slate-800 text-xs flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">{sale.deliveryAddress}</span>
                  </div>
                )}

                {(sale.courierName || (sale.deliveryFee && sale.deliveryFee > 0) || sale.courierTrackingNo) && (
                  <div className="pt-2.5 border-t border-slate-200/40 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <Truck className="w-4 h-4 text-purple-500" />
                        <span>Courier: {sale.courierName || 'In-House Express'}</span>
                      </div>
                      {sale.courierTrackingNo && (
                        <span className="font-mono text-[10px] text-slate-400">
                          #{sale.courierTrackingNo}
                        </span>
                      )}
                    </div>
                    {sale.deliveryFee > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Delivery Fee:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {format(convert(sale.deliveryFee || 0, baseCode, currentCurrency), currentCurrency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Fee Payer:</span>
                      {sale.deliveryFeePayer === 'SELLER_PAYS' ? (
                        <span className="px-2 py-0.5 rounded-md font-bold neu-pill text-amber-600 dark:text-amber-400">
                          🏪 Seller Pays (Store Free Shipping • OPEX)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md font-bold neu-pill text-emerald-600 dark:text-emerald-400">
                          👤 Customer Pays (Direct on arrival)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-black text-slate-900 dark:text-white">
                  <span>Ordered Line Items</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {items.length > 0 ? `${items.length} items` : '1 order entry'}
                  </span>
                </div>

                <div className="rounded-2xl neu-sunken p-1 divide-y divide-slate-200/40 dark:divide-slate-800/60 overflow-hidden">
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const lineTotal = ((Number(item.quantity) || 1) * Number(item.unitPrice)) - (Number(item.discountAmount) || 0);
                      return (
                        <div
                          key={item.id || idx}
                          className="p-3 flex items-center justify-between hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="font-black text-slate-800 dark:text-white truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Qty: <strong className="text-slate-700 dark:text-slate-300">{item.quantity}</strong> ×{' '}
                              {format(convert(item.unitPrice, baseCode, currentCurrency), currentCurrency)}
                              {item.discountAmount > 0 && (
                                <span className="text-rose-500 ml-1">(-{item.discountAmount})</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                            {format(convert(lineTotal, baseCode, currentCurrency), currentCurrency)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 flex justify-between items-center text-slate-500">
                      <span>Order Items Total</span>
                      <span className="font-mono font-black">
                        {format(convert(sale.totalAmount, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial & Tax Breakdown */}
              <div className="p-4 rounded-2xl neu-card-sm space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold">
                    {format(convert(sale.subtotal || sale.totalAmount, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>

                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount Applied</span>
                    <span className="font-mono font-bold">
                      -{format(convert(sale.discountAmount, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                )}

                {sale.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax / VAT</span>
                    <span className="font-mono font-bold">
                      +{format(convert(sale.taxAmount, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                )}

                {sale.serviceCharge > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Service Charge</span>
                    <span className="font-mono font-bold">
                      +{format(convert(sale.serviceCharge, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                )}

                {sale.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className={sale.deliveryFeePayer === 'SELLER_PAYS' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500'}>
                      {sale.deliveryFeePayer === 'SELLER_PAYS'
                        ? 'Store Freight Cost (Seller-Paid Free Delivery)'
                        : 'Delivery Fee (Customer Paid on Arrival)'}
                    </span>
                    <span className={`font-mono ${sale.deliveryFeePayer === 'SELLER_PAYS' ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}`}>
                      {sale.deliveryFeePayer === 'SELLER_PAYS' ? '-' : '+'}
                      {format(convert(sale.deliveryFee, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-slate-200/40 dark:border-slate-800 flex justify-between font-black text-xs text-slate-900 dark:text-white">
                  <span>Final Payable Total</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {format(convert(sale.totalAmount, baseCode, currentCurrency), currentCurrency)}
                  </span>
                </div>
              </div>

              {/* Payments & Tenders */}
              {payments.length > 0 && (
                <div className="p-4 rounded-2xl neu-sunken space-y-2 text-xs">
                  <div className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Tender Records</span>
                  </div>

                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="font-bold">{p.paymentMethod}</span>
                        {p.referenceNo && (
                          <span className="text-[10px] text-slate-400 block font-mono">Ref: {p.referenceNo}</span>
                        )}
                      </div>
                      <span className="font-mono font-black">
                        {format(convert(p.amount, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Audit Metadata */}
              <div className="text-[10px] text-slate-400 space-y-1.5 pt-2 border-t border-slate-200/40 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-mono">{sale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="font-mono">{new Date(sale.createdAt).toLocaleString()}</span>
                </div>
                {sale.cashierName && (
                  <div className="flex justify-between">
                    <span>Processed By:</span>
                    <span>{sale.cashierName}</span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200/40 dark:border-slate-800 flex items-center gap-2.5">
          <button
            onClick={handlePrintSlip}
            className="flex-1 py-2.5 px-4 neu-btn-primary text-white font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t('reports.printSlip', 'Print POS Slip')}</span>
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-all"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>

      {/* Sleek Minimal Print Setup Modal */}
      <MinimalPrintModal
        isOpen={Boolean(printModalData)}
        onClose={() => setPrintModalData(null)}
        receiptData={printModalData}
      />
    </div>
  );
};
