-- nook-social: accounts, profiles, follows and saved spots.
-- Target: the separate "nook-social" Supabase project only. Never run this against the data/API project.
-- Paste into the Supabase SQL editor and run once. Re-running is safe (idempotent DDL, policies recreated).

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 50),
  major text check (char_length(major) <= 60),
  avatar_url text check (char_length(avatar_url) <= 500),
  vibe_tags text[] not null default '{}' check (cardinality(vibe_tags) <= 10),
  vibe_line text check (char_length(vibe_line) <= 140),
  -- Lowercase hex SHA-256 of the E.164 phone number, computed on-device. Never exposed by the view.
  phone_hash text check (phone_hash ~ '^[0-9a-f]{64}$'),
  discoverable_by_phone boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_phone_hash_idx
  on public.profiles (phone_hash) where discoverable_by_phone and phone_hash is not null;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self_follow check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

-- spot_id is the app's place ID (CONTRACTS.md `spotId`); name/category are a display snapshot.
create table if not exists public.saved_spots (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id text not null check (char_length(spot_id) between 1 and 200),
  name text not null check (char_length(name) between 1 and 200),
  category text check (char_length(category) <= 80),
  saved_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

-- ---------------------------------------------------------------------------
-- Public profile view (no phone_hash, no discoverable flag)
-- Runs with the view owner's rights so authenticated users can read every profile
-- through it while the base table stays owner-only.
-- ---------------------------------------------------------------------------

create or replace view public.public_profiles with (security_invoker = false) as
  select id, username, display_name, major, avatar_url, vibe_tags, vibe_line, created_at
  from public.profiles;

-- ---------------------------------------------------------------------------
-- Privileges (Supabase grants anon/authenticated broad defaults; narrow them)
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.follows, public.saved_spots, public.public_profiles from anon, public;
revoke all on public.profiles, public.follows, public.saved_spots, public.public_profiles from authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update, delete on public.saved_spots to authenticated;
grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.saved_spots enable row level security;

-- profiles: everyone else reads through public_profiles; the base row (with phone_hash) is owner-only.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- follows: the social graph is readable by signed-in users; only the follower creates or removes an edge.
drop policy if exists follows_select_authenticated on public.follows;
create policy follows_select_authenticated on public.follows
  for select to authenticated using (true);

drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- saved_spots: visible to the owner and to people the owner is followed by; writable by the owner only.
drop policy if exists saved_spots_select_own_or_followed on public.saved_spots;
create policy saved_spots_select_own_or_followed on public.saved_spots
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.followee_id = saved_spots.user_id
    )
  );

drop policy if exists saved_spots_insert_own on public.saved_spots;
create policy saved_spots_insert_own on public.saved_spots
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists saved_spots_update_own on public.saved_spots;
create policy saved_spots_update_own on public.saved_spots
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists saved_spots_delete_own on public.saved_spots;
create policy saved_spots_delete_own on public.saved_spots
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Security definer because the base table is owner-only under RLS. Returns false for invalid names.
create or replace function public.is_username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(name ~ '^[a-z0-9_]{3,20}$', false)
    and not exists (select 1 from public.profiles p where p.username = name);
$$;

-- Returns discoverable users whose phone hash is in the caller's list, never the caller.
create or replace function public.match_contacts(hashes text[])
returns table (id uuid, username text, display_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if coalesce(cardinality(hashes), 0) > 200 then
    raise exception 'at most 200 hashes per call' using errcode = '22023';
  end if;
  return query
    select p.id, p.username, p.display_name, p.avatar_url
    from public.profiles p
    where p.discoverable_by_phone
      and p.phone_hash is not null
      and p.phone_hash = any (coalesce(hashes, '{}'))
      and p.id <> auth.uid();
end;
$$;

revoke all on function public.is_username_available(text) from public, anon;
revoke all on function public.match_contacts(text[]) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.match_contacts(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: avatars bucket
-- Public bucket: files are readable by anyone via the public URL (no list access for anon).
-- Authenticated users may only write objects under "{their uid}/...".
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Select on own folder is needed for upsert (overwrite) and for listing one's own files.
drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
