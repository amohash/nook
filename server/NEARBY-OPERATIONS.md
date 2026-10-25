# Austin-area runtime update — October 25, 2026

The user approved a 250-request account ceiling and automatic guest access for
this demo. `POST /v1/guest-sessions` accepts `{}` and returns a short-lived opaque
session, with no code/account/provider credentials. The mobile app enables it after
onboarding and renews before expiry; a failed session after an API restart triggers
one automatic renewal, then an explicit Retry. The old tester endpoint remains for
operator compatibility but is not used by the app. Guest exchanges are capped at
60 per direct address per ten minutes and 200 active sessions; shared NAT/tunnel
addresses no longer hit the five-attempt tester-code bucket. Per-session discovery,
refresh and global durable spending limits still apply. The guest route exists only
when NEARBY_ENABLED=1. NEARBY_TESTER_ACCESS_CODE is now optional and server-only.

The user approved a 250-request account ceiling for this demo. Set
`NEARBY_ACCOUNT_REQUEST_LIMIT=250` server-side with the existing fixed budget key.
The existing private `api_cache` stores a persistent compare-and-set counter;
all 18 legacy slots are conservatively reserved up front, leaving at most 232
additional runtime attempts. Concurrent instances cannot exceed the configured
ceiling. Invalid/corrupt accounting fails closed. Do not delete this budget row,
rotate its key, or treat it as ordinary expiring provider data. Its 2100 expiry
keeps it outside routine short-lived cache cleanup. No schema/migration change.
The original ingestion RPC and its 18-call cap remain unchanged.

Policy `austin-area-v2` accepts origins in latitude 30.05..30.56 and longitude
-97.98..-97.55 inclusive. Coordinates round to 0.01 degrees; candidates must be
within the service rectangle and 4500m of the coarse center. That radius covers
the supported 60-minute straight-line walking estimate plus quantization offset.
This rectangle includes surrounding neighborhoods; it is not a city boundary.
Mobile accepts the legacy coverage response during rolling updates. Area cache
keys use v2, so narrower v1 results cannot masquerade as expanded coverage.

Acquisition reads four category listings, one extra page for each full 20-result
first page, then up to four detail requests: at most 12 planned attempts, no retry,
three concurrent calls and the unchanged 18-attempt per-acquisition hard ceiling.
Up to 160 deduplicated candidates are ranked by the same shared deterministic
scorer. Pagination/detail failures retain valid listing facts and report partial
results. Refresh is explicit, throttled and charged to the same account budget.

The local server and its existing HTTPS tunnel were exercised for north, south,
east and west Austin. See `measurements/austin-area-public-smoke-20261025.json`
for actual candidate counts, partial failures, cache and scoring/detail parity.
No deployment to Render or physical-phone acceptance is established by this run.
The historical verifier below still uses the original 18-slot ingestion ledger;
do not use it to measure the expanded runtime account counter.

---

# Runtime nearby verification and deployment (B)

Implemented; live-provider verification and deployment pending private configuration.
The existing pinned dataset API remains available with runtime disabled. No migrations,
extra services, root dependencies or schema resets are required.

Set these names privately in the existing main checkout's `server/.env`:

```dotenv
NEARBY_ENABLED=1
NEARBY_ACCOUNT_BUDGET_KEY=austin-runtime-20261025
NEARBY_TESTER_ACCESS_CODE=<private 8..128 character operator code>
SUPABASE_URL=<existing project URL>
SUPABASE_SERVICE_ROLE_KEY=<existing service role credential>
SERPAPI_API_KEY=<configured provider credential>
META_API_KEY=<optional configured Muse credential>
```

Never put the access code or provider credentials in `EXPO_PUBLIC_*`. D's mobile
flag is `EXPO_PUBLIC_NEARBY_ENABLED=1`. Enter the tester access code in the app;
it is exchanged for an opaque 30-minute session retained in device/server memory.
Restarting the server expires sessions. Five session exchanges per direct address
per ten minutes, 200 active sessions, ten discoveries/minute/session, three explicit
refreshes/session and two concurrent acquisitions bound access. Reads and reranks
require a valid Bearer session when selecting a runtime snapshot. No request-body,
conversation or device-origin logging/persistence is installed.

## Coverage and identity

Only selected origins within latitude30.24..30.34 and longitude-97.78..-97.70,
inclusive, are supported. Both selected coordinates round to a0.01-degree provider
center. The center and a3000-meter radius are returned explicitly; only provider
places within that radius **and** the central Austin box enter the snapshot. This
is bounded search, not exhaustive geographic coverage. Canonical city: `us-tx-austin`.
No precise selected origin is sent to SerpApi or retained in persistent acquisition
keys/documents. Ranking still receives the caller's foreground/manual origin in memory.

POST `/v1/discovery` takes `{sessionId,origin:{lat,lng,source},refresh?:boolean}`.
The category acquisition set is fixed: cafes, libraries, parks and restaurants.
Category/filter changes rerank only. Four listing requests and at most four selected
place-detail requests are planned, no pagination or retry. Each provider call times
out after4seconds; at most three calls run concurrently within this service. Each
acquisition's adapter has a hard18-attempt ceiling. The **fixed** account budget key
uses the existing durable `reserve_ingestion_attempt` RPC and an additional shared
18-attempt ceiling across sessions, restarts and areas. Never rotate/reset the key
to get around exhaustion. A reservation counts conservatively if a process crashes
before sending; responses report actual transport attempts, separately from reservations.

Persistent private `api_cache` holds canonical provider cache, immutable normalized
snapshots, coarse-area indices and atomic120-second acquisition leases. No new table
or global origin is introduced. In-process identical requests single-flight; another
process with an active lease returns unavailable/coalesced instead of buying again.
Warm area repeats use cache for24hours; empty/partial areas for5minutes. Explicit
Refresh respects a shared60-second cooldown, then bypasses provider cache and can spend.
Snapshots remain readable for7days; original facts' timestamps never renew on reads.
Previous area data can accompany quota/timeout/unavailable; inspect state, warnings,
metrics.stale and original source times. No real lookup substitutes demo venues.

`snapshotId` equals the immutable `datasetVersion` throughout snapshot/detail/spot
copies and recommendation response. GET `/v1/discovery/:snapshotId` returns Snapshot;
GET `/v1/discovery/:snapshotId/places/:placeId` returns SpotDetail. Both require
`Authorization: Bearer <sessionId>`. POST `/v1/recommendations` accepts the optional
Query.snapshotId with the same header; a missing/expired snapshot fails, never falls
back to the currently pinned city version. POST `/v1/assistant` uses C's shared
AssistantRequest/Response and requires sessionId in its bounded request body.

## Muse and unknown evidence

Four detail responses at most supply bounded anonymous review evidence to C's
existing `prepareDataset` / `createEvidenceExtractor` pipeline. Runtime extraction
is **cache-only** for this verification: missing extraction records produce labeled
missing inference, no paid extraction attempt. No reviewer names or raw review
objects enter public snapshots. Stable provider IDs, attributed supported photos,
source URLs, original hours/fact timestamps and unknown fields are preserved.
A review/detail retrieval time is never represented as its observation time.

When configured, the assistant mounts C's existing Muse transport; at most2 paid
submissions/process, one attempt/submission, no retry. C's separate operator smoke
has its own two-attempt bound: do not run both and claim one shared counter. B's
SerpApi smoke makes **zero** Muse calls. The verification agreement permits2 total
live Muse attempts, owned by C; do not manually submit extra requests during it.
Runtime assistant messages/responses and precise query coordinates are not persisted.
Runtime extraction does not write new AI records for new places: only existing
validated cache records can project to public facts in this phase.

## Exact local verification

From this worktree root, after private configuration:

```sh
SERVER_ENV_FILE=/Users/amoghastagi/Projects/nook-app/server/.env \
  node_modules/.bin/tsx server/src/jobs/verify-nearby.ts \
  --authorize-spend --output=/private/tmp/nook-live-nearby-verification
```

Use a new output directory; it is created exclusively before network acquisition.
The command preflights all configuration, never prints values and never increases
or resets the ledger. It acquires two explicitly named **public manual** origins
(UT campus and downtown Austin), cold then warm repeat, and writes `ut-campus.json`,
`downtown-austin.json`, `report.json`. These normalized artifacts are safe input to
C's evaluator; no device/conversation data is included. Each area plans at most8
attempts, total16 under the shared18 ceiling including any prior runtime activity.
Cache hits can reduce this actual count. It validates every detail/directory version,
scorer/recommendation parity for study/friends, zero external rerank attempts and
concurrent snapshot read isolation. The report distinguishes actual transport counts
from account ledger deltas and records durations/freshness. Missing credentials exit1
with status blocked and0attempts; missing/upstream/partial failure never passes as live
success. Synthetic automated failure tests separately cover quota, timeouts, failures,
cache fallback, multi-area concurrent acquisition and single-flight across instances.

## Existing Render release only

D merges shared contracts and C#39 before B's runtime PR. B then uses the existing
`nook-api-demo` service (`srv-dbenp18ae00c73doen00`) and Manual Deploy of reviewed
main, preserving `DATASET_PATH` and all prior immutable artifacts. Auto-deploy stays
off. First verify with runtime disabled; enable runtime only after privately configuring
the above settings on that existing service. Do not expose provider/service-role
credentials in the mobile bundle or logs. No provider acquisition in build/start.

Record exact `/health` commit, runtime/pinned dataset identities and public smoke
results after deployment. Free-tier cold starts remain; warm health before phone QA.
The local smoke above is **not** deployed-service or physical-phone acceptance.
D must test foreground permission/denial/manual fallback, changed origin, warm repeat,
scoped detail/recommendations, explicit refresh, Muse unavailable/quota and recovery
on the physical presenter phone. Rollback disables NEARBY_ENABLED on the same service;
the pinned dataset and ordinary API remain intact. No new service/schema reset.

## Reproduce automatic guest / Austin-area verification

From the repository root, with the backend and its public HTTPS tunnel running:

```sh
node --import tsx server/src/jobs/verify-austin-area.ts \
  --authorize-spend --api-base=https://YOUR_PUBLIC_API_HOST \
  --output=/tmp/new-austin-verification.json
```

Uses no access code or provider credentials. Four public named origins are tested,
with at most 48 planned provider attempts (cache can reduce this to zero) charged
to the existing shared ceiling. Reports actual calls, partial failures, warm cache,
strict café/library eligibility, shared scorer parity and top-card detail parity.
A new output path is required. The measured guest run is in
`measurements/austin-guest-public-smoke-20261025.json`; all four warm repeats made
zero provider attempts. The campus mobile-adapter smoke returned 134 candidates.
