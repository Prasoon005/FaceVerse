# Changelog

All notable changes to this project are documented here, grouped by build phase.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Phase 1] Foundation & UI shell — 2026-11-20

### Added

- **Project setup:** Next.js 16.4 (App Router, Turbopack), TypeScript strict, Tailwind CSS v4,
  shadcn/ui (Radix, "nova" style), ESLint (next + prettier), Prettier with Tailwind plugin, `@/*`
  path alias, Vitest + React Testing Library.
- **Design system:** colour tokens from the spec (dark `#0A0A0B`/`#111113`/`#1F1F23`, light
  `#FAFAFA`/`#FFFFFF`/`#E4E4E7`, indigo accent, success/warning/danger), Inter + JetBrains Mono,
  8px control / 12px card radius, reduced-motion support, dark theme by default with light toggle.
- **App shell:** collapsible sidebar (persisted), mobile drawer, topbar with breadcrumbs, command
  palette (`Ctrl/⌘ + K`) with navigation + quick actions, theme toggle, notifications bell
  (placeholder), user menu with sign-out, skip-to-content link, toasts (sonner).
- **Landing page:** hero with original animated canvas face-mesh, feature grid, "how it works",
  privacy section, CTA, footer.
- **Supabase:** browser + server clients (`@supabase/ssr`), session-refreshing `src/proxy.ts`,
  migrations `0001_extensions.sql` and `0002_core.sql` (all core tables, HNSW vector indexes,
  `is_admin()`, profile-on-signup trigger, RLS on every table, column-level grant so users can't
  change their own role), hand-written `src/types/database.ts`.
- **Auth:** email sign-up/login (react-hook-form + zod), Google OAuth, `/auth/callback` (OAuth code and email confirmation), POST `/auth/signout`, protected `(app)` routes (proxy redirect and server check in layout), safe `?next=` redirects.
- **Dashboard:** 4 placeholder stat cards, recognitions chart empty state, quick actions, activity
  empty state, loading skeleton. Placeholder pages for every upcoming module.
- **Ops:** `/api/health` (cheap Postgres query), `ci.yml` (lint, format, typecheck, test),
  `keep-alive.yml` (every 3 days), security headers (CSP with `wasm-unsafe-eval`,
  Permissions-Policy for camera/mic).
- **Docs:** README, ARCHITECTURE, PRIVACY, this changelog, Phase 1 checklist.

### Fixed

- Command palette crash ("Cannot read properties of undefined (reading 'subscribe')"): newer
  shadcn `CommandDialog` needs an explicit `<Command>` wrapper; dialog title moved inside the content.
- Theme toggle hydration mismatch (label no longer depends on the theme during SSR).
- Email confirmation link landing on `/login` with "Missing auth code": the callback now handles
  Supabase error params and already-used links gracefully, `/login` reads `#error_description`
  fragments, and the README documents a server-verified `token_hash` email template.

### Deviations from the spec (version differences)

- Next.js 16 renamed `middleware.ts` to **`proxy.ts`** — the file lives at `src/proxy.ts`; the
  Supabase helper keeps the spec's name `src/lib/supabase/middleware.ts`.
- `create-next-app` enabled `cacheComponents` by default; it is **disabled** because the app is
  auth-heavy and every page reads cookies.
- Primary button colour is `#5B5EF0` (visually the same indigo) because white text on `#6366F1`
  is 4.47:1, just under WCAG AA. `#6366F1` is still used for focus rings.
- `@hookform/resolvers` added (glue between react-hook-form and zod).
- `@types/node` set to v22 to satisfy Vitest 5's peer range.
