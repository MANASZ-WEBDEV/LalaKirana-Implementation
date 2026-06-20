# LalaKirana — Implementation Plan v3.1

Build a complete retail inventory management system (Phase 1) using **feature-based architecture**, **TypeScript**, **React Query**, and the **Minted Ledger** design system.

> [!IMPORTANT]
> This plan merges the v3.0 feature-based architecture with three 2026 best-practice improvements:
> **TypeScript** (compile-time safety), **React Query** (server-state management), and **Scoped Testing** (backend integration + E2E).

## Project Summary

**LalaKirana** is a web-based retail management system for a family general store.

**Phase 1 covers:**
- **Login & Auth** — JWT with rate limiting, account lockout, OTP password reset, session management
- **Dashboard** — Stat cards, low-stock alerts, recent price changes
- **Inventory** — Product CRUD, category filters, search, stock status badges
- **Bulk Price Update** — Morning batch price updates with atomic saves
- **EOD Stock Entry** — End-of-day diary batch stock deduction
- **Stock Adjustment** — Side drawer for manual stock corrections
- **Settings** — Staff management, session management, categories (Owner only)
- **PWA** — Offline support, reconnect price sync

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | React + Vite | 19.x / 6.x | TypeScript template |
| Language | **TypeScript** | 5.x | Strict mode, Zod inference |
| CSS | **CSS Modules** (.module.css) | — | Scoped per component |
| Routing | React Router | 6.x | Lazy imports per feature |
| Server State | **TanStack React Query** | 5.x | Replaces manual caching |
| Client State | Zustand | 5.x | Auth, toast, UI toggles only |
| HTTP Client | Axios | 1.x | JWT interceptors |
| Backend | Node.js + Express | 22.x / 5.x | TypeScript with tsx runner |
| Auth | JWT + bcrypt | 9.x / 5.x | JTI-based revocation |
| Rate Limiting | express-rate-limit | 7.x | Login brute-force protection |
| Validation | Zod | 3.x | Shared types via `z.infer<>` |
| Email | Nodemailer | 6.x | Gmail SMTP for OTP |
| Database | PostgreSQL via Supabase | 16.x | 16 migrations, RLS |
| DB Client | Supabase JS Client | 2.x | Service role key |
| Testing | **Vitest + Playwright** | — | Backend integration + E2E |
| PWA | vite-plugin-pwa | 0.20.x | Workbox, offline cache |

> [!NOTE]
> **TypeScript on backend**: We use `tsx` (TypeScript Execute) as the dev runner instead of `nodemon` + `tsc`. This gives instant TypeScript execution with no build step during development. For production, we compile with `tsc` to JavaScript.

---

## Design System — Minted Ledger (Ice Latte + Mint)

| Token | CSS Custom Property | Hex | Role |
|-------|-------------------|-----|------|
| Primary (The Mint) | `--color-primary` | `#006763` | Primary CTAs, active nav, brand |
| Primary Container | `--color-primary-container` | `#00837e` | Elevated primary surfaces |
| Surface (Ice Latte) | `--color-surface` | `#f6fafd` | Main page background |
| Surface Container | `--color-surface-container` | `#eaeef2` | Cards, containers |
| On Surface | `--color-on-surface` | `#171c1f` | Body text, headings |
| On Surface Variant | `--color-on-surface-variant` | `#3d4948` | Secondary text |
| Outline | `--color-outline` | `#6d7a78` | Borders, dividers |
| Outline Variant | `--color-outline-variant` | `#bcc9c7` | Subtle borders |
| Secondary | `--color-secondary` | `#625e56` | Secondary actions |
| Error | `--color-error` | `#ba1a1a` | Error states |
| Surface Dim | `--color-surface-dim` | `#d6dbde` | Disabled states, skeletons |

**Typography**: Playfair Display (headlines) + DM Sans (body/UI) + DM Mono (prices/numbers)

---

## Architecture: Feature-Based + React Query

### Why Feature-Based

| Component-Type (v2) | Feature-Based (v3.1) |
|---------------------|---------------------|
| `src/pages/InventoryPage.tsx` | `src/features/inventory/InventoryPage.tsx` |
| `src/api/products.api.ts` | `src/features/inventory/inventory.queries.ts` |
| `src/store/productStore.ts` | React Query cache (no store needed) |
| `src/components/forms/ProductForm.tsx` | `src/features/inventory/ProductForm.tsx` |
| **5 folders open per feature** | **1 folder open per feature** |

### Why React Query Replaces Manual Zustand Caching

The v3.0 plan had `inventoryStore.ts` with manual `products[]`, `lastFetched`, `invalidateCache()`, `updateProductInCache()`. React Query replaces all of this:

| Manual Store (v3.0) | React Query (v3.1) |
|---------------------|-------------------|
| `inventoryStore.products[]` | `useProducts()` → auto-cached |
| `inventoryStore.lastFetched` | Built-in `staleTime` / `gcTime` |
| `inventoryStore.invalidateCache()` | `queryClient.invalidateQueries(['products'])` |
| `inventoryStore.updateProductInCache()` | `queryClient.setQueryData()` for optimistic updates |
| Manual loading booleans | `{ data, isLoading, error }` from every hook |
| No automatic refetch | Auto-refetch on window focus, reconnect, interval |

**Zustand stays for client-only state**: `authStore` (user, token) and `toastStore` (toast queue). These are not server data.

### The Feature-Based Rules

> [!IMPORTANT]
> Memorise these — they govern every file placement decision.

- A file belongs to a feature if **only that feature uses it** — it lives inside that feature's folder
- A file moves to `shared/` the moment **a second feature needs it** — not before
- `shared/` contains: UI primitives (Button, Input, Toast), layout (Sidebar, Header), cross-feature hooks, client stores
- Features **never import from each other** — they only import from `shared/`
- Adding Phase 2 (billing) means adding `features/billing/` — nothing else changes
- Deleting a feature means deleting one folder — no hunting across the codebase

**Exceptions (documented):**
- `pricing/` and `eod/` read product data via React Query's shared cache (same `['products']` query key) — no cross-feature import needed
- `dashboard/` imports `StockAdjustDrawer` from `features/inventory/` — acceptable, dashboard only renders it

---

## Complete Folder Structure

### Frontend — Feature-Based with TypeScript

```
frontend/
├── package.json
├── tsconfig.json              ← strict: true, paths aliases
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── .env
├── public/
│   ├── favicon.svg
│   └── manifest.json          ← PWA manifest
├── e2e/                       ← Playwright E2E tests
│   ├── playwright.config.ts
│   ├── auth.spec.ts
│   ├── inventory.spec.ts
│   └── pricing.spec.ts
└── src/
    ├── main.tsx
    ├── App.tsx                 ← router, auth guard, lazy imports, page transitions
    ├── index.css               ← ONLY: CSS tokens, @imports, base reset
    ├── types/                  ← shared TypeScript types (inferred from Zod)
    │   ├── auth.types.ts       ← z.infer<typeof LoginSchema>, User, Session
    │   ├── product.types.ts    ← z.infer<typeof ProductSchema>, Category, PriceHistory
    │   └── inventory.types.ts  ← z.infer<typeof StockAdjustSchema>, EODEntry
    │
    ├── shared/                 ← used by 2+ features
    │   ├── ui/                 ← primitive components, no business logic
    │   │   ├── Button.tsx + Button.module.css
    │   │   ├── Input.tsx + Input.module.css
    │   │   ├── Select.tsx + Select.module.css
    │   │   ├── Badge.tsx + Badge.module.css
    │   │   ├── Modal.tsx + Modal.module.css
    │   │   ├── Drawer.tsx + Drawer.module.css
    │   │   ├── Toast.tsx + Toast.module.css
    │   │   ├── Skeleton.tsx + Skeleton.module.css
    │   │   ├── StatCard.tsx + StatCard.module.css
    │   │   ├── DataTable.tsx + DataTable.module.css
    │   │   ├── ConfirmDialog.tsx + ConfirmDialog.module.css
    │   │   ├── EmptyState.tsx + EmptyState.module.css
    │   │   └── ErrorBoundary.tsx
    │   ├── layout/
    │   │   ├── AppLayout.tsx + AppLayout.module.css
    │   │   ├── Sidebar.tsx + Sidebar.module.css
    │   │   └── Header.tsx + Header.module.css
    │   ├── hooks/
    │   │   ├── useDebounce.ts
    │   │   ├── useOnlineStatus.ts
    │   │   └── useClickOutside.ts
    │   ├── store/              ← CLIENT state only (not server data)
    │   │   ├── authStore.ts    ← user, token, login(), logout()
    │   │   └── toastStore.ts   ← toast queue, addToast(), removeToast()
    │   └── api/
    │       ├── axios.ts        ← Axios instance + JWT interceptor + 401 handler
    │       └── queryClient.ts  ← React Query client config (staleTime, gcTime, retry)
    │
    └── features/
        ├── auth/
        │   ├── LoginPage.tsx + LoginPage.module.css
        │   ├── ForgotPasswordModal.tsx + ForgotPasswordModal.module.css
        │   ├── auth.api.ts         ← raw API functions (login, logout, forgotPassword)
        │   ├── auth.queries.ts     ← useLogin(), useLogout(), useSessions() React Query hooks
        │   └── auth.helpers.ts     ← token storage, auth guard logic
        │
        ├── dashboard/
        │   ├── DashboardPage.tsx + DashboardPage.module.css
        │   ├── LowStockAlert.tsx + LowStockAlert.module.css
        │   ├── RecentPriceChanges.tsx + RecentPriceChanges.module.css
        │   └── dashboard.queries.ts ← useDashboardStats(), useLowStock(), useRecentPriceChanges()
        │
        ├── inventory/
        │   ├── InventoryPage.tsx + InventoryPage.module.css
        │   ├── ProductFormPage.tsx + ProductFormPage.module.css    ← add AND edit
        │   ├── ProductForm.tsx + ProductForm.module.css
        │   ├── StockAdjustDrawer.tsx + StockAdjustDrawer.module.css
        │   ├── PriceAgeBadge.tsx + PriceAgeBadge.module.css
        │   ├── CategoryTabs.tsx + CategoryTabs.module.css
        │   ├── ProductActionMenu.tsx + ProductActionMenu.module.css
        │   ├── PriceHistoryModal.tsx + PriceHistoryModal.module.css
        │   ├── inventory.api.ts     ← raw API functions
        │   └── inventory.queries.ts ← useProducts(), useCategories(), useCreateProduct(),
        │                               useUpdateProduct(), useAdjustStock(), etc.
        │
        ├── pricing/
        │   ├── BulkPricePage.tsx + BulkPricePage.module.css
        │   ├── PriceRow.tsx + PriceRow.module.css
        │   ├── pricing.api.ts
        │   └── pricing.queries.ts   ← useBulkUpdatePrices() — invalidates ['products'] on success
        │
        ├── eod/
        │   ├── EODEntryPage.tsx + EODEntryPage.module.css
        │   ├── EODProductRow.tsx + EODProductRow.module.css
        │   ├── eod.api.ts
        │   └── eod.queries.ts       ← useSubmitEOD() — invalidates ['products'] on success
        │
        └── settings/
            ├── SettingsPage.tsx + SettingsPage.module.css
            ├── StaffTab.tsx + StaffTab.module.css
            ├── SessionsTab.tsx + SessionsTab.module.css
            ├── CategoriesTab.tsx + CategoriesTab.module.css
            ├── AccountTab.tsx + AccountTab.module.css
            ├── settings.api.ts
            └── settings.queries.ts   ← useUsers(), useCreateUser(), useSessions()
```

### React Query Pattern — Every Feature Follows This

Each feature has two files for server communication:

```typescript
// inventory.api.ts — Raw API functions (pure, no React)
import { api } from '@/shared/api/axios';
import type { Product, CreateProductInput } from '@/types/product.types';

export const productsApi = {
  getAll: (params?: ProductFilters) =>
    api.get<Product[]>('/products', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get<Product>(`/products/${id}`).then(r => r.data),
  create: (data: CreateProductInput) =>
    api.post<Product>('/products', data).then(r => r.data),
  // ...
};
```

```typescript
// inventory.queries.ts — React Query hooks (used in components)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from './inventory.api';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export function useProducts(params?: ProductFilters) {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => productsApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
```

> [!TIP]
> **Cross-feature cache sharing**: `pricing/` and `eod/` read product data using the same `['products']` query key. When pricing updates prices, it calls `queryClient.invalidateQueries({ queryKey: ['products'] })` — all features automatically get fresh data. No cross-feature imports needed.

---

### Backend — TypeScript with Feature-Grouped Controllers

```
backend/
├── package.json
├── tsconfig.json               ← strict: true, outDir: dist/
├── .env
├── .env.example
├── src/
│   ├── app.ts                  ← Express, CORS, middleware chain, route mounting
│   ├── server.ts               ← HTTP listen, graceful shutdown
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── products.routes.ts
│   │   ├── inventory.routes.ts
│   │   └── reports.routes.ts
│   │
│   ├── controllers/            ← req/res only, calls service for logic
│   │   ├── auth.controller.ts
│   │   ├── products.controller.ts
│   │   ├── inventory.controller.ts
│   │   └── reports.controller.ts
│   │
│   ├── services/               ← all business logic, calls Supabase client
│   │   ├── auth.service.ts     ← JWT, bcrypt, OTP, token blocklist, sessions
│   │   ├── products.service.ts ← CRUD, bulk price (atomic), price history
│   │   ├── inventory.service.ts← EOD entry, stock adjust, audit
│   │   └── email.service.ts    ← Nodemailer OTP delivery
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts   ← JWT verify + blocklist check + session last_seen
│   │   ├── role.middleware.ts   ← requireOwner()
│   │   ├── rateLimiter.ts      ← 5 attempts / 15 min / IP on /auth/login
│   │   └── validate.middleware.ts ← Zod parse body/query, return 400 on fail
│   │
│   ├── schemas/                ← Zod schemas (shared types via z.infer<>)
│   │   ├── auth.schema.ts
│   │   ├── product.schema.ts
│   │   └── inventory.schema.ts
│   │
│   ├── db/
│   │   └── supabase.ts         ← createClient with SERVICE_ROLE_KEY, typed
│   │
│   ├── utils/
│   │   ├── billNumber.ts       ← LK-YYYY-NNNNN generator
│   │   ├── priceAge.ts         ← 'fresh' | 'warn' | 'stale' classification
│   │   └── deviceHint.ts       ← User-Agent parser for sessions table
│   │
│   └── types/
│       ├── express.d.ts        ← extends Express Request with user property
│       └── env.d.ts            ← typed process.env
│
└── tests/                      ← Backend integration tests
    ├── setup.ts                ← test Supabase client, seed helpers
    ├── auth.test.ts            ← login, lockout, token revocation, OTP
    ├── products.test.ts        ← CRUD, bulk price, price history
    └── inventory.test.ts       ← EOD entry, stock adjust
```

### TypeScript Type Flow — Define Once, Use Everywhere

```
Zod Schema (backend/src/schemas/product.schema.ts)
    │
    ├── z.infer<> → Backend types (used in services, controllers)
    │
    └── Copied to frontend/src/types/product.types.ts
        │
        ├── Used in API functions (inventory.api.ts)
        ├── Used in React Query hooks (inventory.queries.ts)
        └── Used in component props (ProductForm.tsx)
```

> [!NOTE]
> In Phase 1 we manually copy the Zod schemas to the frontend `types/` folder. In a future iteration, these could be extracted to a shared npm package. For now, the manual copy is simpler and avoids monorepo complexity.

---

## Feature Ownership Map

Every file maps to exactly one owner.

| File / Concern | Lives In | Reason |
|---------------|----------|--------|
| Login form, OTP modal | `features/auth/` | Only auth uses it |
| JWT storage, auth guard | `features/auth/auth.helpers.ts` | Only auth uses it |
| Axios instance + interceptor | `shared/api/axios.ts` | Every feature makes API calls |
| React Query client | `shared/api/queryClient.ts` | Every feature uses queries |
| authStore (user, token) | `shared/store/authStore.ts` | Every feature reads auth state |
| toastStore (toast queue) | `shared/store/toastStore.ts` | Every feature triggers toasts |
| Toast component | `shared/ui/Toast.tsx` | Every feature displays toasts |
| Button, Input, Badge | `shared/ui/` | Used across all features |
| Drawer component | `shared/ui/Drawer.tsx` | inventory + future billing |
| Dashboard stat cards | `features/dashboard/` | Only dashboard uses them |
| LowStockAlert list | `features/dashboard/LowStockAlert.tsx` | Only dashboard uses it |
| Product list, filters | `features/inventory/InventoryPage.tsx` | Only inventory uses it |
| ProductForm (add + edit) | `features/inventory/ProductForm.tsx` | Only inventory uses it |
| StockAdjustDrawer | `features/inventory/StockAdjustDrawer.tsx` | Only inventory uses it |
| PriceAgeBadge | `features/inventory/PriceAgeBadge.tsx` | Only inventory uses it |
| Product cache (server state) | **React Query `['products']` key** | Shared via query key, not imports |
| Bulk price update table | `features/pricing/BulkPricePage.tsx` | Only pricing uses it |
| EOD diary entry form | `features/eod/EODEntryPage.tsx` | Only eod uses it |
| Staff / session management | `features/settings/` | Only settings uses it |
| DataTable | `shared/ui/DataTable.tsx` | inventory + settings + future billing |
| Sidebar, Header, AppLayout | `shared/layout/` | Every page uses them |
| useDebounce, useOnlineStatus | `shared/hooks/` | Used by inventory search + PWA |

---

## Import Rules Between Features

### Allowed

| Import | Example | Why |
|--------|---------|-----|
| feature → `shared/ui` | inventory imports Button, DataTable | Shared UI for all |
| feature → `shared/store` | dashboard imports authStore | Auth state is global |
| feature → `shared/hooks` | inventory imports useDebounce | Generic hooks |
| feature → `shared/layout` | pages use AppLayout | Layout wraps all pages |
| feature → `shared/api/axios` | all feature `.api.ts` files | Shared Axios config |
| feature → `@tanstack/react-query` | all feature `.queries.ts` files | React Query hooks |
| feature → `src/types/` | all features import types | Shared type definitions |
| dashboard → StockAdjustDrawer | dashboard renders it from `features/inventory/` | Acceptable — only renders |

### Never Do These

> [!CAUTION]
> - **NEVER**: features importing each other's `.api.ts` files
> - **NEVER**: two features writing to the same Zustand store
> - **NEVER**: putting a component in `shared/` before a second feature needs it
> - **NEVER**: business logic in `shared/ui` components — Button should never know what a product is
> - **NEVER**: importing from a sibling page — communicate via router or React Query cache

---

## Build Steps — 12 Vertical Slices

Each step ends with a working, testable app. Pass all verify points before moving to the next step.

### Build Rules

- Step 1 is environment only — nothing starts until Supabase is connected and all 16 migrations confirmed
- Step 3 builds ALL shared infrastructure before any feature
- Steps 4–11 are vertical slices — backend + frontend built and tested together per feature
- Never start a step if the previous step's verify checklist has any unchecked item
- If a component is only used by one feature, it stays in that feature folder

---

### Step 1 — Environment + Supabase + Migrations (~30 min)

- [ ] Create Supabase project — copy URL and service role key
- [ ] Create `backend/.env` with: PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET (64+ random chars), JWT_EXPIRY=8h, FRONTEND_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- [ ] Create `frontend/.env` with: VITE_API_BASE_URL=http://localhost:5000/api/v1
- [ ] Run migrations 001 → 016 in exact numeric order
- [ ] Before 016: generate bcrypt hash — `node -e "require('bcrypt').hash('changeme123',12).then(console.log)"`

**Verify:**
1. ☐ Supabase Table Editor shows all 14 tables (users, categories, products, stock_log, customers, bills, bill_items, khata_entries, wallet_entries, price_history, eod_entries, token_blocklist, sessions, otp_requests)
2. ☐ `categories` table has exactly 8 rows
3. ☐ `users` table has 1 row — `owner@lalakirana.in` with `role='owner'`

---

### Step 2 — Backend Scaffold (TypeScript) (~60 min)

- [ ] `mkdir backend && cd backend && npm init -y`
- [ ] Install deps: `express @supabase/supabase-js jsonwebtoken bcrypt zod express-rate-limit cors dotenv nodemailer uuid`
- [ ] Install dev deps: `typescript tsx @types/node @types/express @types/jsonwebtoken @types/bcrypt @types/cors @types/uuid vitest`
- [ ] Create `tsconfig.json` — `strict: true`, `outDir: "dist"`, `rootDir: "src"`, `module: "NodeNext"`
- [ ] Add scripts: `"dev": "tsx watch src/server.ts"`, `"build": "tsc"`, `"test": "vitest run"`
- [ ] Create `src/types/express.d.ts` — extend Request with `user: { id, role, email }`
- [ ] Create `src/types/env.d.ts` — typed `process.env` with all env vars
- [ ] Create `src/db/supabase.ts` — typed Supabase client with SERVICE_ROLE_KEY
- [ ] Create `src/app.ts` — Express, cors({ origin: FRONTEND_URL }), express.json(), mount route stubs, global error handler
- [ ] Create `src/server.ts` — app.listen(PORT), graceful SIGTERM
- [ ] Create 4 route files with `GET /health` returning `{ status: 'ok' }`
- [ ] Mount: `/api/v1/auth`, `/api/v1/products`, `/api/v1/inventory`, `/api/v1/reports`
- [ ] Create `src/middleware/rateLimiter.ts` — 5 req / 15 min on login
- [ ] Create `src/middleware/auth.middleware.ts` — stub (full logic in Step 4)
- [ ] Create `src/middleware/role.middleware.ts` — stub `requireOwner()`
- [ ] Create `src/middleware/validate.middleware.ts` — Zod parse wrapper → 400 on fail
- [ ] Create `src/schemas/` — Zod schemas with exported `z.infer<>` types
- [ ] Create `src/utils/priceAge.ts` — returns `'fresh' | 'warn' | 'stale'`
- [ ] Create `src/utils/deviceHint.ts` — parse User-Agent header
- [ ] Create `src/utils/billNumber.ts` — LK-YYYY-NNNNN generator

**Verify:**
1. ☐ `npm run dev` starts without errors, logs `LalaKirana API running on port 5000`
2. ☐ `GET http://localhost:5000/api/v1/auth/health` → `{ status: 'ok' }`
3. ☐ `npx tsc --noEmit` compiles with zero errors

---

### Step 3 — Frontend Scaffold + All Shared Infrastructure (~90 min)

- [ ] `npm create vite@latest frontend -- --template react-ts && cd frontend`
- [ ] Install: `react-router-dom zustand axios @tanstack/react-query`
- [ ] Configure `tsconfig.json` path aliases: `@/shared/*`, `@/features/*`, `@/types/*`
- [ ] Update `vite.config.ts` with path alias resolution
- [ ] Replace `src/index.css` entirely: Google Fonts @import (Playfair Display + DM Sans + DM Mono), all 11 CSS custom property tokens, base reset (margin:0, box-sizing:border-box), body font defaults

**Shared API + State:**
- [ ] `shared/api/axios.ts` — Axios instance, baseURL from env, request interceptor adds Bearer token from authStore, response interceptor auto-calls logout() on 401
- [ ] `shared/api/queryClient.ts` — QueryClient config: `staleTime: 5min`, `retry: 1`, `refetchOnWindowFocus: true`
- [ ] `shared/store/authStore.ts` — Zustand: `{ user, token, isAuthenticated, login(user,token), logout() }` — token persisted to localStorage
- [ ] `shared/store/toastStore.ts` — Zustand: `{ toasts[], addToast(type,message), removeToast(id) }` — auto-generated id + timestamp

**Shared Hooks:**
- [ ] `useDebounce.ts` — debounce any value by N ms
- [ ] `useOnlineStatus.ts` — listens to `navigator.onLine`, returns boolean
- [ ] `useClickOutside.ts` — ref + callback for closing dropdowns/menus

**Shared UI — build in this order:**
- [ ] `ErrorBoundary.tsx` — catches React render errors, friendly message + retry button
- [ ] `Toast.tsx + Toast.module.css` — fixed bottom-right, slide-in 250ms, 4 variants (success/warn/error/info), left accent bar, auto-dismiss 4s, manual close X
- [ ] `Skeleton.tsx + Skeleton.module.css` — animated shimmer using `--color-surface-dim`, accepts width/height/borderRadius props
- [ ] `Button.tsx + Button.module.css` — primary/secondary/ghost/danger; size sm/md/lg; loading spinner; disabled state
- [ ] `Input.tsx + Input.module.css` — label, value, onChange, error, helperText, focus ring in `--color-primary`
- [ ] `Select.tsx + Select.module.css` — same visual language as Input, options array prop
- [ ] `Badge.tsx + Badge.module.css` — success/warning/error/info/neutral variants
- [ ] `Modal.tsx + Modal.module.css` — backdrop blur, Escape closes, focus trap, slide-down animation
- [ ] `Drawer.tsx + Drawer.module.css` — slides from right 250ms, focus trap, Escape/backdrop closes, generic children slot
- [ ] `ConfirmDialog.tsx + ConfirmDialog.module.css` — wraps Modal, title + body + Cancel + Confirm (danger) buttons
- [ ] `StatCard.tsx + StatCard.module.css` — label (uppercase DM Sans), large number (DM Mono), delta line, Mint bottom accent rule
- [ ] `DataTable.tsx + DataTable.module.css` — columns config array, rows data, hover states, action slot per row, empty state slot
- [ ] `EmptyState.tsx + EmptyState.module.css` — icon + heading + subtext + optional CTA button

**Shared Layout:**
- [ ] `AppLayout.tsx + AppLayout.module.css` — CSS grid: 240px sidebar + flex-1 main
- [ ] `Sidebar.tsx + Sidebar.module.css` — nav items (icon + label), active state (3px `--color-primary` left border + `--color-primary-container` bg), LalaKirana logo top, logout bottom; placeholder slots for Phase 2 (Billing, Khata with "coming soon" tooltip)
- [ ] `Header.tsx + Header.module.css` — page title (Playfair Display 24px) + right-side actions slot

**App.tsx:**
- [ ] Wrap in `QueryClientProvider` from `@tanstack/react-query`
- [ ] React Router: `/` → `/dashboard`, `/login` public, all others in `ProtectedRoute` checking `authStore.isAuthenticated`
- [ ] Lazy-import all feature pages
- [ ] Wrap in `ErrorBoundary`
- [ ] Mount `Toast` at root level (reads from toastStore)

**Types:**
- [ ] `types/auth.types.ts` — User, Session, LoginInput, LoginResponse
- [ ] `types/product.types.ts` — Product, Category, CreateProductInput, UpdateProductInput, PriceHistoryEntry, ProductFilters
- [ ] `types/inventory.types.ts` — StockAdjustInput, EODEntry, EODSubmitInput, StockLogEntry

**Verify:**
1. ☐ `npm run dev` starts on port 5173 — blank page with no console errors
2. ☐ All `shared/ui` components render without errors (test by temporarily importing in App.tsx)
3. ☐ `npx tsc --noEmit` — zero TypeScript errors

---

### Step 4 — Feature: Auth — Login, Sessions, Password Reset (~90 min)

**Backend:**
- [ ] `schemas/auth.schema.ts` — Zod: LoginSchema (email+password), ForgotPasswordSchema, ResetPasswordSchema, ChangePasswordSchema
- [ ] `services/auth.service.ts`: `generateToken(user, deviceHint, ip)` → inserts sessions row + returns JWT with jti; `revokeToken(jti)` → inserts token_blocklist + deletes session; `verifyOTP(email, otp)`; `sendOTPEmail(email, otp)` via Nodemailer
- [ ] `controllers/auth.controller.ts`: login (rate limit → lockout check → bcrypt → generateToken), logout (revokeToken), me (return req.user), forgotPassword (6-digit OTP → hash → insert otp_requests → sendOTPEmail), resetPassword (verifyOTP → update password → revoke all sessions), changePassword (verify current → update → revoke all sessions)
- [ ] Wire `auth.routes.ts`: POST `/login` (rateLimiter), POST `/logout` (auth), GET `/me` (auth), POST `/forgot-password`, POST `/reset-password`, PUT `/change-password` (auth), GET `/sessions` (auth), DELETE `/sessions/:id` (auth)
- [ ] Complete `auth.middleware.ts`: jwt.verify → check token_blocklist → update sessions.last_seen → attach req.user

**Frontend:**
- [ ] `features/auth/auth.api.ts` — login, logout, getMe, forgotPassword, resetPassword, changePassword, getSessions, deleteSession
- [ ] `features/auth/auth.queries.ts` — `useLogin()`, `useLogout()`, `useMe()`, `useSessions()`, `useDeleteSession()` — all with proper TypeScript generics
- [ ] `features/auth/auth.helpers.ts` — getStoredToken(), setStoredToken(), clearStoredToken(), isTokenExpired()
- [ ] `LoginPage.tsx + LoginPage.module.css` — left panel Mint (#006763, 40% width), right panel Ice Latte (#F6FAFD) with login card
- [ ] Form: email Input + password Input + "Sign in" Button (primary, full width)
- [ ] Client-side Zod validation before API call — inline errors per field
- [ ] On success: `authStore.login(user, token)` → navigate to `/dashboard`
- [ ] On error: `addToast('error', message)` — never show raw API error
- [ ] `ForgotPasswordModal.tsx + ForgotPasswordModal.module.css` — step 1: email, step 2: OTP + new password, step 3: success
- [ ] Update ProtectedRoute: if !isAuthenticated → `/login`, if isAuthenticated on `/login` → `/dashboard`

**Backend Tests:**
- [ ] `tests/auth.test.ts` — login success, wrong password, 5x lockout, token revocation on logout, expired token rejection

**Verify:**
1. ☐ Login with `owner@lalakirana.in` + correct password → JWT in localStorage → `/dashboard`
2. ☐ Wrong password 5x → `users.locked_until` set, lockout message shown
3. ☐ Logout → token in `token_blocklist` → old token returns 401

---

### Step 5 — Feature: Dashboard (~60 min)

**Backend:**
- [ ] `services/reports.service.ts` — `getDashboardStats()`: 4 parallel Supabase queries (total active products, low stock count, out of stock count, inventory value sum)
- [ ] `controllers/reports.controller.ts` — dashboard endpoint returns all stats
- [ ] Wire `reports.routes.ts`: GET `/reports/dashboard` (auth), GET `/products/low-stock` (auth), GET `/price-history?limit=` (auth)

**Frontend:**
- [ ] `features/dashboard/dashboard.queries.ts` — `useDashboardStats()`, `useLowStockProducts()`, `useRecentPriceChanges(limit)`
- [ ] `LowStockAlert.tsx + LowStockAlert.module.css` — products below threshold, qty in red, [Adjust Stock] per row (opens StockAdjustDrawer from features/inventory/)
- [ ] `RecentPriceChanges.tsx + RecentPriceChanges.module.css` — table: product name, old → new price, who, when
- [ ] `DashboardPage.tsx + DashboardPage.module.css` — 4 StatCards grid (Total Products, Low Stock, Out of Stock, Inventory Value) + LowStockAlert + RecentPriceChanges
- [ ] All sections use `Skeleton` while `isLoading` from React Query — StatCard shows shimmer placeholder
- [ ] [Bulk Price Update] shortcut button in Header actions → navigates to `/pricing`

**Verify:**
1. ☐ Dashboard shows real counts from Supabase (add 3 test products first)
2. ☐ Skeleton loaders appear for ~300ms before data fills in
3. ☐ [Adjust Stock] on low-stock item opens the drawer

---

### Step 6 — Feature: Inventory — Product List (~90 min)

**Backend:**
- [ ] `schemas/product.schema.ts` — Zod: CreateProductSchema, UpdateProductSchema, BulkPriceSchema, StockAdjustSchema — all with exported `z.infer<>` types
- [ ] `services/products.service.ts` — getAllProducts(filters), getProductById(id), createProduct(data), updateProduct(id, data) [triggers price_history via DB trigger], softDeleteProduct(id), bulkUpdatePrices(items) [atomic]
- [ ] `controllers/products.controller.ts` — wire all endpoints
- [ ] Wire `products.routes.ts`: GET `/products`, GET `/products/low-stock`, GET `/products/prices`, GET `/products/:id`, GET `/products/:id/price-history`, POST `/products`, PUT `/products/:id`, DELETE `/products/:id` (owner), POST `/products/bulk-price`, GET `/categories`, POST `/categories` (owner)

**Frontend:**
- [ ] `inventory.api.ts` — getProducts, getCategories, createProduct, updateProduct, softDeleteProduct, adjustStock, getStockLog, getPriceHistory
- [ ] `inventory.queries.ts` — `useProducts()`, `useCategories()`, `useCreateProduct()`, `useUpdateProduct()`, `useAdjustStock()`, `usePriceHistory()` — all with query key factory
- [ ] `PriceAgeBadge.tsx + PriceAgeBadge.module.css` — <12h: no badge, 12-24h: yellow "⏱ Xh ago", >24h: pulsing red "⚠ Price outdated"
- [ ] `CategoryTabs.tsx + CategoryTabs.module.css` — horizontal scrollable, active tab `--color-primary` underline, "All" first
- [ ] `ProductActionMenu.tsx + ProductActionMenu.module.css` — ··· button, dropdown: Edit, Adjust Stock, View Price History, Deactivate
- [ ] `PriceHistoryModal.tsx + PriceHistoryModal.module.css` — wraps Modal, table of price changes for one product
- [ ] `InventoryPage.tsx + InventoryPage.module.css` — CategoryTabs + search Input (useDebounce 300ms) + DataTable + [+ Add Product] in header
- [ ] DataTable columns: Category, Product Name, Price (DM Mono) + PriceAgeBadge, Stock Qty (DM Mono), Status Badge, Actions
- [ ] Client-side filtering on category/search — no extra API call
- [ ] Deactivate: ConfirmDialog → `useSoftDelete()` mutation → invalidateQueries → success toast
- [ ] Empty state: EmptyState when no products or no search results

**Backend Tests:**
- [ ] `tests/products.test.ts` — create product, update price (verify price_history), soft delete, bulk price (atomic + skip unchanged)

**Verify:**
1. ☐ Products list renders with category tabs — clicking tab filters correctly
2. ☐ Search filters in real time with 300ms debounce — no extra network request
3. ☐ PriceAgeBadge shows yellow for product with `price_updated_at` set to 13h ago

---

### Step 7 — Feature: Inventory — Add / Edit / Stock Adjust (~75 min)

**Frontend:**
- [ ] `ProductForm.tsx + ProductForm.module.css` — controlled form: name (Input), category (Select from `useCategories()`), price ₹ (Input type=number), stock_qty (Input), unit (Select: pcs/kg/g/litre/ml), low_stock_threshold (Input) — all with label + error
- [ ] Client-side Zod validation on submit: inline error per field, no API call if invalid
- [ ] `ProductFormPage.tsx + ProductFormPage.module.css` — reads URL: `/inventory/new` → add mode, `/inventory/:id/edit` → edit mode
- [ ] Add mode: empty form, `useCreateProduct()` on submit → toast → navigate to `/inventory`
- [ ] Edit mode: pre-fill from `useProducts()` cache or fetch, `useUpdateProduct()` on submit — price change auto-logged
- [ ] Cancel button navigates back
- [ ] `StockAdjustDrawer.tsx + StockAdjustDrawer.module.css` — wraps shared Drawer
- [ ] 3 radio options: Add stock / Remove stock / Set exact quantity
- [ ] Reason Select: New arrival / Damage / Returned / Audit correction / Other
- [ ] Optional note Input
- [ ] Live preview: "New stock will be: X units" — calculated client-side
- [ ] Validation: Remove cannot result in negative stock
- [ ] On confirm: `useAdjustStock()` mutation → invalidateQueries → close drawer → toast
- [ ] Wire [Adjust Stock] from: ProductActionMenu (InventoryPage) and LowStockAlert (DashboardPage)

**Verify:**
1. ☐ Add product → appears in list immediately (React Query refetch, no page reload)
2. ☐ Edit product price → `price_history` table has new row with old+new price
3. ☐ Stock adjust "Remove" with qty > current stock → error shown, no API call

---

### Step 8 — Feature: Pricing — Bulk Price Update (~60 min)

**Frontend:**
- [ ] `pricing.api.ts` — bulkUpdatePrices(items)
- [ ] `pricing.queries.ts` — `useBulkUpdatePrices()` mutation that invalidates `['products']` on success
- [ ] `PriceRow.tsx + PriceRow.module.css` — product name (read-only), current price (DM Mono read-only), new price Input (DM Mono, number). Changed rows: `--color-primary` 2px left border
- [ ] `BulkPricePage.tsx + BulkPricePage.module.css` — reads from `useProducts()` (shared React Query cache — no extra API call on load)
- [ ] Category filter Select to narrow list
- [ ] Live counter bar: "Changed: N | Unchanged: M | Total: T" — updates as user types
- [ ] [Save All Changes] Button — disabled until ≥ 1 price changed
- [ ] On save: send only changed items → toast "Prices updated — N products saved" → invalidateQueries
- [ ] Last updated info from price history

**Verify:**
1. ☐ Change 3 prices, save → Supabase products table has 3 new prices
2. ☐ `price_history` has exactly 3 new rows — not 5 if 2 were unchanged
3. ☐ Inventory page immediately shows fresh price badges (cache invalidated)

---

### Step 9 — Feature: EOD — End-of-Day Stock Entry (~60 min)

**Frontend:**
- [ ] `eod.api.ts` — submitEODEntry(entry_date, items), getEODEntry(date)
- [ ] `eod.queries.ts` — `useSubmitEOD()` mutation (invalidates `['products']`), `useEODEntry(date)` query
- [ ] `EODProductRow.tsx + EODProductRow.module.css` — product name (read-only) + qty sold Input (DM Mono) + ✕ remove
- [ ] `EODEntryPage.tsx + EODEntryPage.module.css`:
  - Date picker (default today, can change to yesterday)
  - On mount: `useEODEntry(date)` — if entry exists, pre-load (edit mode)
  - Product search Input (useDebounce, reads from `useProducts()` — no extra API call)
  - Search result shows product + current stock → click to add as EODProductRow
  - Running totals: "Items: N | Est. value: ₹X"
  - [Confirm Entry] → mutation → toast → invalidateQueries

**Backend:**
- [ ] `services/inventory.service.ts` — submitEODEntry(entry_date, items, userId): UPSERT eod_entries, decrement stock_qty, insert stock_log with `reason='eod_entry'`

**Backend Tests:**
- [ ] `tests/inventory.test.ts` — EOD entry creates stock_log rows, stock decremented, same-day UPSERT no duplicates

**Verify:**
1. ☐ Enter 3 products → `stock_log` has 3 rows with `reason='eod_entry'`
2. ☐ `products.stock_qty` correctly reduced for all 3
3. ☐ Resubmit same date → UPSERT, still 3 rows (no duplicates)

---

### Step 10 — Feature: Settings (~75 min)

**Frontend:**
- [ ] `settings.api.ts` — getUsers, createUser, resetUserPassword, deactivateUser, deleteSessions, deleteAllSessions
- [ ] `settings.queries.ts` — `useUsers()`, `useCreateUser()`, `useResetUserPassword()`, `useDeactivateUser()`, `useDeleteSession()`, `useDeleteAllSessions()`
- [ ] `SettingsPage.tsx + SettingsPage.module.css` — 4 tabs layout
- [ ] `StaffTab.tsx + StaffTab.module.css` (Owner only) — DataTable of staff, [+ Add Staff] Modal (name/email/temp-password/role), [Reset Password] per row, [Deactivate] per row → ConfirmDialog
- [ ] `SessionsTab.tsx + SessionsTab.module.css` (Owner only) — DataTable: device_hint, ip_address, last_seen, [Log out] per row, current session "This device" badge, [Log out all] + ConfirmDialog
- [ ] `CategoriesTab.tsx + CategoriesTab.module.css` (Owner only) — category list + [+ Add Category] inline form
- [ ] `AccountTab.tsx + AccountTab.module.css` (All roles) — change password: current + new + confirm, on success: clear authStore → navigate to `/login` with toast

**Backend:**
- [ ] Add user management routes: POST `/users` (owner), GET `/users` (owner), PUT `/users/:id/reset-password` (owner), DELETE `/users/:id` (owner)

**Verify:**
1. ☐ Owner creates staff → staff can log in with that email
2. ☐ Owner remotely logs out a session → that JWT is in `token_blocklist`
3. ☐ Account password change → all other sessions return 401

---

### Step 11 — PWA + Offline + Reconnect Price Sync (~60 min)

- [ ] `npm install -D vite-plugin-pwa` in frontend
- [ ] Configure VitePWA in `vite.config.ts`: `registerType='autoUpdate'`, cache products API (StaleWhileRevalidate, 1h expiry)
- [ ] Create `public/manifest.json`: name="LalaKirana", theme_color="#006763", background_color="#F6FAFD", display="standalone"
- [ ] Use `useOnlineStatus` in App.tsx — show offline banner "You are offline — changes will sync when connection returns"
- [ ] On reconnect: React Query's built-in `refetchOnReconnect: true` automatically refetches stale queries. Additionally, compare `['products']` prices before/after, show toast if any changed
- [ ] Simple offline mutation queue in localStorage for pending writes
- [ ] Flush pending mutations on reconnect

**Verify:**
1. ☐ `npm run build && npx vite preview` → PWA install prompt in Chrome
2. ☐ Disconnect WiFi → app loads, inventory visible from cache
3. ☐ Change product price in Supabase while offline → reconnect → price change toast

---

### Step 12 — Polish + Accessibility + E2E Tests (~75 min)

**Polish:**
- [ ] Page transitions in App.tsx — CSS class toggle on route change: opacity 0→1, translateY 8px→0, 150ms ease
- [ ] `@media (prefers-reduced-motion: reduce)` in index.css — disables all transitions globally
- [ ] Responsive sidebar: 768-1024px → icon-only (64px, tooltips on hover), <768px → hidden + hamburger in Header
- [ ] Stale price pulse: `@keyframes pulse` on red PriceAgeBadge for >24h, respects prefers-reduced-motion

**Accessibility:**
- [ ] Full keyboard navigation: Tab through every interactive element, Escape closes all overlays, arrow keys in sidebar
- [ ] Aria attributes: `aria-label` on icon buttons, `aria-live='polite'` on toast container, `aria-modal` on Modal, `aria-expanded` on dropdowns
- [ ] Verify all 11 colour contrast ratios ≥ WCAG AA (4.5:1 text, 3:1 UI components)
- [ ] Test on Chrome + Edge + Firefox

**E2E Tests (Playwright):**
- [ ] Install Playwright: `npx playwright install`
- [ ] `e2e/auth.spec.ts` — login → dashboard → logout → redirect to login
- [ ] `e2e/inventory.spec.ts` — login → add product → verify in list → edit price → verify badge
- [ ] `e2e/pricing.spec.ts` — login → bulk price update → verify changes saved

**Verify:**
1. ☐ Tab through LoginPage without mouse — every element reachable in logical order
2. ☐ Lighthouse Accessibility score ≥ 90
3. ☐ All 3 E2E tests pass: `npx playwright test`

---

## Phase 2 Preparation — Do During Phase 1

> [!IMPORTANT]
> These actions during Phase 1 prevent refactoring pain when Phase 2 (Billing, Khata) begins.

- **Sidebar.tsx**: add placeholder nav items for Billing and Khata with "coming soon" tooltip — do not hardcode only Phase 1 items
- **Drawer.tsx**: keep 100% generic — no inventory-specific props — billing will reuse for order slots
- **Toast system**: keep messages generic — billing will trigger toasts for bill confirmations
- **React Query `['products']` cache shape**: billing's product search uses the same query — do not change the data shape
- **`bills` and `bill_items` tables**: already in Supabase from migrations 006/007 — add 2-3 test bills manually
- **`customers` table**: already created — add 2-3 test customers for Phase 2 khata
- **`bill_number_seq`**: verify exists — `SELECT nextval('bill_number_seq')` in Supabase SQL Editor
- Phase 2 adds `features/billing/` and `features/khata/` — the folder structure is ready to receive them

---

## Verification Master Checklist

All 30 items must pass before Phase 1 is complete.

### Auth & Security (8)

| # | Test | Expected | ☐ |
|---|------|----------|---|
| 1 | Login with correct credentials | JWT in localStorage, redirect to `/dashboard` | ☐ |
| 2 | Wrong password × 5 | `locked_until` set in DB, lockout message shown | ☐ |
| 3 | Login with revoked JWT | 401 — token found in `token_blocklist` | ☐ |
| 4 | 6 login attempts same IP in 15 min | 429 Too Many Requests | ☐ |
| 5 | Forgot password OTP flow | Email received, OTP valid 10 min only | ☐ |
| 6 | Staff accessing `/settings` | 403 Forbidden | ☐ |
| 7 | Owner resets staff password | Staff can log in with new password | ☐ |
| 8 | Change own password | All other sessions return 401 | ☐ |

### Inventory (12)

| # | Test | Expected | ☐ |
|---|------|----------|---|
| 9 | Add product — all fields valid | Appears in list, correct badge | ☐ |
| 10 | Add product — missing name | Inline error, no API call | ☐ |
| 11 | Edit product — change price | `price_history` row, `price_updated_at` updated | ☐ |
| 12 | Bulk price — 3 changed, 2 same | 3 updated, 2 skipped | ☐ |
| 13 | Stale price badge — 13h old | Yellow badge with hours | ☐ |
| 14 | Stale price badge — 25h old | Red pulsing badge | ☐ |
| 15 | Deactivate product | Hidden from list, `is_active=false` | ☐ |
| 16 | Stock adjust — Add 10 to 42 | `stock_qty=52`, stock_log row | ☐ |
| 17 | Stock adjust — Remove 50 from 42 | Validation error, no API call | ☐ |
| 18 | EOD entry — 3 products | 3 `eod_entries` rows, stock reduced | ☐ |
| 19 | EOD resubmit same day | UPSERT — no duplicates | ☐ |
| 20 | Low stock threshold | Shows in dashboard alert | ☐ |

### UI, PWA & Accessibility (10)

| # | Test | Expected | ☐ |
|---|------|----------|---|
| 21 | Success action (any) | Toast slides in, auto-dismiss 4s | ☐ |
| 22 | Data loading state | Skeleton shimmer visible | ☐ |
| 23 | Drawer open/close | 250ms slide, Escape closes | ☐ |
| 24 | Deactivate product | ConfirmDialog, action on confirm only | ☐ |
| 25 | PWA install | Chrome prompt, standalone app | ☐ |
| 26 | Offline mode | Inventory visible from cache, banner shown | ☐ |
| 27 | Price change while offline | Toast on reconnect | ☐ |
| 28 | 768px viewport | Sidebar collapses to 64px icon-only | ☐ |
| 29 | Keyboard navigation | Full Tab order, Escape closes overlays | ☐ |
| 30 | Lighthouse Accessibility | Score ≥ 90 | ☐ |

---

## Time Estimate

| Step | Feature | Est. Time |
|------|---------|-----------|
| 1 | Supabase setup + 16 migrations | 30 min |
| 2 | Backend scaffold (TypeScript) | 60 min |
| 3 | Frontend scaffold + ALL shared infrastructure | 90 min |
| 4 | Feature: Auth (login, JWT, lockout, OTP, sessions) | 90 min |
| 5 | Feature: Dashboard (stats, alerts, recent changes) | 60 min |
| 6 | Feature: Inventory — product list, filters, badges | 90 min |
| 7 | Feature: Inventory — add/edit product, stock adjust | 75 min |
| 8 | Feature: Pricing — bulk price update | 60 min |
| 9 | Feature: EOD — end-of-day stock entry | 60 min |
| 10 | Feature: Settings (staff, sessions, categories, account) | 75 min |
| 11 | PWA + offline mode + reconnect price sync | 60 min |
| 12 | Polish, accessibility, E2E tests | 75 min |
| | **TOTAL** | **~14 hours** |

> [!NOTE]
> The +1.5 hour increase over v3.0 comes from TypeScript setup (~15 min), React Query configuration (~15 min), and testing (~60 min). These pay for themselves many times over during Phase 2.

---

*LalaKirana Implementation Plan v3.1 — Feature-based. TypeScript. React Query. Ready to build.*
