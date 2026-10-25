import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoQuery } from '@space/fixtures';
import { createApiProvider, fixtureProvider, PlaceNotFoundError } from './providers';

afterEach(() => { vi.unstubAllGlobals(); });

describe('mobile provider recovery', () => {
  it('distinguishes a missing fixture place from an unavailable provider', async () => {
    await expect(fixtureProvider.getSpot('missing')).rejects.toBeInstanceOf(PlaceNotFoundError);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(createApiProvider('https://example.test').getSpot('missing')).rejects.toBeInstanceOf(PlaceNotFoundError);
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
