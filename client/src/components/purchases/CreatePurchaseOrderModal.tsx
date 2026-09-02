import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  X,
  Plus,
  Trash2,
  Truck,
  Building2,
  Warehouse,
  Boxes,
  Calendar,
  DollarSign,
  AlertCircle,
  Coins,
  CheckCircle2,
  Clock,
  Hash,
  Sparkles,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { ExpiryBadge } from '../common/ExpiryBadge';

interface LineItem {
  productId: string;
  quantity: number;
  unitCost: number;
  batchNumber: string;
  expiryDate: string;
}

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: any[];
  warehouses?: any[];
  products: any[];
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  warehouses = [],
  products,
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'USD';

  const [supplierId, setSupplierId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('wh-main');
  const [status, setStatus] = useState<'ORDERED' | 'RECEIVED'>('ORDERED');
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [shippingFee, setShippingFee] = useState<string | number>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<LineItem[]>([
    {
      productId: '',
      quantity: 10,
      unitCost: 0,
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      expiryDate: '',
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (suppliers.length > 0 && (!supplierId || !suppliers.some((s) => s.id === supplierId))) {
        setSupplierId(suppliers[0].id);
      }
      if (warehouses.length > 0 && (!warehouseId || !warehouses.some((w) => w.id === warehouseId))) {
        setWarehouseId(warehouses[0].id);
      }
      if (products.length > 0 && items.length === 1 && !items[0].productId) {
        const p = products[0];
        const costInCurrentCurr = convert(p.costPrice || p.purchasePrice || p.price || 0, baseCode, currentCurrency);
        setItems([
          {
            productId: p.id,
            quantity: 10,
            unitCost: Math.round(costInCurrentCurr * 100) / 100,
            batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
            expiryDate: '',
          },
        ]);
      }
    }
  }, [isOpen, suppliers, warehouses, products, currentCurrency, baseCode]);

  if (!isOpen) return null;

  const totalQuantity = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const numShipping = Number(shippingFee || 0);

  const handleAddItem = () => {
    const defaultProduct = products[0];
    const costInCurrentCurr = defaultProduct
      ? convert(defaultProduct.costPrice || defaultProduct.purchasePrice || 0, baseCode, currentCurrency)
      : 0;

    setItems([
      ...items,
      {
        productId: defaultProduct ? defaultProduct.id : '',
        quantity: 10,
        unitCost: Math.round(costInCurrentCurr * 100) / 100,
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // If product changed, update default unitCost
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === value);
      if (p) {
        const cost = convert(p.costPrice || p.purchasePrice || 0, baseCode, currentCurrency);
        updated[index].unitCost = Math.round(cost * 100) / 100;
      }
    }

    setItems(updated);
  };

  const calculateProductTotal = () => {
    return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
  };

  const grandTotal = calculateProductTotal() + numShipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) {
      setError(t('purchases.pleaseSelectSupplier', 'Please select a supplier'));
      return;
    }
    if (items.some((it) => !it.productId || Number(it.quantity) <= 0)) {
      setError(t('purchases.pleaseFillValidLineItems', 'Please fill in valid products and quantities for all line items'));
      return;
    }

    try {
      setLoading(true);

      const payloadItems = items.map((it) => {
        const baseCost = Number(it.unitCost || 0);
        return {
          productId: it.productId,
          quantity: Number(it.quantity),
          baseCost: convert(baseCost, currentCurrency, baseCode),
          freightCost: 0,
          unitCost: convert(baseCost, currentCurrency, baseCode),
          batchNumber: it.batchNumber || undefined,
          expiryDate: it.expiryDate || undefined,
        };
      });

      await api.post('/purchases', {
        supplierId,
        warehouseId: warehouseId || 'wh-main',
        status,
        dueDate: dueDate || undefined,
        paymentMethod,
        shippingFee: convert(numShipping, currentCurrency, baseCode),
        notes: notes?.trim() || undefined,
        items: payloadItems,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl neu-card-lg rounded-3xl p-5 sm:p-6 space-y-4 my-auto max-h-[94vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {t('purchases.createPoModalTitle', 'Create Vendor Purchase Order')}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {t('purchases.createPoModalSubtitle', 'Procure stock from suppliers, log batch tracking, and restock inventory')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl neu-card-sm text-rose-500 text-xs font-bold flex items-center gap-2 animate-in fade-in flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 scrollbar-thin">
          {/* Supplier, Warehouse & Status Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl neu-sunken-sm">
            <div>
              <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                {t('purchases.supplierVendorRequired', 'Supplier / Vendor *')}
              </label>
              <CustomSelect
                value={supplierId}
                onChange={setSupplierId}
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                  subtitle: s.phone ? `${t('purchases.phoneLabel', 'Phone')}: ${s.phone}` : s.contactPerson || t('purchases.vendorLabel', 'Vendor'),
                }))}
                placeholder={t('purchases.selectSupplierPlaceholder', 'Select supplier...')}
              />
            </div>

            <div>
              <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
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

            <div>
              <label className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                {t('purchases.poReceivingStatusLabel', 'PO Receiving Status')}
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 neu-tab-container rounded-2xl h-10 items-center">
                <button
                  type="button"
                  onClick={() => setStatus('ORDERED')}
                  className={`h-8 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    status === 'ORDERED'
                      ? 'neu-tab-active text-amber-600 dark:text-amber-400 font-extrabold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('purchases.statusOrdered', 'Ordered')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('RECEIVED')}
                  className={`h-8 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    status === 'RECEIVED'
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('purchases.statusReceived', 'Received')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-xs">
                <Boxes className="w-4 h-4 text-emerald-500" />
                <span>{t('purchases.purchaseOrderItemsLabel', 'Purchase Order Items')}</span>
                <span className="px-2 py-0.5 rounded-full neu-sunken-sm text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  {items.length} {items.length === 1 ? t('purchases.unitLine', 'Line') : t('purchases.unitLines', 'Lines')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 neu-btn text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('purchases.btnAddProductLine', 'Add Product Line')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const currentProd = products.find((p) => p.id === item.productId);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl neu-card-sm space-y-3 border border-black/5 dark:border-white/5 transition-all"
                  >
                    {/* Line Header: Line Number, SKU, and Action Controls */}
                    <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg neu-sunken-sm flex items-center justify-center font-mono font-black text-[10px] text-slate-600 dark:text-slate-300">
                          #{idx + 1}
                        </span>
                        {currentProd?.sku && (
                          <span className="px-2 py-0.5 rounded-md neu-card-sm text-[10px] font-mono font-bold text-slate-500">
                            {currentProd.sku}
                          </span>
                        )}
                        {item.expiryDate && (
                          <ExpiryBadge expiryDate={item.expiryDate} />
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 mr-1.5">{t('purchases.subtotalLabel', 'Subtotal')}:</span>
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            {format(item.quantity * item.unitCost, currentCurrency)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors"
                          title={t('purchases.removeLine', 'Remove Line')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Primary Grid: Product, Quantity, Unit Cost */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      {/* Product Selector */}
                      <div className="sm:col-span-6">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          {t('reports.colItemName', 'Product')} <span className="text-rose-500">*</span>
                        </label>
                        <CustomSelect
                          value={item.productId}
                          onChange={(val) => handleItemChange(idx, 'productId', val)}
                          options={products.map((p) => ({
                            value: p.id,
                            label: p.name,
                            subtitle: `SKU: ${p.sku || 'N/A'} • ${t('reports.colCost', 'Cost')}: ${p.costPrice || p.purchasePrice || 0}`,
                          }))}
                          placeholder={t('purchases.selectProductPlaceholder', 'Select product...')}
                        />
                      </div>

                      {/* Quantity Input */}
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          {t('reports.colQuantity', 'Quantity')} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full h-10 px-3 neu-input font-mono font-bold text-center outline-none"
                          placeholder="1"
                        />
                      </div>

                      {/* Unit Purchase Cost Input */}
                      <div className="sm:col-span-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                            {t('purchases.unitCostCurrency', 'Base Cost ({{currency}})', { currency: currentCurrency })} <span className="text-rose-500">*</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          step="any"
                          required
                          value={item.unitCost === 0 ? '' : item.unitCost}
                          onChange={(e) => handleItemChange(idx, 'unitCost', Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full h-10 px-3 neu-input font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Secondary Row: Batch Number & Expiry Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-black/5 dark:border-white/5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          {t('purchases.batchLotLabel', 'Batch / Lot #')}
                        </label>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                            placeholder="e.g. BATCH-2026-08"
                            className="w-full h-10 pl-8 pr-3 neu-input font-mono text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          {t('purchases.expiryDateLabel', 'Expiry Date')}
                        </label>
                        <CustomDatePicker
                          value={item.expiryDate}
                          onChange={(val) => handleItemChange(idx, 'expiryDate', val)}
                          placeholder="YYYY-MM-DD"
                          presets={true}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transportation Fee & Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/40 dark:border-slate-800/60">
            <div className="space-y-3">
              <div>
                <label className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('purchases.transportFreightFee', 'Transportation Fee ({{currency}})', { currency: currentCurrency })}</span>
                  </span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  placeholder="0.00 (e.g. 50,000)"
                  className="w-full h-10 px-3.5 neu-input font-mono font-bold text-slate-900 dark:text-white outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  (QTY × Base Cost) + Transportation fee = Total Amount
                </p>
              </div>

              <div>
                <label className="font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('purchases.orderNotesInstructionsLabel', 'Order Notes / Receiving Instructions')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('purchases.notesPlaceholder', 'e.g. Inspect cold chain temperature upon arrival; pallet batch notes.')}
                  className="w-full h-16 p-3 neu-input outline-none resize-none text-xs"
                />
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="p-4 rounded-2xl neu-sunken-sm space-y-2.5 font-mono flex flex-col justify-between">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>{t('purchases.itemsCountLabel', 'Items Count')}:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{items.length} {items.length === 1 ? t('purchases.unitLine', 'Line') : t('purchases.unitLines', 'Lines')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{t('purchases.totalUnitsLabel', 'Total Units')}:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {totalQuantity} {t('purchases.unitUnits', 'Units')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{t('purchases.productsSubtotal', 'Products Subtotal')} (QTY × Base Cost):</span>
                  <span className="font-bold text-slate-800 dark:text-white">{format(calculateProductTotal(), currentCurrency)}</span>
                </div>
                {numShipping > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>+ {t('purchases.transportFreightFee', 'Transportation Fee')}:</span>
                    <span>{format(numShipping, currentCurrency)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-slate-200/40 dark:border-slate-800/50 pt-2.5 font-black text-sm text-slate-900 dark:text-white">
                <span className="text-xs uppercase tracking-wider">{t('purchases.estimatedPoValueLabel', 'Estimated PO Value')}:</span>
                <span className="text-emerald-500 text-base">{format(grandTotal, currentCurrency)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/40 dark:border-slate-800/60 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 neu-btn font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? t('purchases.creatingPoProgress', 'Creating PO...') : status === 'RECEIVED' ? t('purchases.btnCreateRestock', 'Create & Restock Inventory') : t('purchases.btnCreatePOOnly', 'Create Purchase Order')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
