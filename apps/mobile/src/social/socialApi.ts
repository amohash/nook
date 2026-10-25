import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from './profileApi';

/** A row from public.public_profiles: everything except phone fields. */
export type PublicProfile = Pick<Profile, 'id' | 'username' | 'display_name' | 'major' | 'avatar_url' | 'vibe_tags'
  | 'vibe_line' | 'created_at'>;
export type FollowCounts = { followers: number; following: number };
export type FollowKind = 'followers' | 'following';
/** A row from public.saved_spots. name/category are a snapshot taken when saved. */
export type SavedSpotRow = { spot_id: string; name: string; category: string | null; saved_at: string };

const PUBLIC_COLUMNS = 'id, username, display_name, major, avatar_url, vibe_tags, vibe_line, created_at';

async function count(client: SupabaseClient, column: 'follower_id' | 'followee_id', userId: string) {
  const { count: total, error } = await client.from('follows').select('*', { count: 'exact', head: true }).eq(column, userId);
  if (error) throw error;
  return total ?? 0;
}

export async function fetchFollowCounts(client: SupabaseClient, userId: string): Promise<FollowCounts> {
  const [followers, following] = await Promise.all([count(client, 'followee_id', userId), count(client, 'follower_id', userId)]);
  return { followers, following };
}

export async function fetchPublicProfile(client: SupabaseClient, userId: string): Promise<PublicProfile | null> {
  const { data, error } = await client.from('public_profiles').select(PUBLIC_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as PublicProfile | null;
}

/** IDs the given user follows. */
export async function fetchFollowingIds(client: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data, error } = await client.from('follows').select('followee_id').eq('follower_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.followee_id as string));
}

/** Followers of, or people followed by, a user, newest first. */
export async function fetchFollowList(client: SupabaseClient, userId: string, kind: FollowKind): Promise<PublicProfile[]> {
  const [mine, theirs] = kind === 'followers' ? ['followee_id', 'follower_id'] as const : ['follower_id', 'followee_id'] as const;
  const { data, error } = await client.from('follows').select(`${theirs}, created_at`).eq(mine, userId)
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  const ids = (data ?? []).map((row) => (row as Record<string, string>)[theirs]!);
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await client.from('public_profiles').select(PUBLIC_COLUMNS).in('id', ids);
  if (profileError) throw profileError;
  const byId = new Map((profiles as PublicProfile[]).map((profile) => [profile.id, profile]));
  return ids.map((id) => byId.get(id)).filter((profile): profile is PublicProfile => !!profile);
}

export async function follow(client: SupabaseClient, me: string, them: string) {
  const { error } = await client.from('follows').insert({ follower_id: me, followee_id: them });
  // 23505: already following; treat as success.
  if (error && error.code !== '23505') throw error;
}

export async function unfollow(client: SupabaseClient, me: string, them: string) {
  const { error } = await client.from('follows').delete().eq('follower_id', me).eq('followee_id', them);
  if (error) throw error;
}

/** RLS returns rows only for the owner or a follower of the owner; otherwise an empty list. */
export async function fetchSavedSpots(client: SupabaseClient, userId: string): Promise<SavedSpotRow[]> {
  const { data, error } = await client.from('saved_spots').select('spot_id, name, category, saved_at')
    .eq('user_id', userId).order('saved_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as SavedSpotRow[];
}

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'major' | 'avatar_url' | 'phone_hash' | 'discoverable_by_phone'>>;

/** Never sends username: it's fixed after creation (enforced by supabase-social 002). */
export async function updateProfile(client: SupabaseClient, userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await client.from('profiles').update(patch).eq('id', userId).select('*').single();
  if (error) throw error;
  return data as Profile;
}

/** Prefix search on public_profiles by username or display name, excluding me. Username matches first. */
export async function searchProfiles(client: SupabaseClient, me: string, pattern: string, limit: number): Promise<PublicProfile[]> {
  const [byUsername, byName] = await Promise.all([
    client.from('public_profiles').select(PUBLIC_COLUMNS).ilike('username', pattern.toLowerCase()).neq('id', me)
      .order('username').limit(limit),
    client.from('public_profiles').select(PUBLIC_COLUMNS).ilike('display_name', pattern).neq('id', me)
      .order('display_name').limit(limit),
  ]);
  if (byUsername.error) throw byUsername.error;
  if (byName.error) throw byName.error;
  const merged = new Map<string, PublicProfile>();
  for (const profile of [...(byUsername.data ?? []), ...(byName.data ?? [])] as PublicProfile[]) merged.set(profile.id, profile);
  return [...merged.values()].slice(0, limit);
}

export type ContactMatch = Pick<PublicProfile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

/** match_contacts RPC: hashes in, discoverable profiles out (never the caller). ≤200 hashes per call. */
export async function matchContactHashes(client: SupabaseClient, hashes: string[]): Promise<ContactMatch[]> {
  const { data, error } = await client.rpc('match_contacts', { hashes });
  if (error) throw error;
  return (data ?? []) as ContactMatch[];
}
