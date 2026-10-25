-- Run after the migration as the DB operator. Rolls back all checks.
begin;
do $$
declare role_name text; table_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach table_name in array array['cities','spots','place_evidence','ai_features','api_cache','ingestion_runs','datasets'] loop
      if has_table_privilege(role_name, 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE') then
        raise exception 'Unexpected client table privilege';
      end if;
      if not (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass) then
        raise exception 'RLS missing';
      end if;
    end loop;
    if has_function_privilege(role_name, 'public.reserve_ingestion_attempt(text)', 'EXECUTE')
      or has_function_privilege(role_name, 'public.publish_dataset(jsonb)', 'EXECUTE') then
      raise exception 'Unexpected client operation privilege';
    end if;
  end loop;
end;
$$;
rollback;
