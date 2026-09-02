import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  X,
  Printer,
  Truck,
  Building2,
  Package,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Ban,
  Phone,
  Mail,
  MapPin,
  FileText,
  Warehouse,
  Boxes,
  Loader2,
} from 'lucide-react';

interface PurchaseAuditDrawerProps {
  purchaseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReceiveSuccess?: () => void;
  onEdit?: (po: any) => void;
  onDelete?: (po: any) => void;
}

export const PurchaseAuditDrawer: React.FC<PurchaseAuditDrawerProps> = ({
  purchaseId,
  isOpen,
  onClose,
  onReceiveSuccess,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'USD';
  const [data, setData] = useState<{ purchase: any; items: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    if (purchaseId && isOpen) {
      fetchDetails(purchaseId);
    } else {
      setData(null);
    }
  }, [purchaseId, isOpen]);

  const fetchDetails = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/purchases/${id}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch PO details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!purchaseId) return;
    try {
      setReceiving(true);
      await api.post(`/purchases/${purchaseId}/receive`);
      await fetchDetails(purchaseId);
      if (onReceiveSuccess) onReceiveSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to receive stock');
    } finally {
      setReceiving(false);
    }
  };

  const cleanNotes = (rawNotes?: string) => {
    if (!rawNotes) return '';
    return rawNotes.replace(/\[Freight-In:\s*[^\]]+\]/gi, '').trim();
  };

  const handlePrintGRN = () => {
    if (!data) return;
    const { purchase: po, items } = data;
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Goods Received Note (GRN) - ${po.invoiceNo}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .store-name { font-size: 22px; font-weight: 900; color: #0f172a; }
          .po-title { font-size: 16px; font-weight: 700; color: #10b981; text-transform: uppercase; margin-top: 4px; }
          .meta-box { display: flex; justify-content: space-between; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { text-align: left; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; }
          td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
          .text-right { text-align: right; }
          .font-mono { font-family: monospace; font-size: 12px; }
          .bold { font-weight: bold; }
          .totals-table { width: 300px; margin-left: auto; margin-top: 20px; }
          .totals-table td { padding: 4px 8px; }
          .grand-total { font-size: 15px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
          .sig-box { width: 220px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 11px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="store-name">39POS ENTERPRISE</div>
            <div class="po-title">Goods Received Note (GRN) & PO Slip</div>
            <div style="font-size: 11px; color: #64748b;">Warehouse Dock Receiving Slip</div>
          </div>
          <div style="text-align: right;">
            <div class="bold" style="font-size: 16px; font-family: monospace;">${po.invoiceNo}</div>
            <div style="font-size: 11px; color: #64748b;">Date: ${new Date(po.createdAt).toLocaleDateString()}</div>
            <div style="font-size: 11px; font-weight: bold; color: ${po.status === 'RECEIVED' ? '#059669' : '#d97706'};">
              STATUS: ${po.status}
            </div>
          </div>
        </div>

        <div class="meta-box">
          <div>
            <div class="bold" style="font-size: 12px; text-transform: uppercase; color: #64748b;">Supplier / Vendor</div>
            <div class="bold" style="font-size: 14px; margin-top: 2px;">${po.supplierName || 'General Supplier'}</div>
            <div style="font-size: 11px; color: #475569;">Contact: ${po.supplierContact || '—'}</div>
            <div style="font-size: 11px; color: #475569;">Phone: ${po.supplierPhone || '—'}</div>
            <div style="font-size: 11px; color: #475569;">${po.supplierAddress || ''}</div>
          </div>
          <div style="text-align: right;">
            <div class="bold" style="font-size: 12px; text-transform: uppercase; color: #64748b;">Destination Warehouse</div>
            <div class="bold" style="font-size: 14px; margin-top: 2px;">${po.warehouseName || 'Central Warehouse'}</div>
            <div style="font-size: 11px; color: #475569;">Location: ${po.warehouseLocation || 'Main Hub'}</div>
            <div style="font-size: 11px; color: #475569;">Payment: ${po.paymentStatus} (${po.paymentMethod || 'CASH'})</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item #</th>
              <th>Product / Description</th>
              <th>SKU / Barcode</th>
              <th>Batch / Expiry</th>
              <th class="text-right">Qty Received</th>
              <th class="text-right">Base Cost (${currentCurrency})</th>
              <th class="text-right">Total Amount (${currentCurrency})</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item, idx) => {
                  const bCost = item.baseCost !== undefined && item.baseCost !== null ? Number(item.baseCost) : Number(item.unitCost);
                  const lineTotal = Number(item.quantity) * bCost;
                  return `
              <tr>
                <td style="color: #94a3b8;">${idx + 1}</td>
                <td class="bold">${item.productName || 'Product'}</td>
                <td class="font-mono" style="font-size: 11px;">${item.productSku || item.productBarcode || '—'}</td>
                <td class="font-mono" style="font-size: 11px;">${item.batchNumber || 'N/A'} ${item.expiryDate ? `• Exp: ${item.expiryDate}` : ''}</td>
                <td class="text-right font-mono bold">${item.quantity}</td>
                <td class="text-right font-mono bold">${format(convert(bCost, baseCode, currentCurrency), currentCurrency)}</td>
                <td class="text-right font-mono bold">${format(convert(lineTotal, baseCode, currentCurrency), currentCurrency)}</td>
              </tr>
            `;
                }
              )
              .join('')}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Products Subtotal:</td>
            <td class="text-right font-mono bold">${format(convert(po.productsSubtotal || (po.totalAmount - (po.shippingAmount || 0)), baseCode, currentCurrency), currentCurrency)}</td>
          </tr>
          ${
            po.shippingAmount && po.shippingAmount > 0
              ? `<tr>
                  <td style="color: #059669; font-weight: bold;">+ Transport / Freight:</td>
                  <td class="text-right font-mono bold" style="color: #059669;">+ ${format(convert(po.shippingAmount, baseCode, currentCurrency), currentCurrency)}</td>
                </tr>`
              : ''
          }
          <tr>
            <td>Tax / Duties:</td>
            <td class="text-right font-mono">${format(convert(po.taxAmount || 0, baseCode, currentCurrency), currentCurrency)}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total:</td>
            <td class="text-right font-mono">${format(convert(po.totalAmount, baseCode, currentCurrency), currentCurrency)}</td>
          </tr>
        </table>

        <div style="margin-top: 30px; font-size: 11px; color: #64748b;">
          <strong>Notes / Remarks:</strong> ${cleanNotes(po.notes) || 'Goods inspected and received in good condition.'}
        </div>

        <div class="signatures">
          <div class="sig-box">Warehouse Receiving Clerk</div>
          <div class="sig-box">Supplier Delivery Driver</div>
          <div class="sig-box">Inventory Manager Sign-off</div>
        </div>

        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  if (!isOpen) return null;

  const po = data?.purchase;
  const items = data?.items || [];
  const isReceived = po?.status === 'RECEIVED';
  const isOrdered = po?.status === 'ORDERED' || po?.status === 'PENDING';
  const cleanedNotes = cleanNotes(po?.notes);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-3xl neu-card-lg shadow-2xl flex flex-col justify-between border-l border-slate-200/40 dark:border-slate-800/60">
          {/* Header */}
          <div className="p-5 border-b border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {po?.invoiceNo || 'PO Details'}
                  </h3>
                  {po?.status && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        po.status === 'RECEIVED'
                          ? 'neu-pill text-emerald-600 dark:text-emerald-400'
                          : po.status === 'CANCELLED'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {po.status}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {po?.createdAt ? new Date(po.createdAt).toLocaleString() : t('purchases.poAuditSubtitle', 'Purchase Order Audit & Receiving')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {loading ? (
              <div className="h-60 flex flex-col items-center justify-center text-slate-400 gap-2 font-semibold">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span>{t('purchases.loadingPoDetails', 'Loading Purchase Order details...')}</span>
              </div>
            ) : !po ? (
              <div className="h-60 flex items-center justify-center text-slate-400">
                {t('purchases.poNotFound', 'Purchase Order not found.')}
              </div>
            ) : (
              <>
                {/* Supplier & Warehouse Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-3xl neu-card-sm space-y-2">
                    <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-xs">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('purchases.supplierInformation', 'Supplier Information')}</span>
                    </div>
                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {po.supplierName || t('purchases.generalSupplier', 'General Supplier')}
                      </div>
                      {po.supplierCompany && <div className="text-[11px] font-medium">{t('purchases.companyLabel', 'Company')}: {po.supplierCompany}</div>}
                      {po.supplierPhone && (
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{po.supplierPhone}</span>
                        </div>
                      )}
                      {po.supplierEmail && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{po.supplierEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-3xl neu-card-sm space-y-2">
                    <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-xs">
                      <Warehouse className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('purchases.colDestinationWarehouse', 'Destination Warehouse')}</span>
                    </div>
                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {po.warehouseName || t('purchases.centralWarehouse', 'Central Warehouse')}
                      </div>
                      <div className="text-[11px] font-medium">{t('purchases.locationLabel', 'Location')}: {po.warehouseLocation || t('purchases.mainHub', 'Main Hub')}</div>
                      <div className="text-[11px]">
                        {t('purchases.paymentLabel', 'Payment')}: <span className="font-bold text-emerald-500">{po.paymentStatus}</span> ({po.paymentMethod || 'CASH'})
                      </div>
                      {po.dueDate && <div className="text-[11px] font-mono">{t('purchases.dueDateLabel', 'Due Date')}: {po.dueDate}</div>}
                    </div>
                  </div>
                </div>

                {/* Itemized Line Items Table */}
                <div className="neu-card-sm rounded-3xl overflow-hidden">
                  <div className="p-3.5 border-b border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between font-black">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-emerald-500" />
                      <span className="text-slate-900 dark:text-white">{t('purchases.orderLineItems', 'Order Line Items')} ({items.length})</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 text-[10px]">
                        <tr>
                          <th className="p-3">{t('reports.colItemName', 'Product Name')}</th>
                          <th className="p-3">{t('purchases.colBatchExpiry', 'Batch & Expiry')}</th>
                          <th className="p-3 text-right">{t('reports.colQuantity', 'Qty')}</th>
                          <th className="p-3 text-right">{t('purchases.baseCostLabel', 'Base Cost')}</th>
                          <th className="p-3 text-right">{t('reports.colTotalAmount', 'Total Amount')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                        {items.map((item) => {
                          const bCost = item.baseCost !== undefined && item.baseCost !== null ? Number(item.baseCost) : Number(item.unitCost);
                          const lineTotal = Number(item.quantity) * bCost;
                          return (
                            <tr key={item.id} className="hover:bg-slate-500/5 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-900 dark:text-white">{item.productName || 'Product'}</div>
                                <span className="font-mono text-[10px] text-slate-400 block">{item.productSku || item.productBarcode || '—'}</span>
                              </td>
                              <td className="p-3 font-mono text-[11px]">
                                <div>{item.batchNumber || '—'}</div>
                                {item.expiryDate && <span className="text-[10px] text-slate-400 block">Exp: {item.expiryDate}</span>}
                              </td>
                              <td className="p-3 text-right font-mono font-bold">{item.quantity}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                {format(convert(bCost, baseCode, currentCurrency), currentCurrency)}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                {format(convert(lineTotal, baseCode, currentCurrency), currentCurrency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 rounded-3xl neu-sunken-sm space-y-2 font-mono">
                  <div className="flex justify-between text-slate-500">
                    <span>{t('purchases.productsSubtotal', 'Products Subtotal')} (QTY × Base Cost):</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {format(convert(po.productsSubtotal !== undefined ? po.productsSubtotal : (po.totalAmount - (po.shippingAmount || 0)), baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>{t('purchases.transportFreightFee', 'Transportation Fee')}:</span>
                    </span>
                    <span>+ {format(convert(po.shippingAmount || 0, baseCode, currentCurrency), currentCurrency)}</span>
                  </div>

                  {Boolean(po.taxAmount && po.taxAmount > 0) && (
                    <div className="flex justify-between text-slate-500">
                      <span>{t('purchases.estimatedTax', 'Estimated Tax / Duties')}:</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {format(convert(po.taxAmount || 0, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-slate-200/40 dark:border-slate-800/50 pt-2 font-black text-sm text-slate-900 dark:text-white">
                    <span>{t('purchases.grandTotalLabel', 'Grand Total')}:</span>
                    <span className="text-emerald-500">{format(convert(po.totalAmount, baseCode, currentCurrency), currentCurrency)}</span>
                  </div>
                </div>

                {cleanedNotes && (
                  <div className="p-3.5 rounded-2xl neu-card-sm text-amber-600 dark:text-amber-400 text-xs font-medium">
                    <strong className="font-black">{t('purchases.notesLabel', 'Notes')}:</strong> {cleanedNotes}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200/40 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintGRN}
                disabled={loading || !po}
                className="px-3.5 py-2 neu-btn font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('purchases.btnPrintGrn', 'Print GRN')}</span>
              </button>

              {onEdit && (
                <button
                  onClick={() => onEdit(po)}
                  disabled={loading || !po}
                  className="px-3 py-2 neu-btn font-bold text-xs transition-all cursor-pointer"
                >
                  {t('purchases.btnEditPo', 'Edit PO')}
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(po)}
                  disabled={loading || !po}
                  className="px-3 py-2 neu-btn text-rose-500 font-bold text-xs transition-all cursor-pointer"
                >
                  {t('purchases.btnDeletePo', 'Delete PO')}
                </button>
              )}
            </div>

            {isOrdered && (
              <button
                onClick={handleReceive}
                disabled={receiving}
                className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {receiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{receiving ? t('purchases.receivingProgress', 'Receiving...') : t('purchases.btnReceiveStockUpdate', 'Receive Stock & Update')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
