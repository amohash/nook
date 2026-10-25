// Read-only operator verification. No provider, model, database, or publication imports.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { CitiesSchema, HealthSchema, QuerySchema, RecommendationSchema, SnapshotSchema,
  SpotDetailSchema } from '@space/contracts';
import { rankSpots } from '@space/core';
import { createDemoQuery } from '@space/fixtures';
import { DatasetSchema } from '../data/dataset';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const index = arg.indexOf('=');
  return [arg.slice(2, index), arg.slice(index + 1)];
}));
assert(args.base && args.dataset && args.commit && args.report,
  'Required: --base=HTTPS_URL --dataset=PATH --commit=SHA --report=PATH');
const base = new URL(args.base);
assert(base.protocol === 'https:' && !base.username && !base.password && !base.search && !base.hash);
const bytes = await readFile(args.dataset);
const dataset = DatasetSchema.parse(JSON.parse(bytes.toString()));
const measurements: { operation: string; status: number; durationMs: number }[] = [];
async function request(path: string, operation: string, body?: unknown) {
  const started = performance.now();
  const response = await fetch(new URL(path, base), {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90_000),
  });
  const value: unknown = await response.json();
  measurements.push({ operation, status: response.status, durationMs: performance.now() - started });
  assert.equal(response.status, 200, operation);
  return value;
}
const health = HealthSchema.parse(await request('/health', 'first-health-idle-state-unknown'));
assert.equal(health.commit, args.commit);
HealthSchema.parse(await request('/health', 'warm-health'));
const cities = CitiesSchema.parse(await request('/v1/cities', 'cities'));
assert.deepEqual(cities.cities, [dataset.city]);
const snapshot = SnapshotSchema.parse(await request(`/v1/cities/${dataset.city.id}/spots`, 'snapshot'));
assert.deepEqual(snapshot, dataset.snapshot);
for (const expected of dataset.details) {
  const detail = SpotDetailSchema.parse(await request(`/v1/spots/${encodeURIComponent(expected.spot.id)}`, 'detail'));
  assert.deepEqual(detail, expected);
}
const query = QuerySchema.parse(createDemoQuery({ cityId: dataset.city.id,
  origin: { lat: 30.2862, lng: -97.7394, source: 'manual' }, departAt: new Date().toISOString() }));
const variants = [query, { ...query, maxPriceLevel: 0 },
  { ...query, amenities: { wifi: 'require', outlets: 'ignore' } },
  { ...query, amenities: { wifi: 'ignore', outlets: 'require' } },
  { ...query, access: 'public_only' }, { ...query, requireOpenForSession: true },
  { ...query, categories: ['unsupported-category'] }, query, query];
const reranks = [];
for (const [index, variant] of variants.entries()) {
  const parsed = QuerySchema.parse(variant);
  const response = RecommendationSchema.parse(await request('/v1/recommendations', `rerank-${index}`, parsed));
  assert.equal(response.mode, snapshot.mode);
  assert.equal(response.datasetVersion, snapshot.datasetVersion);
  assert.equal(response.metrics.externalCalls, 0);
  assert.equal(response.metrics.cacheHits, 0);
  const direct = rankSpots(snapshot.spots, parsed, { now: response.generatedAt });
  assert.deepEqual(response.results.map(({ spot: _spot, ...ranking }) => ranking), direct.results);
  assert.deepEqual(response.excludedCounts, direct.excludedCounts);
  for (const result of response.results) assert.deepEqual(result.spot, snapshot.spots.find((s) => s.id === result.spotId));
  if (index >= 1 && index <= 4 || index === 6) assert.equal(response.results.length, 0);
  reranks.push({ index, qualifyingCount: response.metrics.qualifyingCount,
    externalCalls: response.metrics.externalCalls, cacheHits: response.metrics.cacheHits,
    rankMs: response.metrics.rankMs, excludedCounts: response.excludedCounts });
}
let images = 0;
for (const spot of snapshot.spots) {
  if (!spot.image) continue;
  const url = new URL(spot.image.url);
  assert.equal(url.protocol, 'https:');
  assert(!url.username && !url.password);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  assert(response.ok && response.headers.get('content-type')?.startsWith('image/'));
  assert((await response.arrayBuffer()).byteLength > 0);
  images++;
}
const report = { measuredAt: new Date().toISOString(), base: base.origin, commit: health.commit,
  datasetVersion: snapshot.datasetVersion, cityId: snapshot.cityId, mode: snapshot.mode,
  artifactSha256: createHash('sha256').update(bytes).digest('hex'), places: snapshot.spots.length,
  detailParity: dataset.details.length, imagesHttpVerified: images,
  museSummaries: snapshot.spots.filter((s) => s.summary.source === 'muse' && s.summary.value !== null).length,
  measurements, reranks, providerAttemptsDuringVerification: 0, modelAttemptsDuringVerification: 0,
  coldStart: 'Not measured: initial idle state unknown. First request is not evidence of a cold wake.',
  nativeBehavior: 'Not verified. Image HTTP checks do not establish native rendering or browser decode.' };
await writeFile(args.report, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
