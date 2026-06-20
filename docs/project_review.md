# LalaKirana — Project Review vs Implementation Plan v3.1

> **Scope**: Full comparison of the current codebase against [implementation_plan.md](file:///c:/MANAS/Projects/LK/Implementation/docs/implementation_plan.md) (v3.1).

---

## Overall Progress Summary

| Step | Description | Status | Notes |
|------|------------|--------|-------|
| 1 | Environment + Supabase + Migrations | ✅ **Complete** | All 16 migration files present |
| 2 | Backend Scaffold (TypeScript) | ✅ **Complete** | Feature-based structure, all stubs present |
| 3 | Frontend Scaffold + Shared Infrastructure | ✅ **Complete** | All shared UI, layout, hooks, stores, types present |
| 4 | Feature: Auth (Login, Sessions, OTP) | 🟡 **Stub only** | LoginPage has mock auth, no real API integration |
| 5 | Feature: Dashboard | 🟡 **Stub only** | Placeholder text, no StatCards/queries wired |
| 6 | Feature: Inventory — Product List | 🟡 **Stub only** | Placeholder text, no DataTable/categories wired |
| 7 | Feature: Inventory — Add/Edit/Stock Adjust | ❌ **Not started** | No ProductForm, StockAdjustDrawer, ProductFormPage |
| 8 | Feature: Pricing — Bulk Price Update | 🟡 **Stub only** | Placeholder text, no PriceRow/pricing logic |
| 9 | Feature: EOD — Stock Entry | 🟡 **Stub only** | Placeholder text, no EODProductRow/eod logic |
| 10 | Feature: Settings | 🟡 **Stub only** | Placeholder text, no tabs/staff management |
| 11 | PWA + Offline | ❌ **Not started** | No `vite-plugin-pwa`, no manifest, no offline |
| 12 | Polish + Accessibility + E2E | ❌ **Not started** | No Playwright, no page transitions |

> [!IMPORTANT]
> **Steps 1–3 are fully built. Steps 4–12 are the remaining feature implementation work.** The scaffold is solid — it's time to wire real business logic.

---

## Step 1 — Migrations ✅

| Requirement | Status | File |
|-------------|--------|------|
| 16 migration files in order | ✅ | [migrations/](file:///c:/MANAS/Projects/LK/Implementation/migrations) — all 16 SQL files present |
| `run-migrations.js` helper | ✅ | [run-migrations.js](file:///c:/MANAS/Projects/LK/Implementation/migrations/run-migrations.js) |
| `README.md` for migration docs | ✅ | [README.md](file:///c:/MANAS/Projects/LK/Implementation/migrations/README.md) |

---

## Step 2 — Backend Scaffold ✅

### Architecture — Feature-Based ✅

The backend correctly follows the feature-based folder structure:

```
backend/src/
├── app.ts                      ✅ Express + CORS + JSON + routes + error handler
├── server.ts                   ✅ HTTP listen + graceful SIGTERM/SIGINT shutdown
├── db/supabase.ts              ✅ Typed Supabase client, SERVICE_ROLE_KEY
├── features/
│   ├── auth/
│   │   ├── auth.routes.ts      ✅ GET /health stub
│   │   └── auth.schema.ts      ✅ Login, ForgotPassword, Reset, Change schemas
│   ├── products/
│   │   ├── products.routes.ts  ✅ GET /health stub
│   │   └── product.schema.ts   ✅ Create, Update, BulkPrice schemas
│   ├── inventory/
│   │   ├── inventory.routes.ts ✅ GET /health stub
│   │   └── inventory.schema.ts ✅ StockAdjust, EODEntry schemas
│   └── reports/
│       └── reports.routes.ts   ✅ GET /health stub
├── middleware/
│   ├── auth.middleware.ts      ✅ Stub (attaches mock owner)
│   ├── role.middleware.ts      ✅ requireOwner() implemented
│   ├── rateLimiter.ts          ✅ 5 req / 15 min on login
│   └── validate.middleware.ts  ✅ Zod parse wrapper → 400 on fail
├── utils/
│   ├── priceAge.ts             ✅ 'fresh' | 'warn' | 'stale'
│   ├── deviceHint.ts           ✅ User-Agent parser
│   └── billNumber.ts           ✅ LK-YYYY-NNNNN generator
└── types/
    ├── express.d.ts            ✅ Extends Request with user
    └── env.d.ts                ✅ Typed process.env
```

### Backend Dependencies ✅

| Required | Installed | Status |
|----------|-----------|--------|
| express | v5.2.1 | ✅ |
| @supabase/supabase-js | v2.108.2 | ✅ |
| jsonwebtoken | v9.0.3 | ✅ |
| bcrypt | v6.0.0 | ✅ |
| zod | v4.4.3 | ✅ |
| express-rate-limit | v8.5.2 | ✅ |
| cors | v2.8.6 | ✅ |
| dotenv | v17.4.2 | ✅ |
| nodemailer | v9.0.1 | ✅ |
| uuid | v14.0.0 | ✅ |
| typescript (dev) | ✅ | ✅ |
| tsx (dev) | ✅ | ✅ |

### Files Still Missing from Step 2 (Deferred to Step 4+)

These are expected — they're spec'd for later steps:

| Missing File | Will Be Created In |
|---|---|
| `auth.controller.ts` | Step 4 |
| `auth.service.ts` | Step 4 |
| `email.service.ts` | Step 4 |
| `products.controller.ts` | Step 6 |
| `products.service.ts` | Step 6 |
| `inventory.controller.ts` | Step 9 |
| `inventory.service.ts` | Step 9 |
| `reports.controller.ts` | Step 5 |
| `reports.service.ts` | Step 5 |
| `backend/tests/` directory | Steps 4, 6, 9 |

---

## Step 3 — Frontend Scaffold + Shared Infrastructure ✅

### Design System — Minted Ledger (Ice Latte + Mint) ✅

Verified in [index.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/index.css):

| Token | Expected Hex | Actual Hex | Status |
|-------|-------------|------------|--------|
| `--color-primary` (The Mint) | `#006763` | `#006763` | ✅ |
| `--color-primary-container` | `#00837e` | `#00837e` | ✅ |
| `--color-surface` (Ice Latte) | `#f6fafd` | `#f6fafd` | ✅ |
| `--color-surface-container` | `#eaeef2` | `#eaeef2` | ✅ |
| `--color-on-surface` | `#171c1f` | `#171c1f` | ✅ |
| `--color-on-surface-variant` | `#3d4948` | `#3d4948` | ✅ |
| `--color-outline` | `#6d7a78` | `#6d7a78` | ✅ |
| `--color-outline-variant` | `#bcc9c7` | `#bcc9c7` | ✅ |
| `--color-secondary` | `#625e56` | `#625e56` | ✅ |
| `--color-error` | `#ba1a1a` | `#ba1a1a` | ✅ |
| `--color-surface-dim` | `#d6dbde` | `#d6dbde` | ✅ |

**Extra tokens added** (good practice):
- `--color-white: #ffffff`
- `--font-display`, `--font-body`, `--font-mono` ✅
- `--transition-fast`, `--transition-normal` ✅
- `--radius-sm/md/lg/full` ✅
- `--shadow-sm/md/lg` ✅

**Typography**: Google Fonts `@import` with Playfair Display + DM Sans + DM Mono ✅

**Reduced motion**: `@media (prefers-reduced-motion: reduce)` ✅ (ahead of Step 12 spec)

---

### Shared UI Components ✅

| Component | Plan Spec | File Exists | Has CSS Module | Quality |
|-----------|-----------|-------------|----------------|---------|
| ErrorBoundary | ✅ | ✅ [ErrorBoundary.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/ErrorBoundary.tsx) | N/A (no CSS needed) | ✅ |
| Toast | ✅ | ✅ [Toast.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Toast.tsx) | ✅ [Toast.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Toast.module.css) | ✅ 4 variants, accent bar, `aria-live`, auto-dismiss |
| Skeleton | ✅ | ✅ [Skeleton.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Skeleton.tsx) | ✅ [Skeleton.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Skeleton.module.css) | ✅ Shimmer animation |
| Button | ✅ | ✅ [Button.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Button.tsx) | ✅ [Button.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Button.module.css) | ✅ 4 variants, 3 sizes, loading spinner, `focus-visible` |
| Input | ✅ | ✅ [Input.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Input.tsx) | ✅ [Input.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Input.module.css) | ✅ |
| Select | ✅ | ✅ [Select.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Select.tsx) | ✅ [Select.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Select.module.css) | ✅ |
| Badge | ✅ | ✅ [Badge.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Badge.tsx) | ✅ [Badge.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Badge.module.css) | ✅ |
| Modal | ✅ | ✅ [Modal.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Modal.tsx) | ✅ [Modal.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Modal.module.css) | ✅ Portal, Escape, backdrop, `aria-modal` |
| Drawer | ✅ | ✅ [Drawer.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Drawer.tsx) | ✅ [Drawer.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/Drawer.module.css) | ✅ Generic, no business logic |
| ConfirmDialog | ✅ | ✅ [ConfirmDialog.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/ConfirmDialog.tsx) | ✅ [ConfirmDialog.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/ConfirmDialog.module.css) | ✅ |
| StatCard | ✅ | ✅ [StatCard.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/StatCard.tsx) | ✅ [StatCard.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/StatCard.module.css) | ✅ Label, value, delta |
| DataTable | ✅ | ✅ [DataTable.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/DataTable.tsx) | ✅ [DataTable.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/DataTable.module.css) | ✅ Generic, typed columns |
| EmptyState | ✅ | ✅ [EmptyState.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/EmptyState.tsx) | ✅ [EmptyState.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/EmptyState.module.css) | ✅ |

**All 13 shared UI components are present with CSS modules. ✅**

---

### Shared Layout ✅

| Component | Status | Key Features |
|-----------|--------|-------------|
| [AppLayout.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/layout/AppLayout.tsx) | ✅ | CSS grid: sidebar + main, uses `<Outlet />` |
| [Sidebar.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/layout/Sidebar.tsx) | ✅ | 6 nav items with SVG icons, Billing + Khata "Coming Soon" placeholders, logout, responsive (icon-only at 1024px, hidden at 768px) |
| [Header.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/layout/Header.tsx) | ✅ | Dynamic page title, user name/role display, hamburger button (mobile) |

---

### Shared API + State ✅

| File | Status | Key Details |
|------|--------|-------------|
| [axios.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/api/axios.ts) | ✅ | Base URL from env, Bearer token interceptor, 401 auto-logout |
| [queryClient.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/api/queryClient.ts) | ✅ | `staleTime: 5min`, `gcTime: 10min`, `retry: 1`, `refetchOnWindowFocus`, `refetchOnReconnect` |
| [authStore.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/store/authStore.ts) | ✅ | Zustand: user, token, isAuthenticated, login(), logout(), localStorage persistence |
| [toastStore.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/store/toastStore.ts) | ✅ | Zustand: toasts[], addToast(type, message), removeToast(id), 4s auto-dismiss |

---

### Shared Hooks ✅

| Hook | Status | Details |
|------|--------|---------|
| [useDebounce.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/hooks/useDebounce.ts) | ✅ | Generic `<T>` typed, configurable delay |
| [useOnlineStatus.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/hooks/useOnlineStatus.ts) | ✅ | `navigator.onLine` listener |
| [useClickOutside.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/hooks/useClickOutside.ts) | ✅ | Ref-based, mousedown + touchstart |

---

### Types ✅

| File | Status | Contents |
|------|--------|---------|
| [auth.types.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/types/auth.types.ts) | ✅ | User, Session, LoginResponse |
| [product.types.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/types/product.types.ts) | ✅ | Product, Category, PriceHistoryEntry, ProductFilters |
| [inventory.types.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/types/inventory.types.ts) | ✅ | StockAdjustInput, EODEntry, EODProductRow, EODSubmitInput, StockLogEntry |

> [!NOTE]
> The plan mentions `LoginInput` in types. Currently login input types are only on the backend side (Zod schema), which is fine — they'll be needed when Step 4 wires the real login form.

---

### App.tsx ✅

| Requirement | Status |
|-------------|--------|
| QueryClientProvider wrapping | ✅ |
| React Router with `/` → `/dashboard` redirect | ✅ |
| `/login` as public route (redirects logged-in users) | ✅ |
| ProtectedRoute guard on all app routes | ✅ |
| Lazy imports for all 6 feature pages | ✅ |
| ErrorBoundary wrapping | ✅ |
| Toast mounted at root level | ✅ |
| Suspense with Skeleton fallback | ✅ |

---

### Frontend Config ✅

| Config | Status | Details |
|--------|--------|---------|
| `tsconfig.app.json` — `@/*` path alias | ✅ | `"@/*": ["./src/*"]` |
| `vite.config.ts` — path alias resolution | ✅ | `'@': fileURLToPath('./src')` |
| `tsconfig.json` — strict mode | ⚠️ | Uses `tsconfig.app.json` references (Vite default pattern). `strict` is not explicitly set in `tsconfig.app.json` but linting rules like `noUnusedLocals`, `noUnusedParameters` are enabled |

### Frontend Dependencies ✅

| Required | Installed | Status |
|----------|-----------|--------|
| react | v19.2.6 | ✅ |
| react-dom | v19.2.6 | ✅ |
| react-router-dom | v7.18.0 | ✅ (v7, plan says v6 but v7 is compatible) |
| zustand | v5.0.14 | ✅ |
| axios | v1.18.0 | ✅ |
| @tanstack/react-query | v5.101.0 | ✅ |

---

## Feature Pages — Current State

All 6 feature pages exist as **route-able stubs** with default exports for lazy-loading. This is correct for the scaffold step:

| Page | Status | What's there | What Step 4+ will add |
|------|--------|-------------|----------------------|
| [LoginPage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/LoginPage.tsx) | 🟡 Mock | Mock login button (hardcoded user/token) | Real form with Input fields, Zod validation, auth.api.ts, ForgotPasswordModal |
| [DashboardPage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/dashboard/DashboardPage.tsx) | 🟡 Stub | Placeholder text | 4 StatCards, LowStockAlert, RecentPriceChanges, dashboard.queries.ts |
| [InventoryPage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/inventory/InventoryPage.tsx) | 🟡 Stub | Placeholder text | CategoryTabs, DataTable, search, PriceAgeBadge, ProductActionMenu |
| [BulkPricePage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/pricing/BulkPricePage.tsx) | 🟡 Stub | Placeholder text | PriceRow, category filter, counter bar, save button |
| [EODEntryPage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/eod/EODEntryPage.tsx) | 🟡 Stub | Placeholder text | Date picker, product search, EODProductRow, confirm button |
| [SettingsPage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/SettingsPage.tsx) | 🟡 Stub | Placeholder text | 4 tabs: Staff, Sessions, Categories, Account |

---

## Missing Feature Files (Will Be Created in Steps 4–10)

### Frontend — Per Feature

| Feature | Files to Create | Step |
|---------|----------------|------|
| **auth** | `auth.api.ts`, `auth.queries.ts`, `auth.helpers.ts`, `LoginPage.module.css`, `ForgotPasswordModal.tsx + .module.css` | 4 |
| **dashboard** | `dashboard.queries.ts`, `LowStockAlert.tsx + .module.css`, `RecentPriceChanges.tsx + .module.css`, `DashboardPage.module.css` | 5 |
| **inventory** | `inventory.api.ts`, `inventory.queries.ts`, `PriceAgeBadge.tsx + .module.css`, `CategoryTabs.tsx + .module.css`, `ProductActionMenu.tsx + .module.css`, `PriceHistoryModal.tsx + .module.css`, `InventoryPage.module.css`, `ProductForm.tsx + .module.css`, `ProductFormPage.tsx + .module.css`, `StockAdjustDrawer.tsx + .module.css` | 6–7 |
| **pricing** | `pricing.api.ts`, `pricing.queries.ts`, `PriceRow.tsx + .module.css`, `BulkPricePage.module.css` | 8 |
| **eod** | `eod.api.ts`, `eod.queries.ts`, `EODProductRow.tsx + .module.css`, `EODEntryPage.module.css` | 9 |
| **settings** | `settings.api.ts`, `settings.queries.ts`, `StaffTab.tsx + .module.css`, `SessionsTab.tsx + .module.css`, `CategoriesTab.tsx + .module.css`, `AccountTab.tsx + .module.css`, `SettingsPage.module.css` | 10 |

### Backend — Per Feature

| Feature | Files to Create | Step |
|---------|----------------|------|
| **auth** | `auth.controller.ts`, `auth.service.ts`, `email.service.ts` | 4 |
| **reports** | `reports.controller.ts`, `reports.service.ts` | 5 |
| **products** | `products.controller.ts`, `products.service.ts` | 6 |
| **inventory** | `inventory.controller.ts`, `inventory.service.ts` | 9 |
| **tests** | `tests/setup.ts`, `tests/auth.test.ts`, `tests/products.test.ts`, `tests/inventory.test.ts` | 4, 6, 9 |

---

## Phase 2 Preparation Checklist

| Requirement | Status |
|-------------|--------|
| Sidebar has Billing + Khata placeholders with "Coming Soon" tooltip | ✅ |
| Drawer.tsx is 100% generic (no business props) | ✅ |
| Toast system is generic (no feature-specific messages) | ✅ |
| `['products']` query key shape is established | ✅ (in queryClient config + types) |
| `bills` and `bill_items` tables in migrations | ✅ (migrations 006, 007) |
| `customers` table in migrations | ✅ (migration 005) |
| `bill_number_seq` via billNumber.ts | ✅ |

---

## Code Quality Observations

### ✅ What's Done Well

1. **Feature-based architecture** — Cleanly implemented in both backend and frontend. No cross-feature imports.
2. **Type safety** — All components are properly typed with TypeScript interfaces.
3. **Design tokens** — All 11 Ice Latte + Mint colors match exactly. Extra utility tokens (radius, shadows, transitions) are a nice bonus.
4. **CSS Modules** — Every UI component has a paired `.module.css` file with proper scoping.
5. **Accessibility** — Toast has `aria-live`, Modal has `aria-modal`, buttons have `focus-visible`, reduced motion support is in the global CSS.
6. **Zustand usage** — Correct pattern: `create<Type>((set) => ...)`, client-only state (auth + toast).
7. **React Query config** — Proper defaults: staleTime, gcTime, retry, refetchOnWindowFocus, refetchOnReconnect.
8. **Responsive sidebar** — Already handles 1024px (icon-only) and 768px (hidden) breakpoints.
9. **Generic DataTable** — Typed `ColumnConfig<T>` with render functions, alignment, and width.

### ⚠️ Minor Issues to Address Before Step 4

1. **`tsconfig.app.json` missing `strict: true`** — Plan says "strict mode" but the Vite-generated config doesn't include it. Should add `"strict": true` to `compilerOptions`.

2. **LoginPage uses inline styles** — The mock login page uses `style={{...}}` instead of CSS Modules. Acceptable for a temporary stub, but Step 4 should use `LoginPage.module.css`.

3. **Sidebar active state color contrast** — `.activeNavLink` uses `--color-primary-container` (`#00837e`) as background with `--color-primary` (`#006763`) text. The contrast between those two dark teal shades might be low. Step 4 should verify this visually and potentially use white text on the active background.

4. **Missing `LoginInput` type** — `auth.types.ts` has `User`, `Session`, `LoginResponse` but no `LoginInput` (email + password). Add it before Step 4 or inline it from Zod schema.

5. **`App.tsx` missing inventory sub-routes** — Plan specifies `/inventory/new` and `/inventory/:id/edit` routes (Step 7). These should be added when ProductFormPage is created.

---

## Recommended Next Step

> [!TIP]
> **Step 4 — Feature: Auth** is the next logical step. It builds the real authentication flow:
> - Backend: `auth.service.ts` + `auth.controller.ts` + `email.service.ts` + wire all auth routes
> - Frontend: `auth.api.ts` + `auth.queries.ts` + `auth.helpers.ts` + real `LoginPage` + `ForgotPasswordModal`
> - Tests: `tests/auth.test.ts`
>
> Everything needed for Step 4 is already scaffolded — schemas, middleware stubs, types, stores, shared UI components are all in place.
