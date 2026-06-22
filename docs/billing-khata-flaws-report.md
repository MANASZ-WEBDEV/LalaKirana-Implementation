# Billing and Khata Review

Date: 2026-06-22
Scope: Billing and Khata only
Project reviewed: `C:\MANAS\Projects\LK\Implementation`

## What I verified

- The Billing and Khata backend/frontend code exists and is wired into the app.
- `http://localhost:5173` responded successfully.
- `http://localhost:5000` responded successfully.
- Billing and Customers endpoints returned `401` without auth, which is expected.
- Frontend and backend TypeScript checks passed with `--noEmit`.
- Frontend lint reported real issues in Billing/Khata files.

## Important limitation

I could not patch the actual project files from this Codex thread because the project is outside the writable workspace for this session.

## Flaws

### Critical

1. Khata bills can be confirmed without a real customer ledger link.
   - Backend accepts `customer_name` without requiring a resolved `customer_id`.
   - If lookup fails, the bill is still created as `khata` but no `khata_entries` row or balance update happens.
   - Files:
     - `backend/src/features/billing/billing.schema.ts`
     - `backend/src/features/billing/billing.service.ts`

2. Billing confirmation is not atomic.
   - Bill creation, bill items insertion, stock deduction, stock log insert, Khata insert, and customer balance update all happen as separate calls.
   - A failure in the middle can leave the database inconsistent.
   - File:
     - `backend/src/features/billing/billing.service.ts`

3. Stock deduction failures are ignored.
   - The result of the stock decrement call is not enforced before writing stock logs and returning success.
   - File:
     - `backend/src/features/billing/billing.service.ts`

4. Overselling is allowed.
   - The fallback stock logic clamps quantity to zero instead of rejecting insufficient stock.
   - The UI also allows increasing quantity beyond available stock.
   - Files:
     - `backend/src/features/billing/billing.service.ts`
     - `frontend/src/features/billing/FullBillMode.tsx`
     - `frontend/src/shared/ui/ProductSearch.tsx`
     - `frontend/src/features/billing/billingStore.ts`

5. Khata repayment is not atomic.
   - Repayment ledger insert and customer balance decrement are separate writes.
   - File:
     - `backend/src/features/khata/khata.service.ts`

### High

6. The immediate receipt after confirm can be incomplete for full bills.
   - Confirm returns the raw bill row, not enriched bill items/customer fields.
   - Receipt preview expects item rows.
   - Files:
     - `frontend/src/features/billing/BillConfirmDrawer.tsx`
     - `frontend/src/shared/ui/ReceiptPreview.tsx`
     - `backend/src/features/billing/billing.service.ts`

7. Bill history search does not search customer names.
   - UI says it searches bill number or customer.
   - Backend only searches bill number and note.
   - Files:
     - `frontend/src/features/billing/BillHistoryDrawer.tsx`
     - `backend/src/features/billing/billing.service.ts`

8. Paid-bill customer unlinking is misleading.
   - Removing the selected customer in the drawer does not clear the slot customer fields.
   - A bill can still be linked after the user thinks it was removed.
   - Files:
     - `frontend/src/features/billing/BillConfirmDrawer.tsx`
     - `frontend/src/features/billing/billingStore.ts`

9. Manual customer typing can leave a stale customer id attached to a different name.
   - `setCustomer(slot.customerId, e.target.value)` keeps the old id while changing the displayed name.
   - Files:
     - `frontend/src/features/billing/FullBillMode.tsx`
     - `frontend/src/features/billing/QuickBillMode.tsx`
     - `frontend/src/features/billing/billingStore.ts`

### Medium

10. `CustomerProfile` violates the Rules of Hooks.
    - Hook calls happen after an early return when `id` is missing.
    - File:
      - `frontend/src/features/khata/CustomerProfile.tsx`

11. `CustomerSearch` accesses a ref during render unnecessarily.
    - Lint flags this as unsafe/brittle.
    - File:
      - `frontend/src/shared/ui/CustomerSearch.tsx`

12. There is no meaningful automated coverage for Billing/Khata flows.
    - No backend tests for billing confirm/cancel or Khata repayment/statement.
    - No e2e tests for Billing or Khata flows.
    - Paths reviewed:
      - `backend/tests`
      - `frontend/e2e`

## Recommended fix order

1. Make Billing confirm fail unless Khata has a valid `customer_id`.
2. Move Billing confirm and cancel into transactional server-side logic.
3. Enforce stock availability on both backend and frontend.
4. Make Khata repayment transactional.
5. Return enriched bill detail after confirmation, or re-fetch bill detail before showing receipt.
6. Fix drawer/customer state bugs.
7. Fix hook/lint issues.
8. Add backend tests and one end-to-end Billing + Khata path.

## Suggested concrete code changes

### Backend

- In billing validation/service:
  - Require a resolved `customer_id` for `status === 'khata'`.
  - Reject confirmation if customer lookup fails.
- Replace multi-step write chains with a transactional RPC or a single server-side transaction path.
- On stock decrement:
  - Fail if requested quantity exceeds available stock.
  - Do not insert `stock_log` unless stock update succeeds.
- On cancel:
  - Reverse stock and Khata inside one transaction.
- On repayment:
  - Insert repayment and update `customers.total_balance` in one transaction.
- In bill history:
  - Join/search customer name as part of filter logic.

### Frontend

- In `FullBillMode`:
  - Block quantity increase beyond `stock_qty`.
  - Prevent checkout when any line exceeds stock.
- In `ProductSearch`:
  - Disable or hide out-of-stock items from selection.
- In `BillConfirmDrawer`:
  - For Khata, require selected/created customer account, not just typed text.
  - When unlinking a customer, clear both selected state and slot state.
  - After confirm, fetch bill detail before rendering receipt.
- In slot state:
  - When user manually types customer text, clear `customerId`.
- In `CustomerProfile`:
  - Move the `!id` handling below stable hook setup or use an enabled flag pattern.
- In `CustomerSearch`:
  - Remove render-time `containerRef.current` access.

## Verification that should exist after fixes

- Full paid bill reduces stock and creates stock log.
- Full paid bill fails cleanly when stock is insufficient.
- Khata bill cannot confirm without a real customer account.
- Khata bill creates ledger row and updates customer balance.
- Cancelled Khata bill reverses both stock and ledger balance.
- Repayment decreases balance and creates payment ledger row together.
- Receipt preview after confirm shows item rows.
- Bill history search finds bills by customer name.

