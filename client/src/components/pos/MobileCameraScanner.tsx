import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Flashlight, AlertCircle, RefreshCw } from 'lucide-react';
import { soundFX } from '../../utils/audio';
import { haptics } from '../../utils/haptics';

interface MobileCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export const MobileCameraScanner: React.FC<MobileCameraScannerProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'mobile-html5-qrcode-reader';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      setErrorMsg(null);
      setIsScanning(true);

      try {
        // Small timeout to ensure DOM container is rendered
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            soundFX.playBeep();
            haptics.success();
            onScan(decodedText);
          },
          () => {
            // Frame scan without barcode match (ignore frame-by-frame errors)
          }
        );

        // Check torch capabilities
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          if ((capabilities as any)?.torch) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error('Camera Scanner start error:', err);
        if (isMounted) {
          setErrorMsg(
            err?.message ||
              'Unable to access device camera. Please grant camera permission in your browser.'
          );
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
      haptics.light();
    } catch (e) {
      console.warn('Failed to toggle torch:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Mobile Barcode Scanner</h3>
              <p className="text-[11px] text-slate-400">Aim camera at barcode</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-colors ${
                  torchOn
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                aria-label="Toggle Flashlight"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              aria-label="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Viewport Area */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          <div id={scannerContainerId} className="w-full h-full object-cover" />

          {/* Aiming Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-44 border-2 border-brand-500/80 rounded-2xl relative shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-brand-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-brand-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-brand-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-brand-400 rounded-br" />

              {/* Scanning Laser Line */}
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#34d399]" />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="absolute inset-4 bg-slate-900/95 border border-red-500/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-xs text-red-200">{errorMsg}</p>
              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  // Trigger restart
                  setTimeout(() => setIsScanning(true), 100);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-400 font-medium">
            Supports EAN-13, UPC, Code 128, Code 39 & QR codes
          </span>
        </div>
      </div>
    </div>
  );
};
