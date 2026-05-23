-- 014_functions_payroll.sql
-- Payroll business logic: days_in_month, preview, commit

-- Count of billable days in a month according to policy
CREATE OR REPLACE FUNCTION days_in_month_by_policy(p_month DATE)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT CASE
    WHEN lp.calendar_mode = 'all_days' THEN
      EXTRACT(DAY FROM
        date_trunc('month', p_month) + INTERVAL '1 month - 1 day'
      )::NUMERIC
    ELSE
      (SELECT COUNT(*)::NUMERIC
       FROM generate_series(
         date_trunc('month', p_month)::DATE,
         (date_trunc('month', p_month) + INTERVAL '1 month - 1 day')::DATE,
         '1 day'
       ) d
       WHERE EXTRACT(DOW FROM d)::INT = ANY(lp.working_days))
  END
  FROM leave_policy lp;
$$;

REVOKE EXECUTE ON FUNCTION days_in_month_by_policy FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION days_in_month_by_policy TO authenticated;

-- Payroll preview: returns one row per active employee with computed values
CREATE OR REPLACE FUNCTION generate_payroll_preview(p_month DATE)
RETURNS TABLE (
  user_id              UUID,
  full_name            TEXT,
  base_salary          NUMERIC,
  leave_days_in_month  NUMERIC,
  allowed_monthly_days NUMERIC,
  excess_days          NUMERIC,
  per_day_rate         NUMERIC,
  deduction_amount     NUMERIC,
  net_salary           NUMERIC,
  has_salary_record    BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    p.user_id,
    p.full_name,
    COALESCE(sh.amount, 0)                                          AS base_salary,
    approved_leave_days_in_month(p.user_id, p_month)                AS leave_days_in_month,
    lp.allowed_monthly_days,
    GREATEST(0,
      approved_leave_days_in_month(p.user_id, p_month) - lp.allowed_monthly_days
    )                                                               AS excess_days,
    COALESCE(sh.amount, 0) / NULLIF(days_in_month_by_policy(p_month), 0)
                                                                    AS per_day_rate,
    GREATEST(0,
      approved_leave_days_in_month(p.user_id, p_month) - lp.allowed_monthly_days
    ) * (COALESCE(sh.amount, 0) / NULLIF(days_in_month_by_policy(p_month), 0))
                                                                    AS deduction_amount,
    COALESCE(sh.amount, 0)
    - GREATEST(0,
        approved_leave_days_in_month(p.user_id, p_month) - lp.allowed_monthly_days
      ) * (COALESCE(sh.amount, 0) / NULLIF(days_in_month_by_policy(p_month), 0))
                                                                    AS net_salary,
    (sh.amount IS NOT NULL)                                         AS has_salary_record
  FROM profiles p
  CROSS JOIN leave_policy lp
  LEFT JOIN LATERAL (
    SELECT amount FROM salary_history
    WHERE user_id = p.user_id AND effective_from <= p_month
    ORDER BY effective_from DESC LIMIT 1
  ) sh ON TRUE
  WHERE p.role = 'employee' AND p.is_active = TRUE;
$$;

REVOKE EXECUTE ON FUNCTION generate_payroll_preview FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION generate_payroll_preview TO authenticated;

-- Commit payroll: upserts salary_payouts using preview results
-- Security: this is SECURITY DEFINER but RLS on salary_payouts guards the table
-- Only admin can actually call this successfully since it inserts into salary_payouts
-- which requires admin RLS policy
CREATE OR REPLACE FUNCTION commit_payroll(p_month DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can commit payroll';
  END IF;

  INSERT INTO salary_payouts (
    user_id, month, base_salary,
    leave_days_in_month, allowed_monthly_days, excess_days_in_month,
    deduction_amount, net_salary,
    leave_days_ytd, allowed_yearly_days, excess_days_ytd
  )
  SELECT
    pr.user_id, p_month, pr.base_salary,
    pr.leave_days_in_month, pr.allowed_monthly_days, pr.excess_days,
    pr.deduction_amount, pr.net_salary,
    approved_leave_days_ytd(pr.user_id, p_month),
    lp.allowed_yearly_days,
    GREATEST(0, approved_leave_days_ytd(pr.user_id, p_month) - lp.allowed_yearly_days)
  FROM generate_payroll_preview(p_month) pr
  CROSS JOIN leave_policy lp
  ON CONFLICT (user_id, month) DO UPDATE SET
    base_salary          = EXCLUDED.base_salary,
    leave_days_in_month  = EXCLUDED.leave_days_in_month,
    allowed_monthly_days = EXCLUDED.allowed_monthly_days,
    excess_days_in_month = EXCLUDED.excess_days_in_month,
    deduction_amount     = EXCLUDED.deduction_amount,
    net_salary           = EXCLUDED.net_salary,
    leave_days_ytd       = EXCLUDED.leave_days_ytd,
    allowed_yearly_days  = EXCLUDED.allowed_yearly_days,
    excess_days_ytd      = EXCLUDED.excess_days_ytd,
    generated_at         = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION commit_payroll FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION commit_payroll TO authenticated;
