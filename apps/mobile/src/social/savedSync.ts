import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Spot } from '@space/contracts';
import { getSupabase } from './client';
import { savedRow } from './profileRules';

// Saved-spots sync adapter. Local saves (D's SessionProvider) stay the source of truth;
// when social is on and someone is signed in, this mirrors them to nook-social's saved_spots.

type SpotSnapshot = Pick<Spot, 'name' | 'categories'>;

function devLog(stage: string, details: Record<string, unknown>) {
  if (__DEV__) console.warn(`[social] saved sync ${stage}`, details);
}

/**
 * Call after a local save/unsave has succeeded. No-op when social is off or signed out.
 * Never throws: the local save already worked, so a sync failure must not undo or block it.
 */
export async function syncSavedSpot(spotId: string, saved: boolean, spot?: SpotSnapshot | null): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    const userId = session.user.id;
    const { error } = saved
      ? spot ? await client.from('saved_spots').upsert(savedRow(userId, spotId, spot), { onConflict: 'user_id,spot_id' })
        : { error: null }
      : await client.from('saved_spots').delete().eq('user_id', userId).eq('spot_id', spotId);
    if (error) devLog('failed', { saved, spotId, code: error.code, message: error.message });
  } catch (error) {
    devLog('failed', { saved, spotId, message: (error as Error)?.message });
  }
}

export const backfillKey = (userId: string, scope: string) => `nook:social:saved-backfill:v1:${userId}:${scope}`;

/**
 * Uploads this device's existing saves once per user and dataset scope (first sign-in).
 * Existing remote rows are kept (ignoreDuplicates). Saves without a stored place snapshot are skipped
 * because saved_spots requires a name.
 */
export async function backfillSavedSpots(userId: string, scope: string, places: readonly { spot: Spot }[]): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const key = backfillKey(userId, scope);
  try {
    if (await AsyncStorage.getItem(key)) return;
    const rows = places.map(({ spot }) => savedRow(userId, spot.id, spot));
    if (rows.length) {
      const { error } = await client.from('saved_spots').upsert(rows, { onConflict: 'user_id,spot_id', ignoreDuplicates: true });
      if (error) { devLog('backfill failed', { count: rows.length, code: error.code, message: error.message }); return; }
    }
    await AsyncStorage.setItem(key, new Date().toISOString());
  } catch (error) {
    devLog('backfill failed', { message: (error as Error)?.message });
  }
}
