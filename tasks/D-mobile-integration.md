# D mobile and integration assignment

Status: proposed assignment, not started by this planning task.

> Read AGENTS.md, docs/PRD.md, docs/CONTRACTS.md and docs/EXECUTION.md. I am person D on feat/mobile-flow and the team's integration lead. Inspect the repository before scaffolding. Establish the smallest Expo Go app, root verification scripts, shared imports, a fixture DataProvider and working phone launch. Own routes, Explore map/list, filters, detail, saved places, native sharing, data adapters and demo reset. Use A's component API; do not wait for all Figma screens. Use C's scorer and B's contract rather than inventing result shapes. Implement loading/empty/error states and an explicit live/cached/demo distinction. Never call provider APIs with secret keys from the phone. Verify denied GPS/manual origin, stale request handling, estimated walk labels, save persistence, share cancel, map failure and reset. Keep the root lockfile serialized. Merge small reviewed PRs sequentially and smoke-test the combined phone flow. Freeze features at 3 a.m.; record before 6 a.m.; deliver by 8 a.m.

## First milestones

1. First 30 minutes: app on presenter phone, actual SDK recorded, root scripts and shared imports working.
2. By 7 p.m.: onboarding-to-result-to-detail fixture journey integrated with A/C.
3. By 9 p.m.: real snapshot/API adapter; first stable demo checkpoint.
4. At 3 a.m.: complete P0 only; unfinished P1 disabled; integration log saved.

If A cannot code, take onboarding with their specs and drop optional social UI. Rehearse the exact Expo Go bundle, backend, laptop and mirroring setup. A deployed API does not eliminate the need to serve the app bundle. Keep a local video fallback.

## Handoff record

- Branch/current integrated commit:
- Presenter phone/Expo/Node/npm versions:
- P0 flow and error states tested:
- Last known good tag:
- Demo mode/data version/reset steps:
- Remaining release blockers:
