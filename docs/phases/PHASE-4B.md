# Phase 4B — Smart visitor log

**Status:** built, awaiting phase check · **Date:** 2026-11-21

PROJECT_SPEC Phase 4 (renumbered after Phase 4A). Migration `0007_visitors.sql` (the spec's
`0003_visitors`).

**Done when:** a returning visitor is recognised and checked in with one click, and the CSV
export opens correctly in Excel.

## What was built

| Feature               | Key files                                                                    |
| --------------------- | ---------------------------------------------------------------------------- |
| Database              | `supabase/migrations/0007_visitors.sql`, `src/types/database.ts`             |
| Data layer + CSV      | `src/lib/data/visitors.ts`, `tests/unit/visitors.test.ts`                    |
| One-shot face scan    | `src/components/camera/face-scanner.tsx`                                     |
| Scan visitor modal    | `src/components/visitors/scan-visitor-dialog.tsx`                            |
| Visitors page         | `src/app/(app)/visitors`, `src/components/visitors/visitors-view.tsx`        |
| Admin view            | `src/app/(admin)/admin/visitors`                                             |
| Live dashboard + bell | `src/lib/data/dashboard.ts`, `src/lib/data/notifications.ts`, dashboard page |

- A visitor is a normal person (label `visitor`) in your own people list, so recognition uses the
  same `match_faces` RPC as live recognition (threshold + margin). Each visit is a
  `visitor_logs` row; only one open visit per visitor is allowed.
- **Scan visitor:** the camera waits for one good-quality face, averages 3 frames, then:
  - **match** → visitor card with visit history, last purpose/host/phone pre-filled, one-click
    **Check in** (or **Check out** if they're still inside). Flagged people show a red warning.
  - **uncertain** → "Is this …?" with Yes / No, new visitor
  - **unknown** → quick form (name, phone, purpose, meeting) → registers them (face sample +
    thumbnail) and checks them in
  - Optional private snapshot per visit (`visitor-snapshots` bucket, off by default)
- **Visitors page:** inside now / today / unique this week, date range + status + search filters,
  check-out, snapshot viewer, CSV export (UTF-8 with BOM so Excel shows names correctly). Cards
  on phones, a table on tablet and desktop. Updates live.
- **Dashboard:** "Visitors today" is real and the page refreshes live; the bell shows today's
  visitor check-ins. **Admins** get a read-only Visitors page with everyone's log.

## Also in this phase: late arrivals, reasons & deduction score

Requested on 2026-11-21. Migration `0008_late_and_score.sql`.

- **Late:** admins set the office start time and a grace period (default 09:30 + 15 min). A
  check-in after that is **Late (T)** in calendars, reports and CSV. Late still counts as present
  for the attendance rate and streak.
- **Reasons & score** page for users (`/reasons`): this month's score ring, every absent or late
  day without a reason ("Explain"), admin questions ("Answer"), the history of reasons with the
  admin's decision, and the company norms. Reasons can include a photo/PDF proof.
- **Score (company norms, set in Workspace settings):** every month starts at the base (default
  100). Absent without a reason or rejected −10, late without a reason or rejected −2, approved
  reasons 0 (configurable), approved leave 0. Nothing is deducted while a reason is under review.
- **Admin:** "Absence & late reviews" shows the kind and how many minutes late; the attendance
  report has late cells, a Score column (also in the CSV) and "Ask reason" on late days too; the
  user detail page shows this month's score.
- Files: `src/lib/attendance/score.ts` (+ `tests/unit/score.test.ts`),
  `src/lib/attendance/user-days.ts`, `src/app/(app)/reasons`, `src/components/reasons/*`,
  `src/components/admin/scoring-rules-form.tsx`.

## Setup before testing

1. Supabase **SQL Editor → New query** → run `supabase/migrations/0007_visitors.sql`, then a new
   query with `supabase/migrations/0008_late_and_score.sql`.
2. Restart `npm run dev` (or push and test on the live site).

## Phase check

- [ ] User → **Visitors** → **Scan visitor** → a new face → quick form → **Register & check in**
      → success animation; the row appears as **Inside**
- [ ] **Check out** from the table → status **Left** with the duration
- [ ] Scan the **same person** again → recognised with their history and details pre-filled →
      **Check in** in one click
- [ ] Scan someone already inside → the card offers **Check out** instead
- [ ] Mark a visitor as **Flagged** on their People page → scanning them shows the red warning
- [ ] Filters: change dates, Inside / Left, search → list updates
- [ ] **Export CSV** → opens in Excel with correct columns and names
- [ ] Dashboard "Visitors today" goes up live; the bell shows the check-ins
- [ ] Admin → **Visitors** shows the visits with "Logged by"
- [ ] On a phone the visits show as cards; on tablet/PC as a table

### Late, reasons and score

- [ ] Admin → **Workspace settings → Office hours & score rules**: set the start time to a few
      minutes ago with grace 0 → Save
- [ ] User marks attendance → the attendance page shows "You checked in X min late" and the day
      is **T** (orange)
- [ ] User → **Reasons & score** → the late day is under "Needs your reason" → **Explain** →
      send. Past absent days without a reason are listed too
- [ ] Admin → **Absence & late reviews** shows it with "Late" and the minutes → **Approve** →
      the user's score goes back up; **Reject** → the points are deducted
- [ ] Admin → **Attendance report**: Score column, late cells, CSV includes Late and Score

## Git

```bash
git add -A
git commit -m "feat: add smart visitor log, late arrivals, reasons page and deduction score"
git push
```

## What's next — Phase 5

Event photo finder: albums, upload with client-side face indexing, "Find me" selfie search, share
links.
