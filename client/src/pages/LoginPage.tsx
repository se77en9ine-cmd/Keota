import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, KeyRound, Eye, EyeOff, Delete, Loader2, ShieldCheck } from 'lucide-react';
import { soundFX } from '../utils/audio';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const { login, pinSwitch } = useAuthStore();
  const navigate = useNavigate();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter username/email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(identifier.trim(), password);
      soundFX.playCashSuccess();
      navigate('/pos');
    } catch (err: any) {
      soundFX.playError();
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot reach backend server. Please verify backend is running on port 5000.');
      } else {
        setError('Login failed. Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = useCallback(async (pinCode: string) => {
    if (pinCode.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      await pinSwitch(pinCode);
      soundFX.playCashSuccess();
      navigate('/pos');
    } catch (err: any) {
      soundFX.playError();
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot reach backend server. Please verify backend is running on port 5000.');
      } else {
        setError('Invalid Cashier PIN. Please try again.');
      }
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setPin('');
    } finally {
      setLoading(false);
    }
  }, [pinSwitch, navigate]);

  // Handle Numpad click
  const handlePinDigit = (digit: string) => {
    if (loading || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) {
      handlePinLogin(newPin);
    }
  };

  const handlePinDelete = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handlePinClear = () => {
    if (loading) return;
    setPin('');
    setError('');
  };

  // Physical keyboard listener for PIN tab
  useEffect(() => {
    if (activeTab !== 'PIN') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinDelete();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handlePinClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, pin, loading, handlePinLogin]);

  return (
    <div className="h-screen w-screen neu-bg flex items-center justify-center p-4 relative overflow-hidden font-app select-none">
      {/* Background soft ambient accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md neu-card-lg p-7 relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl neu-btn-primary flex items-center justify-center text-white font-black text-2xl shadow-neu-glow-emerald mb-2.5">
            39
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">39POS Enterprise</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Cloud-Ready, Offline-First Point of Sale Platform
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="p-1 neu-tab-container grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PASSWORD');
              setError('');
            }}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PASSWORD'
                ? 'neu-tab-active shadow-neu-raised-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('PIN');
              setError('');
              setPin('');
            }}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PIN'
                ? 'neu-tab-active shadow-neu-raised-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Cashier PIN (Fast)</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold text-center animate-shake">
            {error}
          </div>
        )}

        {/* Tab 1: Password Login */}
        {activeTab === 'PASSWORD' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1.5">Username or Email</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 neu-input font-medium placeholder:text-slate-400"
                  placeholder="Enter username or email"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 neu-input font-medium placeholder:text-slate-400"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 neu-btn-primary text-white font-black text-sm flex items-center justify-center gap-2 shadow-neu-glow-emerald transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Tab 2: Fast PIN Numpad Login */
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Enter your 4-digit Cashier PIN</p>
            </div>

            {/* PIN Dots Display */}
            <div
              className={`flex items-center justify-center gap-4 py-2 transition-transform ${
                isShaking ? 'animate-shake' : ''
              }`}
            >
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      filled
                        ? 'bg-emerald-500 scale-125 shadow-neu-glow-emerald ring-2 ring-emerald-400/40'
                        : 'neu-sunken-sm'
                    }`}
                  />
                );
              })}
            </div>

            {/* Interactive PIN Numpad Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={loading}
                  onClick={() => handlePinDigit(digit)}
                  className="h-13 py-3 neu-btn text-slate-800 dark:text-white font-black text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Row 4: Clear, 0, Backspace */}
              <button
                type="button"
                disabled={loading || pin.length === 0}
                onClick={handlePinClear}
                className="h-13 py-3 neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-xs transition-all active:scale-95 flex items-center justify-center disabled:opacity-40 cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handlePinDigit('0')}
                className="h-13 py-3 neu-btn text-slate-800 dark:text-white font-black text-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                disabled={loading || pin.length === 0}
                onClick={handlePinDelete}
                className="h-13 py-3 neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold transition-all active:scale-95 flex items-center justify-center disabled:opacity-40 cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-xs text-emerald-500 font-bold py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying PIN...</span>
              </div>
            )}
          </div>
        )}

        {/* Security Footer */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-semibold text-center border-t border-black/5 dark:border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Role-Based Access Control Active & Encrypted</span>
        </div>
      </div>
    </div>
  );
};
