import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiErrorSchema, RecommendationSchema, SnapshotSchema } from '@space/contracts';
import { createApp } from './app';
import { DatasetSchema, demoDataset } from './data/dataset';
import { normalizePlace } from './data/normalize';
import { createDemoQuery, DEMO_NOW } from '@space/fixtures';
import { rankSpots } from '@space/core';

const servers: Server[] = [];
async function start(options: Parameters<typeof createApp>[0] = {}) {
  const server = await new Promise<Server>((resolve) => {
    const instance = createApp(options).listen(0, '127.0.0.1', () => resolve(instance));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => { vi.useRealTimers(); await Promise.all(servers.splice(0).map((s) => new Promise<void>((resolve) => s.close(() => resolve())))); });
describe('read-only snapshot API', () => {
  it('rejects unsupported query parameters and oversized IDs', async () => {
    const base = await start();
    for (const path of ['/v1/cities/demo-austin/spots?refresh=true', `/v1/spots/${'x'.repeat(201)}`]) {
      const res = await fetch(base + path);
      expect(res.status).toBe(400); expect(ApiErrorSchema.safeParse(await res.json()).success).toBe(true);
    }
  });
  it('keeps P1 builds, jobs, auth, social and raw cache inaccessible', async () => {
    const base = await start();
    for (const [path, method] of [['/v1/cities/build', 'POST'], ['/v1/jobs/test', 'GET'],
      ['/v1/api_cache', 'GET'], ['/v1/ratings', 'POST'], ['/v1/profiles', 'POST']]) {
      const res = await fetch(base + path, { method });
      expect(res.status).toBe(404);
    }
  });
  it('serves repeatable snapshots with unchanged capture timestamps', async () => {
    const base = await start();
    const path = `${base}/v1/cities/demo-austin/spots`;
    const first = SnapshotSchema.parse(await (await fetch(path)).json());
    const next = SnapshotSchema.parse(await (await fetch(path)).json());
    expect(first).toEqual(next);
    expect(first).toEqual(demoDataset.snapshot);
  });
  it('mounts C’s real router at the API prefix and preserves the fixed demo clock', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-01-01T12:00:00Z'));
    const base = await start();
    const query = createDemoQuery();
    // Exercise both spellings against the actual production app/router mount.
    for (const suffix of ['', '/']) {
      const response = await fetch(`${base}/v1/recommendations${suffix}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query),
      });
      expect(response.status).toBe(200);
      const result = RecommendationSchema.parse(await response.json());
      expect(result.generatedAt).toBe(DEMO_NOW);
      expect(result.mode).toBe('demo');
      expect(result.datasetVersion).toBe(demoDataset.snapshot.datasetVersion);
      expect(result.requestId).toMatch(/^[a-f0-9-]{36}$/);
      expect(result.results.map(({ spot: _spot, ...ranking }) => ranking))
        .toEqual(rankSpots(demoDataset.snapshot.spots, query, { now: DEMO_NOW }).results);
      expect(result.results[0]!.spot).toEqual(demoDataset.snapshot.spots.find((spot) => spot.id === result.results[0]!.spotId));
    }
  });
  it.each(['cached', 'live'] as const)('uses current server time for %s data without changing source timestamps', async (mode) => {
    const now = '2026-10-25T02:00:00.000Z';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(now));
    // Synthetic provider test payload; this is not a real venue capture.
    const spot = normalizePlace({ place_id: 'test-clock-place', title: 'Test clock cafe',
      address: 'Test address', type: 'Cafe', gps_coordinates: { latitude: 30.2862, longitude: -97.7394 },
    }, '2026-10-24T17:00:00Z', 'austin-clock-test');
    spot.datasetMode = mode;
    const dataset = DatasetSchema.parse({
      city: { ...demoDataset.city, id: spot.cityId, mode, datasetVersion: spot.datasetVersion },
      snapshot: { schemaVersion: 1, cityId: spot.cityId, mode, datasetVersion: spot.datasetVersion,
        fetchedAt: spot.fetchedAt, spots: [spot] },
      details: [{ schemaVersion: 1, spot, evidence: [] }],
    });
    const base = await start({ dataset });
    const query = createDemoQuery({ cityId: spot.cityId });
    for (const expectedNow of [now, '2026-10-25T03:00:00.000Z']) {
      vi.setSystemTime(new Date(expectedNow));
      const response = await fetch(`${base}/v1/recommendations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query),
      });
      expect(response.status).toBe(200);
      const result = RecommendationSchema.parse(await response.json());
      expect(result.generatedAt).toBe(expectedNow);
      expect(result.mode).toBe(mode);
      expect(result.datasetVersion).toBe(spot.datasetVersion);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]!.spot).toEqual(spot);
      expect(result.results.map(({ spot: _spot, ...ranking }) => ranking))
        .toEqual(rankSpots(dataset.snapshot.spots, query, { now: expectedNow }).results);
      expect(result.metrics).toMatchObject({ externalCalls: 0, cacheHits: 0, candidateCount: 1 });
    }
    const stored = SnapshotSchema.parse(await (await fetch(`${base}/v1/cities/${spot.cityId}/spots`)).json());
    expect(stored).toEqual(dataset.snapshot);
  });
});
