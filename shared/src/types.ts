export * from './currencyEngine.js';

export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'WAREHOUSE' | 'CASHIER' | 'STAFF';

export type LanguageCode = 'en' | 'la' | 'th' | 'jp' | 'zh';

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  storeId?: string;
  language: LanguageCode;
  currency: string;
  theme: 'dark' | 'light';
  avatarUrl?: string;
  isActive: boolean;
}

export interface StoreDTO {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  currency: string;
  receiptHeader?: string;
  receiptFooter?: string;
  logoUrl?: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  code: string;
  icon?: string;
  parentId?: string;
}

export interface BrandDTO {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface UnitDTO {
  id: string;
  name: string;
  symbol: string;
  conversionRate: number;
}

export interface ProductVariantDTO {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  name: string;
  priceAdjustment: number;
  costAdjustment: number;
  stockQuantity?: number;
  attributesJson?: Record<string, string>;
}

export interface ProductBatchDTO {
  id: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
  quantity: number;
  avgCost?: number;
}

export interface ProductDTO {
  id: string;
  sku: string;
  barcode: string;
  qrCode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  supplierId?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minPrice?: number;
  maxDiscount?: number;
  taxRate: number;
  imageUrl?: string;
  isActive: boolean;
  trackInventory: boolean;
  hasVariants: boolean;
  stockQuantity?: number;
  expiryDate?: string;
  batchNumber?: string;
  activeBatchQty?: number;
  batchCount?: number;
  batches?: ProductBatchDTO[];
  variants?: ProductVariantDTO[];
  posMode?: string;
}

export interface CartItemDTO {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountRate: number; // percentage (0 - 100)
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
}

export interface PaymentTenderDTO {
  paymentMethod: 'CASH' | 'CARD' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'STORE_CREDIT' | 'GIFT_CARD' | 'LOYALTY_POINTS';
  amount: number;
  currency: string;
  exchangeRate: number;
  tenderedAmount: number;
  referenceNo?: string;
}

export interface SaleOrderRequest {
  storeId: string;
  customerId?: string;
  cashierId: string;
  items: CartItemDTO[];
  payments: PaymentTenderDTO[];
  discountAmount?: number;
  serviceCharge?: number;
  redeemedPoints?: number;
  pointsDiscountAmount?: number;
  tableNo?: string;
  notes?: string;
  isHold?: boolean;
  holdReference?: string;
  channel?: string;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP' | string;
  fulfillmentStatus?: 'PENDING' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | string;
  externalOrderId?: string;
  deliveryAddress?: string;
  deliveryContact?: string;
}
