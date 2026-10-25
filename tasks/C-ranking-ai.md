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
