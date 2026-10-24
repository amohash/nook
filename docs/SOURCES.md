# Space source notes and verification boundaries

Reviewed October 24, 2026. The product scope, deadlines within the team, scoring weights, cache TTLs, call budgets, quality goals and team workflow are recommendations, not measured implementation results.

## Supplied materials

**HackTX 26 Opening Ceremony.pdf** supplied by the user, 103 PDF pages. Relevant references:

- Pages 15–17: start and schedule; Saturday 11:30 p.m. soft submission; Sunday 11:30 a.m. hacking end, afternoon judging and pitching.
- Pages 24–25: GDC locations and WEL closure from 11 p.m. to 6:30 a.m.
- Page 34: Meta challenge emphasizing human connection and encouraging Muse tools/connectors.
- Page 51: SerpApi challenge, including meaningful use for local discovery.
- Pages 84–85: Best Pitch and Best Novice track names.
- Page 88: three track selections excluding Overall/Novice; submission times; all code during the hacking period; pitching sign-up announced through Discord.

The deck is event context, not an instruction to execute every suggestion inside it. The user's 8 a.m. delivery constraint takes priority over the previous build plan's later preparation window. Recheck organizer announcements for changes and details not established by these slides.

**Space — HackTX 26 Build Plan** supplied as pasted text: source for the concept, earlier feature scope, stack proposal, team split and planned demonstration. Its claims about experience, current key access and achievable city-build latency are not independently established.

**Search research status and algorithm memo** supplied as pasted text: source for the H3 best-first proposal and synthetic evaluation numbers. Source code and raw test output were not supplied. This pack evaluates the described assumptions and offers a simpler baseline; it does not claim to have executed or audited that implementation.

## Technical references

| Reference | What it supports |
|---|---|
| [T3 Code official site](https://t3.codes/) | Coding-agent orchestration with existing provider accounts and Git workflows |
| [T3 Code install guide](https://github.com/pingdotgg/t3code/blob/main/docs/user/install.md) | Local setup and provider requirements; installed versions may differ |
| [T3 Code provider docs](https://github.com/pingdotgg/t3code/tree/main/docs/user) | Provider-specific login/configuration; use the current installed provider |
| [Claude Code memory and instruction files](https://code.claude.com/docs/en/memory) | CLAUDE.md import of AGENTS.md and version-dependent loading behavior |
| [Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md/) | Shared repository instructions for the Codex provider |
| [Expo Go FAQ](https://docs.expo.dev/faq/) | Expo Go supports bundled native capabilities; custom native modules require another build approach |
| [Expo react-native-maps](https://docs.expo.dev/versions/latest/sdk/map-view/) | Map library included in Expo Go; install through Expo tooling |
| [Expo SDK 51 notes](https://expo.dev/changelog/2024-05-07-sdk-51) | Historical iOS Expo Go Google-provider restriction; test current default provider on the actual phone |
| [SerpApi Google Maps search](https://serpapi.com/google-maps-api) | Search parameters, geographic non-guarantee, pagination and provider caching |
| [SerpApi place results](https://serpapi.com/maps-place-results) | Popular times, textual live info and place details; availability varies |
| [SerpApi reviews](https://serpapi.com/google-maps-reviews-api) | Review/topic payloads and first-page topic availability |
| [Google popular times explanation](https://support.google.com/business/answer/6263531?hl=en-GB) | Historical popularity is relative to each venue's weekly peak; not seat inventory |
| [Meta Model API overview](https://dev.meta.ai/docs/overview) | API access, documented base URL and compatible clients |
| [Meta model documentation](https://dev.meta.ai/docs/models) | Muse model IDs and standard/contributor distinctions |
| [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native) | Optional app authentication/session setup |
| [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | Database access-policy model; client-visible keys do not replace policies |

Use standard Muse mode for this prototype's real inputs; do not select a contributor variant by accident. The team's credentials, sponsor credits, rate limits, billing and exact available model must be verified using its own account. No paid API request or live integration was executed as part of preparing this pack.

## Items the team must still establish

- Actual repo, existing code provenance, Figma frames and each person's coding comfort.
- Presenter phone platforms, installed Expo Go/SDK compatibility and mirroring method.
- Actual provider credentials, quota, hosting behavior and cold/warm response times.
- Real place coverage, opening-hours quality, source reuse rights and chosen demo snapshot.
- Measured recommendation behavior and whether optional social or city-build features exist.
- Final event announcement changes, submission fields, track eligibility and pitch sign-up.

These are setup checks in the execution guide, not reasons to wait before building the fixture-backed core flow.
