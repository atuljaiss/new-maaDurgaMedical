-- 013_functions_leave.sql
-- Business logic functions for leave day calculations

-- Returns each approved leave day as a row with fraction (0.5 or 1.0)
-- Respects calendar_mode from leave_policy
CREATE OR REPLACE FUNCTION approved_leave_days_expanded(
  p_user_id UUID,
  p_from    DATE,
  p_to      DATE
)
RETURNS TABLE (day DATE, day_fraction NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  -- Single-day leaves
  SELECT
    lr.leave_date,
    CASE WHEN lr.is_half_day THEN 0.5 ELSE 1.0 END
  FROM leave_requests lr
  JOIN leave_policy lp ON TRUE
  WHERE lr.user_id = p_user_id
    AND lr.status  = 'approved'
    AND lr.leave_date IS NOT NULL
    AND lr.leave_date BETWEEN p_from AND p_to
    AND (
      lp.calendar_mode = 'all_days'
      OR EXTRACT(DOW FROM lr.leave_date)::INT = ANY(lp.working_days)
    )

  UNION ALL

  -- Range leaves — expand each day via generate_series
  SELECT
    gs::DATE,
    1.0
  FROM leave_requests lr
  JOIN leave_policy lp ON TRUE
  CROSS JOIN generate_series(lr.start_date, lr.end_date, '1 day') gs
  WHERE lr.user_id    = p_user_id
    AND lr.status     = 'approved'
    AND lr.start_date IS NOT NULL
    AND lr.start_date <= p_to
    AND lr.end_date   >= p_from
    AND gs::DATE BETWEEN p_from AND p_to
    AND (
      lp.calendar_mode = 'all_days'
      OR EXTRACT(DOW FROM gs)::INT = ANY(lp.working_days)
    );
$$;

REVOKE EXECUTE ON FUNCTION approved_leave_days_expanded FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION approved_leave_days_expanded TO authenticated;

-- Sum of approved leave days in a specific month
CREATE OR REPLACE FUNCTION approved_leave_days_in_month(
  p_user_id UUID,
  p_month   DATE
)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(SUM(day_fraction), 0)
  FROM approved_leave_days_expanded(
    p_user_id,
    date_trunc('month', p_month)::DATE,
    (date_trunc('month', p_month) + INTERVAL '1 month - 1 day')::DATE
  );
$$;

REVOKE EXECUTE ON FUNCTION approved_leave_days_in_month FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION approved_leave_days_in_month TO authenticated;

-- Sum of approved leave days year-to-date (Jan 1 through end of given month)
CREATE OR REPLACE FUNCTION approved_leave_days_ytd(
  p_user_id UUID,
  p_month   DATE
)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(SUM(day_fraction), 0)
  FROM approved_leave_days_expanded(
    p_user_id,
    date_trunc('year', p_month)::DATE,
    (date_trunc('month', p_month) + INTERVAL '1 month - 1 day')::DATE
  );
$$;

REVOKE EXECUTE ON FUNCTION approved_leave_days_ytd FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION approved_leave_days_ytd TO authenticated;
