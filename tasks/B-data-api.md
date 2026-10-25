# B data and infrastructure assignment

Status: C/D contract approval verified in issue #3; user reports presenter-phone/API access complete.
Earlier local provider/cache work is ready for D's PR review. Local laptop hosting
uses a temporary HTTPS tunnel. Supabase setup and credentials are pending;
migrations remain unapplied and real SerpApi capture is not verified.

> Read AGENTS.md, docs/PRD.md and docs/CONTRACTS.md. I am person B on feat/data-api. Verify branch and existing work. Own Supabase schema/migrations, SerpApi adapter, normalized real fixtures, cache, jobs, deployment, server bootstrap and shared schemas. First coordinate contract version 1 with C and D, deploy /health, and normalize one real place without exposing keys. Expand to a bounded 20–30-place Austin snapshot with stable IDs, timestamps, nullable fields and source links. Implement list/detail endpoints with Zod validation, request timeouts, deduplication, cache expiry and request accounting. Mount C's recommendation route through an agreed export; do not implement a competing scorer. Keep the provider cache private; add explicit authorization for any spend-triggering operation. You alone apply migrations/deploys. Verify a cold request, a cached repeat and provider failure. City jobs/auth/social are gated P1. Hand off endpoint examples, dataset version, tests and remaining unknowns without secret values.

## First milestones

1. One working SerpApi request, key quota recorded privately, deployed health endpoint.
2. Shared schemas and 10 normalized fixture records available to A/C/D.
3. By 9 p.m.: real snapshot/list/detail endpoints on phone-accessible HTTPS.
4. Before recording: pinned dataset, backend commit, bounded retries and fallback tested.

For optional builds, cap all request attempts, persist jobs, deduplicate requests for the same city and never rely on post-response work in a process that may stop. Start with 16 planned external requests plus two reserved retry slots under the 18-call ceiling; stop instead of overspending.

## Handoff record

- Branch: `feat/data-api`, based on merged foundation `3345efa`; no deployed commit.
- Endpoint examples and operating instructions: [server/OPERATIONS.md](../server/OPERATIONS.md).
  Local `/health`, cities/list/detail and foundation recommendations are available.
- Migration: `202610250001_data_api.sql` prepared; not applied. SQL privilege check
  prepared but not executed (no configured shared DB or local PostgreSQL).
- Dataset: still `fictional-austin-v1`, ten fictional demo places, scenario time
  `2026-10-24T18:00:00-05:00`. No real normalized capture exists yet.
- Actual real-provider calls: zero; no provider key was available. Automated mock
  cold request = 1 attempt; cached repeat = 1 hit and no additional attempt.
- Implemented: private persistent cache adapter, 24h/5min expiry, four-second provider
  timeout, deduplication, bounded operator ingestion, durable 18-attempt reservation,
  normalized snapshot loader, route injection boundary, private RLS migration and
  host-neutral container recipe. City jobs/auth/social remain disabled P1.
- Checks: 63 unit/API tests, workspace typecheck, lint and server build passed. Built
  server local HTTP smoke returned 200 for health/cities/list/detail. The seed command
  without authorization exited 1 without a provider call. No Docker, DB role,
  remote host, real provider or physical-phone verification has occurred.
- Current coordination draft: [server/CONTRACT-V1-REVIEW.md](../server/CONTRACT-V1-REVIEW.md).
  Existing Zod schemas were reviewed, not duplicated or extended with new API fields.
  Focused validation: 16 contract tests pass; contracts typecheck passes.
- Next: user finishes Supabase/SerpApi configuration in ignored `server/.env`; B verifies
  the target project and applies the migration through the agreed operator workflow,
  then captures one real place before expanding. D reviews and merges this branch.

- Local team-access update: API running on port 3001 with Cloudflare Quick Tunnel.
  Current URL and restart instructions are in `server/OPERATIONS.md`. Four concurrent
  HTTPS health requests and cities/list/detail passed from B's laptop. The user reports
  phone access confirmed after the tunnel restart. No paid service
  or database was created by this agent.

## PR preparation checkpoint

- Synced `origin/main` at `04b2b7c` into `feat/data-api` without conflicts.
- Verified C/D explicit contract approvals in closed issue #3. C's merged router
  export is available; mounting it remains a follow-up integration task.
- Installed the committed lockfile with `npm ci --ignore-scripts` (no dependency edits).
- Current checks: workspace typecheck, 136 tests across 11 files, lint, server build,
  and `git diff --check` all pass. Eight existing dependency advisories remain.
- Ignored `server/.env` prepared with owner-only permissions; credentials are pending.
  No migration applied or paid provider request made. Phone results are user-reported.
- D owns PR review/main merge and integrated presenter-phone acceptance.

## PR #7 review fix — C router mount

- Replaced the inline recommendation route/handler injection with C's actual
  `createRecommendationRouter`, mounted using `app.use('/v1/recommendations', router)`.
  Removed the unused proposed `RecommendationData` interface.
- Production-app HTTP tests exercise the real router at the prefix with and without
  trailing slash. They validate RecommendationSchema, request IDs, scorer parity,
  fixed demo time, advancing server time for cached/live mode, and preserved source
  timestamps. Cached/live tests use explicitly synthetic provider test data.
- Checks: focused HTTP/router tests 27/27; full suite 138/138 across 11 files;
  workspace typecheck, lint, server build and `git diff --check` passed.
- User reports provider configuration complete; credentials were not printed or
  committed. Real capture, migration execution, deployment and the updated router's
  presenter-phone acceptance remain separately unverified. No paid call or migration
  was run for this fix. D retains review and main merge.
