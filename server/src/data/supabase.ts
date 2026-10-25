import { z } from '@space/contracts';
import type { CacheEntry, ProviderCache } from '../cache/provider-cache';
import { fetchJson, ServiceError } from '../providers/http';
import { cacheKey } from '../cache/provider-cache';

const CacheRow = z.object({ payload: z.unknown(), fetched_at: z.string(), expires_at: z.string() });
export class SupabaseStore implements ProviderCache {
  private base: URL;
  constructor(url: string, private serviceKey: string, private options?: { nearbyLimit: number }) {
    this.base = new URL(url);
    if (this.base.protocol !== 'https:' || !serviceKey || this.base.username || this.base.password) {
      throw new Error('HTTPS Supabase URL and server credential required');
    }
    if (options && (!Number.isInteger(options.nearbyLimit) || options.nearbyLimit < 18 || options.nearbyLimit > 250)) {
      throw new Error('Nearby account limit must be an integer from 18 to 250');
    }
  }
  async call(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
    const url = new URL(`/rest/v1/${path}`, this.base);
    return fetchJson(url, { method, headers: { apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`, 'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  }
  async get(key: string): Promise<CacheEntry | null> {
    const rows = z.array(CacheRow).parse(await this.call(`api_cache?request_hash=eq.${key}&select=payload,fetched_at,expires_at&limit=1`));
    const row = rows[0];
    return row ? { payload: row.payload, fetchedAt: row.fetched_at, expiresAt: row.expires_at } : null;
  }
  async put(key: string, entry: CacheEntry) {
    await this.call('api_cache?on_conflict=request_hash', { request_hash: key,
      payload: entry.payload, fetched_at: entry.fetchedAt, expires_at: entry.expiresAt });
  }
  async reserveAttempt(version: string) {
    if (this.options && this.options.nearbyLimit > 18) return this.reserveNearbyAttempt(version, this.options.nearbyLimit);
    const result = await this.call('rpc/reserve_ingestion_attempt', { version });
    if (result !== true) throw new ServiceError('request_budget_exhausted', 429);
  }
  /** Durable runtime budget in the existing private cache. Reserve all 18 legacy
   * ledger slots conservatively, including concurrent old-server reservations.
   * The row never rolls over on refresh/restart; no schema change or reset needed. */
  private async reserveNearbyAttempt(version: string, limit: number) {
    if (!/^austin-[a-z0-9-]{1,80}$/.test(version)) throw new Error('Invalid account budget key');
    const key = cacheKey({ kind: 'nearby-account-budget-v2', version });
    const fetchedAt = new Date().toISOString();
    await fetchJson(new URL('/rest/v1/api_cache?on_conflict=request_hash', this.base), {
      method: 'POST', headers: { apikey: this.serviceKey, Authorization: `Bearer ${this.serviceKey}`,
        'Content-Type': 'application/json', Prefer: 'return=representation,resolution=ignore-duplicates' },
      body: JSON.stringify({ request_hash: key, payload: { attempts: 18 }, fetched_at: fetchedAt,
        expires_at: '2100-01-01T00:00:00.000Z' }),
    });
    for (let retry = 0; retry < 8; retry++) {
      const row = await this.get(key);
      const budget = z.object({ attempts: z.number().int().min(18).max(250) }).safeParse(row?.payload);
      if (!budget.success) throw new ServiceError('budget_storage_invalid');
      const attempts = budget.data.attempts;
      if (attempts >= limit) throw new ServiceError('request_budget_exhausted', 429);
      // Compare-and-set is atomic in Postgres, also across API instances.
      const updated = await this.call(`api_cache?request_hash=eq.${key}&payload->>attempts=eq.${attempts}`,
        { payload: { attempts: attempts + 1 } }, 'PATCH');
      if (Array.isArray(updated) && updated.length === 1) return;
    }
    throw new ServiceError('budget_contention', 429);
  }
  /** Private api_cache rows double as short acquisition leases. Atomic insert or
   * expired-row compare-and-set prevents two server processes buying one area. */
  async claimLease(key: string, owner: string, now: number, durationMs: number): Promise<boolean> {
    const row = { request_hash: key, payload: { owner }, fetched_at: new Date(now).toISOString(),
      expires_at: new Date(now + durationMs).toISOString() };
    const url = new URL('/rest/v1/api_cache?on_conflict=request_hash', this.base);
    const inserted = await fetchJson(url, { method: 'POST', headers: { apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`, 'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=ignore-duplicates' }, body: JSON.stringify(row) });
    if (Array.isArray(inserted) && inserted.length === 1) return true;
    const updated = await this.call(`api_cache?request_hash=eq.${key}&expires_at=lte.${encodeURIComponent(new Date(now).toISOString())}`,
      row, 'PATCH');
    return Array.isArray(updated) && updated.length === 1;
  }
  async releaseLease(key: string, owner: string) {
    await this.call(`api_cache?request_hash=eq.${key}&payload->>owner=eq.${owner}`, undefined, 'DELETE');
  }
}
