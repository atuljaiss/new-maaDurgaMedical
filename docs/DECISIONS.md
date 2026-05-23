# Architecture Decisions — HR Leave & Salary Portal

## D1 — Edge Functions Deferred (v1)
**Decision**: Edge Function `create-employee` is deferred to post-v1.  
**Rationale**: The prompt says "defer Edge Functions for v1". Admin creates users via Supabase Studio locally. README documents the process.

## D2 — Tailwind v4 with @tailwindcss/vite
**Decision**: Use Tailwind CSS v4 with `@tailwindcss/vite` plugin (modern approach).  
**Rationale**: Simpler setup, no `tailwind.config.ts` file needed. CSS-first configuration.

## D3 — shadcn/ui Components
**Decision**: Use `shadcn@latest init` for component primitives.  
**Rationale**: Matches UI doc spec. If init fails, fall back to hand-coded Tailwind components.

## D4 — Single Migration File vs Many
**Decision**: Use numbered migration files (`001_enums.sql`, `002_profiles.sql`, etc.) matching the backend doc spec exactly.  
**Rationale**: Easier to debug and matches the doc's migration order.

## D5 — TECH_DOC.md Naming
**Decision**: The existing `TECH_DOC_Version2.md` is used as the `TECH_DOC.md` reference.  
**Rationale**: It is the only tech doc present. A symlink/copy is not needed since the prompt just says "read" it.

## D6 — Frontend in Root
**Decision**: The Vite app is scaffolded inside a `hr-portal/` subdirectory to keep Supabase config at project root.  
**Rationale**: `supabase/` lives at project root; frontend lives in `hr-portal/`. Clean separation.

## D7 — Realtime on leave_requests Only
**Decision**: Supabase Realtime is enabled only on `leave_requests`.  
**Rationale**: Per security checklist — salary tables must NOT be in Realtime publication.

## D8 — No service_role Key in Frontend
**Decision**: Frontend uses `anon` key only. No Edge Function invocations in v1.  
**Rationale**: Matches core requirement. Admin creates users via Supabase Studio.

## D9 — Monthly Deduction Only
**Decision**: Salary deduction is monthly-based only. Yearly allowance is informational.  
**Rationale**: Per core requirements — "simple v1".
