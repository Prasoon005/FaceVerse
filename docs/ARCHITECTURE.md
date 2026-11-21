# Architecture

_Last updated: Phase 4A (2026-11-21)._

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
│  Biometric login: embeddings → /api/biometric-login (service role)  │
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

| Route group   | Paths                                                                                                                                                                            | Notes                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `(marketing)` | `/`                                                                                                                                                                              | Static landing page                    |
| `(auth)`      | `/login`, `/signup`, `/biometric-login`                                                                                                                                          | Centered card layout                   |
| `(app)`       | `/dashboard`, `/activity`, `/live`, `/people`, `/enroll`, `/visitors`, `/albums`, `/tools`, `/focus`, `/settings`, `/settings/security`, `/attendance`, `/admin/*` (admins only) | Sidebar + topbar shell, requires login |
| `auth/*`      | `/auth/callback` (GET), `/auth/signout` (POST)                                                                                                                                   | Session exchange / sign-out            |
| `api/*`       | `/api/health`, `/api/biometric-login` (POST), `/api/attendance` (POST)                                                                                                           | Keep-alive probe                       |

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

`0004_biometric_login.sql` (Phase 3) adds, all `SECURITY DEFINER` and executable only by the
service role (revoked from `PUBLIC`, `anon` and `authenticated`):

- `verify_face(target_user, query)` / `verify_voice(target_user, query)`: best cosine similarity
  against people that are both **owned by** and **linked to** the target user. The spec's version
  only checked `linked_user_id`, which would let someone link their own face to another user.
- `user_id_by_email(email)`: email → user id for the login route.
- An `auth_attempts (ip_hash, created_at)` index for per-IP rate limiting.

`0005_admin_attendance.sql` (Phase 4A) adds:

- `people.approval_status` (+ `reviewed_by`, `reviewed_at`, `review_note`). The trigger
  `people_enforce_approval` sets account-linked self-enrollments to `pending` for non-admins and
  keeps the review fields read-only for them. `verify_face` / `verify_voice` require `approved`.
- `profiles.disabled` (not in the user-updatable column grant).
- `attendance` (`unique (user_id, day)`), `absence_reviews` (`unique (user_id, day)`, status
  `asked → answered → approved | rejected`), `attendance_settings` (single row). Users read their
  own rows, admins read all; **only server code (service role) writes**.
- Private `absence-proofs` bucket (`<uid>/<file>`; owner + admin read). Admins can read
  `avatars`.
- Realtime publication for `attendance`, `absence_reviews`, `people`.

Later phases add `visitor_logs` (0006), `albums` / `album_photos` / `photo_faces` (0007) and
`find_in_album`.

### Row Level Security

- RLS is enabled on every table.
- Owner-scoped tables: full CRUD where `owner_id = auth.uid()`; admins can read all rows.
- `is_admin()` is `SECURITY DEFINER` so policies can check the caller's role without recursion.
- `profiles`: read/update own row only. `UPDATE` is granted only on safe columns, so users can't
  change their own `role`.
- `auth_attempts`: no insert policy; only the service role (`/api/biometric-login`) writes. Users
  can read their own rows (Settings → Security).

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

## Voice pipeline and biometric login (Phase 3)

```text
MicRecorder (MediaRecorder + AnalyserNode waveform, auto-stop at 8 s)
   │  optional: Web Speech API transcript of the challenge phrase
   ▼
decodeToMono16k (AudioContext decode → OfflineAudioContext resample) → trimSilence (energy VAD)
   │  rejects < 2 s of speech
   ▼
voice.worker.ts ── Transformers.js: AutoProcessor + WavLM x-vector (q8, WASM)
   → 512-d embedding (L2-normalised)
   ▼
Enroll: 3 phrases → voice_embeddings
Login:  /biometric-login
   Email → LivenessChallenge (2 random prompts) → face capture on the SAME track (3 frontal
   frames averaged) → challenge phrase (voice embedding + phrase score)
   → POST /api/biometric-login
   Voice/phrase failure → up to 3 voice tries with the same face (≤ 3 min old)
   Face/liveness failure or 3rd voice failure → start again from liveness
```

`/api/biometric-login` (Node runtime, service role):

1. Validates the body with zod (embedding sizes, finite values) and re-normalises embeddings.
2. Rate limits: 5 failures / 15 min per account, 10 per IP (HMAC-hashed IP in `auth_attempts`).
3. Looks up the user and requires `profiles.biometric_login_enabled`. Unknown emails and disabled
   accounts get the same "not set up" answer.
4. Checks `verify_face` ≥ face match threshold, `verify_voice` ≥ 0.80, liveness passed, and phrase
   score ≥ 70% when transcription ran. Failures return reasons, never scores.
5. Logs the attempt. On success, `auth.admin.generateLink({ type: "magiclink" })` creates a
   one-time token (no email is sent) that is immediately exchanged with `verifyOtp` on the
   cookie-based server client, which sets the session cookies. An audit log entry is written.

Liveness and the phrase check happen in the browser, so the server can't prove them. This is why
biometric login is an opt-in, demo-grade factor.

The voice model files come from the Hugging Face Hub (cached by the browser's Cache API). The ONNX
Runtime WASM files are self-hosted under `/ort` (copied by `scripts/copy-models.mjs`).

## Admin console and attendance (Phase 4A)

- **Access:** `(app)/admin/layout.tsx` calls `requireAdminPage()`, which returns 404 for
  non-admins. Every admin **Server Action** (`src/lib/actions/admin.ts`) calls `requireAdmin()`
  again (Server Actions are reachable by direct POST), writes with the service role, inserts an
  `audit_logs` row and calls `refresh()`.
- **Per-user privacy is unchanged:** admins can _read_ everything through the existing
  "admin read" RLS policies, so the admin's own Dashboard, People and Scores queries filter by
  `owner_id`. Cross-user views live only under `/admin` (loaded server-side with the service
  role, including emails from `auth.admin.listUsers`).
- **Attendance:** `LivenessChallenge captureFace` → `POST /api/attendance` → the server checks
  the session, the user's approved linked person and `verify_face` ≥ face match, then inserts
  today's row (workspace timezone) or sets `check_out_at`.
- **Day status** (`lib/attendance/days.ts`): present if there's a row; otherwise upcoming,
  untracked (before joining), day off (not a working day), excused / pending (review), today (not
  yet), else absent.
- **Live updates:** `LiveUpdates` (admin pages and `/attendance`) and `NotificationsBell`
  subscribe to `postgres_changes`; RLS limits users to their own rows.
- **Disabled accounts:** `setUserDisabled` bans the auth user and sets `profiles.disabled`; the
  `(app)` layout shows "Account disabled", and the login/attendance routes refuse them.

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
    camera/               CameraView, FaceOverlay, PermissionGate, ModelLoader, LivenessChallenge,
                          ScanOverlay
    voice/                MicRecorder, Waveform, ChallengePhrase, VoiceCapture, VoiceModelStatus,
                          VoiceScan
    enroll/               EnrollWizard + Details / FaceCapture / VoiceCapture / Review / Done steps
    settings/             SecuritySettings
    attendance/           CheckInCard, AttendanceCalendar, AbsenceQuestions, AbsenceAnswerDialog
    admin/                LiveUpdates, UsersTable, ApprovalQueue, AttendanceReport, ReviewBoard,
                          AbsentList, AskReasonDialog, WorkspaceSettingsForm
    people/               PeopleTable, PersonDetail, PersonAvatar, ListTypeBadge
    live/                 LiveRecognition, InFramePanel, ScoresPanel
    charts/               RecognitionsChart
    auth/                 LoginForm, SignupForm, GoogleButton, FormField, BiometricLogin,
                          VerificationStatus, VerificationTips
    marketing/            SiteHeader, HeroMesh (canvas animation)
    providers.tsx         ThemeProvider, QueryClientProvider, TooltipProvider, Toaster
  config/site.ts          site metadata + sidebar navigation (single source of truth)
  config/recognition.ts   thresholds, quality, liveness and live-mode tuning
  workers/face.worker.ts  Human face engine (Comlink)
  workers/voice.worker.ts Transformers.js speaker embeddings (Comlink)
  hooks/                  useCamera, useMicrophone, useFaceEngine, useVoiceEngine,
                          useDetectionLoop, usePageVisible, useIsClient, useSoundFeedback
  lib/ai/                 vector, quality, liveness, tracker, capture, face + voice clients, types
  lib/audio/              resample, vad (silence trim), phrase, transcribe, process-recording,
                          feedback (UI sounds)
  lib/auth/biometric.ts   login request schema, decision rules, lockout window
  lib/attendance/days.ts  timezone-aware days, day status, summaries, CSV
  lib/admin/              server.ts (getViewer, requireAdmin), data.ts (workspace users)
  lib/actions/            Server Actions: admin.ts, attendance.ts
  lib/data/               people, recognition, dashboard (server), security
  lib/supabase/           client.ts, server.ts, admin.ts (service role, server only),
                          middleware.ts (updateSession), env.ts
  lib/validations/        zod schemas (auth, person)
  stores/ui-store.ts      Zustand: sidebar collapsed (persisted), mobile nav, command palette
  stores/face-engine-store.ts  Zustand: face model loading status / progress / backend
  stores/voice-engine-store.ts Zustand: voice model loading status / progress
  stores/sound-store.ts        Zustand: UI sounds on/off (persisted)
  types/database.ts       Supabase types
  proxy.ts                session refresh + redirects
```

Server/client boundary: pages and layouts are Server Components; `"use client"` is used only for
interactive pieces (forms, sidebar, topbar, command palette, theme toggle, hero animation, camera
pages). Client data access uses TanStack Query (`peopleKeys`); the dashboard queries on the server.

## Motion and sound

- `components/shared/motion.tsx`: `Stagger` / `StaggerItem` / `StaggerList` / `StaggerListItem`
  and `AnimatedNumber` (Client Components that Server Components can render).
- `(app)/template.tsx` re-mounts on navigation for a short page transition; the sidebar highlight
  uses a shared `layoutId`.
- `<MotionConfig reducedMotion="user">` in `providers.tsx` applies the OS reduce-motion setting
  to every framer-motion animation.
- Sounds: `lib/audio/feedback.ts` synthesizes short tones with Web Audio. `useSoundFeedback()`
  plays them only when `stores/sound-store.ts` (persisted) is enabled; `SoundToggle` sits in the
  top bar and on the biometric login page.

## Design tokens

Defined as CSS variables in `src/app/globals.css` and exposed to Tailwind via `@theme inline`:
`background`, `card`, `border`, `primary`, `brand`, `success`, `warning`, `danger` (+ `*-foreground`
text variants that meet WCAG AA). Dark theme is the default (`next-themes`, class strategy).

## Security headers

Set in `next.config.ts` for all routes:

- `Content-Security-Policy`: self-only scripts plus `'wasm-unsafe-eval'` (for WASM AI backends),
  Supabase for `connect-src`/`img-src`, `cdn.jsdelivr.net` in `connect-src` (face WASM fallback
  only), `huggingface.co` / `*.hf.co` in `connect-src` (voice model download),
  `worker-src 'self' blob:`, `frame-ancestors 'none'`.
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)` (geolocation for the office check-in check).
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.

## Ops

- **CI** (`.github/workflows/ci.yml`): `npm ci` → lint → format check → typecheck → unit tests.
- **Keep-alive** (`.github/workflows/keep-alive.yml`): every 3 days, `curl $HEALTH_URL`;
  `/api/health` runs a HEAD query against `profiles` so the free Supabase project stays active.
