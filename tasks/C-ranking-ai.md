# C ranking and AI assignment

Status: proposed assignment, not started by this planning task.

> Read AGENTS.md, docs/ALGORITHM.md and docs/CONTRACTS.md. I am person C on feat/ranking-ai. Verify branch and inspect any existing search source before reusing it. Own the pure TypeScript scorer, golden fixtures, Muse evidence extraction and recommendation route. Implement strict filters first, then normalized scoring, uncertainty treatment, stable ties, evidence-backed reasons and explicit relaxation proposals. Inject clock and use city timezones. Unknown facts must not satisfy strict constraints. Use the same scorer for demo and real data. Test budget/walk limits, unknown amenities/price, midnight/overnight hours, no results, bounds and scenario ordering. Next validate one real Muse request from the server, bounded JSON extraction and source-hash caching with one retry. Do not edit B's bootstrap/migrations or create another API server. Return a route export for B to mount. Report measured performance only. Defer H3 optimization and group compromise until baseline P0 passes.

## First milestones

1. By 7 p.m.: scorer over fixtures plus a deterministic test suite and request/response example.
2. By 9 p.m.: normalized real data ranks and 10 validated AI features if access succeeds.
3. By midnight: constraint, missing-data and time tests pass on the integrated contract.
4. Before recording: actual metrics and exact scope of each technical claim documented.

Review the supplied memo critically: group weights sum to 1.10; synthetic exactness does not imply exhaustive real-world discovery. Return top matches among known candidates. Do not silently widen strict constraints or infer current crowds from review counts.

## Handoff record

- Branch/commit:
- Scorer/route exports:
- Tests actually run/results:
- Model/prompt version and data mode:
- Measured latency/call counts and dataset scope:
- Remaining work and next step:
