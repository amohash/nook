# Recommendation evaluation for the place assistant expansion

Implemented and automatically checked; live acquisition/model access and
physical-phone acceptance remain unverified for this change.

## Reproduction and inputs

```sh
npx tsx packages/core/measurements/evaluate-real.ts \
  fixtures/data/austin-20261025-muse-photos-v1.json \
  packages/core/measurements/assistant-eval-inputs.json \
  > packages/core/measurements/assistant-eval-results.json
npx tsx packages/core/measurements/human-rubric.ts \
  packages/core/measurements/assistant-eval-results.json \
  fixtures/data/austin-20261025-muse-photos-v1.json \
  packages/core/measurements/human-relevance
npx vitest run packages/core/src packages/core/measurements/evaluate-real.test.ts \
  server/src/routes/recommend.test.ts server/src/ai/assistant.test.ts
npx tsc --noEmit -p packages/core/measurements/tsconfig.json
```

This run uses the **previously recorded real SerpApi snapshot**, 30 places,
version `austin-20261025-muse-photos-v1`, byte hash
`bae26a4d32597262f8f8cbfa4740535505b732f5a30684a921781f3c7ab1b731`.
It is not new nearby discovery or a multi-origin acquisition experiment.
B is responsible for new acquisitions and the account-wide 18-attempt live
budget. At this report's creation no new B capture was available. The new
assistant smoke could not call Muse because `META_API_KEY` is an empty placeholder.
There were **zero external calls/retries** in C's evaluation and smoke.

Clock is explicitly `2026-10-25T02:40:00-05:00`; future sessions depart at 13:00
or 19:00 America/Chicago. Campus (30.2862,-97.7394) and downtown
(30.2672,-97.7431) are public manual demonstration origins. No personal GPS is
recorded. Inputs, dataset hashes, runtime details and all timing samples are in
`assistant-eval-results.json`. The older `real-baseline.json` is unchanged.

## Actual correctness and parity results

Eight cases each ran 21 sequential samples through the **same `rankSpots`**,
the existing production recommendation router + actual API adapter over loopback,
and the existing mobile recovery/cached adapter running in Node. All **168
three-path comparisons** passed, including exact scores, order, reasons,
warnings, exclusion counts, unapplied relaxations, version, clock and joined
places. This tests the injected router boundary; B's mounted session middleware,
deployment, actual native storage and device CPU are separate checks.

- Campus Study, 15-minute walk: **3/30 eligible**, 27 distance exclusions. Top
  three: Trippy Buck Coffee Truck; St Benedict Coffee Company; Lucky Lab Coffee Co.
- Campus 10-minute cap: **3/30 eligible**, same three. A tighter constraint does
  not require a different winner when all current winners remain within it.
- Campus Friends (group 4, lively/group tags, target noise .7/crowd .6): **3/30**,
  same three. Scores/components change; this dataset does not establish a more
  useful friends ranking.
- Campus Later (19:00, 120 minutes): **3/30**, same three; arrival instants change.
  Hours remain unknown, and no current occupancy/seat claim is made.
- Campus strict price level <=1, open-for-full-session, required Wi-Fi: **0/30**
  in each respective case. Each has 27 distance exclusions and 3 unknown-price,
  unknown-hours, or amenity exclusions. Proposed relaxations remain unapplied.
- Downtown Study: **5/30 eligible**, 25 distance exclusions. Top three: Cielito
  Lindo Cafe; Trippy Buck Coffee; Black Fox Coffee. Origin changes distances and
  eligibility within this fixed candidate pool; it does not prove city coverage.

The optional diagnostic callback records normalized weights, feature values,
confidence, weighted contributions, base score, evidence coverage, uncertainty
penalty and final score for **every eligible candidate** directly inside the
production calculation. It neither changes response schemas nor implements
another scorer. A regression reconstructs the score/coverage and verifies that
excluded candidates are never scored and instrumentation leaves ranking unchanged.

Local Node scorer medians in this run span approximately **0.718–0.784 ms** over
30 candidates. The direct path includes diagnostic collection overhead. Raw
loopback/cached path samples are reported separately. These are warm-process
local measurements, not phone, network, cold-start, battery or savings claims.
No parameter tuning or hardcoded winner selection was performed.

The actual source coverage limits usefulness: **0 known prices, 0 numeric noise,
0 known hours, 0 Wi-Fi, 0 outlets; 1 inferred group-friendliness and 10 summaries**.
Unknown evidence stays neutral with uncertainty in scoring and cannot satisfy
strict constraints. These measurements do not establish optimal weights or
validate the separate held Muse extraction claims.

Existing/new regression coverage includes strict filter boundaries and unknowns,
normalized query weights, missing-rating prior, stable ties/deduplication, clock
injection, local timezone/overnight/holiday/DST intervals, stale/future-fetched
hours, future queries ignoring live-only crowd, score bounds, source-backed
reasons, and API parity negative controls.

## Blinded human relevance study: prepared, not conducted

`human-relevance-packet.json` contains real shortlists in deterministic shuffled
order. It hides scorer rank, fit score, scoring weights and algorithm identity.
`human-relevance-coordinator-key.json` maps options to original ranks; keep it
away from judges until their answers are locked. Null fields are unmeasured;
**no human judgments have been collected or invented**.

Ask 2–3 consenting people who actually study or meet friends near these public
origins to assess each option independently before discussing it. Relevance is
0 unsuitable / 1 weak / 2 plausible / 3 strong. Also record confidence, missing
facts, whether the shortlist is sufficient and whether they would choose any
option. Give the query and same source facts/links to each judge; do not show
fit scores or suggest a preferred answer. Missing prices/hours/atmosphere may
correctly lead to low confidence or no choice. Empty strict cases should be
reviewed separately for whether the explanation makes the missing facts clear.

After collection, report count and per-judge ratings, median top-three relevance,
choice rate, missing-evidence themes and disagreements. Separate this usefulness
study from already passing correctness/parity tests. A convenience sample this
small cannot establish population preference or prove the weights optimal.

## Remaining gates

1. If credentials become available, B captures bounded cold/warm and changed-area
   real snapshots. Rerun this evaluator on each immutable normalized artifact
   with matching public manual origin/clock inputs and preserve each report.
2. Run the approved two-attempt Muse smoke once with actual credentials. Preserve
   unsuccessful outcomes too; historical smoke and mocks are not current access.
3. D checks the mounted API/session path, uses the phone's foreground origin,
   compares identical API/cached inputs, submits explain/compare/preferences,
   reviews an unapplied patch, deliberately Applies it, and checks quota/offline
   recovery, source/unknown labels and no available-seat claims on a physical phone.
