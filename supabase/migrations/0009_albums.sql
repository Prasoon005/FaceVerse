-- 0009_albums.sql
-- Phase 5: event photo finder (PROJECT_SPEC §6 "0004_albums", renumbered).
-- Photos are indexed in the browser: each detected face's embedding is stored in photo_faces,
-- so "Find me" is a vector search inside one album.

create extension if not exists pgcrypto;

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  event_date date,
  share_code text unique default encode(gen_random_bytes(6), 'hex'),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists albums_owner_idx on albums (owner_id, created_at desc);

create table if not exists album_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  width int,
  height int,
  size_bytes int,
  face_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists album_photos_album_idx on album_photos (album_id, created_at);

create table if not exists photo_faces (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references album_photos(id) on delete cascade,
  album_id uuid not null references albums(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(1024) not null,
  box jsonb not null                  -- {x,y,w,h} normalised 0..1
);
create index if not exists photo_faces_album_idx on photo_faces (album_id);
create index if not exists photo_faces_embedding_idx on photo_faces using hnsw (embedding vector_cosine_ops);

alter table albums enable row level security;
alter table album_photos enable row level security;
alter table photo_faces enable row level security;

create policy "albums: owner all" on albums
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "albums: admin read" on albums
  for select to authenticated using ((select public.is_admin()));

create policy "album_photos: owner all" on album_photos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from albums a where a.id = album_id and a.owner_id = (select auth.uid()))
  );
create policy "album_photos: admin read" on album_photos
  for select to authenticated using ((select public.is_admin()));

create policy "photo_faces: owner all" on photo_faces
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from albums a where a.id = album_id and a.owner_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- "Find me" inside one of the caller's own albums (RLS applies: security invoker).
-- Returns each matching photo once with its best face similarity and that face's box.
-- ---------------------------------------------------------------------------
create or replace function public.find_in_album(target_album uuid, query vector(1024), match_threshold real)
returns table (photo_id uuid, similarity real, box jsonb)
language sql stable security invoker
set search_path = public, extensions
as $$
  select distinct on (f.photo_id) f.photo_id, (1 - (f.embedding <=> query))::real, f.box
  from photo_faces f
  where f.album_id = target_album
    and f.owner_id = (select auth.uid())
    and 1 - (f.embedding <=> query) >= match_threshold
  order by f.photo_id, f.embedding <=> query;
$$;
revoke execute on function public.find_in_album from anon;
grant execute on function public.find_in_album to authenticated;

-- Shared albums: the same search by share code, only when the album is public.
-- Called from the server with the service role (the share page signs photo URLs there too).
create or replace function public.find_in_shared_album(code text, query vector(1024), match_threshold real)
returns table (photo_id uuid, similarity real, box jsonb)
language sql stable security definer
set search_path = public, extensions
as $$
  select distinct on (f.photo_id) f.photo_id, (1 - (f.embedding <=> query))::real, f.box
  from photo_faces f
  join albums a on a.id = f.album_id
  where a.share_code = code
    and a.is_public
    and 1 - (f.embedding <=> query) >= match_threshold
  order by f.photo_id, f.embedding <=> query;
$$;
revoke execute on function public.find_in_shared_album from public, anon, authenticated;
grant execute on function public.find_in_shared_album to service_role;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects at "<owner uid>/<album id>/<file>".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album-photos', 'album-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "album-photos: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'album-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or (select public.is_admin())));
create policy "album-photos: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'album-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "album-photos: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'album-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
