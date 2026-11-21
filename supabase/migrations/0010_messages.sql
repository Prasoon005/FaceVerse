-- 0010_messages.sql
-- Direct messages between each member and the admin team (a support-style inbox).
-- One thread per member (thread_user_id); any admin can read and reply in every thread.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,               -- when the other side read it
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages (thread_user_id, created_at desc);
create index if not exists messages_unread_idx on messages (thread_user_id) where read_at is null;

alter table messages enable row level security;

-- Members see their own thread; admins see every thread.
create policy "messages: read" on messages
  for select to authenticated
  using (thread_user_id = (select auth.uid()) or (select public.is_admin()));

-- Members write only in their own thread, admins in any; always as themselves.
create policy "messages: send" on messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (thread_user_id = (select auth.uid()) or (select public.is_admin()))
  );

-- Marking as read: only messages sent by the other side.
create policy "messages: mark read" on messages
  for update to authenticated
  using (
    sender_id is distinct from (select auth.uid())
    and (thread_user_id = (select auth.uid()) or (select public.is_admin()))
  )
  with check (
    thread_user_id = (select auth.uid()) or (select public.is_admin())
  );

-- Only read_at can be changed by users.
revoke update on messages from authenticated, anon;
grant update (read_at) on messages to authenticated;

alter publication supabase_realtime add table messages;
