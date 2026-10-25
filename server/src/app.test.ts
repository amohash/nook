import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiErrorSchema, HealthSchema, RecommendationSchema } from '@space/contracts';
import { createDemoQuery, DEMO_NOW, snapshot } from '@space/fixtures';
import { rankSpots } from '@space/core';
import { createApiProvider, fixtureProvider } from '../../apps/mobile/src/data/providers';
import { createApp } from './app';

let server: Server;
let baseUrl: string;
beforeAll(async () => {
  server = await new Promise<Server>((resolve) => {
    const instance = createApp({ commit: 'test-commit' }).listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())); });

describe('shared mobile / Node imports and API boundary', () => {
  it('serves the exact health contract with the configured commit', async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(HealthSchema.parse(await response.json())).toEqual({ status: 'ok', contractVersion: 1, commit: 'test-commit' });
  });
  it('validates the snapshot and detail through both providers', async () => {
    const api = createApiProvider(baseUrl);
    expect(await api.listCities()).toEqual(await fixtureProvider.listCities());
    expect(await api.listSpots(snapshot.cityId)).toEqual(await fixtureProvider.listSpots(snapshot.cityId));
    expect(await api.getSpot(snapshot.spots[0]!.id)).toEqual(await fixtureProvider.getSpot(snapshot.spots[0]!.id));
  });
  it('produces identical ranks through pure core, fixture provider and HTTP provider', async () => {
    const query = createDemoQuery();
    const direct = rankSpots(snapshot.spots, query, { now: DEMO_NOW });
    const local = await fixtureProvider.recommend(query);
    const remote = await createApiProvider(baseUrl).recommend(query);
    expect(RecommendationSchema.safeParse(remote).success).toBe(true);
    expect(remote.results).toEqual(local.results);
    expect(remote.results.map(({ spot: _spot, ...rank }) => rank)).toEqual(direct.results);
    expect(remote.mode).toBe('demo');
    expect(remote.metrics.externalCalls).toBe(0);
  });
  it('returns 200 with an empty result set rather than silently relaxing constraints', async () => {
    const result = await createApiProvider(baseUrl).recommend(createDemoQuery({ categories: ['missing'] }));
    expect(result.results).toEqual([]); expect(result.excludedCounts.category).toBe(snapshot.spots.length);
  });
  it.each(['/missing', '/v1/spots/missing', '/v1/cities/missing/spots'])(
    'returns a safe 404 for %s', async (path) => {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(404); expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('not_found');
    });
  it.each(['{"bad":true}', '{invalid-json', JSON.stringify({ padding: 'x'.repeat(33_000) })])(
    'rejects invalid or oversized bodies', async (body) => {
      const response = await fetch(`${baseUrl}/v1/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      expect(response.status).toBe(400); expect(ApiErrorSchema.safeParse(await response.json()).success).toBe(true);
    });
  it('does not return fixture data for unknown cities', async () => {
    await expect(createApiProvider(baseUrl).recommend(createDemoQuery({ cityId: 'missing' }))).rejects.toThrow('City not found');
    await expect(createApiProvider(baseUrl).getSpot('missing')).rejects.toThrow('Place not found');
  });
});
