-- 0011_holidays_geofence_profile.sql
-- Holiday calendar, office geofence for self check-in, and richer member profiles.

-- ---------------------------------------------------------------------------
-- Holidays: days the whole workspace is off. Nobody is marked absent on them.
-- ---------------------------------------------------------------------------
create table if not exists holidays (
  day date primary key,
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table holidays enable row level security;

drop policy if exists "holidays: read" on holidays;
create policy "holidays: read" on holidays
  for select to authenticated
  using (true);

drop policy if exists "holidays: admin write" on holidays;
create policy "holidays: admin write" on holidays
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Geofence: when enabled, self check-in must come from within radius of the office.
-- (The kiosk at the door is exempt.)
-- ---------------------------------------------------------------------------
alter table attendance_settings
  add column if not exists geofence_enabled boolean not null default false,
  add column if not exists office_lat double precision,
  add column if not exists office_lng double precision,
  add column if not exists office_radius_m integer not null default 200
    check (office_radius_m between 50 and 5000);

-- ---------------------------------------------------------------------------
-- Profiles: phone and department, editable by the member.
-- ---------------------------------------------------------------------------
alter table profiles
  add column if not exists phone text check (phone is null or char_length(phone) <= 20),
  add column if not exists department text check (department is null or char_length(department) <= 60);

grant update (full_name, avatar_url, phone, department) on profiles to authenticated;

-- Admins can show members' profile photos (signed URLs are made with the service role,
-- this lets the admin's own client read them too).
drop policy if exists "avatars: admin read" on storage.objects;
create policy "avatars: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (select public.is_admin()));
