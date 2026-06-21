# LalaKirana — Scaffold & Auth Walkthrough

We have completed the backend feature-based organization, the entire frontend shared infrastructure scaffold, and the complete authentication feature (Steps 1, 2, 3, and 4).

---

## 1. Backend Reorganization (Feature-Based)

To align with the frontend's vertical slicing pattern, the backend was refactored from horizontal layers (`routes/`, `schemas/`) into vertical feature directories:

- **`features/auth/`**: Auth routes, controllers, services, and `auth.schema.ts` Zod validation.
- **`features/products/`**: Product CRUD, bulk price services, and `product.schema.ts`.
- **`features/inventory/`**: Stock adjustment routes, EOD ledger services, and `inventory.schema.ts`.
- **`features/reports/`**: Dashboard reporting routes and stats calculators.

### Verification
- **TypeScript**: `npx tsc --noEmit` compiles clean with zero warnings or errors.
- **Health Checks**: Mounted on port `5000` via `tsx watch`, responding correctly:
  - `GET http://localhost:5000/api/v1/auth/health` → `{ status: 'ok', feature: 'auth' }`
  - `GET http://localhost:5000/api/v1/products/health` → `{ status: 'ok', feature: 'products' }`
  - `GET http://localhost:5000/api/v1/inventory/health` → `{ status: 'ok', feature: 'inventory' }`
  - `GET http://localhost:5000/api/v1/reports/health` → `{ status: 'ok', feature: 'reports' }`

---

## 2. Frontend Scaffold & Shared Infrastructure

Scaffolded a React + Vite + TypeScript application in `frontend/` and implemented the complete layout, UI primitives, and store configuration:

### Core Setup
- **Config**: Aliased `@` to `src/` inside `tsconfig.app.json` and `vite.config.ts` using modern, native URL resolvers.
- **CSS System**: Configured [index.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/index.css) entirely with the **Minted Ledger** tokens (colors, typography, transitions, border-radius) and default typography rules.
- **State Stores**:
  - `authStore.ts`: Handles session tokens, logging in, logging out, and localStorage persistence.
  - `toastStore.ts`: Manages reactive notification items with auto-dismiss timers.
- **Client APIs**:
  - `axios.ts`: Formats base requests, automatically attaches Bearer tokens, and handles `401` errors by purging storage and sending users to `/login`.
  - `queryClient.ts`: Defines standard React Query caching limits (`staleTime: 5min`, auto-refetch, offline reconnect sync).

### Shared Hooks
- `useDebounce.ts`: Keystroke delay logic for catalog filters.
- `useOnlineStatus.ts`: Window listener to check connectivity status.
- `useClickOutside.ts`: Callback hook to close overlay menus.

### Shared UI Components
1. `ErrorBoundary.tsx`: Catches UI render crashes and shows a recovery dialog.
2. `Toast.tsx`: Notification card layout with side-color themes and animations.
3. `Skeleton.tsx`: Width/height configurable shimmer placeholder cards.
4. `Button.tsx`: Supports primary, secondary, ghost, and danger variants.
5. `Input.tsx`: Custom field label, helpers, error text, and focus borders.
6. `Select.tsx`: Form dropdown matching the input look.
7. `Badge.tsx`: Colorful status pill indicator.
8. `Modal.tsx`: Portal dialog box with Escape key handlers and background blurs.
9. `Drawer.tsx`: Slides out from the right edge with clean easing.
10. `ConfirmDialog.tsx`: Modal warning wrapper for deletions or deactivations.
11. `StatCard.tsx`: Monospace formatted numbers and trend directions.
12. `DataTable.tsx`: Generic layout displaying columns, actions, and empty states.
13. `EmptyState.tsx`: Informative fallback illustration with a CTA.

### App Shell & Routes
- `AppLayout.tsx`: Arranges the `Sidebar` (including Phase 2 tooltipped placeholders) and `Header` in a grid.
- `App.tsx`: Wires the lazy-imported pages (Dashboard, Inventory, Pricing, EOD, Settings) inside `ProtectedRoute` or `PublicRoute` guards.

---

## 3. Step 4 — Feature: Auth — Login, Sessions, Password Reset

Implemented the complete authentication feature including backend APIs, middlewares, frontend state hooks, and custom Split-Panel Login / OTP Reset UI components:

### Backend Implementation
- **Schemas**: Validated with Zod schemas in [auth.schema.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/auth/auth.schema.ts) (Login, ForgotPassword, ResetPassword, ChangePassword).
- **Service**: In [auth.service.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/auth/auth.service.ts) handling JTI token generation/sessions creation, revocation (blocklisting), and OTP requests.
- **Controller**: In [auth.controller.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/auth/auth.controller.ts) implementing rate-limited login, account lockout (5 attempts → 30 min lock), profile fetching, remote session termination, and OTP password resets.
- **Email Service**: In [email.service.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/auth/email.service.ts) using Nodemailer to deliver OTPs, with a fallback to console logging for local testing.
- **Middleware**: Integrated JWT token checking, session existence verification, blocklist checks, and asynchronous `last_seen` updates in [auth.middleware.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/middleware/auth.middleware.ts).
- **Tests**: Created comprehensive integration test suite in [auth.test.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/tests/auth.test.ts) covering lockout mechanics, profile fetching, remote logouts, and OTP resets.

### Frontend Implementation
- **API Client**: Mapped in [auth.api.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/auth.api.ts) for clean HTTP requests.
- **Queries & Mutations**: TanStack React Query queries and mutations in [auth.queries.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/auth.queries.ts) with cache auto-invalidation.
- **Helpers**: Token getters/setters and client-side expiration checks in [auth.helpers.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/auth.helpers.ts).
- **Components & Layout**:
  - [LoginPage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/LoginPage.tsx) + [LoginPage.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/LoginPage.module.css): Premium Ice Latte & Mint branding layout (40% split-branding sidebar), validation handling, and integration with `authStore`.
  - [ForgotPasswordModal.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/ForgotPasswordModal.tsx) + [ForgotPasswordModal.module.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/auth/ForgotPasswordModal.module.css): 3-step modal handling email validation, OTP code submission, password resetting, and success checkmarks.

---

## 4. Verification Details

All tests and core flows have been verified against the hosted Supabase instance:

### Backend Integration Tests (Vitest)
All 8 integration tests ran and passed successfully:
```
 ✓ tests/auth.test.ts (8 tests) 12614ms
       ✓ should login successfully with correct credentials  637ms
       ✓ should return 401 for incorrect password  600ms
       ✓ should lock the account after 5 failed attempts  3287ms
       ✓ should get current user details from GET /me  762ms
       ✓ should get active sessions list  498ms
       ✓ should revoke session on logout  801ms
       ✓ should handle forgot password and reset password successfully  3423ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

### Browser Verification
Using the automated browser subagent, we verified:
1. Navigating to `http://localhost:5173/login` loads the newly styled Split-Panel layout.
2. Form-level inputs validation blocks submissions for missing or invalid values.
3. Submitting valid credentials (`owner@lalakirana.in` / `changeme123`) authenticates the user, stores the JWT, and correctly redirects them to `http://localhost:5173/dashboard`.

---

## 5. Step 10 — Feature: Settings (User Management, Sessions, Categories, Account)

Implemented the complete Settings feature with owner-only user management, session control, and account password change.

### Backend Implementation

#### Auth Controller Extensions ([auth.controller.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/auth/auth.controller.ts))
- **`getUsers`**: Lists all users with `id, name, email, role, is_active, created_at` fields.
- **`createUser`**: Creates staff/owner accounts with bcrypt-hashed passwords. Checks for email uniqueness.
- **`resetUserPassword`**: Owner can reset any user's password. Revokes all their sessions on reset.
- **`deactivateUser`**: Sets `is_active = false`, revokes all sessions, adds tokens to blocklist. Cannot deactivate self.
- **`deleteAllSessions`**: Terminates all sessions except the current one for the requesting user.
- **Login `is_active` check**: Added deactivation check to login handler — deactivated users get `401` with a clear error message.

#### New Routes ([auth.routes.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/auth/auth.routes.ts))
- `GET /users` (owner only)
- `POST /users` (owner only, Zod-validated)
- `PUT /users/:id/reset-password` (owner only, Zod-validated)
- `DELETE /users/:id` (owner only, deactivates user)
- `DELETE /sessions/all` (auth required)

#### Schema Extensions ([auth.schema.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/auth/auth.schema.ts))
- `CreateUserSchema`: name, email, password (min 6), role (owner|staff)
- `ResetUserPasswordSchema`: newPassword (min 6)

#### Database
- Migration [017_add_is_active_to_users.sql](file:///c:/MANAS/Projects/LK/Implementation/migrations/017_add_is_active_to_users.sql): `ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL`

### Frontend Implementation

#### API & Queries
- [settings.api.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/settings.api.ts): All API calls (getUsers, createUser, resetUserPassword, deactivateUser, getSessions, deleteSession, deleteAllSessions, changePassword).
- [settings.queries.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/settings.queries.ts): React Query hooks with cache invalidation.

#### UI Components (4 Tabs)
1. **[StaffTab.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/StaffTab.tsx)** (Owner only): Staff table, Add Staff modal (name/email/password/role), Reset Password modal, Deactivate confirm dialog.
2. **[SessionsTab.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/SessionsTab.tsx)**: Active sessions table, "This device" badge, individual logout, "Log Out All Others" with confirm dialog.
3. **[CategoriesTab.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/CategoriesTab.tsx)** (Owner only): Category list with inline add form.
4. **[AccountTab.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/AccountTab.tsx)**: Change password form. On success, clears auth and navigates to `/login`.

#### Settings Page ([SettingsPage.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/settings/SettingsPage.tsx))
- 4-tab layout with role-based visibility: owners see all 4 tabs, staff sees only Sessions + Account.

### Verification

#### Settings Integration Tests ([settings.test.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/tests/settings.test.ts))
All 9 tests passed:
```
✓ tests/settings.test.ts (9 tests) 17929ms
  ✓ should allow owner to list users  800ms
  ✓ should forbid staff from listing users  373ms
  ✓ should allow owner to create a new staff member  2842ms
  ✓ should forbid staff from creating users  693ms
  ✓ should allow owner to reset staff password  3954ms
  ✓ should forbid staff from resetting a password  382ms
  ✓ should allow owner to deactivate a user  1283ms
  ✓ should forbid staff from deactivating users  346ms
  ✓ should terminate all sessions except current one  4024ms
```

#### Key Verifications Confirmed
1. ☑ **Owner creates staff → staff can log in** with that email/password
2. ☑ **Owner remotely logs out a session → that JWT is in `token_blocklist`** and returns 401
3. ☑ **Deactivated user cannot log in** — gets `401` with "deactivated" message
4. ☑ **Password reset revokes all sessions** — old password fails, new password works
5. ☑ **Frontend build passes** — `tsc -b && vite build` compiles clean with zero errors

---

## 6. Step 11 — PWA + Offline + Reconnect Price Sync

Implemented progressive web app features, offline persistence capability, write queueing, and price reconciliation on reconnection.

### PWA Configuration

- **Library**: `vite-plugin-pwa` integrated in frontend.
- **Service Worker**: Built using Workbox in `generateSW` mode.
- **Caching Strategy**:
  - Cache-first for Google Fonts (`google-fonts-cache` and `gstatic-fonts-cache`).
  - `StaleWhileRevalidate` for API calls to `/products` (`products-api-cache`) and `/reports` (`reports-api-cache`) with 1-hour expiration.
  - Fallback navigation to `index.html` to support client-side routing while offline.
- **Manifest**: Created `public/manifest.json` and configured PWA plugin manifest settings, outputting `dist/manifest.json` during the build. Wired standard and maskable SVG icons.

### Offline Experience

- **Offline Detection**: Wrote `useOnlineStatus` hook monitoring browser online/offline events.
- **[OfflineBanner.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/OfflineBanner.tsx)**: Displays a slide-up banner alerts: *"You are offline — changes will sync when connection returns"* when connectivity drops. Uses HSL tailored color variables and supports `prefers-reduced-motion`.
- **Write Interception & Local Queue**:
  - Extended Axios response interceptor in [axios.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/api/axios.ts) to intercept any failing write request (POST/PUT/DELETE) during offline states.
  - Queues requests in `localStorage` under `lk_offline_queue` with duplicate protection.
  - Shows warning toast: *"You are offline. Changes saved locally and will sync when connection returns."*
  - Resolves successfully to prevent UI disruption or error dialogs.

### Reconnect Synchronization

- **Price Sync Hook ([usePriceSync.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/hooks/usePriceSync.ts))**:
  - Automatically triggered upon connection recovery.
  - Processes and flushes `lk_offline_queue` requests sequentially to the backend.
  - Showcases success/error status toasts for synchronizations.
  - Compares the cached product prices prior to connection restoration with fresh refetched data.
  - Shows info toast detailing all price changes that occurred while offline (e.g. *`Fortune Mustard Oil 1L: ₹175 → ₹180`*).

- **Build Success**: `tsc -b && vite build` compiles cleanly generating `sw.js` and `manifest.json`.

---

## 7. Step 12 — Polish + Accessibility + E2E Tests

Completed the final visual refinements, responsive navigation adaptivity, accessibility audits, rate limiter optimizations, and Playwright E2E verification.

### Visual & Interactive Polish

- **Page Transitions**: Wired location-keyed route animation wrapper in [AppLayout.tsx](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/layout/AppLayout.tsx) triggering a `pageFadeIn` keyframe animation (opacity 0→1, translate Y 8px→0, 150ms ease) on route changes.
- **Reduced Motion**: Optimized transitions and pulsing badges globally in [index.css](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/index.css) and component modules to disable animations when `prefers-reduced-motion: reduce` is detected.
- **Responsive Sidebar**:
  - Desktop (1025px+): Full width (240px) sidebar menu.
  - Tablet (769px–1024px): Compact icon-only (64px) sidebar menu with tooltips on hover.
  - Mobile (<768px): Hidden sidebar by default. Hamburger button in Header toggles a sliding mobile drawer with overlay backdrop. Automatically closes when links are clicked.

### Accessibility Audits

- **Aria attributes**: Wires proper `role="dialog"`, `aria-modal="true"`, and `aria-label` closures on drawers/modals/close buttons. Attaches `aria-live="polite"` to toast notification stack.
- **Keyboard Navigation**: Interactive overlays support Escape key dismissals out of the box. Links and buttons support logical focus order.
- **Color Contrast**: Checked HSL tailored variables ensuring text/UI elements meet or exceed WCAG AA ratio standards (≥ 4.5:1 text, ≥ 3:1 components).

### E2E Tests (Playwright)

- **Config**: Configured sequential workers (1 worker) in `playwright.config.ts` to prevent race conditions during Supabase database writes.
- **Bypassed Rate Limiting**: Upgraded [rateLimiter.ts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/middleware/rateLimiter.ts) to permit up to 100 requests (instead of 5) for development and test environments to handle E2E traffic.
- **Tests**:
  1. `e2e/auth.spec.ts` — Verifies split-panel login page inputs, redirection to dashboard on login, profile name check, and sign-out redirect.
  2. `e2e/inventory.spec.ts` — Verifies navigating to catalog, opening Add Form, creating a new product, searching it, launching Actions menu, editing details, updating MRP price, and catalog refresh.
  3. `e2e/pricing.spec.ts` — Verifies bulk price editor navigation, inline price adjustment, pending counter summary, save changes, and counter reset.

### Verification Results

All 3 E2E tests ran and passed successfully in Playwright:
```
Running 3 tests using 1 worker
  ok 1 [chromium] › e2e\auth.spec.ts:4:3 › Authentication Flow › should login successfully as owner, view dashboard, and logout (2.6s)
  ok 2 [chromium] › e2e\inventory.spec.ts:4:3 › Inventory Flow › should login, add a new product, search for it, and edit it (8.4s)
  ok 3 [chromium] › e2e\pricing.spec.ts:4:3 › Pricing E2E Flow › should login, go to bulk pricing page, update a product price, and save (4.0s)

  3 passed (16.0s)
```



