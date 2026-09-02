import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useCurrencyStore } from './store/useCurrencyStore';

// Layout & Pages
import { AppLayout } from './components/layout/AppLayout';
import { PosPage } from './pages/PosPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomersPage } from './pages/CustomersPage';
import { TablesPage } from './pages/TablesPage';
import { OnlineOrdersPage } from './pages/OnlineOrdersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { AccountingPage } from './pages/AccountingPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { CustomerDisplayPage } from './pages/CustomerDisplayPage';
import { LoginPage } from './pages/LoginPage';

// Protected route guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white font-bold">
        Loading 39POS Enterprise...
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
    </BrowserRouter>
  );
};
export default App;
