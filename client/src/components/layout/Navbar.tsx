import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore, BusinessMode } from '../../store/useSettingsStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useCustomerDisplayStore } from '../../store/useCustomerDisplayStore';
import {
  Sun,
  Moon,
  Globe,
  DollarSign,
  Lock,
  LogOut,
  Maximize,
  Minimize,
  Store,
  Tv,
  Video,
  User as UserIcon,
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  Zap,
  UtensilsCrossed,
  ShoppingBag,
  Keyboard,
  Printer,
  Coins,
  RefreshCw,
  Search,
  X,
  Sparkles,
  Command,
  Cast,
  Tag,
  Crown,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { haptics } from '../../utils/haptics';
import { soundFX } from '../../utils/audio';
import { getLaoFontStyle, setLaoFontStyle, LaoFontStyle } from '../../i18n';

const getLanguagesList = (laoStyle: LaoFontStyle) => [
  { code: 'la', name: 'Lao (ລາວ)', flag: '🇱🇦', font: laoStyle === 'looped' ? 'Noto Sans Lao Looped' : 'Noto Sans Lao' },
  { code: 'th', name: 'Thai (ไทย)', flag: '🇹🇭', font: 'Noto Sans Thai Light' },
  { code: 'jp', name: 'Japanese (日本語)', flag: '🇯🇵', font: 'Noto Serif Japanese' },
  { code: 'zh', name: 'Chinese (简体中文)', flag: '🇨🇳', font: 'Noto Serif Simplified Chinese' },
  { code: 'en', name: 'English (EN)', flag: '🇺🇸', font: 'Arial Narrow' },
];

const BUSINESS_MODES: Record<
  BusinessMode,
  { label: string; Icon: React.ComponentType<{ className?: string }>; desc: string; badge: string; color: string }
> = {
  HYBRID: {
    label: 'All-in-One Hybrid',
    Icon: Zap,
    desc: 'Show all POS features simultaneously',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    color: 'text-indigo-400',
  },
  RETAIL_MINIMART: {
    label: 'Minimart & Retail',
    Icon: Store,
    desc: 'Fast barcode scanning & retail checkout',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    color: 'text-emerald-400',
  },
  RESTAURANT_CAFE: {
    label: 'Restaurant & Cafe',
    Icon: UtensilsCrossed,
    desc: 'Floor plan table orders & kitchen bills',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    color: 'text-amber-400',
  },
  ONLINE_HUB: {
    label: 'Online Platform Hub',
    Icon: ShoppingBag,
    desc: 'Grab, Foodpanda, Shopee & TikTok orders',
    badge: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    color: 'text-pink-400',
  },
};

const KEYBOARD_SHORTCUTS = [
  { key: 'F1', label: 'Cash Payment', desc: 'Instant cash checkout with change calculation' },
  { key: 'F2', label: 'QR Banking Pay', desc: 'PromptPay / BCEL One dynamic QR code' },
  { key: 'F3', label: 'Card / Terminal', desc: 'Credit, Debit & POS EDC Machine payment' },
  { key: 'F4', label: 'Barcode Scanner', desc: 'Focus cursor onto barcode scanner input' },
  { key: 'F8', label: 'Hold Bill / Cart', desc: 'Park active shopping cart for later' },
  { key: 'F9', label: 'Held Orders List', desc: 'View and resume parked customer orders' },
  { key: 'F12', label: 'Print Receipt', desc: 'Quick reprint or thermal slip trigger' },
  { key: 'Ctrl + K', label: 'Spotlight Search', desc: 'Quick search products, orders & menus' },
  { key: 'Ctrl + B', label: 'Toggle Sidebar', desc: 'Expand or collapse the left navigation panel' },
  { key: 'Esc', label: 'Clear / Cancel', desc: 'Close dialogs or clear current selection' },
];

interface NavbarProps {
  onOpenDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDrawer }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, lockPin, logout } = useAuthStore();
  const { theme, toggleTheme, store, businessMode, setBusinessMode, sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const { currencies, currentCurrency, setCurrentCurrency } = useCurrencyStore();
  const { config: displayConfig, updateConfig: updateDisplayConfig } = useCustomerDisplayStore();
  const location = useLocation();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currMenuOpen, setCurrMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [modeSelectorVisible, setModeSelectorVisible] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [laoFontStyle, setLocalLaoFontStyle] = useState<LaoFontStyle>(getLaoFontStyle());

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.style) setLocalLaoFontStyle(e.detail.style);
    };
    window.addEventListener('39pos-lao-font-changed', handler);
    return () => window.removeEventListener('39pos-lao-font-changed', handler);
  }, []);

  const handleLaoFontChange = (style: LaoFontStyle) => {
    setLaoFontStyle(style);
    setLocalLaoFontStyle(style);
    haptics.medium();
    soundFX.playBeep();
  };

  const isOnPosPage = location.pathname === '/pos' || location.pathname === '/pos/';

  useEffect(() => {
    if (isOnPosPage) {
      const timer = setTimeout(() => setModeSelectorVisible(true), 80);
      return () => clearTimeout(timer);
    } else {
      setModeSelectorVisible(false);
      setModeMenuOpen(false);
    }
  }, [isOnPosPage]);

  // Track Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global hotkeys listener (F1-F12, ?, Ctrl+K, Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShortcutsModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        haptics.medium();
        toggleSidebar();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setLangMenuOpen(false);
    haptics.light();
  };

  const handleCurrencyChange = (code: string) => {
    setCurrentCurrency(code);
    setCurrMenuOpen(false);
    haptics.light();
  };

  const handleModeChange = (mode: BusinessMode) => {
    setBusinessMode(mode);
    setModeMenuOpen(false);
    haptics.medium();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    haptics.light();
  };

  const openCustomerDisplayWindow = () => {
    haptics.medium();
    soundFX.playCashSuccess();
    const width = 1280;
    const height = 720;
    const left = window.screen.width;
    const top = 0;
    window.open(
      '/display',
      '39POS_CustomerDisplay',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no`
    );
  };

  const currentModeInfo = BUSINESS_MODES[businessMode] || BUSINESS_MODES.HYBRID;

  return (
    <header className="h-16 border-b border-black/5 dark:border-white/5 neu-surface shadow-neu-raised-sm px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300 select-none">
      {/* ─── Left: Store Branding & Sidebar Collapse/Expand Control ─── */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Mobile Nav Drawer Toggle */}
        {onOpenDrawer && (
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onOpenDrawer();
            }}
            className="lg:hidden neu-circle-btn !w-9 !h-9 text-slate-600 dark:text-slate-300 cursor-pointer"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Animated Sidebar Expand/Collapse Button */}
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            toggleSidebar();
          }}
          className={`hidden lg:flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-300 active:scale-90 cursor-pointer group relative ${
            sidebarCollapsed
              ? 'neu-btn text-emerald-600 dark:text-emerald-400 shadow-neu-glow-emerald border border-emerald-500/40 scale-105'
              : 'neu-circle-btn text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={
            sidebarCollapsed
              ? t('nav.expandSidebar', 'Expand Navigation Menu (Ctrl + B)')
              : t('nav.collapseSidebar', 'Collapse Navigation Menu (Ctrl + B)')
          }
          aria-label={sidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
        >
          <div className="relative w-4 h-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 transition-all duration-300 animate-in zoom-in-90" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-500 group-hover:text-emerald-500 dark:text-slate-400 dark:group-hover:text-emerald-400 transition-all duration-300" />
            )}
          </div>

          {/* Micro-dot pulse when collapsed */}
          {sidebarCollapsed && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse shadow-neu-glow-emerald" />
          )}
        </button>

        {/* Brand Logo & Name */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group cursor-pointer focus:outline-none">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-lg shadow-neu-glow-emerald border border-white/25 shrink-0 transition-transform duration-300 group-hover:scale-105">
            39
          </div>
          <div className="hidden min-[380px]:block">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5 leading-tight">
              <span>39POS</span>
              <span className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 hidden sm:inline-block">
                Pro
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[200px]">
              {store?.name || 'Store POS'}
            </p>
          </div>
        </Link>
      </div>

      {/* ─── Center / Right: Shortcuts & Controls Deck ─── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* 1. Dedicated Online Platform Hub Badge (POS Page Only) */}
        {isOnPosPage && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl neu-pill text-xs font-black text-pink-500 dark:text-pink-400 select-none">
            <ShoppingBag className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden sm:inline">Online Platform Hub</span>
          </div>
        )}

        {/* ─── 2. Shortcut: 📺 Customer Display Cast (Icon Only) ─── */}
        <button
          type="button"
          onClick={openCustomerDisplayWindow}
          title="Open Customer Display (2nd Monitor Window)"
          className="neu-circle-btn !w-9 !h-9 text-indigo-500 cursor-pointer group"
          aria-label="Open Customer Display"
        >
          <Tv className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
        </button>

        {/* ─── 3. Shortcut: 🎬 Standby Display Mode (Icon Only) ─── */}
        <button
          type="button"
          onClick={() => {
            const nextMode = displayConfig.standbyMode === 'FULL_PROMOTION' ? 'STORE_LOGO' : 'FULL_PROMOTION';
            updateDisplayConfig({ standbyMode: nextMode });
            haptics.medium();
            soundFX.playCashSuccess();
          }}
          title={`Customer Screen Standby Mode: ${
            displayConfig.standbyMode === 'FULL_PROMOTION'
              ? 'Currently [Cinema Reel] — Click to switch to [Store Logo]'
              : 'Currently [Store Logo] — Click to switch to [Cinema Reel]'
          }`}
          className={`neu-circle-btn !w-9 !h-9 cursor-pointer group transition-all ${
            displayConfig.standbyMode === 'FULL_PROMOTION'
              ? 'text-emerald-500 shadow-neu-glow-emerald'
              : 'text-indigo-500'
          }`}
          aria-label="Toggle Standby Mode"
        >
          {displayConfig.standbyMode === 'FULL_PROMOTION' ? (
            <Video className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          ) : (
            <Store className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* ─── 4. Shortcut: ⌨️ POS Hotkeys & Speed Keys (Icon Only) ─── */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setShortcutsModalOpen(true);
          }}
          title="Keyboard Shortcuts & Fast POS Speed Keys (? / Ctrl+K)"
          className="neu-circle-btn !w-9 !h-9 text-emerald-500 cursor-pointer group"
          aria-label="POS Shortcuts"
        >
          <Keyboard className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
        </button>

        {/* ─── 4. Shortcut: ⛶ Fullscreen Kiosk Mode ─── */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen POS Kiosk Mode'}
          className="hidden sm:flex neu-circle-btn !w-9 !h-9 text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 text-amber-500" />
          ) : (
            <Maximize className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          )}
        </button>

        {/* ─── 4b. Shortcut: 🏷️ Expiry Tags & Thresholds Configuration Studio ─── */}
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            navigate('/settings?tab=EXPIRY_TAGS');
          }}
          title={t('common.expiryTagsShortcut', 'Customize Expiry Tags, Days Remaining & Colors')}
          className="neu-circle-btn !w-9 !h-9 text-rose-500 hover:text-rose-600 dark:text-rose-400 cursor-pointer group transition-all relative"
          aria-label="Customize Expiry Tags"
        >
          <Tag className="w-4 h-4 text-rose-500 dark:text-rose-400 group-hover:scale-110 group-hover:rotate-12 transition-all" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50" />
        </button>

        {/* ─── 5. Currency Switcher ─── */}
        <div className="relative">
          <button
            onClick={() => {
              setCurrMenuOpen(!currMenuOpen);
              setLangMenuOpen(false);
              setModeMenuOpen(false);
              haptics.light();
            }}
            className="neu-btn px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
            title="Switch Active POS Display Currency"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span className="font-mono font-black">{currentCurrency}</span>
          </button>

          {currMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 neu-card-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 shadow-2xl">
              <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{t('common.selectCurrency', 'Display Currency')}</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Live Sync</span>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-1">
                {currencies
                  .filter((c) => c.isActive !== false)
                  .map((c) => {
                    const isSelected = currentCurrency === c.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => {
                          handleCurrencyChange(c.code);
                          soundFX.playCashSuccess();
                          haptics.medium();
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'text-emerald-600 dark:text-emerald-400 font-extrabold neu-sunken-sm ring-1 ring-emerald-500/40 scale-[1.02] shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:neu-card-sm hover:translate-x-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {isSelected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 animate-in zoom-in-75 duration-150 stroke-[2.5]" />
                          ) : (
                            <span className="w-3.5 h-3.5 flex items-center justify-center font-mono text-[10px] text-slate-400 flex-shrink-0">
                              {c.symbol}
                            </span>
                          )}
                          <span className="truncate font-medium">{c.code} — {c.name}</span>
                          {c.isBase && (
                            <Crown className="w-3 h-3 text-amber-500 fill-amber-500/30 flex-shrink-0 drop-shadow-xs" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono font-bold flex-shrink-0 ml-1.5">{c.symbol}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* ─── 6. Language Switcher ─── */}
        <div className="relative">
          <button
            onClick={() => {
              setLangMenuOpen(!langMenuOpen);
              setCurrMenuOpen(false);
              setModeMenuOpen(false);
              haptics.light();
            }}
            className="neu-btn px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="uppercase">{i18n.language || 'EN'}</span>
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 neu-card-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
              <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <span>{t('common.languages', 'Languages & Dynamic Fonts')}</span>
                <span className="text-[9px] text-emerald-500 font-bold">5 Locales</span>
              </div>

              {/* Quick Lao Font Style Pill Switcher */}
              {(i18n.language || 'en').toLowerCase().startsWith('la') && (
                <div className="mx-2 my-2 p-2 rounded-2xl neu-sunken-sm bg-black/5 dark:bg-white/5 space-y-1.5 border border-emerald-500/20">
                  <div className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>🇱🇦</span>
                      <span>{t('common.laoFontStyle', 'Lao Font Style')}</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">
                      {laoFontStyle === 'looped' ? 'ຫົວມົນ (Looped)' : 'Noto Sans Lao'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaoFontChange('regular');
                      }}
                      className={`py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        laoFontStyle !== 'looped'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm font-black'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      title="Noto Sans Lao (Regular standard font)"
                    >
                      <span>🔤 Noto Sans Lao</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaoFontChange('looped');
                      }}
                      className={`py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        laoFontStyle === 'looped'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm font-black'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      title="Noto Sans Lao Looped (Traditional looped font)"
                    >
                      <span>🖋️ Looped (ຫົວມົນ)</span>
                    </button>
                  </div>
                </div>
              )}

              {getLanguagesList(laoFontStyle).map((l) => {
                const isActive = (i18n.language || 'en').toLowerCase().startsWith(l.code);
                return (
                  <button
                    key={l.code}
                    onClick={() => handleLanguageChange(l.code)}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:neu-card-sm transition-colors cursor-pointer ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 font-black neu-sunken-sm'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{l.flag}</span>
                      <div>
                        <div className="font-extrabold text-xs">{l.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Font: {l.font}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase font-mono text-slate-400">{l.code}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 7. Theme Toggle ─── */}
        <button
          onClick={() => {
            haptics.light();
            toggleTheme();
          }}
          title="Toggle Light / Dark Mode"
          className="neu-circle-btn !w-9 !h-9 text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shadow-neu-glow-amber" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
        </button>

        {/* ─── 8. Cashier Quick Lock (PIN) ─── */}
        <button
          onClick={() => {
            haptics.medium();
            lockPin();
          }}
          title="Lock Register (PIN Fast-Switch)"
          className="neu-btn px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:brightness-105 cursor-pointer flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{t('common.lockPin', 'Lock PIN')}</span>
        </button>

        {/* ─── 9. User Profile Avatar & Logout ─── */}
        <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-black/5 dark:border-white/5">
          <div className="w-8 h-8 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
          </div>
          <button
            onClick={() => {
              haptics.medium();
              logout();
            }}
            title="Logout"
            className="neu-circle-btn !w-8 !h-8 text-rose-500 hover:text-rose-600 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 10. Enterprise POS Keyboard Shortcuts & Speed Actions Modal ─── */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl neu-card-lg p-6 space-y-5 shadow-neu-raised-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl neu-sunken flex items-center justify-center text-emerald-500">
                  <Keyboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <span>POS Keyboard Shortcuts & Speed Keys</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neu-pill text-indigo-500">
                      ⚡ FAST CASHIER
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use these hotkeys to accelerate order checkout and touchless counter operation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="neu-circle-btn !w-9 !h-9 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Speed Actions Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  openCustomerDisplayWindow();
                  setShortcutsModalOpen(false);
                }}
                className="p-3 neu-card-interactive flex flex-col items-center text-center gap-2 cursor-pointer group"
              >
                <Tv className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-white">2nd Display</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Open Customer Screen</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleFullscreen();
                  setShortcutsModalOpen(false);
                }}
                className="p-3 neu-card-interactive flex flex-col items-center text-center gap-2 cursor-pointer group"
              >
                <Maximize className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-white">Fullscreen</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">POS Kiosk Mode</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playCashSuccess();
                  setShortcutsModalOpen(false);
                }}
                className="p-3 neu-card-interactive flex flex-col items-center text-center gap-2 cursor-pointer group"
              >
                <Coins className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-white">Kick Drawer</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Open Cash Drawer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  lockPin();
                  setShortcutsModalOpen(false);
                }}
                className="p-3 neu-card-interactive flex flex-col items-center text-center gap-2 cursor-pointer group"
              >
                <Lock className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-white">Fast Lock</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Cashier PIN Lock</div>
                </div>
              </button>
            </div>

            {/* Hotkeys Grid */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                Keyboard Speed Keys
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {KEYBOARD_SHORTCUTS.map((sc, idx) => (
                  <div
                    key={idx}
                    className="p-3 neu-card-sm flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-white">{sc.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{sc.desc}</div>
                    </div>
                    <kbd className="px-2.5 py-1 neu-sunken-sm font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Press <kbd className="px-1.5 py-0.5 neu-sunken-sm text-slate-700 dark:text-slate-200 font-mono">?</kbd> anytime to open this helper</span>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="neu-btn-primary px-5 py-2 text-xs cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
export default Navbar;
