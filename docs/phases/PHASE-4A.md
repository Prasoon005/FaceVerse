# Phase 4A — Admin console & face attendance

**Status:** part 1 + part 2 built, awaiting phase check · **Date:** 2026-11-21

Added at the user's request (not in the original spec). The spec's visitor log is now Phase 4B.

**Done when:** an admin can approve a user's self-enrolled face; that user can mark attendance
from their own phone with a face check; the admin sees who was present or absent each day, asks
for a reason, and approves or rejects the reply. Users still can't see each other's data.

## What was built

| Feature                    | Key files                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Database                   | `supabase/migrations/0005_admin_attendance.sql`, `src/types/database.ts`                                      |
| Attendance logic           | `src/lib/attendance/days.ts`, `tests/unit/attendance-days.test.ts`                                            |
| Server helpers and actions | `src/lib/admin/*`, `src/lib/actions/*`, `src/app/api/attendance/route.ts`                                     |
| User attendance page       | `src/app/(app)/attendance`, `src/components/attendance/*`                                                     |
| Admin console              | `src/app/(app)/admin/**`, `src/components/admin/*`                                                            |
| Live notifications         | `src/components/layout/notifications-bell.tsx`, `src/lib/data/notifications.ts`                               |
| Navigation and access      | `src/config/site.ts`, `src/components/layout/*`, `src/lib/supabase/middleware.ts`, `src/app/(app)/layout.tsx` |

## Part 2 — admin portal, final identity and extras

Built after your "final idea": separate admin and user portals, a locked biometric identity with
admin-approved change requests, announcements, leave requests, kiosk mode, analytics, an audit log
and a more animated UI.

| Feature                      | Key files                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Database                     | `supabase/migrations/0006_admin_portal.sql`, `src/types/database.ts`              |
| Admin portal + login         | `src/app/(admin)/admin/*`, `src/app/(admin-auth)/*`, `src/config/site.ts`         |
| My identity (lock + request) | `src/app/(app)/identity`, `src/components/identity/*`, `src/app/api/identity`     |
| Announcements                | `src/components/announcements/*`, `src/app/(admin)/admin/announcements`           |
| Leave                        | `src/app/(app)/leave`, `src/components/leave/*`, `src/lib/actions/leave.ts`       |
| Kiosk                        | `src/app/(admin)/admin/kiosk`, `src/components/admin/kiosk-mode.tsx`, `api/kiosk` |
| Analytics, audit, user page  | `src/app/(admin)/admin/{analytics,audit,users/[id]}`                              |

## Setup before testing

1. **Run both migrations** in Supabase **SQL Editor → New query**, in order:
   `supabase/migrations/0005_admin_attendance.sql` (already done), then
   `supabase/migrations/0006_admin_portal.sql`.
2. **Make yourself admin** (done for your account):

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Restart `npm run dev`. Admin: open `/admin/login`. User: `/login` (use a second account in an
   incognito window or on your phone).

## Phase check — part 2

### Portals

- [ ] `/admin/login` with the admin account → admin console (violet accent, "Admin" badge)
- [ ] `/admin/login` with a normal user → "Not an admin account", stays signed out
- [ ] Admin opening `/dashboard` is sent to `/admin`; a user opening `/admin` gets a 404

### My identity

- [ ] User → **My identity** → face → voice → confirm. Without the tick the button is disabled;
      holding it fills up, then the lock animation plays and the page shows "Waiting for admin review"
- [ ] `/people` → that identity has no add/delete sample buttons ("Manage in My identity")
- [ ] Admin → Approvals → approve → the user's timeline turns green live
- [ ] User → **Request a change** with a reason → admin → **Change requests** → Approve & unlock →
      the user sees the wizard again ("Re-enroll"), submits, and it goes back to Approvals

### Announcements, leave, kiosk

- [ ] Admin posts an **Important** announcement → the user gets a pop-up with a chime instantly;
      read count goes up on the admin page
- [ ] User → **Leave** → request 2 days → admin → **Leave requests** → approve → those days show
      **L** in the user's calendar and the admin report
- [ ] Admin → **Kiosk mode** → the user (with an approved identity) looks at the camera → big
      "Welcome, name" card; second time → "See you tomorrow"; an unknown face → "Not recognised"

### Admin extras

- [ ] **Analytics** shows the trend and weekday charts; **Audit log** lists every action above
- [ ] **Users** → click a name → detail page; **Message** sends a private pop-up to that user

## Phase check — part 1 (how to test)

### A. Approval

- [ ] As the **second user**: **My identity** → face → voice → hold to submit. `/attendance` shows
      "waiting for admin approval"
- [ ] As **admin**: the bell shows "1 enrollment to approve"; `/admin/approvals` lists it with the
      thumbnail. Reject it with a note → the user's bell shows "rejected" with your note
- [ ] Rejecting unlocks the identity: the user enrolls again → admin **Approves** → the user's
      attendance page updates by itself

### B. Attendance (on the user's phone)

- [ ] `/attendance` → **Mark attendance** → 2 liveness prompts → hold still → "Checked in at …"
      with a chime; the check-in time appears
- [ ] Mark again → **Check out** time appears. A third try says you're done for today
- [ ] Someone else's face on that account → "didn't match", with face tips
- [ ] Admin overview updates live (no reload): "Checked in today" goes up, with the name and time

### C. Absence and reasons

- [ ] (Tip: to test without waiting a day, set yesterday as a working day in `/admin/settings`.)
- [ ] Admin overview → "Absent on <last working day>" → **Ask reason** → send
- [ ] The user's bell shakes and chimes; `/attendance` shows the question → **Answer** with a reason
      and a photo → sent
- [ ] Admin → **Absence reviews → To decide** shows the reason; **View proof** opens the photo →
      **Approve (excused)**. The user's calendar shows that day as Excused
- [ ] Users can also click an absent day in their calendar → **Explain absence** without being asked

### D. Report, users and settings

- [ ] `/admin/attendance`: the grid shows P / A / E / ? / - per user per day; change the date range;
      **Export CSV** downloads a file that opens in Excel
- [ ] `/admin/users`: make the second user admin, then remove it; **Disable** them → their next page
      load shows "Account disabled" and they can't sign in → **Enable** again
- [ ] `/admin/settings`: change working days → absent counts in the report change

### E. Privacy

- [ ] As the second user: `/admin` returns 404; `/people` and the dashboard show only their own data
- [ ] As admin: your own `/people` and dashboard show only **your** people; everyone's data is in
      `/admin`

### F. Deploy

- [ ] Run the migration on the production Supabase project (the same one, if you only have one)
- [ ] Push; CI green; on the live URL, mark attendance from a phone

## Git: commit plan

```bash
# 1 database
git add supabase/migrations src/types/database.ts
git commit -m "feat(db): add attendance, approvals, locked identity, announcements and leave"

# 2 server logic
git add src/lib src/app/api src/hooks/use-server-action.ts tests
git commit -m "feat(admin): add admin guard, server actions, identity, kiosk and attendance APIs"

# 3 admin portal
git add "src/app/(admin)" "src/app/(admin-auth)" src/components/admin
git commit -m "feat(admin): add separate admin portal with analytics, kiosk, audit and requests"

# 4 user features
git add "src/app/(app)" src/components/attendance src/components/identity src/components/leave src/components/announcements src/components/dashboard
git commit -m "feat(user): add my identity, attendance, leave and announcements pages"

# 5 shell and UI
git add src/components src/config src/app/globals.css "src/app/(auth)" src/app/auth
git commit -m "feat(ui): add portal-aware shell, live notifications and animated screens"

# 6 docs
git add README.md docs
git commit -m "docs: document phase 4A admin portal and attendance"
```

## What's next — Phase 4B

The spec's smart visitor log: migration `0006`, visitors page, scan-visitor modal,
returning-visitor recognition, new-visitor quick form, check-in/out, filters, CSV export, and
Realtime updates on the dashboard and the bell.
