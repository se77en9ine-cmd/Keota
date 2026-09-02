import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  Users,
  Building2,
  Receipt,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  ShieldCheck,
  FolderTree,
  UtensilsCrossed,
  ShoppingBag,
  Bell,
  Sparkles,
} from 'lucide-react';
import { haptics } from '../../utils/haptics';
import { useLiveOrdersStore } from '../../store/useLiveOrdersStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { businessMode, sidebarCollapsed } = useSettingsStore();
  const activeCodCount = useLiveOrdersStore((s) => s.activeCodCount);
  const newOrdersBadge = useLiveOrdersStore((s) => s.newOrdersBadge);
  const sidebarRipple = useLiveOrdersStore((s) => s.sidebarRipple);
  const fetchLiveCounts = useLiveOrdersStore((s) => s.fetchLiveCounts);
  const resetNewBadge = useLiveOrdersStore((s) => s.resetNewBadge);

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveCounts]);

  const allNavItems = [
    { to: '/pos', icon: ShoppingCart, label: t('nav.pos'), highlight: true },
    {
      to: '/online-orders',
      icon: ShoppingBag,
      label: t('nav.onlinePlatforms', 'Online Platforms'),
      badgeCount: activeCodCount || newOrdersBadge,
      hideInModes: ['RETAIL_MINIMART'],
    },
    { to: '/tables', icon: UtensilsCrossed, label: t('nav.tables', 'Tables'), hideInModes: ['RETAIL_MINIMART', 'ONLINE_HUB'] },
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/products', icon: Package, label: t('nav.products') },
    { to: '/categories', icon: FolderTree, label: t('nav.categories') },
    { to: '/inventory', icon: Boxes, label: t('nav.inventory') },
    { to: '/purchases', icon: Truck, label: t('nav.purchases') },
    { to: '/customers', icon: Users, label: t('nav.customers') },
    { to: '/suppliers', icon: Building2, label: t('nav.suppliers') },
    { to: '/employees', icon: ShieldCheck, label: t('nav.employees', 'Staff & Permissions') },
    { to: '/accounting', icon: Receipt, label: t('nav.accounting') },
    { to: '/reports', icon: FileSpreadsheet, label: t('nav.reports') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const navItems = allNavItems.filter((item) => {
    if (businessMode === 'HYBRID') return true;
    if (item.hideInModes && item.hideInModes.includes(businessMode)) {
      if (item.to === '/online-orders' && ((item.badgeCount ?? 0) > 0)) return true;
      return false;
    }
    return true;
  });

  return (
    <aside
      className={`hidden lg:flex border-r border-black/5 dark:border-white/5 neu-surface shadow-neu-raised-sm flex-col justify-between p-2.5 select-none shrink-0 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <nav className="space-y-1.5 overflow-y-auto pr-0.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isOnlineOrders = item.to === '/online-orders';
          const hasBadge = isOnlineOrders && (item.badgeCount ?? 0) > 0;
          const isRippling = isOnlineOrders && sidebarRipple;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                haptics.light();
                if (isOnlineOrders) resetNewBadge();
              }}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-2xl text-sm font-bold transition-all duration-200 relative group/nav ${
                  sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'
                } ${
                  isRippling ? 'sidebar-impact-pulse ring-4 ring-amber-500/60 bg-amber-500/20 scale-105 z-10' : ''
                } ${
                  isActive
                    ? item.highlight
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-neu-raised scale-[1.02] border border-white/20'
                      : 'neu-sunken text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30'
                    : item.highlight
                    ? 'neu-card-sm text-emerald-700 dark:text-emerald-300 hover:scale-[1.01]'
                    : 'text-slate-600 dark:text-slate-400 hover:neu-card-sm hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <div className={`flex items-center gap-3 min-w-0 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="relative flex items-center justify-center">
                  <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover/nav:scale-110" />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-ping" />
                  )}
                </div>
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!sidebarCollapsed && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {hasBadge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/40 flex items-center gap-1 animate-pulse">
                      <Truck className="w-2.5 h-2.5" />
                      <span>{item.badgeCount}</span>
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 opacity-40 group-hover/nav:translate-x-0.5 transition-transform" />
                </div>
              )}

              {/* Floating Tooltip When Collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white dark:text-slate-100 font-extrabold text-xs whitespace-nowrap shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:pointer-events-auto transition-all duration-200 z-50 flex items-center gap-2 translate-x-1 group-hover/nav:translate-x-0">
                  <span>{item.label}</span>
                  {hasBadge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-white font-black">
                      {item.badgeCount}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Indicator */}
      {!sidebarCollapsed ? (
        <div className="p-3 neu-sunken flex items-center justify-between mt-2 transition-all duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-neu-glow-emerald" />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              {t('common.offlineEngine', 'Offline-First Engine')}
            </span>
          </div>
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 neu-pill px-2 py-0.5">
            {t('common.synced', 'SYNCED')}
          </span>
        </div>
      ) : (
        <div
          className="p-2.5 neu-sunken flex items-center justify-center mt-2 group/sync relative cursor-pointer rounded-2xl"
          title="Offline-First Engine: SYNCED"
        >
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-neu-glow-emerald" />
          <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white font-extrabold text-xs whitespace-nowrap shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover/sync:opacity-100 transition-all duration-200 z-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('common.offlineEngine', 'Offline Engine')}: {t('common.synced', 'SYNCED')}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
export default Sidebar;
