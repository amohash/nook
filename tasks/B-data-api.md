# B data and infrastructure assignment

Status: contract review pending in [issue #3](https://github.com/amohash/nook/issues/3),
with C (@Jeffjone) and D (@amohash) explicitly asked to approve. Earlier local provider/
cache work is provisional; no further contract-dependent implementation until approval.
The user creates the prod host and Supabase project and configures secrets in dashboards.
B recommends paid always-running Render. Migrations are files only; do not apply yet.
Real data, deployed health and migration application are NOT verified.

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
- Next: C/D explicitly approve issue #3; user creates Render and Supabase and supplies
  only service/project identifiers and region. Deploy health first after host handoff.
  Migrations remain unapplied until project handoff and authorization. No secrets requested.
