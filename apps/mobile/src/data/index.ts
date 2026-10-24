import { createApiProvider, fixtureProvider } from './providers';

// Transport selection is separate from dataset mode: the starter API also serves demo data.
export const provider = process.env.EXPO_PUBLIC_DATA_PROVIDER === 'api'
  ? createApiProvider(process.env.EXPO_PUBLIC_API_BASE_URL ?? '') : fixtureProvider;
