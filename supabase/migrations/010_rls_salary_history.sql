-- 010_rls_salary_history.sql
-- RLS policies for salary_history table

ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;

-- Employee can read only their own salary history
CREATE POLICY "salary_history: employee reads own"
  ON salary_history FOR SELECT
  USING (user_id = auth.uid() AND is_active_user());

-- Admin has full access to salary_history
CREATE POLICY "salary_history: admin full access"
  ON salary_history FOR ALL
  USING (is_admin());
