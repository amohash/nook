# Space coding agent instructions

## Objective

Ship the Space HackTX Expo Go demo by **2026-10-25 08:00 America/Chicago**. Feature freeze is 03:00. Read `docs/PRD.md`, `docs/CONTRACTS.md` and your assigned `tasks/` file before implementing. Read `docs/ALGORITHM.md` when touching ranking or AI. This file is shared by coding providers; `CLAUDE.md` imports it.

## Product scope

P0: guest onboarding, manual/GPS origin, map and ranked list, explicit filters, Now/Later presets, detail with evidence, cached Muse summaries, local saves, native sharing, demo reset and graceful fallback. P1 requires a passing P0 on the physical presenter phone. No chat, notifications, background tracking, payments or custom native dependencies tonight.

## Ownership and collaboration

- A: `apps/mobile/src/components`, `src/theme`, `src/features/onboarding`, `src/features/preferences`, assets and pitch.
- B: Supabase migrations, SerpApi/cache/jobs, `server/src/index.ts`, place routes, shared contracts and deployment.
- C: `packages/core`, Muse provider/AI modules, recommendation route and ranking tests.
- D: mobile routes, Explore/detail/saved/data adapters, integration and main merges.
- D owns root manifests/lockfile changes; B alone applies shared DB migrations. Update these paths if the foundation uses the simpler approved layout.
- Verify working directory, branch and uncommitted changes first. One writer per branch/worktree. Do not edit another owner's area without coordination. Continue independent owned work if a shared change is pending.
- Use small commits and PRs, sync main at checkpoints, and never force-push/reset main or discard a teammate's work. Only D merges to main. Do not create extra repositories, services or schema resets.

## Implementation rules

- TypeScript, shared Zod contracts, one API, one DB, a fixture/API DataProvider boundary. Use one ranking implementation in all modes.
- Install Expo native dependencies with `npx expo install`; verify Expo Go compatibility on the target phone. Do not generate native projects unless the team explicitly changes scope.
- Keep scoring deterministic and independent of network/AI/React. Inject time, normalize weights and stable-sort ties.
- Apply strict filters before ranking. Never silently relax constraints. Unknown facts stay unknown; review count is not live crowd; historical activity is not seat availability.
- Use place IDs, source timestamps, nulls and provenance as defined in CONTRACTS.md. Do not invent API fields or change contract spellings locally.
- Muse extracts bounded evidence with validation, one retry and a labeled fallback. Cache by source hash/model/prompt. No model calls on every filter change.
- Demo fixtures and clocks must be labeled. Do not hard code winner IDs or fake users, reviews, live progress or performance results.
- Secrets remain server-only. `EXPO_PUBLIC_*` is public. Never log keys or credential-bearing URLs. Keep provider cache private and test authorization for user-owned writes.
- Do not introduce broad abstractions, refactors, new state libraries or optional infrastructure to solve a narrow task. Preserve the simplest working demo.

## Verification and handoff

The foundation must establish these root scripts: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build:server`, `npm run dev:mobile`, `npm run dev:server`. Inspect package.json before using them; if absent, report that and establish only the assigned foundation scripts. Do not claim a command exists or passed without running it.

Run focused behavior tests for ranking, unknowns, timezones/overnight hours and contracts; use manual device checks for visual changes. Test required error/empty/loading states. A feature is done only when it is merged, passes relevant checks and works on the presenter phone.

At handoff report changed files, user-visible behavior, actual checks/results, known limitations and the next smallest step. Update only your task file's status; shared decisions go in `docs/DECISIONS.md` through the owner. Distinguish planned, implemented and verified. Do not add unmeasured pitch claims. Freeze unfinished P1 behind flags at 03:00; after that fix release blockers only.
