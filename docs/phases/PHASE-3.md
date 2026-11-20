# Phase 3 — Voice engine & multi-factor biometric login

**Status:** ✅ done (phase check passed) · **Date:** 2026-11-21

**Done when:** you can log out and log back in using only email + liveness + face + voice, and a
different person or recording is rejected.

## What was built

| Feature                  | Key files                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Dependency + ORT copying | `package.json`, `scripts/copy-models.mjs`, `.gitignore`, `eslint.config.mjs`, `.prettierignore`                                     |
| Audio utilities          | `src/lib/audio/*`, `src/config/recognition.ts`                                                                                      |
| Voice engine + recorder  | `src/workers/voice.worker.ts`, `src/lib/ai/voice.ts`, `src/stores/voice-engine-store.ts`, `src/hooks/*`, `src/components/voice`     |
| Voice enrollment         | `src/components/enroll/*`, `src/app/(app)/enroll`, `src/lib/data/people.ts`, `src/components/people/*`                              |
| Database                 | `supabase/migrations/0004_biometric_login.sql`, `src/types/database.ts`                                                             |
| Biometric login          | `src/app/(auth)/biometric-login`, `src/components/auth/biometric-login.tsx`, `src/app/api/biometric-login/route.ts`, `src/lib/auth` |
| Settings → Security      | `src/app/(app)/settings/**`, `src/components/settings`, `src/lib/data/security.ts`                                                  |
| Tests                    | `tests/unit/{audio,phrase,biometric}.test.ts`                                                                                       |

Verified locally: `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` (102 tests) ✅ ·
`npm run build` ✅. The voice model was checked in Node first: it loads in Transformers.js and
returns 512-d embeddings. The production server serves `/ort/*`, `/biometric-login` renders, and
`/api/biometric-login` rejects malformed requests. Microphone, camera and the full login flow need
a real browser, so they are covered by the checklist below.

## Setup before testing

1. **Run the new migration.** In Supabase **SQL Editor → New query**, paste
   `supabase/migrations/0004_biometric_login.sql` and run it. **Database → Functions** should now
   list `verify_face`, `verify_voice` and `user_id_by_email`.
2. Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_…` key). The login route
   needs it.
3. `npm install` was already run (it also copied `public/ort`). If `public/ort` is empty, run
   `npm run models:copy`.
4. Restart `npm run dev` and hard-refresh the browser (`Ctrl + Shift + R`).

## Phase check — how to test

### A. Voice enrollment

- [ ] Open your own person's page (the one with **This is me** / "Linked account"). If you don't
      have one, enroll yourself with **This is me** ticked
- [ ] **Add voice**: the voice model downloads with a progress bar the first time (~100 MB)
- [ ] Deny microphone access once: "Microphone blocked" appears with **Try again**
- [ ] Record 3 phrases. The waveform moves while you speak and recording stops by itself at 8 s
- [ ] Say only one word: you get "Heard only … of speech" and nothing is saved
- [ ] In Chrome, each phrase shows "heard …%". Review lists 3 phrases. **Save**
- [ ] The person page shows **Voice samples: 3**; the People table shows "3 face · 3 voice"

### B. Settings → Security

- [ ] `/settings/security`: all three requirements are ticked and the switch can be turned **On**
- [ ] On a person without voice samples (or a fresh account), the switch is disabled and the
      checklist links to the missing step

### C. Biometric login (Done criteria)

- [ ] Sign out. On `/login`, click **Sign in with face + voice**
- [ ] Enter your email, complete the 2 liveness prompts, then hold still for the face capture
- [ ] Status chips (Liveness / Face / Voice) tick green as each step passes; a scan line sweeps
      over the camera during the face scan and the voiceprint animation plays while analysing
- [ ] Soft sounds play on each step (speaker button next to the progress rail mutes them)
- [ ] Read the phrase. You land on the dashboard, signed in
- [ ] Settings → Security lists the attempt as **Signed in** with face and voice scores

### D. Rejections

- [ ] **Different person:** someone else does the face + voice steps with your email → rejected
      with a reason (face and/or voice didn't match)
- [ ] **Voice retry:** speak in a deliberately different voice. You get "Try voice again" with
      tips and "N tries left", **without** redoing liveness. After the 3rd failed voice try, it starts
      again from liveness
- [ ] A face failure (someone else's face) shows face tips and **Start again** (no voice retry)
- [ ] **Recording:** play a recording of your voice saying a _different_ phrase → rejected
      ("spoken words didn't match", in browsers with transcription)
- [ ] An email without biometric login turned on → "Biometric login isn't set up for this email"
- [ ] Fail 5 times in a row → "Too many failed attempts" (the 6th try is blocked for 15 minutes)

### E. Motion and sound across the app

- [ ] The speaker button in the top bar mutes/unmutes all sounds and is remembered after a reload
- [ ] Changing pages fades the content in; the sidebar highlight slides to the new page
- [ ] Dashboard numbers count up and the cards and activity rows appear one after another
- [ ] Enroll: each auto-capture flashes the camera with a shutter sound, the thumbnail pops in,
      and the last pose plays a success chime; "Hold still…" scan line shows when the pose matches
- [ ] Voice: a tick when recording starts and stops; the voiceprint animation while analysing
- [ ] Live: a chime when someone is recognised (once per person per 30 s), a low tone for a new
      unknown face; names slide into the side panel
- [ ] With the OS "reduce motion" setting on, the animations are skipped

### F. Deploy

- [ ] Vercel → **Settings → Environment Variables**: `SUPABASE_SERVICE_ROLE_KEY` exists (mark it
      **Sensitive**). Add it if it's missing, then redeploy
- [ ] Push. The Vercel build log shows `[copy-models] copied 2 files to public/ort`
- [ ] On the live URL: voice enrollment and biometric login work on desktop Chrome

## Tuning tips

- After a few logins, look at the voice scores in Settings → Security. If your own voice scores
  are just under the threshold (0.80), lower `voice.match` in `src/config/recognition.ts` a little.
  If someone else got close, raise it.
- Voice matching uses your **best** sample, so recording 3 more phrases where you usually log in
  (People → your page → Add voice) raises your scores more safely than lowering the threshold.
- Record voice samples in a quiet room at a normal volume, like when you log in.
- Speech transcription uses your browser language when it's English (e.g. `en-IN`). If phrases
  are often misheard, speak the digits clearly ("four", "seven").

## Git: commit plan

Run each block in order (`git add`, then `git commit`). Final check: `git status` shows a clean
tree, then `git push`.

```bash
# 1
git add package.json package-lock.json scripts .gitignore eslint.config.mjs .prettierignore
git commit -m "chore(deps): add Transformers.js and self-host ONNX Runtime WASM files"

# 2
git add src/stores/sound-store.ts src/hooks/use-sound-feedback.ts src/lib/audio/feedback.ts src/components/layout/sound-toggle.tsx src/components/layout/topbar.tsx src/components/layout/nav-links.tsx src/components/providers.tsx src/components/shared/motion.tsx src/components/shared/stat-card.tsx "src/app/(app)/template.tsx" "src/app/(app)/dashboard" src/components/live tests/unit/sound.test.ts
git commit -m "feat(ui): add app-wide sound feedback, page transitions and motion"

# 3
git add src/lib/audio/resample.ts src/lib/audio/vad.ts src/lib/audio/phrase.ts src/lib/audio/transcribe.ts src/config/recognition.ts tests/unit/audio.test.ts tests/unit/phrase.test.ts
git commit -m "feat(audio): add resampling, silence trimming, challenge phrases and transcription"

# 4
git add src/workers/voice.worker.ts src/lib/ai/voice.ts src/lib/audio/process-recording.ts src/stores/voice-engine-store.ts src/hooks/use-voice-engine.ts src/hooks/use-microphone.ts src/hooks/use-is-client.ts src/components/voice next.config.ts
git commit -m "feat(voice): add WavLM voice worker, MicRecorder, Waveform and voiceprint scan"

# 5
git add src/components/enroll "src/app/(app)/enroll" src/lib/data/people.ts src/components/people
git commit -m "feat(enroll): add voice enrollment step, capture flash and voice samples on people pages"

# 6
git add supabase/migrations/0004_biometric_login.sql src/types/database.ts src/lib/auth src/lib/supabase/admin.ts src/lib/supabase/middleware.ts src/app/api/biometric-login src/components/camera src/components/auth "src/app/(auth)" tests/unit/biometric.test.ts
git commit -m "feat(auth): add multi-factor biometric login with server-side verification"

# 7
git add src/lib/data/security.ts src/components/settings "src/app/(app)/settings" src/components/ui/switch.tsx src/components/layout/user-menu.tsx
git commit -m "feat(settings): add security settings with biometric login toggle and attempts"

# 8
git add README.md docs
git commit -m "docs: document phase 3 voice engine, biometric login and UI feedback"
```

## What's next — Phase 4

Smart visitor log: migration `0005`, visitors page, scan-visitor modal, returning-visitor
recognition, new-visitor quick form, check-in/out, filters, CSV export, and Realtime updates on
the dashboard and notifications bell.
