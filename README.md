# Space HackTX team plan

The runnable foundation is now in this repository. See [STARTER.md](STARTER.md)
for exact install, Expo Go, backend, verification and handoff instructions. The
planning pack below is preserved; its full P0 scope is not yet implemented.

**Build deadline: Sunday October 25, 2026 at 8:00 a.m. America/Chicago.** This pack is a proposed implementation plan and repository instruction kit, not a completed application. It replaces the supplied plan's later feature freeze and post-8 a.m. recording schedule.

## The decision to make together

Build a polished Expo Go app that helps a student or friend group choose a nearby place for a specific moment. Finish one reliable journey: **onboard → choose intent and constraints → see ranked places → understand the recommendation → save or share it**. Use a small real Austin dataset plus explicitly labeled demo scenarios. Make a second city a gated extension, not the condition for a successful presentation.

The original idea has a strong visual hook and plausible Meta and SerpApi track fit. Its main gaps are too many mandatory features, an unowned mobile integration workload, an uncertain live-city demonstration, missing data semantics, and an integration schedule that leaves failures until too late. The search memo describes synthetic experiments; the underlying source files were not supplied, so its implementation and benchmarks have not been independently verified.

## Read these in order

1. [Product requirements](docs/PRD.md): feature scope, screens, acceptance criteria, architecture, edge cases and scale.
2. [Execution guide](docs/EXECUTION.md): four owners, tonight's milestones, T3 Code setup, branches, PRs, integration and fallback decisions.
3. [Contracts](docs/CONTRACTS.md): shared objects, endpoints and data rules to freeze before parallel work.
4. [Recommendation algorithm](docs/ALGORITHM.md): implementable ranking rules and a review of the supplied H3 proposal.
5. [Demo and pitch](docs/DEMO.md): real versus staged behavior, a three-minute script, measurements and rehearsal checklist.
6. [Source notes](docs/SOURCES.md): official technical references and opening-deck page references.

[AGENTS.md](AGENTS.md) is the shared instruction file for coding agents. [CLAUDE.md](CLAUDE.md) imports it for Claude Code. The four [task prompts](tasks/) provide each teammate's starting assignment. The [PR template](.github/pull_request_template.md) gives reviewers a short integration checklist.

## Team assignments

| Person | Main responsibility | First handoff |
|---|---|---|
| A — current Figma owner | Design, UI components, onboarding, demo and submission materials | Tokens and first three screen specs by 6:00 p.m. |
| B — backend one | Supabase, SerpApi adapter, cache, API deployment, city jobs | A deployed health endpoint and a normalized real spot |
| C — backend two | Scoring, Muse extraction, recommendation endpoint, evaluation | A deterministic ranking function over fixtures |
| D — fourth teammate | Expo shell, map/list, filters, place detail, integration lead | Complete fixture-backed journey on a physical phone |

If A cannot code, A supplies Figma specs/assets and tests screens; D implements onboarding. Cut optional social features rather than asking A to learn a new stack overnight. B and C stay focused on separate backend boundaries.

## First 30 minutes

- Pick D as the only main-branch merger and B as the only schema/deployment owner.
- Run the same Expo app on the presenter phone; confirm map rendering before styling it.
- Freeze shared types and 10 fixture places. Decide the first demo filters and expected results.
- Verify one SerpApi request and one Muse request using the team's actual accounts.
- Copy this pack into the intended GitHub app repository, preserving `docs/`, `tasks/`, `AGENTS.md` and `CLAUDE.md`. Review before combining with existing instruction files.
- Make the first usable app merge by 7:00 p.m.; repeat integration about hourly.

## What must be true at 8 a.m.

The tagged commit runs in Expo Go; the whole journey works; demo data is clearly labeled; the backend and local fallback are tested; a three-minute presentation and backup video are ready; and Devpost materials are complete. No feature work is scheduled after 8 a.m.

The supplied ceremony deck lists a Saturday 11:30 p.m. soft submission and Sunday 11:30 a.m. event submission deadline (page 88). Treat **8 a.m. as your own hard delivery deadline** and prepare the final submission before then. Check event announcements for changes. Do not assume the later public deadline gives this team extra build time.
