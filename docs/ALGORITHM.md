# Space recommendation algorithm

## Recommended implementation

Implement a pure TypeScript function that filters and ranks a bounded, cached place dataset. Use the same function in fixture mode and on the backend; a shared package can also rerank the already-downloaded dataset on the phone. External data acquisition and AI extraction must sit outside this function.

For 20–200 places, scanning and sorting is simpler and cheap: O(n × f + n log n), where f is the small number of features. This returns the best ranked matches **among the known candidates under this scoring model**. It does not establish the best places in the whole city or guarantee real-world conditions.

The supplied `vibesearch.ts`, `sim.ts` and `hexrank.ts` were described in the memo but were not attached. Reuse them only after C inspects the actual code, checks provenance and verifies the tests. Do not spend tonight reconstructing an entire H3 search engine from the summary.

## Inputs and normalization

`rankSpots(spots, query, clock)` returns ranked results, exclusion counts and explicit relaxation options. Inject time rather than reading `Date.now()` throughout the scorer. Every query has an origin, intended departure instant, session duration, categories, estimated walk cap, optional price cap, intent, group size, atmosphere preferences and amenity requirements. The selected city supplies an IANA timezone.

1. Deduplicate by stable provider place ID. Drop invalid coordinates; reject nonfinite values. Preserve original source IDs and normalized feature evidence.
2. Compute straight-line distance with Haversine. Tonight's estimate is `walkMinutes = ceil(distanceMeters × 1.3 / 80)`. The factor 1.3 is an explicit heuristic for route detours, not a verified routing result. The UI must say “estimated walk.” A map route is needed for actual travel-time guarantees.
3. `arrivalAt = departAt + walkMinutes`; `sessionEnd = arrivalAt + durationMinutes`. Use the venue's local timezone for hours lookup. Keep overnight intervals as real dated intervals; include the previous day's interval that continues past midnight.
4. Normalize numeric features to [0,1]. Null is unknown, not zero. Keep category, hours, price and amenity evidence separate from inferred atmosphere.

## Strict eligibility before scoring

Reject known permanent closures and places outside selected categories or the estimated walk cap. Apply the optional maximum price: a known over-cap price fails; unknown price fails when a strict cap exists. If “Open for my session” is on, the union of known opening intervals must cover the full arrival-to-end interval. Unknown or unparseable hours do not pass that constraint.

An amenity marked `required` must have positive evidence at the accepted confidence threshold; unknown does not pass. For tonight use `confidence >= 0.7` as an initial engineering threshold, not a calibrated probability. Prefer a structured provider fact over an AI inference. Wi-Fi/outlets marked `preferred` influence rank but do not exclude. A strict access requirement must also have supporting evidence; “group-friendly” never promises available seating or a reservation.

Do not automatically relax a price cap, walk cap, required amenity or category. Return actions such as “Try a 20-minute estimated walk” and apply only the one the user chooses. Return fewer than three places honestly.

## Feature definitions

| Feature | Definition |
|---|---|
| Proximity P | `clamp01(1 - walkMinutes / maxWalkMinutes)`; walk cap must be positive |
| Atmosphere A | `0.6 × (1 - abs(noise - targetNoise)) + 0.4 × (1 - abs(crowd - targetCrowd))` using separately sourced noise and crowd |
| Vibe V | Weighted Jaccard of user and place tag vectors: `sum(min(u[t],p[t])) / sum(max(u[t],p[t]))`; null if both have no tags |
| Quality Q | Bayesian rating estimate: `(n*r + 20*4.0)/(n+20)/5`; r is stars, n is review count; the prior is a tunable assumption |
| Affordability B | Known price level 0–4: `1 - priceLevel/4`; 0 means explicitly free, never missing |
| Amenities M | Weighted average of preferred amenity satisfaction; positive=1, negative=0, unknown handled below |
| Group suitability G | Evidence-based group-friendly score; unknown handled below; solo weight remains small |

Historical popular times are relative to a venue's own weekly peak, not absolute crowd size or seat availability. Label them “Typical activity at this time.” Do not rank “100 at venue A” as more people than “50 at venue B.” The crowd-match feature is an atmosphere heuristic and must be described that way. [Google's explanation](https://support.google.com/business/answer/6263531?hl=en-GB).

Use historical crowd at the arrival hour for what-if queries. A fresh numerical live observation may influence a Now query if the source actually provides it; textual `live_hash.info` stays text and does not become an invented percentage. For tonight, the safer default is historical crowd in scoring plus a separate live text badge. Without historical data, crowd is unknown. Missing review text cannot establish quietness, Wi-Fi or outlets.

## Weights and uncertainty

| Mode | P | A | V | Q | B | M | G | Sum |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Solo study | .20 | .30 | .15 | .10 | .10 | .10 | .05 | 1.00 |
| Meet friends | .15 | .15 | .15 | .10 | .10 | .10 | .25 | 1.00 |

These weights are design choices to tune with the team. They are not learned or proven optimal. Date night can reuse the group mode with different tag preferences; Cheap eats uses food categories and a user-approved cap. Delay separate weight presets until the two required scenarios pass.

When a dimension is irrelevant to the query, remove it and renormalize the remaining weights once. For example, no preferred amenities means remove M. **Do not renormalize per place because that can reward missing evidence.** For an unknown feature use value 0.5 with confidence 0. For known/inferred features retain a confidence c in [0,1]. For composite A, compute its value from its subfeatures with 0.5 placeholders and its confidence as the same 0.6/0.4 weighted average; M uses the user's preference weights. If no rating exists, Q uses its prior with confidence 0.

```text
base = sum(weight[j] * featureValue[j])
uncertainty = sum(weight[j] * (1 - confidence[j]))
score = 100 * clamp01(base - 0.10 * uncertainty)
```

Start structured fresh facts at confidence 1, curated verified evidence at 0.9, and accepted AI-inferred atmosphere at at most 0.7. Degrade by age where freshness matters. These are transparent heuristics. Display “Fit score 82/100,” never “82% probability you'll like it.” For clarity, optionally use High/Medium/Limited evidence instead of a second percentage. Sort by unrounded score descending, then evidence coverage descending, estimated walk ascending, then stable ID.

### Worked example

For solo weights, place A has P=.8, A=.9, V=.8, Q=.8, B=.75, M=1, G=.5. Its base is .83, so with complete evidence its score is 83. A closer place B with P=1, A=.4, V=.6, Q=.9, B=.75, M=1, G=.8 scores 71.5. Quiet atmosphere outweighs a small distance advantage. If A exceeds the user's price cap, it is excluded regardless of its score.

Explain with the two or three most relevant satisfied criteria and their actual values: “About 8 min walk,” “Within your $ budget,” “Reviews suggest a quiet atmosphere.” Reasons must not imply unknown facts. A counterfactual like “B is closer, but reviews suggest a louder atmosphere” is a cheap, useful detail if both claims have evidence.

## Optional group compromise

For two manually chosen member preference profiles, intersect all strict constraints and compute each member's normalized score. Then use `groupScore = 0.6 × mean(memberScores) + 0.4 × min(memberScores)`. Show each member's fit and the tradeoff. This discourages one member's very poor fit from being hidden by the average. If the intersection is empty, show which members' requirements conflict and ask which one to change. Sample profiles are labeled samples; real teammate preferences can be entered manually with consent.

Do not add diversity bonuses to the core top-three score and still call it the exact top three. If desired, show a separate “Different option” card within five fit points, with a different category. A calmer alternative is a separate transparent suggestion, not a secretly substituted winner.

## AI extraction contract

Muse's job is to extract atmosphere evidence once per version of source content. It does not decide who wins for every user query. Call a verified standard model from the server, such as `muse-spark-1.3`, with the documented base URL `https://api.meta.ai/v1`; confirm the team's key can access it. [Meta overview](https://dev.meta.ai/docs/overview).

Send bounded evidence snippets, structured highlights and category. Require an object containing placeId, allowed tags, at most 25 summary words, optional 0–1 noise/group scores, amenity states and evidence IDs. Instruct the model to abstain with null when evidence is insufficient. “Best time” must be omitted unless actual time evidence supports it. Strip personal identifiers from review input. For batches, validate every returned ID against requested IDs and reject duplicates or extra places.

Validate with Zod; limit text lengths and ranges. One correction retry within a total budget; otherwise preserve the prior valid output or mark inference unavailable. Store model, prompt version, input hash and generation time. Cache key includes the model, prompt version, source hash and language. No source change means no new extraction. Place detail explains that atmosphere is inferred from reviews and can change.

## Bounded enrichment after P0

For a new area, list only relevant categories; cache and deduplicate. Score known candidates, then enrich a small shortlist or candidates whose unknown fields might improve selection. Set a hard per-build budget and deadline. Recompute when enrichment arrives without losing user selection. Unknown facts remain unknown if the budget runs out.

Default optional city budget: 4 listing calls + at most 12 place-detail calls + 2 review calls, **18 external calls maximum including retries**. Reserve two of those 18 for retries by planning no more than 16 first attempts. Use at most three concurrent provider calls, plus a global account budget. Another page consumes the same budget. Query categories and counts are limits, not promised coverage. Verify actual credit accounting against the sponsor key. [SerpApi search documentation](https://serpapi.com/google-maps-api).

Illustrative economics: 4 discovery calls + 12 details + 2 review calls versus 4 + 80 + 80 for eagerly detailing and reviewing 80 known candidates is 18 versus 164 request attempts. This is an analytical example, **not a measured comparison of equivalent coverage or quality**, and the 18-call example includes the full budget rather than a guaranteed allocation. In the demo, prefer actual requests used and cache hits, with no naive-baseline headline unless measured fairly.

## Review of the supplied H3 best-first search

The idea of fetching details only when they can change a ranking is useful. The supplied guarantee does not transfer directly to real SerpApi retrieval:

- A cell fetch does not enumerate every place in that cell. Results are paginated and can fall outside the requested geographic window. A distance bound for a cell cannot safely bound every item that the API might return for that cell. [SerpApi geographic caveat](https://serpapi.com/google-maps-api).
- Empirical category priors are not admissible upper bounds unless every possible real feature fits them. A type prior can prune the true winner.
- Hydration reveals a feature estimate, not exact truth about noise, amenities or future crowd. Missing popular times and AI uncertainty remain after hydration.
- The supplied collaboration weights add to **1.10**, not 1.00. Normalize before comparing scores or epsilon tolerances. Solo weights sum to 1.00.
- The simulator's exact-match results depend on its own coverage and prior assumptions. They validate that simulated setup only. Neither a 100% top-k claim nor a savings claim should be presented as a measured Austin outcome.
- Epsilon termination can bound score loss only if the remaining upper bounds are valid. It does not guarantee identical top-k sets. Subsequent diversity reordering optimizes a different objective.
- A 58-credit average request is still too expensive for repeatedly changing filters. Shared cached features should carry most queries.

For a future bounded-candidate optimizer, use `UB = sum(known weighted values) + sum(unknown weights)` as a deliberately conservative score upper bound before the nonnegative uncertainty penalty. A valid stopping condition also needs a lower bound for the selected kth item and completeness of the candidate pool. Present it as branch-and-bound over a known snapshot, not “A* guarantees the best places in a city.” H3 can organize cache coverage without making a completeness claim.

## Minimum tests

Write focused deterministic tests for: strict constraints; unknown price and required amenities; overnight hours and timezone; no results; score bounds and weight normalization; stable ties; no-rating behavior; same fixture ranks on client/server; future queries exclude live-only evidence; and two scenarios that genuinely change ordering. Use 8–12 fictional golden places for exact assertions and a separate recorded real dataset for smoke tests.

Measure on actual code and save raw results: candidate count, qualifying count, rank time, provider attempts, cache hits, cold/warm duration and failures. If the H3 code is available, compare it against a full scan of **the same fixed candidate snapshot**, disclose missing external coverage, and record top-one/top-three agreement and score regret. No fabricated performance counter is acceptable.
