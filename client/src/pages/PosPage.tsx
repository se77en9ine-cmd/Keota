import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ProductCatalog } from '../components/pos/ProductCatalog';
import { CartPanel } from '../components/pos/CartPanel';
import { PaymentModal } from '../components/pos/PaymentModal';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { HoldOrdersModal } from '../components/pos/HoldOrdersModal';
import { FloatingCartBar } from '../components/pos/FloatingCartBar';
import { MobileCartSheet } from '../components/pos/MobileCartSheet';
import { useCartStore } from '../store/useCartStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { soundFX } from '../utils/audio';

export const PosPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  const { addItem, setTaxConfig } = useCartStore();
  const { taxConfig } = useSettingsStore();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, metaRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/meta'),
      ]);
      setProducts(prodRes.data.products || []);
      setCategories(metaRes.data.categories || []);
    } catch (err) {
      console.error('Error fetching POS catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (taxConfig) {
      setTaxConfig({
        enableTax: taxConfig.enableTax,
        taxName: taxConfig.taxName,
        taxRate: taxConfig.taxRate,
        calculationMode: taxConfig.calculationMode,
      });
    }
  }, [taxConfig]);

  // Global Barcode Scanner Hardware Listener (HID Wedge)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          e.preventDefault();
          try {
            const res = await api.get(`/products/barcode/${barcodeBuffer}`);
            if (res.data.product) {
              soundFX.playBeep();
              addItem(res.data.product, res.data.product.selectedVariant);
            }
          } catch {
            soundFX.playError();
          }
          barcodeBuffer = '';
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addItem]);

  const handleSaleSuccess = (saleData: any) => {
    setLastSaleData(saleData);
    setReceiptOpen(true);
    setMobileCartOpen(false);
    fetchData(); // Refresh stock numbers
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden relative pb-16 lg:pb-0">
      {/* Product Catalog on Left (Full width on Mobile) */}
      <ProductCatalog
        products={products}
        categories={categories}
        onOpenPayment={() => setPaymentOpen(true)}
      />

      {/* Cart Ticket Panel on Right (Desktop only) */}
      <div className="hidden lg:flex w-96 h-full flex-col">
        <CartPanel
          onOpenPayment={() => setPaymentOpen(true)}
          onOpenHolds={() => setHoldsOpen(true)}
        />
      </div>

      {/* Mobile Sticky Floating Cart Summary Bar */}
      <FloatingCartBar
        onOpenCartSheet={() => setMobileCartOpen(true)}
        onOpenPayment={() => setPaymentOpen(true)}
      />

      {/* Mobile Swipeable Cart Bottom Sheet */}
      <MobileCartSheet
        isOpen={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        onOpenPayment={() => setPaymentOpen(true)}
        onOpenHolds={() => setHoldsOpen(true)}
      />

      {/* Modals */}
      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={handleSaleSuccess}
      />

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        saleData={lastSaleData}
      />

      <HoldOrdersModal
        isOpen={holdsOpen}
        onClose={() => setHoldsOpen(false)}
      />
    </div>
  );
};
export default PosPage;
