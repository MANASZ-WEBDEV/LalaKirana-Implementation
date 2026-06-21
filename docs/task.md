# LalaKirana — Phase 1 Task Tracker

## Step 1 — Environment + Supabase + Migrations (~30 min)
- [x] Create Supabase project — get URL and service role key
- [x] Create `backend/.env` and `backend/.env.example`
- [x] Create `frontend/.env`
- [x] Run migrations 001 → 016
- [x] Verify: 14 tables, 8 categories, 1 admin user

## Step 2 — Backend Scaffold (TypeScript) (~60 min)
- [x] Initialize backend project with npm
- [x] Install all dependencies
- [x] Create tsconfig.json (strict mode)
- [x] Create types: express.d.ts, env.d.ts
- [x] Create db/supabase.ts
- [x] Create app.ts + server.ts
- [x] Create 4 route files with health endpoints
- [x] Create middleware stubs (rateLimiter, auth, role, validate)
- [x] Create Zod schemas
- [x] Create utils (priceAge, deviceHint, billNumber)
- [x] Verify: server starts, health endpoints work, tsc compiles clean

## Step 3 — Frontend Scaffold + All Shared Infrastructure (~90 min)
- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies (react-router-dom, zustand, axios, @tanstack/react-query)
- [x] Configure tsconfig path aliases + vite.config.ts
- [x] Create index.css with Minted Ledger design tokens
- [x] Create shared/api/axios.ts + queryClient.ts
- [x] Create shared/store/authStore.ts + toastStore.ts
- [x] Create shared/hooks (useDebounce, useOnlineStatus, useClickOutside)
- [x] Create shared/ui components (13 components)
- [x] Create shared/layout (AppLayout, Sidebar, Header)
- [x] Create App.tsx with router + providers
- [x] Create types/ directory
- [x] Verify: dev server starts, components render, tsc clean

## Step 4 — Feature: Auth (~90 min)
- [x] Backend: auth schemas, service, controller, routes
- [x] Backend: complete auth middleware
- [x] Frontend: auth.api.ts + auth.queries.ts
- [x] Frontend: LoginPage + ForgotPasswordModal
- [x] Backend tests: auth.test.ts
- [x] Verify: login flow, lockout, token revocation

## Step 5 — Feature: Dashboard (~60 min)
- [/] Backend: reports service + controller + routes
  - [/] `reports.service.ts` — getDashboardStats (4 parallel queries), getLowStockProducts, getRecentPriceChanges
  - [ ] `reports.controller.ts` — dashboard, low-stock, price-changes endpoints
  - [ ] Wire `reports.routes.ts` — GET /dashboard, GET /low-stock, GET /price-changes
- [ ] Frontend: dashboard API + queries + components + page
  - [ ] `dashboard.api.ts` — raw API functions
  - [ ] `dashboard.queries.ts` — useDashboardStats, useLowStockProducts, useRecentPriceChanges
  - [ ] `LowStockAlert.tsx` + CSS — low-stock product list with Adjust Stock button
  - [ ] `RecentPriceChanges.tsx` + CSS — table of recent price changes
  - [ ] `DashboardPage.tsx` + CSS — 4 StatCards + LowStockAlert + RecentPriceChanges + skeletons
- [ ] Seed 3 test products in Supabase for verification
- [ ] Verify: stats, skeletons, low-stock items

## Step 6 — Feature: Inventory — Product List (~90 min)
- [ ] Backend: product schemas, service, controller, routes
- [ ] Frontend: inventory queries + all components + page
- [ ] Backend tests: products.test.ts
- [ ] Verify: list, filters, search, badges

## Step 7 — Feature: Inventory — Add/Edit/Stock Adjust (~75 min)
- [ ] Frontend: ProductForm + ProductFormPage
- [ ] Frontend: StockAdjustDrawer
- [ ] Verify: add, edit price history, stock validation

## Step 8 — Feature: Pricing — Bulk Price Update (~60 min)
- [ ] Frontend: pricing queries + PriceRow + BulkPricePage
- [ ] Verify: bulk update, price_history, cache invalidation

## Step 9 — Feature: EOD Stock Entry (~60 min)
- [ ] Backend: inventory service (EOD)
- [ ] Frontend: eod queries + components + page
- [ ] Backend tests: inventory.test.ts
- [ ] Verify: EOD entry, stock reduction, UPSERT

## Step 10 — Feature: Settings (~75 min)
- [ ] Backend: user management routes
- [ ] Frontend: settings queries + all tabs + page
- [ ] Verify: staff creation, session kill, password change

## Step 11 — PWA + Offline (~60 min)
- [ ] Configure vite-plugin-pwa
- [ ] Manifest + offline banner
- [ ] Reconnect price sync
- [ ] Verify: PWA install, offline mode, price sync

## Step 12 — Polish + Accessibility + E2E (~75 min)
- [ ] Page transitions + reduced motion
- [ ] Responsive sidebar
- [ ] Accessibility audit (keyboard, aria, contrast)
- [ ] E2E tests (Playwright)
- [ ] Verify: keyboard nav, Lighthouse ≥ 90, E2E pass
