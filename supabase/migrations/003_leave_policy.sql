-- 003_leave_policy.sql
-- Single-row global leave policy table

CREATE TABLE leave_policy (
  id                   INT PRIMARY KEY DEFAULT 1,
  allowed_monthly_days NUMERIC(5,1)  NOT NULL DEFAULT 4.0,
  allowed_yearly_days  NUMERIC(5,1)  NOT NULL DEFAULT 24.0,
  calendar_mode        calendar_mode NOT NULL DEFAULT 'working_days',
  working_days         INT[]         NOT NULL DEFAULT '{1,2,3,4,5,6}',
  -- 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  -- Default: Mon-Sat
  currency             TEXT          NOT NULL DEFAULT 'INR',
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TRIGGER leave_policy_updated_at
  BEFORE UPDATE ON leave_policy
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the one and only policy row
INSERT INTO leave_policy DEFAULT VALUES;
