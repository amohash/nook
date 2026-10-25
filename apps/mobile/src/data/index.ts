import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiProvider, fixtureProvider, publicApiBase } from './providers';
import { createRecoveryProvider } from './recovery';
import { campusProvider } from './campus';

const base = publicApiBase(process.env.EXPO_PUBLIC_API_BASE_URL ?? '');
export const bundledRealPlaces = process.env.EXPO_PUBLIC_DATA_PROVIDER === 'campus';
export const bundledDatasetLabel = bundledRealPlaces ? 'UT Austin study collection' : 'Fictional demo';
// Transport selection and dataset mode remain distinct: an API can serve demo.
// Runtime choices are deliberate and session-only; every fresh launch uses config.
export const recovery = createRecoveryProvider({
  // "demo" is the bundled transport choice; the campus bundle retains cached real provenance.
  api: createApiProvider(base ?? ''), demo: bundledRealPlaces ? campusProvider : fixtureProvider, storage: AsyncStorage,
  cacheKey: `space:offline:v1:${encodeURIComponent(base ?? 'unconfigured')}`,
  initialChoice: process.env.EXPO_PUBLIC_DATA_PROVIDER === 'api' ? 'api' : 'demo',
});
export const provider = recovery.provider;
