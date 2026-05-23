-- 017_leave_auto_upgrade_and_delete.sql
-- 1. Adds auto-upgrade logic from half-day to full-day leaves
-- 2. Adds RLS policy to allow users to delete their own pending leave requests

-- Allow employee to delete their own pending leave request
CREATE POLICY "leave_requests: employee deletes own pending"
  ON leave_requests FOR DELETE
  USING (user_id = auth.uid() AND is_active_user() AND status = 'pending');

-- Recreate trigger function to handle the upgrade case
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
  v_upgrade_target_id BIGINT;
BEGIN
  -- Determine the effective date range for the incoming request
  IF NEW.leave_date IS NOT NULL THEN
    v_new_start := NEW.leave_date;
    v_new_end   := NEW.leave_date;
  ELSE
    v_new_start := NEW.start_date;
    v_new_end   := NEW.end_date;
  END IF;

  -- SPECIAL CASE: If this is an INSERT for a full single day leave, check if there's a half-day we can upgrade
  IF TG_OP = 'INSERT' AND NEW.leave_date IS NOT NULL AND NEW.is_half_day = FALSE THEN
    SELECT id INTO v_upgrade_target_id
    FROM leave_requests
    WHERE user_id = NEW.user_id
      AND leave_date = NEW.leave_date
      AND is_half_day = TRUE
      AND status IN ('pending', 'approved')
    LIMIT 1;

    IF FOUND THEN
      -- Upgrade the existing half-day leave to a full-day pending leave
      UPDATE leave_requests
      SET is_half_day = FALSE,
          half_day_part = NULL,
          status = 'pending',
          admin_comment = NULL,
          reason = COALESCE(NEW.reason, reason),
          updated_at = now()
      WHERE id = v_upgrade_target_id;

      -- Cancel the original insert since we merged it
      RETURN NULL;
    END IF;
  END IF;

  -- Standard overlap check
  SELECT EXISTS (
    SELECT 1
    FROM leave_requests
    WHERE user_id = NEW.user_id
      AND id != COALESCE(NEW.id, -1) -- Exclude the current row if it's an update
      AND status IN ('pending', 'approved')
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
