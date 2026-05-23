-- 015_realtime.sql
-- Enable Realtime only on leave_requests (NOT on salary tables per security spec)

ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
