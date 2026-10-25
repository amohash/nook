# Contract v1: docs/CONTRACTS.md

@Jeffjone (C) and @amohash (D): please review and explicitly approve contract v1 here
before B proceeds with implementation against it. Silence is not approval. This is
the durable coordination record requested by B; Messages remains the informal chat.

Normative document: [docs/CONTRACTS.md](https://github.com/amohash/nook/blob/3345efa/docs/CONTRACTS.md).
Existing Zod draft: [packages/contracts/src/index.ts](https://github.com/amohash/nook/blob/3345efa/packages/contracts/src/index.ts).
Product scope: [docs/PRD.md](https://github.com/amohash/nook/blob/3345efa/docs/PRD.md).
These links pin the merged foundation used for this review. B is on `feat/data-api`.

## Approval requested

- [ ] C / @Jeffjone approves ranking inputs, evidence/null handling, tag vocabulary,
  result/exclusion/relaxation fields and measured metrics, or lists exact objections.
- [ ] D / @amohash approves cities/list/detail/recommendation response shapes,
  fixture/API interchangeability, query defaults and error handling, or lists exact objections.
- [ ] C confirms the recommendation route export B should mount. Proposed internal
  signature: `createRecommendationHandler({snapshot, getDetail, now}): RequestHandler`
  from `server/src/routes/recommend.ts`. This is a module boundary, not a new HTTP field.

No new HTTP fields, enum values, tags or competing scorer are proposed. B's earlier
local provider/cache work is provisional and not evidence that this contract is approved.
The existing shared scorer stays C-owned; B will mount C's agreed export.

## Zod draft coverage

The foundation already contains the draft; review that single source rather than
introducing a second schema file. It covers offset-aware instants, local dates,
coordinates, evidence, intent/amenity/tag enums, Query, Spot, weekly intervals,
ranking results, recommendations, cities, snapshots, detail, health and API errors.
Query and response types are inferred from these schemas. `limit` defaults to 3;
the other Query fields stay explicit. Unknown facts use null or `unknown` exactly
as specified. Extra keys are rejected by the strict request/place objects.

Please resolve these existing foundation interpretations explicitly, without B
inventing replacements:

1. `hoursFetchedAt` is a required key but currently accepts null. The prose says
   it is required. Confirm whether null is allowed for unqueried/unknown hours,
   or whether it must always carry the source fetch time.
2. The prose describes city “dataset status”; the existing city schema has `mode`
   and `datasetVersion`, not a separate readiness field. Confirm that P0 uses this
   existing projection; city job progress remains gated P1.
3. `address` is a required string in the draft. B proposes omitting source records
   missing an address rather than inventing an address or adding a nullable field.
4. The draft's concrete `tags`, `summary`, `image`, `publicPlaceUrl`,
   `weeklyHours`, `hoursExceptions`, `typicalCrowd` and `liveObservation` spellings
   should be confirmed because some are described only in prose in the contract.

## SerpApi adapter plan — after approval

Use server-only Google Maps search and place-detail responses. First capture and
inspect one real Austin place; then expand to 20–30 deduplicated places, at least
ten with detail evidence. Planned maximum: six search calls and ten detail calls;
18-attempt ceiling includes failed calls and any deliberately authorized retry.
No network request happens on filter changes or public GET endpoints.

Normalize provider identity, title, coordinates, address, category, explicit closure
flags, price where unambiguous, rating and review count into the existing Spot fields.
Use provider identity for stable IDs, never array position or name. Preserve source
links and fetched times; use null observation time when the source doesn't supply it.
Unknown price, amenities, access, atmosphere and crowd remain unknown. Never infer
weekly hours from `open_now`, crowd from review count, or AI summaries from hand-written text.

Use a canonical private cache key containing provider parameters, geographic area,
locale and parser version, excluding credentials. Listings/details expire after 24h;
negative missing-data results expire briefly. Timeouts, 429 and 5xx aren't successes.
Deduplicate identical in-flight calls, enforce the budget, and record actual attempts
and cache hits. Spend is restricted to an explicitly authorized server-side operator
command. Cache and raw responses never become public fixture fields.

## Fixture plan — same v1 wire types

The public snapshot uses the existing `SnapshotSchema` fields:
`schemaVersion`, `cityId`, `mode`, `datasetVersion`, `fetchedAt`, `spots`.
Each detail uses `SpotDetailSchema`: `schemaVersion`, `spot`, `evidence`.
City metadata uses `CitySchema`. A local file may package these existing objects
as `{city, snapshot, details}`; that is a storage envelope, not an added endpoint.

Real Austin fixtures will use `mode: cached`, stable provider-derived IDs, versioned
capture names, source times and links. The current `fictional-austin-v1` demo stays
separate and labeled. No real capture exists yet; test provider payloads are synthetic.
Validate every artifact before publication and preserve unknown values. No raw cache,
credentials, reviewer identifiers or unattributed images enter the mobile bundle.

## Infrastructure boundaries

B recommends a paid, always-running Render Node web service for the one **prod**
environment. The user creates the account/project; B has created no host or Supabase
project. Deploy `/health` first after that handoff. Supabase migrations remain files
only until the user supplies the project ref/region and authorizes application.
The user configures `SERPAPI_API_KEY`, `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` privately in dashboards. No secret values are requested here.
City jobs/auth/social remain gated P1. D alone merges main; B alone applies migrations/deploys.
