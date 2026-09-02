import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  ShoppingBag,
  UtensilsCrossed,
  LayoutDashboard,
  Menu,
} from 'lucide-react';
import { haptics } from '../../utils/haptics';

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenDrawer }) => {
  const { t } = useTranslation();

  const primaryTabs = [
    { to: '/pos', icon: ShoppingCart, label: t('nav.pos', 'POS') },
    { to: '/online-orders', icon: ShoppingBag, label: t('nav.onlinePlatforms', 'Orders') },
    { to: '/tables', icon: UtensilsCrossed, label: t('nav.tables', 'Tables') },
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard', 'Stats') },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 neu-surface border-t border-black/5 dark:border-white/5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 px-3 shadow-neu-raised-lg transition-colors duration-300"
    >
      <div className="flex items-center justify-around max-w-md mx-auto gap-1">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              onClick={() => haptics.light()}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl min-h-[48px] transition-all duration-200 select-none active:scale-95 ${
                  isActive
                    ? 'neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`relative p-1 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 scale-105'
                        : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-neu-glow-emerald" />
                    )}
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-[64px] font-bold">
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenDrawer();
          }}
          className="flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 select-none active:scale-95"
          aria-label="Open Full Menu"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate font-bold">
            {t('common.more', 'More')}
          </span>
        </button>
      </div>
    </nav>
  );
};
