import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './shared/api/queryClient';
import { useAuthStore } from './shared/store/authStore';
import { AppLayout } from './shared/layout/AppLayout';
import { Toast } from './shared/ui/Toast';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import { Skeleton } from './shared/ui/Skeleton';
import { OfflineBanner } from './shared/ui/OfflineBanner';
import { usePriceSync } from './shared/hooks/usePriceSync';

// Lazy load pages
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage'));
const ProductFormPage = lazy(() => import('./features/inventory/ProductFormPage'));
const BulkPricePage = lazy(() => import('./features/pricing/BulkPricePage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const AllProductsAnalyticsPage = lazy(() => import('./features/analytics/AllProductsAnalyticsPage'));
const ProductAnalyticsPage = lazy(() => import('./features/analytics/ProductAnalyticsPage'));
const StaffDiscountAuditPage = lazy(() => import('./features/analytics/StaffDiscountAuditPage'));
const EODEntryPage = lazy(() => import('./features/eod/EODEntryPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const BillingPage = lazy(() => import('./features/billing/BillingPage'));
const KhataPage = lazy(() => import('./features/khata/KhataPage'));
const CustomerProfile = lazy(() => import('./features/khata/CustomerProfile'));
const PurchasesPage = lazy(() => import('./features/purchases/PurchasesPage'));
const NewPurchaseForm = lazy(() => import('./features/purchases/NewPurchaseForm'));
const NotFoundPage = lazy(() => import('./features/error/NotFoundPage'));
const MasterPage = lazy(() => import('./features/master/MasterPage'));

// Protected Route Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Public Route Guard (Redirect logged-in users away from Login)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// Master Route Guard
function MasterRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'master' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// Suspense Fallback
function PageLoader() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton height={40} width="40%" />
      <Skeleton height={200} />
    </div>
  );
}

// Price sync wrapper — must be inside QueryClientProvider
function PriceSyncProvider({ children }: { children: React.ReactNode }) {
  usePriceSync();
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PriceSyncProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />

                {/* Protected App Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/new" element={<ProductFormPage />} />
                  <Route path="inventory/:id/edit" element={<ProductFormPage />} />
                  <Route path="pricing" element={<BulkPricePage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="analytics/products" element={<AllProductsAnalyticsPage />} />
                  <Route path="analytics/product/:productId" element={<ProductAnalyticsPage />} />
                  <Route path="analytics/staff-discounts" element={<StaffDiscountAuditPage />} />
                  <Route path="eod" element={<EODEntryPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="khata" element={<KhataPage />} />
                  <Route path="khata/:id" element={<CustomerProfile />} />
                  <Route path="purchases" element={<PurchasesPage />} />
                  <Route path="purchases/new" element={<NewPurchaseForm />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route
                    path="master"
                    element={
                      <MasterRoute>
                        <MasterPage />
                      </MasterRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <Toast />
            <OfflineBanner />
          </BrowserRouter>
        </PriceSyncProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

