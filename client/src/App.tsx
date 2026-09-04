import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useCurrencyStore } from './store/useCurrencyStore';

// Layout (Loaded eagerly for instant structure)
import { AppLayout } from './components/layout/AppLayout';

// Route-based Code Splitting (Lazy Loaded Pages)
const PosPage = lazy(() => import('./pages/PosPage').then(m => ({ default: m.PosPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage').then(m => ({ default: m.PurchasesPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const TablesPage = lazy(() => import('./pages/TablesPage').then(m => ({ default: m.TablesPage })));
const OnlineOrdersPage = lazy(() => import('./pages/OnlineOrdersPage').then(m => ({ default: m.OnlineOrdersPage })));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const AccountingPage = lazy(() => import('./pages/AccountingPage').then(m => ({ default: m.AccountingPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const CustomerDisplayPage = lazy(() => import('./pages/CustomerDisplayPage').then(m => ({ default: m.CustomerDisplayPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));

// Ultra-fast Neumorphic Suspense Fallback Loader
const PageLoadingFallback: React.FC = () => (
  <div className="flex-1 w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-8">
    <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 shadow-neu-flat flex items-center justify-center mb-4 animate-pulse">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
      Loading 39POS...
    </div>
  </div>
);

// Protected route guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white font-bold gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-brand-500 border-t-transparent animate-spin" />
        <span className="text-sm tracking-wide">Authenticating 39POS Enterprise...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();
  const { fetchSettings, theme } = useSettingsStore();
  const { fetchCurrencies } = useCurrencyStore();

  useEffect(() => {
    checkAuth();
    fetchSettings();
    fetchCurrencies();

    // Theme setup
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/display" element={<CustomerDisplayPage />} />

          {/* Protected App Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="online-orders" element={<OnlineOrdersPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
