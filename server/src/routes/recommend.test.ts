import express from 'express';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { RecommendationSchema, type Snapshot } from '@space/contracts';
import { snapshot, createDemoQuery, DEMO_NOW } from '@space/fixtures';
import { rankSpots } from '@space/core';
import { createRecommendationRouter } from './recommend';

let server: Server | undefined;
afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); });
async function request(data: Snapshot | null | (() => Promise<Snapshot>), body = JSON.stringify(createDemoQuery())) {
  const app = express();
  app.use('/v1/recommendations', createRecommendationRouter({ loadSnapshot: typeof data === 'function' ? data : async () => data,
    clock: () => ({ now: DEMO_NOW }) }));
  server = await new Promise<Server>((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No test address');
  return fetch(`http://127.0.0.1:${address.port}/v1/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}
describe('mountable recommendation route', () => {
  it.each(['demo', 'cached', 'live'] as const)('uses the same scorer for %s data', async (mode) => {
    const data = structuredClone(snapshot); data.mode = mode; data.spots.forEach((s) => { s.datasetMode = mode; });
    const response = await request(data); expect(response.status).toBe(200);
    const result = RecommendationSchema.parse(await response.json());
    const direct = rankSpots(data.spots, createDemoQuery(), { now: DEMO_NOW });
    expect(result.results.map(({ spot: _spot, ...ranking }) => ranking)).toEqual(direct.results);
    expect(result.metrics).toMatchObject({ candidateCount: 10, qualifyingCount: 10, externalCalls: 0, cacheHits: 0 });
    expect(result.metrics.rankMs).toBeGreaterThanOrEqual(0);
  });
  it('returns honest empty results and unapplied proposals', async () => {
    const response = await request(snapshot, JSON.stringify(createDemoQuery({ categories: ['missing'], limit: 7 })));
    const result = RecommendationSchema.parse(await response.json());
    expect(result.results).toEqual([]); expect(result.relaxations[0]!.patch).toEqual({ categories: [], limit: 7 });
  });
  it.each(['{bad', JSON.stringify({ wrong: true }), JSON.stringify({ x: 'x'.repeat(33_000) })])('rejects invalid bodies', async (body) => {
    expect((await request(snapshot, body)).status).toBe(400);
  });
  it('returns 404 for an unknown city', async () => { expect((await request(null)).status).toBe(404); });
  it('rejects mixed demo/live snapshots', async () => {
    const data = structuredClone(snapshot); data.spots[0]!.datasetMode = 'live';
    expect((await request(data)).status).toBe(409);
  });
  it('forwards the snapshot identity and rejects a loader returning a different version', async () => {
    const response = await request(snapshot, JSON.stringify(createDemoQuery({ snapshotId: 'different-snapshot' })));
    expect(response.status).toBe(409);
  });
  it('hides storage/provider errors', async () => {
    const response = await request(async () => { throw new Error('private upstream credential'); });
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('credential');
  });
});
