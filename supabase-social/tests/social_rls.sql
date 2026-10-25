-- Run in the nook-social SQL editor after 001_social.sql. Everything rolls back; no data is kept.
-- Success: the script finishes and the last result row says 'social RLS checks passed'.
-- Failure: an exception names the first broken rule.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'rls-a@test.invalid'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-b@test.invalid'),
  ('00000000-0000-4000-8000-00000000000c', 'rls-c@test.invalid');

-- ---- as A --------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into public.profiles (id, username, display_name) values ('00000000-0000-4000-8000-00000000000a', 'rls_a', 'A');
do $$ begin
  insert into public.profiles (id, username) values ('00000000-0000-4000-8000-00000000000b', 'spoofed_b');
  raise exception 'A inserted a profile for B';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.profiles (id, username) values ('00000000-0000-4000-8000-00000000000a', 'Bad Name');
  raise exception 'invalid username accepted';
exception when check_violation or unique_violation then null; end $$;

-- ---- as B --------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
insert into public.profiles (id, username, phone_hash, discoverable_by_phone)
  values ('00000000-0000-4000-8000-00000000000b', 'rls_b', repeat('b', 64), true);
insert into public.saved_spots (user_id, spot_id, name, category)
  values ('00000000-0000-4000-8000-00000000000b', 'spot-1', 'Spot One', 'cafe');

-- ---- as C --------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
insert into public.profiles (id, username, phone_hash, discoverable_by_phone)
  values ('00000000-0000-4000-8000-00000000000c', 'rls_c', repeat('c', 64), false);

-- ---- back to A ---------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'base profiles readable beyond owner'; end if;
  if (select count(*) from public.public_profiles where username like 'rls\_%') <> 3 then raise exception 'public_profiles not readable'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'public_profiles'
             and column_name in ('phone_hash', 'discoverable_by_phone')) then raise exception 'view exposes phone fields'; end if;
  update public.profiles set display_name = 'Nope' where id = '00000000-0000-4000-8000-00000000000b';
  if found then raise exception 'A updated B''s profile'; end if;

  if (select count(*) from public.saved_spots) <> 0 then raise exception 'saves visible without follow'; end if;
  insert into public.follows (follower_id, followee_id) values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
  if (select count(*) from public.saved_spots) <> 1 then raise exception 'follower cannot read followee saves'; end if;
  delete from public.saved_spots where user_id = '00000000-0000-4000-8000-00000000000b';
  if found then raise exception 'A deleted B''s save'; end if;

  if (select count(*) from public.match_contacts(array[repeat('b', 64), repeat('c', 64)])) <> 1 then
    raise exception 'match_contacts must return only discoverable B'; end if;
  if not public.is_username_available('free_name') or public.is_username_available('rls_b')
     or public.is_username_available('NO') then raise exception 'is_username_available wrong'; end if;
end $$;

do $$ begin
  insert into public.follows values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c');
  raise exception 'A created a follow on B''s behalf';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.follows values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a');
  raise exception 'self-follow accepted';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.saved_spots (user_id, spot_id, name) values ('00000000-0000-4000-8000-00000000000b', 'spot-2', 'X');
  raise exception 'A saved a spot as B';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.match_contacts(array(select md5(g::text) || md5(g::text) from generate_series(1, 201) g));
  raise exception 'match_contacts accepted 201 hashes';
exception when invalid_parameter_value then null; end $$;

-- ---- B's own hash is excluded from B's matches --------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.match_contacts(array[repeat('b', 64)])) then raise exception 'match_contacts returned caller'; end if;
end $$;

-- ---- anon gets nothing ---------------------------------------------------
reset role;
do $$ begin
  if has_table_privilege('anon', 'public.profiles', 'SELECT') or has_table_privilege('anon', 'public.public_profiles', 'SELECT')
     or has_table_privilege('anon', 'public.follows', 'SELECT') or has_table_privilege('anon', 'public.saved_spots', 'SELECT')
     or has_function_privilege('anon', 'public.match_contacts(text[])', 'EXECUTE')
     or has_function_privilege('anon', 'public.is_username_available(text)', 'EXECUTE') then
    raise exception 'anon has social access';
  end if;
end $$;

select 'social RLS checks passed' as result;
rollback;
