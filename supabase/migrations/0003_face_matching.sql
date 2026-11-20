-- 0003_face_matching.sql
-- Phase 2: face matching RPC, people overview view and the private avatars bucket.

-- ---------------------------------------------------------------------------
-- Top-k matches within the caller's own enrolled people (PROJECT_SPEC §6).
-- SECURITY INVOKER: runs with the caller's RLS, plus an explicit owner filter.
-- ---------------------------------------------------------------------------
create or replace function public.match_faces(query vector(1024), match_threshold real, match_count int)
returns table (person_id uuid, name text, similarity real)
language sql stable security invoker
set search_path = public, extensions
as $$
  select p.id, p.name, max(1 - (f.embedding <=> query))::real as similarity
  from face_embeddings f
  join people p on p.id = f.person_id
  where f.owner_id = (select auth.uid())
    and 1 - (f.embedding <=> query) >= match_threshold
  group by p.id, p.name
  order by similarity desc
  limit match_count;
$$;

revoke execute on function public.match_faces from anon;
grant execute on function public.match_faces to authenticated;

-- ---------------------------------------------------------------------------
-- People with sample counts and last-seen time, for the People table.
-- security_invoker makes the view respect the caller's RLS on the base tables.
-- ---------------------------------------------------------------------------
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
  (select max(e.created_at) from recognition_events e where e.person_id = p.id) as last_seen_at
from people p;

grant select on public.people_overview to authenticated;

create index if not exists recognition_events_person_created_idx
  on recognition_events (person_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Storage: private avatars bucket. Objects live under "<owner uid>/<file>" and
-- are only reachable by their owner (signed URLs for display).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
