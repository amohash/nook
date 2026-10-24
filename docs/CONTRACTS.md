# Space shared implementation contracts

Freeze these before parallel feature development. B owns contract edits; C reviews ranking fields; D verifies client usability. Version 1 is a design contract to implement and validate, not an existing deployed API.

## Repository layout

```text
space/
  AGENTS.md
  CLAUDE.md
  package.json                 root npm workspaces and verification commands
  package-lock.json            one committed lockfile
  apps/mobile/
    app/                       Expo Router routes and layout — D
    src/components/            reusable visual components — A
    src/features/onboarding/   A
    src/features/preferences/  A
    src/features/explore/      D
    src/features/detail/       D
    src/features/saved/        D
    src/data/                  provider adapters and local state — D
    src/theme/                 A
    assets/                    A
  server/
    src/index.ts               bootstrap and route mounting — B
    src/routes/places.ts       B
    src/routes/recommend.ts    C
    src/providers/serpapi.ts   B
    src/providers/muse.ts      C
    src/jobs/                  B, calls C's extraction module
    src/cache/                 B
    src/ai/                    C
  packages/contracts/          schemas and shared types — B
  packages/core/               pure ranking and normalization tests — C
  fixtures/                   normalized data — B; scoring goldens — C
  supabase/migrations/         B only
  docs/                       plan, evidence and decisions
  tasks/                      one task file per owner
```

Use npm workspaces only if the initial scaffold proves shared imports on the phone and server within 30 minutes. Otherwise keep the same ownership in a single package with `mobile/`, `server/` and `shared/`; record the actual paths in AGENTS.md. Do not spend the night repairing build-system cleverness. Shared code must not import server secrets, filesystem APIs or React Native into the other runtime.

## Shared types

Implement these as Zod schemas plus inferred TypeScript types; spellings and null behavior are normative. `Instant` is an ISO 8601 timestamp including offset or Z, `LocalDate` is YYYY-MM-DD, and city timezones are IANA names.

```ts
type DatasetMode = 'live' | 'cached' | 'demo';
type FactSource = 'serpapi' | 'muse' | 'curated' | 'synthetic';
type Evidence<T> = {
  value: T | null;
  source: FactSource;
  observedAt: string | null;
  fetchedAt: string;
  confidence: number; // [0, 1], a documented heuristic
  sourceUrl?: string;
  evidenceIds?: string[];
};
type AmenityState = 'yes' | 'no' | 'unknown';
type Intent = 'study' | 'friends' | 'date' | 'cheap_eats';
type Query = {
  schemaVersion: 1;
  cityId: string;
  origin: { lat: number; lng: number; source: 'device' | 'manual' };
  departAt: string;
  sessionMinutes: number; // 15..240
  categories: string[];  // empty means any supported category
  maxWalkMinutes: number; // 5..60, estimated walking time
  maxPriceLevel: number | null; // 0..4, null means no cap
  requireOpenForSession: boolean;
  intent: Intent;
  groupSize: number; // 1..8
  targetNoise: number; // [0, 1]
  targetCrowd: number; // [0, 1]
  tagWeights: Record<string, number>;
  amenities: {
    wifi: 'ignore' | 'prefer' | 'require';
    outlets: 'ignore' | 'prefer' | 'require';
  };
  access: 'any' | 'public_only';
  limit: number; // 1..10, default 3
};
type RankingResult = {
  spotId: string;
  score: number; // 0..100, not a calibrated probability
  evidenceCoverage: number; // [0, 1]
  estimatedWalkMinutes: number;
  arrivalAt: string;
  reasons: { code: string; text: string; evidenceIds: string[] }[];
  warnings: string[];
};
```

Coordinates must be finite and within valid ranges. Reject NaN, impossible dates, oversized request bodies, unsupported enum values and excessive tag counts. Normalize tag vectors before overlap calculation. API query defaults must match app defaults. Unknown is null or the explicit `unknown` state, never 0, false or empty text pretending to be an observation.

### Normalized place

Required fields: `id`, `cityId`, `providerPlaceId`, optional `providerDataId`, `name`, `categories`, `lat`, `lng`, `timezone`, `address`, `datasetMode`, `datasetVersion`, `fetchedAt` and `status` (active, temporarily_closed, permanently_closed, unknown).

Evidence fields: `priceLevel`, `rating`, `reviewCount`, `noise`, `groupFriendly`, `wifi`, `outlets`, `publicAccess`. Add allowed vibe tags with weights, short summary, optional image with attribution and public place URL. Keep raw provider data server-side.

Opening data consists of normalized weekly intervals `{weekday: 0..6, startMinute: 0..1439, endMinute: 1..2880}` where 0 is Sunday and end may extend into the next day; exceptions by local date override weekly hours. `hoursStatus` is known/unknown and `hoursFetchedAt` is required. Explicit 24-hour openings use 0..1440. Never infer tomorrow's hours from `open_now`.

Typical crowd uses up to 168 entries `{weekday, hour: 0..23, value: number | null}` with source and fetched time. Live observation is separate: `{text, observedAt: string | null, fetchedAt, numericValue: number | null}`. Missing hour is unknown. If a provider gives only retrieval time, do not invent observation time. Detail can show “Fetched at …”. [Place results examples](https://serpapi.com/maps-place-results).

### Allowed tag vocabulary

`study`, `quiet`, `lively`, `cozy`, `date_night`, `late_night`, `group_friendly`, `outdoor`, `budget`, `live_music`, `work_friendly`, `trendy`. Changing this list requires one contract PR. Do not let UI tags, AI tags and score keys drift.

## API surface

| Endpoint | Contract | Owner |
|---|---|---|
| `GET /health` | 200 `{status:'ok', contractVersion:1, commit}`; no secrets | B |
| `GET /v1/cities` | Supported canonical IDs, names, coordinates, timezones and dataset status | B |
| `GET /v1/cities/:id/spots` | Versioned normalized snapshot, bounded max 200 records; mode and fetchedAt | B |
| `GET /v1/spots/:id` | Normalized detail + bounded evidence snippets and source links; 404 for missing ID | B |
| `POST /v1/recommendations` | Query → results with joined card fields, exclusions, relaxations and metadata | C |
| `POST /v1/cities/build` | P1 only; canonical city ID + idempotency key → 202 `{jobId,cityId,status}` | B |
| `GET /v1/jobs/:id` | Stage, counts, dataset version, status and safe error information | B |

Recommendation response: `{schemaVersion:1, requestId, mode, datasetVersion, generatedAt, results, excludedCounts, relaxations, metrics}`. Exclusion codes include `distance`, `category`, `price`, `unknown_price`, `hours`, `unknown_hours`, `amenity`, `access`, `closed`. Report one primary exclusion reason per place so totals are comprehensible. Each relaxation describes a proposed patch, count estimate if available and a label; it does not automatically modify the query.

Operational metrics include measured `rankMs`, `candidateCount`, `qualifyingCount` and actual external call/cache counts when applicable. Do not attribute ingestion calls to a cached rerank. User-facing timeouts use cached data; original responses are ignored if their request ID is stale.

All errors use `{error:{code,message,retryable},requestId}`. Use 400 for invalid input, 401/403 for authorization, 404 for unknown resource, 409 for incompatible state, 429 for limits and 503 for unavailable live service. Empty matches is 200 with `results:[]`. Do not embed an API key, raw upstream URL containing credentials or provider stack trace in errors.

## Tables and ownership

| Table | Key data and constraints | Access |
|---|---|---|
| cities | canonical ID, country/admin area, timezone, coordinates, dataset version | Client safe read through API |
| spots | unique provider identity; normalized facts; source times; city relation | Backend writes; safe read projection |
| place_evidence | spot, evidence type, bounded text, source URL and times | Backend writes; selected snippets read |
| ai_features | spot, source hash, model, prompt version, validated output | Backend writes; safe projection |
| api_cache | unique normalized request hash excluding API key; response and expiry | Server only; no client select |
| city_jobs | unique active city/version job; stage, counts, lease owner/expiry, budget | Server only; safe status endpoint |
| profiles | P1; auth user ID, username, opt-in public fields | Owner write; explicit read policy |
| follows | P1; unique follower/followee pair; reject self follow | Authenticated owner write |
| ratings | P1; unique user/spot rating; stars 1..5; allowed tags | Owner write; opt-in public feed |

Store guest preferences/saves only on-device for P0, so profiles/follows/ratings are not migration dependencies. B owns migration numbering and applying migrations. Prefer additive migrations and fixture upserts; never reset the shared database to fix a merge. Service-role usage in the API still requires explicit authorization checks for user-owned resources.

## Cache and job rules

Proposed freshness defaults: listings 24 hours, static place details 24 hours, typical crowd 7 days, live observation 5 minutes, AI output until source/prompt/model changes. Hours used for a same-day decision older than 24 hours are flagged and do not satisfy a strict open-session requirement until refreshed. These are initial product policies; adjust to provider terms, key limits and actual data freshness. Retrieving a cache entry does not reset its observation time.

Hash canonical provider parameters, locale and parser version without the API key. Include query category and geographic area; private user preferences are not part of shared place-feature caches. Do not cache 429/5xx as empty successful results. Cache negative missing-data results briefly to avoid repeated futile hydration. Single-flight identical requests to prevent duplicate calls.

Job states: queued → discovering → enriching → ready or partial or failed. Persist progress after each batch. Upsert duplicate places; use one active worker lease and recover expired leases safely. `Cancel viewing` stops client polling, not other users' shared job. Never offer a public uncapped endpoint that can spend the team's key. Tonight's city-build endpoint is restricted to signed-in team testers or run through a server-side seed command; no secret admin token in the mobile bundle.

## App provider boundary

`DataProvider` exposes `listCities`, `listSpots`, `getSpot`, `recommend` and optional `startCityBuild/getJob`. Fixture provider loads bundled snapshots and the shared scorer; API provider validates remote responses. Local saves reference stable IDs within a dataset namespace. Switching demo/live mode clears selected spot, in-flight requests and mode-specific preferences as appropriate, preventing accidental synthetic/live mixing.

Only the provider adapter knows transport details. Screen components must not fetch SerpApi, call Muse, embed fixture winner IDs or read secrets. Use the same visual components and ranking code in both modes.
