-- 009_rls_leave_policy.sql
-- RLS policies for leave_policy table

ALTER TABLE leave_policy ENABLE ROW LEVEL SECURITY;

-- Any active authenticated user can read leave policy
CREATE POLICY "leave_policy: any active user reads"
  ON leave_policy FOR SELECT
  USING (is_active_user());

-- Only admin can update leave policy
CREATE POLICY "leave_policy: only admin updates"
  ON leave_policy FOR UPDATE
  USING (is_admin());
