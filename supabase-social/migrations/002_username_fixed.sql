-- nook-social: usernames are fixed after creation (the app also never sends username on update).
-- Run after 001_social.sql in the nook-social SQL editor. Re-running is safe.

begin;

create or replace function public.profiles_keep_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'username cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_keep_username() from public, anon, authenticated;

drop trigger if exists profiles_keep_username on public.profiles;
create trigger profiles_keep_username
  before update of username on public.profiles
  for each row execute function public.profiles_keep_username();

commit;
