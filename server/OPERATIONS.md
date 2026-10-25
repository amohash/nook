# B data API handoff

## Current state

Implementation on `feat/data-api` preserves contract version 1. No remote deployment,
real SerpApi capture, Supabase migration application, or C/D sign-off has occurred.
Coordination is now recorded in [GitHub issue #3](https://github.com/amohash/nook/issues/3),
**Contract v1: docs/CONTRACTS.md**, tagging C (@Jeffjone) and D (@amohash).
Both must explicitly approve before further implementation against the contract.
The earlier local implementation remains provisional. No approval or agreed C export
has been received. The schema review and adapter/fixture plan are in
[CONTRACT-V1-REVIEW.md](CONTRACT-V1-REVIEW.md).

There is no host or Supabase project yet. B recommends a paid always-running Render
Node web service; the user will create the account/project and the Supabase project,
then provide the project ref and region. Prod is the only environment. No resources
will be created by B as part of this proposal; migrations remain files only.

The active bundled dataset remains **`fictional-austin-v1`**, city `demo-austin`,
capture/scenario time `2026-10-24T18:00:00-05:00`. Its ten venues are fictional.
There is no real Austin dataset artifact yet. Do not present the mock provider tests as
real captures, measured quota savings, or a deployed API.

## Contract coordination for C and D — proposal, not sign-off

- Keep the existing v1 JSON fields, tag vocabulary and null semantics unchanged.
- Real Austin canonical city ID: `us-tx-austin`; real snapshot mode: `cached`.
- Place IDs: `google:` followed by 32 hex characters of SHA-256 of Google `place_id`.
  IDs do not depend on names, ordering, timestamps or dataset version. Preserve the
  complete provider ID separately and use it in public Maps links.
- B's dataset envelope is `{city, snapshot, details}`. Only normalized, validated
  public fields enter this artifact; the private provider response never does.
- Proposed C export from `server/src/routes/recommend.ts`:
  `createRecommendationHandler({snapshot, getDetail, now}): RequestHandler`.
  B will mount it through `createApp({dataset, recommendationHandler})` after C agrees
  and supplies the module. `RecommendationData` describes the data dependency.
  `now` is an injected clock; use the demo clock only for demo mode.
- The existing foundation handler still uses `@space/core` and has not been replaced
  with a new scorer. C's actual route is **not yet mounted**.
- D can keep current mobile v1 parsers. Selecting a real dataset must be explicit;
  this API serves one pinned dataset at a time, never a silent demo/live mix.
- Exporting `z` from contracts keeps server schemas on the same installed Zod major.
  No root manifest or lockfile was edited. The server build bundles Zod because
  resolving an external Zod from the server previously selected an unrelated v3 copy.

## Operator workflow (B alone)

This workflow is for after C/D approval and infrastructure handoff. The user configures
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SERPAPI_API_KEY` privately in the
host/Supabase dashboards. Never request their values in chat. Run ingestion in the
configured host operator environment; local credentials are not a prerequisite.
Do not apply migrations until the user provides the project ref/region and authorizes
application. The steps below are instructions, not authorization to execute them now.

1. After project handoff and explicit application authorization, inspect migration history. Apply
   `supabase/migrations/202610250001_data_api.sql` once through the existing team
   migration workflow. Do not reset. Run `supabase/tests/private_access.sql` as the
   operator afterward. These SQL scripts are prepared, **not applied or DB-tested**.
2. Verify sponsor quota privately. The seed command plans at most six discovery
   requests and ten detail requests, with no automatic retry. A persistent version
   budget caps attempts at 18 across restarts; changing versions is a deliberate
   operator action, not an automatic way around that limit.
3. From `server/`, normalize one place first:

   ```sh
   npx tsx src/jobs/seed-austin.ts --authorize-spend --version=austin-20261025-v1 --one
   ```

   This makes at most one upstream attempt and verifies an immediate cached repeat.
   It writes a normalized `fixtures/data/austin-20261025-v1-one.json`; it does not
   publish the incomplete city. Inspect this record before the bounded capture.
4. From `server/`, run the same command without `--one`. It targets 25 places,
   accepts 20–30 deduplicated places in the central Austin bounding box, and hydrates
   ten details. Fewer than 20 places, missing detail identities, provider errors or
   exhausted budget fail closed before publishing. No partial result replaces the
   pinned dataset. Cache hits reuse original fetched timestamps.
5. Full capture publishes the normalized dataset transactionally in Supabase and
   writes `fixtures/data/austin-20261025-v1.json` atomically. Review the artifact,
   then share it with C/D. Reusing a published version cannot replace its contents.
   Local output failure after DB publication requires recovering that exact stored
   `datasets.document`, not regenerating a different artifact under the same version.
6. Build with `npm run build:server` from the root. On the existing host set
   `COMMIT_SHA` to the deployed commit, `PORT` to the host's assigned port, and
   `DATASET_PATH` to the normalized artifact path relative to the server process.
   Start with `npm run start:server`. An unset path serves the labeled demo dataset;
   an invalid path or inconsistent dataset fails startup rather than switching modes.
7. A host-neutral container recipe is `server/Dockerfile`, built from the root.
   It copies no `.env` files. Mount the reviewed snapshot read-only and supply its
   absolute `DATASET_PATH`. Container build is unverified here (Docker unavailable).
8. Verify the existing host's HTTPS `/health`, list and detail endpoints, record
   deployed commit and response mode, then perform D's physical-phone acceptance.

No city-build worker, accounts, profiles, follows or ratings are enabled. P1 endpoints
return the standard 404. The only spend-triggering operation is the server-side seed
command with explicit `--authorize-spend`; no admin credential is bundled in mobile.

## Endpoint examples

Local development starts with `npm run dev:server`. These are examples, not a remote URL:

```sh
curl http://localhost:3001/health
curl http://localhost:3001/v1/cities
curl http://localhost:3001/v1/cities/demo-austin/spots
curl http://localhost:3001/v1/spots/demo:spot-1
```

Health returns `{"status":"ok","contractVersion":1,"commit":"<configured commit>"}`.
Lists return `{schemaVersion:1,cityId,mode,datasetVersion,fetchedAt,spots}`;
detail returns `{schemaVersion:1,spot,evidence}`. Use an actual returned ID for real
places. Unknown resources return 404; invalid IDs/unsupported list parameters return
400; bodies are capped at 32 KB. Error shape remains `{error:{code,message,retryable},requestId}`.

## Data, cache and accounting policy

Known provider facts receive heuristic confidence 0.8, not a statistical calibration;
unknown facts receive 0. No observation timestamp is invented. Missing price, crowd,
atmosphere, access and amenities remain null/unknown. No photo is copied without
attribution. Unparsed hours remain unknown; `open_now` is never a weekly schedule.
Address and coordinates must be present and valid to include a source record.
Detail evidence contains bounded factual identity/address snippets, not invented
reviews or Muse output. Review-evidence extraction and richer hours parsing remain
follow-up work after real payload inspection and coordination with C.

Provider cache keys hash canonical parameters, geographic query, locale and parser
version, excluding keys. Listings/details expire after 24 hours, empty valid searches
after five minutes. Errors are not cached. Identical in-process requests single-flight;
the P0 seed is single-operator, sequential. Cross-process coalescing/worker leases are
not implemented and new-city jobs remain gated. SQL denies anon/authenticated access
to all backend tables and RPCs, including raw cache; only the server role is granted.

Each seed prints actual external attempts, cache hits, coalesced calls, failures,
invalid record count and dataset version. `ingestion_runs.attempts` persists the
reservation before each upstream call, conservatively including a crash after reservation.
Public reads/reranks report zero external provider calls. Serving pinned cached facts
does not renew their age or claim live evidence; expired source facts await an explicit
operator recapture. No paid request is triggered by opening a screen or changing filters.

## Verification and remaining gates

Verified locally: 63 tests pass, all workspace typechecks pass, lint passes, server
bundle builds, and the built Node process returns 200 for health/cities/list/detail.
An invocation of the seed command without authorization exits 1 before provider work.

Automated tests cover cold/cache repeat/expiry, concurrent request deduplication,
authorization, concurrent hard limits, upstream 429/500/malformed payloads/timeouts,
response size limits, stable IDs, unknown evidence, duplicate/mixed datasets, API
validation, P1 absence and injection of C's future handler. Provider-shaped inputs
are explicitly synthetic test cases, not real fixture captures.

Still required: approval from C and D in issue #3, user-created host and Supabase project, real quota check and one-place capture, 20–30 real places
and ten real details, migration execution and actual role-denial checks, host/container
validation, remote health/data smoke, C's handler mount, and phone acceptance. Preserve
unknowns rather than filling these gaps with fictional facts.

## Proposed Render setup — user creates the service

Select a paid always-running Node web service in the prod environment. Choose a region
near the Supabase region once known. Use the repository root as the build directory,
Node 24, build command `npm ci --include=dev && npm run build:server`, start command
`npm run start:server`, and health check path `/health`. Keep automatic deployment
disabled so B controls deployments after D's main merges. The first health deployment
can use the merged foundation; it needs no SerpApi or Supabase secret. Set the deployed
commit identifier as `COMMIT_SHA`. Confirm the service URL and health response before
enabling any provider integration. No Render service has been created.
