# Feature Suggestions — Bulk/Loose Items & Special Discounts

After reviewing your full billing pipeline — from [Product types](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/types/product.types.ts), [billing store](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/billing/billingStore.ts), [FullBillMode](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/billing/FullBillMode.tsx), [BillConfirmDrawer](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/features/billing/BillConfirmDrawer.tsx), [ReceiptPreview](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/ui/ReceiptPreview.tsx), and the [backend billing service](file:///c:/MANAS/Projects/LK/Implementation/backend/src/features/billing/billing.service.ts) — here are my thoughts:

---

## Feature 1: Bulk/Loose Items (Custom Weight Packing)

### The Problem
You buy almonds, cashews, etc. in bulk (e.g., 50 kg). Then you repack them into custom weights (50g, 100g, 250g, etc.) and sell them at per-kg pricing. Today, your system treats every product as having a fixed `price` per `unit` and integer `qty` — there's no concept of selling fractional/custom weight portions of a bulk item.

### My Suggestion: "Weighed Item" Product Type

Rather than building a completely separate system, I suggest adding a **product flag** called `is_loose` (or `sell_by_weight`). When this flag is `true`:

#### How it would work

| Aspect | Current Behaviour | New Behaviour for Loose Items |
|--------|-------------------|-------------------------------|
| **Price** | Per piece / per kg (fixed qty) | Per kg (rate), customer picks weight |
| **Cart qty** | Integer (1, 2, 3…) | Decimal weight in grams/kg (e.g., `0.250` kg = 250g) |
| **Stock tracking** | Integer `stock_qty` | Decimal `stock_qty` in kg |
| **Bill line item** | `Almonds x 2` → ₹600 | `Almonds 250g` → ₹75 |

#### Data Model Changes

```diff
 // products table
+ is_loose       BOOLEAN DEFAULT false     -- sell-by-weight flag
  -- price already stores "per unit" price (₹/kg for loose items)
  -- stock_qty becomes DECIMAL instead of INT for loose items
  -- unit already supports 'kg', 'g' etc.
```

```diff
 // bill_items table
- qty            INTEGER
+ qty            DECIMAL(10,3)   -- allows 0.250, 1.500 etc.
```

#### UI Flow (Billing)

1. Staff searches for "Almonds" → product appears with a **weight badge** (e.g., `⚖️ Loose`)
2. Instead of +/- buttons, a **weight input** appears: `Enter weight (g):`  with quick buttons: `50g`, `100g`, `250g`, `500g`, `1kg`
3. The subtotal auto-calculates: `250g × ₹300/kg = ₹75.00`
4. On the receipt it prints: `Almonds (250g)  ₹75.00` instead of `Almonds x 1`

#### Stock Impact

When you receive 50kg of almonds via a Purchase Order, stock becomes `50.000 kg`. Each sale of 250g deducts `0.250`, so stock goes to `49.750 kg`.

> [!TIP]
> The per-customer "special pricing" you mentioned (discount for regulars) can be handled more elegantly through **Feature 2** below — the staff simply applies a per-item discount at billing time, rather than maintaining separate price lists per customer.

---

## Feature 2: Per-Item Special Discount at Checkout

### The Problem
Today, the Grand Total is calculated as a straight sum of `qty × unit_price` with no discount mechanism. You want the staff/admin to be able to:
- Pick specific items in the cart
- Apply a discount (₹ off or % off) on each
- See the total discount reflected in Grand Total and on the receipt

### My Suggestion: Per-Item `discount` field in the cart + bill

This is cleaner and more auditable than a flat "bill-level discount" because you can always trace *which* item got discounted and by how much.

#### Data Flow

```
Cart Item (before)                    Cart Item (after)
─────────────────                     ─────────────────
product_name: "Almonds"               product_name: "Almonds"
qty: 2                                qty: 2
unit_price: 300                       unit_price: 300
                                  +   discount: 20          ← ₹20 off per unit
                                  +   discount_type: 'flat'  ← or 'percent'
subtotal: 600                         subtotal: 560          ← (300-20) × 2
```

#### Data Model Changes

```diff
 // bill_items table
+ discount         DECIMAL(10,2) DEFAULT 0     -- discount per unit (₹ or %)
+ discount_type    TEXT DEFAULT 'flat'          -- 'flat' or 'percent'
```

```diff
 // bills table
+ discount_total   DECIMAL(10,2) DEFAULT 0     -- sum of all item discounts
```

#### UI Flow

##### In FullBillMode (cart table)
Add a small **discount column** next to each item:

```
┌──────────────┬─────┬────────┬──────────┬──────────┐
│ Product      │ Qty │ Rate   │ Discount │ Subtotal │
├──────────────┼─────┼────────┼──────────┼──────────┤
│ Almonds      │  2  │ ₹300   │ ₹20/unit │   ₹560   │
│ Tata Salt    │  1  │ ₹28    │   —      │   ₹28    │
│ Cashews      │  1  │ ₹450   │ 10%      │   ₹405   │
└──────────────┴─────┴────────┴──────────┴──────────┘
                              Total Discount: ₹85
                              Grand Total:    ₹993
```

Clicking the discount cell opens a small inline popover:
- **Amount (₹)** or **Percent (%)** toggle
- Input field for the value
- A reason/note field (optional, e.g., "regular customer", "festival offer")

##### In BillConfirmDrawer (checkout)
Show a discount summary row between items and Grand Total:

```
Bill Summary
──────────────────────────────
Almonds x 2                    ₹600.00
  └─ Discount: ₹20/unit       -₹40.00
Cashews x 1                    ₹450.00
  └─ Discount: 10%            -₹45.00
Tata Salt x 1                   ₹28.00
──────────────────────────────
Subtotal:                      ₹1,078.00
Total Discount:                 -₹85.00
──────────────────────────────
Grand Total:                    ₹993.00
```

##### On the Receipt
```
─────────────────────────────────
 Item        Qty   Rate   Total
─────────────────────────────────
 Almonds      2    ₹300   ₹560*
 Cashews      1    ₹450   ₹405*
 Tata Salt    1    ₹28    ₹28
─────────────────────────────────
 GRAND TOTAL              ₹993.00

 You saved: ₹127.00 (MRP savings + Special discount)
   ├─ MRP savings:       ₹42.00
   └─ Special discount:  ₹85.00
─────────────────────────────────
```

The receipt's existing "You saved" section (from [savings.ts](file:///c:/MANAS/Projects/LK/Implementation/frontend/src/shared/utils/savings.ts)) would be extended to include the special discount alongside MRP savings.

---

## How These Two Features Connect

For your bulk items use case: you don't need per-customer price lists. Instead:

1. **Add Almonds** as a loose item priced at ₹300/kg
2. When a regular customer comes, staff types **250g** → subtotal is ₹75
3. Staff clicks the discount button → applies ₹5 flat → final is ₹70
4. Receipt shows: `Almonds (250g) ₹70.00 — Special discount: ₹5.00`

This keeps the system simple — one price per product, discounts applied at billing time by authorized staff.

---

## Open Questions For You

> [!IMPORTANT]
> These decisions will shape the implementation. Please share your thoughts:

1. **Discount permissions**: Should only the **owner** be able to apply special discounts, or can staff also do it (perhaps with a max discount limit)?

2. **Discount types**: Do you need both **₹ flat** and **% percent** options, or would just one (flat ₹ amount) be enough for your use case?

3. **Loose item weight entry**: Should the weight input be in **grams** (easier for small quantities like 50g, 100g) or **kg** (with decimal like 0.250)? Or would you like quick buttons for common weights?

4. **Stock precision for loose items**: Are you okay with tracking stock in kg with 3 decimal places (e.g., `49.750 kg`)? This means EOD stock counts would also need to support decimals for these items.

5. **Priority**: Which feature would you like me to build first — the **Loose/Bulk Items** or the **Special Discounts**? Or should I build them together since they complement each other?
