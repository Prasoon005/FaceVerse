# Phases 5–7 — Photo finder, privacy, stretch tools

**Status:** built, awaiting phase check · **Date:** 2026-11-21

Built together because of a deadline. Migration `0009_albums.sql` (the spec's `0004_albums`).

## Phase 5 — Event photo finder

- **Albums** (`/albums`): album cards with cover, photo and face counts, "New album".
- **Album page** (`/albums/[id]`): drag-and-drop upload with per-file progress. Each photo is
  compressed to 1600 px, its faces are found **in the browser** and their embeddings saved to
  `photo_faces`; only the compressed photo is uploaded (private `album-photos` bucket).
- **Find me:** selfie from the camera or an uploaded photo → `find_in_album` vector search →
  matched photos with the face outlined and "% match / possible", select and **download as ZIP**
  (JSZip, in the browser). Masonry grid, photo viewer, delete photo / album.
- **Share link:** toggle per album → `/share/<code>` works without an account: guests browse
  and "Find me"; the search runs on the server (`find_in_shared_album`, service role) only for
  public albums.
- Threshold: `recognitionConfig.albums.findThreshold` (0.55; ≥ 0.65 is shown as a sure match).

## Phase 6 — Privacy & polish

- **Consent screen** before the first enrollment (Enroll and My identity); stores
  `profiles.consent_given_at`.
- **Settings → Privacy** (`/settings/privacy`): consent status, **storage usage** meter (album
  photos, thumbnails, snapshots, proofs vs. the 1 GB free plan), **export my data** (JSON, with
  an option to include embeddings) and **delete all my biometrics** (typed `DELETE`; removes all
  face/voice embeddings incl. your own identity, album face index, thumbnails and snapshots;
  turns off biometric login; logged in the audit log).
- **Activity** page: your recognitions and account actions. Admin audit log exists since 4A.
- Not done: Playwright smoke tests and a Lighthouse run (left for later).

## Phase 7 — Stretch features

| #     | Feature                    | Where                                                                    |
| ----- | -------------------------- | ------------------------------------------------------------------------ |
| M3    | 1:1 face compare           | `/tools` → Face compare                                                  |
| E3    | Privacy blur (images)      | `/tools` → Privacy blur (tap a face to keep it, download JPEG)           |
| E4    | Focus / drowsiness tracker | `/focus` (eye aspect ratio + head pose, alert, timeline; nothing stored) |
| X1/X2 | Voice commands + feedback  | Mic button in the top bar ("open attendance", "dark mode")               |
| M5    | Duplicate detection        | Enroll: warns when a new face matches an existing person                 |
| X3    | Watchlist alerts           | Live: alarm + toast when a **flagged** person appears                    |
| X4    | PWA                        | `manifest.webmanifest` + icons (installable; no offline cache yet)       |
| M6    | Crowd count                | Live already shows the number of faces in frame                          |

Not built: M2 group auto-tagging, M4 two-person verification, video blur, offline service worker.

## Also: messaging and mobile fit

- `0010_messages.sql`: member ⇄ admin team chat (`/messages`, `/admin/messages`), live, with
  read ticks and unread badges.
- Global CSS fix so wide tables/charts no longer push pages past phone and tablet screens.

## Setup

1. Supabase **SQL Editor** → run `supabase/migrations/0009_albums.sql`, then
   `supabase/migrations/0010_messages.sql`.
2. `npm install` (adds `jszip`), restart `npm run dev`.

## Phase check

- [ ] **Albums** → New album → upload 30+ group photos → each shows "N faces" → **Find me** with a
      selfie → the photos you're in, outlined → **Download (ZIP)**
- [ ] Turn on **Share link** → open it in an incognito window → **Find me** works without login
- [ ] Enroll with a new account → consent screen first
- [ ] **Settings → Privacy**: storage meter, **Export JSON**, **Delete my biometrics** (type DELETE)
- [ ] **Tools**: compare two photos of you (match) and of two people (different); blur a group photo
- [ ] **Focus**: start, close your eyes for 2 s → drowsy alert
- [ ] Mic button: say "open albums"
- [ ] Mark a person **Flagged** → show them to **Live** → alarm
- [ ] Enroll someone who is already enrolled → duplicate warning
- [ ] User → **Messages** → send → admin → **Messages** shows an unread badge → reply → the user
      sees it live with a chime; ticks turn double when read
- [ ] Open pages on a phone and a tablet: nothing wider than the screen

## Git

```bash
git add -A
git commit -m "feat: add event photo finder, privacy controls and stretch tools (phases 5-7)"
git push
```
