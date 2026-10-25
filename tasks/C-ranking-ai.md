# C ranking and AI assignment

Status: implemented and locally verified on feat/ranking-ai; live Muse validation and B/D integration remain pending. Not merged or phone-verified.

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
- Tests actually run: `npm run typecheck`, `npm test` (89 passed across six files), `npm run lint`, `npm run build:server` — all passed. The build uses the unchanged foundation bootstrap; the new router is covered by typechecking and HTTP integration tests but awaits mounting.
- Real Muse attempt status: smoke runner executed and returned `blocked` because `META_API_KEY` is absent. Actual external calls: **0**. Mocked provider tests validate JSON bounds, source references, identity, retry, deadline, cache invalidation, concurrency and error handling; they do not verify model access or real output quality.
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

Configure the ignored `server/.env` locally with `META_API_KEY` (never put it in chat or a client variable), then run from the repository root:

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

Next smallest steps: configure the server key and run the live smoke; B mounts the router and supplies persistent cache/real snapshots; D verifies both scenario flows on the presenter phone and owns the main merge.
