-- 012_rls_salary_payouts.sql
-- RLS policies for salary_payouts table

ALTER TABLE salary_payouts ENABLE ROW LEVEL SECURITY;

-- Employee can read only their own salary payouts
CREATE POLICY "salary_payouts: employee reads own"
  ON salary_payouts FOR SELECT
  USING (user_id = auth.uid() AND is_active_user());

-- Admin has full access to salary_payouts
CREATE POLICY "salary_payouts: admin full access"
  ON salary_payouts FOR ALL
  USING (is_admin());
