-- 005_leave_requests.sql
-- Leave requests with support for single-day (optional half-day) and date-range

CREATE TABLE leave_requests (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID          NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,

  -- Single-day leave
  leave_date    DATE,
  is_half_day   BOOLEAN       NOT NULL DEFAULT FALSE,
  half_day_part half_day_part,

  -- Range leave
  start_date    DATE,
  end_date      DATE,

  reason        TEXT,
  status        leave_status  NOT NULL DEFAULT 'pending',

  admin_comment TEXT,
  decided_by    UUID REFERENCES profiles(user_id),
  decided_at    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Exactly one of single-day or range must be specified
  CONSTRAINT leave_type_exclusive CHECK (
    (leave_date IS NOT NULL AND start_date IS NULL AND end_date IS NULL)
    OR
    (leave_date IS NULL AND start_date IS NOT NULL AND end_date IS NOT NULL)
  ),
  -- Half-day is only valid for single-day leaves
  CONSTRAINT half_day_only_on_single CHECK (
    is_half_day = FALSE OR leave_date IS NOT NULL
  ),
  -- Range end must be >= start
  CONSTRAINT range_end_after_start CHECK (
    start_date IS NULL OR end_date >= start_date
  )
);

CREATE INDEX idx_leave_requests_user    ON leave_requests (user_id, created_at DESC);
CREATE INDEX idx_leave_requests_status  ON leave_requests (status);
CREATE INDEX idx_leave_requests_dates   ON leave_requests (leave_date, start_date, end_date);

CREATE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
