# LalaKirana: Money Flow, Expenses, and Financial Accountability Guide

LalaKirana implements an audit-compliant, transaction-secure, double-entry financial system. To prevent inventory leakage, register deficits, or debt calculation errors, all transaction operations are handled atomically via PostgreSQL Stored Procedures (RPCs).

---

## 1. High-Level Financial Topology

The shop's financial model is divided into three components: **Inward Flows** (direct POS sales and credit collections), **Outward Flows** (stock purchases, supplier repayments, and operational expenses), and **EOD Reconciliation** (balancing physical cash against database expectations).

```mermaid
graph TD
    %% Colors & Style
    classDef cash fill:#e6f4ea,stroke:#137333,stroke-width:2px,color:#137333;
    classDef credit fill:#fef7e0,stroke:#b06000,stroke-width:2px,color:#b06000;
    classDef expense fill:#fce8e6,stroke:#c5221f,stroke-width:2px,color:#c5221f;
    classDef system fill:#e8f0fe,stroke:#1a73e8,stroke-width:2px,color:#1a73e8;

    %% Inward Flows
    A["Customer Checkout (POS)"]:::system --> B{"Payment Status"}
    B -- "Paid (Cash/UPI)" --> C[("Immediate Revenue Ledger (Cash Drawer)")]:::cash
    B -- "Book to Khata" --> D["Customer Outstanding Debt (total_balance)"]:::credit

    D --> E["Customer Repayment Transaction"]:::system
    E --> C

    %% Outward Flows
    F["Shop Capital Outflows"]:::system --> G{"Expense Category"}
    G -- "Inbound Procurement" --> H{"PO Payment Status"}
    G -- "Operational Overhead" --> I[("Direct Cash Expense")]:::expense

    H -- "Paid (Cash/UPI)" --> J[("Cash Drawer Outflow")]:::expense
    H -- "Credit / Partial" --> K["Supplier Outstanding Debt (total_balance)"]:::credit

    K --> L["Supplier Repayment Transaction"]:::system
    L --> J
    I --> J
```

---

## 2. Inward Money Flow (POS Sales & Customer Ledgers)

All consumer-facing transactions flow through the POS billing system.

### A. Core Billing Schemas

* **`bills`**: Tracks each transaction header. Key fields:
  * `mode`: `'full'` (itemized stock checkout) or `'quick'` (cash register lump-sum override).
  * `status`: `'draft'` (temporary slot), `'paid'` (cash/UPI received), `'khata'` (unpaid debt booked to customer), or `'cancelled'`.
  * `total`: Calculated sum of items (GST/taxes are MRP-inclusive).
* **`bill_items`**: Tracks product quantities, unit prices, and cost prices at the moment of sale to lock in profit margin analytics regardless of future pricing changes.
* **`khata_entries`**: Ledger table documenting change.
  * `type = 'purchase'`: Increments outstanding debt.
  * `type = 'payment'`: Decrements outstanding debt.
  * `is_deleted`: Soft-delete flag (recalculated if a cancellation occurs).

### B. Transaction Workflows

#### 1. Atomic POS Checkout (`confirm_bill_transaction`)
When a cashier clicks "Pay" or "Book to Khata", a single database transaction handles the checkout to prevent race conditions (such as double-selling stock):

```sql
SELECT stock_qty FROM products WHERE id = v_product_id FOR UPDATE;
-- Locks product rows to prevent concurrent checkout conflicts.
-- Deducts stock: stock_qty = stock_qty - v_qty
-- Inserts bill_items and logs stock movement (reason = 'bill_confirm')
```
* **If Status is `'paid'`**: The cash drawer expected balance is updated immediately. No customer record is mandatory.
  * **Paid Customer Linking**: If a customer ledger account is linked to a paid-in-full bill, the system inserts two balanced `khata_entries` records (one `purchase` entry and one matching `payment` entry for the same amount). This documents the purchase history on the customer's account without changing their outstanding tab (`outstanding balance = ₹0.00`).
* **If Status is `'khata'`**: The customer account is locked (`FOR UPDATE`). A `khata_entries` row of type `'purchase'` is added, and the customer's `total_balance` is incremented.

#### 2. MRP & Customer Savings Model
To offer transparency and build customer loyalty, the inventory system supports a Maximum Retail Price (`mrp`) field:
* **Optional MRP**: Each product catalog item can carry an optional `mrp` value (`NUMERIC(10, 2)`).
* **Savings Calculation**: If the product's `mrp` is higher than its active retail selling `price`, the system computes savings:
  $$\text{Savings per Item} = \text{MRP} - \text{Selling Price}$$
* **Receipt Translation & Display**: On the generated receipt, overall savings are summed and displayed in English or Hindi depending on configuration:
  * **English**: `"You saved ₹X.XX (Y% off MRP)"`
  * **Hindi**: `"आपने ₹X.XX बचाए (MRP से Y% कम)"`

#### 3. Atomic Bill Cancellation (`cancel_bill_transaction`)
Only store `owners` can cancel confirmed bills. Cancelling triggers an atomic restoration script:
* Reverts bill status to `'cancelled'`.
* Restores item quantities back to product stock logs (`reason = 'bill_cancel'`).
* **If Khata Bill**: Customer balance is locked, the original `khata_entries` row is soft-deleted (`is_deleted = TRUE`), and the customer's `total_balance` is decremented (clamped to $\ge 0$).
* **If Paid Bill Linked to Customer**: Reverts both the `purchase` and `payment` entries.

#### 4. Customer Repayments (`log_repayment_transaction`)
When a credit customer returns to pay down their tab:
* Checks that the repayment amount does not exceed their current outstanding balance (`total_balance`).
* Inserts a record in `khata_entries` (`type = 'payment'`, `amount = repayment_amount`).
* Atomically decrements the customer's `total_balance` on `customers`.
* Registers a cash inflow in the daily system drawer balance.

---

## 3. Outward Money Flow (Procurement & Expenses)

Outward flows represent cash or credit allocated to acquire inventory or pay operational overhead.

### A. Procurement and Supplier ledgers

* **`suppliers`**: Tracks name, contact details, and their `total_balance` (the outstanding debt the shop owes this supplier).
* **`purchase_orders`**: Procurement transaction headers, carrying `payment_status` (`'paid'`, `'credit'`, or `'partial'`).
* **`purchase_order_items`**: Stores item count, cost price, and retail selling price. Features `previous_cost` and `previous_sell` snapshots to revert to original valuations if the order is cancelled.

### B. Transaction Workflows

#### 1. Purchase Order Confirmation (`confirm_purchase_order_transaction`)
Triggered during inbound stock logs:
* Sums total cost (`qty * cost_price`) across items.
* Updates product catalog parameters: increments `stock_qty`, updates `cost_price` to the new wholesale rate, and optionally updates `price` (retail price) if specified. Logs stock movement (`reason = 'purchase_order'`).
* **If credit/partial**: Locks the supplier record and increments the supplier's `total_balance` by the unpaid portion (`total - amount_paid`).

#### 2. Purchase Order Cancellation (`cancel_purchase_order_transaction`)
If a delivery is rejected or logged in error:
* Deducts the received items from product stock logs (`reason = 'purchase_cancel'`).
* Reverts product `cost_price` and retail `price` back to their snapshot states (`previous_cost` / `previous_sell`).
* Subtracts the unpaid portion of the PO from the supplier's outstanding `total_balance`.

#### 3. Supplier Repayments (`log_supplier_repayment_transaction`)
When the shop pays a supplier to settle accounts:
* Creates a transaction entry in `supplier_repayments`.
* Decrements the supplier's outstanding `total_balance` on `suppliers`.
* Decrements the cash register expectations.

### C. Direct Operational Expenses
Immediate cash outflows that bypass inventory (e.g., utility bills, packaging, rent, transport, or shop maintenance) are logged in the `expenses` table. Every expense decrements the cash drawer's EOD expectations.

---

## 4. Accountability Matrix: Inflow and Outflow of Every Rupee

To maintain absolute transparency, the database tracks how every transaction impacts the shop's money. Below is the ledger mapping showing where money comes from and where it goes:

| Transaction Type | Money Flow Direction | Cash Drawer Impact | Outstanding Balance Impact | System Audit Records |
| :--- | :---: | :---: | :---: | :--- |
| **POS Paid Checkout** (Cash/UPI) | **IN** (Inward) | + Increments Cash Drawer | *None* | `bills`, `bill_items` |
| **POS Khata Checkout** (Credit tab) | **IN** (Inward) | *None* | + Increments Customer Due | `bills`, `bill_items`, `khata_entries` (type='purchase') |
| **Customer Repayment** (Paying tab) | **IN** (Inward) | + Increments Cash Drawer | - Decrements Customer Due | `khata_entries` (type='payment') |
| **Inventory Inbound (Paid PO)** | **OUT** (Outward) | - Decrements Cash Drawer | *None* | `purchase_orders`, `purchase_order_items` |
| **Inventory Inbound (Credit PO)** | **OUT** (Outward) | *None* | + Increments Supplier Tab | `purchase_orders`, `purchase_order_items` |
| **Supplier Repayment** (Paying supplier) | **OUT** (Outward) | - Decrements Cash Drawer | - Decrements Supplier Tab | `supplier_repayments` |
| **Operational Expense** (Rent, bills) | **OUT** (Outward) | - Decrements Cash Drawer | *None* | `expenses` |

---

## 5. End-of-Day (EOD) Reconciliation

Accountability focuses on validating inventory levels and physical cash holdings to detect theft, billing omissions, or cash leakage.

### A. The Core Cash Reconciliation Model

The theoretical cash register balance at any given moment is calculated using the following mathematical model:

$$\text{Expected Cash} = \text{Opening Cash} + \text{Cash Sales} + \text{Khata Repayments} - \text{Cash Purchases} - \text{Supplier Repayments} - \text{Expenses}$$

To audit a cashier, the owner counts the physical cash at closing:

$$\text{Discrepancy} = \text{Physical Cash Count} - \text{Expected Cash}$$

* **$\text{Discrepancy} = 0$**: Balanced.
* **$\text{Discrepancy} < 0$**: **Cash Short** (indicating drawer leakage, theft, or missed bill logs).
* **$\text{Discrepancy} > 0$**: **Cash Over** (indicating customer overpayment or failure to record cash expenses).

### B. Daily Sales Diary (EOD) Sync

Because POS counter checkouts can be slow during rush hours, the shopkeeper can record sales on a paper ledger and digitize it at closing:
* **Entry**: `POST /api/v1/inventory/eod` contains a target date and an array of `{ product_id, qty_sold }`.
* **Stock Recalculation**: The system subtracts the sold quantities from `products.stock_qty` and inserts entries into `eod_entries`.
* **Correction Delta**: If a log is edited, the backend calculates the difference:
  $$\Delta = \text{new\_qty} - \text{old\_qty}$$
  The stock is adjusted by subtracting $\Delta$. (If $\Delta$ is negative, stock is restored; if positive, additional stock is deducted).
* **Reset/Clear Log**: If an entry or item is cleared, the system removes the database row and restores the original stock quantity back to the inventory (`reason = 'eod_entry'`, note: `"EOD sales entry removed"`).

---

## 6. Revenue vs. Profit Made Simple

Understanding store performance is easy when you break it down into four simple concepts: **Revenue**, **Wholesale Cost**, **Gross Profit**, and **Net Profit**.

```
   [ Customer Pays ₹100 ]
             │
             ├───► [ Cost of Goods: ₹75 ]  ───► (Wholesale paid to Suppliers)
             │
             └───► [ Gross Profit:  ₹25 ]
                       │
                       ├───► [ Expenses: ₹5 ] ───► (Rent, Electricity, Tea, Damaged items)
                       │
                       └───► [ Net Profit: ₹20 ] ───► (Your actual take-home earnings)
```

### 1. Revenue (Inflow)
* **What it is**: The total amount of money the cash drawer collects from sales. It is **not** the money you earned or can spend. It is just the gross transaction turnover.
* **Example**: You sell 10 packets of basmati rice at ₹100 each. Your **Revenue** is **₹1,000**.

### 2. Wholesale Cost (Cost of Goods Sold - COGS)
* **What it is**: The amount of money you paid to the supplier to buy the stock in the first place.
* **Example**: If each of those rice packets cost you ₹75 to buy from your distributor, the **Wholesale Cost** is **₹750**.

### 3. Gross Profit (Sales Markup)
* **What it is**: The markup left over from sales after subtracting what you paid for the items themselves:
  $$\text{Gross Profit} = \text{Revenue} - \text{Wholesale Cost}$$
* **Example**: ₹1,000 (Revenue) - ₹750 (Wholesale Cost) = **₹250** (Gross Profit).

### 4. Net Profit (Actual Earnings)
* **What it is**: The actual take-home money you made after paying all your operational bills (rent, helper salary, transport, electricity, or damaged items):
  $$\text{Net Profit} = \text{Gross Profit} - \text{Expenses}$$
* **Example**: If your operational expenses for that day (rent share, helper wage, electricity) sum up to ₹50, then your actual earnings are:
  ₹250 (Gross Profit) - ₹50 (Expenses) = **₹200** (Net Profit).

### What about Customer Savings (MRP Discounts)?
* If a packet of tea has an **MRP of ₹120**, but you sell it for **₹100 (Price)**:
  1. The customer gets **₹20 (17% off MRP)** in discounts.
  2. Your **Revenue** is **₹100** (the money the customer paid).
  3. Your profit is calculated using the selling price (**₹100**), not the MRP. If it cost you ₹85 to buy from the supplier, your profit is ₹15 (₹100 Price - ₹85 Cost). MRP is only used to compute customer savings; it does not affect store revenue or profit.

---

## 7. Profitability & Margin Accountability

All revenue and cost items aggregate into the analytics dashboard (`backend/src/features/analytics/analytics.service.ts`):

* **Revenue**: Calculated as:
  $$\text{Revenue} = \sum (\text{Bill Item Qty} \times \text{Unit Price}) + \sum (\text{Quick Bill Totals}) + \sum (\text{EOD Qty} \times \text{Product Price})$$
* **Wholesale Cost**: Calculated as:
  $$\text{Cost} = \sum (\text{Bill Item Qty} \times \text{Cost Price}) + \sum (\text{EOD Qty} \times \text{Cost Price})$$
* **Net Margin**: Calculated as:
  $$\text{Profit Margin} = \frac{\text{Revenue} - \text{Cost}}{\text{Revenue}} \times 100\%$$
* **Price Age Warning System**: To secure these margins on volatile grocery commodities (such as ghee, oils, dals, grains), the frontend monitors the price log timestamps (`price_history` table). If a category item has not had a price audit or update within 24 hours, the dashboard displays a warning flag (`⚠️ Price outdated`) to prevent sales at outdated cost rates.
