import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { MemoryCache } from '../cache/provider-cache';
import { ServiceError } from '../providers/http';
import { createDiscoveryService, coverageFor, type DiscoveryStore } from './service';
import { createTesterAccess } from './access';
import { createApp } from '../app';
import { DiscoveryResponseSchema, QuerySchema, RecommendationSchema, SpotDetailSchema, AssistantQueryPatchSchema } from '@space/contracts';
import { createDemoQuery } from '@space/fixtures';

class Store extends MemoryCache implements DiscoveryStore {
  attempts = 0; limit = 18;
  leases = new Set<string>();
  async reserveAttempt() { if (this.attempts >= this.limit) throw new ServiceError('request_budget_exhausted', 429); this.attempts++; }
  async claimLease(key: string) { if (this.leases.has(key)) return false; this.leases.add(key); return true; }
  async releaseLease(key: string) { this.leases.delete(key); }
}
const sessionId = 'a'.repeat(64);
const origin = { lat: 30.28623456, lng: -97.73949876, source: 'device' as const };
const categories = ['Coffee shop', 'Library', 'Park', 'Restaurant'];
function provider(counter: { calls: number; fail: boolean; peak: number; active: number }): typeof fetch {
  return async (input) => {
    counter.calls++; counter.active++; counter.peak = Math.max(counter.peak, counter.active);
    await new Promise((resolve) => setTimeout(resolve, 2)); counter.active--;
    if (counter.fail) return Response.json({ error: 'upstream' }, { status: 500 });
    const url = new URL(String(input));
    const center = url.searchParams.get('ll')?.match(/@([^,]+),([^,]+),/);
    const area = center ? `${center[1]},${center[2]}` : url.searchParams.get('place_id')!.split(':')[1]!;
    const index = url.searchParams.get('type') === 'place' ? Number(url.searchParams.get('place_id')!.split(':')[0]) :
      ['cafes', 'libraries', 'parks', 'restaurants'].findIndex((c) => url.searchParams.get('q')!.startsWith(c));
    const [lat, lng] = area.split(',').map(Number);
    const record = { place_id: `${index}:${area}`, data_id: `data:${index}:${area}`, title: `Synthetic provider test ${index}`, address: 'Synthetic test address',
      gps_coordinates: { latitude: lat, longitude: lng }, type: categories[index], rating: 4.2, reviews: 30,
      user_reviews: { most_relevant: [{ description: 'Quiet study tables.', username: 'Test Author', date_iso8601: '2026-10-24T20:00:00Z' }] } };
    return Response.json(url.searchParams.get('type') === 'place' ? { place_results: record } : { local_results: [record] });
  };
}
function setup() {
  const store = new Store();
  let time = Date.parse('2026-10-25T08:00:00Z');
  const count = { calls: 0, fail: false, peak: 0, active: 0 };
  const transport = provider(count);
  const opts = { store, apiKey: 'test-secret', accountBudgetKey: 'austin-runtime-test', now: () => time, transport };
  const service = createDiscoveryService(opts);
  return { store, count, service, opts, advance: (ms: number) => { time += ms; } };
}
describe('bounded runtime acquisition (synthetic provider responses)', () => {
  it('validates coverage, finite coordinates and prohibited filter/assistant identity patches', async () => {
    expect(coverageFor({ lat: 30.34, lng: -97.70 })).not.toBeNull();
    expect(coverageFor({ lat: 30.341, lng: -97.70 })).toBeNull();
    const { service, count } = setup();
    expect((await service.discover({ sessionId, origin: { ...origin, lat: 40 } })).status).toBe('unsupported_area');
    await expect(service.discover({ sessionId, origin: { ...origin, lat: NaN } })).rejects.toThrow();
    await expect(service.discover({ sessionId, origin, categories: ['cafe'] })).rejects.toThrow();
    expect(AssistantQueryPatchSchema.safeParse({ departAt: '2026-10-25T08:00:00Z' }).success).toBe(false);
    expect(count.calls).toBe(0);
  });
  it('cold acquisition counts8 actual attempts, warm repeat counts0 and reuses immutable snapshot', async () => {
    const { service, count, store } = setup();
    const cold = DiscoveryResponseSchema.parse(await service.discover({ sessionId, origin }));
    expect(cold.status).toBe('ready'); expect(cold.snapshot?.spots).toHaveLength(4);
    expect(cold.metrics.externalAttempts).toBe(8); expect(store.attempts).toBe(8);
    const warm = await service.discover({ sessionId, origin });
    expect(warm.snapshotId).toBe(cold.snapshotId); expect(warm.metrics.externalAttempts).toBe(0); expect(warm.metrics.cacheHits).toBe(1);
    expect(count.calls).toBe(8); expect(count.peak).toBeLessThanOrEqual(3);
    const data = await service.getDataset(cold.snapshotId!);
    expect(data?.snapshot).toEqual(cold.snapshot);
    expect(data?.details.map((d) => d.spot)).toEqual(cold.snapshot?.spots);
    expect(data?.snapshot.spots.every((s) => s.rating.observedAt === null && s.priceLevel.value === null && s.wifi.value === 'unknown')).toBe(true);
    expect(JSON.stringify(data)).not.toContain('30.28623456');
    expect(JSON.stringify(data)).not.toContain('97.73949876');
  });
  it('single-flights identical acquisitions and preserves independent concurrent areas', async () => {
    const { service, store } = setup();
    const other = { ...origin, lat: 30.25, lng: -97.76 };
    const [a, repeat, b] = await Promise.all([service.discover({ sessionId, origin }), service.discover({ sessionId, origin }), service.discover({ sessionId, origin: other })]);
    expect(a.snapshotId).toBe(repeat.snapshotId); expect(repeat.metrics.externalAttempts).toBe(0); expect(repeat.metrics.coalesced).toBe(1);
    expect(a.snapshotId).not.toBe(b.snapshotId); expect(a.coverage?.center).not.toEqual(b.coverage?.center);
    expect(a.snapshot?.spots.map((s) => s.id)).not.toEqual(b.snapshot?.spots.map((s) => s.id));
    expect((await service.getDataset(a.snapshotId!))?.snapshot).toEqual(a.snapshot);
    expect((await service.getDataset(b.snapshotId!))?.snapshot).toEqual(b.snapshot);
    expect(store.attempts).toBe(16);
  });
  it('persistent lease prevents duplicate paid acquisitions across service instances', async () => {
    const { service, opts, store } = setup();
    const second = createDiscoveryService(opts);
    const results = await Promise.all([service.discover({ sessionId, origin }), second.discover({ sessionId, origin })]);
    expect(results.some((r) => r.status === 'unavailable' && r.metrics.coalesced === 1)).toBe(true);
    expect(store.attempts).toBe(8);
  });
  it('persistent warm repeat across fresh service instance never renews source time', async () => {
    const { service, opts, advance } = setup();
    const cold = await service.discover({ sessionId, origin }); advance(5000);
    const warm = await createDiscoveryService(opts).discover({ sessionId, origin });
    expect(warm.snapshot).toEqual(cold.snapshot); expect(warm.metrics.sourceOldestAt).toBe(cold.metrics.sourceOldestAt); expect(warm.metrics.externalAttempts).toBe(0);
  });
  it('cooldown and explicit refresh preserve old version and consume shared budget conservatively', async () => {
    const { service, count, advance } = setup();
    const first = await service.discover({ sessionId, origin });
    expect((await service.discover({ sessionId, origin, refresh: true })).snapshotId).toBe(first.snapshotId); expect(count.calls).toBe(8);
    advance(60_001);
    const refreshed = await service.discover({ sessionId, origin, refresh: true });
    expect(refreshed.metrics.externalAttempts).toBe(8); expect(count.calls).toBe(16);
    expect(refreshed.snapshotId).not.toBe(first.snapshotId);
    expect((await service.getDataset(first.snapshotId!))?.snapshot).toEqual(first.snapshot);
    advance(60_001);
    const exhausted = await service.discover({ sessionId, origin, refresh: true });
    expect(exhausted.status).toBe('quota'); expect(count.calls).toBe(18);
    expect(exhausted.metrics.externalAttempts).toBe(2);
  });
  it('upstream failures fall back to original stale area data, with measured attempts', async () => {
    const { service, count, advance } = setup();
    const first = await service.discover({ sessionId, origin });
    advance(86_400_001); count.fail = true;
    const result = await service.discover({ sessionId, origin });
    expect(result.status).toBe('unavailable'); expect(result.snapshot).toEqual(first.snapshot);
    expect(result.metrics.externalAttempts).toBe(4); expect(result.metrics.stale).toBe(true); expect(result.metrics.partialFailures).toBe(4);
    expect(result.metrics.sourceOldestAt).toBe(first.metrics.sourceOldestAt);
  });
  it('shared account exhaustion and missing credentials never become synthetic success', async () => {
    const { opts, store, service, count } = setup(); store.limit = 0;
    const exhausted = await service.discover({ sessionId, origin });
    expect(exhausted.status).toBe('quota'); expect(exhausted.snapshot).toBeNull(); expect(count.calls).toBe(0);
    const missing = await createDiscoveryService({ ...opts, apiKey: '' }).discover({ sessionId, origin });
    expect(missing.status).toBe('unavailable'); expect(missing.snapshot).toBeNull(); expect(count.calls).toBe(0);
  });
  it('empty provider results stay empty, invalid/error responses never cache empty success', async () => {
    const { opts } = setup();
    const empty = await createDiscoveryService({ ...opts, transport: async () => Response.json({ local_results: [] }) }).discover({ sessionId, origin });
    expect(empty.status).toBe('empty'); expect(empty.snapshot?.spots).toEqual([]);
    const broken = await createDiscoveryService({ ...opts, store: new Store(), transport: async () => Response.json({ error: 'safe test' }) }).discover({ sessionId, origin });
    expect(broken.status).toBe('unavailable'); expect(broken.snapshot).toBeNull();
  });
  it('timeouts return explicit timeout state and count every attempt', async () => {
    const { opts } = setup();
    const service = createDiscoveryService({ ...opts, timeoutMs: 5, transport: async (_u, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('abort')), { once: true });
    }) });
    const result = await service.discover({ sessionId, origin });
    expect(result.status).toBe('timeout'); expect(result.snapshot).toBeNull(); expect(result.metrics.externalAttempts).toBe(4);
  });
  it('review evidence reaches existing extraction boundary; AI failure preserves real source facts', async () => {
    const { opts } = setup(); let sources = 0;
    const service = createDiscoveryService({ ...opts, extract: async (source) => {
      sources++; expect(source.snippets.length).toBeGreaterThan(0); expect(JSON.stringify(source)).not.toContain('Test Author');
      return { status: 'unavailable', record: null, externalCalls: 0, cacheHits: 0, durationMs: 0 };
    } });
    const result = await service.discover({ sessionId, origin });
    expect(sources).toBe(4); expect(result.status).toBe('ready');
    expect(result.snapshot?.spots.every((s) => s.summary.value === null && s.rating.value === 4.2)).toBe(true);
    expect(result.warnings.join(' ')).toContain('inference unavailable');
  });
});

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });
async function http() {
  const setupResult = setup();
  const access = createTesterAccess({ accessCode: 'test-operator-code' });
  const server = createApp({ nearby: { service: setupResult.service, access } }).listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const addr = server.address(); if (!addr || typeof addr === 'string') throw new Error('address');
  const base = `http://127.0.0.1:${addr.port}`;
  const post = (path: string, body: unknown, token?: string) => fetch(base + path, { method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const session = await (await post('/v1/tester-sessions', { accessCode: 'test-operator-code' })).json();
  return { ...setupResult, base, post, session };
}
describe('runtime HTTP integration and access', () => {
  it('fails closed for unauthorized spend and snapshot reads; no token leaks', async () => {
    const { post, base, count } = await http();
    expect((await post('/v1/discovery', { sessionId, origin })).status).toBe(401);
    expect((await post('/v1/tester-sessions', { accessCode: 'wrong-code' })).status).toBe(403);
    expect((await fetch(base + '/v1/discovery/nearby-missing')).status).toBe(401);
    expect(count.calls).toBe(0);
  });
  it('detail, recommendations and immutable directory share IDs/version without external rerank calls', async () => {
    const { post, base, session, count } = await http();
    const discovered = DiscoveryResponseSchema.parse(await (await post('/v1/discovery', { sessionId: session.sessionId, origin })).json());
    const headers = { authorization: `Bearer ${session.sessionId}` };
    const directory = await (await fetch(base + `/v1/discovery/${discovered.snapshotId}`, { headers })).json();
    expect(directory).toEqual(discovered.snapshot);
    const spot = discovered.snapshot!.spots[0]!;
    const detail = SpotDetailSchema.parse(await (await fetch(base + `/v1/discovery/${discovered.snapshotId}/places/${encodeURIComponent(spot.id)}`, { headers })).json());
    expect(detail.spot).toEqual(spot);
    const query = QuerySchema.parse({ ...createDemoQuery(), cityId: 'us-tx-austin', origin, snapshotId: discovered.snapshotId, departAt: '2026-10-25T08:00:00Z', categories: [], maxWalkMinutes: 60 });
    expect((await post('/v1/recommendations', query)).status).toBe(401);
    const ranked = RecommendationSchema.parse(await (await post('/v1/recommendations', query, session.sessionId)).json());
    expect(ranked.datasetVersion).toBe(discovered.snapshotId); expect(ranked.metrics.externalCalls).toBe(0);
    expect(ranked.results.every((r) => discovered.snapshot!.spots.some((s) => JSON.stringify(s) === JSON.stringify(r.spot)))).toBe(true);
    expect(count.calls).toBe(8);
    const absent = await post('/v1/recommendations', { ...query, snapshotId: 'nearby-' + '0'.repeat(40) }, session.sessionId);
    expect(absent.status).toBe(404);
    expect((await fetch(base + `/v1/discovery/${discovered.snapshotId}/places/unknown`, { headers })).status).toBe(404);
  });
  it('missing Muse transport yields labeled unavailable while discovery stays usable', async () => {
    const { post, session } = await http();
    const discovery = await (await post('/v1/discovery', { sessionId: session.sessionId, origin })).json();
    const response = await post('/v1/assistant', { sessionId: session.sessionId, snapshotId: discovery.snapshotId,
      message: 'Find quiet study places', placeIds: [], query: { ...createDemoQuery(), cityId: 'us-tx-austin', snapshotId: discovery.snapshotId } });
    expect(response.status).toBe(503); expect((await response.json()).status).toBe('unavailable');
  });
  it('sessions expire and exchange attempts/refreshes are bounded in memory', async () => {
    let time = 0;
    const access = createTesterAccess({ accessCode: 'test-code', now: () => time });
    const token = access.exchange('test-code', 'test-ip')!;
    expect(await access.authorizeSession(token.sessionId)).toBe(true);
    for (let i = 0; i < 3; i++) expect(await access.allowDiscovery(token.sessionId, true)).toBe(true);
    expect(await access.allowDiscovery(token.sessionId, true)).toBe(false);
    time += 1_800_001; expect(await access.authorizeSession(token.sessionId)).toBe(false);
    for (let i = 0; i < 5; i++) expect(access.exchange('bad-code', 'bad-ip')).toBeNull();
    expect(access.exchange('test-code', 'bad-ip')).toBeNull();
  });
});
