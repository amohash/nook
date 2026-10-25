import { z } from '@space/contracts';
import { cacheKey, type ProviderCache } from '../cache/provider-cache';
import { fetchJson, ServiceError } from './http';

export const ProviderPlaceSchema = z.object({
  place_id: z.string().min(1).max(200), data_id: z.string().max(200).optional(),
  title: z.string().min(1).max(160), address: z.string().min(1).max(300),
  gps_coordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  // Search uses a string; place details may return an ordered category array.
  type: z.union([z.string().max(60), z.array(z.string().max(60)).min(1).max(20)])
    .transform((value) => typeof value === 'string' ? value : value[0]).optional(), rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().nonnegative().optional(), price: z.string().max(40).optional(),
  permanently_closed: z.boolean().optional(), temporarily_closed: z.boolean().optional(),
  // An unusable optional photo must not discard an otherwise valid place.
  thumbnail: z.unknown().optional(),
});
export const ProviderResponseSchema = z.object({
  local_results: z.array(z.unknown()).max(200).optional(),
  place_results: z.unknown().optional(), error: z.string().optional(),
});
export type ProviderPlace = z.infer<typeof ProviderPlaceSchema>;
export type ProviderResult = { payload: z.infer<typeof ProviderResponseSchema>; fetchedAt: string };
export class SerpApi {
  readonly metrics = { externalCalls: 0, cacheHits: 0, coalesced: 0, failures: 0 };
  private flights = new Map<string, Promise<ProviderResult>>();
  private reserved = 0;
  constructor(private options: { key: string; cache: ProviderCache; authorized: boolean;
    maxCalls: number; now?: () => number; transport?: typeof fetch; timeoutMs?: number;
    beforeAttempt?: () => Promise<void> }) {
    if (!Number.isInteger(options.maxCalls) || options.maxCalls < 1 || options.maxCalls > 18) throw new Error('Call budget must be 1..18');
  }
  async request(params: Record<string, string>): Promise<ProviderResult> {
    if (!this.options.authorized) throw new ServiceError('spend_not_authorized', 403);
    const canonical = { ...params, engine: 'google_maps', hl: 'en', gl: 'us' };
    const key = cacheKey(canonical);
    const existing = this.flights.get(key);
    if (existing) { this.metrics.coalesced++; return existing; }
    const pending = this.load(key, canonical);
    this.flights.set(key, pending);
    try { return await pending; } finally { this.flights.delete(key); }
  }
  private async load(key: string, params: Record<string, string>): Promise<ProviderResult> {
    const now = this.options.now ?? Date.now;
    const cached = await this.options.cache.get(key);
    if (cached && Date.parse(cached.expiresAt) > now()) {
      const parsed = ProviderResponseSchema.safeParse(cached.payload);
      if (parsed.success && !parsed.data.error) {
        this.metrics.cacheHits++;
        return { payload: parsed.data, fetchedAt: cached.fetchedAt };
      }
    }
    if (!this.options.key) throw new ServiceError('provider_not_configured');
    if (this.reserved >= this.options.maxCalls) throw new ServiceError('request_budget_exhausted', 429);
    this.reserved++;
    const url = new URL('https://serpapi.com/search.json');
    Object.entries({ ...params, api_key: this.options.key }).forEach(([name, value]) => url.searchParams.set(name, value));
    try { await this.options.beforeAttempt?.(); }
    catch (error) { this.reserved--; throw error; }
    this.metrics.externalCalls++; // Count attempts, including timeouts and failures; no automatic retry.
    try {
      const raw = await fetchJson(url, {}, this.options.timeoutMs ?? 4000, this.options.transport);
      const parsed = ProviderResponseSchema.safeParse(raw);
      if (!parsed.success || parsed.data.error || (!parsed.data.local_results && !parsed.data.place_results)) {
        throw new ServiceError('provider_invalid_response');
      }
      const fetchedAt = new Date(now()).toISOString();
      const empty = parsed.data.local_results?.length === 0 && !parsed.data.place_results;
      await this.options.cache.put(key, { payload: parsed.data, fetchedAt,
        expiresAt: new Date(now() + (empty ? 300_000 : 86_400_000)).toISOString() });
      return { payload: parsed.data, fetchedAt };
    } catch (error) {
      this.metrics.failures++;
      if (error instanceof ServiceError) throw error;
      throw new ServiceError('provider_unavailable');
    }
  }
}
