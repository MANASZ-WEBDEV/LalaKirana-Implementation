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
