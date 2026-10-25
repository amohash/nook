/** Operator-only live verification. Two named public origins, at most16 planned
 * SerpApi attempts, no retries, durable shared18 ceiling. Never captures GPS. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { DiscoveryResponseSchema, QuerySchema, RecommendationSchema, SpotDetailSchema, SnapshotSchema } from '@space/contracts';
import { rankSpots } from '@space/core';
import { createApp } from '../app';
import { SupabaseStore } from '../data/supabase';
import { createDiscoveryService } from '../discovery/service';
import { createTesterAccess } from '../discovery/access';
import { DatasetSchema } from '../data/dataset';
import { ServiceError } from '../providers/http';

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--authorize-spend') || args.some((a) => a !== '--authorize-spend' && !a.startsWith('--output='))) {
    throw new ServiceError('explicit_authorize_spend_and_output_required', 400);
  }
  const outputArg = args.find((a) => a.startsWith('--output='))?.slice(9);
  if (!outputArg) throw new ServiceError('new_output_directory_required', 400);
  config({ path: process.env.SERVER_ENV_FILE ?? 'server/.env', quiet: true });
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SERPAPI_API_KEY',
    'NEARBY_TESTER_ACCESS_CODE', 'NEARBY_ACCOUNT_BUDGET_KEY'] as const;
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    console.log(JSON.stringify({ status: 'blocked', missing, externalAttempts: 0, retries: 0 }));
    process.exitCode = 1; return;
  }
  const directory = resolve(outputArg);
  await mkdir(directory, { mode: 0o700 }); // Exclusive: rerunning cannot replace prior measurements.
  const db = new SupabaseStore(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const budget = process.env.NEARBY_ACCOUNT_BUDGET_KEY!;
  const readCount = async () => {
    const raw = await db.call(`ingestion_runs?dataset_version=eq.${encodeURIComponent(budget)}&select=attempts&limit=1`);
    if (!Array.isArray(raw)) throw new ServiceError('invalid_budget_ledger');
    const count = raw[0]?.attempts ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > 18) throw new ServiceError('invalid_budget_ledger');
    return count as number;
  };
  const before = await readCount();
  const access = createTesterAccess({ accessCode: process.env.NEARBY_TESTER_ACCESS_CODE! });
  const service = createDiscoveryService({ store: db, apiKey: process.env.SERPAPI_API_KEY!, accountBudgetKey: budget });
  const session = access.exchange(process.env.NEARBY_TESTER_ACCESS_CODE!, 'operator-public-origin-smoke');
  if (!session) throw new ServiceError('tester_session_failed');
  const server = createApp({ nearby: { service, access } }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new ServiceError('smoke_server_failed');
  const base = `http://127.0.0.1:${address.port}`;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${session.sessionId}` };
  const post = async (path: string, body: unknown) => {
    const result = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!result.ok) throw new ServiceError('smoke_http_failure');
    return result.json();
  };
  const records: unknown[] = [];
  const origins = [{ name: 'ut-campus', lat: 30.2862, lng: -97.7394 },
    { name: 'downtown-austin', lat: 30.2672, lng: -97.7431 }];
  const identities: string[] = [];
  let externalAttempts = 0;
  try {
    for (const origin of origins) {
      const started = performance.now();
      const input = { sessionId: session.sessionId, origin: { lat: origin.lat, lng: origin.lng, source: 'manual' } };
      const cold = DiscoveryResponseSchema.parse(await post('/v1/discovery', input));
      externalAttempts += cold.metrics.externalAttempts;
      if (!cold.snapshotId || !cold.snapshot?.spots.length || !['ready', 'partial'].includes(cold.status)) throw new ServiceError(`acquisition_${cold.status}`);
      const data = DatasetSchema.parse(await service.getDataset(cold.snapshotId));
      await writeFile(resolve(directory, origin.name + '.json'), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      const coldMs = performance.now() - started;
      const warmStarted = performance.now();
      const warm = DiscoveryResponseSchema.parse(await post('/v1/discovery', input));
      externalAttempts += warm.metrics.externalAttempts;
      if (warm.snapshotId !== cold.snapshotId || warm.metrics.externalAttempts !== 0 || warm.metrics.cacheHits < 1) throw new ServiceError('warm_cache_mismatch');
      const warmMs = performance.now() - warmStarted;
      const snapshot = SnapshotSchema.parse(await (await fetch(base + `/v1/discovery/${cold.snapshotId}`, { headers })).json());
      if (JSON.stringify(snapshot) !== JSON.stringify(cold.snapshot)) throw new ServiceError('directory_snapshot_mismatch');
      for (const spot of snapshot.spots) {
        const detail = SpotDetailSchema.parse(await (await fetch(base + `/v1/discovery/${cold.snapshotId}/places/${encodeURIComponent(spot.id)}`, { headers })).json());
        if (JSON.stringify(detail.spot) !== JSON.stringify(spot)) throw new ServiceError('detail_snapshot_mismatch');
      }
      const generatedAt = new Date().toISOString();
      const query = QuerySchema.parse({ schemaVersion: 1, cityId: 'us-tx-austin', snapshotId: cold.snapshotId,
        origin: { lat: origin.lat, lng: origin.lng, source: 'manual' }, departAt: generatedAt, sessionMinutes: 60,
        categories: [], maxWalkMinutes: 60, maxPriceLevel: null, requireOpenForSession: false,
        intent: 'study', groupSize: 1, targetNoise: 0.15, targetCrowd: 0.25, tagWeights: { quiet: 1, study: 1 },
        amenities: { wifi: 'prefer', outlets: 'prefer' }, access: 'any', limit: 3 });
      const recommendations = [];
      for (const intent of ['study', 'friends'] as const) {
        const selected = { ...query, intent, groupSize: intent === 'friends' ? 4 : 1 };
        const ranked = RecommendationSchema.parse(await post('/v1/recommendations', selected));
        const expected = rankSpots(snapshot.spots, selected, { now: ranked.generatedAt });
        if (ranked.datasetVersion !== cold.snapshotId || ranked.metrics.externalCalls !== 0 ||
          JSON.stringify(ranked.results.map(({ spot: _spot, ...r }) => r)) !== JSON.stringify(expected.results)) throw new ServiceError('recommendation_parity_failure');
        recommendations.push({ intent, datasetVersion: ranked.datasetVersion, metrics: ranked.metrics, ids: ranked.results.map((r) => r.spotId) });
      }
      identities.push(cold.snapshotId);
      records.push({ origin: origin.name, selectedPublicOrigin: { lat: origin.lat, lng: origin.lng },
        snapshotId: cold.snapshotId, places: snapshot.spots.length, coverage: cold.coverage,
        cold: { status: cold.status, metrics: cold.metrics, durationMs: coldMs },
        warm: { status: warm.status, metrics: warm.metrics, durationMs: warmMs }, recommendations });
    }
    const concurrent = await Promise.all(identities.map((id) => service.getDataset(id)));
    if (new Set(identities).size !== 2 || concurrent.some((data, i) => data?.snapshot.datasetVersion !== identities[i])) throw new ServiceError('snapshot_isolation_failure');
    const after = await readCount();
    const report = { status: 'verified', measuredAt: new Date().toISOString(), scope: 'local HTTP with live SerpApi and persistent Supabase cache',
      accountBudgetKey: budget, hardAccountMaximum: 18, hardAcquisitionMaximum: 18,
      accountAttemptsBefore: before, accountAttemptsAfter: after, externalAttempts, retries: 0,
      accountDeltaMatches: after - before === externalAttempts, records,
      deploymentVerified: false, phoneVerified: false, museAttempts: 0 };
    await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ ...report, records: undefined, output: directory }));
    if (after - before !== externalAttempts || after > 18) process.exitCode = 1;
  } catch (error) {
    const after = await readCount().catch(() => null);
    const report = { status: 'failed', code: error instanceof ServiceError ? error.code : 'verification_failed',
      accountAttemptsBefore: before, accountAttemptsAfter: after, externalAttempts, records, retries: 0 };
    await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ status: 'failed', code: report.code, accountAttemptsBefore: before, accountAttemptsAfter: after }));
    process.exitCode = 1;
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}
main().catch((error: unknown) => {
  console.error(JSON.stringify({ status: 'failed', code: error instanceof ServiceError ? error.code : 'verification_setup_failed', externalAttempts: 0 }));
  process.exitCode = 1;
});
