# Purchases Review

Date: 2026-06-22
Scope: Purchases, Suppliers, Expenses only
Project reviewed: `C:\MANAS\Projects\LK\Implementation`

## What I verified

- The Purchases backend and frontend code exists and is wired into the app.
- `http://localhost:5000/api/v1/purchases` and `http://localhost:5000/api/v1/purchases/suppliers` return `401` without auth, which is expected.
- The Purchases code is part of the Phase 2 plan.
- Frontend lint reports real issues in Purchases files.

## Important limitation

I could not patch the actual project files from this Codex thread because the project is outside the writable workspace for this session.

## Flaws

### Critical

1. Purchase confirmation is not atomic.
   - The service creates the purchase order header, then updates each product, then writes stock logs, then inserts purchase items, then updates supplier balance in separate calls.
   - A failure in the middle can leave the order header saved while stock, prices, stock logs, items, and supplier balance are only partly updated.
   - File:
     - `backend/src/features/purchases/purchases.service.ts`

2. Product stock/price update failures are ignored during purchase confirmation.
   - Inside the item loop, product updates and stock log inserts are awaited but their errors are not checked before continuing.
   - The system can report success even if some products were not updated correctly.
   - File:
     - `backend/src/features/purchases/purchases.service.ts`

3. Cancelling a purchase order does not restore previous product prices.
   - Purchase items store `previous_cost` and `previous_sell`, but cancellation only decreases stock.
   - If a purchase order changed cost price or sell price, cancelling it leaves those product prices altered.
   - Files:
     - `backend/src/features/purchases/purchases.service.ts`
     - `migrations/020_create_purchase_orders.sql`

4. Purchase cancellation is also not atomic.
   - PO status update, stock reversal, stock logs, and supplier balance reversal all happen in separate writes.
   - A mid-step failure can leave cancelled orders with unreversed stock or unreversed supplier debt.
   - File:
     - `backend/src/features/purchases/purchases.service.ts`

5. Supplier repayments have no real audit trail.
   - The repayment route only decreases `suppliers.total_balance`; it does not insert any repayment record table or ledger entry.
   - That means there is no history of when, why, and by whom supplier payments were recorded.
   - File:
     - `backend/src/features/purchases/purchases.service.ts`
   - Related schema:
     - `migrations/019_create_suppliers.sql`

### High

6. Average purchase cost is not tracked, even though the Phase 2 verification expects it.
   - The code simply overwrites `products.cost_price` with the latest purchase cost.
   - The plan’s verification says average purchase cost should track correctly.
   - File:
     - `backend/src/features/purchases/purchases.service.ts`
   - Plan reference:
     - `docs/phase2_456_Stage_implementation_plan`

7. Backend payment validation is incomplete and can accept inconsistent purchase orders.
   - Schema only checks that partial payments are greater than zero.
   - It does not reject `amount_paid >= total`, overpayment, or bad combinations for `paid` and `credit`.
   - Frontend blocks some of this, but backend does not.
   - File:
     - `backend/src/features/purchases/purchases.schema.ts`

8. Supplier identity can drift between `supplier_id` and `supplier_name`.
   - The backend trusts `supplier_id` and `supplier_name` from the request together, without verifying they match the same supplier record.
   - A mismatched payload can create inconsistent snapshots and wrong stock-log notes.
   - File:
     - `backend/src/features/purchases/purchases.service.ts`

9. Purchase cancellation writes the wrong stock log reason.
   - It logs cancelled purchase orders using `reason: 'bill_cancel'`, which is a billing reason.
   - That pollutes stock audit semantics and makes stock logs ambiguous.
   - Files:
     - `backend/src/features/purchases/purchases.service.ts`
     - `migrations/023_update_stock_log_and_bill_number.sql`

10. Supplier repayment is not atomic either.
    - It reads supplier balance, computes a new value, and updates the supplier row only.
    - If this later grows to include repayment history, it will already need a transaction. Right now it already has race-condition risk under concurrent edits.
    - File:
      - `backend/src/features/purchases/purchases.service.ts`

### Medium

11. The frontend detail view depends on a second fetch because list rows are incomplete.
    - The purchases list opens a details modal from a summary row, then separately fetches the real item list using `usePurchaseDetail`.
    - This works, but it creates a brittle split view and a slower modal path than necessary.
    - File:
      - `frontend/src/features/purchases/PurchasesPage.tsx`

12. Expenses and purchase APIs are typed as `any` in key places.
    - This weakens validation at the frontend boundary and makes bad payloads easier to ship.
    - Files:
      - `frontend/src/features/purchases/purchases.api.ts`
      - `frontend/src/features/purchases/NewPurchaseForm.tsx`
      - `frontend/src/features/purchases/NewExpenseForm.tsx`
      - `frontend/src/features/purchases/PurchasesPage.tsx`

13. `SupplierSelect` has unstable effect-driven state synchronization.
    - Lint flags a synchronous `setQuery()` inside an effect and dependency instability around `suppliers`.
    - This can cause unnecessary rerenders and fragile selected-supplier display behavior.
    - File:
      - `frontend/src/features/purchases/SupplierSelect.tsx`

14. `purchases.types.ts` does not match the backend query/filter surface.
    - `PurchaseQuery` only exposes `search/page/limit`, but backend supports `supplier_id`, `date_from`, `date_to`, `payment_status`, and `status`.
    - `SupplierQuery` omits `active_only`.
    - This weakens the frontend’s ability to use or validate the real backend filtering behavior.
    - Files:
      - `frontend/src/types/purchases.types.ts`
      - `backend/src/features/purchases/purchases.schema.ts`

15. There is no visible automated coverage for Purchases flows.
    - No backend tests were found for purchase confirmation/cancellation, supplier repayment, or expenses.
    - No e2e tests were found for Purchases.
    - Paths reviewed:
      - `backend/tests`
      - `frontend/e2e`

## Recommended fix order

1. Make purchase confirmation transactional.
2. Make cancellation transactional and restore previous prices as well as stock.
3. Add proper supplier repayment history storage instead of balance-only mutation.
4. Fix backend payment validation for `paid`, `credit`, and `partial`.
5. Implement weighted-average cost logic if that is the intended business rule.
6. Fix stock-log semantics for cancelled purchase orders.
7. Tighten frontend typing and supplier selector state handling.
8. Add backend tests and one end-to-end purchase flow.

## Suggested concrete code changes

### Backend

- Move purchase confirmation into a single transaction or transactional RPC:
  - create `purchase_orders`
  - update product stock
  - update product prices
  - insert `purchase_order_items`
  - insert `stock_log`
  - update supplier balance
- On cancel:
  - restore stock
  - restore `cost_price`
  - restore `price` if changed
  - reverse supplier credit
  - do it all in one transaction
- Add strict schema rules:
  - `paid` -> `amount_paid === total`
  - `credit` -> `amount_paid === 0`
  - `partial` -> `0 < amount_paid < total`
  - reject overpayment
- Verify `supplier_id` matches the canonical supplier name when both are provided.
- Add a real supplier payment ledger table or equivalent audit record.
- Use a purchase-specific stock log reversal reason instead of `bill_cancel`.

### Frontend

- Replace `any` payloads with real purchase/expense input types.
- Expand `PurchaseQuery` and `SupplierQuery` types to match backend filters.
- Refactor `SupplierSelect` to avoid `setState` inside the sync effect.
- Consider returning richer PO list data or prefetching detail more cleanly for the modal.

## Verification that should exist after fixes

- Confirm purchase order increases stock and writes matching purchase items and stock logs.
- Confirm purchase order fails cleanly if any product update fails.
- Partial payment rejects zero, full-total, and over-total values on backend.
- Cancelling a purchase restores stock and previous product prices.
- Cancelling a purchase reverses supplier balance exactly once.
- Supplier repayments create an auditable history row and adjust outstanding balance.
- Expense creation works with and without linked suppliers.
- Purchases screen detail modal shows stable item data for every order.

