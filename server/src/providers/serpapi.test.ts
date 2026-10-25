import { describe, expect, it, vi } from 'vitest';
import { MemoryCache, cacheKey } from '../cache/provider-cache';
import { SerpApi } from './serpapi';
import { normalizePlace, deduplicatePlaces } from '../data/normalize';
import { DatasetSchema, demoDataset } from '../data/dataset';
import { fetchJson } from './http';

// Deliberately synthetic provider-shaped input, not a captured real fixture.
const place = { place_id: 'test-place', data_id: 'test-data', title: 'Test cafe',
  type: 'Coffee shop', address: 'Test address', gps_coordinates: { latitude: 30.286, longitude: -97.74 }, rating: 4.2, reviews: 42 };
const payload = { local_results: [place] };
const params = { q: 'coffee near UT Austin', ll: '@30.2862,-97.7394,14z' };
function setup(overrides: Partial<ConstructorParameters<typeof SerpApi>[0]> = {}) {
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(payload));
  const cache = new MemoryCache();
  const api = new SerpApi({ key: 'test-secret', authorized: true, maxCalls: 16, cache, transport, ...overrides });
  return { api, transport, cache };
}
describe('provider boundary', () => {
  it('counts cold requests, serves cached repeats and preserves capture time', async () => {
    let now = 1000000000000;
    const { api, transport } = setup({ now: () => now });
    const first = await api.request(params);
    now += 1000;
    expect(await api.request(params)).toEqual(first);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(api.metrics).toEqual({ externalCalls: 1, cacheHits: 1, coalesced: 0, failures: 0 });
    now += 86_400_000;
    expect((await api.request(params)).fetchedAt).not.toBe(first.fetchedAt);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('single-flights concurrent identical requests', async () => {
    const { api, transport } = setup();
    await Promise.all(Array.from({ length: 10 }, () => api.request(params)));
    expect(transport).toHaveBeenCalledTimes(1); expect(api.metrics.coalesced).toBe(9);
  });
  it('does not overwrite a previously good cache entry when an expired refresh fails', async () => {
    let now = 1000000000000;
    const { api, transport, cache } = setup({ now: () => now });
    const first = await api.request(params);
    const key = cacheKey({ ...params, engine: 'google_maps', hl: 'en', gl: 'us' });
    const stored = await cache.get(key);
    now += 86_400_001;
    transport.mockResolvedValueOnce(new Response('upstream failure', { status: 500 }));
    await expect(api.request(params)).rejects.toThrow('provider_unavailable');
    expect(await cache.get(key)).toEqual(stored);
    expect((await cache.get(key))?.fetchedAt).toBe(first.fetchedAt);
    expect(api.metrics.externalCalls).toBe(2);
  });
  it('enforces authorization and a hard budget across concurrent different requests', async () => {
    const denied = setup({ authorized: false });
    await expect(denied.api.request(params)).rejects.toMatchObject({ status: 403 });
    expect(denied.transport).not.toHaveBeenCalled();
    const { api, transport } = setup({ maxCalls: 1 });
    const results = await Promise.allSettled([api.request(params), api.request({ q: 'other' })]);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each([429, 500])('does not cache provider HTTP %s or expose secrets', async (status) => {
    const { api, transport } = setup();
    transport.mockImplementation(async () => new Response('test-secret', { status }));
    for (let i = 0; i < 2; i++) await expect(api.request(params)).rejects.toThrow(/^provider_/);
    expect(api.metrics.externalCalls).toBe(2); expect(api.metrics.failures).toBe(2);
    expect(api.metrics.cacheHits).toBe(0);
  });
  it('rejects provider-level errors and malformed JSON instead of caching empty success', async () => {
    const { api, transport } = setup();
    transport.mockResolvedValueOnce(Response.json({ error: 'test-secret' }));
    await expect(api.request(params)).rejects.toThrow('provider_invalid_response');
    transport.mockResolvedValueOnce(new Response('not json'));
    await expect(api.request(params)).rejects.toThrow('provider_unavailable');
    expect(api.metrics.failures).toBe(2);
  });
  it('timeouts abort network work and do not leak upstream exception text', async () => {
    const transport: typeof fetch = (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('test-secret')));
    });
    const { api } = setup({ transport, timeoutMs: 10 });
    await expect(api.request(params)).rejects.toThrow('provider_timeout');
    expect(api.metrics.failures).toBe(1);
  });
  it('bounds response bodies', async () => {
    const transport: typeof fetch = async () => new Response('x'.repeat(4_000_001));
    await expect(fetchJson('https://example.com', {}, 1000, transport)).rejects.toThrow('provider_response_too_large');
  });
  it('canonicalizes cache keys without permitting credentials', () => {
    expect(cacheKey({ b: '2', a: '1' })).toBe(cacheKey({ a: '1', b: '2' }));
    expect(() => cacheKey({ api_key: 'test-secret' })).toThrow();
    expect(cacheKey({ q: 'cafe' })).not.toBe(cacheKey({ q: 'library' }));
  });
  it('briefly caches empty successful searches', async () => {
    let now = 1000000000000;
    const { api, transport } = setup({ now: () => now });
    transport.mockImplementation(async () => Response.json({ local_results: [] }));
    await api.request(params); now += 299_000; await api.request(params);
    expect(transport).toHaveBeenCalledTimes(1);
    now += 1001; await api.request(params); expect(transport).toHaveBeenCalledTimes(2);
  });
});
describe('normalization and snapshot integrity', () => {
  it('preserves identity across captures and keeps unobserved facts unknown', () => {
    const first = normalizePlace(place, '2026-10-25T00:00:00Z', 'austin-test');
    const later = normalizePlace({ ...place, title: 'New name', open_now: true }, '2026-10-26T00:00:00Z', 'austin-next');
    expect(first.id).toBe(later.id);
    expect(first.rating.value).toBe(4.2); expect(first.reviewCount.value).toBe(42);
    expect(first.priceLevel.value).toBeNull(); expect(first.noise.value).toBeNull();
    expect(first.wifi.value).toBe('unknown'); expect(first.rating.observedAt).toBeNull();
    expect(later.hoursStatus).toBe('unknown'); expect(later.weeklyHours).toEqual([]);
    expect(first.publicPlaceUrl).toContain('query_place_id=test-place');
    expect(deduplicatePlaces([first, later])).toEqual([later]);
  });
  it('rejects invalid coordinates and mismatched or duplicate snapshot records', () => {
    expect(() => normalizePlace({ ...place, gps_coordinates: { latitude: 91, longitude: 0 } }, '2026-10-25T00:00:00Z', 'austin-test')).toThrow();
    expect(DatasetSchema.safeParse({ ...demoDataset, city: { ...demoDataset.city, id: 'wrong' } }).success).toBe(false);
    expect(DatasetSchema.safeParse({ ...demoDataset, snapshot: { ...demoDataset.snapshot,
      spots: [demoDataset.snapshot.spots[0], demoDataset.snapshot.spots[0]] } }).success).toBe(false);
  });
});
