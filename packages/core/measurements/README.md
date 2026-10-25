# Reproducible ranking evaluation

The existing `measure.ts` / `baseline.json` remain the **synthetic** Node benchmark.
`evaluate-real.ts` adds a bounded, no-acquisition evaluation of an explicitly
selected normalized real artifact. It does not change production scoring, weights,
API contracts, datasets, or mobile code.

From the repository root, after `npm ci`:

```sh
npx tsx packages/core/measurements/evaluate-real.ts \
  fixtures/data/austin-20261025-muse-photos-v1.json \
  packages/core/measurements/real-inputs.json > /tmp/nook-real-evaluation.json
npx vitest run packages/core/measurements/evaluate-real.test.ts
npx tsc --noEmit -p packages/core/measurements/tsconfig.json
```

The recorded `real-baseline.json` uses that command and input. Dataset selected
with the C evidence-quality thread and the B/D coordination relay: photos-v1 on
main `7e67622`, SHA-256
`bae26a4d32597262f8f8cbfa4740535505b732f5a30684a921781f3c7ab1b731`.
B's final task/operations record identifies this artifact as deployed; that is
**not** a new semantic or phone acceptance. Later approved artifacts require an
explicit new command/input and separate recorded report; do not silently replace
or relabel this baseline. The regression pins the exact bytes intentionally.

## Inputs and privacy

Both positional paths are required. The input contains an explicit offset-qualified
`clock`, a full shared-contract `baseQuery`, and uniquely labeled cases with shallow
`overrides`. Every final merged query is validated by the existing `QuerySchema`.
Nested objects are replaced, not deep-merged. Changing intent alone does not
silently change tags, group size or targets; provide the whole intended scenario.
The full resolved query for each case is recorded in the output.

Only **manual public demonstration origins** are allowed, including overrides.
Device GPS queries are rejected before measurement. Do not enter personal locations
or secrets in an input file. No environment variables, credentials, hostname,
private provider cache, or raw provider payloads are read or recorded. The mobile
cache is preloaded from a public normalized bundle in memory; storage writes fail.
No provider/model transport is constructed and no dataset is published.

## What is checked and measured

- `rankSpots` is the sole scorer. The existing production recommendation router is
  mounted on ephemeral **127.0.0.1** with the supplied snapshot and injected clock.
  The existing `createApiProvider` calls it using the shared API contracts.
- The actual mobile `createRecoveryProvider` loads the same bundle and switches
  explicitly to cached mode with the same injected clock. This is the mobile code
  **running in Node**, not a device benchmark. No other backend is implemented.
- For all 21 samples of every case, direct/API/cached ranks, exact scores, evidence
  coverage, arrival times, reasons, warnings, exclusions, unapplied relaxations,
  candidate/qualifying counts, version and clock must agree. Returned spot payloads
  must match the snapshot (only the cached-mode relabel is allowed). Request IDs,
  rank timings and path-specific cache-hit counts are deliberately not compared.
- The report records raw sequential samples separately for direct scorer, loopback
  HTTP round trip, API-reported rank, cached adapter total and cached-reported rank.
  All are **local Node** measurements. Index zero is merely the first sample for
  that case/path in an already running process, not a cold process or cold server.
- Dataset raw-byte and normalized-snapshot hashes, input hash, version, explicit
  clock, runtime/OS/CPU/ICU/V8 metadata, results and source retrieval ages are saved.
  Source ages are grouped by field and original retrieval timestamp; count denotes
  fields sharing that timestamp, not independent sources. Negative ages remain
  negative if an operator chooses a clock before acquisition. Retrieval time is
  not observation time. Unknown hours have no timestamp and remain unknown.

This exercises the production router boundary with an injected loader/clock, not
the deployed bootstrap, remote database, public network, phone or native storage.
There is no phone-speed, cold-start, battery, coverage, request-savings or cost claim.
`externalCalls: 0` describes this evaluation's no-acquisition paths, not a measured
comparison with a hypothetical uncached workflow.

## Defensible scenarios in the recorded inputs

Clock: **2026-10-25T01:15:00-05:00** (America/Chicago). Study/Friends departure:
**2026-10-25T13:00:00-05:00**, 60 minutes. Later departure:
**2026-10-25T19:00:00-05:00**, 120 minutes. These are explicit future what-if
sessions, not claims about current occupancy, opening hours or seat availability.

1. **Campus manual origin**, 30.2862, -97.7394, estimated walk cap 15 minutes:
   Study, Meet Friends and Later all qualify 3/30 and return Trippy Buck Coffee
   Truck, St Benedict Coffee Company, Lucky Lab Coffee Co. in that order. The
   intent/time changes do **not** establish different real winners here.
2. **Downtown manual origin**, 30.2672, -97.7431, otherwise the same Study query:
   5/30 qualify; Cielito Lindo Cafe, Trippy Buck Coffee, Black Fox Coffee are returned.
   This demonstrates origin-dependent selection from this snapshot only. Walking
   time is an estimate, not a measured route or a claim of exhaustive city coverage.

All 30 records have unknown numeric noise, price, hours, Wi-Fi and outlets. One
has inferred group friendliness; ten have cached summaries. Those counts do not
validate every inference. The separate Muse audit's held claims remain held.
Strict campus budget <=1, full-session-open, and required-Wi-Fi cases each return
zero: 27 distance exclusions plus 3 unknown-price, unknown-hours, or amenity
exclusions respectively. Proposed relaxations are recorded but never applied.

The desired real-data quiet-versus-lively / cheap / open-later pitch is therefore
**not established**. `fictionalGoldens` is a separately labeled synthetic story:
Study selects demo 1/3/5; Friends selects demo 2/10/6 using the unchanged production
scorer. Neither those winners nor fictional evidence are substituted into real data.

## Remaining acceptance

D still needs the physical presenter-phone journey: select the exact real version,
compare these manually entered queries in API and downloaded cached modes, inspect
unknown/provenance warnings and genuine strict no-match recovery, check the later
session's local date/time, save/restart and share, and exercise network failure.
Measure phone and deployed-network latency independently if those claims are needed.
No automated scorer defect was reproduced; the new negative-control regression
ensures a changed API warning fails parity rather than producing a false success.


## Focused assistant expansion follow-up

See [ASSISTANT-EVALUATION.md](ASSISTANT-EVALUATION.md) for the separate eight-case
recorded-real evaluation, exact score-component instrumentation, raw samples,
blinded human relevance packet and reproduction commands. The original baseline
above is unchanged. New nearby acquisition, current Muse access and physical
phone acceptance remain separate unverified gates. No human relevance scores
have been collected.
