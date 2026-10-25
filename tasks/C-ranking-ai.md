# C ranking and AI assignment

Status: implemented and locally verified on feat/ranking-ai; live Muse access/extraction/cache validation passed; B/D integration remains pending. Not merged or phone-verified.

> Read AGENTS.md, docs/ALGORITHM.md and docs/CONTRACTS.md. I am person C on feat/ranking-ai. Verify branch and inspect any existing search source before reusing it. Own the pure TypeScript scorer, golden fixtures, Muse evidence extraction and recommendation route. Implement strict filters first, then normalized scoring, uncertainty treatment, stable ties, evidence-backed reasons and explicit relaxation proposals. Inject clock and use city timezones. Unknown facts must not satisfy strict constraints. Use the same scorer for demo and real data. Test budget/walk limits, unknown amenities/price, midnight/overnight hours, no results, bounds and scenario ordering. Next validate one real Muse request from the server, bounded JSON extraction and source-hash caching with one retry. Do not edit B's bootstrap/migrations or create another API server. Return a route export for B to mount. Report measured performance only. Defer H3 optimization and group compromise until baseline P0 passes.

## First milestones

1. By 7 p.m.: scorer over fixtures plus a deterministic test suite and request/response example.
2. By 9 p.m.: normalized real data ranks and 10 validated AI features if access succeeds.
3. By midnight: constraint, missing-data and time tests pass on the integrated contract.
4. Before recording: actual metrics and exact scope of each technical claim documented.

Review the supplied memo critically: group weights sum to 1.10; synthetic exactness does not imply exhaustive real-world discovery. Return top matches among known candidates. Do not silently widen strict constraints or infer current crowds from review counts.

## Handoff record

- Branch: `feat/ranking-ai`, based on foundation merge `3345efa`.
- Existing source inspected: foundation `packages/core/src/index.ts`, `hours.ts`, ranking tests, fictional fixtures, shared schemas, mobile provider boundary and server app. No `vibesearch.ts`, `sim.ts` or `hexrank.ts` exists in the tracked checkout. No H3 implementation was reconstructed.
- Changed code: `packages/core/src/{index,hours,ranking.test,golden.test}.ts`; `server/src/routes/recommend{,.test}.ts`; `server/src/providers/muse.ts`; `server/src/ai/{schema,extract,extract.test,smoke}.ts`. Benchmark runner/raw measurements live in `packages/core/measurements/`.
- Scorer export: `rankSpots(spots, query, {now})` from `@space/core`. Demo, cached and real normalized snapshots use this same function. Existing ten explicitly fictional venues serve as goldens; study order is 1,3,5 and friends order is 2,10,6, with independent exact-score and strict-constraint tests.
- Behavior: strict filters precede scoring; missing/zero-confidence price fails caps; unknown required amenities/access fail. Source confidence is capped at .7 for Muse and .9 for curated facts. Noise older than seven days becomes unknown; typical crowd uses arrival-hour venue timezone with seven-day freshness; hours use the existing 24-hour freshness policy. No live crowd inference from review counts. Null dimensions use neutral values and uncertainty penalties; weights normalize per query, not per place. Stable ties and explicit individual relaxation patches are retained.
- Hours: offset-qualified injected clock; venue IANA timezone; continuous minute coverage including overnight and DST; a dated exception overrides the entire local date, including weekly spillover. Exact session end is exclusive.
- Shared-contract compatibility note for B: `QuerySchema.partial()` fills `limit:3` when validating relaxation patches. C explicitly preserves the query's current `limit` in each patch so applying one does not silently change another preference. B can later remove that default from the partial patch schema.
- Tests actually run: `npm run typecheck`, `npm test` (100 passed across eight files after syncing main), `npm run lint`, `npm run build:server` — all passed. The build uses the unchanged foundation bootstrap; the new router is covered by typechecking and HTTP integration tests but awaits mounting.
- Real Muse validation passed with `muse-spark-1.3`: one successful extraction request took 5126.96 ms; the repeated source hit the process-local cache in 0.41 ms with zero further provider calls. Output correctly left group suitability null and outlets unknown while citing the supplied synthetic evidence for quiet/Wi-Fi claims. Raw safe result: `server/src/ai/measurements/live-smoke.json`.
- Validation history: initial two-attempt extraction exhausted its 8000 ms deadline; two small diagnostic requests returned HTTP 200 with null content/token-length termination; completion cap increased from 1500 to 4096 tokens. Successful smoke used a 30-second total budget (default extractor remains 8 seconds) and finished in 5.13 seconds. Total request attempts across this validation: 5. This is one successful sample, not a latency guarantee or real venue verification.
- Credential is configured only in ignored `server/.env` with mode 0600. Its value was removed from tracked `server/.env.example`; no key was logged or committed.
- No real recorded venue snapshot is available in this checkout. Real-data scoring smoke tests, at least ten validated real venue extractions, persistent cache integration, merge and presenter-phone P0 verification remain outstanding.
- H3 optimization and group compromise are deferred. No changes to B's bootstrap, shared schemas, migrations, root manifests or lockfile.

### B integration: route and enrichment

C exports a router, not another API server. Replace the foundation's inline recommendation handler in B's existing app with:

```ts
import { createRecommendationRouter } from './routes/recommend';
app.use('/v1/recommendations', createRecommendationRouter({
  loadSnapshot: async (cityId) => loadCachedNormalizedSnapshot(cityId), // Snapshot | null; B implements
  clock: (snapshot) => ({ now: snapshot.mode === 'demo' ? DEMO_NOW : new Date().toISOString() }),
}));
```

Mount before the existing not-found handler. The loader must return bounded, internally consistent snapshots and should enforce its storage timeout. Unknown city is 404; invalid query/body is 400; mixed modes/versions are 409; unavailable storage is 503; zero matches is 200. Reranking performs no provider requests and reports actual `rankMs`, qualifying/candidate counts and zero ingestion call/cache counts.

Use `createMuseProvider({apiKey})`, `createEvidenceExtractor({complete, cache})`, then `applyExtraction(spot, result.record)` only for a ready result. B implements `EvidenceCache.get/set` in the private persistent store; `MemoryEvidenceCache` is only process-local and bounded to 200 records. Run enrichment in B's job, never on every filter change. Cache identity includes SHA-256 of canonical sanitized source, place ID, model, prompt version and language; source changes miss the cache. A failed new extraction does not overwrite prior cached records. Output confidence is .7, and known structured/curated facts win over AI inference. `unavailable` is a labeled unknown fallback, not a fabricated summary.

Model default: `muse-spark-1.3`; fixed server endpoint `https://api.meta.ai/v1/chat/completions`; prompt `space-evidence-v1`. Inputs are one place with at most eight anonymous 500-character snippets. Importers must remove author metadata and supply known personal identifiers for redaction; generic regex redaction is not complete name detection. Reviews are untrusted data. Schema requires bounded scores, allowed unique tags, at most 25 summary words and supplied evidence IDs for claims. No batch identity ambiguity, extra keys or best-time claims are accepted. Evidence references prove provenance linkage, not semantic truth; real output still needs review. At most two provider attempts share an eight-second total budget, including cache work. Upstream error bodies and credentials are never returned.

### Live validation command

Configure the ignored `server/.env` locally with `META_API_KEY` (never put it in chat or a client variable), then run from the repository root (the smoke permits a bounded 30 seconds, while the extractor default remains 8 seconds):

```sh
npx tsx server/src/ai/smoke.ts
# Or supply an anonymous real evidence object matching SourceSchema:
npx tsx server/src/ai/smoke.ts /path/to/anonymous-source.json
```

The default smoke sends explicitly synthetic test evidence to the real server provider, validates one output, then repeats the source to verify a warm cache hit. This is a real provider-access check, not proof of real venue facts. Save/review the result before claiming success. If Muse fails, it returns unavailable after at most one retry. No secret is printed.

### Measured baseline

Run `npx tsx packages/core/measurements/measure.ts > packages/core/measurements/baseline.json` to reproduce. Raw sample timings, runtime/platform, timestamp, candidate/qualifying counts and zero external calls are recorded. Each case has one first run and twenty subsequent runs; first run does not mean a fresh process or cold upstream cache. The 200-candidate dataset repeats ten fictional fixtures with unique IDs, uses a 60-minute session and is not real city coverage. Results are local Node performance, not phone or network latency.

- 10 candidates, open-session filter False: 10 qualify; first 3.34 ms; subsequent median 2.01 ms, p95 2.42 ms.
- 10 candidates, open-session filter True: 9 qualify; first 1.89 ms; subsequent median 1.89 ms, p95 2.05 ms.
- 200 candidates, open-session filter False: 200 qualify; first 39.17 ms; subsequent median 35.99 ms, p95 37.39 ms.
- 200 candidates, open-session filter True: 180 qualify; first 36.82 ms; subsequent median 36.28 ms, p95 37.02 ms.

Next smallest steps: B mounts the router and supplies persistent cache/real snapshots; D verifies both scenario flows on the presenter phone and owns the main merge.

## Step 3 — contract coordination

Status: shared baseline verified; C accepts the implemented v1 interface. Explicit B/D confirmation is pending. Do not treat this record as their approval. No new implementation was started for this coordination step.

Verification on October 24, 2026 (America/Chicago):

- `AGENTS.md`, `docs/CONTRACTS.md` and `docs/ALGORITHM.md` exist and were reviewed. The canonical assignment is this file; `tasks/C.md` now points here to support the setup guide's filename.
- The executable contract is `packages/contracts/src/index.ts`, introduced by foundation commit `57b1225` and shared through merge `3345efa`. After fetching, `origin/main` is `d97520b`; the instructions, contract/algorithm documents, schemas and fixtures are unchanged from the foundation.
- D's merged `apps/mobile/src/data/providers.ts` imports the same Query/Recommendation/Snapshot schemas, uses `@space/core` for fixture ranking and calls `POST /v1/recommendations` for API ranking. This demonstrates implementation compatibility, not explicit team sign-off on C's newer changes.
- `docs/DECISIONS.md` still lists contract v1 as proposed. B's task file has no completed contract handoff; no `feat/data-api` remote branch or B/D T3 threads were available in this environment. Those absences do not establish whether B has work on another machine. Contact details or recorded confirmation are needed to complete coordination.
- There is one production server bootstrap, `server/src/index.ts`, with the existing Express app. C's `createRecommendationRouter` is a mountable Router with no listener; B replaces the inline foundation handler when integrating it. No second backend was created.

### Confirmation request prepared for B and D (not sent)

Please confirm the following shared baseline, or identify the exact contract changes you need before further integration:

1. **Place schema:** use `SpotSchema` from `@space/contracts`, with stable `id`/`providerPlaceId`, `cityId`, coordinates, IANA timezone, dataset mode/version and source timestamps. Facts retain nullable values and provenance/confidence. Required amenities/access need positive evidence; unknown is not yes. Weekly/exception hours, typical activity and live observations stay separate. B owns normalization, shared schemas, database, migrations and bootstrap; C consumes these types.
2. **Query fields:** retain `schemaVersion`, `cityId`, `origin`, offset-qualified `departAt`, `sessionMinutes`, `categories`, `maxWalkMinutes`, nullable `maxPriceLevel`, `requireOpenForSession`, `intent`, `groupSize`, `targetNoise`, `targetCrowd`, `tagWeights`, `amenities`, `access` and `limit`. Use the existing schema bounds and default limit 3. Category arrays match any selected category; an empty array means any supported category. No silent constraint relaxation.
3. **Response:** use `RecommendationSchema`: `schemaVersion`, `requestId`, `mode`, `datasetVersion`, `generatedAt`, joined `results`, `excludedCounts`, proposed `relaxations` and measured `metrics`. Results include the normalized `spot`, score, evidence coverage, estimated walk, arrival, reasons with evidence IDs and warnings. Zero matches is 200; errors use `ApiErrorSchema`. B mounts C's `createRecommendationRouter({loadSnapshot, clock})` at `/v1/recommendations` in the existing app. D consumes it through the existing DataProvider.
4. **Fixtures:** retain the ten explicitly fictional records in `fixtures/src/index.ts`, city `demo-austin`, version `fictional-austin-v1`, fixed `DEMO_NOW = 2026-10-24T18:00:00-05:00`, timezone `America/Chicago`. C's current goldens expect study 1/3/5 and friends 2/10/6. B supplies a separate versioned real snapshot with capture times; do not relabel synthetic data as real. C/D use the same scorer for both modes.
5. **Open interpretation checks:** confirm that a dated hours exception overrides the entire local date, including previous weekly overnight spillover. Note the current partial-query schema adds `limit:3` to relaxation patches; C preserves the original limit explicitly. B should own any schema fix. The tested Muse extraction has only synthetic input so far; B's real evidence and persistent cache adapter are still needed.

Please record B's schema/normalization confirmation and D's consumer/fixture confirmation (or objections), with the agreed commit/dataset version. The shared decisions owner can then update `docs/DECISIONS.md`; C has not edited that shared record.

- B confirmation: pending; no message delivered yet.
- D confirmation: pending; merged consumer compatibility verified, explicit response still needed.
- Next action: obtain the existing B/D contact channel or their recorded confirmation, send the request above, and record their responses before claiming Step 3 complete.

## PR handoff preparation

- Synced `feat/ranking-ai` with `origin/main` at `d97520b` via merge `b45a825`; no conflicts. D's merged filters/list/detail changes are preserved.
- Integrated checks rerun: `npm run typecheck`, `npm test` (100/100), `npm run lint`, `npm run build:server`, and `git diff --check` all passed.
- Request review from repository owner `amohash`; D retains responsibility for the main merge. B still mounts the route and supplies real data/persistent cache; presenter-phone verification and explicit B/D contract confirmation remain pending.

## Group-compromise gate — October 25, 2026

- **Status: deferred; not implemented, not phone-verified.** At approximately 02:02 CDT on October 25, the required D-recorded passing real-data P0 journey on the presenter phone is absent. `tasks/D-mobile-integration.md:263` explicitly records phone acceptance pending, and `docs/DECISIONS.md:14` leaves SDK/phone versions pending. The coordinating root thread independently confirmed that no device/OS/Expo Go/tested-commit acceptance record is available and is relaying the request through GitHub issue #3. Automated success below is not a substitute for this gate. Feature freeze is October 25, 2026 at 03:00 America/Chicago (CDT); afterward, release blockers only.
- Preserved the clean main checkout at `74c731a` without updating or discarding anyone's work. Fetched main and created a new isolated worktree at `/Users/jeffjone/.t3/scratch/nook-person-c-group-compromise`, branch `feat/group-compromise`, from `origin/main` `7e6762294a4df89809cd67775bbdfd8beba18c2e`. No existing active worktree was reused. Read AGENTS, PRD, CONTRACTS, ALGORITHM and this assignment before work.
- Scope is this task-file section only. No core, shared contract, API, mobile, root manifest, lockfile, GPS persistence or secret changes. Friends remains the existing unavailable placeholder; no optional feature is exposed. No second scorer, service, model calls, accounts or simulated joined users were added.
- Coordination: sent the gate request to the coordinating root thread and notified the parallel C real-data evaluation owner. That owner confirmed no new gate evidence and agreed on separate, uniquely headed C task sections to preserve at integration. Current approved/deployed artifact is `photos-v1` per the coordinator; the parallel evaluation/Muse audits own its current evidence assessment. Historical handoffs above do not establish current P0 blockers. No shared-file edits were attempted; no B/D typed group handoff is agreed or claimed.
- P0 assistance actually run against unchanged `7e67622`: installed the committed dependencies with `npm ci --ignore-scripts --no-audit --no-fund`; `npx vitest run packages/core server/src/routes/recommend.test.ts` passed **39 tests / 3 files**; root `npm run typecheck`, `npm test` (**333 tests / 29 files**), `npm run lint`, `npm run build:server` and `git diff --check` all passed. No failing automated release blocker was reproduced. These are local checks, not deployed-data or native-device acceptance.
- Phone checks still needed, owned by D: record presenter phone model/OS/Expo Go version, tested integrated commit, real dataset version and pass time; exercise real-data onboarding/manual origin and denied GPS, map/list/detail consistency, filters and Now/Later, source/unknown labels, save/relaunch, native sharing/cancel, no-match/error/retry, offline recovery and reset. No physical phone was exercised by this task.
- Deferred implementation checklist, not an agreed API or executable consumer example: obtain B/D approval of a core-only typed handoff and D's Friends consumer example; use two explicitly entered/labeled profiles with one shared city/origin/time/session, intersect every member's strict eligibility over the complete supplied snapshot before applying any result limit, reuse the single scorer for each member, and calculate `0.6 * mean(memberScores) + 0.4 * min(memberScores)` with deterministic ties. Explain actual tradeoffs and identify conflicting requirements for a valid empty intersection without altering inputs. Test vetoes, different ordering, ties, unknown required facts, unchanged constraints and compromise candidates outside individual top threes or `Query.limit`. None of these optional-feature tests or a phone integration pass is claimed.
- Next smallest step: D closes and records the real-data P0 phone gate. Only an explicit recorded pass before 03:00 CDT permits reconsidering F13; otherwise carry this deferral through freeze, keep UI unavailable and address confirmed P0 release blockers only. D alone reviews/merges; this branch does not merge main.
## Real-data evaluation — October 25, 2026

Status: implemented and locally verified before the 03:00 America/Chicago freeze;
not merged, not presenter-phone verified. Isolated branch `feat/real-data-evaluation`
starts at updated `origin/main` `7e67622`; the existing checkout/worktrees and all
prior work are preserved. Only new files under `packages/core/measurements` and
this uniquely headed task section change. No scorer, weights, shared contracts,
API implementation, mobile code, root manifest/lockfile, dataset or provider edits.
Preserve the separate group-compromise deferral and evidence-quality sections when
D integrates the concurrent C task-file append-only PRs.

### Artifact and coordination

- Selected with the evidence-quality peer and B/D relay: committed
  `fixtures/data/austin-20261025-muse-photos-v1.json`, version
  `austin-20261025-muse-photos-v1`, cached, 30 candidates, 10 Muse summaries.
  Raw-byte SHA-256:
  `bae26a4d32597262f8f8cbfa4740535505b732f5a30684a921781f3c7ab1b731`.
  B's final task/operations record identifies this as the deployed artifact;
  deployment is not semantic or phone acceptance. No newer approved artifact was
  confirmed for this baseline. Pending B1 `feat/cached-time-dataset` / PR #30 is
  not silently substituted; evaluate it separately if D/B approve it.
- Original coordination relay tagged B @drewsun461 and D @amohash in issue #3
  comment `6394670950`. Tested preliminary inputs and defensible limitations were
  relayed to A @zgaudin, B and D in comment `6394700193`. Final checked results are
  handed back with this PR. No shared-file edits were needed; shared decisions
  remain with their owner. No acquisition, paid calls or publication performed.
- Later evidence-quality fixes (Zod composition/deadline guards) and withheld
  inference claims are a separate PR/workstream. They do not change this pinned
  scorer/router/cached-adapter baseline or establish semantic approval.

### Reproduction and recorded scope

```sh
npx tsx packages/core/measurements/evaluate-real.ts \
  fixtures/data/austin-20261025-muse-photos-v1.json \
  packages/core/measurements/real-inputs.json > /tmp/nook-real-evaluation.json
```

`real-baseline.json` records dataset/snapshot/input hashes, retrieval ages, exact
resolved queries, ranking scores/reasons/warnings/exclusions and raw timing arrays
with OS/CPU/Node/V8/ICU metadata. The baseline was measured at
`2026-10-25T07:08:23.375Z` on local Node `v26.12.0`, Apple M4 Pro. Snapshot retrieval
is `2026-10-25T02:51:29.146Z`, age 3.3919 hours relative to the explicit evaluation
clock, not relative to measurement wall time. All individual evidence retrieval
ages remain recorded; retrieval is not observation time.

Every case has 21 sequential samples. All **147 iterations** agree across direct
`rankSpots`, the production recommendation router through loopback HTTP and the
actual mobile recovery cached adapter with the same snapshot/query/clock. This is
441 scorer invocations, not 147 total invocations. No competing scorer or API was
added. Separate timing arrays distinguish direct rank, API-reported rank, loopback
round trip, cached-reported rank and cached adapter total. All run in local Node;
none measure a phone, deployed network, cold process/server, battery or savings.
Manual public demo origins only; device GPS inputs fail before report generation.
The cache bundle is memory-only and any attempted storage write fails closed.

### Tested scenarios and truthful claims

- Clock `2026-10-25T01:15:00-05:00`; Study and Meet Friends depart
  `2026-10-25T13:00:00-05:00` for 60 minutes; Later departs
  `2026-10-25T19:00:00-05:00` for 120 minutes, all on October 25 in Chicago time.
  These are labeled future what-if sessions, not now/live observations.
- Campus manual origin `(30.2862, -97.7394)`, estimated walk cap 15 minutes:
  3 qualify, 27 distance exclusions. Study/Friends/Later all return Trippy Buck
  Coffee Truck, St Benedict Coffee Company, Lucky Lab Coffee Co. in that order.
  Do not pitch this as different real Study/Friends winners or open-later proof.
- Downtown manual origin `(30.2672, -97.7431)`, otherwise the same Study query:
  5 qualify, 25 distance exclusions; Cielito Lindo Cafe, Trippy Buck Coffee,
  Black Fox Coffee are returned. This and campus are truthful origin-dependent
  shortlist scenarios, not claims of measured routes or complete city coverage.
- All 30 records have unknown numeric noise, price, hours, Wi-Fi and outlets;
  just one has inferred group friendliness. Strict campus price <=1, full-session
  opening, and required Wi-Fi each yield zero, with 27 distance exclusions plus
  3 unknown-price / unknown-hours / amenity exclusions respectively. No constraints
  are relaxed automatically. The quiet/cheap/open-later real-data story is not
  established. Existing inference holds remain held regardless of deployment.
- Separately labeled **fictional** goldens retain unchanged Study demo 1/3/5 and
  Friends demo 2/10/6. Neither fictional facts nor hard-coded real winners are
  substituted into the dataset. No production scorer failure was reproduced;
  regressions cover real outcomes, unknown strict constraints, stable synthetic
  ties, GPS/clock/query validation and an API-warning parity negative control.

### Actual checks and remaining phone gate

- Focused measurement/core/router/recovery tests: **61 passed / 5 files**.
- Root `npm test`: **339 passed / 30 files**.
- Root `npm run typecheck`, `npm run lint`, `npm run build:server`, dedicated
  `npx tsc --noEmit -p packages/core/measurements/tsconfig.json`, and
  `git diff --check`: passed. The first dedicated typecheck needed JSX configured
  for the transitive mobile types; initial lint found one unused import. Both
  evaluator-only issues were corrected and their checks rerun successfully.
- Existing root dependency manifests/lockfile are unchanged. Physical phone,
  native storage, public-network parity/latency and provider/model acquisition
  were not tested or claimed by this command.
- D owns merge and still needs presenter-phone API/downloaded-cache comparison
  for these exact manual queries/version, source/unknown labels, Later local
  time, strict empty-state recovery, save/restart/share and network loss. Any
  phone or deployed-network performance claim needs its own measurement. After
  03:00 only release-blocking fixes, not unfinished P1 work, should continue.
