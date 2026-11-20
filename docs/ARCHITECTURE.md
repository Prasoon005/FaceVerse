# Architecture

_Last updated: Phase 1 (2026-11-20)._

## Overview

FaceVerse is a Next.js app deployed on Vercel with Supabase as the backend. All face/voice AI runs
in the browser inside Web Workers (from Phase 2), so the server never sees raw video or audio and
needs no GPU. Supabase stores profiles, enrolled people and **embeddings** (numeric vectors) and
does similarity search with pgvector.

```text
┌──────────────────── Browser (Next.js on Vercel) ────────────────────┐
│  UI: App Router, shadcn/ui, Tailwind, Framer Motion                 │
│   ├─ Camera / mic (getUserMedia)                       [Phase 2/3]  │
│   ├─ face.worker.ts  → Human → 1024-d embedding        [Phase 2]    │
│   └─ voice.worker.ts → Transformers.js → 512-d vector  [Phase 3]    │
│  Matching: embeddings → Supabase RPC (pgvector cosine)              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS (supabase-js, RLS-protected)
┌──────────────────────────────▼──────────────────────────────────────┐
│ Supabase (free tier)                                                │
│  Auth (email, Google) · Postgres + pgvector (HNSW) · Storage        │
│  Realtime · RPC functions                                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Routing

| Route group   | Paths                                                                                                             | Notes                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `(marketing)` | `/`                                                                                                               | Static landing page                    |
| `(auth)`      | `/login`, `/signup`                                                                                               | Centered card layout                   |
| `(app)`       | `/dashboard`, `/activity`, `/live`, `/people`, `/enroll`, `/visitors`, `/albums`, `/tools`, `/focus`, `/settings` | Sidebar + topbar shell, requires login |
| `auth/*`      | `/auth/callback` (GET), `/auth/signout` (POST)                                                                    | Session exchange / sign-out            |
| `api/*`       | `/api/health`                                                                                                     | Keep-alive probe                       |

## Authentication flow

1. **Sign up / log in** happens in Client Components using the browser Supabase client
   (`src/lib/supabase/client.ts`). Session tokens are stored in cookies by `@supabase/ssr`.
2. **Google OAuth** redirects to Google, then to Supabase, then to `/auth/callback?code=…`, which
   exchanges the code for a session cookie (PKCE). Email confirmation links land on the same
   route with `token_hash` + `type`.
3. **`src/proxy.ts`** (Next 16's name for middleware) runs on every non-static request. It
   refreshes the session cookie via `supabase.auth.getClaims()` and does _optimistic_ redirects:
   signed-out users hitting `(app)` routes go to `/login?next=…`; signed-in users hitting
   `/login` or `/signup` go to `/dashboard`.
4. **`(app)/layout.tsx`** re-checks with `supabase.auth.getUser()` on the server (authoritative)
   and loads the profile for the user menu.
5. A Postgres trigger (`on_auth_user_created`) inserts a `profiles` row for every new auth user.

`?next=` values are validated by `safeNextPath()` to prevent open redirects.

## Data model (Phase 1)

Defined in `supabase/migrations/0002_core.sql`:

- `profiles`: one per auth user; `role` (`admin` | `member`), biometric-login flag, consent time.
- `people`: enrolled identities owned by a user; optionally linked to an app user.
- `face_embeddings` (`vector(1024)`) and `voice_embeddings` (`vector(512)`), HNSW cosine indexes.
- `recognition_events`, `auth_attempts`, `audit_logs`.

Later phases add `visitor_logs` (0003), `albums` / `album_photos` / `photo_faces` (0004) and RPC
functions (`match_faces`, `verify_face`, `verify_voice`, `find_in_album`).

### Row Level Security

- RLS is enabled on every table.
- Owner-scoped tables: full CRUD where `owner_id = auth.uid()`; admins can read all rows.
- `is_admin()` is `SECURITY DEFINER` so policies can check the caller's role without recursion.
- `profiles`: read/update own row only. `UPDATE` is granted only on safe columns, so users can't
  change their own `role`.
- `auth_attempts`: no insert policy; only the service role (server route, Phase 3) writes.

## Front-end structure

```text
src/
  app/                    routes (see table above), globals.css, root layout
  components/
    ui/                   shadcn/ui primitives (generated, not hand-edited)
    layout/               AppShell, Sidebar, MobileSidebar, Topbar, Breadcrumbs,
                          CommandMenu, ThemeToggle, UserMenu, NotificationsBell, NavLinks
    shared/               Logo, PageHeader, StatCard, EmptyState, ComingSoon
    auth/                 LoginForm, SignupForm, GoogleButton, FormField
    marketing/            SiteHeader, HeroMesh (canvas animation)
    providers.tsx         ThemeProvider, QueryClientProvider, TooltipProvider, Toaster
  config/site.ts          site metadata + sidebar navigation (single source of truth)
  lib/supabase/           client.ts, server.ts, middleware.ts (updateSession), env.ts
  lib/validations/        zod schemas (auth)
  stores/ui-store.ts      Zustand: sidebar collapsed (persisted), mobile nav, command palette
  types/database.ts       Supabase types
  proxy.ts                session refresh + redirects
```

Server/client boundary: pages and layouts are Server Components; `"use client"` is used only for
interactive pieces (forms, sidebar, topbar, command palette, theme toggle, hero animation).

## Design tokens

Defined as CSS variables in `src/app/globals.css` and exposed to Tailwind via `@theme inline`:
`background`, `card`, `border`, `primary`, `brand`, `success`, `warning`, `danger` (+ `*-foreground`
text variants that meet WCAG AA). Dark theme is the default (`next-themes`, class strategy).

## Security headers

Set in `next.config.ts` for all routes:

- `Content-Security-Policy`: self-only scripts plus `'wasm-unsafe-eval'` (for WASM AI backends),
  Supabase for `connect-src`/`img-src`, `worker-src 'self' blob:`, `frame-ancestors 'none'`.
- `Permissions-Policy: camera=(self), microphone=(self)`.
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.

## Ops

- **CI** (`.github/workflows/ci.yml`): `npm ci` → lint → format check → typecheck → unit tests.
- **Keep-alive** (`.github/workflows/keep-alive.yml`): every 3 days, `curl $HEALTH_URL`;
  `/api/health` runs a HEAD query against `profiles` so the free Supabase project stays active.
