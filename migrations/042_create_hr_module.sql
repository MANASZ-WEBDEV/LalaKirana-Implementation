-- Migration 042: Create HR Module tables
-- Lightweight HR system for managing employee profiles, daily attendance,
-- salary records, and salary advance payments.
-- Supports both system users (linked via user_id) and physical workers (standalone).

-- ═══ Employee Master ═══════════════════════════════════════════════════════

CREATE TABLE employees (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES users(id) ON DELETE SET NULL,
  -- NULL = physical worker (no system access)
  -- Linked = system user (counter staff, owner)

  -- Personal Details
  name                   TEXT NOT NULL,
  phone                  TEXT,
  address                TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  date_of_joining        DATE NOT NULL DEFAULT CURRENT_DATE,
  date_of_leaving        DATE,                    -- NULL = currently employed
  is_active              BOOLEAN NOT NULL DEFAULT true,

  -- Role
  designation            TEXT,                     -- 'Counter Staff', 'Helper', 'Cleaner', etc.
  employment_type        TEXT NOT NULL DEFAULT 'full_time',
  -- 'full_time' | 'part_time' | 'daily_wage'

  -- Salary
  salary_type            TEXT NOT NULL DEFAULT 'monthly',
  -- 'monthly' | 'daily'
  salary_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- monthly: fixed salary per month
  -- daily: per day wage

  -- Schedule
  works_sunday           BOOLEAN NOT NULL DEFAULT false,
  works_saturday         BOOLEAN NOT NULL DEFAULT true,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by user linkage
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_active  ON employees(is_active);

-- ═══ Attendance ═════════════════════════════════════════════════════════════

CREATE TABLE attendance (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id            UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date                   DATE NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'present',
  -- 'present' | 'absent' | 'half_day' | 'holiday'
  note                   TEXT,                     -- 'Sick leave', 'Festival', 'Family function'
  marked_by              UUID REFERENCES users(id),
  marked_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(employee_id, date)                        -- one record per employee per day
);

CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date DESC);
CREATE INDEX idx_attendance_date          ON attendance(date DESC);

-- ═══ Salary Records ════════════════════════════════════════════════════════

CREATE TABLE salary_records (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id            UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_month           INTEGER NOT NULL,         -- 1-12
  period_year            INTEGER NOT NULL,
  working_days           INTEGER NOT NULL,         -- total working days in period
  present_days           INTEGER NOT NULL,         -- days actually present
  absent_days            INTEGER NOT NULL,         -- working_days - present_days
  half_days              INTEGER NOT NULL DEFAULT 0,
  gross_salary           NUMERIC(10,2) NOT NULL,   -- manually entered gross amount
  deductions             NUMERIC(10,2) NOT NULL DEFAULT 0, -- manually entered deductions
  advances_deducted      NUMERIC(10,2) NOT NULL DEFAULT 0, -- advances recovered this month
  net_salary             NUMERIC(10,2) NOT NULL,   -- gross - deductions - advances
  paid                   BOOLEAN NOT NULL DEFAULT false,
  paid_at                TIMESTAMPTZ,
  paid_by                UUID REFERENCES users(id),
  note                   TEXT,
  is_locked              BOOLEAN NOT NULL DEFAULT false,
  -- Set to true after payment is marked to prevent retroactive editing

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(employee_id, period_month, period_year)
);

CREATE INDEX idx_salary_employee
  ON salary_records(employee_id, period_year DESC, period_month DESC);

-- ═══ Salary Advance Payments ═══════════════════════════════════════════════

CREATE TABLE salary_advance_payments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id            UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount                 NUMERIC(10,2) NOT NULL,
  given_on               DATE NOT NULL DEFAULT CURRENT_DATE,
  note                   TEXT,                     -- 'Medical emergency', 'Festival advance'
  recovered              BOOLEAN NOT NULL DEFAULT false,
  -- false = outstanding, true = deducted from salary
  recovered_in_month     INTEGER,
  recovered_in_year      INTEGER,
  given_by               UUID REFERENCES users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advances_employee
  ON salary_advance_payments(employee_id, created_at DESC);
CREATE INDEX idx_advances_outstanding
  ON salary_advance_payments(employee_id, recovered) WHERE recovered = false;

-- ═══ Row-Level Security ═════════════════════════════════════════════════════

-- Employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and master can manage employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role IN ('owner', 'master')
    )
  );

-- Attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and master can manage attendance"
  ON attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role IN ('owner', 'master')
    )
  );

-- Salary records table
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and master can manage salary records"
  ON salary_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role IN ('owner', 'master')
    )
  );

-- Salary advance payments table
ALTER TABLE salary_advance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and master can manage salary advances"
  ON salary_advance_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role IN ('owner', 'master')
    )
  );
