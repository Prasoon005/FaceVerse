-- 0002_core.sql
-- Core tables, profile trigger and Row Level Security (PROJECT_SPEC §6).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'member');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role user_role not null default 'member',
  biometric_login_enabled boolean not null default false,
  consent_given_at timestamptz,
  created_at timestamptz not null default now()
);

-- An enrolled identity. May be linked to an app user (for biometric login)
-- or be a non-user (e.g. a known visitor/resident).
create table people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  label text,                         -- e.g. 'resident', 'staff', 'friend'
  list_type text not null default 'none' check (list_type in ('none','allowed','flagged')),
  notes text,
  avatar_path text,
  created_at timestamptz not null default now()
);

create table face_embeddings (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(1024) not null,
  quality real,                       -- 0..1 from quality check
  created_at timestamptz not null default now()
);
create index on face_embeddings using hnsw (embedding vector_cosine_ops);

create table voice_embeddings (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(512) not null,
  created_at timestamptz not null default now()
);
create index on voice_embeddings using hnsw (embedding vector_cosine_ops);

create table recognition_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references people(id) on delete set null,  -- null = unknown face
  similarity real,
  source text not null check (source in ('live','visitor','login','album','tool')),
  created_at timestamptz not null default now()
);

create table auth_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  face_score real,
  voice_score real,
  liveness_passed boolean,
  success boolean not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,               -- e.g. 'person.delete', 'biometrics.export'
  target_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Supporting indexes for owner-scoped queries and RLS checks.
create index people_owner_id_idx on people (owner_id);
create index people_linked_user_id_idx on people (linked_user_id);
create index face_embeddings_person_id_idx on face_embeddings (person_id);
create index face_embeddings_owner_id_idx on face_embeddings (owner_id);
create index voice_embeddings_person_id_idx on voice_embeddings (person_id);
create index voice_embeddings_owner_id_idx on voice_embeddings (owner_id);
create index recognition_events_owner_created_idx on recognition_events (owner_id, created_at desc);
create index auth_attempts_user_created_idx on auth_attempts (user_id, created_at desc);
create index audit_logs_actor_created_idx on audit_logs (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when the calling user is an admin. SECURITY DEFINER so it can read
-- profiles without recursing through the profiles RLS policies.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Create a profile row whenever a user signs up (email or OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table people enable row level security;
alter table face_embeddings enable row level security;
alter table voice_embeddings enable row level security;
alter table recognition_events enable row level security;
alter table auth_attempts enable row level security;
alter table audit_logs enable row level security;

-- profiles: read/update own row; admins read all. Rows are inserted by the trigger.
create policy "profiles: read own" on profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Users must not be able to change their own role: only grant UPDATE on safe columns.
revoke update on profiles from authenticated, anon;
grant update (full_name, avatar_url, biometric_login_enabled, consent_given_at)
  on profiles to authenticated;

-- Owner-scoped tables: full CRUD on own rows; admins can read everything.
create policy "people: owner all" on people
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "people: admin read" on people
  for select to authenticated using ((select public.is_admin()));

create policy "face_embeddings: owner all" on face_embeddings
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "face_embeddings: admin read" on face_embeddings
  for select to authenticated using ((select public.is_admin()));

create policy "voice_embeddings: owner all" on voice_embeddings
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "voice_embeddings: admin read" on voice_embeddings
  for select to authenticated using ((select public.is_admin()));

create policy "recognition_events: owner all" on recognition_events
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "recognition_events: admin read" on recognition_events
  for select to authenticated using ((select public.is_admin()));

-- auth_attempts: written only by the server route (service role bypasses RLS); users read their own.
create policy "auth_attempts: read own" on auth_attempts
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- audit_logs: users write entries about themselves and read their own; admins read all.
create policy "audit_logs: insert own" on audit_logs
  for insert to authenticated with check (actor_id = (select auth.uid()));
create policy "audit_logs: read own" on audit_logs
  for select to authenticated
  using (actor_id = (select auth.uid()) or (select public.is_admin()));
