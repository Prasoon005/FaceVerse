# FaceVerse

**Multi-modal identity & recognition platform.** Face recognition, voice recognition and
multi-face detection for everyday problems: passwordless sign-in, visitor logs for
hostels/societies/offices, finding yourself in event photos, privacy-blurring photos and focus
tracking.

All AI models run **on your device** (WebGL/WASM in Web Workers). The backend only stores numeric
embeddings, needs no GPU and runs entirely on free tiers.

> **Security note:** browser-side biometrics are a demo-grade second factor, not bank-grade
> security. Password and Google sign-in always remain available; biometric login is opt-in.

Author: [Prasoon Katiyar](https://github.com/Prasoon005)

<!-- Screenshots: add once deployed -->
<!-- ![Landing page](docs/screenshots/landing.png) -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

---

## Status

| Phase | Scope                                                      | Status   |
| ----- | ---------------------------------------------------------- | -------- |
| 1     | Foundation & UI shell, auth, database, CI                  | ✅ Done  |
| 2     | Face engine, enrollment, live multi-face recognition       | ✅ Done  |
| 3     | Voice engine + multi-factor biometric login                | ✅ Done  |
| 4A    | Admin portal, final identity, attendance, leave, kiosk     | ✅ Built |
| 4B    | Smart visitor log                                          | ✅ Built |
| 5     | Event photo finder                                         | ✅ Built |
| 6     | Privacy, polish & v1 release                               | ✅ Built |
| 7+    | Stretch: compare, auto-tag, blur, focus, voice commands, … | ✅ Most  |

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for what changed in each phase and
[docs/phases/](docs/phases/) for each phase's test checklist.

## Features

**Phases 5–7: photo finder, privacy, tools**

- **Event photo finder:** upload an album (faces indexed in the browser), take a selfie, get every
  photo you're in, download them as a ZIP; public share links let guests do the same
- **Privacy:** consent before enrollment, export my data (JSON), delete all my biometrics,
  storage usage meter, activity timeline
- **Tools:** 1:1 face compare, privacy blur, focus/drowsiness tracker, voice commands, duplicate
  enrollment warning, watchlist alerts for flagged people, installable PWA

**Phase 4B: smart visitor log**

- **Scan visitor:** returning visitors are recognised and checked in with one click (history and
  last details pre-filled); new visitors get a quick form and are recognised next time
- Check-in / check-out, flagged-person warning, optional private snapshot
- Visitor log with date / status / search filters, CSV export for Excel, live dashboard and bell
- Admins see every user's visitor log

**Phase 4A: admin portal + attendance**

- **Two portals:** users sign in at `/login`; admins have their own sign-in (`/admin/login`) and
  console. Users only ever see their own data; admins see and manage everyone
- **My identity** (`/identity`): users enroll their face + voice once; after a "these are final"
  confirmation it's **locked**. Changing it needs a request that an admin approves (one
  re-enrollment). An admin also approves each enrollment before it counts
- **Face attendance** (`/attendance`): liveness + face check on your own phone, verified on the
  server; first scan = check-in, second = check-out. Calendar, streak and monthly rate
- **Kiosk mode:** a shared device at the door recognises anyone with an approved identity
- **Leave requests** and **absence reviews** (reason + optional proof), decided by the admin
- **Announcements** to everyone or one user, with live pop-ups for important ones
- **Admin console:** dashboard with to-dos, analytics charts, users (with a detail page), approvals,
  change requests, attendance report with CSV export, leave, reviews, audit log, settings
- **Live updates** everywhere (Supabase Realtime) with sound and animation

**Phase 3: voice + biometric login**

- On-device voice engine: [Transformers.js](https://huggingface.co/docs/transformers.js) running
  the `Xenova/wavlm-base-plus-sv` speaker-verification model in a Web Worker (512-d embeddings)
- **MicRecorder** with a live waveform, 16 kHz resampling and energy-based silence trimming
  (needs at least 2 s of speech)
- **Challenge phrases** (3 random words + 2 digits), checked with the Web Speech API where the
  browser supports it
- Voice step in the enrollment wizard (3 phrases, optional for new people) and "Add voice" for
  existing people
- **Biometric login** (`/biometric-login`): email, then liveness, then face, then voice. The
  `/api/biometric-login` route re-verifies the embeddings with the service role, rate-limits
  (5 failures / 15 min per account), logs every attempt and issues the session
- **Settings → Security:** turn biometric login on or off (needs a linked person with face and
  voice samples) and see recent attempts with their scores
- **Motion and sound across the app:** page transitions, count-up stats, scan lines, camera flash,
  voiceprint animation and soft synthesized sound cues, with a mute button in the top bar. Respects
  the OS reduce-motion setting

**Phase 2: face recognition**

- On-device face engine ([Human](https://github.com/vladmandic/human)) in a Web Worker: detection,
  1024-d face descriptor, mesh, iris, emotion. WebGL with a WASM fallback
- Model loading progress, device camera permission handling and graceful error states
- **Enrollment wizard:** details, then guided face capture (straight, one side, other side) with
  live quality chips (size, sharpness, pose, confidence, single face) and auto-capture, then review
- **People:** searchable, sortable table with avatar, samples and last seen; detail page with
  samples, recognition history, add samples and delete
- **Live recognition:** every face in frame tracked and matched via pgvector, with name tags, a
  green/amber/red confidence ring, an "in frame" panel, pause, snapshot, camera switch and FPS
- **Liveness check** (random blink / turn / smile challenges), reusable for biometric login
- Dashboard stats, a 14-day recognitions chart and activity feed now use real data

**Phase 1: foundation**

- Landing page with an animated, original face-mesh visual
- Email/password sign-up and login, Google OAuth
- Protected app area with collapsible sidebar, mobile drawer, breadcrumbs, `Ctrl/⌘ + K` command
  palette, toasts, notifications bell and user menu
- Dark (default) and light themes
- Dashboard with stat cards, empty states and quick actions
- Supabase Postgres schema (pgvector) with Row Level Security on every table
- `/api/health` endpoint + GitHub Actions keep-alive so the free Supabase project never pauses
- CI: lint, format check, typecheck and unit tests on every push/PR

**Not built yet:** group photo auto-tagging, two-person verification, video blur, offline mode.

## Tech stack

| Layer          | Choice                                                          |
| -------------- | --------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router) + TypeScript (strict)                   |
| Styling        | Tailwind CSS v4 + shadcn/ui (Radix), CSS-variable design tokens |
| Icons / Motion | lucide-react, Framer Motion                                     |
| Face AI        | @vladmandic/human in a Web Worker (Comlink)                     |
| Voice AI       | Transformers.js (WavLM x-vector) in a Web Worker (Comlink)      |
| Tables         | TanStack Table v9                                               |
| Charts         | Recharts                                                        |
| Forms          | react-hook-form + zod                                           |
| State          | Zustand (client), TanStack Query (server)                       |
| Theme          | next-themes                                                     |
| Backend        | Supabase: Auth, Postgres + pgvector, Storage, Realtime          |
| Testing        | Vitest + React Testing Library (Playwright in Phase 6)          |
| CI / Hosting   | GitHub Actions, Vercel Hobby, Supabase Free                     |

## Getting started

### Prerequisites

- Node.js 20.9+ (22 recommended)
- A free [Supabase](https://supabase.com) account
- (Optional) A Google Cloud project for Google sign-in — free

### 1. Install

```bash
npm install          # also copies face models + ONNX Runtime files into public/ (postinstall)
cp .env.example .env.local
```

### 2. Create the Supabase project

1. Create a new project at <https://supabase.com/dashboard> (free tier).
2. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the
   **service_role** key into `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only, never commit
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

### 3. Run the database migrations

Either paste each file into the Supabase **SQL Editor** in order:

1. `supabase/migrations/0001_extensions.sql`
2. `supabase/migrations/0002_core.sql`
3. `supabase/migrations/0003_face_matching.sql` (match_faces RPC, people overview, avatars bucket)
4. `supabase/migrations/0004_biometric_login.sql` (verify_face / verify_voice for biometric login)
5. `supabase/migrations/0005_admin_attendance.sql` (approvals, attendance, absence reviews, settings)

…or use the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### 4. Configure authentication

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (change to your Vercel URL after deploying)
- **Redirect URLs:** add `http://localhost:3000/auth/callback` (and later
  `https://<your-app>.vercel.app/auth/callback`)

**Email:** With _Confirm email_ enabled (default) new users get a confirmation link; disable it
under **Authentication → Providers → Email** for faster local testing.

**Email template (recommended):** the default confirmation link only signs you in if it is opened in
the same browser you signed up in. Switch it to a server-verified link so it works from the Gmail
app or any browser. In **Authentication → Emails → Templates → Confirm signup**, replace the link
with:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
  Confirm your email
</a>
```

Do the same for **Magic Link** (`type=email`) if you use it later.

**Google (optional, free):**

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**,
   create an **OAuth client ID** (type _Web application_).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Supabase **Authentication → Providers → Google**, enable it and paste the client ID and
   secret.

### 5. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, sign up, and you land on the dashboard.

To make yourself an admin (needed for `/admin`), run in the SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

After that, other admins can be made from **Admin → Users**.

## Scripts

| Command                | What it does                          |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack)      |
| `npm run build`        | Production build                      |
| `npm run start`        | Serve the production build            |
| `npm run lint`         | ESLint                                |
| `npm run typecheck`    | Generate route types + `tsc --noEmit` |
| `npm test`             | Vitest unit tests                     |
| `npm run format`       | Prettier write                        |
| `npm run format:check` | Prettier check (used in CI)           |
| `npm run models:copy`  | Re-copy AI model/runtime files        |

## Deploying (free)

1. Push the repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new) (Hobby plan).
3. Add the four environment variables from `.env.example`; set `NEXT_PUBLIC_SITE_URL` to your
   Vercel URL. Mark `SUPABASE_SERVICE_ROLE_KEY` as **Sensitive**; biometric login needs it.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the Vercel URL and add
   `https://<your-app>.vercel.app/auth/callback` to the redirect list.
5. **Keep-alive:** in GitHub → **Settings → Secrets and variables → Actions**, add a secret
   `HEALTH_URL` = `https://<your-app>.vercel.app/api/health`. The `Keep Supabase alive` workflow
   pings it every 3 days (you can also run it manually from the Actions tab).

## Project structure

```text
.github/workflows/   CI + keep-alive
docs/                Architecture, changelog, privacy, per-phase checklists
supabase/            SQL migrations + seed
src/app/             Routes: (marketing), (auth), (app), api, auth callback
src/components/      ui (shadcn), layout, shared, auth, marketing, camera, voice, enroll, people,
                     live, charts, settings
src/config/          site + navigation config
src/lib/             ai (vector, liveness, quality, tracker, face/voice clients), audio (resample,
                     silence trim, phrases, transcription), auth (biometric rules), data, supabase
src/workers/         face.worker.ts (Human) and voice.worker.ts (Transformers.js), off the main thread
src/hooks/           useCamera, useMicrophone, useFaceEngine, useVoiceEngine, useDetectionLoop
scripts/             copy-models.mjs
src/stores/          Zustand stores
src/types/           Database types
src/proxy.ts         Session refresh + auth redirects (Next 16 "proxy", formerly middleware)
tests/               unit (Vitest) and e2e (Playwright, Phase 6)
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Privacy

See [docs/PRIVACY.md](docs/PRIVACY.md). In short: models run in your browser, only embeddings are
stored, every table has Row Level Security, and you can export or delete your biometric data.

## Limitations

- Biometric checks run in the browser and are a convenience factor, not production-grade
  biometric security.
- Free Supabase limits apply (~500 MB database, 1 GB storage, 5 GB egress/month).
- Face matching thresholds (`src/config/recognition.ts`) are starting values; tune them with
  your own data. If the liveness "turn left/right" prompts feel swapped, flip `yawLeftSign`.
- First visit to a camera page downloads ~12 MB of models; the first voice feature downloads
  ~100 MB (both cached afterwards).
- Voice threshold (0.80, calibrated from real logins) and phrase checking are starting values. Speech
  transcription only works in browsers with the Web Speech API (Chrome, Edge, Safari); elsewhere
  only the voice itself is checked.
- Liveness and the phrase check run in the browser, so the server can only re-verify the
  embeddings. That's why biometric login is an opt-in, demo-grade factor.
