-- 004_salary_history.sql
-- Salary history tracking for each employee

CREATE TABLE salary_history (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID          NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency       TEXT          NOT NULL DEFAULT 'INR',
  effective_from DATE          NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (user_id, effective_from)
);

CREATE INDEX idx_salary_history_user_date ON salary_history (user_id, effective_from DESC);
