# Backend Design Tech Doc — HR Leave & Salary Portal
## (Supabase-Enhanced)

> Stack: **Supabase** (Postgres 15 + Auth + RLS + Realtime + Edge Functions)
> Frontend: React + Vite + TypeScript using `@supabase/supabase-js` v2
> No Express/Node server. All privileged logic lives in **SQL RPC functions + RLS**.
> Frontend uses **anon key only**. `service_role` key lives only in Edge Functions.

---

## 1. Supabase Project Setup

### 1.1 Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → New Project.
2. Choose a region close to your users (e.g., `ap-south-1` for India).
3. Save the **Database Password** — you'll need it for CLI login.
4. From **Project Settings → API**, copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → store only in Edge Function env, never in frontend

### 1.2 Auth Configuration

In Supabase Dashboard → **Authentication → Providers**:
- Enable **Email** provider.
- Disable "Confirm email" (internal tool — no email needed).
- Set **Site URL** to `http://localhost:5173` for dev (update for production).
- Add `http://localhost:5173/**` to **Redirect URLs**.

### 1.3 Supabase CLI Setup

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Init local config in your project root
supabase init

# Link to your remote project
supabase link --project-ref <your-project-ref>

# Pull remote DB schema to local
supabase db pull

# Start local Supabase stack (Postgres + Auth + Studio)
supabase start
# Gives you: local API URL, anon key, service_role key, Studio URL
```

### 1.4 Local dev `.env`

```env
# .env.local  (add to .gitignore)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-start>

# Production .env
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=<prod-anon-key>
```

### 1.5 TypeScript Type Generation

Run after every migration to keep types in sync:

```bash
# Against local stack
supabase gen types typescript --local > src/types/database.types.ts

# Against remote project
supabase gen types typescript --project-id <ref> > src/types/database.types.ts
```

Add to `package.json` scripts:
```json
"db:types": "supabase gen types typescript --local > src/types/database.types.ts"
```

---

## 2. Supabase Client Initialization

```typescript
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,         // localStorage by default in browser
      autoRefreshToken: true,
      detectSessionInUrl: true,     // handles OAuth/magic-link redirects
    },
    realtime: {
      params: { eventsPerSecond: 2 }
    }
  }
)
```

---

## 3. Database Schema Migrations

Store all migrations in `supabase/migrations/`. Run with `supabase db push` or `supabase migration up`.

---

### 3.1 Enums — `001_enums.sql`

```sql
CREATE TYPE user_role     AS ENUM ('admin', 'employee');
CREATE TYPE leave_status  AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE half_day_part AS ENUM ('AM', 'PM');
CREATE TYPE calendar_mode AS ENUM ('all_days', 'working_days');
```

---

### 3.2 `profiles` — `002_profiles.sql`

```sql
CREATE TABLE profiles (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           user_role    NOT NULL DEFAULT 'employee',
  full_name      TEXT         NOT NULL,
  employee_code  TEXT,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Auto-create profile on Supabase Auth user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 3.3 `leave_policy` — `003_leave_policy.sql`

```sql
CREATE TABLE leave_policy (
  id                   INT PRIMARY KEY DEFAULT 1,
  allowed_monthly_days NUMERIC(5,1)  NOT NULL DEFAULT 4.0,
  allowed_yearly_days  NUMERIC(5,1)  NOT NULL DEFAULT 24.0,
  calendar_mode        calendar_mode NOT NULL DEFAULT 'working_days',
  working_days         INT[]         NOT NULL DEFAULT '{1,2,3,4,5,6}',
  -- 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  -- Default: Mon–Sat
  currency             TEXT          NOT NULL DEFAULT 'INR',
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TRIGGER leave_policy_updated_at
  BEFORE UPDATE ON leave_policy
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the one and only policy row
INSERT INTO leave_policy DEFAULT VALUES;
```

---

### 3.4 `salary_history` — `004_salary_history.sql`

```sql
CREATE TABLE salary_history (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID          NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency       TEXT          NOT NULL DEFAULT 'INR',
  effective_from DATE          NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (user_id, effective_from)
);

CREATE INDEX idx_salary_history_user_date ON salary_history (user_id, effective_from DESC);
```

---

### 3.5 `leave_requests` — `005_leave_requests.sql`

```sql
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

  CONSTRAINT leave_type_exclusive CHECK (
    (leave_date IS NOT NULL AND start_date IS NULL AND end_date IS NULL)
    OR
    (leave_date IS NULL AND start_date IS NOT NULL AND end_date IS NOT NULL)
  ),
  CONSTRAINT half_day_only_on_single CHECK (
    is_half_day = FALSE OR leave_date IS NOT NULL
  ),
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
```

---

### 3.6 `salary_payouts` — `006_salary_payouts.sql`

```sql
CREATE TABLE salary_payouts (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              UUID          NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  month                DATE          NOT NULL,    -- always 1st of month
  base_salary          NUMERIC(12,2) NOT NULL,
  leave_days_in_month  NUMERIC(5,1)  NOT NULL DEFAULT 0,
  allowed_monthly_days NUMERIC(5,1)  NOT NULL,
  excess_days_in_month NUMERIC(5,1)  NOT NULL DEFAULT 0,
  deduction_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary           NUMERIC(12,2) NOT NULL,
  -- YTD informational
  leave_days_ytd       NUMERIC(5,1)  NOT NULL DEFAULT 0,
  allowed_yearly_days  NUMERIC(5,1)  NOT NULL,
  excess_days_ytd      NUMERIC(5,1)  NOT NULL DEFAULT 0,
  generated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (user_id, month),
  CONSTRAINT month_is_first_day CHECK (EXTRACT(DAY FROM month) = 1)
);

CREATE INDEX idx_salary_payouts_user_month ON salary_payouts (user_id, month DESC);
```

---

## 4. Row Level Security (RLS)

### 4.1 Helper Functions — `007_rls_helpers.sql`

```sql
-- Returns true if the calling Supabase Auth user is active
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
```

> **Why `SECURITY DEFINER` + `SET search_path`?**
> These functions need to read `profiles` without themselves being restricted by RLS.
> Setting `search_path = public` prevents search-path injection attacks.

---

### 4.2 `profiles` RLS — `008_rls_profiles.sql`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Employees read only their own row
CREATE POLICY "profiles: employee reads own"
  ON profiles FOR SELECT
  USING (user_id = auth.uid() AND is_active = TRUE);

-- Admin reads all profiles
CREATE POLICY "profiles: admin reads all"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admin can update any profile (role, is_active, name)
CREATE POLICY "profiles: admin updates all"
  ON profiles FOR UPDATE
  USING (is_admin());
```

---

### 4.3 `leave_policy` RLS — `009_rls_leave_policy.sql`

```sql
ALTER TABLE leave_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_policy: any active user reads"
  ON leave_policy FOR SELECT
  USING (is_active_user());

CREATE POLICY "leave_policy: only admin updates"
  ON leave_policy FOR UPDATE
  USING (is_admin());
```

---

### 4.4 `salary_history` RLS — `010_rls_salary_history.sql`

```sql
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salary_history: employee reads own"
  ON salary_history FOR SELECT
  USING (user_id = auth.uid() AND is_active_user());

CREATE POLICY "salary_history: admin full access"
  ON salary_history FOR ALL
  USING (is_admin());
```

---

### 4.5 `leave_requests` RLS — `011_rls_leave_requests.sql`

```sql
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_requests: employee inserts own"
  ON leave_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_active_user());

CREATE POLICY "leave_requests: employee reads own"
  ON leave_requests FOR SELECT
  USING (user_id = auth.uid() AND is_active_user());

CREATE POLICY "leave_requests: admin reads all"
  ON leave_requests FOR SELECT
  USING (is_admin());

CREATE POLICY "leave_requests: admin updates (approve/reject)"
  ON leave_requests FOR UPDATE
  USING (is_admin());
```

---

### 4.6 `salary_payouts` RLS — `012_rls_salary_payouts.sql`

```sql
ALTER TABLE salary_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salary_payouts: employee reads own"
  ON salary_payouts FOR SELECT
  USING (user_id = auth.uid() AND is_active_user());

CREATE POLICY "salary_payouts: admin full access"
  ON salary_payouts FOR ALL
  USING (is_admin());
```

---

## 5. Business Logic SQL Functions

### 5.1 `approved_leave_days_expanded` — `013_functions_leave.sql`

```sql
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

  -- Range leaves — expand each day
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
```

### 5.2 `approved_leave_days_in_month`

```sql
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
```

### 5.3 `approved_leave_days_ytd`

```sql
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
```

### 5.4 `days_in_month_by_policy` — `014_functions_payroll.sql`

```sql
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
```

### 5.5 `generate_payroll_preview` — called via `.rpc()`

```sql
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

-- Only authenticated users can call; RLS on salary_payouts guards writes
REVOKE EXECUTE ON FUNCTION generate_payroll_preview FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION generate_payroll_preview TO authenticated;
```

### 5.6 `commit_payroll`

```sql
CREATE OR REPLACE FUNCTION commit_payroll(p_month DATE)
RETURNS VOID LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
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
    excess_days_in_month = EXCLUDED.excess_days_in_month,
    deduction_amount     = EXCLUDED.deduction_amount,
    net_salary           = EXCLUDED.net_salary,
    leave_days_ytd       = EXCLUDED.leave_days_ytd,
    excess_days_ytd      = EXCLUDED.excess_days_ytd,
    generated_at         = now();
$$;

REVOKE EXECUTE ON FUNCTION commit_payroll FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION commit_payroll TO authenticated;
```

---

## 6. Supabase Auth Patterns (React)

### 6.1 Auth State Listener

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

### 6.2 Sign In / Sign Out

```typescript
// Sign in
const { error } = await supabase.auth.signInWithPassword({
  email: 'user@company.com',
  password: 'password123'
})

// Sign out
await supabase.auth.signOut()

// Get current session synchronously
const { data: { session } } = await supabase.auth.getSession()
```

### 6.3 Fetch Profile After Login

```typescript
// src/hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,   // cache 5 minutes
  })
}
```

---

## 7. Supabase Realtime — Live Leave Status Updates

Enable Realtime so employees see their leave status change without refreshing.

### 7.1 Enable Realtime on `leave_requests`

In Supabase Dashboard → **Database → Replication**, add `leave_requests` to the replication publication.

Or via SQL:
```sql
ALTER publication supabase_realtime ADD TABLE leave_requests;
```

### 7.2 Subscribe in Employee Leaves Page

```typescript
// src/hooks/useLeaveRequests.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useLeaveRealtimeSync(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`leave_requests:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_requests',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Invalidate the query cache → triggers re-fetch
          queryClient.invalidateQueries({ queryKey: ['leave_requests', userId] })
          // Optionally show a toast notification
          // toast(`Leave ${payload.new.status}: ${payload.new.leave_date}`)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, queryClient])
}
```

### 7.3 Subscribe in Admin Leaves Page (new requests)

```typescript
// Admin page: real-time new leave requests from any employee
const channel = supabase
  .channel('admin_leave_requests')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'leave_requests' },
    () => {
      queryClient.invalidateQueries({ queryKey: ['admin_leave_requests'] })
    }
  )
  .subscribe()
```

---

## 8. Key Query Patterns (Typed)

### 8.1 Employee: Submit Leave Request

```typescript
// Single day
const { error } = await supabase.from('leave_requests').insert({
  user_id: session.user.id,
  leave_date: '2025-08-15',
  is_half_day: true,
  half_day_part: 'AM',
  reason: 'Personal appointment'
})

// Date range
const { error } = await supabase.from('leave_requests').insert({
  user_id: session.user.id,
  start_date: '2025-08-20',
  end_date:   '2025-08-22',
  reason: 'Family event'
})
```

### 8.2 Employee: Fetch Own Leaves

```typescript
const { data, error } = await supabase
  .from('leave_requests')
  .select('*')
  .order('created_at', { ascending: false })
// RLS automatically scopes to auth.uid()
```

### 8.3 Admin: Approve Leave

```typescript
const { error } = await supabase
  .from('leave_requests')
  .update({
    status: 'approved',
    admin_comment: 'Approved. Enjoy your leave.',
    decided_by: adminUserId,
    decided_at: new Date().toISOString()
  })
  .eq('id', leaveId)
```

### 8.4 Admin: Fetch All Pending Leaves with Employee Name

```typescript
const { data, error } = await supabase
  .from('leave_requests')
  .select(`
    *,
    profiles ( full_name, employee_code )
  `)
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
```

### 8.5 Admin: Update Leave Policy

```typescript
const { error } = await supabase
  .from('leave_policy')
  .update({
    allowed_monthly_days: 5,
    calendar_mode: 'working_days',
    working_days: [1, 2, 3, 4, 5]   // Mon–Fri
  })
  .eq('id', 1)
```

### 8.6 Admin: Add Salary History

```typescript
const { error } = await supabase
  .from('salary_history')
  .insert({
    user_id: employeeId,
    amount: 50000,
    currency: 'INR',
    effective_from: '2025-08-01'
  })
```

### 8.7 Admin: Payroll Preview (RPC)

```typescript
const { data: preview, error } = await supabase
  .rpc('generate_payroll_preview', { p_month: '2025-08-01' })

// preview: Array of { user_id, full_name, base_salary, leave_days_in_month,
//                     excess_days, deduction_amount, net_salary, has_salary_record }
```

### 8.8 Admin: Commit Payroll (RPC)

```typescript
const { error } = await supabase
  .rpc('commit_payroll', { p_month: '2025-08-01' })

if (error) console.error('Payroll generation failed:', error.message)
```

---

## 9. Edge Function — Admin Creates Employee Accounts

> This is the **v1 solution** to creating Supabase Auth users from the admin UI without exposing the service role key to the frontend.

### 9.1 Create Edge Function

```bash
supabase functions new create-employee
```

### 9.2 `supabase/functions/create-employee/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify caller is an admin (check their JWT)
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  const { data: { user } } = await callerClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { data: profile } = await callerClient
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'admin') {
    return new Response('Forbidden', { status: 403, headers: corsHeaders })
  }

  // Use service role client to create the new Auth user
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { email, password, full_name, employee_code } = await req.json()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name }
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Update the auto-created profile with employee_code
  if (employee_code) {
    await adminClient
      .from('profiles')
      .update({ employee_code })
      .eq('user_id', data.user.id)
  }

  return new Response(JSON.stringify({ user: data.user }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

### 9.3 Deploy Edge Function

```bash
supabase functions deploy create-employee --no-verify-jwt
```

Set the `SUPABASE_SERVICE_ROLE_KEY` secret:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 9.4 Call from Admin UI

```typescript
const { data, error } = await supabase.functions.invoke('create-employee', {
  body: {
    email: 'john@company.com',
    password: 'TempPass123!',
    full_name: 'John Doe',
    employee_code: 'EMP001'
  }
})
```

---

## 10. Error Handling Patterns

```typescript
// Supabase errors have: message, code, details, hint
import { PostgrestError } from '@supabase/supabase-js'

function handleSupabaseError(error: PostgrestError | null): string | null {
  if (!error) return null
  switch (error.code) {
    case '23505': return 'A record with this date already exists.'     // unique_violation
    case '23514': return 'Invalid leave request format.'               // check_violation
    case '42501': return 'You do not have permission to do this.'      // insufficient_privilege
    default:      return error.message
  }
}

// Usage in a mutation
const { error } = await supabase.from('leave_requests').insert({ ... })
const errorMessage = handleSupabaseError(error)
if (errorMessage) setFormError(errorMessage)
```

---

## 11. Migration Execution Order

```
supabase/migrations/
├── 001_enums.sql
├── 002_profiles.sql            ← includes auto-create trigger
├── 003_leave_policy.sql        ← includes seed row
├── 004_salary_history.sql
├── 005_leave_requests.sql
├── 006_salary_payouts.sql
├── 007_rls_helpers.sql         ← is_active_user(), is_admin()
├── 008_rls_profiles.sql
├── 009_rls_leave_policy.sql
├── 010_rls_salary_history.sql
├── 011_rls_leave_requests.sql
├── 012_rls_salary_payouts.sql
├── 013_functions_leave.sql     ← expanded / in_month / ytd
└── 014_functions_payroll.sql   ← days_in_month / preview / commit
```

```bash
# Apply all migrations
supabase db push

# Regenerate TypeScript types after migration
npm run db:types

# Verify in Supabase Dashboard → Table Editor (green lock icon on all tables)
```

---

## 12. Supabase Security Checklist

- [ ] RLS is enabled (green lock) on **all 5 tables** — verify in Dashboard → Table Editor.
- [ ] `is_admin()` and `is_active_user()` use `SECURITY DEFINER` + `SET search_path = public`.
- [ ] `generate_payroll_preview` and `commit_payroll` are `REVOKE`d from `PUBLIC`.
- [ ] `service_role` key is **only** in Edge Function secrets — never in `.env` or frontend code.
- [ ] `.env.local` is in `.gitignore`.
- [ ] Supabase Realtime is enabled **only** on `leave_requests` — not on salary tables.
- [ ] Edge Function `create-employee` validates caller is admin before using service role.
- [ ] Auth email confirmation is disabled intentionally (internal tool — document this).

---

## 13. Local Dev → Production Workflow

```bash
# 1. Develop locally
supabase start                          # spins up local Postgres + Auth + Studio
supabase db reset                       # re-applies all migrations fresh

# 2. Make a schema change
supabase migration new add_notes_column
# edit the new migration file
supabase db reset                       # test locally

# 3. Push to production
supabase db push                        # applies pending migrations to remote
npm run db:types                        # regenerate types
supabase functions deploy create-employee  # deploy/update edge functions
```
