import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductDTO } from '39pos-shared';
import { useCartStore } from '../../store/useCartStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { soundFX } from '../../utils/audio';
import {
  X,
  Camera,
  QrCode,
  ScanLine,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Package,
  Keyboard,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Sparkles,
} from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcodeOrSku: string) => void;
  products?: ProductDTO[];
  onOpenPayment?: () => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  products = [],
  onOpenPayment,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<ProductDTO | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);

  const { items, updateQuantity, removeItem, clearCart, getGrandTotal, getSubtotal } = useCartStore();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const grandTotal = getGrandTotal();

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setCameraError('');
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          t('pos.cameraNotSupported', 'Camera access is not supported by your browser.')
        );
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? t('pos.cameraPermissionDenied', 'Camera permission was denied. Please allow camera access in browser settings.')
          : t('pos.cameraUnavailable', 'Camera is unavailable or in use by another app.')
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Barcode Detection Loop using Browser Native BarcodeDetector API
  useEffect(() => {
    if (!isOpen || !stream || !isScanningActive) return;

    let animationFrameId: number;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        const supportedFormats = [
          'qr_code',
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'upc_a',
          'upc_e',
          'data_matrix',
        ];
        detector = new (window as any).BarcodeDetector({ formats: supportedFormats });
      } catch (e) {
        console.warn('BarcodeDetector format error:', e);
      }
    }

    const detectBarcode = async () => {
      if (videoRef.current && detector && videoRef.current.readyState === 4) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue !== lastScannedCode) {
              handleCodeDetected(rawValue);
            }
          }
        } catch {
          // ignore frame decode errors
        }
      }
      animationFrameId = requestAnimationFrame(detectBarcode);
    };

    animationFrameId = requestAnimationFrame(detectBarcode);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, stream, isScanningActive, lastScannedCode]);

  const handleCodeDetected = (code: string) => {
    setIsScanningActive(false);
    setLastScannedCode(code);
    soundFX.playBeep();

    const matched = products.find(
      (p) =>
        p.barcode?.toLowerCase() === code.toLowerCase() ||
        p.sku?.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      setScannedProduct(matched);
      onScan(code);
    } else {
      setScannedProduct(null);
      onScan(code);
    }

    // Cooldown 1.2s then resume scanning
    setTimeout(() => {
      setLastScannedCode(null);
      setScannedProduct(null);
      setIsScanningActive(true);
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeDetected(manualCode.trim());
    setManualCode('');
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleProceedToPayment = () => {
    onClose();
    if (onOpenPayment) {
      onOpenPayment();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('pos.scanBarcodeModal', 'Scan Barcode & QR Code Studio')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  LIVE POS SYNC
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                {t('pos.scanCameraSubtitle', 'Scan barcodes with camera, USB scanner, or manual SKU while checking live ticket')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFacingMode}
              title="Flip Camera (Front / Back)"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2-Column Split Studio (Left: Viewfinder, Right: Live Scanned Ticket) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          {/* ════════════ LEFT COLUMN: Camera Viewfinder & Barcode Input (7 Cols) ════════════ */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col space-y-4 overflow-y-auto">
            {/* Live Camera Viewfinder */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border-2 border-slate-800 shadow-inner flex-shrink-0">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Camera Error State */}
              {cameraError && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900/95 text-slate-300 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500" />
                  <div className="text-xs font-medium max-w-xs">{cameraError}</div>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('common.retry', 'Retry Camera')}</span>
                  </button>
                </div>
              )}

              {/* HUD Target Finder Box */}
              {!cameraError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                  <div className="relative w-56 h-36 sm:w-72 sm:h-44 rounded-2xl border-2 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                    {/* Corner Reticles */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />

                    {/* Glowing Laser Scan Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-pulse" />

                    <div className="text-[9px] font-mono uppercase tracking-widest text-emerald-400/90 bg-slate-950/70 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      Align Code Here
                    </div>
                  </div>
                </div>
              )}

              {/* Live Toast Confirmation Overlay */}
              {lastScannedCode && (
                <div className="absolute bottom-3 inset-x-3 p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-white" />
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate">
                        {scannedProduct ? scannedProduct.name : 'Scanned Code'}
                      </div>
                      <div className="text-[10px] font-mono opacity-90 truncate">
                        {lastScannedCode}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white/20 text-[10px] font-extrabold whitespace-nowrap shadow-inner">
                    +1 to Cart!
                  </span>
                </div>
              )}
            </div>

            {/* Manual Barcode / SKU Entry Form */}
            <form onSubmit={handleManualSubmit} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Keyboard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder={t('pos.enterBarcodeManual', 'Enter barcode / SKU manually & press Enter...')}
                    className="w-full h-11 pl-10 pr-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 h-11 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs shadow-md shadow-brand-500/25 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>{t('pos.addCode', 'Add')}</span>
                </button>
              </div>

              {/* Sample Product Barcodes for Quick Testing */}
              {products.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-brand-500" />
                    <span>{t('pos.quickSampleCodes', 'Sample Product Barcodes (Tap to Simulate Scan):')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {products.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleCodeDetected(p.barcode || p.sku)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300 font-bold transition-all flex items-center gap-1 active:scale-95"
                      >
                        <span>{p.name.slice(0, 14)}...</span>
                        <span className="opacity-60 text-[9px]">({p.barcode || p.sku})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* ════════════ RIGHT COLUMN: Real-Time Scanned Ticket & Checkout (5 Cols) ════════════ */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50/50 dark:bg-slate-850/40 p-4 sm:p-5 min-h-[300px] lg:min-h-0">
            {/* Scanned Ticket Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-brand-500" />
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white">
                  {t('pos.scannedTicket', 'Live Cart Ticket')}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-black">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t('pos.clearAll', 'Clear')}</span>
                </button>
              )}
            </div>

            {/* Scrollable Scanned Items List */}
            <div className="flex-1 overflow-y-auto py-2.5 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
              {items.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 space-y-2 p-4 text-center">
                  <ScanLine className="w-10 h-10 opacity-30 stroke-[1.5]" />
                  <div className="font-extrabold text-xs text-slate-600 dark:text-slate-400">
                    {t('pos.noScannedItemsYet', 'No items scanned yet')}
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-[200px]">
                    {t('pos.scanHelperText', 'Point camera or tap any sample barcode to add items to ticket')}
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || 'base'}`}
                    className="pt-2 first:pt-0 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-white truncate">
                          {item.name}
                        </div>
                        {item.variantName && (
                          <div className="text-[10px] font-semibold text-brand-500">
                            {item.variantName}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400">
                          {format(convert(item.unitPrice, baseCode, currentCurrency), currentCurrency)} each
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                          {format(convert(item.totalPrice, baseCode, currentCurrency), currentCurrency)}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper & Remove */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-200"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-5 text-center font-black text-xs font-mono text-slate-800 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-200"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: Live Total & Checkout Action */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 flex-shrink-0">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                  {t('pos.totalPayable', 'Total Payable')}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {format(convert(grandTotal, baseCode, currentCurrency), currentCurrency)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all active:scale-95"
                >
                  {t('common.done', 'Done Scanning')}
                </button>

                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={items.length === 0}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t('pos.pay', 'Pay Now')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CameraScannerModal;
