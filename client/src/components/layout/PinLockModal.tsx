import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Lock, Delete, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const PinLockModal: React.FC = () => {
  const { isPinLocked, unlockPin, user, logout } = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isPinLocked) return null;

  const handleKeyClick = (val: string) => {
    if (pin.length < 6) {
      soundFX.playBeep();
      setPin((prev) => prev + val);
      setError('');
    }
  };

  const handleDelete = () => {
    soundFX.playBeep();
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    soundFX.playBeep();
    setPin('');
  };

  const handleSubmit = async () => {
    if (!pin) return;
    setIsSubmitting(true);
    const success = await unlockPin(pin);
    setIsSubmitting(false);

    if (success) {
      soundFX.playCashSuccess();
      setPin('');
    } else {
      soundFX.playError();
      setError('Invalid Cashier PIN code');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
      <div className="w-full max-w-md neu-card-lg p-8 flex flex-col items-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 rounded-2xl neu-sunken flex items-center justify-center text-emerald-500 mb-4 shadow-neu-glow-emerald">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1 tracking-wide">39POS Register Locked</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
          Enter 4-digit PIN for <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{user?.fullName || 'Cashier'}</span> or fast-switch operator
        </p>

        {/* PIN Dots Display */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-emerald-500 scale-125 shadow-neu-glow-emerald'
                  : 'neu-sunken-sm border border-black/5 dark:border-white/5'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-rose-500 text-sm font-bold mb-4 animate-shake">
            {error}
          </div>
        )}

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-3.5 w-full max-w-xs mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyClick(num)}
              className="h-16 neu-btn text-2xl font-black transition-all active:scale-95 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 neu-btn text-xs font-black text-slate-400 dark:text-slate-500 transition-all active:scale-95 cursor-pointer"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleKeyClick('0')}
            className="h-16 neu-btn text-2xl font-black transition-all active:scale-95 cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 neu-btn flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all active:scale-95 cursor-pointer"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Unlock Button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || isSubmitting}
          className="w-full max-w-xs py-4 neu-btn-primary text-base font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4 cursor-pointer"
        >
          <span>{isSubmitting ? 'Verifying...' : 'Unlock Register'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit & Full Logout</span>
        </button>
      </div>
    </div>
  );
};
