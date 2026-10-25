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
