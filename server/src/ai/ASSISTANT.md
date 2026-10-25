# Focused place assistant integration

B mounts `createAssistantRouter` at `POST /v1/assistant` in the existing API.
Shared schemas/types come from `@space/contracts`. B supplies the existing
server-only Muse completion, session authorization, session-owned immutable
snapshot/detail resolver, and the correct demo/server clock. A missing completion
returns unavailable without attempting a provider request. No migrations or
mobile native dependencies are required.

```ts
createAssistantRouter({
  complete, // existing createMuseProvider; undefined when META_API_KEY is unavailable
  authorizeSession, // async (sessionId) => boolean, fail closed for expired/unknown sessions
  resolveContext, // async (sessionId, snapshotId) => {snapshot, details} | null
  clock, // snapshot => {now}; labeled demo clock only for demo data
});
```

Request examples (substitute the session/snapshot/place IDs actually returned by
B; `query` is the validated current SessionProvider query):

```ts
provider.assist?.({ sessionId, snapshotId, query,
  message: 'Why this place?', placeIds: [selectedPlaceId] });
provider.assist?.({ sessionId, snapshotId, query,
  message: 'Compare these options and explain uncertainty.', placeIds: shortlistIds.slice(0, 3) });
provider.assist?.({ sessionId, snapshotId, query,
  message: 'quiet cafe under $15 within 10 minutes', placeIds: [] });
```

`AssistantResponse` contains `schemaVersion`, `requestId`, `status`, `text`,
`references: [{placeId,evidenceIds}]`, and optional `proposedQueryPatch`.
Only a user tap on Apply may merge the proposal into the current validated query
and rerank with the existing scorer. When the query/snapshot changes, discard an
older proposal and response. Compare before/after with the current query before
Apply. Neither the service nor a filter change applies patches or calls extraction.

The natural-language example can propose quietness, cafe category and a tighter
walk cap. Dollar prices cannot be derived from ordinal price levels, so the
answer explicitly says the dollar budget cannot be verified. Existing strict
constraints cannot be loosened, even by an explicit natural-language request;
use the visible filter controls for that change. Patch schemas prohibit origin,
city, snapshot identity, departure time and session duration.

HTTP 200 covers ready/empty/out_of_scope; 429 returns a structured quota response;
503 returns a structured unavailable response, including timeout text. Preserve
these validated bodies for UI mapping. Invalid requests use the standard API
error envelope: 400 invalid input/place IDs, 401 unknown/expired session, 403
snapshot inaccessible to this session, 409 incompatible query/snapshot metadata.

# Bounds and grounding

One submission makes at most one paid model attempt, with no automatic retry.
Defaults are 800 message characters, no accepted history, 3 selected places,
8-second total deadline (including auth/context), 2 simultaneous requests,
8 calls per session per 30-minute window, 100 calls per process lifetime, and
1,000 transient counter entries. The response has at most 1,600 text characters
and 3 references. B's existing tester-session/rate controls protect the endpoint;
process caps are an additional bound and reset on restart, not a distributed
billing ledger. Multiple replicas require a shared account cap before public use.

Muse receives preference fields and a server-built fact catalog, never the
query origin, departure instant, raw reviews, arbitrary client place facts or
conversation history. It selects fact IDs and optional preferences. The server
validates all IDs and renders factual text itself, so model prose cannot use a
valid citation to smuggle an unsupported claim. Requested excluded places are
explicitly labeled excluded. No general tools are exposed. Place names and user
text are untrusted prompt data. Counter state contains only session IDs, counts
and expiry; no message, coordinate, snapshot or response persistence/logging.

Existing extraction keeps source-hash/model/prompt/language caching and its
one-retry budget unchanged. Assistant requests never invoke extraction.
Evidence IDs only reference matching server details; estimated walking/score
facts may have no review IDs because they are deterministic calculations.
No answer guarantees seats, current occupancy, route duration or dollar prices.

# Verification and live reproduction

```sh
npx vitest run server/src/ai/assistant.test.ts server/src/ai/extract.test.ts
npm run typecheck
npm run lint
npm run build:server
```

The paid smoke requires a nonempty **server-only `META_API_KEY`**. The configured
main `server/.env` currently has an empty placeholder; the recorded result is
blocked with **0 external attempts**, not a successful model check. No alternate
credentials were supplied. Existing historical extraction smoke is not proof
of access for this assistant or these current credentials.

After configuring the existing server file, the approved smoke budget is **two
total attempts**, no retries. Run from C's worktree:

```sh
SERVER_ENV_FILE=/Users/amoghastagi/Projects/nook-app/server/.env \
  npx tsx server/src/ai/assistant-smoke.ts \
  fixtures/data/austin-20261025-muse-photos-v1.json \
  > server/src/ai/measurements/assistant-live-smoke.json
```

It submits two fixed, non-personal explain/preferences requests against real
normalized facts, counts actual attempts, and records statuses/references/patches
and duration without prompts, keys, device coordinates or conversation text.
Do not repeat after two actual attempts without a new agreed budget. The CLI
uses the transport/service directly; B's mounted HTTP/session path and D's
physical-phone flow still require separate verification.
