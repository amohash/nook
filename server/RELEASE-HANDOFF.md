# Backend release operator record — October 25

## Verified baseline; final deployment pending review

The existing Render Free service remains `srv-dbenp18ae00c73doen00`,
https://nook-api-demo.onrender.com. At 07:08 UTC its health SHA was
`cc8f7aabebd4d19cba2d5c3fad6bbc21272e02a8`, not current reviewed main
`7e6762294a4df89809cd67775bbdfd8beba18c2e`. No deployment or active dataset
setting was changed in this verification. Auto-deployment remains off.

Selected live artifact: `austin-20261025-muse-photos-v1`, `us-tx-austin`,
`cached`; byte SHA-256
`bae26a4d32597262f8f8cbfa4740535505b732f5a30684a921781f3c7ab1b731`.
The full public snapshot and all 30 details exactly match the committed artifact,
including source timestamps. All 30 image URLs returned nonempty image responses;
ten real Muse summaries remain. These are HTTP checks, not native image checks.

Nine public recommendation queries matched the shared scorer exactly. Strict
price, Wi-Fi, outlets, public access and open-session requests returned honest
empty results against this baseline's unsupported facts. All nine reported
`externalCalls=0`, `cacheHits=0`; public reranking imports no acquisition/model
transport. These metrics do not count ingestion or generic HTTP/cache reads.

Raw measured public results: `measurements/release-baseline-20261025.json`.
Warm health: 80.21 ms; snapshot: 105.74 ms; 30 detail requests: 55.64–151.92 ms.
Initial health: 213.41 ms, **idle state unknown**. A Render idle cold wake has not
been measured; do not label that initial request cold or claim a latency guarantee.

Local built-process startup/recovery measurements are separately retained in
`measurements/local-recovery-20261025.json`: startup 189.28 ms, first health
18.78 ms, warm health 1.40 ms. Stopping that local process caused connection
failure; restarting restored health. The live Render service was not stopped.
These measurements establish neither phone recovery nor Render wake latency.

## Privacy and attempts

On the existing Supabase project `nntbhzrhvqgvmwrmorhe`, reran the unchanged
`supabase/tests/private_access.sql` in the SQL editor: success, no rows returned.
It checks RLS and denied client privileges on seven tables and two RPCs for both
`anon` and `authenticated`. A separate rolled-back transaction switched to each
role and attempted `SELECT 1 ... LIMIT 1` and `DELETE ... WHERE FALSE` on every
table: all 28 operations raised insufficient privilege. No private rows were
returned, no data changed, and no migration or schema reset ran. Privilege denial
is the first protection here; this does not claim a new accounts/cross-user feature.

B3 verification makes zero SerpApi or model requests and reserves no ingestion
attempts. B2 reports the existing `austin-20261025-v1` ledger at 16/18 after three
first attempts (no retries); this is B2's acquisition accounting, not a new B3
measurement or a fresh budget. Render serves a committed normalized artifact
without Supabase/provider/model runtime credentials. Private operator configuration
remains separate; do not upload it to Render or mobile.

## Review and deployment gates

B1 PR #30 prepares `austin-20261025-muse-photos-time-v1`. B2 PR #31 prepares
`austin-20261025-muse-coverage-v1` (53 places, 49 known hours, 53 photos and ten
retained Muse summaries). Both preserve earlier artifacts; neither is approval
to alter the active service. B3 independently confirmed preservation of all
original IDs, summary objects, photos and place fetch timestamps in B2's candidate.
Candidate byte hash at audit:
`2cd72d2fe23fbaf2759bbc6f4c0377a33371f8ca52da18064e643922adbc9371`.

D must review/merge the data changes and select the final artifact. C's unresolved
legacy `outdoor` tag and privacy/source-hash/citation provenance objections are
recorded on contract issue #3. This verification does not approve them. Do not
rewrite a published version or silently relabel edited sources as original Muse
output. If enrichment is unavailable, use an explicitly reviewed honest artifact
with its limitations; do not block P0 on optional enrichment or invent facts.

After approval, B3 manually deploys reviewed **main** on the same service, sets
`DATASET_PATH=../fixtures/data/<selected-reviewed-version>.json`, and records the
exact deploy ID, health SHA and artifact hash. Keep all earlier artifacts and
Render deploy history. Existing rollback path is
`../fixtures/data/austin-20261025-muse-photos-v1.json`; earlier Muse-only/base
snapshots also remain. Restoring a prior code deploy requires its compatible
dataset path. No ingestion or migration belongs in the deploy command.

Repeat the read-only audit from repository root:

```sh
node_modules/.bin/tsx server/src/jobs/verify-demo-release.ts \
  --base=https://nook-api-demo.onrender.com \
  --dataset=fixtures/data/<selected-reviewed-version>.json \
  --commit=<exact-reviewed-main-sha> \
  --report=/tmp/nook-final-release.json
```

The verifier fails on health/artifact/detail/scorer mismatch, unsupported strict
matches, external rerank calls or broken image HTTP responses. Open-session
results are checked against the shared scorer: reconstructed supported hours may
legitimately match; unknown/stale hours must not pass. The script is deliberately
read-only and creates only the explicitly requested local measurement report.

## D presenter-phone acceptance still required

Use `EXPO_PUBLIC_DATA_PROVIDER=api` and
`EXPO_PUBLIC_API_BASE_URL=https://nook-api-demo.onrender.com`; restart Metro after
changing public settings. Warm `/health` until it returns the expected SHA, then
verify the displayed city/version/mode. Render Free can sleep after inactivity;
warmup and Retry remain part of rehearsal. Do not show fictional fallback as real.

On the actual presenter phone, verify manual/GPS-denied origin, loading/error/empty
states, map/list/detail parity, photos and an enriched detail with source labels.
Exercise category filters and Now/Later/overnight sessions without inventing price,
amenity, access or live crowd evidence. Explicitly test stopped/unreachable API
recovery, retained cached results, reconnect/Retry and latest-request behavior.
Coordinate outage simulation locally with D; do not stop the shared hosted API.
Record phone model, OS, Expo Go version, commit, artifact and actual outcomes.
None of these native behaviors is marked verified by this HTTP audit.

## Checks run on B3 baseline

On main base `7e67622` plus the read-only verifier: 333 tests across 29 files,
workspace typecheck, lint, server build and diff whitespace check passed.
Root manifests/lockfile and other worktrees remain untouched. B1/B2 task sections
must be retained when D merges the independent append-only B3 status section.
