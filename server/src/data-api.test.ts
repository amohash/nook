import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiErrorSchema, SnapshotSchema } from '@space/contracts';
import { createApp } from './app';
import { demoDataset } from './data/dataset';

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
afterEach(async () => { await Promise.all(servers.splice(0).map((s) => new Promise<void>((resolve) => s.close(() => resolve())))); });
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
  it('mounts an injected recommendation handler without running another scorer', async () => {
    const base = await start({ recommendationHandler: (_req, res) => { res.status(503).json({ from: 'C handler test' }); } });
    const result = await fetch(`${base}/v1/recommendations`, { method: 'POST' });
    expect(result.status).toBe(503); expect(await result.json()).toEqual({ from: 'C handler test' });
  });
});
