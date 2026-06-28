# My Professional Recommendations

After reviewing the full stack — from [billing store](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/billing/billingStore.ts) and [FullBillMode](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/billing/FullBillMode.tsx) to the [analytics service](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/analytics/analytics.service.ts) — here are my opinionated recommendations, designed to work well now **and** set you up for the Product Analytics system you're planning.

---

## Answers to the Open Questions

### 1. Discount Permissions → **Both, with limits**

| Role | Capability |
|------|------------|
| **Owner** | Unlimited discount — any amount, any product |
| **Staff** | Can apply discounts, but with a **max cap** (e.g., ₹50 per item or 10% per item) |

The cap should be configurable in **Settings** (the store settings table already exists). This way:
- Staff can handle regular customers independently without calling you every time
- But they can't give away ₹200 on a ₹500 item without your involvement
- Every discount gets logged with `created_by`, so you can audit who gave what

> [!TIP]
> For the future Product Analytics feature, this means you'll be able to see: _"Staff X gave ₹1,200 in discounts this week vs Staff Y gave ₹300"_ — useful for managing the team.

---

### 2. Discount Types → **₹ Flat only (for now)**

My recommendation: **Start with flat ₹ amount only.** Here's why:

- **Simpler for staff**: In a Kirana store, the mental model is _"₹5 off on almonds"_, not _"3.33% off"_
- **Cleaner data**: A flat amount stored per bill item is unambiguous — `discount = 20` means ₹20 off. Percent requires storing the computed value anyway
- **Faster billing**: One fewer toggle = faster checkout
- **Analytics-friendly**: Summing flat discounts is trivial; percent discounts need recomputation against the base price

If you later need percent discounts (e.g., for festival offers like "10% off dry fruits"), we can add it easily because the database field `discount` already stores the **computed ₹ amount** — the type just changes the input method.

**Data stored per bill_item:**
```
discount: 20.00       ← always stored as the ₹ amount
```

---

### 3. Loose Item Weight Entry → **Grams input + Quick buttons**

My recommendation: **Input in grams, but display and store in kg internally.**

```
┌──────────────────────────────────────────────────┐
│ Almonds (₹300/kg)                    ⚖️ Loose    │
│                                                  │
│ Weight: [  250  ] g                              │
│                                                  │
│  [50g] [100g] [250g] [500g] [1kg]               │
│                                                  │
│ Subtotal: ₹75.00                                │
└──────────────────────────────────────────────────┘
```

Why grams for input:
- Your staff thinks in **"250 gram ka packet"**, not "0.25 kg"
- No decimal point needed — type `250` instead of `0.250`
- Fewer input errors

Why kg internally:
- Purchase orders come in kg (50 kg almonds)
- Stock tracking stays consistent in one unit
- Math: `250g input → store as 0.250 kg → deduct from 50.000 kg stock`

On the **receipt**, display it human-readable:
- Under 1 kg → show grams: `Almonds (250g) ₹75.00`
- 1 kg or above → show kg: `Almonds (1.5kg) ₹450.00`

---

### 4. Stock Precision → **3 decimal places, but smart display**

Yes, track loose items at `DECIMAL(10,3)` — that gives you gram-level precision for kg-based items.

But **display** intelligently:
- EOD stock count for loose items: show a **gram input** (same as billing), not raw decimals
- Inventory page: `Stock: 49 kg 750g` instead of `49.750`
- Low stock alert: `⚠️ Only 2.5 kg remaining` 

For non-loose items (pcs, litre etc.), stock stays integer — no change needed.

---

### 5. Build Order → **Special Discounts first, then Loose Items**

My recommendation: **Build discounts first.** Here's why:

1. **Discounts are simpler** — they only add a field to the existing cart/bill flow. No fundamental data type changes.
2. **Discounts give immediate value** — you can start using them tomorrow for regular customers.
3. **Loose items need more schema changes** — `qty` going from `INTEGER` to `DECIMAL` touches the billing store, cart, receipt, stock deduction, EOD entries, and analytics. It's a bigger refactor.
4. **When we build loose items, discounts already work** — so the first time you bill a 250g packet of almonds, you can also discount it. Everything ships together.

**Proposed sequence:**
```
Phase 1: Special Discounts         (3-4 days)
  ├─ DB migration (bill_items.discount)
  ├─ Backend schema + service changes
  ├─ Cart UI (discount column)
  ├─ Checkout UI (discount summary)
  ├─ Receipt (discount line + combined savings)
  └─ Analytics integration

Phase 2: Loose/Bulk Items           (4-5 days)
  ├─ DB migration (products.is_loose, qty → decimal)
  ├─ Product form (is_loose toggle)
  ├─ Billing UI (weight input mode)
  ├─ Stock deduction (decimal)
  ├─ Receipt (weight display)
  └─ EOD/Inventory adjustments
```

---

## Future-Proofing for Product Analytics

You mentioned wanting a product analysis system with metrics like:
- Total discount given per product
- Revenue generated per product
- Quantity sold (today / 7d / 30d / custom)

Your existing [analytics service](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/analytics/analytics.service.ts) already aggregates by `product_id` in [getTopProducts](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/analytics/analytics.service.ts#L343-L434). Adding discount data to `bill_items` means we can extend that same pattern.

### What we need to store NOW to make analytics easy LATER

Here's the data model I recommend for `bill_items`, designed with analytics in mind:

```sql
-- bill_items table (enhanced)
ALTER TABLE bill_items ADD COLUMN discount        DECIMAL(10,2) DEFAULT 0;
-- ₹ amount discounted per unit

-- This is everything analytics needs per line item:
--   revenue        = qty × unit_price              (already have)
--   cost           = qty × cost_price              (already have)
--   discount_total = qty × discount                (NEW)
--   net_revenue    = qty × (unit_price - discount) (computed)
--   profit         = net_revenue - cost            (computed)
```

```sql
-- bills table (enhanced)
ALTER TABLE bills ADD COLUMN discount_total DECIMAL(10,2) DEFAULT 0;
-- Pre-computed sum of all item discounts for fast queries
```

> [!IMPORTANT]
> **Why store `discount_total` on both `bill_items` AND `bills`?**
> 
> The `bill_items.discount` is the source of truth (per-unit discount). The `bills.discount_total` is a **denormalized summary** for fast dashboard queries — instead of JOINing and summing every bill item, the overview query can just `SUM(discount_total)` from the bills table.

### What this enables in Product Analytics

With this schema, your future analytics queries become straightforward:

```
┌──────────────────────────────────────────────────────────────────┐
│ Product Analytics: Almonds                     [Today ▾] [7d] [30d]
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Revenue:       ₹12,450   (+8.2% vs prev period)                │
│ Qty Sold:      41.5 kg   (+12% vs prev period)                 │
│ Discount Given: ₹1,280   (across 23 bills)                     │
│ Avg Discount:  ₹31.22 per bill                                 │
│ Profit:        ₹4,170   (margin: 33.5%)                       │
│ Profit w/o disc: ₹5,450  ← what you'd earn at full price      │
│                                                                  │
│ Top discount givers:                                            │
│   Staff A: ₹780  (18 bills)                                    │
│   Owner:   ₹500  (5 bills)                                     │
└──────────────────────────────────────────────────────────────────┘
```

All of this comes from a single query:
```sql
SELECT
  bi.product_id,
  SUM(bi.qty) as total_qty,
  SUM(bi.qty * bi.unit_price) as gross_revenue,
  SUM(bi.qty * bi.discount) as total_discount,
  SUM(bi.qty * (bi.unit_price - bi.discount)) as net_revenue,
  SUM(bi.qty * bi.cost_price) as total_cost
FROM bill_items bi
JOIN bills b ON b.id = bi.bill_id
WHERE b.created_at BETWEEN $from AND $to
  AND b.status IN ('paid', 'khata')
GROUP BY bi.product_id;
```

### Changes to existing analytics service

Your current [TopProduct](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/analytics/analytics.service.ts#L30-L38) type would grow to include:

```diff
 interface TopProduct {
   product_id: string;
   product_name: string;
   category_name: string | null;
   totalRevenue: number;        // gross (before discount)
   totalCost: number;
   totalProfit: number;
   totalQty: number;
+  totalDiscount: number;       // sum of all discounts given
+  netRevenue: number;          // revenue after discounts
+  netProfit: number;           // net revenue - cost
+  discountBillCount: number;   // how many bills had a discount on this item
 }
```

This is a **backward-compatible** addition — existing analytics pages keep working with the same fields, and the new product analytics page uses the extra fields.

---

## Summary of Recommendations

| Question | Recommendation |
|----------|---------------|
| Discount permissions | Both roles — Staff with configurable cap, Owner unlimited |
| Discount type | ₹ Flat only (store computed amount; add % input later if needed) |
| Weight entry | Grams input + quick buttons; store/track in kg internally |
| Stock precision | `DECIMAL(10,3)` for loose items; smart display (kg + g) |
| Build order | **Discounts first** (Phase 1), then **Loose Items** (Phase 2) |
| Analytics prep | Store `discount` on `bill_items` + `discount_total` on `bills` |

> [!TIP]
> The key principle: **store granular data now, aggregate later.** Every discount, every weight, every `created_by` — all queryable. The analytics page is just a presentation layer on top of data you're already collecting.

---

Let me know if you agree with this approach, or if you'd like to adjust anything before I start building Phase 1 (Special Discounts)!
