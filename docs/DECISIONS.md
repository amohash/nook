# Space team decisions

Record actual team choices here. These starting decisions are proposals from the plan; confirm them in the kickoff and update status. Keep secrets in local/host configuration, never this file.

| Decision | Proposed default | Owner | Status |
|---|---|---|---|
| Delivery deadline | Oct 25, 2026, 8 a.m. Central | All | User requirement |
| Feature freeze | 3 a.m. Central | D | Proposed |
| Main merger | D | All | Proposed |
| DB/deployment operator | B | All | Proposed |
| Required journey | Guest onboarding → filters → ranking → detail → share/save | All | Proposed |
| Social auth and new city | Gated P1 after midnight P0 check | All | Proposed |
| Scoring baseline | Scan cached candidates, explicit constraints | C | Proposed |
| Expo SDK and phone versions | Fill after physical device smoke | D | Pending |
| Node/npm versions | Fill after scaffold | D | Pending |
| Shared contract version | 1 | B | Proposed |
| Real dataset capture/version | Fill after provider integration | B | Pending |
| Muse model successfully called | Fill after account smoke | C | Pending |
| Sponsor quota and call budget | Fill after key verification | B | Pending |
| Final repo/deployment/tag | Fill at release | D/B | Pending |

For each changed decision append: time, owner, reason, affected paths, required caller changes and rollback. Avoid editing the same status row from multiple branches.

## Runtime nearby discovery and focused assistant — October 25, 2026 (D)

The user's explicit expansion authorizes foreground nearby acquisition, measured ranking evaluation and a focused place assistant despite the original no-chat scope. General-purpose chat, background location and custom native dependencies remain outside scope.

Integration plan (agreed with B/C/A; schemas are published by B before callers):

1. Preserve existing foreground Expo location, SessionProvider, explicit API/cached-real/fictional recovery and shared scorer. Current Explore only ranks city snapshots; discovery will supply an immutable candidate snapshot. Origin remains in memory and drives both acquisition and ranking.
2. B publishes shared Zod schemas first, preserving `Query.origin` (`lat`, `lng`, `source`), `Snapshot` and `SpotDetail`. Endpoints: `POST /v1/discovery`, `GET /v1/discovery/:snapshotId`, `GET /v1/discovery/:snapshotId/places/:placeId`, existing `POST /v1/recommendations` with optional snapshot ID, and C's `POST /v1/assistant`. B owns contracts, discovery/cache/access and app mounting; C owns recommendation resolver integration, assistant implementation/Muse and measured evaluation. D owns mobile providers/session/routes and root dependencies. A owns controlled assistant components and origin presentation.
3. Acquisition covers B's explicit central Austin bounds using quantized provider search centers. Outside coverage shows an explicit unsupported message and manual Austin choice; Austin results are never labeled nearby elsewhere. Coverage bounds are inclusive latitude 30.24–30.34 and longitude −97.78–−97.70; provider centers use a 0.01 degree grid and 3000 m radius. Runtime city ID is `us-tx-austin`. Acquire all supported categories once; filter changes rerank the same candidates. Only origin changes or deliberate Refresh nearby initiate discovery. Category changes do not spend provider calls.
4. Nearby is opt-in using `EXPO_PUBLIC_NEARBY_ENABLED=1` on mobile and B's server runtime flag. Assistant is opt-in using `EXPO_PUBLIC_ASSISTANT_ENABLED=1` plus server configuration. Missing access/configuration displays an unavailable state with explicit fallback choices. Short-lived tester authorization stays in memory; no admin/provider secret in the bundle.
5. SerpApi acquisition hard limit: 18 attempts including all retries, with a shared durable account cap. Live verification in this work is limited to 18 SerpApi attempts total, owned/countable by B; D makes no extra paid calls. C owns Muse live verification: at most two attempts total including one correction if necessary. Runtime assistant budgets are enforced separately server-side. Report actual attempts, cache hits and failures; mock verification is not live verification.
6. Assistant UI receives controlled input, status, bounded display messages, place references and callbacks. D maps validated shared responses through DataProvider. Proposed preference changes show before/after and require explicit Apply; origin, identity and snapshot changes cannot be model-proposed. Conversation text and precise coordinates are neither persisted nor ordinarily logged.
7. Merge order: B shared schemas → C assistant/evaluation → B discovery runtime → A assistant UI → D mobile integration (including PR #40 layout and its route wiring together). The C/B order changed because the runtime mount imports C’s assistant. D reviews each PR and runs combined root checks and mobile export. Presenter-phone acceptance remains a separate pending gate until tested on physical Expo Go over reachable HTTPS/LAN.

Rollback: disable the two mobile flags and server paid-action flags; retain explicit city snapshot, cached-real and fictional demo paths. No schema reset or alternate scorer is introduced.

B published shared schemas at `f075304`. Tester access: `POST /v1/tester-sessions {accessCode}` returns a 30-minute `sessionId`; mobile accepts the private code at runtime, stores only the resulting token in memory, sends it in discovery/assistant bodies and as Bearer authorization on scoped reads/recommendations. No access code is bundled or saved.

D integration checkpoint: schemas #37, assistant/evaluation #39, runtime #41 and assistant UI #38 reviewed and merged in dependency order. A parallel integration of PR #40 landed its layout and base route wiring together while D runtime work continued. D preserves that integration and adds current-origin discovery, assistant, explicit status titles and stale-response protection on top. Native dependencies remain unchanged. Startup and physical-device checklist are in `docs/MOBILE-RUNTIME-ACCEPTANCE.md`. Live verification remains blocked on empty private credentials (zero attempts); device acceptance and Render operator login remain pending.
