-- 008_rls_profiles.sql
-- RLS policies for profiles table

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Employees can read only their own row (must be active)
CREATE POLICY "profiles: employee reads own"
  ON profiles FOR SELECT
  USING (user_id = auth.uid() AND is_active = TRUE);

-- Admin can read all profiles
CREATE POLICY "profiles: admin reads all"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admin can update any profile (role, is_active, name)
CREATE POLICY "profiles: admin updates all"
  ON profiles FOR UPDATE
  USING (is_admin());
