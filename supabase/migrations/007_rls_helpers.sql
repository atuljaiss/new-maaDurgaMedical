-- 007_rls_helpers.sql
-- Helper functions for RLS policies (SECURITY DEFINER to bypass RLS when checking)

-- Returns true if the calling user has an active profile
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND is_active = TRUE
  );
$$;

-- Returns true if the calling user is an active admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = TRUE
  );
$$;
