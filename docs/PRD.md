# Space product requirements

**Version 1 — October 24, 2026. Delivery by October 25 at 8 a.m. Central.**

## Product and audience

Space helps students choose a nearby place that fits their budget, timing and preferred atmosphere. The first audience is UT Austin students deciding where to study alone or meet friends. The user should leave with three understandable options, not another long directory to browse.

**Core promise:** “Find a place that fits what you and your friends want to do.” AI summarizes evidence about atmosphere; ordinary code applies constraints and ranks places. The result must explain why it fits and where the evidence is uncertain.

Tonight's deliverable is a complete demonstration of this journey in Expo Go, with a deployed backend and an offline dataset fallback. It is not an app-store release, a complete city directory, a seat-availability service or a finished social network.

## Review of the existing plan

| Existing proposal | Assessment | Decision for tonight |
|---|---|---|
| Glowing city map and intent lenses | Clear visual identity; useful in a short demo | Keep map, top-three list, simple circles and intent chips |
| Any city in under a minute | Strong potential moment; uncapped cost and coverage claims are unsupported | Optional second-city preview; arbitrary-city speed is a future target |
| Accounts, profiles, follows, feed and ratings all required | Too much UI, auth and state for one principal mobile builder | Local preferences, saves and native sharing first; real social loop gated |
| Muse summaries and tags | Good use of AI when tied to review evidence | Cache and validate extraction; show short explanation and provenance |
| H3 best-first retrieval | Interesting research direction; real search cannot establish exhaustive coverage | Deterministic cached-candidate ranking now; bounded enrichment second |
| Review count as missing crowd estimate | Measures accumulated popularity, not occupancy | Missing crowd remains unknown; review count only informs rating confidence |
| All four people independently build until final merge | Likely to expose incompatible assumptions too late | Shared contracts, one owner per shared file, hourly small merges |
| Polish and record after 8 a.m. | Conflicts with your stated deadline | Freeze features at 3 a.m.; record by 6 a.m.; ready at 8 a.m. |

The existing plan assumes all members are first-time hackers. This has not been established in the current request; check novice eligibility before selecting it. The supplied deck permits three selected tracks excluding Best Overall/Novice. Meta + SerpApi + Best Pitch is a reasonable proposal, subject to actual integration and event confirmation. Deck references are in SOURCES.md.

## Scope and release gates

P0 is the minimum complete demo. P1 starts only after the real-data P0 journey passes on the presenter phone by midnight. P2 belongs in the roadmap; it is not a promise about the prototype.

| ID | Feature | Priority | Acceptance criterion | Owner |
|---|---|---|---|---|
| F01 | Three-step onboarding | P0 | Intent, preferences and location choice persist; skip and back work; reset returns to step one | A, D wires |
| F02 | Manual campus origin and optional location | P0 | Denied permission still reaches results; origin is visible and editable | D |
| F03 | Map plus ranked list | P0 | Same eligible places on map/list; top three have reasons; selecting either opens the same detail | D |
| F04 | Filters and intent presets | P0 | Category, estimated walk limit, price cap, solo/group and atmosphere affect results; clear all works | D + C |
| F05 | Time selection | P0 | Now and two preset times recompute ranks and open status; date/timezone displayed; future results never say live | D + C |
| F06 | Ranking and explanations | P0 | No strict constraint violations; stable ties; missing data visible; no match is a valid answer | C |
| F07 | Place detail | P0 | Name, category, price/unknown, rating/count, time evidence, tags, summary, source and actions render | D |
| F08 | AI atmosphere extraction | P0 | Real Muse output saved for at least 10 places if access succeeds; validated fields and evidence; manual fallback labeled | C |
| F09 | Real discovery data | P0 | At least 20 deduplicated Austin places, 10 with detail evidence; source timestamps stored | B |
| F10 | Local saves and preferences | P0 | Save/unsave survives app restart; guest flow needs no email or account | A + D |
| F11 | Share a place or shortlist | P0 | Opens OS share sheet with names, reasons and public map links; cancel is harmless | D |
| F12 | Demo controls and recovery | P0 | Reset, fixed scenario clock, explicit demo badge and safe live/fixture switching work | D + B |
| F13 | Group compromise comparison | P1 first | Two manually selected preference profiles yield a recomputed shared shortlist; no fake joined users | C + D |
| F14 | Second-city build progress | P1 second | One canonical city job, incremental results and partial failure states; hard request cap; cached fallback | B + D |
| F15 | Account and minimal profile | P1 | Two real users can sign in/out; preference changes survive relaunch; RLS denies cross-user writes | B + A |
| F16 | Quick rating, follow and feed | P1 only if capacity | One real rating becomes visible to a follower; empty and duplicate states work | B + A |
| F17 | Full slider and richer charts | P1 | Correct overnight behavior; unknown hours not plotted as zero; no request per drag tick | D |
| F18 | Photo reviews, check-ins, uploads | P2 | Later: moderation, consent, freshness, deletion and abuse controls designed first | Future |
| F19 | Muse connector, chat, notifications | P2 | Later: separate access, registration, permissions and product scope | Future |

### Easy features with good presentation value

Prioritize “why this spot,” a one-tap solo/group switch, local save, a native share sheet, a visible source label, and an estimated closing warning. These reuse existing state. A “compare us” group toggle is stronger for the Meta story than a static feed because it demonstrates how different preferences produce a shared decision. No fake follower counts or fabricated recent check-ins are needed.

## Screen and interaction requirements

Use three bottom tabs: **Explore, Saved, Me**. Detail is a pushed screen; filters are a modal sheet; city progress is an Explore state. Avoid adding a tab for every implementation step.

1. **Welcome and intent.** One sentence of value; choose Study, Meet friends, Date night or Cheap eats. Study/Meet friends are the required demo paths. Other presets can reuse the same filter model after core tests pass. Continue as guest is primary.
2. **Preferences.** Choose three vibe tags, a budget level and estimated walking limit. Skip uses visible defaults: Study, 15 minutes, no price cap, quiet preference. Wi-Fi/outlets may be preferred; strict amenity requirements exclude unknown evidence. Changing a preset must not silently clear strict constraints.
3. **Location choice.** “Use my location” requests foreground permission only after the tap. “Use UT Austin” selects a manual origin with no permission prompt. Manual mode stays available for denied, limited, unavailable or out-of-city GPS.
4. **Explore.** Location header, intent chips, filters button, Now/Later control, map/list toggle and three recommendation cards. Default list remains useful when tiles fail. A legend distinguishes match intensity from busyness; do not use one unlabeled glow for both. Limit rendered circles to the visible candidate set.
5. **Filters.** Category multiselect; price cap; estimated walk cap; solo/group and group size; atmosphere target; optional Wi-Fi/outlets; desired start and session length; “Open for my session” toggle. Display active-filter count and explicit Reset/Apply. Strictness is a visible product decision, not hidden scoring behavior.
6. **Detail.** One image or placeholder; price/rating; estimated arrival; opening evidence; hourly historical busyness where present; Muse summary and three tags; two or three evidence-backed reasons; unknown facts; source time; Save, Share and Open in Maps. Keep important information above the fold.
7. **Saved and Me.** Saved places link to detail. Me edits local preferences and offers demo reset. If account work is cut, say “Preferences on this device”; do not imply cloud sync.
8. **Progress state, if built.** City name, stages and completed counts, partial cards, Cancel viewing and Retry. Show “12 places found; 4 summaries ready,” not a made-up completion percentage when total work is unknown.

### Figma handoff

A provides a frame link and a short spec per screen: component names, spacing, font sizes, palette, tap targets, loading/empty/error/selected states, safe-area treatment and navigation. Use one mobile reference width plus flexible layout constraints. Export only needed assets and use system fonts initially. D starts the shell against simple components immediately; the complete Figma file is not a build dependency. A owns shared component visuals; D owns routes and navigation. Approve the first components before propagating them.

## Data and demonstration honesty

Support explicit dataset modes: `live`, `cached` and `demo`. Live means a current backend request; it does **not** mean every crowd observation is live. Each fact separately carries its source and observation time.

| Element | Safe to prepare or hard code | What must remain real |
|---|---|---|
| Onboarding | Copy, defaults, sample avatar, allowed tags | Selected values change the actual ranking input |
| Demo city | Austin origin; curated cities and canonical coordinates | Coordinates and facts verified or labeled illustrative |
| Places | Cached normalized SerpApi responses with capture time | Source names, real rating counts and links preserved |
| Crowd scenario | Synthetic hourly values on clearly fictional demo venues | Badge “Demo scenario”; do not attribute values to Google |
| AI summaries | Previously generated Muse output stored with model and source hash | Do not label hand-written fallback as generated by Muse |
| Friends | Sample preference profiles labeled demo profiles | No implication that simulated people joined or checked in |
| City animation | Replay of stored import events | Visible “Replay of cached import”; never call it live ingestion |
| Ranking | Fixed input dataset and clock for repeatability | Same production scoring function; no preselected winner IDs |
| Usage counter | Real request instrumentation; labeled analytical baseline | No fabricated savings, response time or “credits used” values |

Live-to-demo transition is explicit and clears dependent state. Do not quietly mix synthetic crowds with live venue facts. Never send demo ratings to the production table. A reusable `DataProvider` interface makes fixture and API providers interchangeable without scattering demo checks through components.

## Architecture for tonight

```text
Expo Go app
  local preferences + saved IDs + cached fixture bundle
  Explore / onboarding / detail / share
            |
            | HTTPS JSON through DataProvider
            v
Node TypeScript API on one tested host
  validation + request limits + recommendation scorer
  SerpApi adapter + persistent cache + Muse extractor
            |
            v
Supabase Postgres
  cities / spots / evidence / jobs / private provider cache
  optional Auth + profiles / follows / ratings
```

Choose **Expo Router + TypeScript**, `react-native-maps`, plain View charts, AsyncStorage and a small shared component set. Use the SDK version supported by the team's installed Expo Go, install native libraries with `npx expo install`, and commit exact dependency resolutions. Native code outside Expo Go is out of scope. The official [map library reference](https://docs.expo.dev/versions/latest/sdk/map-view/) lists it as included; verify both phones rather than assuming identical provider styling. Prefer the default map provider, especially Apple Maps on an iPhone in Expo Go.

Use one Node API (Express, or retain Hono if already set up), one database and one deployment. B owns infrastructure; C imports scoring into B's existing server. Avoid two independent backend apps. Use REST polling for optional city progress every two seconds while visible; Supabase Realtime is an enhancement after polling works. A worker must own persistent jobs; do not return success and assume a serverless process continues after its request ends.

An initial single always-running Node service can process a durable jobs table with a lease. Persist progress, resume idempotently after restarts and bound concurrency. If the hosting plan cannot run background work reliably tonight, disable new-city builds and use prebuilt data. Deploy health and one data endpoint early to discover hosting limits before midnight.

The app runtime calls Muse through the backend. T3 Code is the team's coding-agent workspace; it is not the app's inference gateway. See EXECUTION.md for setup.

## Reliability and privacy

The mobile bundle may contain API base URL and, if used, the Supabase public/publishable key. Never bundle SerpApi, Muse or Supabase service-role credentials. Every `EXPO_PUBLIC_*` value is public. Keep raw provider cache and full source responses server-only. Apply RLS to all exposed tables, including read policies, and verify cross-user denial rather than relying on UI restrictions. [Supabase RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security).

Use guest exploration with local settings for P0. If accounts are implemented, use the official [React Native Auth guide](https://supabase.com/docs/guides/auth/quickstarts/react-native), persist sessions correctly and pretest demo users. Do not disable authorization to repair sign-in. Never require email verification during the stage flow.

Use location in memory for recommendations; no background tracking or public precise-location feed. Store only the selected area unless the user opts into a future feature. Send AI only the review evidence needed, with reviewer identifiers removed. Treat review text as untrusted content, not instructions. Show attribution and link back to sources. Before public commercialization, review provider licensing, review/photo reuse, cache retention and data rights; this pack does not establish those permissions.

## Edge cases and required behavior

| Situation | Required behavior | Gate |
|---|---|---|
| Permission denied, approximate GPS or location timeout | Manual origin; show selected area; no repeated prompt loop | P0 |
| User is outside Austin coverage | Offer manual Austin exploration; no invented nearby results | P0 |
| Zero or fewer than three matches | Return actual count; offer individually selectable relaxations | P0 |
| Conflicting requirements | Explain which constraints exclude results; never silently alter them | P0 |
| Missing price with a strict cap | Exclude from strict matches; optional separate unknown-price section | P0 |
| Missing Wi-Fi, outlets or accessible entrance | Unknown is not yes; strict requirement excludes it | P0 |
| Venue closed or closes before session ends | Exclude if required; otherwise show close warning | P0 |
| Overnight opening interval, midnight, different city timezone | Use dated instants and city IANA timezone; test previous-day interval | P0 |
| Daylight-saving transition | Offset-aware instant; reject ambiguous unqualified local time | P0 logic test |
| Holiday hours or unparseable hours | Hours unverified; exclude under strict open-session filter | P0 |
| No popular times or no live crowd | Unknown state; historical data labeled typical, not current | P0 |
| Google textual live crowd without numeric measure | Display text as evidence; do not invent a numeric live value | P0 |
| Low review count or no rating | Smoothed quality estimate; missing rating labeled unknown | P0 |
| Duplicate places, outside search window | Deduplicate by provider ID; recompute geographic eligibility | P0 |
| University-only access, age restrictions or booking requirement | Known restriction shown; access mode can exclude; unknown access flagged | P0 |
| Bad AI JSON, out-of-range values or invented evidence | Reject, one bounded retry, then unknown/manual fallback | P0 |
| Long or malicious review text | Length cap, untrusted-text boundary, no tool execution | P0 |
| Broken thumbnail or expired link | Local placeholder; no crash or endless retry | P0 |
| API timeout, quota exhaustion or 429 | Keep cached results with age; bounded retry and explicit status | P0 |
| Fast repeated filter changes | Cancel/ignore older results by request ID; latest request wins | P0 |
| App backgrounding during fetch | Resume safely; no duplicate mutations or subscriptions | P0 |
| Offline or map tiles unavailable | Bundled ranked list/detail works; map can show unavailable state | P0 |
| Slow phone, large fonts or color blindness | Small marker cap; labels/icons; readable cards; scrollable sheets | P0 |
| App restart during onboarding | Resume or reset coherently; avoid onboarding loop | P0 |
| Simultaneous requests to build same city | Reuse job by canonical city and dataset version | P1 |
| Job restart, duplicate events or partial import | Upsert, lease, monotonically increasing progress; preserve valid rows | P1 |
| Follow self, repeated follow or repeated rating | Constraints and idempotent upsert; no duplicate feed item | P1 |
| Expired login or forbidden write | Sign-in option, useful error; never pretend remote save succeeded | P1 |
| Demo reset mid-request | Cancel stale updates; clear fixture state only, never all shared data | P0 |

## Quality targets and release definition

Targets below are acceptance goals, not measured achievements: cached fixture Explore visible within two seconds on the demo phone; filter changes over the loaded dataset within 200 ms; no network/AI request on a slider tick; live API timeout fallback within five seconds; top three show at least two useful reasons or explicit uncertainty; no crash across five consecutive rehearsals.

The 8 a.m. artifact includes a tagged commit, locked dependencies, setup instructions, backend URL, environment-name checklist without secrets, recorded fallback, screenshot set, three-minute script and accurate Devpost description. Deliver a working guest flow even if optional auth/social or city build is cut. A feature is done only after it is merged and demonstrated on the target phone.

## Scaling and efficiency roadmap

**Tonight:** ingest a bounded Austin neighborhood, deduplicate once, normalize facts once, generate evidence-based features once, and cheaply rerank the same cache for many users. Cap external calls and persist provider results. Cache hits avoid repeated provider work but still incur database, compute, network and refresh costs.

**Next pilot:** expand one neighborhood/campus at a time; add a spatial database index, category/area/time cache keys, job deduplication, expiry by data type and on-demand enrichment. Measure candidate coverage, cache hit rate, external calls per new area, latency percentiles, unknown-data rate and recommendation satisfaction. Add real multiuser group preference sharing before a full social feed.

**Later:** separate API/worker processes, queue jobs, use PostGIS or H3 for candidate partitioning, rank within a bounded local set, and prioritize refresh by demand/freshness. Add opt-in community reports with expiry, abuse protection and moderation. Provider coverage, languages, timezones, hours and data rights determine international readiness; “any city” is not guaranteed.

For a group, respect every member's strict constraints and balance average fit with the least-satisfied member. This is a concrete human-connection story. An early business hypothesis is campus or venue discovery partnerships, but sponsored placement must be labeled and must not override strict user requirements. Validate usage before claiming demand, revenue or network effects.
