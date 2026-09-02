import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductDTO } from '39pos-shared';
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
  Minimize2,
  Maximize2,
  GripHorizontal,
  Volume2,
  VolumeX,
  Keyboard,
  Sparkles,
} from 'lucide-react';

interface FloatingScannerHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcodeOrSku: string) => void;
  products?: ProductDTO[];
}

export const FloatingScannerHUD: React.FC<FloatingScannerHUDProps> = ({
  isOpen,
  onClose,
  onScan,
  products = [],
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [lastScannedItem, setLastScannedItem] = useState<{ name: string; price: number; code: string } | null>(null);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // ─── Free Dragging & Floating Position State ───
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  // Initialize Position to Bottom-Right Corner
  useEffect(() => {
    if (isOpen && position === null) {
      const defaultWidth = isMinimized ? 290 : 384;
      const defaultHeight = isMinimized ? 75 : 430;
      const initialX = Math.max(16, window.innerWidth - defaultWidth - 24);
      const initialY = Math.max(16, window.innerHeight - defaultHeight - 24);
      setPosition({ x: initialX, y: initialY });
    }
  }, [isOpen, isMinimized, position]);

  // Window Resize Boundary Clamping
  useEffect(() => {
    const handleResize = () => {
      if (!position) return;
      const widgetWidth = isMinimized ? 290 : 384;
      const widgetHeight = isMinimized ? 75 : 430;
      const clampedX = Math.min(Math.max(12, position.x), Math.max(12, window.innerWidth - widgetWidth - 12));
      const clampedY = Math.min(Math.max(12, position.y), Math.max(12, window.innerHeight - widgetHeight - 12));
      setPosition({ x: clampedX, y: clampedY });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, isMinimized]);

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag from header area, not buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('form')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);

    const currentX = position?.x ?? (window.innerWidth - 400);
    const currentY = position?.y ?? (window.innerHeight - 450);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const widgetWidth = isMinimized ? 290 : (containerRef.current?.offsetWidth || 384);
    const widgetHeight = isMinimized ? 75 : (containerRef.current?.offsetHeight || 430);

    const newX = Math.min(
      Math.max(8, dragStartRef.current.posX + deltaX),
      window.innerWidth - widgetWidth - 8
    );
    const newY = Math.min(
      Math.max(8, dragStartRef.current.posY + deltaY),
      window.innerHeight - widgetHeight - 8
    );

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

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
        setCameraError(t('pos.cameraNotSupported', 'Camera not supported'));
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('PiP Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? t('pos.cameraPermissionDenied', 'Camera permission denied')
          : t('pos.cameraUnavailable', 'Camera busy or unavailable')
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Barcode Detection Loop
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
            if (rawValue) {
              handleCodeDetected(rawValue);
            }
          }
        } catch {
          // ignore frame errors
        }
      }
      animationFrameId = requestAnimationFrame(detectBarcode);
    };

    animationFrameId = requestAnimationFrame(detectBarcode);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, stream, isScanningActive]);

  const handleCodeDetected = (code: string) => {
    setIsScanningActive(false);

    if (soundEnabled) {
      soundFX.playBeep();
    }

    const matched = products.find(
      (p) =>
        p.barcode?.toLowerCase() === code.toLowerCase() ||
        p.sku?.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      setLastScannedItem({
        name: matched.name,
        price: matched.sellingPrice,
        code,
      });
    } else {
      setLastScannedItem({
        name: 'Scanned Item',
        price: 0,
        code,
      });
    }

    onScan(code);

    // Cooldown 1.2s then resume scanning
    setTimeout(() => {
      setLastScannedItem(null);
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

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        transform: position ? `translate3d(${position.x}px, ${position.y}px, 0)` : undefined,
        top: 0,
        left: 0,
      }}
      className={`fixed z-50 select-none shadow-2xl transition-shadow ${
        isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.8)] ring-2 ring-emerald-500/60 opacity-95 cursor-grabbing' : 'shadow-2xl ring-1 ring-slate-700/80'
      } ${
        isMinimized
          ? 'w-72 bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-2.5 backdrop-blur-md'
          : 'w-80 sm:w-96 bg-slate-900/95 border border-slate-700/80 rounded-3xl overflow-hidden backdrop-blur-xl'
      }`}
    >
      {/* ─── Draggable HUD Header ─── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab hover:bg-slate-950/80'
        }`}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="p-1 text-slate-500 hover:text-slate-300">
            <GripHorizontal className="w-4 h-4 text-slate-400" />
          </div>
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-white flex items-center gap-1.5 leading-tight">
              <span>{t('pos.pipScannerTitle', 'Live PiP Scanner')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[9px] font-mono text-emerald-400/80 leading-none">
              DRAG ANYWHERE • LIVE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={soundEnabled ? 'Mute Beep' : 'Enable Beep'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Camera Flip */}
          <button
            type="button"
            onClick={toggleFacingMode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Flip Camera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Minimize / Expand */}
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Close Scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Expanded Mode Viewfinder & Controls ─── */}
      {!isMinimized && (
        <div className="p-3 space-y-2.5">
          {/* Video Viewfinder */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Error Message */}
            {cameraError && (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-slate-900/95 text-slate-300 space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                <div className="text-[11px] font-medium leading-tight">{cameraError}</div>
                <button
                  onClick={startCamera}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Target Reticle & Laser Line */}
            {!cameraError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                <div className="relative w-44 h-28 sm:w-56 sm:h-36 rounded-xl border border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-pulse" />
                </div>
              </div>
            )}

            {/* Flash Confirmation Pill */}
            {lastScannedItem && (
              <div className="absolute inset-x-2 bottom-2 p-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between gap-2 shadow-xl animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black truncate">{lastScannedItem.name}</div>
                    <div className="text-[9px] font-mono opacity-90 truncate">
                      {format(convert(lastScannedItem.price, baseCode, currentCurrency), currentCurrency)} • {lastScannedItem.code}
                    </div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-bold whitespace-nowrap">
                  +1 Cart
                </span>
              </div>
            )}
          </div>

          {/* Quick Manual Code Input */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Keyboard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={t('pos.quickScanPlaceholder', 'Type barcode & Enter...')}
                className="w-full h-8 pl-8 pr-2 rounded-xl border border-slate-700 bg-slate-800/90 text-white font-mono text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40"
            >
              Add
            </button>
          </form>

          {/* Sample Product Barcodes for Quick Testing */}
          {products.length > 0 && (
            <div className="pt-0.5">
              <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Quick Test Barcodes:</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto no-scrollbar">
                {products.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleCodeDetected(p.barcode || p.sku)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 text-[9px] font-mono text-slate-300 font-bold transition-all active:scale-95"
                  >
                    {p.name.slice(0, 10)}... ({p.barcode || p.sku})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Minimized Pill Mode ─── */}
      {isMinimized && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex items-center justify-between text-xs text-slate-300 px-1 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <ScanLine className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Scanning Active (Drag Me)</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            ONLINE
          </span>
        </div>
      )}
    </div>
  );
};
export default FloatingScannerHUD;
