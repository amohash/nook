import { z } from '@space/contracts';
import type { CacheEntry, ProviderCache } from '../cache/provider-cache';
import { fetchJson, ServiceError } from '../providers/http';

const CacheRow = z.object({ payload: z.unknown(), fetched_at: z.string(), expires_at: z.string() });
export class SupabaseStore implements ProviderCache {
  private base: URL;
  constructor(url: string, private serviceKey: string) {
    this.base = new URL(url);
    if (this.base.protocol !== 'https:' || !serviceKey || this.base.username || this.base.password) {
      throw new Error('HTTPS Supabase URL and server credential required');
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
    const result = await this.call('rpc/reserve_ingestion_attempt', { version });
    if (result !== true) throw new ServiceError('request_budget_exhausted', 429);
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
