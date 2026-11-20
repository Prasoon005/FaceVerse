-- 0004_biometric_login.sql
-- Phase 3: 1:1 face and voice verification for biometric login (PROJECT_SPEC §6).
-- These functions are called only by the /api/biometric-login server route with the
-- service role key. Postgres grants EXECUTE to PUBLIC by default, so it's revoked from
-- PUBLIC as well as anon/authenticated.

-- ---------------------------------------------------------------------------
-- Best face similarity against the target user's own linked person(s).
-- Requires owner_id = target_user too: otherwise someone could enroll their own face
-- in a person they own, set linked_user_id to another user's id, and log in as them.
-- ---------------------------------------------------------------------------
create or replace function public.verify_face(target_user uuid, query vector(1024))
returns real
language sql stable security definer
set search_path = public, extensions
as $$
  select coalesce(max(1 - (f.embedding <=> query)), 0)::real
  from face_embeddings f
  join people p on p.id = f.person_id
  where p.linked_user_id = target_user
    and p.owner_id = target_user;
$$;

revoke execute on function public.verify_face from public, anon, authenticated;
grant execute on function public.verify_face to service_role;

create or replace function public.verify_voice(target_user uuid, query vector(512))
returns real
language sql stable security definer
set search_path = public, extensions
as $$
  select coalesce(max(1 - (v.embedding <=> query)), 0)::real
  from voice_embeddings v
  join people p on p.id = v.person_id
  where p.linked_user_id = target_user
    and p.owner_id = target_user;
$$;

revoke execute on function public.verify_voice from public, anon, authenticated;
grant execute on function public.verify_voice to service_role;

-- ---------------------------------------------------------------------------
-- Email → user id for the login route (the Admin API has no lookup by email).
-- ---------------------------------------------------------------------------
create or replace function public.user_id_by_email(target_email text)
returns uuid
language sql stable security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(target_email) limit 1;
$$;

revoke execute on function public.user_id_by_email from public, anon, authenticated;
grant execute on function public.user_id_by_email to service_role;

-- Rate limiting by IP looks up recent failures by ip_hash.
create index if not exists auth_attempts_ip_created_idx
  on auth_attempts (ip_hash, created_at desc);
