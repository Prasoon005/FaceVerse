# Architecture

_Last updated: Phase 2 (2026-11-20)._

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

## Data model

Defined in `supabase/migrations/0002_core.sql`:

- `profiles`: one per auth user; `role` (`admin` | `member`), biometric-login flag, consent time.
- `people`: enrolled identities owned by a user; optionally linked to an app user.
- `face_embeddings` (`vector(1024)`) and `voice_embeddings` (`vector(512)`), HNSW cosine indexes.
- `recognition_events`, `auth_attempts`, `audit_logs`.

`0003_face_matching.sql` (Phase 2) adds:

- `match_faces(query, match_threshold, match_count)`: `SECURITY INVOKER`, owner-filtered top-k
  cosine matches, returning the best sample per person.
- `people_overview` view (`security_invoker = true`): people + face/voice sample counts +
  `last_seen_at`.
- Private `avatars` storage bucket; objects live at `<owner uid>/<person id>.jpg` and only their
  owner can read or write them (signed URLs for display).

Later phases add `visitor_logs` (0004), `albums` / `album_photos` / `photo_faces` (0005) and the
`verify_face`, `verify_voice` and `find_in_album` functions.

### Row Level Security

- RLS is enabled on every table.
- Owner-scoped tables: full CRUD where `owner_id = auth.uid()`; admins can read all rows.
- `is_admin()` is `SECURITY DEFINER` so policies can check the caller's role without recursion.
- `profiles`: read/update own row only. `UPDATE` is granted only on safe columns, so users can't
  change their own `role`.
- `auth_attempts`: no insert policy; only the service role (server route, Phase 3) writes.

## Face recognition pipeline (Phase 2)

```text
useCamera ─▶ <video> ─▶ useDetectionLoop (≈7 FPS, one frame in flight, pauses when tab hidden)
                          │ createImageBitmap + Comlink.transfer (no pixel copies)
                          ▼
               face.worker.ts ── Human (WebGL → WASM fallback)
                 detect → box, score, 1024-d embedding (L2-normalised), yaw/pitch/roll,
                          eye aspect ratio, emotion, [sharpness], [landmarks]
                          ▼
   Enroll: qualityCheck + pose check → auto-capture 3–5 samples → face_embeddings
   Live:   FaceTracker (IoU) → per-track matchFace() on the mean of 5 embeddings, after 500 ms, re-checked every 2 s
           → match_faces RPC (top 2) → classify (≥0.65 match with 0.10 margin, 0.55–0.65 uncertain)
           → FaceOverlay + InFramePanel → recognition_events (≤1 per person / 30 s)
   Liveness: random 2 of blink / turn left / turn right / smile, 8 s each,
             same track id throughout (lib/ai/liveness.ts)
```

- Models (`blazeface`, `facemesh`, `iris`, `faceres`, `emotion`) are copied to `public/models` by
  `scripts/copy-models.mjs` on install. The worker downloads them with progress the first time,
  then Human caches them in IndexedDB.
- The main thread only draws. Overlays are positioned in percentages of the frame, and the video
  container uses the stream aspect ratio, so boxes never drift. CSS transitions smooth the motion
  between detections.
- Tunable values live in `src/config/recognition.ts`.

## Front-end structure

```text
src/
  app/                    routes (see table above), globals.css, root layout
  components/
    ui/                   shadcn/ui primitives (generated, not hand-edited)
    layout/               AppShell, Sidebar, MobileSidebar, Topbar, Breadcrumbs,
                          CommandMenu, ThemeToggle, UserMenu, NotificationsBell, NavLinks
    shared/               Logo, PageHeader, StatCard, EmptyState, ComingSoon, ConfidenceRing,
                          StepperRail, ConfirmDialog, DataTable
    camera/               CameraView, FaceOverlay, PermissionGate, ModelLoader, LivenessChallenge
    enroll/               EnrollWizard + Details / FaceCapture / Review / Done steps
    people/               PeopleTable, PersonDetail, PersonAvatar, ListTypeBadge
    live/                 LiveRecognition, InFramePanel
    charts/               RecognitionsChart
    auth/                 LoginForm, SignupForm, GoogleButton, FormField
    marketing/            SiteHeader, HeroMesh (canvas animation)
    providers.tsx         ThemeProvider, QueryClientProvider, TooltipProvider, Toaster
  config/site.ts          site metadata + sidebar navigation (single source of truth)
  config/recognition.ts   thresholds, quality, liveness and live-mode tuning
  workers/face.worker.ts  Human face engine (Comlink)
  hooks/                  useCamera, useFaceEngine, useDetectionLoop, usePageVisible
  lib/ai/                 vector, quality, liveness, tracker, capture, face (worker client), types
  lib/data/               people, recognition (match + throttled logging), dashboard (server)
  lib/supabase/           client.ts, server.ts, middleware.ts (updateSession), env.ts
  lib/validations/        zod schemas (auth, person)
  stores/ui-store.ts      Zustand: sidebar collapsed (persisted), mobile nav, command palette
  stores/face-engine-store.ts  Zustand: model loading status / progress / backend
  types/database.ts       Supabase types
  proxy.ts                session refresh + redirects
```

Server/client boundary: pages and layouts are Server Components; `"use client"` is used only for
interactive pieces (forms, sidebar, topbar, command palette, theme toggle, hero animation, camera
pages). Client data access uses TanStack Query (`peopleKeys`); the dashboard queries on the server.

## Design tokens

Defined as CSS variables in `src/app/globals.css` and exposed to Tailwind via `@theme inline`:
`background`, `card`, `border`, `primary`, `brand`, `success`, `warning`, `danger` (+ `*-foreground`
text variants that meet WCAG AA). Dark theme is the default (`next-themes`, class strategy).

## Security headers

Set in `next.config.ts` for all routes:

- `Content-Security-Policy`: self-only scripts plus `'wasm-unsafe-eval'` (for WASM AI backends),
  Supabase for `connect-src`/`img-src`, `cdn.jsdelivr.net` in `connect-src` (WASM fallback only),
  `worker-src 'self' blob:`, `frame-ancestors 'none'`.
- `Permissions-Policy: camera=(self), microphone=(self)`.
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.

## Ops

- **CI** (`.github/workflows/ci.yml`): `npm ci` → lint → format check → typecheck → unit tests.
- **Keep-alive** (`.github/workflows/keep-alive.yml`): every 3 days, `curl $HEALTH_URL`;
  `/api/health` runs a HEAD query against `profiles` so the free Supabase project stays active.
