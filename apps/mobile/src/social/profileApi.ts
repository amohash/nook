import type { SupabaseClient } from '@supabase/supabase-js';

/** The caller's own row from public.profiles (RLS returns only the owner's row, including phone fields). */
export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  major: string | null;
  avatar_url: string | null;
  vibe_tags: string[];
  vibe_line: string | null;
  phone_hash: string | null;
  discoverable_by_phone: boolean;
  created_at: string;
};

export type NewProfile = Pick<Profile, 'username' | 'display_name' | 'major' | 'avatar_url' | 'vibe_tags' | 'vibe_line'
  | 'phone_hash' | 'discoverable_by_phone'>;

export async function fetchOwnProfile(client: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function isUsernameAvailable(client: SupabaseClient, name: string): Promise<boolean> {
  const { data, error } = await client.rpc('is_username_available', { name });
  if (error) throw error;
  return data === true;
}

export type CreateProfileResult = { ok: true; profile: Profile } | { ok: false; reason: 'username_taken' | 'failed' };

export async function createProfile(client: SupabaseClient, userId: string, input: NewProfile): Promise<CreateProfileResult> {
  const { data, error } = await client.from('profiles').insert({ id: userId, ...input }).select('*').single();
  if (!error) return { ok: true, profile: data as Profile };
  // 23505 is a unique violation: the username was taken between the live check and submit.
  return { ok: false, reason: error.code === '23505' && /username/.test(error.message) ? 'username_taken' : 'failed' };
}

export async function updateVibe(client: SupabaseClient, userId: string, vibe_tags: string[], vibe_line: string | null) {
  const { data, error } = await client.from('profiles').update({ vibe_tags, vibe_line }).eq('id', userId).select('*').single();
  if (error) throw error;
  return data as Profile;
}
