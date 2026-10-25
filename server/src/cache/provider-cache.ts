import { createHash } from 'node:crypto';

export type CacheEntry = { payload: unknown; fetchedAt: string; expiresAt: string };
export interface ProviderCache {
  get(key: string): Promise<CacheEntry | null>;
  put(key: string, entry: CacheEntry): Promise<void>;
}
export function cacheKey(params: Record<string, string>) {
  if (Object.keys(params).some((key) => /key|token|secret/i.test(key))) throw new Error('Credentials are not cache parameters');
  return createHash('sha256').update(JSON.stringify(['serpapi-parser-v1',
    Object.entries(params).sort(([a], [b]) => a.localeCompare(b))])).digest('hex');
}
// Test-only cache; ingestion requires the persistent Supabase implementation.
export class MemoryCache implements ProviderCache {
  private entries = new Map<string, CacheEntry>();
  async get(key: string) { return this.entries.get(key) ?? null; }
  async put(key: string, value: CacheEntry) { this.entries.set(key, value); }
}
