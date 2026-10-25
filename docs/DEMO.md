# Nook demo pack — A

Audited October 25, 2026 against freshly fetched `origin/main` **7e67622** (offline recovery #25 merged). This replaces the planned three-minute pitch. “Implemented” below does not establish presenter-phone acceptance: native maps, GPS, storage, Share/Cancel, SDK compatibility and layout still require D's device check. README/STARTER and older task entries describe earlier foundations and can lag main.

## Honest feature list

**Live** means a working interaction/computation, not fresh venue data. **Cached** means previously captured/generated real information. **Demo data** means fictional/synthetic. **Mocked** means placeholder/preview. **Not built** means absent from the working product journey.

| User-facing feature | Status | Code-supported behavior and limits |
| --- | --- | --- |
| Logo, guest onboarding, Back, Skip | Live | Welcome → study style → location; no account. Back retains drafts; step-two Skip discards edits. Incomplete onboarding restarts at Welcome after relaunch. |
| Study style, intent, budget, walking limit | Live | Supported choices feed the shared Query and local settings. No price cap or strict price levels; estimated walk 5–60 min. |
| Coffee nearby / Whiteboards choices | Mocked | Explicitly saved-only; no matching/ranking effect. Open late is a soft vibe, not verified hours. |
| Manual origin | Live | UT Austin main campus only, not arbitrary-address entry; no permission request. |
| Optional GPS | Live | One foreground fix after a tap; denied/timeout/manual recovery. Coordinates stay in memory, enter API ranking requests, and are not persisted. No background tracking. |
| Ranked list / fit scores / explanations | Live | Default top three among known eligible candidates; one deterministic scorer. Fit is not a probability or an exhaustive city result. |
| Study vs Meet Friends | Live | Changes targets, tags, scoring weights and group size (Friends = four). Strict filters stay. Real default order currently stays the same; fictional scenario changes order. |
| Filters | Live | Staged category, price, walk, atmosphere/vibe, group size 1–8, session 15–240 min, open-session, Wi-Fi/outlets Ignore/Prefer/Require and public-only access. Reset needs Apply; Cancel discards. |
| Empty/loading/error/Retry | Live | Actual fewer/zero matches, exclusions and explicit individual relaxation actions. No automatic relaxation; failed reranks hide stale cards. |
| Now / Later | Live | Now, In 1 hour, In 2 hours; departure and venue timezone labels. No arbitrary slider or future occupancy forecast. |
| Native map, pins, selection, list fallback | Live | react-native-maps shows returned shortlist plus origin; pin selects its card, card opens detail. Tile/readiness failure offers list; web uses list. Native phone acceptance pending. |
| Pin legend | Live | Fill and number = fit; ring = typical busyness at selected time; dashed = missing hour/data. No known real crowd values in published artifacts. |
| Austin place directory and name/address lookup | Cached | 30 real SerpApi places. Lookup returns at most ten links and is explicitly outside recommendation filtering, not new-city discovery. |
| Venue photos | Cached | Photo artifact has 30 Google-hosted thumbnails via SerpApi with attribution; remote network required, failure placeholder available. |
| Detail / why this spot / warnings | Live | Rechecks current shortlist before personalized reasons/arrival. Saved/lookup places outside it show unverified fit. Facts/unknowns remain visible. |
| Muse summaries / atmosphere / tags | Cached | Ten real cached Muse summaries in enriched artifacts; default campus top three have none. Lookup UFO Coffee & Tea for an enriched detail. |
| Fact sources, timestamps, source citations | Cached | Labels retain SerpApi/Muse/curated provenance as supplied. API detail has selected anonymous review snippets; offline snapshot lacks extra snippets. Provenance is not proof an inference is true. |
| Typical-crowd chart / Usually wording | Demo data | Working chart UI with gaps; bundled synthetic patterns illustrate it. All 30 published real places lack typical crowd. No measured live occupancy. |
| Hours / open-session evidence | Cached | Parser, overnight/timezone logic and status UI exist; all 30 real places currently have unknown hours. Strict open-session can return zero. Parser merge did not republish the data. |
| Wi-Fi / outlets / access evidence | Cached | Unknown stays unknown. All 30 real places have unknown Wi-Fi/outlets, so required amenity filters return no matches. Other missing facts stay unknown too. |
| Current observations / seat availability | Not built | Optional source-observation display exists, but published real snapshots contain zero live observations. No sensing/check-in service; seats explicitly unknown. |
| Save / Unsave / saved directory | Live | AsyncStorage saved IDs scoped by city/mode/version, on this device. Bookmarks tab links to real saved directory. No cloud sync. |
| Share place / Open in Maps | Live | Native OS text share with supported reasons/caveats and public Maps link for real places. Cancel handled. Fictional shares labeled; Maps disabled. No shortlist-share action or joined room. |
| Preferences / reset | Live | Save/Cancel and draft defaults; full local preferences/saves/onboarding reset returns to Welcome for this dataset. No shared DB reset. |
| Data & recovery switching | Live | Explicit API, validated offline real cache, bundled demo. Guards stale responses; preserves applied constraints, clears search/selection/drafts/GPS, resets destination clock. Choice lasts only this session. |
| Offline real list/detail/ranking | Cached | Requires successful validated API bootstrap/cache save first. Retains summaries/fact provenance and original times, not additional snippets or downloaded photos/tiles. |
| Bundled fictional scenario | Demo data | Ten fictional venues, synthetic facts, handwritten summaries, fixed clock; same scorer. JS bundle must already be loaded in Expo Go. |
| Map/Friends/Bookmarks/Profile navigation | Live | Default Expo Router tab shell mounted. Custom NookTabBar, compact cards and new Explore layout exports are merged but not mounted in functional routes. |
| Friends / Profile screens | Mocked | Honest placeholders; Profile links to on-device preferences. No real friend activity/account profile. Design previews are not working product features. |
| Group compromise, auth, follows, feed, user ratings | Not built | Friends preset is one query, not multiple joined users or a group optimizer. |
| Second-city build / city progress / arbitrary-city UI | Not built | Operator Austin acquisition exists; no public city-build/job routes or progress journey. API uses first advertised city. |
| Full time slider, uploads, photo reviews, check-ins, chat, notifications, payments | Not built | Outside working prototype scope. No custom native project or background tracking. |

### Data modes and sources

Transport is separate from dataset mode: `EXPO_PUBLIC_DATA_PROVIDER=api` means HTTP, not live venue facts. `fixture` starts the bundled demo. Runtime recovery choices are API, offline cached real, fictional demo; relaunch uses the configured transport again.

| Mode / version | Where it comes from / what it contains |
| --- | --- |
| `demo` / `fictional-austin-v1`; city `demo-austin` | `fixtures/src/index.ts`: ten fictional venues and synthetic evidence; handwritten summaries, not Muse. Fixed `2026-10-24T18:00:00-05:00`, America/Chicago. Manual/default coordinates are scenario inputs. |
| `cached` / `austin-20261025-v1`; city `us-tx-austin` | `fixtures/data/austin-20261025-v1.json`: 30 normalized real SerpApi captures, no summaries/images. `austin-20261025-v1-one.json` is a one-place smoke artifact, not full coverage. |
| `cached` / `austin-20261025-muse-v1` | Same 30 places plus ten previously generated Muse summaries and 34 selected anonymous review citations across enriched details; no images. |
| `cached` / `austin-20261025-muse-photos-v1` | Same 30 / ten summaries plus 30 remote images. All 30: zero typical-crowd records, known hours or live observations; unknown Wi-Fi/outlets. Hosted version observed during audit. |
| `live` | Supported contract/display mode, but no audited real artifact or automatic mobile acquisition flow uses it. Label would be “Live request · source times vary,” still not live occupancy. Never relabel cached as live. |

Sources: **SerpApi** captures Google place facts; **Muse** infers bounded atmosphere/summary features from reviews; **curated** identifies explicit manual facts/defaults where labeled; **synthetic** identifies fictional fixtures. Curated fallback is not Muse output. Private Supabase Postgres caches/evidence support server operator jobs. The deployed read-only Node/Express API loads a versioned normalized JSON artifact; the phone does not call SerpApi, Muse or Supabase directly.

Public audit check: `https://nook-api-demo.onrender.com/health` returned commit `cc8f7aabebd4d19cba2d5c3fad6bbc21272e02a8`; `/v1/cities` advertised cached `austin-20261025-muse-photos-v1`. This deployment is older than mobile main. Recheck before presentation; B owns deployment.

## Two-minute demo script

One speaker, D drives. Use the **labeled fictional scenario** for reproducible order changes and illustrative crowd data. The default real shortlist changes scores but not order and has no crowd data. Never describe fictional summaries as Muse output.

Before timer: Map → **Data & recovery** → **Use fictional demo data**. If onboarding is complete: **Preferences** → **Reset local preferences, saves & onboarding**. This resets demo saves/preferences, then shows the logo. Keep Metro connected, search blank, default Now, 15-minute walk, no price cap. Rehearse native Share dismissal and scrolling on the actual phone.

| Time | Exact taps | Spoken line |
| --- | --- | --- |
| 0:00–0:12 | Logo / Find your nook → **Get started** | “Nook helps students choose a place to study or meet friends. This walkthrough uses labeled fictional venues and synthetic crowd patterns; we also support cached real Austin places.” |
| 0:12–0:30 | Study style: **Study**; keep **No price cap**, **15 min**; select **Silent**; scroll → **Continue** | “Choose your intent, budget and estimated walking limit. These choices become ranking inputs, and missing facts stay unknown.” |
| 0:30–0:40 | **UT Austin main campus** → **Start exploring** | “We'll start at UT Austin without sharing GPS. A one-time location lookup is optional.” |
| 0:40–0:55 | Explore on Map tab, list visible: **Study** → **Meet Friends** | “Watch the order change. Study favors atmosphere; Meet Friends gives group suitability more weight. The same code ranks both scenarios.” |
| 0:55–1:10 | **Filters** → scroll to Maximum estimated walk → **10 min** → **Apply** | “Filters are explicit. We'll limit the estimated walk to ten minutes. Required facts need evidence; constraints never loosen silently.” |
| 1:10–1:25 | **Map** in Map/List toggle → tap highest-fit pin → tap its displayed card | “The pin's fill and number show fit. The ring shows typical busyness at this time; dashed means no data. These patterns are synthetic here, not available seats.” |
| 1:25–1:45 | Detail → scroll to **Typical crowd**, then **Summary and evidence** / source labels | “We say ‘Usually … at this hour’ when data exists, or show missing data. Source labels distinguish demo estimates from real cached evidence. Real places currently have no crowd readings; their Muse summaries are cached review inferences.” |
| 1:45–2:00 | Scroll to actions → **Save** → **Share** → dismiss sheet with rehearsed **Cancel**, close or Android Back | “Save keeps the place on this device. Share opens the phone's share sheet, labeled fictional here, or with a public Maps link for a real venue. We help people choose without pretending to know seat availability.” |

**Unmerged dependencies: none at audit time.** All timed steps exist in main: onboarding #21, map/detail/save integration, complete filters #18, explanations/share #19 and recovery #25 are merged. GitHub open-PR list was empty. Recheck before capture; local previews are not shipped functionality. #24's custom tab bar/compact layout is merged but not mounted, so do not promise it.

Actual scorer smoke: default Study = Paper Lantern, Pocket Library, Moon Desk; Meet Friends = Gather Yard, Little Bowl, Courtyard Club (all fictional). After 10-minute filter show actual eligible results, not forced names. If old strict settings cause zero results, **Filters → Reset → Apply**, then repeat choices. The two-minute budget needs device rehearsal, not a claim of measured presentation duration.

### Optional real-data walkthrough, outside timed script

Map → Data & recovery → **Use API dataset** (or **Reconnect API dataset**). If needed, **Filters → Reset → Apply**. Confirm **Cached dataset / austin-20261025-muse-photos-v1**. Study/Meet Friends recomputes scores, but default order remains Trippy Buck Coffee Truck, St Benedict Coffee Company, Lucky Lab Coffee Co.; do not promise a changed winner.

Search **UFO Coffee & Tea** → its lookup result → **Summary and evidence** → **Source: muse**, timestamps, **View source**. Say: “This is a real cached Muse summary from review evidence. Lookup is outside recommendation filters; this place may not be in our shortlist.” Show **No typical crowd data yet**, unknown amenities and **Seat availability: unknown**. Open in Maps works for real venues. Offline real mode retains summary/fact labels but lacks extra source snippets. Clear search on return.

## Backup plan

1. **Backend down:** warm public `/health` before stage time; avoid repeated narrated retries. API requests time out after eight seconds; bootstrap has two sequential requests and can take sixteen. From Map, or bootstrap/detail failure recovery: **Data & recovery → Use fictional demo data**. Applied strict filters survive switching: **Filters → Reset → Apply** if needed. Say “We're switching to the labeled offline scenario; the same ranker still runs.” **Use cached real dataset** is another explicit choice only if a validated copy was saved; otherwise disabled. No silent fallback. Keep Metro running while testing only the API outage.
2. **Venue Wi-Fi fails:** keep loaded app open; connect phone/laptop to the rehearsed hotspot and rescan reachable Metro QR if needed. Or use pretested `npm run dev:mobile -- --tunnel`; tooling must be ready in advance and internet is still required. Metro tunnel does not repair a failed backend. Switch to fictional data and **List** if API/tiles fail. Bundled data works after JS loads; a fresh Expo Go launch still needs Metro. Keep laptop awake, powered, and firewall/network access tested.
3. **Expo Go fails:** presenter phone must already have **SDK-57-compatible Expo Go** for this SDK-57 project. Disable automatic updates; no auto-update or SDK upgrade on stage. Use the rehearsed **iOS Simulator on D's Mac** with matching Expo Go/bundle (`npm run dev:mobile`, then Expo's `i` shortcut on that Mac). Windows A cannot run iOS Simulator. If simulator/mirroring fails, play the local recording.
4. **Backup video location:** reserve **`docs/demo-assets/nook-demo-final.mp4`**. On A's presenting checkout: `C:\Users\zgaud\Documents\Nook\nook\docs\demo-assets\nook-demo-final.mp4`; same repo-relative copy on D's Mac, plus local desktop copy. **No video exists in the audited repo; this is a planned capture destination, not a ready backup.** Record by 06:00 and verify complete playback with Wi-Fi off on both presenting computers. Say “This is a recording of the prototype and its labeled data mode.”

## Devpost copy — plain text to paste

### What it does

Nook helps students around UT Austin choose a place to study or meet friends. Set an intent, budget and estimated walking limit, then compare a ranked shortlist on a list or map. Explicit filters apply before ranking, and details show supported reasons, source labels and unknown information. Save places on your device and share a place through your phone's share sheet.

The prototype includes 30 cached real Austin places captured through SerpApi, with cached Muse summaries for ten. A separately labeled fictional scenario demonstrates preference changes and synthetic typical-crowd patterns. The real dataset currently has no typical-crowd readings or verified opening schedules, and Wi-Fi and outlets remain unknown. Nook does not measure live occupancy or guarantee seats.

### How we built it

We built Nook with Expo SDK 57, React Native, Expo Router and TypeScript. Native maps use react-native-maps; AsyncStorage keeps guest preferences and saved places on the device. Shared Zod contracts validate data between the app and a Node.js/Express backend hosted on Render. Server-side operator jobs use SerpApi for bounded Google Maps place acquisition and private Supabase Postgres storage for provider caches and evidence. The demo API serves a versioned normalized snapshot instead of acquiring new data on every tap.

Muse extracts bounded summaries and atmosphere features from anonymous review evidence. Outputs are validated, cached by source/model/prompt identity and reviewed before publication. Missing or unsupported facts remain unknown. Muse does not select winning places or run on each filter change.

One deterministic TypeScript ranker serves API, offline real-cache and fictional modes. Strict constraints come first, followed by normalized intent weights over proximity, atmosphere, tag overlap, rating confidence, affordability, preferred amenities and group suitability, with an uncertainty penalty and stable ties. Walking time is a straight-line estimate with a detour heuristic. Results are the best matches among known candidates under this model, with explicit fallback and source labels.

### Built with

Expo SDK 57, React Native, React, Expo Router, TypeScript, react-native-maps, expo-location, AsyncStorage, Node.js, Express, Zod, SerpApi, Meta Muse (muse-spark-1.3), Supabase/PostgreSQL, Render, Vitest, npm workspaces.

## Judge Q&A

1. **Is this live data?** The API runs now, but Austin facts and ten Muse summaries are cached captures. The scripted scenario is fictional and labeled. Neither is live seat availability; source timestamps remain visible.
2. **How do you rank?** Strict filters first, then normalized intent weights over distance, atmosphere, tags, quality, price, amenities and group fit, with uncertainty penalties and stable ties. One scorer in all modes; no hard-coded winners or whole-city completeness claim.
3. **Why do some places show unknown?** Captured evidence doesn't establish those facts. All 30 real places currently lack typical crowd and known hours; Wi-Fi/outlets are unknown. Strict requirements exclude unknowns rather than guessing.
4. **What does Muse contribute?** Cached review-based summaries, tags and supported atmosphere inferences for ten real places. Extraction is bounded/validated and can abstain; it's not a per-tap ranker. Default top-three cards have no Muse summaries.
5. **Why Nook instead of a maps directory; can friends join?** We focus on a short explainable list for your intent and explicit constraints. Today you can share a place; Friends is a placeholder, not a joined group or social feed.
6. **What's next?** Physical-phone acceptance and a campus pilot first. Improve verified hours/amenity/crowd coverage and freshness, evaluate ranking with users, then consider multi-person compromise. More cities/accounts/social features are not shipped promises.

## 06:00 America/Chicago checklist — A with D

- [ ] Record final mobile commit, backend health SHA, dataset version, phone model/OS/Expo Go version and actual native acceptance. Freeze is 03:00: unfinished P1 stays unavailable. D alone merges; B alone deploys/migrates. This docs PR does neither.
- [ ] Capture final device screenshots: Welcome/logo; study style with intent/budget/walk; UT Austin location; Study and Meet Friends ranked lists with data badge; Filters/Apply; native map and legend; real detail's unknown crowd/amenities; enriched Muse summary and source labels; fictional chart with demo label; saved directory; native Share draft without sending; recovery and empty state. Planned folder: `docs/demo-assets/screenshots/`. Existing design-review PNGs are browser previews, not final phone proof.
- [ ] Recheck every feature-table row against merged code, mounted routes and actual selected artifact. Confirm counts: 30 real, ten summaries, zero crowd/known-hours/live records, unknown Wi-Fi/outlets. If B publishes a new artifact, audit again; parser merge alone changes no published facts.
- [ ] Rehearse timed taps three times on the presenter phone: demo ranking order changes, filters stay applied, source labels are honest, map/list fallback works, Save survives force-close, Share/Cancel and real Maps work. Use the tested native share-sheet wording.
- [ ] Test backend outage → explicit demo/cached-real recovery; fresh install without cache; denied GPS → manual; zero results → explicit single change/reset. Runtime provider choice is session-only; strict constraints survive switches.
- [ ] Record exact two-minute walkthrough plus a separate cached real Muse detail take. Preserve demo labels; don't splice synthetic crowd onto a real venue. Export `docs/demo-assets/nook-demo-final.mp4`, copy to A's presenting laptop and D's Mac, play fully with Wi-Fi off. Until then video backup is **not ready**.
- [ ] Check charger/battery, Do Not Disturb, mirroring, hotspot/tunnel, disabled auto-updates, SDK-57 phone launch and D's iOS Simulator. Keep Metro running. Paste final copy/video link into Devpost and verify event submission requirements. No unmeasured performance claims. Team hard delivery deadline: 08:00.

## Audit evidence and handoff

Read AGENTS, README, PRD, CONTRACTS, ALGORITHM and all task files; checked actual routes, components, provider/recovery/session/settings, server app/operator/AI boundaries, shared ranker and versioned JSONs. Key code: `apps/mobile/src/features/session/OnboardingFlow.tsx`, `app/(tabs)/map.tsx`, `(tabs)/_layout.tsx`, FiltersSheet/filters, MapPin, BusynessChart, `app/spot/[id].tsx`, detail/explanations, saved/preferences routes, `src/data/recovery.ts`, `packages/core/src/index.ts`, `server/src/app.ts`.

This pass counted fixture facts, checked public health/city metadata and GitHub open PRs, and ran a read-only ranking smoke with the actual scorer/preset functions (unchanged between preserved local checkout and audited main). Cached default order stayed unchanged; fictional order changed as above. No provider acquisition/model calls, app/config/dependency edits or physical-device checks. Full app tests/builds were not rerun for docs-only edits; old task passes are historical evidence, not new results. PR checks: `git diff --check` and changed-file scope. Next smallest step: D's phone rehearsal and A's video capture.
