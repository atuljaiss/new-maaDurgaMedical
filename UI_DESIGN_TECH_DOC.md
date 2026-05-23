# UI Design Tech Doc — HR Leave & Salary Web Portal
## (Supabase + React Enhanced)

> Design philosophy: **Brutally minimal. Data-first. Zero clutter.**
> Inspired by top minimalist HR dashboard patterns from Dribbble (MarcoHR, Dazeboard, Humasplus).
> Stack: React + Vite + TypeScript + Tailwind CSS + shadcn/ui + `@supabase/supabase-js` v2

---

## 1. Design System

### 1.1 Color Palette

```css
:root {
  --bg-base:       #F7F8FA;
  --bg-card:       #FFFFFF;
  --bg-sidebar:    #111318;

  --text-primary:  #111318;
  --text-secondary:#6B7280;
  --text-inverse:  #FFFFFF;

  --accent:        #4F6EF7;
  --accent-hover:  #3A56D4;
  --accent-light:  #EEF2FF;

  --success:       #22C55E;
  --success-bg:    #DCFCE7;
  --warning:       #F59E0B;
  --warning-bg:    #FEF3C7;
  --danger:        #EF4444;
  --danger-bg:     #FEE2E2;

  --border:        #E5E7EB;
  --radius:        10px;
  --radius-sm:     6px;
}
```

### 1.2 Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Page title | `DM Sans` | 24px | 700 |
| Section heading | `DM Sans` | 18px | 600 |
| Body / labels | `DM Sans` | 14px | 400 |
| Tiny / meta | `DM Sans` | 12px | 400 |
| Salary numbers | `DM Mono` | 16px | 500 |

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

```js
// tailwind.config.ts
fontFamily: {
  sans: ['DM Sans', 'sans-serif'],
  mono: ['DM Mono', 'monospace'],
}
```

### 1.3 Component Tokens

| Element | Tailwind Classes |
|---------|-----------------|
| Page card | `bg-white rounded-[10px] border border-[#E5E7EB] shadow-sm p-6` |
| Stat card | `bg-white rounded-[10px] border border-[#E5E7EB] p-5` |
| Badge — Pending | `bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full` |
| Badge — Approved | `bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full` |
| Badge — Rejected | `bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full` |
| Primary button | `bg-[#4F6EF7] text-white text-sm font-medium rounded-[6px] px-4 py-2 hover:bg-[#3A56D4] transition-colors` |
| Ghost button | `border border-[#E5E7EB] text-[#111318] text-sm rounded-[6px] px-4 py-2 hover:bg-[#F7F8FA]` |
| Danger button | `bg-red-50 text-red-600 border border-red-200 text-sm rounded-[6px] px-4 py-2` |
| Input | `border border-[#E5E7EB] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] focus:border-transparent` |
| Table header | `text-xs font-semibold text-[#6B7280] uppercase tracking-wider` |
| Mono value | `font-mono text-[#111318] font-medium` |

---

## 2. Layout Structure

### 2.1 App Shell

```
┌──────────────────────────────────────────────────────┐
│  SIDEBAR  (240px fixed, bg #111318)                  │
│  ─────────────────────────────────────               │
│  🏢  HRPortal          ← logo + app name             │
│                                                      │
│  ○  Dashboard / Overview                             │
│  ○  Leave Requests  (admin) / My Leaves (emp)        │
│  ○  Employees       (admin) / My Salary  (emp)       │
│  ○  Payroll         (admin only)                     │
│  ○  Policy          (admin only)                     │
│                                                      │
│  ─────────────────────────────────────               │
│  [AV] John Doe · Admin                               │
│       Sign out                                       │
├──────────────────────────────────────────────────────┤
│  TOPBAR (56px, white, sticky, border-b)              │
│  Page Title ──────────────── [Action Button]         │
├──────────────────────────────────────────────────────┤
│  MAIN CONTENT (flex-1, bg #F7F8FA, p-6)              │
│  <Outlet />                                          │
└──────────────────────────────────────────────────────┘
```

- `<1024px`: sidebar collapses to 60px icon rail.
- `<768px`: sidebar hidden; bottom tab bar (4 tabs max).

### 2.2 `AppShell.tsx` Structure

```tsx
<div className="flex h-screen overflow-hidden">
  <Sidebar role={profile.role} />
  <div className="flex flex-col flex-1 overflow-hidden">
    <Topbar title={pageTitle} action={pageAction} />
    <main className="flex-1 overflow-y-auto bg-[#F7F8FA] p-6">
      <Outlet />
    </main>
  </div>
</div>
```

---

## 3. Auth Pages

### `/login`

```
┌─────────────────────────────┐
│                             │  ← Full-height #F7F8FA bg
│    🏢 HRPortal              │
│    Employee & Leave Portal  │
│                             │
│  ┌─────────────────────┐   │
│  │  Work Email          │   │  ← Input
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │  Password            │   │  ← Input + show/hide toggle
│  └─────────────────────┘   │
│                             │
│  [  Sign In  ]              │  ← Full-width primary button
│                             │
│  ⚠ Invalid credentials     │  ← Inline error, text-red-600
└─────────────────────────────┘
    Card: max-w-[400px], centered
```

**Supabase integration**:
```typescript
// On submit
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) { setError(error.message); return }

// Fetch profile to determine role
const { data: profile } = await supabase
  .from('profiles').select('role, is_active').eq('user_id', data.user.id).single()

if (!profile?.is_active) { navigate('/unauthorized'); return }
navigate(profile.role === 'admin' ? '/admin/leaves' : '/employee/leaves')
```

---

## 4. Employee Pages

### 4.1 `/employee/leaves`

**Stats Row** (3 cards, `grid grid-cols-3 gap-4 mb-6`):

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Used This Month │  │  Allowed Monthly │  │  Remaining       │
│  2.5 days        │  │  4 days          │  │  1.5 days        │  ← green if >0, red if 0
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

Data sources:
- `allowed_monthly_days` — from `leave_policy` table
- Used — call `supabase.rpc('approved_leave_days_in_month', { p_user_id, p_month })`
- Remaining — `allowed - used`

**Apply Leave Panel** (right side, sticky, `w-[340px]`):

```
Apply Leave
─────────────────
[ Single Day ] [ Date Range ]   ← toggle tabs

Date:  [Aug 15, 2025 ▼]

□ Half Day?
  ○ AM   ○ PM

Reason (optional):
[                    ]

[ Submit Leave Request ]
```

**Leave History Table**:

| Column | Source Field | Notes |
|--------|-------------|-------|
| Date | `leave_date` or `start_date–end_date` | formatted with `date-fns` |
| Type | `is_half_day`, `half_day_part` | "Full Day / Half AM / Half PM" |
| Reason | `reason` | truncate at 40 chars |
| Status | `status` | colored badge |
| Admin Note | `admin_comment` | show only if present, italic |

Realtime: use `useLeaveRealtimeSync(userId)` hook — badge updates live when admin approves/rejects.

---

### 4.2 `/employee/salary`

```
┌───────────────────────────────────────────────────┐
│  Current Base Salary                              │
│  ₹ 50,000.00 / month                             │  ← DM Mono, large
│  Effective from: Aug 1, 2025                      │  ← text-secondary
└───────────────────────────────────────────────────┘

Payout History
─────────────────────────────────────────────────────
Month    Base Salary   Leave Days   Excess   Deduction   Net Salary
Aug 25   ₹50,000       2.5 days     0        ₹0          ₹50,000
Jul 25   ₹50,000       5 days       1        ₹1,923      ₹48,077   ← red on excess+deduction
```

Empty state: "No payouts yet — your admin will generate your first payout at month end."

---

## 5. Admin Pages

### 5.1 `/admin/leaves`

**Filter Bar** (`flex gap-3 mb-5`):
```
[Search employee...] [Status ▼] [Month ▼]    ← inline, no card wrapper
```

**Requests Table**:

| Column | Notes |
|--------|-------|
| Employee | avatar circle (initials) + full name |
| Date / Range | |
| Type | Full / Half-AM / Half-PM |
| Reason | 40-char truncate |
| Submitted | relative time (`date-fns/formatDistanceToNow`) |
| Status | badge |
| Actions | Approve / Reject buttons (only for `pending` rows) |

**Inline Approve/Reject expand** (no modal):
```
→ Row expands below when Approve or Reject clicked:
  ┌─────────────────────────────────────────────────┐
  │  Comment (optional): [                         ]│
  │  [ ✓ Confirm Approval ]  [ Cancel ]            │
  └─────────────────────────────────────────────────┘
```

Supabase update:
```typescript
await supabase.from('leave_requests').update({
  status: 'approved',
  admin_comment: comment,
  decided_by: adminId,
  decided_at: new Date().toISOString()
}).eq('id', leaveId)
```

---

### 5.2 `/admin/payroll`

```
Generate Payroll
─────────────────────────────────────────────
Month: [ August 2025 ▼ ]   [ Preview ]

─────────────────────────────────────────────
⚠ 1 employee has no salary record — they will show ₹0.

Employee     Base       Leave Days  Excess  Deduction   Net Salary
John Doe     ₹50,000    2.5         0       ₹0          ₹50,000
Jane Smith   ₹45,000    6           2       ₹3,000      ₹42,000    ← red cells

─────────────────────────────────────────────
                              [ Generate Payroll ]

✓ Payroll generated for August 2025.    ← inline success, not toast
```

Data flow:
```typescript
// Preview
const { data } = await supabase.rpc('generate_payroll_preview', { p_month: '2025-08-01' })

// Commit
await supabase.rpc('commit_payroll', { p_month: '2025-08-01' })
```

---

### 5.3 `/admin/policy`

```
Leave Policy Settings
──────────────────────────────────────────

Monthly Allowed Days       [ 4.0 ]  days

Yearly Allowed Days        [ 24.0 ] days  (informational)

Count leave using:
  ○ All calendar days
  ● Working days only

Working Days:
  ☑ Mon  ☑ Tue  ☑ Wed  ☑ Thu  ☑ Fri  ☑ Sat  ☐ Sun

Currency:  [ INR ]

                                   [ Save Policy ]
✓ Policy updated.
```

Supabase update:
```typescript
await supabase.from('leave_policy')
  .update({ allowed_monthly_days, calendar_mode, working_days, currency })
  .eq('id', 1)
```

---

### 5.4 `/admin/employees`

**Employees Table**:

| Column | Notes |
|--------|-------|
| Name | avatar + full name |
| Code | `employee_code`, "—" if empty |
| Active | toggle switch → updates `profiles.is_active` |
| Current Salary | latest `salary_history.amount`, "Not set" in red if missing |
| Actions | "Edit Salary" opens side panel |

**Add Employee button** (Topbar right slot):
- Opens a form panel → calls `supabase.functions.invoke('create-employee', {...})`
- Fields: Full Name, Email, Temp Password, Employee Code

**Edit Salary Side Panel** (slides in from right, `w-[360px]`):
```
Edit Salary — John Doe
──────────────────────────
New Monthly Base Salary
[ ₹ __________ ]

Effective From
[ Aug 1, 2025 ▼ ]

                [ Save ]
```

---

## 6. Routing & Guards

```tsx
// src/App.tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthGuard, AdminGuard, EmployeeGuard } from './components/guards'

const router = createBrowserRouter([
  { path: '/login',         element: <LoginPage /> },
  { path: '/unauthorized',  element: <UnauthorizedPage /> },
  {
    element: <AuthGuard />,           // checks session + profile
    children: [
      {
        element: <AppShell />,
        children: [
          { element: <AdminGuard />, children: [
            { path: '/admin/leaves',    element: <AdminLeavesPage /> },
            { path: '/admin/payroll',   element: <PayrollPage /> },
            { path: '/admin/policy',    element: <PolicyPage /> },
            { path: '/admin/employees', element: <EmployeesPage /> },
          ]},
          { element: <EmployeeGuard />, children: [
            { path: '/employee/leaves', element: <EmployeeLeavesPage /> },
            { path: '/employee/salary', element: <SalaryPage /> },
          ]},
        ]
      }
    ]
  },
  { path: '*', element: <Navigate to="/login" replace /> }
])
```

### `AuthGuard.tsx`

```tsx
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { ProfileContext } from '../../context/ProfileContext'

export function AuthGuard() {
  const { session, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user.id)

  if (authLoading || profileLoading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile?.is_active) return <Navigate to="/unauthorized" replace />

  return (
    <ProfileContext.Provider value={profile}>
      <Outlet />
    </ProfileContext.Provider>
  )
}
```

---

## 7. Shared Components

### `StatusBadge.tsx`

```tsx
import type { Database } from '../../types/database.types'
type LeaveStatus = Database['public']['Enums']['leave_status']

const config: Record<LeaveStatus, { label: string; classes: string }> = {
  pending:  { label: 'Pending',  classes: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', classes: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', classes: 'bg-red-100   text-red-700'   },
}

export function StatusBadge({ status }: { status: LeaveStatus }) {
  const { label, classes } = config[status]
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  )
}
```

### `SkeletonTable.tsx`

```tsx
import { Skeleton } from '../ui/skeleton'

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}
```

### `EmptyState.tsx`

```tsx
import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-10 h-10 text-[#D1D5DB] mb-4" />
      <p className="text-sm font-semibold text-[#111318]">{title}</p>
      {description && <p className="text-sm text-[#6B7280] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

---

## 8. React Query + Supabase Pattern

All data fetching goes through React Query for caching + loading/error states.

```typescript
// src/hooks/useLeaveRequests.ts
export function useLeaveRequests(userId: string) {
  return useQuery({
    queryKey: ['leave_requests', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}

// Mutation with optimistic update
export function useApproveLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment, adminId }: ApproveArgs) => {
      const { error } = await supabase.from('leave_requests').update({
        status: 'approved',
        admin_comment: comment,
        decided_by: adminId,
        decided_at: new Date().toISOString()
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_leave_requests'] })
    }
  })
}
```

---

## 9. File & Folder Structure

```
src/
├── components/
│   ├── guards/
│   │   ├── AuthGuard.tsx
│   │   ├── AdminGuard.tsx
│   │   └── EmployeeGuard.tsx
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── shared/
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── SkeletonTable.tsx
│   │   └── MoneyDisplay.tsx      ← DM Mono formatted ₹ amount
│   └── ui/                       ← shadcn components
├── context/
│   └── ProfileContext.ts
├── hooks/
│   ├── useAuth.ts                ← Supabase auth state
│   ├── useProfile.ts             ← current user's profiles row
│   ├── useLeavePolicy.ts
│   ├── useLeaveRequests.ts       ← fetch + Realtime sync
│   ├── usePayrollPreview.ts
│   └── useSalaryHistory.ts
├── lib/
│   ├── supabaseClient.ts
│   └── dateUtils.ts              ← date formatting helpers with date-fns
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── employee/
│   │   ├── LeavesPage.tsx
│   │   └── SalaryPage.tsx
│   └── admin/
│       ├── LeavesPage.tsx
│       ├── PayrollPage.tsx
│       ├── PolicyPage.tsx
│       └── EmployeesPage.tsx
├── types/
│   └── database.types.ts         ← generated: npm run db:types
└── App.tsx
```

---

## 10. Key Libraries

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` v2 | DB + Auth + Realtime + Edge Functions client |
| `react-router-dom` v6 | Routing + data router |
| `@tanstack/react-query` v5 | Server state, caching, mutations |
| `tailwindcss` v3 | Utility CSS |
| `shadcn/ui` | Button, Input, Badge, Card, Skeleton, Dialog, Switch |
| `lucide-react` | Icons |
| `react-day-picker` v8 | Date picker |
| `date-fns` v3 | Date formatting + math |

---

## 11. UX Rules

| Rule | Detail |
|------|--------|
| No modals for approve/reject | Use inline row expansion |
| No page-level loading spinners | Skeleton loaders per section |
| No toast for form errors | Inline field-level messages |
| No toast for payroll | Inline success banner |
| Real-time status updates | Supabase Realtime on `leave_requests` |
| Monetary values | Always `DM Mono` font, always show currency symbol |
| Deductions/excess | Always red if > 0 |
| Empty tables | Always show `EmptyState` component |
| Inactive user lands | `/unauthorized` page, not a blank screen |
