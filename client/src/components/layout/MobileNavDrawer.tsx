import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  X,
  ShoppingCart,
  ShoppingBag,
  UtensilsCrossed,
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  Truck,
  Users,
  Building2,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { haptics } from '../../utils/haptics';
import { useSettingsStore } from '../../store/useSettingsStore';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { store } = useSettingsStore();

  const navSections = [
    {
      title: t('nav.sectionSales', 'Sales & Operations'),
      items: [
        { to: '/pos', icon: ShoppingCart, label: t('nav.pos', 'POS Cashier'), badge: 'Hot' },
        { to: '/online-orders', icon: ShoppingBag, label: t('nav.onlinePlatforms', 'Online Platform Hub') },
        { to: '/tables', icon: UtensilsCrossed, label: t('nav.tables', 'Dine-In Tables') },
        { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard', 'Overview Dashboard') },
      ],
    },
    {
      title: t('nav.sectionCatalog', 'Catalog & Inventory'),
      items: [
        { to: '/products', icon: Package, label: t('nav.products', 'Products & Modifiers') },
        { to: '/categories', icon: FolderTree, label: t('nav.categories', 'Categories') },
        { to: '/inventory', icon: Boxes, label: t('nav.inventory', 'Stock & Inventory') },
        { to: '/purchases', icon: Truck, label: t('nav.purchases', 'Purchase Orders') },
      ],
    },
    {
      title: t('nav.sectionPeople', 'People & Relations'),
      items: [
        { to: '/customers', icon: Users, label: t('nav.customers', 'Loyalty Customers') },
        { to: '/suppliers', icon: Building2, label: t('nav.suppliers', 'Vendors & Suppliers') },
        { to: '/employees', icon: ShieldCheck, label: t('nav.employees', 'Staff & Permissions') },
      ],
    },
    {
      title: t('nav.sectionFinance', 'Finance & Configuration'),
      items: [
        { to: '/accounting', icon: Receipt, label: t('nav.accounting', 'Accounting & Cash Flow') },
        { to: '/reports', icon: FileSpreadsheet, label: t('nav.reports', 'Analytics Reports') },
        { to: '/settings', icon: Settings, label: t('nav.settings', 'Store Settings') },
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 overflow-hidden select-none animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={() => {
          haptics.light();
          onClose();
        }}
      />

      {/* Drawer Panel */}
      <aside className="absolute inset-y-0 right-0 max-w-[85vw] w-80 neu-surface shadow-neu-raised-lg flex flex-col z-10 border-l border-black/5 dark:border-white/5 animate-slideLeft">
        {/* Header */}
        <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between neu-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-neu-glow-emerald border border-white/25 text-white font-extrabold text-lg">
              {store?.name ? store.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <h2 className="font-black text-sm text-slate-900 dark:text-white truncate max-w-[170px]">
                {store?.name || 'POS System'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-neu-glow-emerald" />
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Mobile Pro Active
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="neu-circle-btn !w-9 !h-9 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            aria-label="Close Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </h3>
              <div className="space-y-1.5 mt-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        haptics.light();
                        onClose();
                      }}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                          isActive
                            ? 'neu-sunken text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30'
                            : 'text-slate-700 dark:text-slate-300 hover:neu-card-sm'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 neu-surface flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-extrabold">Fast Sync Mode</span>
          </div>
          <span className="text-[10px] font-mono font-bold opacity-60">v2.4.0</span>
        </div>
      </aside>
    </div>
  );
};
