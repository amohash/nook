import { afterEach, describe, expect, it, vi } from 'vitest';
import artifact from '../../../../fixtures/data/austin-20261025-muse-v1.json';
import { CitySchema, SnapshotSchema, type DataProvider, type Query, type Snapshot } from '@space/contracts';
import { cities, createDemoQuery, DEMO_NOW, snapshot as demoSnapshot } from '@space/fixtures';
import { rankSpots } from '@space/core';
import { createApiProvider, fixtureProvider, publicApiBase } from './providers';
import { createRecoveryProvider, queryAfterSwitch, StaleProviderError, validateRealBundle } from './recovery';
import { createInitialQuery } from './initialQuery';

const city = CitySchema.parse(artifact.city);
const snapshot = SnapshotSchema.parse(artifact.snapshot);
const validBundle = {version: 1 as const, city, snapshot};
function setup(raw: string | null = null) {
  let saved = raw;
  const storage = {getItem: vi.fn(async () => saved), setItem: vi.fn(async (_: string, value: string) => {saved = value;})};
  const api: DataProvider = {
    listCities: vi.fn(async () => [city]), listSpots: vi.fn(async () => snapshot),
    recommend: vi.fn(async () => {throw new Error('API down');}),
    getSpot: vi.fn(async () => ({schemaVersion: 1 as const, spot: snapshot.spots[0]!, evidence: []})),
  };
  const controller = createRecoveryProvider({api, demo: fixtureProvider, storage, cacheKey: 'test-cache', initialChoice: 'api', now: () => DEMO_NOW});
  return {controller, api, storage};
}
afterEach(() => {vi.useRealTimers(); vi.unstubAllGlobals();});

describe('explicit offline recovery', () => {
  it('keeps outage in API mode until user chooses cached real data, then reranks with the shared scorer', async () => {
    const {controller, api, storage} = setup();
    await controller.ready;
    await controller.provider.listCities();
    const query = createInitialQuery(city, DEMO_NOW);
    query.maxWalkMinutes = 60;
    await expect(controller.provider.recommend(query)).rejects.toThrow('API down');
    expect(controller.getState().choice).toBe('api');
    await controller.switchTo('cached');
    const result = await controller.provider.recommend(query);
    const expected = rankSpots(snapshot.spots, query, {now: DEMO_NOW});
    expect(result.results.map(({spotId, score}) => ({spotId, score}))).toEqual(expected.results.map(({spotId, score}) => ({spotId, score})));
    expect(result.mode).toBe('cached');
    expect(result.results.every((r) => r.spot.datasetMode === 'cached')).toBe(true);
    expect(result.metrics.externalCalls).toBe(0);
    expect(api.recommend).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(storage.setItem.mock.calls[0]![1]);
    expect(Object.keys(stored)).toEqual(['version', 'city', 'snapshot']);
    expect(JSON.stringify(stored)).not.toContain('origin');
    expect((await controller.provider.listSpots(city.id)).fetchedAt).toBe(snapshot.fetchedAt);
    const detail = await controller.provider.getSpot(snapshot.spots[0]!.id);
    expect(detail.spot.summary).toEqual(snapshot.spots[0]!.summary);
    expect(detail.evidence).toEqual([]);
  });

  it('can choose bundled demo even if device storage never settles', async () => {
    const {api} = setup();
    const controller = createRecoveryProvider({api, demo: fixtureProvider,
      storage: {getItem: () => new Promise(() => {}), setItem: async () => {}},
      cacheKey: 'stalled', initialChoice: 'api'});
    await controller.switchTo('demo');
    expect((await controller.provider.recommend(createDemoQuery())).mode).toBe('demo');
  });

  it('recovers a persisted dataset at cold offline startup without contacting the API', async () => {
    const {controller, api} = setup(JSON.stringify(validBundle));
    vi.mocked(api.listCities).mockRejectedValue(new Error('Offline'));
    await controller.ready;
    await expect(controller.provider.listCities()).rejects.toThrow('Offline');
    expect(controller.getState().cached?.fetchedAt).toBe(snapshot.fetchedAt);
    await controller.switchTo('cached');
    expect(await controller.provider.listCities()).toEqual([{...city, mode: 'cached'}]);
    expect(api.listSpots).not.toHaveBeenCalled();
  });

  it.each(['{broken', JSON.stringify({...validBundle, version: 99}), JSON.stringify({version: 1, city: cities[0], snapshot: demoSnapshot}),
    JSON.stringify({...validBundle, snapshot: {...snapshot, datasetVersion: 'wrong'}})])('rejects invalid cache and requires an explicit demo choice (%#)', async (raw) => {
    const {controller} = setup(raw);
    await controller.ready;
    expect(controller.getState().cached).toBeNull();
    await expect(controller.switchTo('cached')).rejects.toThrow('No validated');
    expect(controller.getState().choice).toBe('api');
    await controller.switchTo('demo');
    expect((await controller.provider.recommend(createDemoQuery())).mode).toBe('demo');
  });

  it('rejects cross-city, duplicate, mixed-mode and synthetic facts even when schemas are individually valid', () => {
    const modify = (change: (value: typeof validBundle) => void) => {const value = structuredClone(validBundle); change(value); return value;};
    for (const invalid of [
      modify((b) => {b.snapshot.spots[0]!.cityId = 'other';}),
      modify((b) => {b.snapshot.spots.push(b.snapshot.spots[0]!);}),
      modify((b) => {b.snapshot.spots[0]!.datasetMode = 'demo';}),
      modify((b) => {b.snapshot.spots[0]!.noise.source = 'synthetic';}),
    ]) expect(() => validateRealBundle(invalid)).toThrow();
  });

  it.each(['resolve', 'reject'] as const)('discards stale bootstrap %s without writing cache after switching', async (outcome) => {
    const {controller, api, storage} = setup();
    await controller.ready;
    const pending = Promise.withResolvers<Snapshot>();
    vi.mocked(api.listSpots).mockReturnValueOnce(pending.promise);
    const request = controller.provider.listCities();
    const assertion = expect(request).rejects.toBeInstanceOf(StaleProviderError);
    await Promise.resolve();
    await controller.switchTo('demo');
    if (outcome === 'resolve') pending.resolve(snapshot); else pending.reject(new Error('old failure'));
    await assertion;
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(controller.getState().cached).toBeNull();
    expect(controller.getState().choice).toBe('demo');
  });

  it('discards late recommendation and detail responses across a switch and rejects old place IDs', async () => {
    const {controller, api} = setup(JSON.stringify(validBundle));
    await controller.provider.listCities();
    const recommendation = Promise.withResolvers<Awaited<ReturnType<DataProvider['recommend']>>>();
    const detail = Promise.withResolvers<Awaited<ReturnType<DataProvider['getSpot']>>>();
    vi.mocked(api.recommend).mockReturnValueOnce(recommendation.promise);
    vi.mocked(api.getSpot).mockReturnValueOnce(detail.promise);
    const first = expect(controller.provider.recommend(createInitialQuery(city, DEMO_NOW))).rejects.toBeInstanceOf(StaleProviderError);
    const second = expect(controller.provider.getSpot(snapshot.spots[0]!.id)).rejects.toBeInstanceOf(StaleProviderError);
    await controller.switchTo('demo');
    recommendation.resolve(await fixtureProvider.recommend(createDemoQuery()));
    detail.reject(new Error('Late failure'));
    await Promise.all([first, second]);
    await expect(controller.provider.getSpot(snapshot.spots[0]!.id)).rejects.toThrow('Place not found');
    await controller.switchTo('cached');
    await expect(controller.provider.getSpot(demoSnapshot.spots[0]!.id)).rejects.toThrow('Place not found');
  });

  it('keeps the last-good cache when refreshed API data is invalid; storage write failure leaves a labeled memory copy', async () => {
    const {controller, api, storage} = setup(JSON.stringify(validBundle));
    await controller.ready;
    vi.mocked(api.listSpots).mockResolvedValueOnce({...snapshot, datasetVersion: 'wrong'});
    await expect(controller.provider.listCities()).rejects.toThrow();
    expect(controller.getState().cached?.city.datasetVersion).toBe(city.datasetVersion);
    storage.setItem.mockRejectedValueOnce(new Error('Disk full'));
    await controller.provider.listCities();
    await vi.waitFor(() => expect(controller.getState().cacheWarning).toContain('session only'));
    await controller.switchTo('cached');
    expect((await controller.provider.listSpots(city.id)).datasetVersion).toBe(city.datasetVersion);
  });

  it('preserves all strict constraints and clears device origin/time when switching', async () => {
    const previous: Query = createDemoQuery({origin: {lat: 31, lng: -98, source: 'device'}, maxPriceLevel: 0,
      categories: ['library'], amenities: {wifi: 'require', outlets: 'require'}, requireOpenForSession: true,
      access: 'public_only', sessionMinutes: 180, groupSize: 8});
    const next = queryAfterSwitch(previous, city, createInitialQuery(city, DEMO_NOW));
    expect(next).toEqual({...previous, cityId: city.id, origin: {lat: city.lat, lng: city.lng, source: 'manual'}, departAt: DEMO_NOW});
    const {controller} = setup(JSON.stringify(validBundle));
    await controller.switchTo('cached');
    expect((await controller.provider.recommend(next)).results).toEqual([]);
  });
});

describe('bounded API deadlines', () => {
  it.each(['fetch', 'body'] as const)('times out a stalled %s even if abort is ignored; late results cannot settle it', async (stage) => {
    vi.useFakeTimers();
    const stalled = Promise.withResolvers<never>();
    vi.stubGlobal('fetch', vi.fn(() => stage === 'fetch' ? stalled.promise : Promise.resolve({ok: true, status: 200, json: () => stalled.promise})));
    const request = createApiProvider('https://example.test', 50).listCities();
    const assertion = expect(request).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects credential-bearing configuration and suppresses unsafe remote error text', async () => {
    expect(publicApiBase('https://user:secret@example.test')).toBeNull();
    expect(publicApiBase('https://example.test?key=secret')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({error: {message: 'secret token'}}, {status: 503})));
    await expect(createApiProvider('https://example.test').listCities()).rejects.toThrow('API unavailable');
  });
});
