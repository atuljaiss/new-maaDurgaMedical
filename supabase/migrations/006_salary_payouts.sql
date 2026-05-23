-- 006_salary_payouts.sql
-- Monthly computed salary payouts

CREATE TABLE salary_payouts (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              UUID          NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  month                DATE          NOT NULL,    -- always 1st of month
  base_salary          NUMERIC(12,2) NOT NULL,
  leave_days_in_month  NUMERIC(5,1)  NOT NULL DEFAULT 0,
  allowed_monthly_days NUMERIC(5,1)  NOT NULL,
  excess_days_in_month NUMERIC(5,1)  NOT NULL DEFAULT 0,
  deduction_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary           NUMERIC(12,2) NOT NULL,
  -- YTD informational fields
  leave_days_ytd       NUMERIC(5,1)  NOT NULL DEFAULT 0,
  allowed_yearly_days  NUMERIC(5,1)  NOT NULL,
  excess_days_ytd      NUMERIC(5,1)  NOT NULL DEFAULT 0,
  generated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (user_id, month),
  CONSTRAINT month_is_first_day CHECK (EXTRACT(DAY FROM month) = 1)
);

CREATE INDEX idx_salary_payouts_user_month ON salary_payouts (user_id, month DESC);
