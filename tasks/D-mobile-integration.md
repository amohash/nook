# D mobile and integration assignment

Status: foundation merged at `3345efa`. First list/detail milestone implemented on `feat/mobile-flow`; automated checks and desktop browser flow verified. Presenter-phone verification and milestone review/merge pending. Remaining P0 features are outside this milestone.

> Read AGENTS.md, docs/PRD.md, docs/CONTRACTS.md and docs/EXECUTION.md. I am person D on feat/mobile-flow and the team's integration lead. Inspect the repository before scaffolding. Establish the smallest Expo Go app, root verification scripts, shared imports, a fixture DataProvider and working phone launch. Own routes, Explore map/list, filters, detail, saved places, native sharing, data adapters and demo reset. Use A's component API; do not wait for all Figma screens. Use C's scorer and B's contract rather than inventing result shapes. Implement loading/empty/error states and an explicit live/cached/demo distinction. Never call provider APIs with secret keys from the phone. Verify denied GPS/manual origin, stale request handling, estimated walk labels, save persistence, share cancel, map failure and reset. Keep the root lockfile serialized. Merge small reviewed PRs sequentially and smoke-test the combined phone flow. Freeze features at 3 a.m.; record before 6 a.m.; deliver by 8 a.m.

## First milestones

1. First 30 minutes: app on presenter phone, actual SDK recorded, root scripts and shared imports working.
2. By 7 p.m.: onboarding-to-result-to-detail fixture journey integrated with A/C.
3. By 9 p.m.: real snapshot/API adapter; first stable demo checkpoint.
4. At 3 a.m.: complete P0 only; unfinished P1 disabled; integration log saved.

If A cannot code, take onboarding with their specs and drop optional social UI. Rehearse the exact Expo Go bundle, backend, laptop and mirroring setup. A deployed API does not eliminate the need to serve the app bundle. Keep a local video fallback.

## Handoff record

Foundation handoff — October 24, 2026:

- Implemented: root npm workspace/lockfile/scripts, Expo Router + TypeScript SDK 57 shell, ten labeled fictional venues with a fixed clock, fixture/API DataProvider boundary, list/detail/loading/empty/error/Retry flow, shared Zod contracts, pure scorer and hours logic, Node fixture endpoints including `/health`. Planning docs preserved; startup commands are in `STARTER.md`.
- Verification: Node 24.11.1 / npm 11.6.2; `npm ci`, `npm run typecheck`, `npm test` (46 tests), `npm run lint`, `npm run build`, `npm run build:server`, `npm run export:mobile`; Expo alignment check and Expo Doctor 21/21. Built server health and provider parity verified. Browser fixture/API list/detail and intent/filter changes, plus injected loading/error/empty recovery checked.
- Limitations: phone model/Expo Go build unknown, no device launch or merge yet. No real data, DB, Muse, map, onboarding, persistence or sharing. `npm audit` has 8 open upstream advisories (3 moderate, 5 high) in Expo tooling/Router dependencies.
- Next smallest step: run `npm run dev:mobile` in SDK-57-compatible Expo Go on the presenter phone, record its versions, review/merge foundation, then let A/B/C branch from that commit.
- No last-known-good release tag established. Demo dataset namespace/version: `demo:` / `fictional-austin-v1`. Reset button restores default query; no persisted state exists yet.

- Branch/current integrated commit:
- Presenter phone/Expo/Node/npm versions:
- P0 flow and error states tested:
- Last known good tag:
- Demo mode/data version/reset steps:
- Remaining release blockers:

## List/detail milestone — October 24, 2026

- Branch verified: `feat/mobile-flow`, clean before work, based on merged foundation `3345efa`; `git fetch origin` confirmed no difference from `origin/main` at the start. Existing foundation preserved.
- Changed files: `apps/mobile/app/index.tsx`, `apps/mobile/app/spot/[id].tsx`, `apps/mobile/src/data/providers.ts`, `apps/mobile/src/data/providers.test.ts`, and this task file. No shared contract, scorer, theme, onboarding, backend, dependency or lockfile changes.
- Implemented: detail Back pops the existing route, preserving list filters/results, with a root replacement for direct entry without history. Missing places have a distinct message and return action; transient failures retain Retry. Detail shows unknown review count explicitly. Added a strict cafe filter and empty-state Reset filters action. Failed loads say unavailable rather than zero matches, and dataset labels/candidate counts follow response metadata.
- Ranking: existing `@space/core` `rankSpots(spots, query, { now })` is available and already used by the fixture DataProvider. No temporary scorer or ranking adapter needed. All data remains contract-validated, fictional, and labeled `demo`, version `fictional-austin-v1`, with the existing fixed clock.
- Actual checks: Node `v24.11.1`, npm `11.6.2`; `npm run typecheck`, `npm run lint`, `npm test` (49/49), `npm run build:server`, `npm run export:mobile` (iOS/Android Hermes and web), and `git diff --check` passed. No native projects or new native dependencies generated.
- Desktop browser verification: Chrome headless at 390×844; fixture list/detail, three successive Back cycles preserving filtered result cards, browser Back, strict free+cafe empty state and reset, direct-entry missing detail and return. Browser-only HTTP delay/failure injection verified list/detail loading, both error/Retry paths, absence of stale cards on failure, and an older study response ignored after newer friends results. No production fixtures were changed for fault injection. T3 preview snapshot timed out twice; alternate browser inventory was empty, so local headless Chrome was used.
- Not yet verified: physical phone model/OS/Expo Go version, native header Back/Android system Back, large fonts/safe areas and device runtime compatibility. SDK 57 is installed in the project; native bundle export does not establish Expo Go compatibility on the presenter phone. A's visual components and B's real datasets are not integrated in this slice.

### Exact Mac Terminal / Expo Go smoke

1. From the root, use the existing Node/npm versions above. If dependencies are absent, run `npm ci`. Start the fixture app without changing ignored environment files:

   ```sh
   cd /Users/amoghastagi/Projects/nook-app
   EXPO_NO_DOTENV=1 EXPO_PUBLIC_DATA_PROVIDER=fixture npm run dev:mobile
   ```

2. Keep this Terminal running and the Mac awake. Put the presenter phone and Mac on a reachable shared Wi-Fi network. Open an Expo Go build that supports SDK 57; scan the printed QR with iPhone Camera or Android Expo Go's scanner. Record phone model, OS and Expo Go version here. An SDK mismatch is a launch blocker to resolve before changing the shared SDK/lockfile.
3. Confirm the demo badge, manual UT Austin origin, fixed October 24, 2026 6 PM America/Chicago clock and three place cards. Tap a card: confirm the matching name, fictional label, summary, source timestamp and unknown rating/review count. Tap **Back to places**; verify the list returns. Repeat using the native header Back and Android system Back where applicable.
4. Choose **Meet friends**, then **Free only**. There should be two matches. Open either, return, and confirm the same two cards and active filters. Repeat three times; no stack of extra list screens should accumulate.
5. Also select **Cafés only**: confirm **No matching places**, zero cards and no silent relaxation. Tap **Reset filters**: three default matches return. Fixture loading can finish too quickly to see; delayed list/detail loading was verified in the desktop HTTP checks above.
6. To verify error/Retry on the phone, stop fixture Metro with Ctrl-C. In another root Terminal run `npm run dev:server`. Obtain the Mac's Wi-Fi IP with `ipconfig getifaddr en0` (use the active interface's address if different). Start Metro with that actual address:

   ```sh
   EXPO_NO_DOTENV=1 EXPO_PUBLIC_DATA_PROVIDER=api EXPO_PUBLIC_API_BASE_URL=http://YOUR_MAC_LAN_IP:3001 npm run dev:mobile
   ```

   Rescan/reload the new bundle. The API foundation still serves demo data. With the list visible, stop **only the API** using Ctrl-C in its Terminal. Toggle a filter: confirm **Places unavailable** and **Retry**, with no old cards. Restart `npm run dev:server`; tap **Retry** and confirm recovery. To check detail failure, stop the API while the list is visible, tap a card, then restart the API and tap detail **Retry**. Confirm **Back to places** still works. A stalled connection times out after eight seconds; do not use `localhost` as the phone's API address.
7. Stop both processes when finished. Restart with the fixture command in step 1 for this milestone's offline-data demo. Record actual device results before review/merge; the next smallest step is this physical-phone smoke, then integrating A's components.
