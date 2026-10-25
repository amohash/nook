# D mobile and integration assignment

Status: list/detail and Explore filters merged through PR #2 at `d97520b`. Manual/GPS origin selection implemented on `feat/mobile-origin`; automated checks and simulated desktop browser behavior verified. Native Expo Go location/permission verification and origin milestone review/merge pending. Native bundle export is not device verification.

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

## Explore filters milestone — October 24, 2026

- Starting state: clean `feat/mobile-flow` at `4953900`; fetched origin and preserved the prior list/detail work. Continuing the existing draft PR: https://github.com/amohash/nook/pull/2. Earlier Free only/Cafés only quick chips are superseded by the Filters sheet.
- Changed files: `apps/mobile/app/index.tsx`; new D-owned `apps/mobile/src/features/explore/FiltersSheet.tsx`, `filters.ts`, `filters.test.ts`; this task file. There are no A shared components/theme files in this checkout, so the sheet reuses the existing React Native controls and palette locally. A/B/C files, dependencies, lockfile, shared contracts and fixture data are unchanged.
- Implemented: native modal bottom sheet with scrollable controls and fixed Reset/Apply footer, safe-area bottom padding, Cancel/backdrop dismissal and Android Back handler. Category multiselect (cafe/library/restaurant/park), price levels 0–4 or no cap, 5/10/15/20/30/45/60-minute estimated walk limits, Quiet/Balanced/Lively atmosphere and allowed vibe tags, Study and Meet Friends presets. Study is solo; Friends uses four people. Presets preserve strict constraints. Draft edits and Reset do not affect results until Apply; cancel discards them. Reopening shows applied values. Empty results offer exclusion counts, Edit filters and explicit Reset filters.
- Count semantics: Filters (N) counts changed groups versus visible Study defaults, once each for category, price, walk, atmosphere/vibe and intent/group. Default is zero changes, with a 15-minute estimated walk and quiet study preferences still visible. Atmosphere/vibe are labeled ranking preferences rather than strict matches, consistent with the shared contract.
- Integration point: Apply validates the existing `QuerySchema`, then Explore calls `DataProvider.recommend(query)`. The existing fixture adapter already calls C's `rankSpots(spots, query, { now: DEMO_NOW })`. No mobile scoring, local result filtering/sorting, temporary ranker, winner IDs, contract additions or model requests were introduced. Reset restores exposed filter fields while preserving origin, time and unrelated query requirements.
- Checks passed: `npm run typecheck`, `npm run lint`, `npm test` (56/56), `npm run export:mobile` (iOS/Android Hermes and web), `git diff --check`. Seven new integration tests cover preset constraint preservation, scoped reset, group counts, multi-category/price/walk eligibility through the existing provider, genuine empty/reset and atmosphere/vibe forwarding. Existing core hours/unknowns/contracts and provider tests still pass.
- Desktop verification through T3 preview: 390px-wide fixture list/detail/Back with all five filter groups applied; draft Cancel, staged Reset, Apply, reopening selections, multi-category and atmosphere/vibe changes, strict free+cafe empty state and recovery. Browser-only HTTP fault/delay controls proved zero requests during draft editing, loading after Apply, no stale cards on failure, and Retry retaining the applied free/5-minute constraints (one qualifying library). No production fixture data was altered. Programmatic Escape event dismissal was checked; native/physical keyboard dismissal remains a device/manual check.
- Limitations: phone model/OS/Expo Go version remains unrecorded. The preview disconnected during the subsequent 320px layout check (`Preview automation evaluate timed out after 15000ms`); that layout check and native safe areas, large text, Android Back and touch scrolling remain pending. No shared A visual handoff is available yet. This milestone is implemented and desktop-verified, not merged/device-verified.

### Expo Go filter verification (supersedes the earlier quick-chip steps)

1. In Mac Terminal at the repository root, start bundled fixture mode without editing ignored env files:

   ```sh
   cd /Users/amoghastagi/Projects/nook-app
   EXPO_NO_DOTENV=1 EXPO_PUBLIC_DATA_PROVIDER=fixture npm run dev:mobile
   ```

   Keep Terminal running. Connect Mac and phone to reachable shared Wi-Fi, use an Expo Go build supporting this project's SDK 57, then scan Metro's QR. Record phone/OS/Expo Go versions and the tested commit here.
2. Confirm three fictional places and Filters (0). Open Filters, select Café and Free only, then Cancel: the three original cards and Filters (0) must remain. Reopen: those draft selections must be gone.
3. Select Café and Free only again, then Apply: confirm Filters (2), zero cards, helpful No matching places text, exclusions and Edit filters. No category/price constraint may relax automatically. Open Edit filters, press Reset: the draft becomes default, while results remain empty until Apply. Apply restores three cards and Filters (0).
4. Open Filters; choose Café, $ maximum, 5 min and Meet Friends, then Apply. Confirm Filters (5), Meeting friends, the price/walk summary and only qualifying cafe cards. Open a card and use Back; applied filters and results must remain. Reopen the sheet and verify all selections persisted.
5. Change atmosphere to Balanced and add cozy; Apply and verify fit scores/results change. Add/remove Library to check category multiselect. Switch Study/Meet Friends and verify category/price/walk constraints are preserved. In the sheet press Reset, then Cancel: applied selections must survive. Reset then Apply returns to Study defaults.
6. Scroll through the entire sheet on the presenter phone, including large-text settings; Reset/Apply must remain reachable, with no bottom-home-indicator overlap. Cancel, tap outside the sheet, and Android system Back should dismiss without applying.
7. For API loading/error/Retry, use the earlier API launch instructions, replacing the quick-chip toggle with Filters → change a limit → Apply while only the API is stopped. Restart the API and Retry: the same applied constraints must be used. Fixture mode can resolve too quickly for the loading indicator to be visible; delayed requests were desktop-verified.

Next smallest step: record the physical-phone filter-sheet smoke above, then review/merge PR #2 and integrate A's supplied components when available.

## Manual/GPS origin milestone — October 24, 2026

- Starting state: clean `feat/mobile-flow` at `d743e42`. Fetched origin, confirmed PR #2 was merged, and created `feat/mobile-origin` from `origin/main` at `d97520b`. Prior milestones preserved.
- Changed files: `apps/mobile/app/index.tsx`, `apps/mobile/package.json`, `package-lock.json`; D-owned `src/features/explore/OriginControls.tsx`, `origin.ts`, `origin.test.ts`, `useOrigin.ts`, and `filters.ts`; this task file. B's contracts/data/backend, C's ranker and A-owned files are unchanged.
- Implemented: visible manual/device origin header; Use UT Austin works without any permission request; Use my location performs a single foreground lookup after the tap. Permission is requested only while undetermined, with no repeated denied-prompt loop. Disabled services, denied permission, errors and a 10-second deadline retain the selected origin and offer manual mode. Reported accuracy is shown (unknown remains unknown); fixes older than 60 seconds, invalid/future timestamps or coordinates are rejected. Accuracy worse than 1000 m is an explicit campus-demo usability guard, with a manual fallback, not a calibrated confidence estimate.
- Recovery/races: manual selection cancels pending lookup and ignores its late result; opening a detail card cancels a pending lookup. Filters/intent stay in place when changing origins. Filter Apply copies only filter fields into the current Query, so a GPS fix arriving during draft edits is preserved. Existing DataProvider/recommendation request handling remains in place.
- Coverage/honesty: device coordinates go into the existing shared Query.origin, and C's scorer recomputes distances/eligibility. No city boundary or extra scoring logic was invented. When a device-origin query has no matches, the UI offers Explore from UT Austin without relaxing filters. All current places remain fictional demo candidates and the fixed demo clock remains labeled. The app does not persist or log coordinates; API mode sends the selected origin in its existing recommendation request.
- Dependency: installed only `expo-location` using `npx expo install expo-location` from the mobile workspace; SDK resolver selected `~57.0.22` and root lockfile was updated. Uses balanced foreground accuracy and no background/watch APIs, config-plugin changes, native projects or prebuild. Web lookup requests an uncached position; the shared freshness check also guards returned fixes.
- Actual checks: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` (75/75; 19 new origin/query integration cases), `npm run build:server`, `npm run export:mobile` (iOS/Android Hermes and web), `npx expo install --check`, Expo Doctor (21/21), and `git diff --check` passed. The install still reports the existing 8 audit advisories; no unrelated dependency updates were made.
- Desktop verification: T3 browser at 390px with a temporary synthetic geolocation adapter (no real Mac location requested). Verified manual selection with zero permission/position calls, denial retaining three manual cards, a granted fix and accuracy label, first-request permission path, loading, manual cancellation and ignored late fix, coarse-accuracy fallback, actual 10-second timeout and ignored late fix, distant-location empty/manual recovery preserving filters, GPS arriving during an open filter sheet, detail/Back preservation and navigation cancellation. An initial preview snapshot timed out; retry reconnected successfully. Synthetic browser adapters are not production app fixtures and the test tab is closed at handoff.
- Not verified: real phone GPS/services/permission prompts, approximate-permission behavior, OS-specific background/resume behavior or physical layout. Underlying OS permission dialogs and one-shot native fixes cannot be forcibly cancelled; cancelled/timed-out results are ignored and further permission/fix work is stopped where possible. Native dependency alignment/export/Doctor do not prove Expo Go runtime behavior.

### Expo Go origin smoke

1. From the repository root, install the updated lockfile and launch:

   ```sh
   cd /Users/amoghastagi/Projects/nook-app
   npm ci
   EXPO_NO_DOTENV=1 EXPO_PUBLIC_DATA_PROVIDER=fixture npm run dev:mobile
   ```

   Use SDK-57-compatible Expo Go on the presenter phone, connect it and the Mac to reachable shared Wi-Fi, and scan Metro's QR. Keep Terminal running. Record tested commit, phone model/OS and Expo Go version here.
2. On launch confirm Manual origin · UT Austin campus, three fictional cards and no location prompt. Tap Use UT Austin; no permission prompt should appear. Apply Library + Free only in Filters and confirm one match.
3. Tap Use my location and deny the permission request. Confirm the location message, unchanged manual origin/filter count and the same library result. Tap Use my location again: it should explain Settings/manual mode without repeatedly prompting. Use UT Austin must remain usable.
4. Allow foreground location for Expo Go in the phone's Settings, return, and tap Use my location. Confirm the busy indicator, then Device location · one-time reading and reported/unknown accuracy. Results must rerank using this origin. Outside the campus walking range, zero results and Explore from UT Austin are expected; that action must restore the filtered manual result, not clear filters.
5. Check approximate permission or poor reception where available. A usable approximate fix shows reported accuracy; accuracy worse than 1000 m offers manual mode. With phone location services disabled, confirm a useful fallback message. A fix that does not complete should release the busy state after 10 seconds. Do not treat browser simulation as proof of these native cases.
6. While Finding location is visible, tap Use UT Austin. Wait longer than the deadline: it must remain manual. Repeat by opening a visible detail card while lookup is pending; return via Back and confirm the previous origin/filters persist. If GPS completes too quickly to reproduce a race, record that case as simulated-only rather than claiming device verification.
7. Open Filters while a location lookup is pending, make selections, then Apply after GPS completes: the newer origin must remain selected. Confirm Study/Meet Friends, Reset filters and detail/Back continue to work without changing the selected origin.
8. Record actual results and regressions before merge. The next implementation milestone after origin verification is map/list integration against the same provider results; A's component handoff and B's real-data endpoint can be integrated when available.
