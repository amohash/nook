-- B-owned, additive migration. All access is through the server, never client keys.
begin;
create table public.cities (
  id text primary key,
  document jsonb not null,
  dataset_version text not null,
  updated_at timestamptz not null default now()
);
create table public.spots (
  id text primary key,
  city_id text not null references public.cities(id),
  provider_place_id text not null unique,
  document jsonb not null,
  fetched_at timestamptz not null
);
create index spots_city_id on public.spots(city_id);
create table public.place_evidence (
  id text primary key,
  spot_id text not null references public.spots(id),
  document jsonb not null
);
create table public.ai_features (
  spot_id text not null references public.spots(id),
  source_hash text not null,
  model text not null,
  prompt_version text not null,
  document jsonb not null,
  primary key (spot_id, source_hash, model, prompt_version)
);
create table public.api_cache (
  request_hash text primary key check (request_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  fetched_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > fetched_at)
);
create index api_cache_expiry on public.api_cache(expires_at);
create table public.ingestion_runs (
  dataset_version text primary key,
  attempts integer not null default 0 check (attempts between 0 and 18),
  created_at timestamptz not null default now()
);
create table public.datasets (
  dataset_version text primary key,
  city_id text not null references public.cities(id),
  document jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.cities enable row level security;
alter table public.spots enable row level security;
alter table public.place_evidence enable row level security;
alter table public.ai_features enable row level security;
alter table public.api_cache enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.datasets enable row level security;
revoke all on public.cities, public.spots, public.place_evidence, public.ai_features,
  public.api_cache, public.ingestion_runs, public.datasets from public, anon, authenticated;
grant select, insert, update, delete on public.cities, public.spots, public.place_evidence,
  public.ai_features, public.api_cache, public.ingestion_runs, public.datasets to service_role;

-- Durable accounting survives failed calls and restarts. No reset endpoint.
create function public.reserve_ingestion_attempt(version text) returns boolean
language plpgsql set search_path = '' as $$
declare reserved integer;
begin
  if version !~ '^austin-[a-z0-9-]{1,80}$' then raise exception 'Invalid version'; end if;
  insert into public.ingestion_runs(dataset_version) values(version) on conflict do nothing;
  update public.ingestion_runs set attempts = attempts + 1
    where dataset_version = version and attempts < 18 returning attempts into reserved;
  return reserved is not null;
end;
$$;

create function public.publish_dataset(dataset jsonb) returns boolean
language plpgsql set search_path = '' as $$
declare spot jsonb; detail jsonb; evidence jsonb; city jsonb := dataset->'city';
  version text := dataset->'snapshot'->>'datasetVersion';
begin
  if city->>'id' <> 'us-tx-austin' or city->>'mode' <> 'cached'
    or version is distinct from city->>'datasetVersion'
    or jsonb_array_length(dataset->'snapshot'->'spots') not between 20 and 30
    then raise exception 'Invalid Austin snapshot'; end if;
  -- Versioned artifacts are immutable. A repeat publish cannot replace evidence.
  if exists(select 1 from public.datasets where dataset_version = version) then
    if exists(select 1 from public.datasets where dataset_version = version and document = dataset) then return true; end if;
    raise exception 'Dataset version already exists';
  end if;
  insert into public.cities(id, document, dataset_version) values(city->>'id', city, version)
    on conflict(id) do update set document = excluded.document, dataset_version = excluded.dataset_version, updated_at = now();
  for spot in select value from jsonb_array_elements(dataset->'snapshot'->'spots') loop
    if spot->>'cityId' is distinct from city->>'id' or spot->>'datasetVersion' is distinct from version
      or spot->>'datasetMode' is distinct from 'cached' then raise exception 'Inconsistent spot'; end if;
    insert into public.spots(id, city_id, provider_place_id, document, fetched_at)
      values(spot->>'id', city->>'id', spot->>'providerPlaceId', spot, (spot->>'fetchedAt')::timestamptz)
      on conflict(id) do update set document = excluded.document, fetched_at = excluded.fetched_at;
  end loop;
  for detail in select value from jsonb_array_elements(dataset->'details') loop
    for evidence in select value from jsonb_array_elements(detail->'evidence') loop
      insert into public.place_evidence(id, spot_id, document)
        values(evidence->>'id', detail->'spot'->>'id', evidence)
        on conflict(id) do update set document = excluded.document;
    end loop;
  end loop;
  insert into public.datasets(dataset_version, city_id, document) values(version, city->>'id', dataset);
  return true;
end;
$$;
revoke all on function public.reserve_ingestion_attempt(text), public.publish_dataset(jsonb) from public, anon, authenticated;
grant execute on function public.reserve_ingestion_attempt(text), public.publish_dataset(jsonb) to service_role;
-- No city_jobs, auth or social writes until the physical-phone P0 gate passes.
commit;
