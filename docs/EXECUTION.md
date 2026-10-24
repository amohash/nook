# Space implementation and team execution guide

## Working agreement

The deadline is **8 a.m. Sunday October 25, 2026, America/Chicago**. This schedule starts around 5:30 p.m. Saturday and reserves five hours after a 3 a.m. feature freeze for integration, recording, rehearsal and recovery. If you start later, compress or cut scope; do not move the freeze into the recording block.

Use one GitHub repository, four human-owned branches, one current task per person, and one integration lead. Independent work is good; independent contracts, dependency stacks and deployments are not. Make small mergeable slices throughout the night, then tag the final release at the end.

## Assign the four people

| Person | Owns | Must avoid changing without coordination | Review partner |
|---|---|---|---|
| A — Figma/design | Theme, shared visual components, onboarding/preferences; final pitch and screenshots | Router layouts, API contracts, backend | D |
| B — backend/data | Schema, SerpApi, cache, hosting, jobs, server bootstrap, shared contracts | C's scoring and AI modules, mobile screens | C |
| C — backend/ranking | Pure scorer, tests, Muse extraction, recommendation route, measured evaluation | B's migrations/server bootstrap, mobile screens | B |
| D — mobile/integration | Expo setup, navigation, Explore, filters, detail, saves, share; main merges | A's visual component internals, schema | A |

D temporarily owns root package files and the lockfile. Each owner proposes dependency additions; D applies them once. B can own server package declarations after foundation, but lockfile updates stay serialized. B alone applies migrations/deploys the backend. A's ownership of submission materials does not make A responsible for all AI code, as in the previous plan.

## Time blocks and explicit cut decisions

| Central time | A | B | C | D | Required gate |
|---|---|---|---|---|---|
| 5:30–6:00 p.m. | Tokens and first three Figma frames | Provider keys; one real search; health deployment | Review existing algorithm if available; contract fields | Repo + Expo phone smoke; foundation | Same schema, 10 fixtures, one phone app |
| 6:00–7:00 p.m. | Components + onboarding | Normalize 20 Austin places; schema/cache | Fixture scorer and golden cases | Map/list/detail and filter wiring | First integrated fixture journey |
| 7:00–7:30 p.m. | Short meal/QA | Deploy place endpoint | Muse smoke and validation | Merge + test fixture release | Preserve a working checkpoint |
| 7:30–9:00 p.m. | Loading/error/empty states | Real snapshots and API failures | Recommendation route + 10 real AI features | Swap API provider; saves/share | Real-data journey on phone by 9 |
| 9:00–10:30 p.m. | Usability pass; pitch outline | Limits, timestamps, source links | Constraint/time tests; instrument metrics | Integrate/rehearse first 90 seconds | Complete P0, source labels visible |
| 10:30–11:30 p.m. | Devpost soft submission | Deployment smoke; assist fixes | Review edge cases | Merge and move from WEL before 11 | Soft submission ready by 11:15 |
| 11:30 p.m.–midnight | Freeze visual pattern | Clean data snapshot | Validate scenario ordering | Full P0 gate on presenter phone | Decide P1 yes/no |
| Midnight–2:00 a.m. | Optional profile/social UI or pitch | Optional second-city job | Group compromise first; evaluation | Group comparison, then city UI | At most two P1 items; no new systems |
| 2:00–3:00 a.m. | Final UI pass and script | Backups and job recovery | Final algorithm checks | Merge all finished features | Feature freeze at 3 |
| 3:00–4:30 a.m. | Accessibility + manual QA | API/security smoke | Scenarios and metric capture | Fix failures on target phones | All P0 tests pass; last UI freeze |
| 4:30–6:00 a.m. | Screenshots, Devpost, narration | Backend warm/reachable; handoff | Verify technical claims | Record live and offline fallback | Video saved locally by 6 |
| 6:00–7:00 a.m. | Present; time rehearsals | Stand by for failures | Prepare Q&A evidence | Drive demo; reset between runs | Three successful ≤3-minute runs |
| 7:00–7:30 a.m. | Final submission review | Record environment/deployment info | Check feature-status claims | Tag and clean-clone smoke | Final materials uploaded/ready |
| 7:30–8:00 a.m. | Charger, device, final rehearsal | Availability check | Backup copy | No new features; only critical fixes | Ready at 8 |

Take meals and short breaks in staggered pairs; use the 3–6 a.m. window for staggered rest once each owner signs off. Never leave only one exhausted person to integrate everything. The supplied deck places dinner at 7 p.m. and closes WEL 11 p.m.–6:30 a.m.; plan the move into GDC before the closure. These are deck timings, subject to event updates.

**Fallback ladder:** If the 7 p.m. fixture journey is late, drop decorative animations. If 9 p.m. live data is late, finish the UI against the captured real dataset while B fixes the provider. If P0 is incomplete at midnight, cancel P1. At 3 a.m., disable unfinished screens behind flags and preserve the working path. If less than six hours remain when the team starts, use Austin only, guest mode, three screens plus onboarding, a cached dataset and no city jobs or social auth.

## Step 1 — Put this pack in the repository

Create or select the Space repo, invite all four members, and nominate D to merge. Copy this kit's `AGENTS.md`, `CLAUDE.md`, `docs/`, `tasks/`, `.github/` and example environment files into the repo. If a repo already has instruction files, merge relevant content after reviewing it rather than overwriting it blindly. The kit is not a runnable starter; foundation work creates the application and command scripts.

Initialize the app once. D runs the current Expo starter in `apps/mobile`, confirms the generated SDK matches Expo Go on the presenter phone, and records the Node/npm versions. Install only necessary native dependencies using Expo's resolver. Proposed commands during foundation:

```sh
npx create-expo-app@latest apps/mobile
cd apps/mobile
npx expo install react-native-maps expo-location @react-native-async-storage/async-storage
npx expo start
```

Execute the starter only in a new empty destination. If it generates its own Git folder or nested lockfile, D resolves that deliberately before committing the single-repo/workspace foundation. Do not nest independent repositories. The starter's moving template/SDK must be checked on the actual device; do not pin a version from an old tutorial.

At the root, D establishes and verifies `npm run dev:mobile`, `npm run dev:server`, `npm run typecheck`, `npm test`, `npm run lint` and `npm run build:server`. These are **required scripts to create**, not commands that this document has already installed. Use TypeScript + a small test runner such as Vitest; server development can use tsx and production must have a tested build/start command. `npm ci` must work from a clean clone with the committed lockfile. Prove shared contract/core imports on both runtimes before all four branch off.

App data should initially be fixtures, so map, onboarding and filtering work without any key. Establish a small deterministic scorer test immediately. Avoid snapshot tests for colors and copy. Test behavior that could invalidate the demo: filtering, hours, unknowns and shared response shapes.

## Step 2 — Configure each person's T3 Code

T3 Code orchestrates coding agents and their existing accounts. Install it from the [official project](https://t3.codes/) on each person's laptop. Each member uses their own provider login. Open **Settings → Providers**, configure a supported installed provider and complete its sign-in. The official [installation guide](https://github.com/pingdotgg/t3code/blob/main/docs/user/install.md) and [provider docs](https://github.com/pingdotgg/t3code/tree/main/docs/user) are the reference if your installed UI differs.

1. Install T3 Code and the coding provider you already use; sign in locally. Do not share personal subscription tokens in GitHub or chat.
2. Clone the same GitHub repo onto your own laptop; verify GitHub push access.
3. Add/open that local repo as a T3 project. Select the intended provider and repository directory.
4. Create one feature branch/worktree for your assignment, based on the agreed foundation commit. If T3 manages the worktree, let it create it once; do not manually switch another running thread's checkout.
5. Start one primary coding thread for your role. Verify its working directory and branch before asking for edits. Worktrees are separate filesystems but still use the same remote repository and potentially the same shared database.
6. Ask the agent to identify its loaded instructions, owned paths and acceptance tests. It must read root AGENTS.md and the relevant role task. For Claude, the provided CLAUDE.md imports AGENTS.md using `@AGENTS.md`; inspect `/memory` or `/context` if supported by the installed provider UI. [Claude instruction-file reference](https://code.claude.com/docs/en/memory).
7. Give it the relevant Figma frame/export or contract, a narrow task, and the checks required. Review the resulting diff before committing.
8. Restart or open a fresh task only at a clean boundary. Record the current branch, last passing checks and next action in your own task file; don't rely on another person's model remembering your chat.

T3 Code is the **development** orchestration layer. Runtime AI is `Expo app → deployed API → Meta Model API`. Running every application request through a teammate's T3 session would make the demo depend on that laptop and does not provide a production API.

### Keep AI work efficient

Use one shared instruction file and targeted docs, not the entire research transcript in every prompt. Start each task with one outcome and owned paths. Ask for a minimal change and a meaningful verification. Give the UI agent the current frame plus loading/error behavior, not “build the whole app from Figma.” Save decisions in `docs/DECISIONS.md`, source contracts in one place, and use the same provider/model unless a particular task needs another. Avoid four agents independently changing dependencies or building competing versions of the app. Spend runtime AI tokens on cached evidence extraction, not every filter tap.

## Step 3 — Freeze the contracts and fixtures

B and C spend 15 minutes with D agreeing CONTRACTS.md. B implements the schemas; C imports them. D's fixture adapter implements the same interface as the HTTP adapter. A gets exact card fields before finalizing layouts. Freeze contract version 1 and merge it before parallel implementation.

B captures real source records for 20–30 Austin places, verifies coordinates/source time and keeps secrets out of fixtures. C authors 8–12 clearly fictional golden places for tests and stage scenarios. Use distinct files/namespaces for real cached data and synthetic data. A chooses three useful scenarios; C ensures real scoring, not hard-coded result order, produces the intended behavior.

Record actual model access, SerpApi quota and deployment constraints in the private team setup notes. Commit only names of environment variables and nonsecret configuration. If Muse access fails, manual summaries keep UI work moving, but that fallback must be labeled and the pitch updated.

## Step 4 — Build one vertical slice per branch

Choose branches such as `feat/design-onboarding`, `feat/data-api`, `feat/ranking-ai` and `feat/mobile-flow`. A branch can contain multiple small commits; open a draft PR early and merge finished slices. Recreate a fresh branch after a squash merge instead of piling more work onto a stale merged branch.

Order of integration:

1. Foundation: dependencies, script commands, contracts, fixtures, app shell and health endpoint.
2. A's tokens/components plus C's basic scorer; integrate D's map/list/detail against fixtures.
3. B's real snapshot endpoint, then C's recommendation endpoint and validated AI features.
4. D's provider switch, saves, share and recovery states.
5. Optional group comparison, city build or social loop only after P0 gate passes.

Backend contract changes must be additive when possible. B announces the change, updates schemas and one fixture, then C/D update callers in the same coordinated slice. Never let a renamed field sit broken until the final merge.

## Step 5 — Use the same Git workflow

Replace `YOUR_ORG` and branch names as appropriate. These examples are commands for the team to run; no remote repo or PR has been created by this planning task.

```sh
git clone https://github.com/YOUR_ORG/space.git
cd space
git switch main
git pull --ff-only origin main
git switch -c feat/ranking-ai
npm ci
```

If using T3's own worktree creation, omit manual branch creation and confirm `git branch --show-current` in the assigned worktree. An alternative for multiple sessions on one laptop is `git worktree add ../space-ranking -b feat/ranking-ai origin/main`; do not do both for the same branch. One active writer per worktree. Each worktree needs its ignored environment file and dependencies configured. Use different development ports for concurrent local servers; the mobile device must point to the intended server URL. `localhost` on a phone is the phone, not the developer laptop.

Before an integration point, pause the agent, inspect changes, stage only owned paths, verify and push:

```sh
git status --short
git diff
git add packages/core server/src/ai server/src/routes/recommend.ts
git diff --cached --check
npm run typecheck
npm test
git commit -m "feat: rank places with explicit filter constraints"
git fetch origin
git merge origin/main
npm run typecheck
npm test
git push -u origin feat/ranking-ai
```

Adjust paths to the actual diff; the sample `git add` is for C and may omit C's separate Muse adapter. Review the staged diff, including ignored/secret patterns, before commit. Do not use `git add .` blindly. Keep all feature work committed or deliberately stashed before merging main; never overwrite someone else's work to clear a conflict.

Open a PR against main in GitHub or through T3's supported PR flow. Provide a screenshot/video for UI, a request/response example for API work, actual tests run and known limitations. Assign the review partner. D merges **one PR at a time**, runs the phone smoke flow against the combined branch, and then tells everyone to sync. Reviewers verify user behavior and contract compatibility, not just attractive code.

After a squash merge, update a clean local main and start the next branch:

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/ranking-refinements
```

If main is checked out in another worktree, update it there and create a new branch from freshly fetched `origin/main` in a new or clean task worktree. Do not force-reset or delete a worktree while an agent is using it.

### Conflict resolution and rollback

On a conflict, stop edits on affected files, identify the owning teammate and resolve the smallest change together. Never accept “ours” or “theirs” for an entire package manifest or contract without reading it. D regenerates the lockfile from the agreed manifests using the pinned npm version; B resolves migration order. If needed, `git merge --abort` returns to the pre-merge state, then retry after coordinating.

After resolution run typecheck, scorer tests and the affected phone journey. If a merged change breaks the demo, D reverts that PR or disables its flag; preserve the last known working commit. Do not force-push main. Tag a working checkpoint after 9 p.m. and again before recording. This is safer than one giant 7 a.m. merge.

## Step 6 — Build and test the deployed path

B deploys `/health` in the first hour, then place data. Test the HTTPS endpoint from the actual phone network. Health should report the deployed commit so stale builds are visible. Keep provider keys only in host secrets. Add timeouts, per-client limits and an account-wide call budget before enabling paid upstream actions. Do not expose a spend-triggering unauthenticated city-build endpoint.

D points the Expo app to the deployed HTTPS URL. Use LAN for Metro only if reachable; otherwise use Expo's tunnel mode (`npx expo start --tunnel`) after validating the required tunnel tooling. A deployed backend does not remove Expo Go's need for its JavaScript bundle. Keep the Metro laptop awake and connected; rehearse the exact phone/projector/mirroring connection, not just a simulator. Keep a local video because offline fixtures cannot make a fresh Expo Go launch independent of bundle availability.

Test data mode switching and list fallback with the bundle already loaded and connectivity disabled. A native map may lose tiles without internet; the ranking and detail list should remain usable. Avoid promising fully offline cold-start operation in Expo Go. An installable standalone build is a future delivery choice, not tonight's dependency.

## Step 7 — Verify at the feature freeze

| Check | Person responsible | Pass evidence |
|---|---|---|
| Clean install, typecheck, focused tests, server build | D | Logged commands and commit ID |
| Denied GPS, manual origin, skip onboarding, restart | A | Phone checklist |
| Strict caps, no results, overnight hours, stable ties | C | Deterministic test output |
| Known live provider response and cached repeat | B | Redacted trace, source timestamp, call counts |
| Bad AI output, quota/timeout fallback | C + B | Injected failure test |
| No keys in app/bundle/fixture; RLS write denial if auth exists | B | Configuration review and negative test |
| Share cancel, image failure, map failure, stale request response | D | Manual checks on presenter phone |
| Demo reset and full stage flow five times | A + D | Timed runs |

The root verification scripts must actually exist and pass; do not report checks as successful just because commands appear in this guide. Use the PR template to record skipped checks honestly. A physical phone smoke test remains necessary even when all automated tests pass.

## Step 8 — Ship the demonstration before 8 a.m.

By 6 a.m., A and D record the full working flow and a shorter fallback clip, save both locally and to the team's shared submission location, and verify playback. B keeps a redacted data snapshot and deployment instructions. C records measured metrics and a one-paragraph explanation of limitations. A completes the Devpost problem, what it does, stack, challenges, next steps, attribution and feature-status statements. Include the source repo and any required video URL; confirm submission status in the actual event portal.

D creates a release tag only after the team accepts the commit:

```sh
git switch main
git pull --ff-only origin main
npm ci
npm run typecheck
npm test
npm run build:server
git tag -a demo-v1 -m "HackTX demo ready"
git push origin demo-v1
```

Record the tagged commit, backend commit, data version, phone model, Expo version and scenario settings in the handoff. The stage driver uses that version. A later critical fix requires retesting the full flow and updating the release record; do not silently change the tag or video claims.

The ceremony deck says all code must be written during the hacking period (page 88). The supplied research memo does not establish when its source was written. Record provenance of any reused code and ask organizers if its eligibility is unclear; continue new work that is clearly within the event period. Declare third-party libraries and AI assistance as required by the actual event submission rules.
