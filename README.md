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
| 1     | Foundation & UI shell, auth, database, CI                  | ✅ Built |
| 2     | Face engine, enrollment, live multi-face recognition       | ⏳ Next  |
| 3     | Voice engine + multi-factor biometric login                | Planned  |
| 4     | Smart visitor log                                          | Planned  |
| 5     | Event photo finder                                         | Planned  |
| 6     | Privacy, polish & v1 release                               | Planned  |
| 7+    | Stretch: compare, auto-tag, blur, focus, voice commands, … | Planned  |

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for what changed in each phase and
[docs/phases/](docs/phases/) for each phase's test checklist.

## Features

**Available now (Phase 1)**

- Landing page with an animated, original face-mesh visual
- Email/password sign-up and login, Google OAuth
- Protected app area with collapsible sidebar, mobile drawer, breadcrumbs, `Ctrl/⌘ + K` command
  palette, toasts, notifications bell and user menu
- Dark (default) and light themes
- Dashboard with stat cards, empty states and quick actions
- Supabase Postgres schema (pgvector) with Row Level Security on every table
- `/api/health` endpoint + GitHub Actions keep-alive so the free Supabase project never pauses
- CI: lint, format check, typecheck and unit tests on every push/PR

**Coming next:** face enrollment & live recognition (Phase 2), voice + biometric login (Phase 3),
visitor log (Phase 4), event photo finder (Phase 5).

## Tech stack

| Layer          | Choice                                                          |
| -------------- | --------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router) + TypeScript (strict)                   |
| Styling        | Tailwind CSS v4 + shadcn/ui (Radix), CSS-variable design tokens |
| Icons / Motion | lucide-react, Framer Motion                                     |
| Forms          | react-hook-form + zod                                           |
| State          | Zustand (client), TanStack Query (server)                       |
| Theme          | next-themes                                                     |
| Backend        | Supabase: Auth, Postgres + pgvector, Storage, Realtime          |
| Testing        | Vitest + React Testing Library (Playwright in Phase 6)          |
| CI / Hosting   | GitHub Actions, Vercel Hobby, Supabase Free                     |

Face AI (`@vladmandic/human`) and voice AI (Transformers.js) are added in Phases 2 and 3.

## Getting started

### Prerequisites

- Node.js 20.9+ (22 recommended)
- A free [Supabase](https://supabase.com) account
- (Optional) A Google Cloud project for Google sign-in — free

### 1. Install

```bash
npm install
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

To make yourself an admin, run in the SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<your-auth-user-id>';
```

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

## Deploying (free)

1. Push the repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new) (Hobby plan).
3. Add the four environment variables from `.env.example`; set `NEXT_PUBLIC_SITE_URL` to your
   Vercel URL.
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
src/components/      ui (shadcn), layout, shared, auth, marketing
src/config/          site + navigation config
src/lib/             supabase clients, validations, utils
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
