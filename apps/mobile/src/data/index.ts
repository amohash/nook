import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiProvider, fixtureProvider, publicApiBase } from './providers';
import { createRecoveryProvider } from './recovery';

const base = publicApiBase(process.env.EXPO_PUBLIC_API_BASE_URL ?? '');
// Transport selection and dataset mode remain distinct: an API can serve demo.
// Runtime choices are deliberate and session-only; every fresh launch uses config.
export const recovery = createRecoveryProvider({
  api: createApiProvider(base ?? ''), demo: fixtureProvider, storage: AsyncStorage,
  cacheKey: `space:offline:v1:${encodeURIComponent(base ?? 'unconfigured')}`,
  initialChoice: process.env.EXPO_PUBLIC_DATA_PROVIDER === 'api' ? 'api' : 'demo',
});
export const provider = recovery.provider;
