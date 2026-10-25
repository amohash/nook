import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoQuery } from '@space/fixtures';
import { COLD_START_DEADLINE_MS, createApiProvider, fixtureProvider, PlaceNotFoundError } from './providers';

afterEach(() => { vi.unstubAllGlobals(); });

describe('mobile provider recovery', () => {
  it('distinguishes a missing fixture place from an unavailable provider', async () => {
    await expect(fixtureProvider.getSpot('missing')).rejects.toBeInstanceOf(PlaceNotFoundError);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(createApiProvider('https://example.test').getSpot('missing')).rejects.toBeInstanceOf(PlaceNotFoundError);
    await expect(createApiProvider('https://example.test').getSpot('missing', 'nearby-test')).rejects.toBeInstanceOf(PlaceNotFoundError);
  });

  it('keeps a network failure retryable and recovers on the next request', async () => {
    const detail = await fixtureProvider.getSpot('demo:spot-1');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce(Response.json(detail)));
    const api = createApiProvider('https://example.test');
    await expect(api.getSpot(detail.spot.id)).rejects.not.toBeInstanceOf(PlaceNotFoundError);
    await expect(api.getSpot(detail.spot.id)).resolves.toEqual(detail);
  });

  it('rejects malformed successful responses instead of showing invented empty results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ results: [] })));
    const api = createApiProvider('https://example.test');
    await expect(api.getSpot('demo:spot-1')).rejects.toThrow();
    await expect(api.recommend(createDemoQuery())).rejects.toThrow();
  });
});

describe('runtime provider boundary', () => {
  it('exchanges tester access once and scopes authenticated reads without putting secrets in URLs', async () => {
    const token = 't'.repeat(32);
    const mock = vi.fn().mockResolvedValueOnce(Response.json({schemaVersion: 1, sessionId: token, expiresAt: '2026-10-25T10:00:00Z'}))
      .mockResolvedValueOnce(Response.json({schemaVersion: 1, cityId: 'us-tx-austin', mode: 'live', datasetVersion: 'nearby-test',
        fetchedAt: '2026-10-25T07:00:00Z', spots: []}));
    vi.stubGlobal('fetch', mock);
    const api = createApiProvider('https://example.test');
    await api.createTesterSession!({accessCode: 'private-test-code'});
    await api.listSpots('us-tx-austin', 'nearby-test');
    expect(mock.mock.calls[0]![0]).toBe('https://example.test/v1/tester-sessions');
    expect(mock.mock.calls[1]![0]).toBe('https://example.test/v1/discovery/nearby-test');
    expect(mock.mock.calls[1]![1].headers.Authorization).toBe(`Bearer ${token}`);
    expect(mock.mock.calls[1]![1].body).toBeUndefined();
  });

  it('sends the exact selected origin through validated discovery and rejects malformed state', async () => {
    const mock = vi.fn().mockResolvedValue(Response.json({status: 'ready', snapshotId: null}));
    vi.stubGlobal('fetch', mock);
    const api = createApiProvider('https://example.test');
    const origin = {lat: 30.29, lng: -97.73, source: 'device' as const};
    await expect(api.discover!({sessionId: 't'.repeat(32), origin, refresh: true})).rejects.toThrow();
    expect(JSON.parse(mock.mock.calls[0]![1].body)).toEqual({sessionId: 't'.repeat(32), origin, refresh: true});
  });

  it('rejects an unsafe assistant filter patch before the UI can offer it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({schemaVersion: 1, requestId: 'r', status: 'ready',
      text: 'Change your origin', references: [], proposedQueryPatch: {origin: {lat: 0, lng: 0, source: 'manual'}}})));
    await expect(createApiProvider('https://example.test').assist!({sessionId: 't'.repeat(32), snapshotId: 'nearby-test',
      query: createDemoQuery(), message: 'Find a place', placeIds: []})).rejects.toThrow();
  });

  describe('cold-start tolerance', () => {
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
    const slowFetch = (delayMs: number, body: unknown) => vi.fn().mockImplementation(() =>
      new Promise<Response>((resolve) => setTimeout(() => resolve(Response.json(body)), delayMs)));

    it('waits out a sleeping server on the first city lookup instead of failing at 8 seconds', async () => {
      vi.useFakeTimers();
      const cities = { schemaVersion: 1, cities: [{ id: 'us-tx-austin', name: 'Austin', lat: 30.2862, lng: -97.7394,
        timezone: 'America/Chicago', mode: 'cached', datasetVersion: 'austin-v1' }] };
      vi.stubGlobal('fetch', slowFetch(32_000, cities));
      const result = createApiProvider('https://example.test').listCities();
      await vi.advanceTimersByTimeAsync(32_000);
      await expect(result).resolves.toHaveLength(1);
    });

    it('still gives up on a city lookup that never answers, within the cold-start allowance', async () => {
      vi.useFakeTimers();
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(() => undefined)));
      const result = createApiProvider('https://example.test').listCities();
      const assertion = expect(result).rejects.toThrow('API timed out');
      await vi.advanceTimersByTimeAsync(COLD_START_DEADLINE_MS + 1);
      await assertion;
    });

    it('keeps every other request on the normal 8 second deadline', async () => {
      vi.useFakeTimers();
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(() => undefined)));
      const result = createApiProvider('https://example.test').listSpots('us-tx-austin');
      const assertion = expect(result).rejects.toThrow('API timed out');
      await vi.advanceTimersByTimeAsync(8_001);
      await assertion;
    });
  });
});
