-- 001_enums.sql
-- Create custom enum types for the HR portal

CREATE TYPE user_role     AS ENUM ('admin', 'employee');
CREATE TYPE leave_status  AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE half_day_part AS ENUM ('AM', 'PM');
CREATE TYPE calendar_mode AS ENUM ('all_days', 'working_days');
