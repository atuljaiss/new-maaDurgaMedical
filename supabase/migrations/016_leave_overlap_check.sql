-- 016_leave_overlap_check.sql
-- Ensures an employee cannot apply for multiple overlapping leaves (unless rejected).

CREATE OR REPLACE FUNCTION check_leave_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_start DATE;
  v_new_end   DATE;
  v_conflict_exists BOOLEAN;
BEGIN
  -- Determine the effective date range for the incoming request
  IF NEW.leave_date IS NOT NULL THEN
    v_new_start := NEW.leave_date;
    v_new_end   := NEW.leave_date;
  ELSE
    v_new_start := NEW.start_date;
    v_new_end   := NEW.end_date;
  END IF;

  -- Check for any overlapping pending or approved leaves for this user
  SELECT EXISTS (
    SELECT 1
    FROM leave_requests
    WHERE user_id = NEW.user_id
      AND id != COALESCE(NEW.id, -1) -- Exclude the current row if it's an update
      AND status IN ('pending', 'approved')
      -- Overlap logic: A overlaps B if (A.start <= B.end AND A.end >= B.start)
      AND (
        (leave_date IS NOT NULL AND leave_date <= v_new_end AND leave_date >= v_new_start)
        OR
        (start_date IS NOT NULL AND start_date <= v_new_end AND end_date >= v_new_start)
      )
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RAISE EXCEPTION 'You already have a pending or approved leave request for this date range. Please update or cancel your existing request instead of creating a new one.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_leave_overlap ON leave_requests;

CREATE TRIGGER trigger_check_leave_overlap
  BEFORE INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_leave_overlap();
