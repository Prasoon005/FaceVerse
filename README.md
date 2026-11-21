# FaceVerse

**Face, voice and attendance in one private workspace.** FaceVerse is a multi-modal identity
platform: people sign in with their face and voice, mark attendance in seconds, and teams run
leave, absence reviews, visitor logs, announcements and messaging from a separate admin console.

Every AI model runs **on the device** (WebGL / WebAssembly in Web Workers). The server only stores
numeric embeddings, needs no GPU, and the whole stack runs on free tiers.

**Live:** <https://face-verse-two.vercel.app> · **Author:** [Prasoon Katiyar](https://github.com/Prasoon005)

> **Security note:** browser-side biometrics are a demo-grade second factor, not bank-grade
> security. Password and Google sign-in always remain available; biometric login is opt-in.

---

## Contents

- [Highlights](#highlights)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Deploying](#deploying-free)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Privacy and security](#privacy-and-security)
- [Limitations](#limitations)

## Highlights

- **On-device AI:** face (1024-d) and voice (512-d) embeddings are computed in the browser. Raw
  video and audio never leave the device.
- **Two portals:** members use `/login`; admins have their own sign-in (`/admin/login`) and console.
- **Locked identity:** a member's face (and optional voice) is locked after enrollment. Changing
  it needs an admin-approved request.
- **Attendance that runs itself:** face check-in and check-out, late marks, leave, holidays,
  absence reasons and a monthly deduction score that follows your company's rules.
- **Apple-style glass UI:** light and dark themes, glow effects in dark mode, accent colours,
  installable as an app (PWA), and a layout that fits phones, tablets and desktops.
- **Live everywhere:** Supabase Realtime pushes check-ins, approvals and messages instantly.

## Features

### Members

| Area                           | What you can do                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign in**                    | Email and password, Google, or **face + voice** biometric login (liveness, face, voice, challenge phrase)                                                        |
| **My identity**                | Guided face capture with live quality checks and an optional voice step. Locked after a final confirmation, with change requests sent to an admin                |
| **Attendance**                 | Liveness and face check on your own phone: the first scan checks you in, the second checks you out. Calendar, insights and an optional **office location check** |
| **Dashboard**                  | Greeting with a live clock, attendance and score rings, a **6-month heatmap** with current and best streaks                                                      |
| **Leave and reasons**          | Request leave. Explain an absence or a late day with an optional proof photo. See your **deduction score**                                                       |
| **Messages and announcements** | Real-time chat with admins and announcement pop-ups                                                                                                              |
| **Recognition tools**          | Live multi-face recognition, people directory, enrollment, smart visitor log                                                                                     |
| **Albums**                     | Event photo finder: take a selfie to find every photo you're in, download as ZIP, share links for guests                                                         |
| **Tools**                      | 1:1 face compare, privacy blur, focus tracker, voice commands                                                                                                    |
| **Profile and settings**       | Photo upload, phone and department. Theme (light, dark, auto) and **accent colour**. Security (biometric login) and privacy (export or delete my data)           |

### Admins

| Area                   | What you can do                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Overview**           | To-dos, live stats, **live activity feed**, today's check-ins with avatar status rings, absentees with "ask for a reason" |
| **Users**              | Search, roles, disable or delete. A **quick-view drawer** shows attendance, score and contact details                     |
| **Approvals**          | Approve enrollments and identity change requests                                                                          |
| **Attendance report**  | Users by days grid with export as **daily CSV, summary CSV (payroll) or a PDF report**                                    |
| **Reviews and leave**  | Decide absence and late reasons, and leave requests                                                                       |
| **Analytics**          | Attendance trend and weekday charts, top and bottom attendance                                                            |
| **Kiosk mode**         | One shared screen at the door recognises everyone with an approved identity                                               |
| **Communication**      | Announcements (everyone or one person) and a messaging inbox                                                              |
| **Workspace settings** | Working days, timezone, office hours, late grace, scoring rules, **holiday calendar**, **office geofence**                |
| **Audit log**          | Every admin action, with a readable timeline                                                                              |

## Tech stack

| Layer        | Choice                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, `proxy.ts`) and TypeScript (strict)                                                 |
| UI           | Tailwind CSS v4, shadcn/ui (Radix), Geist font, Framer Motion, lucide-react                                 |
| Face AI      | [@vladmandic/human](https://github.com/vladmandic/human) in a Web Worker (Comlink)                          |
| Voice AI     | [Transformers.js](https://huggingface.co/docs/transformers.js), WavLM speaker verification, in a Web Worker |
| Data         | TanStack Query, TanStack Table, Zustand, react-hook-form and zod                                            |
| Charts       | Recharts (validated colourblind-safe palette)                                                               |
| Backend      | Supabase: Auth, Postgres and pgvector, Storage, Realtime, Row Level Security                                |
| Testing      | Vitest and React Testing Library (137 unit tests)                                                           |
| CI / Hosting | GitHub Actions (lint, format, typecheck, tests), Vercel Hobby, Supabase Free                                |

## Architecture

```text
Browser (Next.js client)                           Supabase
+-------------------------------+                 +------------------------------+
| Camera / Mic                  |                 | Auth (email, Google)         |
|   -> Web Workers              |   embeddings    | Postgres + pgvector          |
|      Human (face, 1024-d)     | --------------> |   match_faces / verify_face  |
|      WavLM (voice, 512-d)     |                 |   RLS on every table         |
| UI: App Router + glass design | <-------------- | Realtime (live updates)      |
+-------------------------------+   rows, events  | Storage (private buckets)    |
            |                                     +------------------------------+
            v                                                ^
Next.js server (Vercel): Server Components, Server Actions,  |
API routes (attendance, kiosk, biometric login), proxy.ts ---+  service role only after
                                                                 requireAdmin()/getViewer()
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The full project report is in
[docs/FaceVerse_Project_Report.pdf](docs/FaceVerse_Project_Report.pdf).

## Getting started

### Prerequisites

- Node.js 20.9+ (22 recommended)
- A free [Supabase](https://supabase.com) project
- Optional: a Google Cloud OAuth client for Google sign-in (free)

### 1. Install

```bash
npm install          # also copies face models and ONNX Runtime files into public/
cp .env.example .env.local
```

### 2. Environment variables

From Supabase **Project Settings → API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role / secret key>   # server only, never commit
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Database migrations

Run each file in `supabase/migrations/` in the Supabase **SQL Editor**, in order:

| File                                 | Adds                                                             |
| ------------------------------------ | ---------------------------------------------------------------- |
| `0001_extensions.sql`                | pgvector and helpers                                             |
| `0002_core.sql`                      | profiles, people, embeddings, recognition events, audit log, RLS |
| `0003_face_matching.sql`             | `match_faces` RPC, people overview, avatars bucket               |
| `0004_biometric_login.sql`           | `verify_face` / `verify_voice`, login attempts                   |
| `0005_admin_attendance.sql`          | approvals, attendance, absence reviews, settings                 |
| `0006_admin_portal.sql`              | locked identity, change requests, announcements, leave, kiosk    |
| `0007_visitors.sql`                  | visitor log and snapshots bucket                                 |
| `0008_late_and_score.sql`            | office hours, late marks, deduction score rules                  |
| `0009_albums.sql`                    | albums, photo faces, share links                                 |
| `0010_messages.sql`                  | member ⇄ admin messaging                                         |
| `0011_holidays_geofence_profile.sql` | holidays, office geofence, phone and department                  |

Or with the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.

### 4. Authentication settings

In Supabase **Authentication → URL Configuration**:

- **Site URL:** your deployed URL (for example `https://face-verse-two.vercel.app`)
- **Redirect URLs:** `https://<your-app>.vercel.app/**` and `http://localhost:3000/**`

Email confirmation links land on a friendly **"Email confirmed"** page
(`/auth/callback?next=/auth/confirmed`). For Google sign-in, create an OAuth client with the
redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, enable Google in Supabase,
and **publish** the OAuth consent screen so everyone (not only test users) can sign in.

### 5. Run

```bash
npm run dev
```

Make yourself the first admin in the SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## Deploying (free)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com/new).
2. Add the four environment variables. Mark `SUPABASE_SERVICE_ROLE_KEY` as **Sensitive**.
3. Set the Supabase Site URL and Redirect URLs to the Vercel domain (see above).
4. **Keep-alive:** add a GitHub Actions secret `HEALTH_URL` =
   `https://<your-app>.vercel.app/api/health`, so the free Supabase project never pauses.

## Scripts

| Command                           | What it does                       |
| --------------------------------- | ---------------------------------- |
| `npm run dev`                     | Dev server (Turbopack)             |
| `npm run build` / `npm start`     | Production build / serve it        |
| `npm run lint`                    | ESLint                             |
| `npm run typecheck`               | Route types and `tsc --noEmit`     |
| `npm test`                        | Vitest unit tests                  |
| `npm run format` / `format:check` | Prettier                           |
| `npm run models:copy`             | Re-copy AI model and runtime files |

## Project structure

```text
src/app/            Routes: (marketing) landing, (auth), (app) member portal,
                    (admin) console, (admin-auth), api, auth callback, share
src/components/     ui (shadcn), layout, fx (backdrop, clock, rings), dashboard, admin,
                    attendance, identity, camera, voice, live, people, visitors, albums,
                    messages, settings, marketing, shared
src/lib/            ai, audio, attendance (days, score, geo), actions (Server Actions),
                    admin, data, supabase, ui (accent, charts, theme transition)
src/workers/        face.worker.ts (Human), voice.worker.ts (Transformers.js)
src/proxy.ts        Session refresh and auth redirects (Next 16 "proxy")
supabase/           SQL migrations
tests/unit/         Vitest suites
docs/               Architecture, privacy, changelog, phase checklists, project report
```

## Privacy and security

- Models run in the browser; only embeddings are stored. A face embedding can't be turned back
  into a photo.
- **Row Level Security on every table.** Members only see their own data. The service-role
  client is used only after the server verifies an active admin or member.
- Private storage buckets with short-lived signed URLs (avatars, proofs, snapshots, albums).
- Strict Content Security Policy and Permissions-Policy (camera, microphone and location for the
  site itself only).
- Consent before enrollment, export my data, and delete every biometric sample in one step.

See [docs/PRIVACY.md](docs/PRIVACY.md).

## Limitations

- Browser biometrics are a convenience factor; liveness runs on the client, so the server can only
  re-verify embeddings.
- Thresholds in `src/config/recognition.ts` (face 0.65, voice 0.80) are calibrated starting values.
- The first camera page downloads about 12 MB of models; the first voice feature about 100 MB
  (cached afterwards).
- Free-tier limits apply (Supabase: about 500 MB database, 1 GB storage).
- Not built yet: group-photo auto-tagging, two-person verification, video blur, offline mode,
  Playwright end-to-end tests.
