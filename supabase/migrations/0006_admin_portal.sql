-- 0006_admin_portal.sql
-- Phase 4A (part 2): separate admin portal, locked biometric identity with change requests,
-- announcements, leave requests and kiosk attendance. Data stays per-user (RLS); admin writes
-- go through server code that checks the caller is an admin (service role).

-- ---------------------------------------------------------------------------
-- Trusted callers: the service role (our server code), the SQL editor, Supabase internals
-- (e.g. cascades when an auth user is deleted) and admins.
-- ---------------------------------------------------------------------------
create or replace function public.is_trusted_writer()
returns boolean
language sql stable
set search_path = public
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin')
      or public.is_admin();
$$;

-- ---------------------------------------------------------------------------
-- 1. Locked biometric identity ("My identity").
-- A user's own identity is the person they own that is linked to their account. It's created
-- only through /api/identity (service role). After the final submit it's locked: the user can't
-- add, delete or replace their own face/voice samples until an admin approves a change request.
-- ---------------------------------------------------------------------------
alter table people
  add column if not exists biometrics_locked boolean not null default false,
  add column if not exists locked_at timestamptz;

-- Existing self-enrollments that already have face samples count as final.
update people p
set biometrics_locked = true, locked_at = coalesce(p.reviewed_at, p.created_at)
where p.linked_user_id is not null
  and p.linked_user_id = p.owner_id
  and exists (select 1 from face_embeddings f where f.person_id = p.id);

create or replace function public.enforce_people_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_trusted_writer() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.linked_user_id is not null and old.linked_user_id = old.owner_id then
      raise exception 'Your own identity can''t be deleted. Ask an admin.'
        using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.linked_user_id is not null then
      raise exception 'Enroll yourself from the My identity page.' using errcode = '42501';
    end if;
    new.approval_status := 'approved';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    new.biometrics_locked := false;
    new.locked_at := null;
    return new;
  end if;

  -- UPDATE: users can edit name/label/notes/avatar, but not the link, approval or lock.
  if new.linked_user_id is distinct from old.linked_user_id then
    raise exception 'Enroll yourself from the My identity page.' using errcode = '42501';
  end if;
  new.approval_status := old.approval_status;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.review_note := old.review_note;
  new.biometrics_locked := old.biometrics_locked;
  new.locked_at := old.locked_at;
  return new;
end;
$$;

drop trigger if exists people_enforce_approval on people;
create trigger people_enforce_approval
  before insert or update or delete on people
  for each row execute function public.enforce_people_approval();

-- Users can't touch the samples of their own identity directly (only /api/identity can).
create or replace function public.enforce_identity_samples()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target uuid;
  self_identity boolean;
begin
  if public.is_trusted_writer() then
    return coalesce(new, old);
  end if;
  target := case when tg_op = 'DELETE' then old.person_id else new.person_id end;
  select p.linked_user_id is not null and p.linked_user_id = p.owner_id
    into self_identity
    from people p where p.id = target;
  if coalesce(self_identity, false) then
    raise exception 'Your face and voice can only be changed from the My identity page.'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists face_embeddings_identity_lock on face_embeddings;
create trigger face_embeddings_identity_lock
  before insert or update or delete on face_embeddings
  for each row execute function public.enforce_identity_samples();

drop trigger if exists voice_embeddings_identity_lock on voice_embeddings;
create trigger voice_embeddings_identity_lock
  before insert or update or delete on voice_embeddings
  for each row execute function public.enforce_identity_samples();

-- The overview view gains the lock columns (appended at the end).
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
  p.review_note,
  p.biometrics_locked,
  p.locked_at,
  p.reviewed_at
from people p;

-- ---------------------------------------------------------------------------
-- 2. Identity change requests: a locked user asks to re-enroll; an admin approves (unlocks
-- once) or rejects. Re-submitting the identity marks the request completed.
-- ---------------------------------------------------------------------------
create table if not exists identity_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references people(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  decision_note text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
-- At most one open (pending or approved-but-unused) request per user.
create unique index if not exists identity_change_requests_open_idx
  on identity_change_requests (user_id) where status in ('pending', 'approved');
create index if not exists identity_change_requests_status_idx
  on identity_change_requests (status, created_at desc);

alter table identity_change_requests enable row level security;
create policy "identity_change_requests: read own or admin" on identity_change_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 3. Announcements from admins: to everyone (recipient_id null) or to one user.
-- ---------------------------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  pinned boolean not null default false,
  recipient_id uuid references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists announcements_created_idx on announcements (created_at desc);
create index if not exists announcements_recipient_idx on announcements (recipient_id);

alter table announcements enable row level security;
create policy "announcements: read" on announcements
  for select to authenticated
  using (recipient_id is null
         or recipient_id = (select auth.uid())
         or (select public.is_admin()));

create table if not exists announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table announcement_reads enable row level security;
create policy "announcement_reads: read own or admin" on announcement_reads
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "announcement_reads: insert own" on announcement_reads
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Leave requests: planned time off. Approved leave days count as "Leave", not absent.
-- ---------------------------------------------------------------------------
create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_day date not null,
  end_day date not null,
  kind text not null default 'casual' check (kind in ('casual', 'sick', 'personal', 'other')),
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_day >= start_day and end_day - start_day <= 60)
);
create index if not exists leave_requests_user_idx on leave_requests (user_id, start_day desc);
create index if not exists leave_requests_status_idx on leave_requests (status, created_at desc);

alter table leave_requests enable row level security;
create policy "leave_requests: read own or admin" on leave_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 5. Kiosk attendance: an admin's device identifies whoever is in front of it.
-- Returns the two best-matching active users (the margin between them guards against
-- look-alikes). Service role only.
-- ---------------------------------------------------------------------------
alter table attendance
  add column if not exists source text not null default 'self' check (source in ('self', 'kiosk'));

create or replace function public.identify_user(query vector(1024))
returns table (user_id uuid, similarity real)
language sql stable security definer
set search_path = public, extensions
as $$
  select p.linked_user_id, max(1 - (f.embedding <=> query))::real as similarity
  from face_embeddings f
  join people p on p.id = f.person_id
  join profiles pr on pr.id = p.linked_user_id
  where p.linked_user_id = p.owner_id
    and p.approval_status = 'approved'
    and not pr.disabled
    and pr.role = 'member'
  group by p.linked_user_id
  order by similarity desc
  limit 2;
$$;

revoke execute on function public.identify_user from public, anon, authenticated;
grant execute on function public.identify_user to service_role;

-- ---------------------------------------------------------------------------
-- 6. Realtime for the new tables (RLS still applies).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime
  add table identity_change_requests, announcements, leave_requests;
