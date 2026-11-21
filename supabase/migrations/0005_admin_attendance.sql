-- 0005_admin_attendance.sql
-- Phase 4A: admin console, self-enrollment approval, face attendance and absence reviews.
-- Data stays per-user (RLS); admins can read everything (existing "admin read" policies)
-- and make changes only through server code that checks the caller is an admin.

-- ---------------------------------------------------------------------------
-- Self-enrollment approval. A person linked to an account must be approved by an admin
-- before it counts for biometric login or attendance. Existing rows (and people not
-- linked to an account) are 'approved', so nothing that works today breaks.
-- ---------------------------------------------------------------------------
alter table people
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

-- Users can't approve themselves: for non-admin callers, linking a person to an account
-- makes it 'pending', and the review columns can't be edited. The service role and the
-- SQL editor (postgres) are trusted.
create or replace function public.enforce_people_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.approval_status := case when new.linked_user_id is null then 'approved' else 'pending' end;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
  else
    if new.linked_user_id is distinct from old.linked_user_id then
      new.approval_status := case when new.linked_user_id is null then 'approved' else 'pending' end;
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.review_note := null;
    else
      new.approval_status := old.approval_status;
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;
      new.review_note := old.review_note;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists people_enforce_approval on people;
create trigger people_enforce_approval
  before insert or update on people
  for each row execute function public.enforce_people_approval();

-- The overview view gains the approval columns (columns appended at the end).
create or replace view public.people_overview
with (security_invoker = true) as
select
  p.id,
  p.owner_id,
  p.linked_user_id,
  p.name,
  p.label,
  p.list_type,
  p.notes,
  p.avatar_path,
  p.created_at,
  (select count(*) from face_embeddings f where f.person_id = p.id)::int as face_samples,
  (select count(*) from voice_embeddings v where v.person_id = p.id)::int as voice_samples,
  (select max(e.created_at) from recognition_events e where e.person_id = p.id) as last_seen_at,
  p.approval_status,
  p.review_note
from people p;

-- Biometric login (and attendance) only count approved, self-owned linked people.
create or replace function public.verify_face(target_user uuid, query vector(1024))
returns real
language sql stable security definer
set search_path = public, extensions
as $$
  select coalesce(max(1 - (f.embedding <=> query)), 0)::real
  from face_embeddings f
  join people p on p.id = f.person_id
  where p.linked_user_id = target_user
    and p.owner_id = target_user
    and p.approval_status = 'approved';
$$;

create or replace function public.verify_voice(target_user uuid, query vector(512))
returns real
language sql stable security definer
set search_path = public, extensions
as $$
  select coalesce(max(1 - (v.embedding <=> query)), 0)::real
  from voice_embeddings v
  join people p on p.id = v.person_id
  where p.linked_user_id = target_user
    and p.owner_id = target_user
    and p.approval_status = 'approved';
$$;

revoke execute on function public.verify_face from public, anon, authenticated;
revoke execute on function public.verify_voice from public, anon, authenticated;
grant execute on function public.verify_face to service_role;
grant execute on function public.verify_voice to service_role;

-- ---------------------------------------------------------------------------
-- Disabled accounts (set by admins via the service role; users can't change it because
-- profiles only grants UPDATE on safe columns).
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists disabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- Attendance: one row per user per day. Written only by /api/attendance (service role)
-- after a server-side face check, so users can't fake it.
-- ---------------------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_score real,
  check_out_score real,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists attendance_day_idx on attendance (day);

alter table attendance enable row level security;
create policy "attendance: read own or admin" on attendance
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Absence reviews: admin asks why a user was absent, the user answers (optional proof),
-- the admin approves (excused) or rejects. Users may also explain an absence unasked.
-- Writes go through server code; users and admins read via RLS.
-- ---------------------------------------------------------------------------
create table if not exists absence_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  status text not null default 'asked'
    check (status in ('asked', 'answered', 'approved', 'rejected')),
  question text,
  reason text,
  proof_path text,
  decision_note text,
  asked_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  asked_at timestamptz,
  answered_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists absence_reviews_status_idx on absence_reviews (status, created_at desc);

alter table absence_reviews enable row level security;
create policy "absence_reviews: read own or admin" on absence_reviews
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Workspace attendance settings (single row). Everyone can read; admins change it
-- through server code.
-- ---------------------------------------------------------------------------
create table if not exists attendance_settings (
  id int primary key default 1 check (id = 1),
  -- ISO weekdays: 1 = Monday … 7 = Sunday
  work_days int[] not null default '{1,2,3,4,5,6}',
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz not null default now()
);
insert into attendance_settings (id) values (1) on conflict (id) do nothing;

alter table attendance_settings enable row level security;
create policy "attendance_settings: read" on attendance_settings
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for absence proofs at "<user uid>/<file>". The owner can
-- upload and read their own files; admins can read all of them.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('absence-proofs', 'absence-proofs', false, 3145728,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "absence-proofs: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'absence-proofs'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "absence-proofs: owner or admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'absence-proofs'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or (select public.is_admin())));
create policy "absence-proofs: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'absence-proofs'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Admins can also see people's avatars (approval queue thumbnails).
create policy "avatars: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Realtime: live attendance, approvals and review updates (RLS still applies).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table attendance, absence_reviews, people;
