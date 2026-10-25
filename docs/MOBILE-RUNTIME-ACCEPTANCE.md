# Nearby discovery and Muse: integration handoff

Implemented and automatically verified. Live verification is blocked on private credentials; physical presenter-phone acceptance is pending. Browser geolocation overrides and test transports are not device or live-provider verification.

## Startup on the existing Mac and phone

Use the existing team Supabase project and its migrations; B alone applies shared migrations. In the ignored `server/.env`, fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SERPAPI_API_KEY`, and optionally `META_API_KEY`. Obtain the SerpApi key from https://serpapi.com/manage-api-key, Muse access from https://dev.meta.ai/, and the existing Supabase URL/service role key from its dashboard. Never paste credentials into chat, commit them, or use `EXPO_PUBLIC_*` for them.

Also set a private operator-selected `NEARBY_TESTER_ACCESS_CODE` of 8–128 characters. Keep the fixed account-budget key below; do not rotate it to bypass exhaustion. Existing `META_BASE_URL`/`META_MODEL` must match the account's available Muse model.

Terminal 1, after the integration is merged:

```sh
cd /Users/amoghastagi/Projects/nook-app
npm ci
DOTENV_CONFIG_PATH="$PWD/server/.env" \
DATASET_PATH="$PWD/fixtures/data/austin-20261025-muse-photos-v1.json" \
NEARBY_ENABLED=1 NEARBY_ACCOUNT_BUDGET_KEY=austin-runtime-20261025 \
npm run dev:server
```

This explicitly loads the recorded real city dataset for bootstrap. The default server dataset is fictional; nearby controls are disabled for a fictional city. Server startup fails with missing **variable names only** if required private configuration is absent. A missing Muse key leaves discovery usable and the assistant unavailable.

Terminal 2, on the same Wi-Fi as the phone:

```sh
cd /Users/amoghastagi/Projects/nook-app
space_lan_ip="$(ipconfig getifaddr en0)"
test -n "$space_lan_ip" || exit 1
EXPO_NO_DOTENV=1 EXPO_PUBLIC_DATA_PROVIDER=api \
EXPO_PUBLIC_API_BASE_URL="http://$space_lan_ip:3001" \
EXPO_PUBLIC_NEARBY_ENABLED=1 EXPO_PUBLIC_ASSISTANT_ENABLED=1 \
npm run dev:mobile -- --lan
```

If Wi-Fi uses another interface, replace `en0` with the active interface. On the phone, open `http://<Mac Wi-Fi IP>:3001/health` first and verify the intended backend is reachable. For an existing HTTPS deployment, substitute its public base URL in `EXPO_PUBLIC_API_BASE_URL`; never append tokens or query parameters. Render deployment is pending operator login/configuration; no deployment is claimed for this change.

Open SDK-57-compatible Expo Go and scan Metro's QR. Record phone model, OS and Expo Go version before acceptance. `localhost` on a phone is the phone. Keep Metro running and the Mac awake. A successful export does not establish runtime compatibility with the installed Expo Go.

In Explore, expand the places sheet and enter the private tester access code. The app clears the code after submission and retains the resulting 30-minute session only in memory. Restarting the app/server requires renewed access. Open the origin chip and tap **Use my location**, or explicitly choose **Use UT Austin**. Discovery/ranking share that selected origin. The time and origin chips expand their controls; the avatar opens Profile.

## Actual behavior and boundaries

- Central Austin only: latitude 30.24–30.34, longitude −97.78–−97.70, inclusive. Provider search uses a coarse 0.01-degree center and 3000 m radius. Out-of-coverage location shows an explicit unsupported message and no Austin recommendation cards; manual Austin remains a deliberate choice.
- One foreground fix; no background tracking. Locating, denied permission, disabled/unavailable services, 10-second GPS timeout, approximate accuracy and Retry/manual choices remain explicit. Origins are memory-only.
- Origin/access changes acquire a snapshot. Filter, intent, time and approved assistant changes rerank its cached candidates without SerpApi acquisition. Refresh nearby is deliberate, subject to the server's 60-second area cooldown, three refreshes/session and fixed account cap.
- Paid acquisition: at most four listings + four details per acquisition, no retry; all attempts share a durable 18-attempt account ceiling. Runtime extraction is cache-only. Muse assistant has two paid submissions per process for this verification; do not restart to bypass it.
- Replies, proposals, ranking, discovery and GPS results are discarded after their relevant query/origin/mode becomes stale. A late acquisition cannot replace a newer area's offline cache.
- Muse explains supplied places and can propose only shared-schema preference fields. Before/after changes require an explicit Apply and expire when the query changes. Unsupported dollar-to-price conversions and unknown facts remain explicit. Place reference buttons open matching detail and source evidence.
- API outage never silently selects fictional data. **Use cached real dataset** and **Use fictional demo data** are separate, labeled choices. The cache contains only normalized public venue data, never the selected origin, private access code, session token or conversation.
- Saved IDs/preferences remain scoped to the bootstrap city dataset namespace. Saving also retains the validated public detail snapshot locally, so new runtime places remain viewable after restart. Saved details are explicitly labeled cached, retain source timestamps and do not promise current conditions. Offline recovery separately stores the last accepted discovery snapshot, not every area.
- Native Share/Maps use public venue information. Origin coordinates never enter share text. The native map always mounts behind the new floating controls and sheet; web deliberately offers the list fallback.

## Physical-device acceptance — all pending

Record evidence and observed results, not just completion marks:

- [ ] Phone model / OS / Expo Go version / app commit / API health commit / API URL.
- [ ] Fresh onboarding: allow foreground permission; confirm selected device origin and actual nearby provider results within coverage.
- [ ] Deny permission; Retry does not repeat the OS prompt; manual origin works. Check disabled services, unavailable GPS, timeout and approximate-location labels where testable.
- [ ] Unsupported area shows coverage message and removes Austin cards. Manual Austin is visibly manual.
- [ ] Default native map fills its slot; map markers and all list cards represent the same eligible candidates. Expand/collapse/drag, map failure/list fallback, origin/time chips and Profile avatar work with safe areas and large text.
- [ ] Refresh shows actual attempts/cache hits; immediate repeat respects cooldown. Filter/intent/Now/Later changes do not acquire again. Strict filters stay selected; unknown price/hours/required amenities yield honest empty results.
- [ ] Rapid origin/filter/mode changes and a slow response never restore earlier cards or assistant proposals. Reset during GPS/fetch is safe.
- [ ] Detail facts/sources/unknowns match selected place; save/unsave survives restart in its namespace. Share opens native sheet, cancel is harmless, public maps link works and contains no origin.
- [ ] Ask explain/compare/preferences within the remaining agreed Muse budget. References open correct details. Proposal remains unapplied until Apply; Cancel leaves filters intact. Check keyboard, modal Close, native Back and safe-area behavior.
- [ ] Assistant timeout/outage/quota leaves ranked browsing usable and filters unchanged.
- [ ] Backend outage exposes Retry and explicit cached-real/fictional choices. Each choice is clearly labeled; restored API does not silently change mode.
- [ ] Rehearse on the intended HTTPS/LAN API with Expo Go and projector/mirroring; record the accepted version. No phone acceptance or deployment is currently claimed.

## Hosted API cold start

The hosted free-tier API sleeps after about 15 minutes idle. The first request then takes roughly 30 seconds (observed 32.5s for `/v1/cities`; warm requests take 0.2–0.4s). The app's first city lookup now waits up to 45 seconds and shows "Waking the server…" after 5 seconds; every other request keeps the normal 8-second deadline.

Before any rehearsal or demo, with the phone's network and the Mac awake:

- [ ] `scripts/keep-warm.sh` is running (it pings read-only dataset endpoints every 4 minutes; no provider or model calls). Check its log for `HTTP 200` and no `slow`/`FAILED` lines.
- [ ] `curl -s -m 5 https://nook-api-demo.onrender.com/v1/cities` answers instantly from the demo network, not just on the laptop's Wi-Fi.
- [ ] If the venue blocks the hosted URL, switch to the bundled fictional dataset explicitly (`EXPO_PUBLIC_DATA_PROVIDER=fixture`); do not rely on a slow cold start during a timed run.

A paid always-on plan would remove the cold start; that is a deployment decision for B and is not claimed here.

## Live verification and measured evaluation

See `server/NEARBY-OPERATIONS.md` for B's opt-in capture command and exact account ledger. C's two-attempt Muse CLI is in `server/src/ai/ASSISTANT.md`. Coordinate the two-attempt total: the operator smoke and phone submissions must not independently spend the same allowance. At handoff, new live SerpApi attempts = 0; new live Muse attempts = 0 because configured credentials were empty. No live performance/result claims are made.

C measured the actual scorer, recommendation API adapter and cached adapter on one previously recorded real 30-place snapshot: eight cases × 21 samples, 168 three-path parity comparisons passed. Campus Study/Friends/Later retained the same top three; downtown changed eligibility/order. Strict unknown-price/hours/Wi-Fi cases returned zero. Source evidence is sparse, so this does not establish ranking usefulness or optimal weights. Raw timings, components and an unfilled blinded relevance packet are in `packages/core/measurements/ASSISTANT-EVALUATION.md`; no human judgments were fabricated.

## Verification performed by D

- Root typecheck, tests, lint, server build, dedicated measurement typecheck, mobile iOS/Android/web export and diff check (see D task for final counts).
- Headless Chrome with mocked transport/recorded real snapshot: tester exchange, origin acquisition, filter cached rerank, explicit proposal Apply, deliberate refresh, unsupported overridden GPS, manual recovery, stale discovery/assistant rejection, approximate label, assistant/backend outage, explicit cached recovery and local-storage privacy.
- Combined PR #40 route browser checks: 390×844 full map slot and 140 px peek / 60% expanded sheet; time/origin controls expand, time changes, manual origin, Profile avatar navigation; 320 px width without horizontal overflow. Web uses its explicit map fallback; this does not verify native map tiles/gestures.
- T3 browser snapshot timed out twice; local headless Chrome was used. Browser test transport and geolocation override made zero live provider calls. No new native dependencies or projects were added.
