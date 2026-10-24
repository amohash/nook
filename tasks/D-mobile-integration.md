# D mobile and integration assignment

Status: shared foundation implemented on `chore/foundation`; automated and browser checks verified. Physical presenter-phone launch, review and merge pending. The remaining P0 flow is not implemented by this starter task.

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
