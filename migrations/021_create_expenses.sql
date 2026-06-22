-- ============================================================
-- LalaKirana — Migration 021
-- Table: expenses
-- Non-inventory operational costs (packaging, transport, etc.)
-- ============================================================

CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  -- optional: who was paid for this expense
  category      TEXT NOT NULL DEFAULT 'other',
  -- 'packaging' | 'transport' | 'maintenance' | 'utilities' | 'other'
  amount        NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description   TEXT,
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date     ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_supplier ON expenses(supplier_id) WHERE supplier_id IS NOT NULL;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage expenses"
  ON expenses FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  expenses           IS 'Non-inventory operational costs — packaging, transport, etc.';
COMMENT ON COLUMN expenses.category  IS 'packaging | transport | maintenance | utilities | other';
