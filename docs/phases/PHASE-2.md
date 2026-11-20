# Phase 2 — Face engine, enrollment & live multi-face recognition

**Status:** ✅ done (phase check passed) · **Date:** 2026-11-20

**Done when:** you can enroll 3 people and the live page names all of them at the same time with
correct confidence, and unknown faces are marked Unknown.

## What was built

| Feature                      | Key files                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Dependencies + model copying | `package.json`, `scripts/copy-models.mjs`, `.gitignore`                                                        |
| AI utilities + thresholds    | `src/lib/ai/{vector,quality,liveness,tracker,types}.ts`, `src/config/recognition.ts`                           |
| Face worker + engine client  | `src/workers/face.worker.ts`, `src/lib/ai/{face,capture}.ts`, `src/stores/face-engine-store.ts`, `src/hooks/*` |
| Camera components            | `src/components/camera/*`, `src/components/shared/confidence-ring.tsx`                                         |
| Database                     | `supabase/migrations/0003_face_matching.sql`, `src/types/database.ts`                                          |
| Shared UI                    | `src/components/shared/{stepper-rail,confirm-dialog,data-table}.tsx`, new `src/components/ui/*`                |
| People                       | `src/lib/data/people.ts`, `src/lib/format.ts`, `src/components/people/*`, `src/app/(app)/people/**`            |
| Enrollment wizard            | `src/lib/validations/person.ts`, `src/components/enroll/*`, `src/app/(app)/enroll/page.tsx`                    |
| Live recognition + liveness  | `src/lib/data/recognition.ts`, `src/components/live/*`, `src/app/(app)/live/page.tsx`                          |
| Real dashboard               | `src/lib/data/dashboard.ts`, `src/components/charts/*`, `src/app/(app)/dashboard/page.tsx`                     |
| Tests                        | `tests/unit/{vector,liveness,quality-tracker,dashboard-format,calibration}.test.ts`                            |

Verified locally: `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` (71 tests) ✅ ·
`npm run build` ✅ · production server serves `/models/*` and protects `/live`, `/enroll`,
`/people` ✅. Camera features need a real browser + webcam, so they are covered by the checklist
below.

## Setup before testing

1. **Run the new migration.** In Supabase **SQL Editor → New query**, paste
   `supabase/migrations/0003_face_matching.sql` and run it. Then check:
   - **Database → Functions** lists `match_faces`
   - **Storage** lists a private bucket named `avatars`
2. `npm install` (only if `public/models` is empty; the `postinstall` copies the models).
3. `npm run dev` and open <http://localhost:3000>.

## Phase check — how to test

### A. Enrollment

- [ ] `/enroll`: model loader shows progress the first time, then the camera feed appears
- [ ] Deny camera permission once: the "Camera blocked" message appears with **Try again**
- [ ] Details step validates the name (try 1 character)
- [ ] Face step: quality chips react ("Move closer", "Face the camera more", "Only one face")
- [ ] Look straight: auto-captures. Turn slightly to one side, then the other: both capture
- [ ] Review: 3 thumbnails with quality %, "Save as profile photo" ticked, then **Save**
- [ ] Done screen animates; **View person** opens the detail page with 3 samples
- [ ] Enroll **two more people** (friends/family, or photos on a phone screen for a quick test)

### B. People

- [ ] `/people` lists all 3 with avatar, samples = 3 and last seen = "Never"
- [ ] Search filters rows; clicking column headers sorts
- [ ] Row menu → **Add samples** opens the capture step for that person
- [ ] Delete needs the exact name typed; the row disappears

### C. Live recognition (Done criteria)

- [ ] `/live` with all 3 people in frame: each gets a **green** box, name and confidence %
- [ ] A person who isn't enrolled gets a **red "Unknown"** box
- [ ] The side panel lists everyone recognised plus uncertain and unknown counts
- [ ] FPS indicator shows about 5–8 fps; switching tabs pauses detection (CPU drops)
- [ ] **Pause**, **Snapshot** (downloads a PNG with labels) and **Switch camera** (on phones) work
- [ ] **Test liveness**: complete 2 prompts and see "Liveness passed". Look away mid-check and it
      fails with a reason
- [ ] If "turn left/right" feels swapped, set `yawLeftSign: -1` in `src/config/recognition.ts`

### D. Dashboard

- [ ] After a live session: people count, recognitions today and unknown faces are non-zero
- [ ] The 14-day chart shows today's bar; activity lists recent recognitions with names

### E. RLS sanity check

- [ ] Sign in as a **second account** (incognito): `/people` is empty, and live recognition marks
      your first account's people as Unknown

### F. Deploy

- [ ] Push. Vercel build log shows `[copy-models] copied 10 files`
- [ ] On the live URL, enrollment and live recognition work on desktop Chrome and phone Chrome

## Tuning tips

- Turn on **Scores** on `/live`. It shows each face's raw similarity to the closest and next-closest
  person, and how your enrolled samples compare (same person vs different people). Put
  `face.match` in `src/config/recognition.ts` in the gap between those two ranges.
- Same-person and different-people scores overlap, so the **margin** (best person must beat the
  next-best by 0.10) matters more than the threshold. Current values: match 0.65, uncertain 0.55.
- People matched as **uncertain** (amber) too often: add more samples (row menu → Add samples),
  or lower `face.match` slightly.
- Strangers matched as someone: raise `face.match` (e.g. 0.70) or `face.margin`.
- "Hold still / more light" never clears: lower `quality.minSharpness` (webcams vary a lot).

## Git: commit plan

Run each block in order (`git add`, then `git commit`). Final check: `git status` shows a clean
tree, then `git push`.

```bash
# 1
git add package.json package-lock.json scripts .gitignore
git commit -m "chore(deps): add Human, Comlink, TanStack Table, image compression and model copy script"

# 2
git add src/config/recognition.ts src/lib/ai/vector.ts src/lib/ai/quality.ts src/lib/ai/liveness.ts src/lib/ai/tracker.ts src/lib/ai/types.ts tests/unit/vector.test.ts tests/unit/liveness.test.ts tests/unit/quality-tracker.test.ts
git commit -m "feat(ai): add vector utils, quality checks, liveness engine and IoU tracker"

# 3
git add src/workers src/lib/ai/face.ts src/lib/ai/capture.ts src/stores/face-engine-store.ts src/hooks
git commit -m "feat(ai): add Human face worker with Comlink client and camera hooks"

# 4
git add src/components/camera src/components/shared/confidence-ring.tsx
git commit -m "feat(camera): add CameraView, FaceOverlay, PermissionGate, ModelLoader and liveness check"

# 5
git add supabase/migrations/0003_face_matching.sql src/types/database.ts
git commit -m "feat(db): add match_faces RPC, people overview view and avatars bucket"

# 6
git add src/components/shared/stepper-rail.tsx src/components/shared/confirm-dialog.tsx src/components/shared/data-table.tsx src/components/ui
git commit -m "feat(ui): add StepperRail, ConfirmDialog and DataTable components"

# 7
git add src/lib/data/people.ts src/lib/format.ts src/components/people "src/app/(app)/people"
git commit -m "feat(people): add people table and person detail pages"

# 8
git add src/lib/validations/person.ts src/components/enroll "src/app/(app)/enroll"
git commit -m "feat(enroll): add face enrollment wizard with guided capture"

# 9
git add src/lib/data/recognition.ts src/components/live "src/app/(app)/live" src/config/site.ts tests/unit/calibration.test.ts
git commit -m "feat(live): add live multi-face recognition with tracking and throttled logging"

# 10
git add src/lib/data/dashboard.ts src/components/charts "src/app/(app)/dashboard" tests/unit/dashboard-format.test.ts
git commit -m "feat(dashboard): show real stats, recognitions chart and activity feed"

# 11
git add next.config.ts
git commit -m "chore(security): allow WASM fallback CDN in CSP"

# 12
git add README.md docs
git commit -m "docs: document phase 2 face engine, enrollment and live recognition"
```

## What's next — Phase 3

Voice engine (Transformers.js speaker verification, checked first; ONNX fallback if needed),
MicRecorder, Waveform, 16 kHz resampling + silence trim, voice step in the enrollment wizard,
challenge phrases with transcription check, and the biometric login page +
`/api/biometric-login` (server-side verification, rate limiting, `auth_attempts`), plus
Settings → Security.
