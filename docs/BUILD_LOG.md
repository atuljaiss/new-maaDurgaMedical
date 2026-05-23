# Build Log

## Phase 0: Setup
- [x] Initialized Git and basic docs structure
- [x] Supabase CLI installed
- [x] Initialized Supabase config (`supabase init`) and configured for Vite dev server (`http://localhost:5173`)
- [ ] Started Supabase (`supabase start`) -> **BLOCKED:** Waiting for Docker Desktop to be running on host.

## Phase 1: Database & Backend
- [x] Auth and RLS strategy drafted.
- [x] Created `001` through `015` SQL migrations covering all tables, enums, RLS policies, and RPC functions.
- [ ] Apply migrations (`supabase db push`) -> **BLOCKED:** Waiting for Docker.
- [ ] Generate local types (`supabase gen types typescript`) -> **BLOCKED:** Waiting for Docker.

## Phase 2: Frontend Scaffold
- [x] Created React + Vite + TS project (`npm create vite@latest hr-portal`)
- [x] Installed all dependencies (React Query, Router, Tailwind/CSS, Lucide, date-fns)
- [x] Configured `vite.config.ts`, `tsconfig.json`, `index.html`

## Phase 3-6: Frontend Implementation
- [x] Auth context and guards (`useAuth`, `ProfileContext`, `AuthGuard`, `AdminGuard`, `EmployeeGuard`)
- [x] Layout components (`AppShell`, `Sidebar`, `Topbar`, `MobileNav`)
- [x] Custom CSS design system matching tech spec aesthetics (`index.css`)
- [x] React Query hooks (`useLeaveRequests`, `usePayroll`, `useSalaryHistory`, `useProfile`)
- [x] Shared components (`StatusBadge`, `MoneyDisplay`, `EmptyState`, `SkeletonTable`)
- [x] App pages:
  - Auth: `LoginPage`, `UnauthorizedPage`
  - Employee: `LeavesPage`, `SalaryPage`
  - Admin: `LeavesPage`, `EmployeesPage`, `PayrollPage`, `PolicyPage`
- [x] Built and compiled frontend (`npm run build` succeeds).

## Next Steps
1. User needs to manually start **Docker Desktop**.
2. Run `supabase start`.
3. Run `supabase db push` to push schemas to local database.
4. Run `supabase gen types typescript --local > src/types/database.types.ts` to replace placeholder types.
5. Create default admin user in Supabase local Studio.
6. Test end-to-end functionality in browser (`npm run dev`).
