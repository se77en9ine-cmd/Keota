import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileNavDrawer } from './MobileNavDrawer';
import { PinLockModal } from './PinLockModal';

export const AppLayout: React.FC = () => {
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col neu-bg text-slate-800 dark:text-slate-100 overflow-hidden font-app selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      {/* Top Header */}
      <Navbar onOpenDrawer={() => setNavDrawerOpen(true)} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar (Hidden on mobile) */}
        <Sidebar />

        {/* Viewport-Fitted Page Workspace */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden p-3 sm:p-4 pb-16 lg:pb-3 relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav onOpenDrawer={() => setNavDrawerOpen(true)} />

      {/* Mobile Full Offcanvas Navigation Drawer */}
      <MobileNavDrawer
        isOpen={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
      />

      {/* Cashier Screen Lock Modal */}
      <PinLockModal />
    </div>
  );
};
export default AppLayout;
