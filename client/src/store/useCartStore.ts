import { create } from 'zustand';
import { CartItemDTO, ProductDTO, ProductVariantDTO } from '39pos-shared';
import Decimal from 'decimal.js';
import { useCurrencyStore } from './useCurrencyStore';

// ═══════════════════════════════════════════════════════════════
// BroadcastChannel for real-time cross-tab sync (POS ↔ Customer Display)
// ═══════════════════════════════════════════════════════════════
const CART_CHANNEL_NAME = '39pos-cart-sync';
let cartChannel: BroadcastChannel | null = null;

try {
  cartChannel = new BroadcastChannel(CART_CHANNEL_NAME);
} catch {
  console.warn('[39POS] BroadcastChannel not available; cross-tab cart sync disabled.');
}

export interface CustomerCartData {
  id: string;
  name: string;
  memberCode?: string | null;
  phone?: string | null;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  points: number;
  creditLimit?: number;
  avatarUrl?: string | null;
}

interface CartSyncPayload {
  items: CartItemDTO[];
  selectedCustomerId?: string;
  customerName?: string;
  selectedCustomer?: CustomerCartData | null;
  tableNo?: string;
  notes?: string;
  discountRate: number;
  discountAmount: number;
  redeemedPoints: number;
  serviceCharge: number;
  enableTax: boolean;
  taxName: string;
  taxRate: number;
  taxCalculationMode: 'EXCLUSIVE' | 'INCLUSIVE';
  channel: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP';
  externalOrderId?: string;
  deliveryAddress?: string;
  deliveryContact?: string;
  holdReference?: string;
  currency?: string;
}

interface CartState extends CartSyncPayload {
  // Actions
  addItem: (product: ProductDTO, variant?: ProductVariantDTO) => void;
  updateQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  setItemDiscount: (productId: string, variantId: string | undefined, discountPercent: number) => void;
  setOrderDiscount: (amount: number, isPercent?: boolean) => void;
  setCustomer: (id?: string, name?: string) => void;
  setCustomerData: (customer: CustomerCartData | null) => void;
  setRedeemedPoints: (points: number) => void;
  setTableNo: (table?: string) => void;
  setNotes: (notes?: string) => void;
  setChannel: (channel: string) => void;
  setOrderType: (orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP') => void;
  setExternalOrderId: (id?: string) => void;
  setDeliveryAddress: (addr?: string) => void;
  setDeliveryContact: (contact?: string) => void;
  setTaxConfig: (config: {
    enableTax?: boolean;
    taxName?: string;
    taxRate?: number;
    calculationMode?: 'EXCLUSIVE' | 'INCLUSIVE';
  }) => void;
  clearCart: () => void;
  loadHeldOrder: (items: CartItemDTO[], holdRef?: string, table?: string, notes?: string) => void;

  // Computed Totals
  getSubtotal: () => number;
  getTierDiscountAmount: () => number;
  getPointsDiscountAmount: () => number;
  getTotalDiscount: () => number;
  getTotalTax: () => number;
  getGrandTotal: () => number;
}

/** Broadcast current cart state to all other tabs (Customer Display, etc.) */
function broadcastCartState(state: CartState) {
  if (!cartChannel) return;
  const currentCurrency = useCurrencyStore.getState().currentCurrency;
  const payload: CartSyncPayload = {
    items: state.items,
    selectedCustomerId: state.selectedCustomerId,
    customerName: state.customerName,
    selectedCustomer: state.selectedCustomer,
    tableNo: state.tableNo,
    notes: state.notes,
    discountRate: state.discountRate,
    discountAmount: state.discountAmount,
    redeemedPoints: state.redeemedPoints,
    serviceCharge: state.serviceCharge,
    enableTax: state.enableTax,
    taxName: state.taxName,
    taxRate: state.taxRate,
    taxCalculationMode: state.taxCalculationMode,
    channel: state.channel,
    orderType: state.orderType,
    externalOrderId: state.externalOrderId,
    deliveryAddress: state.deliveryAddress,
    deliveryContact: state.deliveryContact,
    holdReference: state.holdReference,
    currency: currentCurrency,
  };
  try {
    cartChannel.postMessage({ type: 'CART_STATE_UPDATE', payload });
  } catch {
    // Channel may be closed
  }
}

export const useCartStore = create<CartState>((set, get) => {
  // ── Listen for incoming cart state from other tabs ──
  if (cartChannel) {
    cartChannel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === 'CART_STATE_UPDATE') {
        const incoming: CartSyncPayload = event.data.payload;
        if (incoming.currency) {
          useCurrencyStore.getState().setCurrentCurrency(incoming.currency, false);
        }
        set({
          items: incoming.items,
          selectedCustomerId: incoming.selectedCustomerId,
          customerName: incoming.customerName,
          selectedCustomer: incoming.selectedCustomer,
          tableNo: incoming.tableNo,
          notes: incoming.notes,
          discountRate: incoming.discountRate,
          discountAmount: incoming.discountAmount,
          redeemedPoints: incoming.redeemedPoints || 0,
          serviceCharge: incoming.serviceCharge,
          enableTax: incoming.enableTax ?? true,
          taxName: incoming.taxName || 'VAT',
          taxRate: incoming.taxRate ?? 7,
          taxCalculationMode: incoming.taxCalculationMode || 'EXCLUSIVE',
          channel: incoming.channel || 'POS',
          orderType: incoming.orderType || 'DINE_IN',
          externalOrderId: incoming.externalOrderId,
          deliveryAddress: incoming.deliveryAddress,
          deliveryContact: incoming.deliveryContact,
          holdReference: incoming.holdReference,
        });
      }
    };
  }

  return {
    items: [],
    selectedCustomerId: undefined,
    customerName: undefined,
    selectedCustomer: null,
    tableNo: undefined,
    notes: undefined,
    discountRate: 0,
    discountAmount: 0,
    redeemedPoints: 0,
    serviceCharge: 0,
    enableTax: true,
    taxName: 'VAT',
    taxRate: 7, // 7% default VAT
    taxCalculationMode: 'EXCLUSIVE',
    channel: 'POS',
    orderType: 'DINE_IN',
    externalOrderId: undefined,
    deliveryAddress: undefined,
    deliveryContact: undefined,
    holdReference: undefined,

    addItem: (product, variant) => {
      const { items } = get();
      const unitPrice = variant
        ? product.sellingPrice + variant.priceAdjustment
        : product.sellingPrice;
      const costPrice = variant
        ? product.purchasePrice + variant.costAdjustment
        : product.purchasePrice;

      const existingIndex = items.findIndex(
        (i) => i.productId === product.id && i.variantId === (variant?.id || undefined)
      );

      let newItems: CartItemDTO[];

      if (existingIndex > -1) {
        newItems = [...items];
        const existing = newItems[existingIndex];
        const newQty = existing.quantity + 1;
        const lineTotal = newQty * existing.unitPrice - existing.discountAmount;

        newItems[existingIndex] = {
          ...existing,
          quantity: newQty,
          totalPrice: Math.max(0, lineTotal),
        };
      } else {
        const newItem: CartItemDTO = {
          productId: product.id,
          variantId: variant?.id,
          sku: variant?.sku || product.sku,
          name: product.name,
          variantName: variant?.name,
          quantity: 1,
          unitPrice,
          costPrice,
          discountRate: 0,
          discountAmount: 0,
          taxRate: product.taxRate || 0,
          taxAmount: 0,
          totalPrice: unitPrice,
        };
        newItems = [...items, newItem];
      }

      set({ items: newItems });
      broadcastCartState(get());
    },

    updateQuantity: (productId, variantId, qty) => {
      const { items } = get();
      if (qty <= 0) {
        get().removeItem(productId, variantId);
        return;
      }

      const newItems = items.map((i) => {
        if (i.productId === productId && i.variantId === variantId) {
          const lineTotal = qty * i.unitPrice - i.discountAmount;
          return {
            ...i,
            quantity: qty,
            totalPrice: Math.max(0, lineTotal),
          };
        }
        return i;
      });

      set({ items: newItems });
      broadcastCartState(get());
    },

    removeItem: (productId, variantId) => {
      const { items } = get();
      const newItems = items.filter(
        (i) => !(i.productId === productId && i.variantId === variantId)
      );
      set({ items: newItems });
      broadcastCartState(get());
    },

    setItemDiscount: (productId, variantId, discountPercent) => {
      const { items } = get();
      const newItems = items.map((i) => {
        if (i.productId === productId && i.variantId === variantId) {
          const discountAmt = (i.unitPrice * i.quantity * discountPercent) / 100;
          const lineTotal = i.unitPrice * i.quantity - discountAmt;
          return {
            ...i,
            discountRate: discountPercent,
            discountAmount: discountAmt,
            totalPrice: Math.max(0, lineTotal),
          };
        }
        return i;
      });

      set({ items: newItems });
      broadcastCartState(get());
    },

    setOrderDiscount: (amount, isPercent) => {
      if (isPercent) {
        set({ discountRate: amount, discountAmount: 0 });
      } else {
        set({ discountAmount: amount, discountRate: 0 });
      }
      broadcastCartState(get());
    },

    setCustomer: (id, name) => {
      set({ selectedCustomerId: id, customerName: name });
      broadcastCartState(get());
    },

    setCustomerData: (cust) => {
      if (!cust) {
        set({
          selectedCustomer: null,
          selectedCustomerId: undefined,
          customerName: undefined,
          discountRate: 0,
          redeemedPoints: 0,
        });
      } else {
        // Auto-apply tier discount
        let tierDiscount = 0;
        if (cust.tier === 'PLATINUM') tierDiscount = 15;
        else if (cust.tier === 'GOLD') tierDiscount = 10;
        else if (cust.tier === 'SILVER') tierDiscount = 5;

        set({
          selectedCustomer: cust,
          selectedCustomerId: cust.id,
          customerName: cust.name,
          discountRate: tierDiscount,
          redeemedPoints: 0,
        });
      }
      broadcastCartState(get());
    },

    setRedeemedPoints: (pts) => {
      const { selectedCustomer } = get();
      const maxPts = selectedCustomer?.points || 0;
      const validPts = Math.max(0, Math.min(pts, maxPts));
      set({ redeemedPoints: validPts });
      broadcastCartState(get());
    },

    setTableNo: (tableNo) => {
      set({ tableNo });
      broadcastCartState(get());
    },

    setNotes: (notes) => {
      set({ notes });
      broadcastCartState(get());
    },

    setChannel: (channel) => {
      set({ channel });
      broadcastCartState(get());
    },

    setOrderType: (orderType) => {
      set({ orderType });
      broadcastCartState(get());
    },

    setExternalOrderId: (externalOrderId) => {
      set({ externalOrderId });
      broadcastCartState(get());
    },

    setDeliveryAddress: (deliveryAddress) => {
      set({ deliveryAddress });
      broadcastCartState(get());
    },

    setDeliveryContact: (deliveryContact) => {
      set({ deliveryContact });
      broadcastCartState(get());
    },

    setTaxConfig: (config) => {
      set((state) => ({
        enableTax: config.enableTax !== undefined ? config.enableTax : state.enableTax,
        taxName: config.taxName !== undefined ? config.taxName : state.taxName,
        taxRate: config.taxRate !== undefined ? config.taxRate : state.taxRate,
        taxCalculationMode: config.calculationMode !== undefined ? config.calculationMode : state.taxCalculationMode,
      }));
      broadcastCartState(get());
    },

    clearCart: () => {
      set({
        items: [],
        selectedCustomerId: undefined,
        customerName: undefined,
        selectedCustomer: null,
        tableNo: undefined,
        notes: undefined,
        discountRate: 0,
        discountAmount: 0,
        redeemedPoints: 0,
        serviceCharge: 0,
        channel: 'POS',
        orderType: 'DINE_IN',
        externalOrderId: undefined,
        deliveryAddress: undefined,
        deliveryContact: undefined,
        holdReference: undefined,
      });
      broadcastCartState(get());
    },

    loadHeldOrder: (items, holdRef, table, notes) => {
      set({
        items,
        holdReference: holdRef,
        tableNo: table,
        notes,
      });
      broadcastCartState(get());
    },

    getSubtotal: () => {
      const { items } = get();
      return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    },

    getTierDiscountAmount: () => {
      const { discountRate } = get();
      const subtotal = get().getSubtotal();
      return discountRate > 0 ? (subtotal * discountRate) / 100 : 0;
    },

    getPointsDiscountAmount: () => {
      const { redeemedPoints } = get();
      // 100 points = $1.00 USD base
      return redeemedPoints > 0 ? redeemedPoints / 100 : 0;
    },

    getTotalDiscount: () => {
      const { items, discountAmount } = get();
      const itemsDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
      const tierDisc = get().getTierDiscountAmount();
      const pointsDisc = get().getPointsDiscountAmount();
      return itemsDiscount + tierDisc + discountAmount + pointsDisc;
    },

    getTotalTax: () => {
      const { enableTax, taxRate, taxCalculationMode } = get();
      if (!enableTax || taxRate <= 0) return 0;

      const subtotal = get().getSubtotal();
      const disc = get().getTotalDiscount();
      const taxableSubtotal = Math.max(0, subtotal - disc);

      if (taxCalculationMode === 'INCLUSIVE') {
        // Price includes tax: Tax = Subtotal * (Rate / (100 + Rate))
        return taxableSubtotal * (taxRate / (100 + taxRate));
      }

      // EXCLUSIVE: Tax added on top of subtotal
      return (taxableSubtotal * taxRate) / 100;
    },

    getGrandTotal: () => {
      const subtotal = get().getSubtotal();
      const disc = get().getTotalDiscount();
      const tax = get().getTotalTax();
      const { serviceCharge, taxCalculationMode } = get();

      if (taxCalculationMode === 'INCLUSIVE') {
        // Grand total does not add tax on top because it's already in the subtotal
        return Math.max(0, subtotal - disc + serviceCharge);
      }

      // EXCLUSIVE: Grand total adds tax
      return Math.max(0, subtotal - disc + tax + serviceCharge);
    },
  };
});
