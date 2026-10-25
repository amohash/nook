# B data and infrastructure assignment

Status: contract v1 approved; C's router integrated. Supabase migration applied and
private-role checks passed on project `nntbhzrhvqgvmwrmorhe` (`us-east-1`). Real cached
Austin snapshot captured: 30 places, ten details, 13 total external attempts under
the 18-attempt ceiling. Real dataset API smoke passed locally. Presenter-phone
acceptance of the hosted real snapshot remains pending; public Render API checks pass.
PRs #7 and #10 are merged. Free Render hosting is live; D owns main merge and phone acceptance.

> Read AGENTS.md, docs/PRD.md and docs/CONTRACTS.md. I am person B on feat/data-api. Verify branch and existing work. Own Supabase schema/migrations, SerpApi adapter, normalized real fixtures, cache, jobs, deployment, server bootstrap and shared schemas. First coordinate contract version 1 with C and D, deploy /health, and normalize one real place without exposing keys. Expand to a bounded 20–30-place Austin snapshot with stable IDs, timestamps, nullable fields and source links. Implement list/detail endpoints with Zod validation, request timeouts, deduplication, cache expiry and request accounting. Mount C's recommendation route through an agreed export; do not implement a competing scorer. Keep the provider cache private; add explicit authorization for any spend-triggering operation. You alone apply migrations/deploys. Verify a cold request, a cached repeat and provider failure. City jobs/auth/social are gated P1. Hand off endpoint examples, dataset version, tests and remaining unknowns without secret values.

## First milestones

1. One working SerpApi request, key quota recorded privately, deployed health endpoint.
2. Shared schemas and 10 normalized fixture records available to A/C/D.
3. By 9 p.m.: real snapshot/list/detail endpoints on phone-accessible HTTPS.
4. Before recording: pinned dataset, backend commit, bounded retries and fallback tested.

For optional builds, cap all request attempts, persist jobs, deduplicate requests for the same city and never rely on post-response work in a process that may stop. Start with 16 planned external requests plus two reserved retry slots under the 18-call ceiling; stop instead of overspending.

## Handoff record

- Branch: `feat/data-api`, based on merged foundation `3345efa`; no deployed commit.
- Endpoint examples and operating instructions: [server/OPERATIONS.md](../server/OPERATIONS.md).
  Local `/health`, cities/list/detail and foundation recommendations are available.
- Migration: `202610250001_data_api.sql` prepared; not applied. SQL privilege check
  prepared but not executed (no configured shared DB or local PostgreSQL).
- Dataset: still `fictional-austin-v1`, ten fictional demo places, scenario time
  `2026-10-24T18:00:00-05:00`. No real normalized capture exists yet.
- Actual real-provider calls: zero; no provider key was available. Automated mock
  cold request = 1 attempt; cached repeat = 1 hit and no additional attempt.
- Implemented: private persistent cache adapter, 24h/5min expiry, four-second provider
  timeout, deduplication, bounded operator ingestion, durable 18-attempt reservation,
  normalized snapshot loader, route injection boundary, private RLS migration and
  host-neutral container recipe. City jobs/auth/social remain disabled P1.
- Checks: 63 unit/API tests, workspace typecheck, lint and server build passed. Built
  server local HTTP smoke returned 200 for health/cities/list/detail. The seed command
  without authorization exited 1 without a provider call. No Docker, DB role,
  remote host, real provider or physical-phone verification has occurred.
- Current coordination draft: [server/CONTRACT-V1-REVIEW.md](../server/CONTRACT-V1-REVIEW.md).
  Existing Zod schemas were reviewed, not duplicated or extended with new API fields.
  Focused validation: 16 contract tests pass; contracts typecheck passes.
- Next: user finishes Supabase/SerpApi configuration in ignored `server/.env`; B verifies
  the target project and applies the migration through the agreed operator workflow,
  then captures one real place before expanding. D reviews and merges this branch.

- Local team-access update: API running on port 3001 with Cloudflare Quick Tunnel.
  Current URL and restart instructions are in `server/OPERATIONS.md`. Four concurrent
  HTTPS health requests and cities/list/detail passed from B's laptop. The user reports
  phone access confirmed after the tunnel restart. No paid service
  or database was created by this agent.

## PR preparation checkpoint

- Synced `origin/main` at `04b2b7c` into `feat/data-api` without conflicts.
- Verified C/D explicit contract approvals in closed issue #3. C's merged router
  export is available; mounting it remains a follow-up integration task.
- Installed the committed lockfile with `npm ci --ignore-scripts` (no dependency edits).
- Current checks: workspace typecheck, 136 tests across 11 files, lint, server build,
  and `git diff --check` all pass. Eight existing dependency advisories remain.
- Ignored `server/.env` prepared with owner-only permissions; credentials are pending.
  No migration applied or paid provider request made. Phone results are user-reported.
- D owns PR review/main merge and integrated presenter-phone acceptance.

## PR #7 review fix — C router mount

- Replaced the inline recommendation route/handler injection with C's actual
  `createRecommendationRouter`, mounted using `app.use('/v1/recommendations', router)`.
  Removed the unused proposed `RecommendationData` interface.
- Production-app HTTP tests exercise the real router at the prefix with and without
  trailing slash. They validate RecommendationSchema, request IDs, scorer parity,
  fixed demo time, advancing server time for cached/live mode, and preserved source
  timestamps. Cached/live tests use explicitly synthetic provider test data.
- Checks: focused HTTP/router tests 27/27; full suite 138/138 across 11 files;
  workspace typecheck, lint, server build and `git diff --check` passed.
- User reports provider configuration complete; credentials were not printed or
  committed. Real capture, migration execution, deployment and the updated router's
  presenter-phone acceptance remain separately unverified. No paid call or migration
  was run for this fix. D retains review and main merge.

## Real capture checkpoint — 2026-10-25 02:52 UTC

- Target confirmed: `nntbhzrhvqgvmwrmorhe`, user-reported region `us-east-1`.
  Fixed the ignored local URL's missing `h`; credentials never printed or committed.
- SQL Editor preflight: empty public schema; `supabase_migrations.schema_migrations`
  absent. Applied the existing `202610250001_data_api.sql` in its transaction once.
  SHA-256: `572fa04660488fd76b239784478ec1a50e6c9cc74485ec94b7b5ce065fe0c51e`.
  This was a manual SQL Editor application, not a CLI migration-history entry;
  future migration tooling must reconcile this application instead of rerunning it.
- `supabase/tests/private_access.sql` passed. Additional rolled-back SQL switched to
  both `anon` and `authenticated`: all seven private table reads and the ingestion
  reservation RPC raised insufficient_privilege. Service-role cache reads returned 200.
- First provider response persisted successfully but the seed's string timestamp check
  rejected equivalent `Z`/`+00:00` instants. Fixed comparison to use instants; restart
  reused the persistent cache. One-place smoke: one place, zero extra calls, two hits.
- Detail capture exposed `type` as an array. Added bounded primary-category parsing
  with a synthetic regression test. One intermediate provider attempt failed without
  a cached result; the failure type was not recorded by the old generic CLI handler.
  The CLI now emits only safe internal error codes. Resumed under the same durable
  version budget, without resetting or increasing it.
- Published `austin-20261025-v1`: 30 unique places, ten detail evidence records, no
  invalid records in the successful capture. Final successful run made six external
  calls and eight cache hits; total durable attempts across all runs = 13.
- Supabase counts: 30 spots, ten evidence rows, one dataset. Canonical stored document
  matches `fixtures/data/austin-20261025-v1.json`; normalized artifact credential scan
  passed. One-place artifact is also retained separately and was never published.
- Actual app smoke over this real snapshot: list/detail/recommendation 200, three
  matching recommendations, zero provider calls during ranking, no-match count zero,
  missing detail 404. Real mode is `cached`, with current server ranking time and
  unchanged source times. No map/mobile state was changed to select it silently.
- Checks after syncing A's merged UI: workspace typecheck, 149 tests across 14 files,
  lint, server build, diff whitespace check all pass.
- Limits: hours, amenities, atmosphere and Muse summaries remain unknown unless source
  evidence exists; detail evidence here contains source name/address/fetch facts, not
  review excerpts. No real-venue Muse extraction or presenter-phone real snapshot
  verification was performed. Existing laptop tunnel was not redeployed/restarted.
- Next: D reviews PR #7 and explicitly selects real city `us-tx-austin` and dataset
  `austin-20261025-v1` in the mobile flow. B sets DATASET_PATH for a reviewed server
  restart and C receives the snapshot for evidence work. Keep demo mode separate.

## Public real-snapshot restart — 2026-10-25 02:54 UTC

- User reported HTTP 530 / Tunnel 1033. Neither API nor cloudflared was running.
- Restarted built server at code commit `d2a6cca`, explicitly loading the captured
  real dataset. Started API and tunnel detached from command sessions; caffeinate
  prevents idle sleep. PID/log paths and active URL are in server/OPERATIONS.md.
- New base URL: https://jewel-graduated-dealtime-representations.trycloudflare.com
- Public HTTPS checks: health 200 with expected code commit, list 200 with 30 real
  cached places, recommendations 200 with three results and zero external calls.
- Mobile must request `cityId: us-tx-austin` and use actual departure time; the old
  `demo-austin` query is not valid for this pinned real dataset. D owns mobile setup.
- Both processes left running for device tests. Phone acceptance remains pending;
  no extra provider capture, migration or paid operation ran during this restart.

## C Muse prerequisites handoff — anonymous cached review evidence

- Implemented only B-owned modules: `server/src/data/review-evidence.ts` and its
  importer job, `server/src/cache/evidence-cache.ts`, and the pre-publication helper
  `server/src/jobs/publish-dataset.ts`; seed uses the helper without inference by
  default. C's extractor/schemas/provider and the recommendation router are unchanged.
- Imported existing cached reviews into the private `place_evidence` table: ten real
  places from `austin-20261025-v1`, five anonymous snippets each, 50 total. No paid
  acquisition or Muse call was made; durable provider attempts remain 13.
- Each source has snapshot place ID, actual primary category, language `en` (explicit
  provider-request-locale basis), stable hashed snippet IDs and text <=500 chars.
  Safe source URLs, all 50 available review timestamps, fetch timestamps and relative
  date labels remain in the private bundle. No reviewer metadata or review text was
  added to the repository, mobile bundle or public API in this change.
- Privacy: author names/IDs removed across the whole batch, contacts redacted before
  truncation, profile/credential URLs fall back to public Maps links. Live audit found
  zero known reviewer identity matches. Missing/foreign/malformed source data produces
  no review evidence; name/address records are never used as review input.
- Loader: `new SupabaseReviewEvidenceStore(db).get(placeId, 'austin-20261025-v1')`;
  `.source` matches C's SourceSchema, `.provenance` holds private source metadata.
  Missing returns undefined. Iterate snapshot IDs to enumerate all ten available sources.
- Cache: `new SupabaseEvidenceCache(db)` implements C's exact get/set interface,
  retaining the complete ExtractionRecord and validating source/model/prompt/language
  key identity. Uses existing private ai_features; no migration was needed. Live
  persistence across two adapter instances passed with a temporary all-unknown test
  record, which was deleted. This is adapter validation, not a generated Muse result.
- Ingestion: `publishDataset(candidate, db, {loadEvidence, extract})` awaits C's
  extraction, revalidates source identity/citations, applies C's projector to both spot
  copies and selected public citations, then publishes. Missing evidence, failures or
  cache-write failure preserve prior facts/unknowns. Default seed has no model callback.
- Existing v1 snapshot remains immutable/unmodified. Enriched publication requires an
  agreed new version and explicit authorization for model calls; no inference runs on
  HTTP recommendation/filter requests.
- Evidence availability: 20 other places have no cached reviews. No snippets explicitly
  mention Wi-Fi; one mentions outlets/charging. These are text-availability counts,
  not amenity assertions. C must abstain unless the full snippet supports a claim.
- Checks: 12 focused tests; full suite 161/161 across 17 files, typecheck, lint, server
  build and diff check passed. Live source/store tests and C-compatible adapter
  round-trip passed. Running phone-test API/tunnel left untouched.
- Configuration names only: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; META_API_KEY
  belongs to C's separately authorized extraction step. Full usage: server/OPERATIONS.md
  section "Muse handoff". No secret values included.
- Next smallest step: C loads these sources and supplies authorized validated model
  extraction; B publishes a separately versioned enriched snapshot after review, and
  D verifies source labels/claims on the presenter phone. P0 real Muse summaries are
  not yet implemented/verified by this B handoff.

- Follow-up sync: merged current main `8517e69` after PR #7 merged (`d31e3d3`).
  D's API-city initialization and design-preview routes are preserved. Re-ran all
  checks: 164/164 tests across 18 files, workspace typecheck, lint, server build and
  diff check pass. Evidence/cache implementation commit: `b3b9fe2`; follow-up PR
  will contain that code and this updated integration record.

## Stable public API — Render Free deployment

- User chose free hosted service with cold starts and signed into Render. Created one
  Node web service `nook-api-demo`, ID `srv-dbenp18ae00c73doen00`, Free ($0/month),
  Virginia, main branch, no paid resources. Existing unrelated workspace services
  were untouched. Public Git source requires no added GitHub integration credentials.
- Permanent base URL: https://nook-api-demo.onrender.com
- Live commit: `74c731a0b8f320127161a1990dd9432136cd6a81`; deploy ID
  `dep-dbenp1oae00c73doeoig`. Render reports live and successful build.
- Build: npm ci --include=dev && npm run build:server. Start passes Render's commit
  through COMMIT_SHA. Node 24.11.1 read from .nvmrc; health path /health; native port
  10000 assigned by Render. Auto-deploy and previews Off.
- Pinned DATASET_PATH serves austin-20261025-v1, cached, us-tx-austin, 30 places.
  No private provider/DB/Muse keys supplied to this serving process. Operator
  evidence/capture/cache access remains in private local/server configuration.
- Public HTTPS contract checks: exact health/commit 200, list 200 with 30 spots,
  detail 200, recommendation 200 with three results and externalCalls 0, empty query
  200 with zero matches, invalid query 400. Shared schemas validated each response.
- Local lockfile install/build passed; Render install/build also passed. No code,
  root manifest, contract, migration or provider-acquisition change was required.
- Updated only B's ignored local mobile transport settings to the stable URL.
  Each teammate must update their own env/restart Metro; D owns device verification.
- Earlier failure: local API stayed healthy while QUIC tunnel lost its network.
  Restarted tunnel with HTTP/2 and verified temporary fallback health/recommendation
  200 at https://atm-sunset-phentermine-entrepreneur.trycloudflare.com . Both local
  processes remain running; hosted API no longer depends on them.
- Limits: Free service sleeps after 15 idle minutes; cold wake can take ~1 minute,
  longer than the current mobile eight-second timeout. Warm /health before the demo,
  then retry. Expo Go development bundle still needs Metro. No new real Muse outputs
  were generated or claimed; snapshot values remain as captured.
- Next: D sets EXPO_PUBLIC_API_BASE_URL to the Render URL and verifies the complete
  phone flow plus cold-start Retry. B manually deploys only reviewed main changes.

## Cached Muse publication checkpoint

- Found C's ten real muse-spark-1.3 / space-evidence-v1 records already persisted in
  ai_features. All matched current source hashes, identities and citation sets. No
  local META_API_KEY was needed; no new paid/model/provider call was made.
- Added B's cache-only enrichment job and a prepare-without-publish function. Full
  C records stay unchanged. Reviewed omissions can only suppress two specific
  unsupported public claims: no-outlets from few-outlets language, and date-night
  from brunch-date evidence. Review policy is in server/muse-review-austin-v1.json.
- Published austin-20261025-muse-v1 in Supabase and generated its normalized fixture:
  30 original stable places, ten real cached summaries, 34 selected public anonymous
  citations. Each run reuses ten cache records with zero model calls. Base v1 and
  its source facts/timestamps remain unchanged. All Wi-Fi/outlet values remain unknown.
- Checks: six focused review/publication tests; full suite 174/174 across 20 files,
  workspace typecheck, lint, server build and diff checks pass. Actual app HTTP smoke
  validated all ten summary details, three recommendations and zero reranking calls.
- Default campus 15-minute top three remain outside the reviewed summary set. This
  limitation is explicit; no winner IDs or constraints were altered to force Muse
  cards into the shortlist. D should test enriched details by stable ID and rehearse
  the actual chosen filter/origin flow.
- Next: C/D review and D main merge, then B selects the new artifact in the existing
  Render service, manually deploys main and validates public responses. Current
  public server remains on v1 until the merge. Only D may merge main per AGENTS.md.


## Reviewed Muse snapshot — live Render verification

- PR #13 merged as a8946ad; manually deployed current reviewed main
  f969326afcfd6f611bab163af5f33aa5ca6472b0 on the existing Free service
  srv-dbenp18ae00c73doen00. Successful deploy: dep-dbeosi7avr4c73bkh4f0.
- DATASET_PATH=../fixtures/data/austin-20261025-muse-v1.json. Public base remains
  https://nook-api-demo.onrender.com . No runtime provider/model/DB credentials,
  new services, acquisitions, model calls, or migrations were needed.
- Verified 2026-10-25T05:08:11Z: /health reports the exact deployed main SHA;
  cities and 30-place cached snapshot match the committed artifact exactly.
  All ten enriched detail endpoints return 200, pass shared schemas and match
  the artifact. Their 34 anonymous review citations resolve from Muse evidence IDs,
  retain HTTPS source URLs and stay within 500 characters. They also retain ten
  original provider-detail evidence entries (44 total entries across ten details).
- Verified Wi-Fi/outlets remain unknown and both reviewed claims remain withheld.
  Recommendations return three results, current server time and externalCalls=0;
  slash/no-slash routes agree. Empty-category and strict unknown-amenity queries
  return zero results; invalid query returns 400, unknown city returns 404.
- Current-main checks: 188/188 tests across 22 files, workspace typecheck, lint,
  server build and diff check pass. Render install/build/start and health gate pass.
- Limits: the default campus shortlist still has no Muse summaries; the ten other
  enriched details are verified over public HTTPS. D must verify the new version,
  an enriched detail, source labels and recovery on the physical presenter phone.
  Warm /health before testing because Free-tier idle/cold-start behavior remains.
- Rollback: restore DATASET_PATH=../fixtures/data/austin-20261025-v1.json and
  manually redeploy reviewed main. Both immutable artifacts remain available.


## Real place-photo recovery — prepared, not live

The live Muse dataset set every image to null: normalization discarded provider
thumbnail fields. Existing SerpApi cache entries already supplied public Google
Maps thumbnails for all 30 stable places. No additional paid acquisition was made.

- Normalization now retains a safe optional thumbnail with Google Maps via SerpApi
  attribution. Unsupported/malformed/private/proxy URLs leave image null without
  rejecting the place. Public images are restricted to HTTPS Google image hosts,
  without credentials, query strings or custom ports. No private raw cache is exposed.
- New immutable artifact/version: austin-20261025-muse-photos-v1, published in
  Supabase. It preserves all ten Muse summaries, 34 anonymous review citations,
  source facts, timestamps, stable IDs, unknown amenities and reviewed omissions.
  Only image objects and dataset-version identities change. Earlier artifacts remain.
- Cache-only operator job: from server/, run
  ../node_modules/.bin/tsx src/jobs/add-cached-images.ts
  --source=../fixtures/data/austin-20261025-muse-v1.json
  --version=austin-20261025-muse-photos-v1
  (--publish performed successfully; do not republish this immutable version).
  It reads private cache, checks each image response, and fails closed unless all
  places have verified photos. No SerpApi endpoint or Muse transport is constructed.
- Verification: all 30 source URLs returned image/jpeg or image/png, and all 30
  decoded successfully in a real browser (naturalWidth > 0, no failures). Actual
  app HTTP smoke passed with images on 30 list entries, all 30 details, and all
  three default recommendations; recommendation externalCalls=0.
- 207 tests across 24 files, typecheck, lint, server build and diff check passed.
  New tests cover unsafe sources, fail-soft normalization and exact preservation
  of the original artifact apart from photos/version. Mobile rendering code unchanged.
- Not live yet: D must merge the updated PR #15. Then B sets the existing Render
  service DATASET_PATH=../fixtures/data/austin-20261025-muse-photos-v1.json,
  manually deploys reviewed main and verifies public list/detail/recommendation
  images plus health SHA. D checks the photos on the presenter phone afterward.
- Limits: photos are public Google-hosted resources and require network access;
  existing image-failure placeholders remain. No claim of device verification.

## Time-evidence parser — implemented, publication pending

- Branch `feat/normalize-time-evidence`; isolated worktree
  `/private/tmp/space-normalize-time-evidence`. Started from clean main `d8b0610`,
  then synced `origin/main` at `cc8f7aa`, preserving the merged photo recovery.
- Changed `server/src/data/normalize.ts`, `server/src/providers/serpapi.ts`, new
  `server/src/providers/serpapi-time.ts`, and focused `server/src/data/normalize.test.ts`.
  No mobile, scorer, shared schema, manifest, lockfile, migration or dataset edits.
- Provider validation now retains optional `hours`, `operating_hours` and
  `popular_times` through the existing seed's repeated schema parsing. Normalization
  projects them into the existing six time-evidence fields. IDs remain unchanged.
- Weekly hours: documented detail weekday rows and listing weekday maps; explicit
  closed/24-hour days, split sessions, Unicode spaces/dashes, 12/24-hour clocks,
  unambiguous shared AM/PM suffixes and overnight end minutes. All seven weekdays
  must parse before hours are known: the schema cannot express a missing weekday.
  Conflicting days, invalid times, equal endpoints, partial weeks and qualified
  holiday text stay unknown. `open_now` and today's open-state string do not qualify.
- Exceptions: only exact valid YYYY-MM-DD keys explicitly present in a supplied
  hours map/row are projected (including closed dates). This is a synthetic-tested
  boundary, not a claim that Austin responses supply that shape. No holiday date is
  inferred. An invalid/unsupported schedule fails closed; other provider variants
  require inspection and a fixture before adding support.
- Typical activity: documented `popular_times.graph_results[weekday]` rows map
  hourly `busyness_score` 0..100 to 0..1. Explicit zero survives; absent hours remain
  absent, invalid/missing scores remain null, and duplicate hour scores become null.
  This is relative historical activity, never headcount or seat availability.
- Live text comes only from `live_hash.info`. Numeric live data comes independently
  from one unambiguous `current: true` row on the provider's `current_day` with an
  explicit 0..100 `live_busyness_score`. Neither text nor historical values is
  converted into a live number. Time-spent text is not an observation.
- Every output uses the original cache-entry `fetchedAt`, including its offset;
  cache replay never refreshes it. Supported provider shapes have no observation
  instant, so live `observedAt` remains null. Relative `hours_last_updated` labels,
  weekday/hour labels and retrieval time are not fabricated source timestamps.
- Evidence availability: local ignored `server/.env` has no configured
  SUPABASE_SERVICE_ROLE_KEY, so no private cache fetch was possible. Inspected
  public SerpApi examples at https://serpapi.com/maps-place-results and
  https://serpapi.com/google-maps-api instead. All new fixtures are explicitly
  synthetic. Real-cache coverage, exact captured shapes and real-data validation
  remain pending; no claim of Austin hours/activity enrichment or phone acceptance.
- Verification: 41 new parser/integration cases; full suite 248/248 across 25 files,
  workspace typecheck, lint, server build and diff whitespace check passed. Tests
  cover overnight/timezone/DST behavior, dated overrides, gaps, invalid evidence,
  stale strict-hours eligibility, future-query live isolation, and a cache-only
  replay with zero transport calls. Existing photo tests pass after sync.
- No paid provider/model calls, DB writes, migration, dataset publication, deployment
  or merge to main performed. Published artifact/version contents are unchanged.

### B's next smallest step: cache-only dry-run reconstruction

1. Load the reviewed immutable source with `loadDataset`; use the latest approved
   source (currently `fixtures/data/austin-20261025-muse-photos-v1.json`), preserving
   all IDs, source facts/timestamps, photos, Muse summaries and selected citations.
2. With B's private operator configuration, read `api_cache` via `SupabaseStore.call`
   using GET only (`api_cache?select=payload,fetched_at&limit=100`, paginate if needed).
   Inspect local_results/place_results, match exact `providerPlaceId` (never title),
   and validate `ProviderPlaceSchema`. Expired entries can be inspected as historical
   evidence; do not change their fetched timestamps. Do not run seed-austin or use
   SerpApi.request: those may acquire on a miss/expiry. No SerpApi/Muse transport is
   needed for this dry run.
3. For each matched cached place call
   `normalizeTimeEvidence(parsedPlace, cacheRow.fetched_at)` from
   `server/src/providers/serpapi-time.ts`. Inspect conflicts across captures and
   choose evidence per field with recorded cache provenance. A detail missing hours
   must not erase a supported listing schedule; unsupported evidence remains unknown.
   Preserve each field's actual chosen capture time, even when captures differ.
4. Patch ONLY `hoursStatus`, `hoursFetchedAt`, `weeklyHours`, `hoursExceptions`,
   `typicalCrowd`, `liveObservation` into both copies of each spot (snapshot and
   detail). Do not replace whole spots with normalizePlace: that would erase Muse
   and other enrichment. Keep original spot.fetchedAt and all non-time facts.
5. Choose a new, agreed, unpublished dataset version; update city/snapshot and both
   spot-copy version identities. Validate the entire candidate with DatasetSchema.
   Write a separate local dry-run artifact and inspect a diff allowing only those
   six fields and version metadata. Report known-hours, historical-hours, live-text,
   numeric-live and unknown counts with cache timestamps; do not publish yet.
6. After review and separate publication authorization, B checks the new version
   does not exist, then uses publishDataset with no inference callback. Retain all
   old artifacts/versions. Deployment is a separate authorized B action after D's
   merge. D must verify source/fetched labels, strict hours, gaps, Now/Later and
   overnight behavior on the physical presenter phone before calling this shipped.

## Place photos — deployed and publicly verified

- PR #15 merged; deployed reviewed main `cc8f7aabebd4d19cba2d5c3fad6bbc21272e02a8`
  on the existing Render Free service. Deploy `dep-dbeq1inavr4c73bo84u0` succeeded.
- Saved setting verified after reload:
  `DATASET_PATH=../fixtures/data/austin-20261025-muse-photos-v1.json`.
- Public verification at 2026-10-25T06:27:05Z: health reports that exact SHA;
  snapshot exactly matches the reviewed artifact, including all 30 images.
  All 30 detail responses exactly match the artifact; all three default
  recommendations include images and report externalCalls=0.
- All 30 public image URLs decoded in the collaborative browser with nonzero
  natural width, zero failures. Ten real Muse summaries remain present. Detail
  evidence is unchanged (44 total entries, including the 34 review citations).
- Current merged commit passes 207 tests across 24 files, workspace typecheck,
  lint and server build. Render install/build/start and health gate passed.
- No new provider acquisition, model calls, migrations, services or runtime secrets.
  Phone rendering is still pending D's acceptance: reload Expo Go, open Explore
  and a detail, and verify photos. Images require network access; existing
  placeholders remain available on image failure. Render Free cold starts remain.
- Rollback: restore `DATASET_PATH=../fixtures/data/austin-20261025-muse-v1.json`
  on the same service and manually deploy reviewed main. Old artifacts are retained.

## B1 cache-only time reconstruction — candidate prepared, not published

- Isolated worktree `/Users/andrewsun/Desktop/nook-cached-time`, branch
  `feat/cached-time-dataset`, based on remote main `7e67622`. Existing root
  `package-lock.json` work preserved. Fetch reported a broken T3 checkpoint ref;
  received main objects were verified against `git ls-remote` and fast-forwarded
  by exact SHA without altering checkpoint refs or teammates' branches.
- NEW candidate: `fixtures/data/austin-20261025-muse-photos-time-v1.json`, plus
  `.diff.json` and `.report.json`. Existing photo artifact remains byte-for-byte
  unchanged. New candidate is **not published, deployed, merged or phone-verified**.
- Replay boundary: `reconstructCachedTime(dataset, rows, {version, now})` in
  `server/src/jobs/reconstruct-cached-time.ts`, returning `{dataset, diff, report}`.
  Rows contain `request_hash`, `payload`, `fetched_at`. Exact provider place identity
  required; conflicting supplied secondary identity rejected. ProviderPlaceSchema
  validates each capture; only normalizeTimeEvidence parses time facts.
- Replay is pure and never constructs SerpApi/Muse transports or uses seed-austin.
  Private cache reads use GET-only pagination, including expired rows. Future
  captures are excluded; stale captures retain original times. Missing/unsupported
  fields abstain. Conflicting supported fields become unknown; agreeing captures
  use the oldest original timestamp. Hours resolve as one atomic schedule group;
  crowd/live resolve independently. No schedule/crowd gaps become zero/closed.
- Actual dry run at `2026-10-25T06:58:45.067Z`: 15 existing private cache rows,
  41 exact matched captures, 69 unmatched places ignored; zero invalid rows,
  identity conflicts, future rows or supported-field conflicts. Known hours 28/30;
  remaining two unknown. Historical records 0, live text 0, numeric live 0. B1 made
  zero acquisition/model calls and zero DB writes. Supported capture times range
  `2026-10-25T02:49:06.296+00:00` through `2026-10-25T02:51:29.056+00:00`;
  these are original capture times, not refreshed by replay.
- Only six time fields and city/snapshot/spot dataset-version identities change in
  both snapshot/detail copies. Independent recursive allowlist rejects every other
  change. Photos, ten Muse summaries, all citations/evidence, IDs and unrelated
  source facts/timestamps are preserved. Report contains cache hashes/timestamps,
  field selections/conflicts and coverage; no raw provider payload/review text.
- Dry-run usage from `server/` (private env configured locally):
  `../node_modules/.bin/tsx src/jobs/add-cached-time.ts --source=../fixtures/data/austin-20261025-muse-photos-v1.json --version=austin-20261025-muse-photos-time-v1`
  Add `--cache-file=/private/path/captures.json` for offline replay without DB;
  add `--now=<offset-instant>` for repeatable freshness reports and `--output=<new-path>`
  for a separate candidate. Outputs use exclusive creation and never overwrite.
- After review and **separate publication authorization**, explicit publication uses
  the exact reviewed artifact, never a new replay:
  `../node_modules/.bin/tsx src/jobs/add-cached-time.ts --source=../fixtures/data/austin-20261025-muse-photos-v1.json --version=austin-20261025-muse-photos-time-v1 --publish-reviewed=../fixtures/data/austin-20261025-muse-photos-time-v1.json --review-report=../fixtures/data/austin-20261025-muse-photos-time-v1.json.report.json --confirm-version=austin-20261025-muse-photos-time-v1`
  Publication checks source/candidate hashes, field allowlist and absence of the
  target version before the existing immutable publishDataset RPC, with no inference
  callback. No publication was run. Existing versions remain available; rollback
  keeps/restores the previously approved photo artifact in DATASET_PATH through a
  separately authorized deployment. No migration or deployment is needed here.
- Actual checks: 54 focused replay/parser tests; full suite 346/346 across 30 files;
  root workspace typecheck, lint, build:server and diff whitespace check passed.
  Tests cover gaps/zero/null, missing detail evidence, exact/secondary identity,
  stale/future captures, field conflicts, stable capture order, original offsets,
  overnight/DST, future live isolation, zero network acquisition, read pagination,
  preservation allowlist and explicit immutable publication without live writes.
- Next: D reviews/merges the small PR; B2 may layer coverage on this reviewed B1
  candidate without changing time/photo/Muse/review projections. B3 owns separately
  authorized publication/deployment. D still needs physical presenter-phone checks:
  source/fetch labels, strict-hours eligibility, unknown gaps, Now/Later, overnight,
  photos/Muse details and recovery. This is a prepared P0 time-evidence correction,
  not a claim of current crowd/seat availability or shipped phone acceptance.

## B2 — Austin coverage candidate, prepared for review (2026-10-25)

- Branch `feat/austin-data-coverage`, fresh isolated worktree
  `/Users/andrewsun/Desktop/nook-austin-data-coverage`, based on reviewed remote
  main `7e6762294a4df89809cd67775bbdfd8beba18c2e`. Root lockfile edit, other
  worktrees and T3 checkpoint refs preserved. No shared contracts, scorer,
  normalization, root manifests, bootstrap or mobile files changed. Coordination
  recorded in issue #3; C/D field admission and D merge remain review gates.
- B1 boundary agreed: new `austin-20261025-muse-photos-time-v1` candidate from
  PR #30 (`d9b9b44`). Independently checked its actual artifact against photos-v1:
  all non-time facts, 30 photos, ten Muse summaries and citations preserved.
  B2 layers this exact candidate, retaining every existing time field and unrelated
  enrichment. B1 source SHA-256 is recorded in B2's report; old artifacts untouched.
- Private-cache audit before acquisition: 12 rows, 39 unique provider identities,
  cafe-origin only; no supported prices or positive amenities/access. Existing
  provider category arrays independently establish two secondary restaurant
  categories and a secondary cafe category; those were previously discarded.
- Authorized acquisition used the existing SerpApi adapter/cache and persistent
  `reserveAttempt('austin-20261025-v1')`, not a new budget version. Exactly three
  first attempts at 06:57:56–59Z searched libraries, parks and restaurants near the
  named manual UT Austin origin. Each returned 20 records. Original ledger13 ->16
  of18; zero retries/failures/model calls. No further acquisition was performed.
- New immutable candidate: `fixtures/data/austin-20261025-muse-coverage-v1.json`.
  New coverage/provenance/strict-query report: same basename `.report.json`.
  53 places: original30 plus8 libraries,7 parks and8 restaurants. Existing explicit
  secondary types bring category membership to30 cafes,8 libraries,7 parks and10
  restaurants (categories overlap). New candidates are bounded to8 per supported
  category and a30-minute estimated walk within the central Austin window, with
  exact provider identity/data-ID deduplication. No category-derived amenity facts.
- 49 known-hours/4 unknown-hours,53 photos,ten retained Muse summaries; historical
  activity and live observations remain unknown for all53. All53 prices, Wi-Fi,
  outlets and public-access values remain unknown. No free-entry/access inference
  from library/park category, name, accessibility, rating or review count.
- Report uses the explicit manual app-default origin30.2862,-97.7394 and its
  recorded measurement clock. At15-minute walk:18 all-category matches,6 libraries,
  1 park,8 restaurants. Strict free/price<=1/Wi-Fi/outlets/public-only each return0.
  Open-session queries yield1 now and8 twelve hours later at the report's clock;
  these are hours-based estimates, not live opening/seat guarantees. No GPS stored.
- New `austin-coverage.ts` pure builder and `build-austin-coverage.ts` operator
  dry run read private cache only. CLI requires source/version/output/report;
  optional `--now` injects time. It rejects unknown flags/published target versions
  and writes output with exclusive creation. It has no acquisition/model transport,
  publication/deployment path or public spending endpoint. Cache reads paginate
  with a2000-row cap. Provenance reports expose selected normalized facts, safe
  Maps links, cache digests and original capture times; no raw provider/reviewer data.
- Verification:14 new coverage tests,347 full tests across30 files, workspace
  typecheck, lint, server build and whitespace checks passed. Tests cover mapping,
  unknown facts, conflicting prices/identities, aliases/duplicates, bounds, future
  captures, error envelopes, immutable source enrichment, privacy, honest strict
  queries and zero construction transport calls. Independent rebuild at the same
  clock produced byte-identical candidate output. Local actual-app HTTP smoke
  matched the full53-place snapshot and all53 details;7 recommendation requests
  passed schemas with externalCalls=0. Browser decoded53/53 photos, zero failures.
- Publication/deployment explicitly handed to B3 after B1/B2 review and D merges.
  No dataset publication, migration, deployment or active-data overwrite in B2.
  Existing Muse projections retained verbatim: C's separate outdoor/provenance
  semantic hold remains open, not resolved or silently approved by this change.
- Presenter-phone checks still needed from D: selected artifact/version, library/
  park/restaurant filters and marker/detail parity, source/unknown labels, Now/Later
  and overnight behavior, photos, strict empty states and API recovery/reconnect at
  `https://nook-api-demo.onrender.com`. Warm health before rehearsal; HTTP/browser
  checks are not native acceptance. Keep photos-time-v1/photos-v1 for rollback.
## B3 backend release verification — October 25, 2026

- Isolated `chore/backend-demo-release` from updated main `7e67622`; preserved root
  lockfile edits and both active B1/B2 worktrees. No shared contract/scorer/root edits.
- Added read-only `server/src/jobs/verify-demo-release.ts`, raw baseline/local
  measurements and `server/RELEASE-HANDOFF.md`. Full live snapshot/all30 details,
  source timestamps,30 image responses,10Muse summaries and9 reranks verified.
  Strict unsupported price/amenity/access/hours queries empty; shared scorer parity
  and externalCalls/cacheHits=0 on every rerank. No provider/model calls by B3.
- Public health still `cc8f7aa` at07:08UTC; no final deployment claimed. Warm health
  80.21ms, snapshot105.74ms; initial idle state unknown. Local process startup/
  stopped-API/reconnect measured separately; neither establishes native recovery
  or Render cold wake. Raw reports preserve exact scopes and identities.
- Existing Supabase RLS/privilege SQL passed; additional rolled-back anon and
  authenticated SELECT/no-op DELETE tests denied all28operations across7tables.
  No rows exposed, writes, migrations, resets or new infrastructure.
- Actual checks:333tests/29files, workspace typecheck, lint, server build and diff
  check passed. HTTP image responses are not phone/browser rendering acceptance.
- Pending: D review/main merge and final artifact selection after B1#30/B2#31;
  C legacy outdoor/provenance gate on issue3; B3 deploy reviewed main on existing
  Render service and repeat audit. Keep all prior artifacts/configuration for rollback.
  D must verify physical-phone filters/parity/source labels/warmup/outage/reconnect.
- This section is B3-only; preserve B1/B2 appended sections during D's main merge.

## Runtime nearby discovery — implemented, live configuration pending

- Isolated `/private/tmp/nook-runtime-nearby-api`, runtime branch
  `feat/runtime-nearby-server`; clean main/teammate work preserved. Shared contracts
  published first as PR#37 (`f075304`,`01d9011`), merged by D as`18b4293`.
  C's assistant implementation cherry-picked only for B's agreed mount integration;
  D merges C#39 first. No competing scorer, endpoint, schema or root edits.
- Implemented `/v1/tester-sessions`, bounded `/v1/discovery`, immutable scoped
  snapshot/detail reads, session-gated recommendation lookup and C assistant mount.
  Private api_cache and existing durable budget RPC reused; no migration/service.
  Fixed all4 supported categories, central Austin box, quantized0.01-degree centers,
  3000m candidate radius, max4listings+4details, max3 concurrent provider requests,
  shared durable18 account ceiling and adapter18 acquisition ceiling, no retries.
  Warm repeat/60s refresh cooldown, persistent leases, stale fallback and measured
  source freshness/error states implemented; no precise device coordinates retained.
- Reviews feed C's existing extraction pipeline using validated cache-only inference.
  Missing AI preserves source places and labels unknown inference. Assistant uses
  C's bounded transport only if configured; B made0Muse calls.
- Exact configuration, reproduction, boundaries and existing Render release workflow:
  `server/NEARBY-OPERATIONS.md`. Operator verification job writes two named public-
  origin normalized snapshots plus measured cold/warm report for C; no fake live data.
- Automatically verified checkpoint:418tests/35files, root workspace typecheck,
  lint, build:server and diff check passed before the final operator-job/documentation
  additions. Final complete-check results are reported in PR/handoff below.
- Live command actually attempted with the existing private main server/.env:
  blocked before network; missing SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,
  SERPAPI_API_KEY,NEARBY_TESTER_ACCESS_CODE,NEARBY_ACCOUNT_BUDGET_KEY. All were empty/
  absent; exact names only emitted. User will configure after code. SerpApi attempts0,
  retries0; Muse attempts0. No live area artifacts, deployment, migration or physical-
  phone acceptance claimed. Existing public Render release unchanged by this work.
- Final post-C-main-sync code `edf6dbb`:426tests across36files passed, including
  18new focused acquisition/access/persistence tests; full workspace typecheck,
  lint, server build and whitespace check passed. Runtime PR#41 is reviewable;
  shared contracts PR#37 is merged. New tests preserve sparse listing facts and
  validate atomic lease expiration/owner release plus service-wide concurrency.
- Existing Render dashboard access was actually checked through T3 preview:
  redirected to login; no authenticated deployment session or RENDER environment
  credential is available here. No deployment was attempted. User sign-in to the
  existing service and private runtime configuration are the exact release blockers.
  No new deployed commit, live-provider result or physical-phone acceptance claimed.
