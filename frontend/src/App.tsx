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
const EODEntryPage = lazy(() => import('./features/eod/EODEntryPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));

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
                  <Route path="eod" element={<EODEntryPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
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

