# Phase 1 — Foundation & UI shell

**Status:** ✅ done (deployed to https://face-verse-two.vercel.app) · **Date:** 2026-11-20

## What was built

| Feature                  | Key files                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Project scaffold         | `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`                             |
| Tooling                  | `.prettierrc.json`, `vitest.config.mts`, `tests/setup.ts`                                          |
| Design system & theme    | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/providers.tsx`, `src/components/ui/*` |
| Database schema + RLS    | `supabase/migrations/0001_extensions.sql`, `0002_core.sql`, `src/types/database.ts`                |
| Supabase wiring          | `src/lib/supabase/*`, `src/proxy.ts`                                                               |
| Auth                     | `src/app/(auth)/*`, `src/app/auth/*`, `src/components/auth/*`, `src/lib/validations/auth.ts`       |
| App shell                | `src/components/layout/*`, `src/stores/ui-store.ts`, `src/app/(app)/layout.tsx`                    |
| Dashboard + placeholders | `src/app/(app)/*/page.tsx`, `src/components/shared/*`                                              |
| Landing page             | `src/app/(marketing)/page.tsx`, `src/components/marketing/*`                                       |
| Health route             | `src/app/api/health/route.ts`                                                                      |
| CI + keep-alive          | `.github/workflows/ci.yml`, `.github/workflows/keep-alive.yml`                                     |
| Docs                     | `README.md`, `docs/*`                                                                              |

Verified locally: `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` (18 tests) ✅ ·
`npm run build` ✅ · smoke test (landing/login/signup 200, protected routes 307 → `/login?next=…`,
CSP + Permissions-Policy headers present) ✅.

## Phase check — how to test

### A. Local, before Supabase (2 min)

```bash
npm install
npm run lint && npm run typecheck && npm test && npm run build
```

### B. Local with Supabase

Follow README → _Getting started_ steps 2–5, then:

- [ ] `/` landing page loads; face-mesh animates; theme toggle switches dark ↔ light
- [ ] Resize to ~360px wide: no horizontal scroll, header buttons still usable
- [ ] Visiting `/dashboard` while signed out redirects to `/login?next=%2Fdashboard`
- [ ] Sign up with email → either lands on dashboard, or shows "Check your inbox" (if email
      confirmation is on) → confirmation link lands on dashboard
- [ ] In Supabase **Table Editor → profiles**, a row exists for the new user with your name
- [ ] Sign out (user menu) → back on `/login`; signing in again works
- [ ] Wrong password shows an error toast
- [ ] "Continue with Google" signs in and shows your Google avatar in the user menu
- [ ] Sidebar collapses to icons (and stays collapsed after reload); tooltips show labels
- [ ] Mobile width: hamburger opens the drawer; tapping a link closes it
- [ ] `Ctrl + K` opens the command palette; "Start live scan" navigates to `/live`
- [ ] Breadcrumbs update per page; placeholder pages show their "Arriving in Phase N" state
- [ ] `http://localhost:3000/api/health` returns `{"status":"ok","db":"ok",...}`
- [ ] Keyboard only: Tab shows visible focus rings; "Skip to content" appears on first Tab

### C. RLS sanity check

In the SQL editor (runs as `postgres`, so bypasses RLS) confirm policies exist:

```sql
select tablename, policyname from pg_policies where schemaname = 'public' order by 1;
```

Then, signed in as user A in the app's browser console, nothing from another user should be
readable (fully tested once Phase 2 creates data).

### D. Deploy (Done criteria)

- [ ] Vercel deploy succeeds with env vars set (README → _Deploying_)
- [ ] Supabase redirect URLs include the Vercel `/auth/callback`
- [ ] Sign up, Google login and dashboard work on the live URL, in both themes, on desktop and phone
- [ ] `HEALTH_URL` secret added; manually run **Actions → Keep Supabase alive** → green
- [ ] Push to GitHub → **CI** workflow green

## Git: commit plan

You run all git commands. First-time setup:

```bash
git init -b main
git remote add origin https://github.com/Prasoon005/faceverse.git   # create the empty repo on GitHub first
```

Then make these commits in order (each `git add` lists exactly the files for that feature):

```bash
# 1
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs .gitignore .env.example AGENTS.md public src/app/favicon.ico PROJECT_SPEC.md.pdf
git commit -m "chore: scaffold Next.js 16 app with TypeScript strict and Tailwind v4"

# 2
git add .prettierrc.json .prettierignore vitest.config.mts tests/setup.ts tests/e2e/.gitkeep
git commit -m "chore(tooling): add Prettier, ESLint prettier config and Vitest"

# 3
git add components.json src/lib/utils.ts src/components/ui src/app/globals.css src/app/layout.tsx src/components/providers.tsx src/config/site.ts src/components/shared/logo.tsx src/components/layout/theme-toggle.tsx
git commit -m "feat(ui): add design tokens, fonts, shadcn/ui and dark/light theme"

# 4
git add supabase src/types/database.ts
git commit -m "feat(db): add core schema migrations with RLS and profile trigger"

# 5
git add src/lib/supabase src/proxy.ts
git commit -m "feat(supabase): wire browser/server clients and session proxy"

# 6
git add src/lib/validations src/app/auth "src/app/(auth)" src/components/auth tests/unit/auth-validation.test.ts
git commit -m "feat(auth): add email signup/login, Google OAuth and auth callback"

# 7
git add src/components/shared
git commit -m "feat(ui): add PageHeader, StatCard, EmptyState and ComingSoon components"

# 8
git add src/stores src/components/layout "src/app/(app)/layout.tsx" "src/app/(app)/error.tsx" tests/unit/nav.test.tsx tests/unit/command-menu.test.tsx
git commit -m "feat(shell): add sidebar, topbar, breadcrumbs and command palette"

# 9
git add "src/app/(app)" src/app/not-found.tsx
git commit -m "feat(dashboard): add dashboard with stat cards, empty states and module placeholders"

# 10
git add "src/app/(marketing)" src/components/marketing
git commit -m "feat(landing): add landing page with animated face-mesh hero"

# 11
git add src/app/api
git commit -m "feat(api): add /api/health endpoint for keep-alive"

# 12
git add .github
git commit -m "ci: add CI workflow and Supabase keep-alive cron"

# 13
git add README.md docs
git commit -m "docs: add README, architecture, privacy, changelog and phase 1 checklist"

git status        # should be clean
git push -u origin main
```

> Intermediate commits are a readable history of how the feature set was assembled; the full app
> builds from the final commit onwards.

## What's next — Phase 2

Face worker (Human + Comlink), model copying script, ModelLoader, PermissionGate, CameraView,
FaceOverlay, quality checks, enrollment wizard (face steps), People table + detail page,
`match_faces` RPC, live multi-face recognition with tracking, throttled `recognition_events`,
liveness module, unit tests for vector utils and EAR.

New dependencies Phase 2 will need (from the spec): `@vladmandic/human`, `comlink`,
`@tanstack/react-table`, `browser-image-compression`.
