import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  X,
  Edit,
  Truck,
  Building2,
  Warehouse,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

interface EditPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchase: any | null;
  suppliers: any[];
  warehouses?: any[];
}

export const EditPurchaseOrderModal: React.FC<EditPurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchase,
  suppliers,
  warehouses = [],
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'USD';

  const [supplierId, setSupplierId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('wh-main');
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentStatus, setPaymentStatus] = useState<string>('PAID');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (purchase) {
      setSupplierId(purchase.supplierId || '');
      setWarehouseId(purchase.warehouseId || 'wh-main');
      setDueDate(purchase.dueDate || '');
      setPaymentMethod(purchase.paymentMethod || 'CASH');
      setPaymentStatus(purchase.paymentStatus || 'PAID');
      setNotes(purchase.notes || '');
    }
  }, [purchase]);

  if (!isOpen || !purchase) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/purchases/${purchase.id}`, {
        supplierId,
        warehouseId,
        dueDate: dueDate || undefined,
        paymentMethod,
        paymentStatus,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg neu-card-lg rounded-3xl p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {t('purchases.editPoModalTitle', 'Edit Purchase Order')}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {purchase.invoiceNo} • {format(convert(purchase.totalAmount, baseCode, currentCurrency), currentCurrency)}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
              {t('purchases.colSupplierVendor', 'Supplier / Vendor')}
            </label>
            <CustomSelect
              value={supplierId}
              onChange={setSupplierId}
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.name,
                subtitle: s.phone ? `${t('purchases.phoneLabel', 'Phone')}: ${s.phone}` : s.companyName || t('purchases.vendorLabel', 'Vendor'),
              }))}
              placeholder={t('purchases.selectSupplierPlaceholder', 'Select supplier...')}
            />
          </div>

          <div>
            <label className="font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
              {t('purchases.receivingWarehouseLabel', 'Receiving Warehouse')}
            </label>
            <CustomSelect
              value={warehouseId}
              onChange={setWarehouseId}
              options={
                warehouses.length > 0
                  ? warehouses.map((w) => ({ value: w.id, label: w.name, subtitle: w.location || t('purchases.warehouse', 'Warehouse') }))
                  : [
                      { value: 'wh-main', label: t('purchases.centralWarehouse', 'Central Warehouse & Cold Storage'), subtitle: t('purchases.mainHub', 'Main Hub') },
                      { value: 'wh-retail', label: t('purchases.storeFrontStock', 'Store Front Retail Stock'), subtitle: t('purchases.shopFloor', 'Shop floor') },
                    ]
              }
              placeholder={t('purchases.selectWarehousePlaceholder', 'Select warehouse...')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
                {t('purchases.paymentStatusLabel', 'Payment Status')}
              </label>
              <CustomSelect
                value={paymentStatus}
                onChange={setPaymentStatus}
                options={[
                  { value: 'PAID', label: t('purchases.paymentPaid', 'PAID'), subtitle: t('purchases.settledInFull', 'Settled in full') },
                  { value: 'PARTIAL', label: t('purchases.paymentPartial', 'PARTIAL'), subtitle: t('purchases.partiallySettled', 'Partially settled') },
                  { value: 'UNPAID', label: t('purchases.paymentUnpaid', 'UNPAID'), subtitle: t('purchases.awaitingPayment', 'Awaiting payment') },
                ]}
                placeholder={t('purchases.paymentStatusPlaceholder', 'Payment status...')}
              />
            </div>

            <div>
              <label className="font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
                {t('purchases.paymentMethodLabel', 'Payment Method')}
              </label>
              <CustomSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: 'CASH', label: t('purchases.cashDrawerMethod', 'Cash Drawer'), subtitle: t('purchases.cashMethodSub', 'Cash settlement') },
                  { value: 'BANK_TRANSFER', label: t('purchases.bankTransferMethod', 'Bank Transfer'), subtitle: t('purchases.bankMethodSub', 'Online wire') },
                  { value: 'CREDIT', label: t('purchases.creditMethod', 'Vendor Credit Line'), subtitle: t('purchases.creditMethodSub', 'Account payable') },
                ]}
                placeholder={t('purchases.paymentMethodPlaceholder', 'Payment method...')}
              />
            </div>
          </div>

          <div>
            <label className="font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
              {t('purchases.paymentDueDateLabel', 'Payment Due Date')}
            </label>
            <CustomDatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder={t('purchases.selectDueDatePlaceholder', 'Select payment due date...')}
              presets={false}
            />
          </div>

          <div>
            <label className="font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
              {t('purchases.orderNotesRemarksLabel', 'Order Notes / Delivery Remarks')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('purchases.editNotesPlaceholder', 'e.g. Received shipment with invoice slip attached.')}
              className="w-full h-20 p-3 neu-input text-slate-900 dark:text-white outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200/40 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 neu-btn font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
            >
              {loading ? t('purchases.savingChangesProgress', 'Saving Changes...') : t('purchases.btnSaveChanges', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
