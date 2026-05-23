## Tech Doc — Employee Leave + Salary (Supabase + React)

### 1) Overview
A minimal HR/leave + salary system for small businesses with **two roles**:

- **Admin (store owner)**: manages leave policy, approves leave requests, generates monthly salary payouts with deduction for excess leave.
- **Employee**: applies for leave (single day/half-day or multi-day range) and views salary payouts.

**Backend**: Supabase (Postgres + Auth + RLS)  
**Frontend**: React + Vite + TypeScript (Tailwind/shadcn optional)  
**No server** in v1: all privileged operations happen from the admin UI and are protected by **RLS**.

> v1 does NOT implement employee self "clock in/out". We assume employees work by default; only approved leaves affect salary beyond allowed limits.

---

### 2) Goals & Non-Goals

#### Goals
- Secure data separation using **RLS**, not frontend checks.
- Minimal tables and predictable workflows.
- Leave counting supports:
  - single day full
  - single day half (AM/PM)
  - multi-day range (full days)
- Salary payout generation:
  - monthly leave allowance with pro-rated salary deduction for excess leave
  - yearly allowance tracked for information only (v1)

#### Non-Goals (v1)
- No employee clock-in/clock-out.
- No admin creation of Supabase Auth users inside the UI (requires Edge Function/service role).
- No complex holiday calendars; admin chooses whether leave counting uses all days or selected working weekdays.

---

### 3) High-Level Architecture

#### Components
1. **Supabase Auth**
   - Email/password authentication
2. **Supabase Postgres**
   - Stores profiles, leave requests, salary history, policy, payouts
3. **Row Level Security (RLS) Policies**
   - Enforce role-based access and user scoping (`auth.uid()`)
4. **React Frontend**
   - Role-based routing
   - Admin pages: policy, approvals, payroll generation
   - Employee pages: leave apply/view, salary payouts

#### Trust boundaries
- Frontend uses **anon key only**
- All sensitive access is enforced by RLS:
  - employees can only read their own rows
  - admin can read/write across employees

---

### 4) Data Model

#### 4.1 `profiles`
Maps `auth.users` to app roles and employment state.

**Key fields**
- `user_id (uuid)` PK, FK to `auth.users(id)`
- `role` enum: `admin | employee`
- `full_name`
- `employee_code` (optional)
- `is_active` boolean (soft-disable access)

**Purpose**
- Determine authorization and routing.
- `is_active=false` blocks reads via RLS (recommended pattern).

---

#### 4.2 `leave_policy` (single-row config)
Stores global settings used for leave counting and payroll.

**Key fields**
- `allowed_monthly_days numeric` (e.g., 4.0)
- `allowed_yearly_days numeric` (info in v1)
- `calendar_mode enum`: `all_days | working_days`
- `working_days int[]` (0=Sun..6=Sat). Example Mon–Sat = `[1,2,3,4,5,6]`
- `currency`

**Purpose**
- Centralize allowance + counting rules.

---

#### 4.3 `salary_history`
Tracks base salary changes over time.

**Key fields**
- `user_id`
- `amount` (monthly base)
- `currency`
- `effective_from` (date)

**Purpose**
- Base salary used for payroll generation.
- Audit-friendly salary changes.

---

#### 4.4 `leave_requests`
Stores leave requests; supports:
- single-date leave, optionally half-day
- date-range leave (multi-day), full days only

**Key fields**
- `user_id`
- `leave_date` (single day) OR `start_date/end_date` (range)
- `is_half_day` + `half_day_part` (`AM|PM`)
- `reason`
- `status`: `pending|approved|rejected`
- admin decision metadata: `admin_comment`, `decided_by`, `decided_at`

**Constraints**
- Exactly one of:
  - `(leave_date is not null)` OR `(start_date and end_date not null)`
- Half-day only allowed if `leave_date` is used.

---

#### 4.5 `salary_payouts`
Monthly computed output (net salary) visible to employee.

**Key fields**
- `user_id`
- `month` (first day of month)
- `base_salary`
- `leave_days_in_month`
- `allowed_monthly_days`
- `excess_days_in_month`
- `deduction_amount`
- `net_salary`
- plus YTD informational fields:
  - `leave_days_ytd`, `allowed_yearly_days`, `excess_days_ytd`

**Purpose**
- Monthly results employees can see.
- Salary page stays simple and auditable.

---

### 5) Authorization Model (RLS)

#### Roles
- `admin`: full access across all employees, can update policy and generate payouts
- `employee`: can only access own records

#### Core RLS rules
- `profiles`: employee can read own; admin can read all. Admin can update role/is_active for others.
- `leave_policy`: all authenticated active users can read; only admin can update.
- `leave_requests`: employee can insert/read own; admin can update status and read all.
- `salary_history`: employee can read own; admin can insert/update all.
- `salary_payouts`: employee reads own; admin inserts/updates all.

#### Inactive user handling
Most policies include an `is_active_user()` check. When admin sets `profiles.is_active=false`, the user can still authenticate but cannot read app tables (blocked by RLS).

---

### 6) Business Logic

#### 6.1 Leave counting
Only **approved** leave requests count toward deduction.

Counting rules:
- Half-day = 0.5
- Full day = 1.0
- Range leave expands day-by-day using `generate_series(start_date,end_date,'1 day')`
- Calendar filter:
  - `all_days`: count every date
  - `working_days`: count only days whose weekday matches `working_days[]`

Implemented by SQL functions:
- `approved_leave_days_expanded(user_id, from, to)` -> `(day, day_fraction)`
- `approved_leave_days_in_month(user_id, month)` -> `numeric`
- `approved_leave_days_ytd(user_id, month)` -> `numeric` (informational)

---

#### 6.2 Payroll generation (v1)
**Deduction is monthly-only**.

For each employee and chosen month:
1. Determine base monthly salary (latest from `salary_history`)
2. Compute `leave_in_month`
3. `excess = max(0, leave_in_month - allowed_monthly_days)`
4. Determine `days_in_month_by_policy(month)`:
   - `all_days`: calendar day count (28–31)
   - `working_days`: count weekdays that match `working_days[]`
5. `per_day_rate = base_salary / days_in_month_by_policy`
6. `deduction_amount = excess * per_day_rate`
7. `net_salary = base_salary - deduction_amount`
8. Upsert into `salary_payouts(user_id, month)`

Yearly allowance is computed and stored as informational fields only.

---

### 7) Frontend Routing & UX

#### Routes (minimum)
- `/login`
- Employee:
  - `/employee/leaves`
  - `/employee/salary`
- Admin:
  - `/admin/policy`
  - `/admin/leaves` (approve/reject)
  - `/admin/payroll` (generate payouts)

#### Role-based navigation
After login:
- fetch `profiles` for current user
- if `role=admin` -> admin routes
- if `role=employee` -> employee routes
- if `is_active=false` -> unauthorized screen

---

### 8) Operational Flows

#### Employee: apply leave
1. Select type:
   - Single day → optional half-day (AM/PM)
   - Range → start_date/end_date (full days)
2. Submit → creates `leave_requests` with status `pending`
3. Employee can view their requests and statuses

#### Admin: approve/reject leave
1. View pending requests
2. Approve/reject + optional comment
3. Status updates; impacts leave counting for payroll

#### Admin: set policy
1. Update monthly/yearly allowed days
2. Set calendar mode (all days vs working weekdays)
3. Save to `leave_policy` single-row

#### Admin: generate payroll
1. Choose month
2. Preview per employee (base, leave used, excess, net)
3. Generate → upserts `salary_payouts`

#### Employee: view salary
1. Sees latest base salary (optional) and `salary_payouts` history
2. Net salary reflects deductions

---

### 9) Edge Cases & Decisions
- **No salary_history row**: payroll preview shows 0 salary; admin should add base salary first.
- **Leave approved after payroll generated**: admin should re-run payroll for the month (upsert updates payouts).
- **Policy changes**: affects payroll calculation; re-running payroll recalculates.
- **Half-day within range**: not allowed by constraints (v1).
- **Overlapping leave requests**: v1 does not enforce conflict checks; can be added later (optional constraint/trigger).

---

### 10) Performance Considerations
- Payroll generation loops over employees and calls RPC functions per employee. For small teams, OK.
- If scaling up:
  - implement server-side payroll batch function
  - add indexed/materialized summary views

---

### 11) Security Considerations
- anon key is safe only if RLS is correct—verify policies carefully.
- Never embed `service_role` key in frontend.
- Admin-only writes must be protected by RLS, not only route guards.

---

### 12) Suggested Future Enhancements
- Admin creates Auth users from UI via Supabase Edge Function (service role protected)
- Audit log table for admin actions (approvals, policy changes, payroll runs)
- Public holiday calendar / exclusions
- Better validation: prevent overlapping approved leaves
- Export monthly payroll
