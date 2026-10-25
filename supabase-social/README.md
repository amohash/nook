# nook-social (Supabase)

Accounts, profiles, follows and synced saved spots for Nook. This is a **separate Supabase project ("nook-social") owned by A**. It is not the data/API project in `supabase/`, and it is not used by `server/` or the Render backend. Never run these files against B's project.

Status: P1. CONTRACTS.md keeps P0 guest saves on-device; nothing in P0 depends on this project.

## Files

| File | Purpose |
|---|---|
| `migrations/001_social.sql` | Tables, `public_profiles` view, RLS, functions, `avatars` bucket. Idempotent; wrapped in one transaction. |
| `tests/social_rls.sql` | RLS/permission checks with three throwaway users. Runs in a transaction and rolls back. |

## Apply

1. Open the **nook-social** project → SQL Editor. Check the project name in the top bar.
2. Paste `migrations/001_social.sql` and run it. Re-running is safe.
3. Paste `tests/social_rls.sql` and run it. The last result should be `social RLS checks passed`. Any exception names the broken rule. No rows are kept.
4. Authentication → Providers: enable the sign-in method the app uses (for example, email OTP).

## Schema

- **profiles**: `id` = `auth.users.id` (cascade on account delete). `username` must match `^[a-z0-9_]{3,20}$`, so the client lowercases before saving; it is unique. Other columns: `display_name`, `major`, `avatar_url`, `vibe_tags text[]` (≤10), `vibe_line` (≤140), `phone_hash`, `discoverable_by_phone` (default false), `created_at`. Text fields have length caps.
- **public_profiles** (view): every profile column except `phone_hash` and `discoverable_by_phone`. It is the only way to read other people's profiles.
- **follows**: `(follower_id, followee_id)` PK, `created_at`. Self-follows are rejected. Both sides must have a profile.
- **saved_spots**: `(user_id, spot_id)` PK, plus `name`, `category`, `saved_at`. `spot_id` is the app's place ID (`spotId` in CONTRACTS.md); `name`/`category` are a display snapshot taken at save time, not live facts.

## Access rules

| Object | Read | Write |
|---|---|---|
| `profiles` (base table) | Owner's own row only (includes `phone_hash`) | Owner inserts/updates own row; no client delete (account deletion cascades) |
| `public_profiles` | Any signed-in user | — |
| `follows` | Any signed-in user | Insert/delete only where `follower_id = auth.uid()` |
| `saved_spots` | Owner, or users who follow the owner | Owner only |
| `is_username_available(name)` | Signed-in users | — |
| `match_contacts(hashes)` | Signed-in users | — |
| `avatars` bucket | Anyone via public URL | Signed-in users, only under `{uid}/` |

`anon` has no table, view or function access. Users sign in before choosing a username.

## Client usage

- Env: `EXPO_PUBLIC_SOCIAL_SUPABASE_URL` and `EXPO_PUBLIC_SOCIAL_SUPABASE_ANON_KEY`. Both are public by design; RLS is the boundary. **Never put the service-role key in the app.**
- Username check: `supabase.rpc('is_username_available', { name })`. The unique constraint is still the final arbiter, so handle the `23505` error on insert.
- Contacts: normalize each number to E.164 on-device, hash it with SHA-256, lowercase the hex, and send at most 200 per `supabase.rpc('match_contacts', { hashes })` call. Store the user's own hash the same way in `profiles.phone_hash`.
- Avatars: upload to `avatars/{uid}/avatar.jpg` with `upsert: true` (JPEG/PNG/WebP, ≤2 MB), then save the public URL in `profiles.avatar_url`.
- Saves: upsert on `(user_id, spot_id)`. Tell users that **people who follow them can see their saved spots**.

## Known limitations

- Phone hashes are unsalted. The phone-number space is small, so a determined caller can brute-force which numbers are discoverable. Mitigations: discovery is opt-in (default off) and capped at 200 hashes per call, but there is **no rate limit**. Don't describe this as anonymous.
- Follows are one-way and public to all signed-in users. There is no approval, blocking or private-account mode.
- `public_profiles` intentionally bypasses RLS on `profiles` (it uses the view owner's rights); Supabase's linter will flag it as a "security definer view". That is the design: it is the only way to read others' profiles while keeping `phone_hash` owner-only. Don't add sensitive columns to the view.
- Saved-spot snapshots go stale if a place is renamed; the app should prefer live data by `spot_id`.
- Verified against PGlite with Supabase stand-ins (roles, default grants, `auth.uid()`, storage schema), including a rerun of the migration and storage-path checks. Not yet run on the real nook-social project; do steps 2–3 above.

## Integration ownership

Wiring this into the app (supabase-js dependency, auth screens, sync adapters) touches D-owned root manifests and data adapters. Coordinate with D before adding the dependency.
