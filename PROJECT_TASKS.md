# Project Tasks — HR Leave & Salary Web Portal
## Sequential Build Plan (Supabase + React)

> **Rule**: Complete every ✅ Checkpoint before moving to the next task.
> Tasks within the same Phase that are independent can be done in parallel by multiple devs.
> **Estimated total**: ~30 hours solo developer.

---

## PHASE 1 — Supabase Foundation

---

### TASK 1 — Supabase Project & CLI Setup
**Depends on**: Nothing
**Time**: 1 hour

1. Create project at [supabase.com/dashboard](https://supabase.com/dashboard) → choose region `ap-south-1` (India).
2. Save the Database Password.
3. From **Project Settings → API**, copy `Project URL` and `anon public` key.
4. Install CLI: `npm install -g supabase`
5. Login: `supabase login`
6. In project root: `supabase init`
7. Link: `supabase link --project-ref <your-ref>`
8. Start local stack: `supabase start`
   - Note the local `API URL`, `anon key`, and `Studio URL` printed in terminal.
9. In **Authentication → Providers → Email**: enable, disable "Confirm email".
10. In **Authentication → URL Configuration**: set Site URL = `http://localhost:5173`, add `http://localhost:5173/**` to Redirect URLs.

✅ **Checkpoint**:
- [ ] `supabase status` shows all services running.
- [ ] Local Studio opens at `http://127.0.0.1:54323`.
- [ ] `supabase db pull` completes without error.

---

### TASK 2 — Database Schema Migrations
**Depends on**: Task 1
**Time**: 2 hours

Create these files in `supabase/migrations/` in exact order:

1. `001_enums.sql` — enums: `user_role`, `leave_status`, `half_day_part`, `calendar_mode`
2. `002_profiles.sql` — `profiles` table + `set_updated_at()` trigger function + `handle_new_user()` trigger
3. `003_leave_policy.sql` — `leave_policy` table + seed INSERT
4. `004_salary_history.sql`
5. `005_leave_requests.sql` — all 3 CHECK constraints
6. `006_salary_payouts.sql`

Run: `supabase db push`

**Verify in local Studio** (`http://127.0.0.1:54323`):
- Table Editor shows all 5 tables with correct columns.
- Create a test Auth user in Dashboard → Authentication → Users.
- Check `profiles` table — a row should auto-appear (from trigger).

✅ **Checkpoint**:
- [ ] All 6 tables created with correct columns, types, constraints.
- [ ] `leave_policy` has exactly 1 row.
- [ ] Creating a Supabase Auth user auto-creates a `profiles` row.
- [ ] Inserting a leave with both `leave_date` AND `start_date` fails with constraint error.

---

### TASK 3 — RLS Policies
**Depends on**: Task 2
**Time**: 1.5 hours

Create migrations:
1. `007_rls_helpers.sql` — `is_active_user()` and `is_admin()` functions (both `SECURITY DEFINER`, `SET search_path = public`)
2. `008_rls_profiles.sql`
3. `009_rls_leave_policy.sql`
4. `010_rls_salary_history.sql`
5. `011_rls_leave_requests.sql`
6. `012_rls_salary_payouts.sql`

Run: `supabase db push`

**Test RLS in SQL Editor** (Supabase Dashboard → SQL Editor):
```sql
-- Simulate employee user
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "<employee-user-id>"}';

-- Should return only that employee's rows
SELECT * FROM leave_requests;

-- Should return 0 rows (another user's)
SELECT * FROM salary_payouts WHERE user_id = '<other-user-id>';
```

✅ **Checkpoint**:
- [ ] Green lock icon visible on all 5 tables in Table Editor.
- [ ] Employee user query returns only their own rows.
- [ ] Employee cannot read salary_payouts of another employee.
- [ ] Admin user query returns all rows.
- [ ] `is_active=false` user gets 0 rows on all queries.

---

### TASK 4 — Business Logic SQL Functions
**Depends on**: Task 3
**Time**: 2 hours

Create migrations:
1. `013_functions_leave.sql` — `approved_leave_days_expanded`, `approved_leave_days_in_month`, `approved_leave_days_ytd`
2. `014_functions_payroll.sql` — `days_in_month_by_policy`, `generate_payroll_preview`, `commit_payroll`

Run: `supabase db push`

**Test with seed data** (SQL Editor):
```sql
-- Insert test employee, salary, and approved leave
INSERT INTO salary_history (user_id, amount, effective_from)
VALUES ('<emp-id>', 52000, '2025-08-01');

INSERT INTO leave_requests (user_id, leave_date, is_half_day, status)
VALUES ('<emp-id>', '2025-08-10', false, 'approved');

-- Test functions
SELECT approved_leave_days_in_month('<emp-id>', '2025-08-01');
-- Expected: 1.0

SELECT * FROM generate_payroll_preview('2025-08-01');
-- Expected: 1 row, base=52000, leave=1, excess=0, deduction=0, net=52000

SELECT commit_payroll('2025-08-01');
SELECT * FROM salary_payouts;
-- Expected: 1 row written

-- Re-run commit (upsert test)
SELECT commit_payroll('2025-08-01');
SELECT COUNT(*) FROM salary_payouts; -- should still be 1
```

✅ **Checkpoint**:
- [ ] Half-day leave counts as 0.5.
- [ ] Range leave over 3 days counts as 3.0.
- [ ] Excess deduction math is correct: `excess × (salary / working_days_in_month)`.
- [ ] `commit_payroll` upserts — re-running does not duplicate rows.
- [ ] `generate_payroll_preview` includes `has_salary_record=false` for employees with no salary row.

---

### TASK 5 — Edge Function: Create Employee
**Depends on**: Task 4
**Time**: 1 hour

1. `supabase functions new create-employee`
2. Write `supabase/functions/create-employee/index.ts` (see Backend Tech Doc §9).
3. Set secret: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
4. Test locally: `supabase functions serve`
5. Deploy: `supabase functions deploy create-employee`

**Test** (via curl or Postman):
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/create-employee \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"email":"emp@company.com","password":"Test1234!","full_name":"Test Employee","employee_code":"EMP001"}'
```

✅ **Checkpoint**:
- [ ] Calling with admin JWT creates the Auth user + `profiles` row.
- [ ] Calling with employee JWT returns 403.
- [ ] `employee_code` is saved to `profiles`.

---

## PHASE 2 — React App Skeleton

---

### TASK 6 — Frontend Scaffold + Supabase Client
**Depends on**: Task 1 (needs Supabase URL + anon key)
**Time**: 1 hour

```bash
npm create vite@latest hr-portal -- --template react-ts
cd hr-portal && npm install

# Core deps
npm install @supabase/supabase-js react-router-dom @tanstack/react-query
npm install tailwindcss @tailwindcss/vite lucide-react date-fns react-day-picker

# shadcn setup
npx shadcn@latest init   # choose Neutral base color, CSS variables: yes
npx shadcn@latest add button input badge card skeleton table dialog switch label
```

Create `.env.local`:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>
```

Add to `.gitignore`: `.env.local`, `.env`

Create `src/lib/supabaseClient.ts` with typed client.

Generate types:
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

Add script to `package.json`:
```json
"db:types": "supabase gen types typescript --local > src/types/database.types.ts"
```

Configure Tailwind with DM Sans + DM Mono fonts.

✅ **Checkpoint**:
- [ ] `npm run dev` starts at `localhost:5173` with no errors.
- [ ] `supabase.auth.getSession()` returns `{ data: { session: null }, error: null }` in console.
- [ ] `database.types.ts` has all 5 table types.

---

### TASK 7 — Auth: Login + AuthGuard + Profile Context
**Depends on**: Task 6
**Time**: 2 hours

Build:
1. `src/hooks/useAuth.ts` — wraps `supabase.auth.onAuthStateChange`.
2. `src/hooks/useProfile.ts` — React Query fetch of `profiles` row.
3. `src/context/ProfileContext.ts` — typed context for profile.
4. `src/components/guards/AuthGuard.tsx` — checks session → fetches profile → redirects.
5. `src/components/guards/AdminGuard.tsx` — checks `profile.role === 'admin'`.
6. `src/components/guards/EmployeeGuard.tsx` — checks `profile.role === 'employee'`.
7. `src/pages/auth/LoginPage.tsx` — sign-in form with inline error.
8. `src/pages/UnauthorizedPage.tsx`.
9. `src/App.tsx` — full router with stub pages (`<div>TODO: PageName</div>`).

✅ **Checkpoint**:
- [ ] Logging in as admin redirects to `/admin/leaves`.
- [ ] Logging in as employee redirects to `/employee/leaves`.
- [ ] Wrong password shows inline error, not a browser alert.
- [ ] Navigating to `/admin/leaves` while logged out redirects to `/login`.
- [ ] After login, refreshing the page keeps the user logged in (session persisted).
- [ ] `is_active=false` user lands on `/unauthorized`.

---

### TASK 8 — App Shell: Sidebar + Topbar
**Depends on**: Task 7
**Time**: 1.5 hours

Build:
1. `src/components/layout/Sidebar.tsx`
   - Dark `#111318` bg, white text.
   - Role-aware nav (reads from `ProfileContext`).
   - Active route highlight.
   - User name + role label at bottom.
   - Sign out button → `supabase.auth.signOut()` → navigate to `/login`.
   - Collapses to 60px icon rail below 1024px.
2. `src/components/layout/Topbar.tsx` — page title prop + optional right action slot.
3. `src/components/layout/AppShell.tsx` — composes Sidebar + Topbar + `<Outlet />`.
4. Wrap all authenticated routes through `AppShell`.

✅ **Checkpoint**:
- [ ] Admin sees: Leave Requests, Employees, Payroll, Policy.
- [ ] Employee sees: My Leaves, My Salary.
- [ ] Active link visually highlighted.
- [ ] Sign out clears session and goes to `/login`.
- [ ] Sidebar collapses below 1024px.

---

## PHASE 3 — Employee Pages

---

### TASK 9 — Employee: Leaves Page
**Depends on**: Task 8
**Time**: 3 hours

1. `src/hooks/useLeaveRequests.ts` — React Query fetch + Supabase Realtime subscription.
2. `src/hooks/useLeavePolicy.ts` — fetch policy for stat cards.
3. `src/pages/employee/LeavesPage.tsx`:
   - 3 stat cards (used / allowed / remaining).
   - Apply leave form: Single Day / Range toggle, date picker, half-day toggle (Single only), reason.
   - Leave history table with `StatusBadge`, skeleton loader, empty state.
4. `src/components/shared/StatusBadge.tsx`.
5. `src/components/shared/SkeletonTable.tsx`.
6. `src/components/shared/EmptyState.tsx`.

Supabase Realtime setup:
```typescript
// Enable on leave_requests in migration or Dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
```

✅ **Checkpoint**:
- [ ] Single-day leave submits and appears in table as Pending.
- [ ] Half-day toggle hidden when Date Range selected.
- [ ] Stat cards show correct numbers.
- [ ] When admin approves (from another browser tab), badge updates live without refresh.
- [ ] Employee cannot see another employee's leaves (verify via Network tab — query returns only own rows).

---

### TASK 10 — Employee: Salary Page
**Depends on**: Task 9
**Time**: 1.5 hours

1. `src/pages/employee/SalaryPage.tsx`:
   - Current base salary card (DM Mono, large, shows effective date).
   - Payout history table (Month / Base / Leave Days / Excess / Deduction / Net).
   - Red color on Excess and Deduction cells when > 0.
   - Empty state when no payouts.
2. `src/components/shared/MoneyDisplay.tsx` — formats numbers as `₹ XX,XXX.XX` in DM Mono.

✅ **Checkpoint**:
- [ ] Salary page shows payout generated in Task 4 test.
- [ ] Excess days and deduction show in red.
- [ ] Employee sees only their own payout rows.
- [ ] "No payouts yet" empty state when no data.

---

## PHASE 4 — Admin Pages

---

### TASK 11 — Admin: Leave Requests Page
**Depends on**: Task 8
**Time**: 2.5 hours

1. `src/pages/admin/LeavesPage.tsx`:
   - Filter bar: search by employee name + status dropdown + month picker.
   - Requests table with Supabase join: `select('*, profiles(full_name, employee_code)')`.
   - Inline row expand for Approve/Reject (not a modal).
   - Optimistic badge update on status change.
2. Supabase Realtime subscription for new `INSERT` events.

✅ **Checkpoint**:
- [ ] Approve/reject updates the row badge instantly.
- [ ] Admin comment saved and visible.
- [ ] Filtering by status and employee name works.
- [ ] New leave request from employee appears without refresh (Realtime).

---

### TASK 12 — Admin: Policy Page
**Depends on**: Task 11
**Time**: 1 hour

1. `src/pages/admin/PolicyPage.tsx`:
   - Loads existing policy via `useLeavePolicy` hook on mount.
   - Form: Monthly Days / Yearly Days / Calendar Mode radio / Working Days checkboxes (conditional) / Currency.
   - Save → `supabase.from('leave_policy').update({...}).eq('id', 1)`.
   - Inline "✓ Policy saved" on success; inline error on failure.
   - Working Days checkboxes hidden when Calendar Mode = "All Days".

✅ **Checkpoint**:
- [ ] Policy loads current values on page open.
- [ ] Working days grid shows/hides based on calendar mode.
- [ ] Saving updates the DB — verify in Studio Table Editor.
- [ ] Employee navigating to `/admin/policy` is blocked by `AdminGuard`.

---

### TASK 13 — Admin: Employees Page + Add Employee
**Depends on**: Task 12
**Time**: 2.5 hours

1. `src/pages/admin/EmployeesPage.tsx`:
   - Employees table: name, code, active toggle, current salary, Edit Salary button.
   - Active toggle → `supabase.from('profiles').update({ is_active }).eq('user_id', ...)`.
   - Current salary = latest `salary_history` row per user (via Supabase `LATERAL` join in query or React Query).
2. **Edit Salary side panel** (slides from right):
   - New salary amount input + effective-from date picker.
   - Save → `supabase.from('salary_history').insert({...})`.
3. **Add Employee button** (Topbar):
   - Form: name, email, temp password, employee code.
   - Submit → `supabase.functions.invoke('create-employee', { body: {...} })`.
   - Show error if email already exists.

✅ **Checkpoint**:
- [ ] Toggling a user inactive immediately reflects in toggle UI.
- [ ] Editing salary inserts a new `salary_history` row (doesn't update old one).
- [ ] New salary row becomes the "current salary" displayed.
- [ ] Adding a new employee creates the Auth user and `profiles` row.
- [ ] Deactivated employee cannot see data after next page load.

---

### TASK 14 — Admin: Payroll Page
**Depends on**: Task 13
**Time**: 2 hours

1. `src/pages/admin/PayrollPage.tsx`:
   - Month picker (default = current month, first day).
   - Preview button → `supabase.rpc('generate_payroll_preview', { p_month })`.
   - Preview table: employee name / base / leave days / excess (red) / deduction (red) / net.
   - Warning banner if any row has `has_salary_record = false`.
   - Generate Payroll button → `supabase.rpc('commit_payroll', { p_month })`.
   - Inline success message: "✓ Payroll generated for [Month Year]."
2. `src/hooks/usePayrollPreview.ts` — React Query mutation.

✅ **Checkpoint**:
- [ ] Preview table shows correct calculations (cross-check with Task 4 SQL test values).
- [ ] Warning banner appears when an employee has no salary history.
- [ ] Generate writes to `salary_payouts` — verify in Studio.
- [ ] Running payroll twice for same month updates rows, not duplicates.
- [ ] Employee can now see their payout on the Salary page.

---

## PHASE 5 — Polish

---

### TASK 15 — Error Handling & Edge Cases
**Depends on**: Tasks 9–14
**Time**: 1.5 hours

1. Wrap all Supabase calls in `try/catch` or handle `.error` return.
2. Map Postgres error codes to user-friendly messages (see Backend Doc §10):
   - `23505` (unique) → "A record for this date already exists."
   - `23514` (check) → "Invalid leave request format."
   - `42501` (permission) → "You don't have permission to do this."
3. Show red inline error banner at top of affected section — not console.error.
4. Add empty states to every table that currently has none.
5. Verify all forms show field-level errors on empty required fields.

✅ **Checkpoint**:
- [ ] Submitting a duplicate leave date shows a friendly inline message.
- [ ] Network disconnect shows an inline error banner.
- [ ] Every table has a working empty state.
- [ ] No unhandled promise rejections in browser console.

---

### TASK 16 — Skeleton Loaders + Responsiveness
**Depends on**: Task 15
**Time**: 2 hours

1. Replace any spinners with `SkeletonTable` on all data tables.
2. Replace loading salary cards with skeleton rectangles.
3. Test at 375px, 768px, 1024px, 1440px:
   - `<768px`: sidebar hidden, bottom tab bar (4 tabs max per role).
   - `768–1023px`: sidebar collapses to 60px icon rail.
   - `≥1024px`: full sidebar.
4. Tables on mobile → card-list layout (one card per row).
5. Apply leave form → full width on mobile.

✅ **Checkpoint**:
- [ ] No horizontal scroll on 375px screen.
- [ ] Bottom tab bar visible on mobile; sidebar hidden.
- [ ] All tables readable on mobile.
- [ ] No layout overflow on any screen size.

---

### TASK 17 — Security Audit
**Depends on**: Task 16
**Time**: 45 minutes

1. In Supabase Dashboard → Table Editor: verify green lock icon on ALL 5 tables.
2. Log in as a fresh employee account and attempt:
   - Fetch `GET /rest/v1/leave_requests?user_id=eq.<other-user-id>` directly → expect 0 rows.
   - Call `supabase.rpc('generate_payroll_preview', ...)` → expect error or empty.
   - Navigate to `/admin/payroll` → expect redirect.
3. Check `.gitignore` includes `.env.local` and `.env`.
4. Search entire `src/` for `service_role` — must find 0 results.
5. Confirm Realtime is NOT enabled on `salary_history` or `salary_payouts`.

✅ **Checkpoint**:
- [ ] All RLS tests pass.
- [ ] No `service_role` key in any frontend file.
- [ ] Employee cannot call admin-only RPC functions.
- [ ] `salary_history` and `salary_payouts` are NOT in Realtime publication.

---

## PHASE 6 — Deployment

---

### TASK 18 — Deploy to Production
**Depends on**: Task 17
**Time**: 45 minutes

1. Push all migrations to production: `supabase db push`
2. Regenerate types against prod: `supabase gen types typescript --project-id <ref> > src/types/database.types.ts`
3. Deploy Edge Function: `supabase functions deploy create-employee`
4. Set Edge Function secret on production: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<prod-key> --env-file .env.prod`
5. Deploy frontend to Vercel or Netlify:
   - Set env vars: `VITE_SUPABASE_URL` (prod URL) + `VITE_SUPABASE_ANON_KEY` (prod anon key).
6. Update Supabase Auth → URL Configuration:
   - Site URL: `https://your-production-domain.com`
   - Redirect URLs: `https://your-production-domain.com/**`
7. Test full flow on production URL: login → leave application → admin approval → payroll generation.

✅ **Checkpoint**:
- [ ] Production URL loads login page.
- [ ] Admin can log in and see all data.
- [ ] Employee can apply leave; admin can approve; employee sees updated status.
- [ ] Payroll generation works end-to-end.
- [ ] No console errors on production.

---

## Task Summary

| # | Task | Phase | Time | Depends On |
|---|------|-------|------|------------|
| 1 | Supabase Project & CLI | Foundation | 1h | — |
| 2 | DB Schema Migrations | Foundation | 2h | 1 |
| 3 | RLS Policies | Foundation | 1.5h | 2 |
| 4 | Business Logic SQL Functions | Foundation | 2h | 3 |
| 5 | Edge Function: Create Employee | Foundation | 1h | 4 |
| 6 | Frontend Scaffold + Supabase Client | App Skeleton | 1h | 1 |
| 7 | Auth: Login + Guards + Profile Context | App Skeleton | 2h | 6 |
| 8 | App Shell: Sidebar + Topbar | App Skeleton | 1.5h | 7 |
| 9 | Employee: Leaves Page (+ Realtime) | Employee | 3h | 8 |
| 10 | Employee: Salary Page | Employee | 1.5h | 9 |
| 11 | Admin: Leave Requests Page | Admin | 2.5h | 8 |
| 12 | Admin: Policy Page | Admin | 1h | 11 |
| 13 | Admin: Employees + Add Employee | Admin | 2.5h | 12 |
| 14 | Admin: Payroll Page | Admin | 2h | 13 |
| 15 | Error Handling & Edge Cases | Polish | 1.5h | 9–14 |
| 16 | Skeleton Loaders + Responsiveness | Polish | 2h | 15 |
| 17 | Security Audit | Polish | 0.75h | 16 |
| 18 | Deploy to Production | Deploy | 0.75h | 17 |

**Total: ~31 hours**

---

## Parallel Work Note

If two developers are working simultaneously:
- **Dev A**: Tasks 1–5 (all Supabase backend work)
- **Dev B**: Tasks 6–8 (scaffold + auth) — can start as soon as Task 1 is done

After Task 8, employee pages (9–10) and admin pages (11–14) can be built in parallel.
