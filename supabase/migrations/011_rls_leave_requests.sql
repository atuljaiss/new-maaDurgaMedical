-- 011_rls_leave_requests.sql
-- RLS policies for leave_requests table

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Employee can insert leave requests for themselves
CREATE POLICY "leave_requests: employee inserts own"
  ON leave_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_active_user());

-- Employee can read only their own leave requests
CREATE POLICY "leave_requests: employee reads own"
  ON leave_requests FOR SELECT
  USING (user_id = auth.uid() AND is_active_user());

-- Admin can read all leave requests
CREATE POLICY "leave_requests: admin reads all"
  ON leave_requests FOR SELECT
  USING (is_admin());

-- Admin can update leave requests (approve/reject)
CREATE POLICY "leave_requests: admin updates (approve/reject)"
  ON leave_requests FOR UPDATE
  USING (is_admin());
