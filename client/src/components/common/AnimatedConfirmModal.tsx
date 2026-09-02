import React, { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, AlertCircle, X, Check, Loader2, ShieldAlert } from 'lucide-react';

export interface DetailPill {
  label: string;
  value: string;
  badgeColor?: string;
}

export interface AnimatedConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  itemName?: string;
  imageUrl?: string;
  warningNote?: string;
  itemDetails?: DetailPill[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const AnimatedConfirmModal: React.FC<AnimatedConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Record?',
  message = 'Are you sure you want to delete this record? This action is permanent and cannot be reversed.',
  itemName,
  imageUrl,
  warningNote,
  itemDetails,
  confirmLabel = 'Yes, Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading && !internalLoading) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoading, internalLoading, onClose]);

  if (!mounted && !isOpen) return null;

  const handleConfirmClick = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const isBusy = isLoading || internalLoading;

  // Variant themes
  const variantConfig = {
    danger: {
      glow: 'shadow-neu-glow-rose',
      border: 'border-rose-500/30 dark:border-rose-500/20',
      badge: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
      iconBg: 'neu-sunken text-rose-500',
      pulse: 'bg-rose-500',
      lineGlow: 'from-rose-500 via-red-500 to-amber-500',
      button: 'neu-btn-danger text-white',
      Icon: Trash2,
      tag: 'DESTRUCTIVE ACTION',
    },
    warning: {
      glow: 'shadow-neu-glow-amber',
      border: 'border-amber-500/30 dark:border-amber-500/20',
      badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      iconBg: 'neu-sunken text-amber-500',
      pulse: 'bg-amber-500',
      lineGlow: 'from-amber-500 via-yellow-500 to-orange-500',
      button: 'neu-btn-accent text-white',
      Icon: AlertTriangle,
      tag: 'CONFIRMATION REQUIRED',
    },
    info: {
      glow: 'shadow-neu-glow-emerald',
      border: 'border-sky-500/30 dark:border-sky-500/20',
      badge: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
      iconBg: 'neu-sunken text-sky-500',
      pulse: 'bg-sky-500',
      lineGlow: 'from-sky-500 via-indigo-500 to-emerald-500',
      button: 'neu-btn-primary text-white',
      Icon: AlertCircle,
      tag: 'ACTION CONFIRMATION',
    },
  }[variant];

  const MainIcon = variantConfig.Icon;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 ${
        isOpen ? 'opacity-100 backdrop-blur-md bg-slate-950/75' : 'opacity-0 backdrop-blur-none bg-slate-950/0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-md neu-card-lg p-6 transition-all duration-300 transform shadow-neu-raised-lg border overflow-hidden ${
          variantConfig.border
        } ${
          isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
        }`}
      >
        {/* Subtle top ambient glow line */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${variantConfig.lineGlow}`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isBusy}
          className="absolute top-4 right-4 neu-circle-btn !w-8 !h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-50 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Animated Glowing Icon Ring */}
          <div className="relative flex items-center justify-center">
            <span className={`absolute w-14 h-14 rounded-full opacity-40 animate-ping ${variantConfig.pulse}`} />
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 neu-sunken ${variantConfig.iconBg}`}>
              <MainIcon className="w-7 h-7" />
            </div>
          </div>

          {/* Badge Tag */}
          <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase neu-pill flex items-center gap-1.5 ${variantConfig.badge}`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{variantConfig.tag}</span>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5 px-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Item Preview Card (if provided) */}
          {(itemName || imageUrl || (itemDetails && itemDetails.length > 0)) && (
            <div className="w-full p-3.5 rounded-2xl neu-sunken-sm text-left space-y-2 flex items-center gap-3">
              {imageUrl && (
                <div className="w-12 h-12 rounded-xl neu-card-sm overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <img src={imageUrl} alt={itemName || 'Preview'} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {itemName && (
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                    {itemName}
                  </div>
                )}
                {itemDetails && itemDetails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {itemDetails.map((detail, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg neu-card-sm text-[10px]"
                      >
                        <span className="text-slate-400 font-medium">{detail.label}:</span>
                        <span className={`font-mono font-bold ${detail.badgeColor || 'text-slate-800 dark:text-slate-200'}`}>
                          {detail.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optional Warning Banner */}
          {warningNote && (
            <div className="w-full p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{warningNote}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="w-full py-3 px-4 neu-btn text-xs font-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isBusy}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${variantConfig.button}`}
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting…</span>
                </>
              ) : (
                <>
                  <MainIcon className="w-4 h-4" />
                  <span>{confirmLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
