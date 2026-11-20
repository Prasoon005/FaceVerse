# Changelog

All notable changes to this project are documented here, grouped by build phase.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Phase 3] Voice engine & multi-factor biometric login — 2026-11-21

### Added

- **Voice engine:** `@huggingface/transformers` 4.3.2 (in the spec's stack) running
  `Xenova/wavlm-base-plus-sv` (quantised, ~100 MB, cached by the browser) in
  `src/workers/voice.worker.ts` via Comlink. Output: L2-normalised 512-d speaker embeddings. The
  model was verified first: it loads in Transformers.js and returns `[1, 512]` embeddings, so the
  ONNX fallback wasn't needed.
- **ONNX Runtime self-hosted:** `scripts/copy-models.mjs` also copies the ORT WASM files into
  `public/ort` (git-ignored), so no CDN is needed at runtime.
- **Audio utilities** (`src/lib/audio`): `resample.ts` (decode + resample to mono 16 kHz),
  `vad.ts` (energy-based silence trim, needs ≥ 2 s of speech), `phrase.ts` (3 random words +
  2 digits, fuzzy transcript match ≥ 70%), `transcribe.ts` (Web Speech API wrapper),
  `process-recording.ts` (recording → embedding pipeline).
- **Components:** MicRecorder (live waveform, auto-stop at 8 s, mic permission states), Waveform,
  ChallengePhrase, VoiceCapture, VoiceModelStatus. Hooks: `useMicrophone`, `useVoiceEngine`,
  `useIsClient`.
- **Enrollment:** voice step (3 phrases, optional for new people), `/enroll?person=<id>&mode=voice`
  to add voice later, voice sample counts in the People table and on the person page (with
  "Delete voice samples").
- **Migration `0004_biometric_login.sql`:** `verify_face`, `verify_voice`, `user_id_by_email`
  (all service-role only) and an `auth_attempts (ip_hash, created_at)` index.
- **Biometric login** (`/biometric-login`, linked from the sign-in page): email, then liveness,
  then face, then voice, then success, on a progress rail. The face is captured on the same face
  track that passed liveness.
- **`POST /api/biometric-login`:** zod validation, server-side re-verification with the service
  role, lockout after 5 failures / 15 min per account (10 per IP), every attempt logged in
  `auth_attempts` with an HMAC-hashed IP, session issued through a server-generated magic-link
  token exchange, audit log entry.
- **Login retries and guidance:** a voice or phrase failure keeps the verified face and offers up to
  3 voice tries (new phrase each time, face reused for at most 3 minutes) before starting again
  from liveness. Face or liveness failures start over. Every failure shows practical tips for its
  reason (lighting, noise, mic, how to read the phrase).
- **Verification UI:** Liveness / Face / Voice status chips that tick green as each factor passes,
  a scan-line overlay during the face scan, an animated voiceprint while analysing and verifying,
  a success badge, and soft synthesized sound cues (mute toggle remembered per browser). All
  animations respect reduced motion.
- **App-wide motion and sound:** a sound toggle in the top bar (Zustand store, persisted) controls
  all UI sounds (`lib/audio/feedback.ts`, synthesized with Web Audio, no files): shutter on face
  capture, ticks on record start/stop, scan and success cues, a chime when Live recognises someone
  (once per person per 30 s) and a low tone for new unknown faces. Motion: page transitions
  (`(app)/template.tsx`), a sliding active highlight in the sidebar, count-up stat numbers, staggered
  dashboard cards and activity rows, camera flash and pop-in thumbnails on enrollment, a "Hold still"
  scan line, and animated names in the Live side panel. `<MotionConfig reducedMotion="user">` makes
  every animation follow the OS reduce-motion setting.
- **Settings → Security** (`/settings/security`): biometric login switch (requires a linked person
  with ≥ 3 face and ≥ 3 voice samples), requirement checklist with shortcuts, and recent attempts
  with face/voice scores. `/settings` is now an index page; user menu links to Security.
- **Tests:** resampling, silence trimming, phrase generation and matching, login decision rules,
  lockout window, request validation, voice-retry rules, sound preference (102 unit tests in total).

### Changed

- CSP `connect-src` allows `huggingface.co`, `*.huggingface.co` and `*.hf.co` (voice model
  download).
- Auth layout widens for pages marked `data-wide` (biometric login has a camera view).
- `/biometric-login` redirects signed-in users to the dashboard, like `/login`.

### Deviations from the spec

- **Voice threshold 0.80** instead of 0.70. It started at the model card's 0.86, but real logins
  with a laptop mic scored 0.73–0.93 for the right person, and most were just under 0.86. Lowered
  to 0.80 from those attempts (Settings → Security shows the scores).
- **`verify_face` / `verify_voice` also require `people.owner_id = target_user`.** The spec's
  version only checked `linked_user_id`, and because users can set that column on people they
  own, someone could enroll their own face, link it to another account and log in as that user.
- **Schema additions (need your OK):** `user_id_by_email()` (the Admin API can't look users up
  by email) and the `auth_attempts` IP index.
- Migration numbering: biometric login is `0004`, so visitors and albums become **0005** and
  **0006**.
- Liveness and the phrase check run in the browser; the server re-verifies embeddings only. The
  README and UI describe biometric login as demo-grade.

## [Phase 2] Face engine, enrollment & live recognition — 2026-11-20

### Added

- **Dependencies (approved):** `@vladmandic/human`, `comlink`, `@tanstack/react-table`,
  `browser-image-compression`. shadcn components: table, alert-dialog, progress, select, checkbox.
- **Model setup:** `scripts/copy-models.mjs` (runs on `postinstall`) copies the five face models
  (blazeface, facemesh, iris, faceres, emotion, ~12 MB) into `public/models`; they are git-ignored
  and served from our own origin.
- **Face worker** (`src/workers/face.worker.ts`): Human on WebGL with a WASM fallback, exposed via
  Comlink. Frames arrive as transferable `ImageBitmap`s. Returns boxes, L2-normalised 1024-d
  embeddings, yaw/pitch/roll, eye aspect ratio, emotion, and optional sharpness and landmarks.
  Download progress is shown on first load; models are cached in IndexedDB afterwards.
- **AI utilities** (`src/lib/ai`): `vector.ts` (normalize, cosine, toPgVector, parsePgVector),
  `quality.ts` (quality check, quality score, Laplacian sharpness), `liveness.ts` (EAR, random
  challenge engine), `tracker.ts` (IoU tracker), `capture.ts` (face thumbnails, snapshots).
- **Thresholds** in `src/config/recognition.ts`: match ≥ 0.65, uncertain 0.55–0.65, and a 0.10
  margin over the next-best person (calibrated with the Scores panel).
- **Hooks:** `useCamera` (permissions, device switch, cleanup on unmount), `useFaceEngine`,
  `useDetectionLoop` (fps-capped, pauses in hidden tabs), `usePageVisible`.
- **Components:** CameraView, FaceOverlay (animated corner brackets), ConfidenceRing,
  PermissionGate, ModelLoader, LivenessChallenge, StepperRail, ConfirmDialog (typed confirmation),
  DataTable (TanStack Table v9, sorting + search).
- **Migration `0003_face_matching.sql`:** `match_faces` RPC, `people_overview` view
  (security_invoker), a `recognition_events (person_id, created_at)` index, and the private
  `avatars` bucket with owner-only storage policies.
- **Enrollment wizard** (`/enroll`, `/enroll?person=<id>` to add samples): details form, then guided
  3-pose capture with live quality chips and auto-capture (up to 5 samples), then review with an
  optional compressed thumbnail as profile photo, then done screen.
- **People** (`/people`, `/people/[id]`): searchable table, row actions, detail page with samples
  (delete individually), recognition history, add samples, delete person (typed confirmation,
  audit log).
- **Live recognition** (`/live`): multi-face tracking, debounced matching once per track with
  retries for unknowns, recognition events throttled to 1 per person per 30 s, in-frame panel,
  pause, snapshot (PNG with labels), camera switch, FPS + backend indicator, and a "Test liveness"
  dialog.
- **Dashboard:** real counts (people, recognitions and unknown faces in the last 24 h), a 14-day
  area chart (Recharts) and a recent activity feed.
- **Tests:** vector utils, EAR + liveness engine, quality check, tracker, similarity
  classification, dashboard bucketing and formatting (71 unit tests in total).

### Fixed (found during the phase check)

- **Faces matched to the wrong person, or strangers named.** Two causes:
  - Human caches face descriptors by face index between similar frames. With several people in
    view, one person's descriptor could be reused for another's box. Descriptor and emotion caching
    are now off (`skipFrames: 0`).
  - A single threshold can't separate people well: across enrolled samples, same-person and
    different-people similarities overlap. A margin rule now requires the best person to beat the
    next-best by 0.10 (live: right person ~0.69–0.77 vs next ~0.50). Thresholds were recalibrated
    from real Scores data to 0.65 / 0.55.
- Live tracks are matched on the average of their last 5 usable embeddings (turned-away and tiny
  faces are skipped), and re-checked every 2 s, so an early wrong match corrects itself.
- New **Scores** panel on `/live` for calibration: per-face best and next-best similarity, plus
  same-person vs different-people similarity across your enrolled samples.

### Changed

- Sidebar: Live, People and Enroll no longer show "P2" badges.
- CSP `connect-src` allows `https://cdn.jsdelivr.net`, used only by the WASM fallback.

### Deviations from the spec

- Migration numbering: face matching is `0003_face_matching.sql`, so the spec's visitors and
  albums migrations become **0004** and **0005**.
- **Schema addition (needs your OK):** the `people_overview` view and one index aren't in the
  spec. They give the People table sample counts and "last seen" in one RLS-safe query. They can
  be swapped for client-side aggregation if you prefer.
- `@tanstack/react-table` installed as **v9**, which has a new API (`useTable` + `tableFeatures`).
  The DataTable uses it.
- The WASM fallback loads tfjs `.wasm` binaries from jsdelivr, because Human doesn't ship them.
  WebGL (the default) needs no CDN.
- Liveness is demonstrated through the Live page's "Test liveness" dialog. It's wired into login
  in Phase 3.

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
