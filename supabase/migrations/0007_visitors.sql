-- 0007_visitors.sql
-- Phase 4B: smart visitor log (PROJECT_SPEC §6 "0003_visitors", renumbered after Phase 4A).
-- A visitor is an ordinary person (label 'visitor') in the owner's people list, so returning
-- visitors are recognised with the existing match_faces RPC. Each visit is a visitor_logs row.

create table if not exists visitor_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  purpose text check (char_length(purpose) <= 200),
  host_name text check (char_length(host_name) <= 120),
  phone text check (char_length(phone) <= 32),
  check_in timestamptz not null default now(),
  check_out timestamptz,
  snapshot_path text,                 -- optional compressed snapshot (visitor-snapshots bucket)
  created_at timestamptz not null default now(),
  check (check_out is null or check_out >= check_in)
);

create index if not exists visitor_logs_owner_check_in_idx on visitor_logs (owner_id, check_in desc);
create index if not exists visitor_logs_person_idx on visitor_logs (person_id, check_in desc);
-- Visitors still inside, for the "inside now" count and quick check-out.
create index if not exists visitor_logs_open_idx on visitor_logs (owner_id) where check_out is null;

-- At most one open visit per visitor.
create unique index if not exists visitor_logs_one_open_visit_idx
  on visitor_logs (person_id) where check_out is null;

alter table visitor_logs enable row level security;

-- Owner-scoped like every other table; admins can read everything.
create policy "visitor_logs: owner all" on visitor_logs
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from people p where p.id = person_id and p.owner_id = (select auth.uid()))
  );
create policy "visitor_logs: admin read" on visitor_logs
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage: private snapshots at "<owner uid>/<file>", owner only (admins can read).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visitor-snapshots', 'visitor-snapshots', false, 1048576,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "visitor-snapshots: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'visitor-snapshots'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or (select public.is_admin())));
create policy "visitor-snapshots: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'visitor-snapshots'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "visitor-snapshots: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'visitor-snapshots'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Live check-ins on the dashboard and the bell.
alter publication supabase_realtime add table visitor_logs;
