# B data API handoff

## Current state

Implementation on `feat/data-api` preserves contract version 1. C/D approvals are
recorded in [issue #3](https://github.com/amohash/nook/issues/3). C's actual router is
mounted through `app.use('/v1/recommendations', router)`.

On 2026-10-25 UTC, B applied `202610250001_data_api.sql` once through SQL Editor to
project `nntbhzrhvqgvmwrmorhe` (user-reported region `us-east-1`). Public schema was
empty and no CLI migration-history table existed. The file's SHA-256 is
`572fa04660488fd76b239784478ec1a50e6c9cc74485ec94b7b5ce065fe0c51e`.
This manual application must be reconciled before any future CLI migration push;
do not reapply the create-table migration. Privilege/RLS checks and actual read/RPC
denial under anon/authenticated passed; service-role cache reads returned 200.

Real snapshot: `fixtures/data/austin-20261025-v1.json`, city `us-tx-austin`, mode
`cached`, 30 places and ten detail evidence records. Published document in Supabase
matches the artifact. Total durable provider attempts: 13 of the 18 ceiling. No
budget reset was used. Raw cache stays private; the file contains normalized facts.
The single-place smoke artifact is separate and not published.

The actual app locally served this artifact with list/detail/recommendation 200,
three qualifying recommendations, zero external calls during reranking, honest
empty results and missing detail 404. This does not verify presenter-phone behavior
or a public deployment using real data. Hours/amenities/atmosphere and real Muse
summaries remain unknown; detail evidence contains provider identity/address facts.

Current hosting choice is B's laptop plus a temporary Cloudflare tunnel. No paid
host was created by B. B restarted the server on user request with the reviewed real snapshot. To reproduce,
start the server with
`DATASET_PATH=../fixtures/data/austin-20261025-v1.json` (server working directory),
then explicitly select `us-tx-austin` in the mobile query. Do not reuse demo city IDs
or a demo clock for the real snapshot. D owns the mobile selection and phone check.

## Contract coordination — approved v1, router integrated

- Keep the existing v1 JSON fields, tag vocabulary and null semantics unchanged.
- Real Austin canonical city ID: `us-tx-austin`; real snapshot mode: `cached`.
- Place IDs: `google:` followed by 32 hex characters of SHA-256 of Google `place_id`.
  IDs do not depend on names, ordering, timestamps or dataset version. Preserve the
  complete provider ID separately and use it in public Maps links.
- B's dataset envelope is `{city, snapshot, details}`. Only normalized, validated
  public fields enter this artifact; the private provider response never does.
- C's merged export is `createRecommendationRouter({loadSnapshot, clock})` from
  `server/src/routes/recommend.ts`, mounted with `app.use` at `/v1/recommendations`.
  The earlier `createRecommendationHandler` proposal and optional handler injection
  are removed; the production app directly constructs C’s router.
  The loader returns the pinned snapshot for its city, null for unknown cities, and
  throws on storage failure. Demo uses the fixed clock; cached real data uses current time.
- The inline foundation handler has been removed. C’s router uses the same
  `@space/core` scorer as the fixture provider; no competing scorer is introduced.
- D can keep current mobile v1 parsers. Selecting a real dataset must be explicit;
  this API serves one pinned dataset at a time, never a silent demo/live mix.
- Exporting `z` from contracts keeps server schemas on the same installed Zod major.
  No root manifest or lockfile was edited. The server build bundles Zod because
  resolving an external Zod from the server previously selected an unrelated v3 copy.

## Operator workflow (B alone)

This workflow is for after C/D approval and infrastructure handoff. The user configures
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SERPAPI_API_KEY` privately in ignored `server/.env` for the current laptop setup. Never request
their values in chat. Run ingestion from the configured server directory.
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

## Previous Render proposal — superseded by local tunnel hosting

Select a paid always-running Node web service in the prod environment. Choose a region
near the Supabase region once known. Use the repository root as the build directory,
Node 24, build command `npm ci --include=dev && npm run build:server`, start command
`npm run start:server`, and health check path `/health`. Keep automatic deployment
disabled so B controls deployments after D's main merges. The first health deployment
can use the merged foundation; it needs no SerpApi or Supabase secret. Set the deployed
commit identifier as `COMMIT_SHA`. Confirm the service URL and health response before
enabling any provider integration. No Render service has been created.

## Previous Koyeb preparation — rejected; do not execute

Use the existing `server/Dockerfile` with repository root as build context. It pins
Node 24 and runs the existing server build; no root manifest or shared contract
change is required. Docker build remains unverified locally because Docker is absent.

After resolving the account billing prerequisite, connect GitHub repository
`amohash/nook`. The local `feat/data-api` branch must first be published before
Koyeb can select it. Configure a Web Service named `nook-api-prod`, Free instance,
Washington, D.C. region, one instance, Dockerfile path `server/Dockerfile`, and no
work-directory override. Keep the Dockerfile's default start command.
Expose HTTP port 3001 with route `/`; set the HTTP health check to `/health` on 3001.
Set `PORT=3001`, `NODE_ENV=production` and `COMMIT_SHA` to the exact deployed Git SHA.
Leave `DATASET_PATH` unset. No provider or Supabase credentials are needed for health.
Disable automatic deployments. Do not provision databases, volumes or workers.

Stop before the creation/deploy action until the user confirms the exact $0 setup.
After deployment, verify HTTPS `/health` returns 200, contractVersion 1 and the
matching commit; record the public URL. The existing demo routes are also exposed.

References: https://www.koyeb.com/docs/faqs/pricing and
https://www.koyeb.com/docs/reference/instances .

## Current local team access

Started on 2026-10-25 UTC from code commit
`d2a6ccaf0be287eee471238b7ed0075af4e25595`.
The server is running on `0.0.0.0:3001`, with `caffeinate -i` preventing idle sleep
while the server command runs. Keep the laptop powered, online and its lid open.
Cloudflared was installed via Homebrew; no login, hosting account or payment was needed.

Current temporary base URL:
`https://jewel-graduated-dealtime-representations.trycloudflare.com`

Health URL:
`https://jewel-graduated-dealtime-representations.trycloudflare.com/health`

LAN alternative (same Wi-Fi; network may block peer access):
`http://10.150.227.120:3001`

Verified from B's laptop: loopback and LAN health; four simultaneous requests through
public HTTPS all returned 200; HTTPS cities/list/detail returned 200. The user subsequently confirmed phone access after the tunnel restart. Individual
phone models and Expo Go versions have not been recorded in this B handoff.
The running dataset is cached `austin-20261025-v1`: 30 real places. The public
recommendation request uses `cityId: us-tx-austin`; demo-austin is not served by this
real-data server. Health, list and recommendations returned 200 through the new
tunnel; the valid recommendation query returned three matches and externalCalls 0.

Each teammate can set these public values in their own `apps/mobile/.env.local`
(preserve any existing settings; D owns the shared mobile code):

```dotenv
EXPO_PUBLIC_DATA_PROVIDER=api
EXPO_PUBLIC_API_BASE_URL=https://jewel-graduated-dealtime-representations.trycloudflare.com
```

Restart Expo after editing: `npm run dev:mobile -- --clear` from the repo root.
Do not use localhost for a phone accessing B's backend. The tunnel exposes only the
API port, not Expo/Metro; each teammate still runs their own mobile development setup.
Anyone with the URL can access the public demo API. Provider cache and paid operations
are not exposed. No provider credentials belong in these Expo variables.

To restart after the current processes stop, use two terminals from the repo root:

```sh
# Terminal 1
npm run build:server
DATASET_PATH=../fixtures/data/austin-20261025-v1.json COMMIT_SHA="$(git rev-parse HEAD)" caffeinate -i npm run start:server
```

```sh
# Terminal 2
cloudflared tunnel --url http://127.0.0.1:3001 --no-autoupdate
```

The active processes are detached from command sessions and remain running for phone
testing. API PID is recorded in `/tmp/nook-api.pid`; tunnel PID is recorded in
`/tmp/nook-tunnel.pid`. Logs are `/tmp/nook-api.log` and `/tmp/nook-tunnel.log`.
Check the recorded processes and stop only those specific PIDs before launching
replacements. Foreground restart commands above stop with Ctrl+C in their terminals.
A new tunnel gets a new hostname: share it and update each app's base URL.
Quick Tunnels have no uptime guarantee; they are for development and demo access.
Reference: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/ .

## Muse handoff — anonymous evidence and persistent extraction cache

Dataset identity remains `austin-20261025-v1`, city `us-tx-austin`. Ten cached real
place details supplied five anonymous review snippets each (50 total). Each has a
stable hashed evidence ID, maximum 500 characters, a stable snapshot place ID and
its actual primary category. All 50 review observation timestamps are available.
Safe public Google review URLs and cache fetch timestamps remain in private
provenance. Reviewer names/IDs are removed across the batch; emails, phone numbers,
handles and URLs are redacted from model text before truncation. Unsafe profile or
credential-bearing links fall back to the place's public Maps URL.

Language is `en` with `languageBasis: provider_request_locale`: the acquisition used
`hl=en`; these responses do not provide original-review language metadata. This is
not a language-detection claim. There is no review evidence for the other 20 places.
A keyword inventory found no explicit Wi-Fi mention and only one snippet mentioning
outlets/charging. These are evidence-availability observations, not amenity claims;
C must abstain wherever a snippet does not establish a requested fact.

Private source location: existing `public.place_evidence` rows whose document has
`kind: anonymous-reviews` and `datasetVersion: austin-20261025-v1`. Full bundles have
`source` (C's exact SourceSchema) and `provenance` (IDs, safe URLs, observed/fetched
instants and original date labels). No reviewer metadata or private review bundle
was committed to the repository or added to public API routes.

Loader (server only; requires configured `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`):

```ts
import { SupabaseStore } from './src/data/supabase';
import { SupabaseReviewEvidenceStore } from './src/data/review-evidence';
import { SupabaseEvidenceCache } from './src/cache/evidence-cache';

const db = new SupabaseStore(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const reviews = new SupabaseReviewEvidenceStore(db);
const bundle = await reviews.get(placeId, 'austin-20261025-v1');
// bundle?.source is directly accepted by C's createEvidenceExtractor.
// Enumerate the snapshot's stable IDs and call get(id, version); undefined means no evidence.
const cache = new SupabaseEvidenceCache(db); // implements C's EvidenceCache.get/set
```

`SupabaseEvidenceCache` uses the already-private `ai_features` table, storing C's
complete ExtractionRecord unchanged in `document`: key, sourceHash, model,
promptVersion, language, generatedAt and validated output. It validates key digests
and column/document identity on reads and writes. C's sourceHash already includes
source.language; the language also remains explicit in the record and cache key.
It needs no additional schema migration. Tests cover source/model/prompt/language
isolation and reuse by fresh adapter/extractor instances. A live Supabase round-trip
using an explicitly test-only, all-unknown record passed; that test row was deleted.
No real extraction record or Muse result was fabricated.

Ingestion publication boundary: `server/src/jobs/publish-dataset.ts` exports
`publishDataset(candidate, db, {loadEvidence, extract})`. The seed command uses this
same publisher without a Muse argument, so default ingestion makes no model call.
After explicit model-call authorization, C's operator workflow can use:

```ts
import { createEvidenceExtractor } from './src/ai/extract';
import { createMuseProvider } from './src/providers/muse';
import { publishDataset } from './src/jobs/publish-dataset';

const extract = createEvidenceExtractor({
  complete: createMuseProvider({ apiKey: process.env.META_API_KEY! }),
  cache,
});
await publishDataset(candidate, db, {
  loadEvidence: (id) => reviews.get(id, 'austin-20261025-v1'),
  extract,
});
```

This runs extraction and validates source hashes, identities, outputs and citations
**before** publication, projects C's applyExtraction into both spot copies, and
includes only cited anonymous snippets in public details. Missing evidence,
validation/extraction failures and failed persistent cache writes preserve prior
facts/unknowns. The existing v1 dataset is immutable: an enriched candidate needs a
separately agreed new version across city/snapshot/spots. Do not overwrite v1 or
rerun paid capture merely to enrich it. Recommendation handlers and filter changes
never invoke this publisher or extractor.

Reproducible review import (no SerpApi/Muse acquisition; existing private cache only):

```sh
# Run from server/. Checks the source file matches the published immutable dataset.
npx tsx src/jobs/import-review-evidence.ts --dataset=../fixtures/data/austin-20261025-v1.json
```

Only configuration names are needed for handoff: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`; C's separately authorized model step additionally uses
`META_API_KEY`. Provider attempts remain 13; this handoff made zero paid acquisition
or model calls. The published snapshot and running server were not replaced with
inferences. Do not claim completed real Muse summaries before C runs and verifies
the authorized extraction step.

Validation for this handoff: 12 focused evidence/cache/publication tests; full suite
161/161 across 17 files; workspace typecheck, lint, server build and whitespace check
passed. Live private-store verification read ten bundles/50 bounded snippets and
confirmed zero known reviewer-name/ID matches. Original observation times were
present on all 50 snippets. The temporary extraction-cache test used an all-unknown,
explicitly test-only record and was removed; it was not a real Muse extraction.
