import { afterEach, expect, it, vi } from 'vitest';

const { createClient, getItem, setItem } = vi.hoisted(() => ({
  createClient: vi.fn(() => { throw new Error('Social must not create a client while disabled'); }),
  getItem: vi.fn(), setItem: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem, setItem } }));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('leaves the client, contacts and save sync inactive with all social variables unset', async () => {
  vi.resetModules();
  for (const key of Object.keys(process.env).filter((key) => key.startsWith('EXPO_PUBLIC_SUPABASE_'))) {
    vi.stubEnv(key, undefined);
  }
  for (const key of ['EXPO_PUBLIC_SOCIAL_ENABLED', 'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_CONTACTS_MATCHING']) vi.stubEnv(key, undefined);
  const fetch = vi.fn(() => { throw new Error('Disabled social must not use the network'); });
  vi.stubGlobal('fetch', fetch);
  const { socialConfig, contactsMatchingEnabled } = await import('./config');
  const { getSupabase } = await import('./client');
  const { syncSavedSpot, backfillSavedSpots } = await import('./savedSync');

  expect(socialConfig).toEqual({ enabled: false, reason: 'flag_off' });
  expect(contactsMatchingEnabled).toBe(false);
  expect(getSupabase()).toBeNull();
  await syncSavedSpot('spot', true, { name: 'Local place', categories: ['cafe'] });
  await syncSavedSpot('spot', false);
  await backfillSavedSpots('user', 'demo:scope', []);
  expect(createClient).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});
