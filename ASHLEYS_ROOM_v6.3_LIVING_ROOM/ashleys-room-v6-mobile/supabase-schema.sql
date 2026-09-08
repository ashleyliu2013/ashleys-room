-- ASHLEY'S ROOM v6 · Supabase schema
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.room_days (
  day text primary key check (day in ('MON','TUE','WED','THU','FRI')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.room_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  day text not null check (day in ('MON','TUE','WED','THU','FRI')),
  from_name text not null default 'Visitor' check (char_length(from_name) between 1 and 30),
  body text not null check (char_length(body) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  day text not null check (day in ('MON','TUE','WED','THU','FRI')),
  visitor_id text,
  created_at timestamptz not null default now()
);

alter table public.room_days enable row level security;
alter table public.room_admins enable row level security;
alter table public.messages enable row level security;
alter table public.visits enable row level security;

-- Safe re-run: remove policies before recreating them.
drop policy if exists "room days are public read" on public.room_days;
drop policy if exists "owner can insert room days" on public.room_days;
drop policy if exists "owner can update room days" on public.room_days;
drop policy if exists "messages are public read" on public.messages;
drop policy if exists "visitors can leave messages" on public.messages;
drop policy if exists "visitors can leave a trace" on public.visits;
drop policy if exists "signed in user can read admin membership" on public.room_admins;
drop policy if exists "owner can upload room media" on storage.objects;
drop policy if exists "owner can update room media" on storage.objects;

grant select on public.room_days to anon, authenticated;
grant insert, update, select on public.room_days to authenticated;
grant select on public.messages to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant insert on public.visits to anon, authenticated;
grant select on public.room_admins to authenticated;

create policy "room days are public read"
on public.room_days for select
to anon, authenticated
using (true);

create policy "owner can insert room days"
on public.room_days for insert
to authenticated
with check (exists (select 1 from public.room_admins a where a.user_id = auth.uid()));

create policy "owner can update room days"
on public.room_days for update
to authenticated
using (exists (select 1 from public.room_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.room_admins a where a.user_id = auth.uid()));

create policy "messages are public read"
on public.messages for select
to anon, authenticated
using (true);

create policy "visitors can leave messages"
on public.messages for insert
to anon, authenticated
with check (char_length(body) between 1 and 120 and char_length(from_name) between 1 and 30);

create policy "visitors can leave a trace"
on public.visits for insert
to anon, authenticated
with check (day in ('MON','TUE','WED','THU','FRI'));

create policy "signed in user can read admin membership"
on public.room_admins for select
to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('room-media','room-media',true)
on conflict (id) do update set public = true;

create policy "owner can upload room media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'room-media'
  and exists (select 1 from public.room_admins a where a.user_id = auth.uid())
);

create policy "owner can update room media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'room-media'
  and exists (select 1 from public.room_admins a where a.user_id = auth.uid())
)
with check (
  bucket_id = 'room-media'
  and exists (select 1 from public.room_admins a where a.user_id = auth.uid())
);

-- After creating your owner account in Authentication > Users,
-- copy its UUID and run this ONE line once:
-- insert into public.room_admins(user_id) values ('PASTE-OWNER-USER-UUID-HERE');
