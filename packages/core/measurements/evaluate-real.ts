import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { arch, cpus, platform, release } from 'node:os';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import express from 'express';
import { InstantSchema, QuerySchema, z, type Recommendation } from '@space/contracts';
import { createDemoQuery, DEMO_NOW, snapshot as fictionalSnapshot } from '@space/fixtures';
import { createRecoveryProvider } from '../../../apps/mobile/src/data/recovery';
import { createApiProvider, fixtureProvider } from '../../../apps/mobile/src/data/providers';
import { DatasetSchema, type Dataset } from '../../../server/src/data/dataset';
import { createRecommendationRouter } from '../../../server/src/routes/recommend';
import { rankSpots, type ScoreDiagnostic } from '../src/index';

const InputSchema = z.strictObject({
  clock: InstantSchema,
  baseQuery: QuerySchema,
  cases: z.array(z.strictObject({ label: z.string().min(1).max(80),
    overrides: z.record(z.string(), z.unknown()) })).min(1).max(20),
});
export function parseInput(input: unknown, cityId: string) {
  const parsed = InputSchema.parse(input);
  const cases = parsed.cases.map(({ label, overrides }) => {
    const query = QuerySchema.parse({ ...parsed.baseQuery, ...overrides });
    if (query.cityId !== cityId || query.origin.source !== 'manual') {
      throw new Error('Evaluation requires the dataset city and an explicit manual origin, never device GPS.');
    }
    return { label, query };
  });
  if (parsed.baseQuery.origin.source !== 'manual' || new Set(cases.map(({ label }) => label)).size !== cases.length) {
    throw new Error('Use a manual base origin and unique case labels.');
  }
  return { clock: parsed.clock, cases };
}

export function sourceAges(dataset: Dataset, clock: string) {
  const grouped = new Map<string, { field: string; fetchedAt: string; ageMs: number; count: number }>();
  const add = (field: string, fetchedAt: string | null) => {
    if (fetchedAt === null) return;
    const key = `${field}:${fetchedAt}`;
    const prior = grouped.get(key);
    grouped.set(key, { field, fetchedAt, ageMs: Date.parse(clock) - Date.parse(fetchedAt), count: (prior?.count ?? 0) + 1 });
  };
  add('snapshot', dataset.snapshot.fetchedAt);
  for (const spot of dataset.snapshot.spots) {
    add('spot', spot.fetchedAt);
    add('hours', spot.hoursFetchedAt);
    add('typicalCrowd', spot.typicalCrowd?.fetchedAt ?? null);
    add('liveObservation', spot.liveObservation?.fetchedAt ?? null);
    for (const field of ['priceLevel', 'rating', 'reviewCount', 'noise', 'groupFriendly', 'wifi', 'outlets',
      'publicAccess', 'tags', 'summary'] as const) add(field, spot[field].fetchedAt);
  }
  return [...grouped.values()];
}

export function evidenceCounts(dataset: Dataset) {
  const spots = dataset.snapshot.spots;
  const known = (field: 'priceLevel' | 'noise' | 'groupFriendly' | 'wifi' | 'outlets') =>
    spots.filter((spot) => spot[field].value !== null && spot[field].value !== 'unknown' && spot[field].confidence > 0).length;
  return { price: known('priceLevel'), numericNoise: known('noise'), groupFriendly: known('groupFriendly'),
    wifi: known('wifi'), outlets: known('outlets'), hours: spots.filter((spot) => spot.hoursStatus === 'known').length,
    summaries: spots.filter((spot) => spot.summary.value !== null).length };
}

function semantic(response: Recommendation) {
  return { datasetVersion: response.datasetVersion, generatedAt: response.generatedAt,
    results: response.results.map(({ spot: _spot, ...result }) => result),
    excludedCounts: response.excludedCounts, relaxations: response.relaxations,
    candidateCount: response.metrics.candidateCount, qualifyingCount: response.metrics.qualifyingCount };
}

export async function evaluateDataset(dataset: Dataset, input: ReturnType<typeof parseInput>, samples = 21) {
  DatasetSchema.parse(dataset);
  if (dataset.snapshot.mode === 'demo') throw new Error('Real evaluation cannot relabel fictional data.');
  InstantSchema.parse(input.clock);
  for (const { query } of input.cases) {
    QuerySchema.parse(query);
    if (query.origin.source !== 'manual' || query.cityId !== dataset.city.id) throw new Error('Expected a manual dataset-city query.');
  }
  if (!Number.isInteger(samples) || samples < 1 || samples > 100) throw new Error('Use 1–100 samples.');
  const app = express();
  app.use('/v1/recommendations', createRecommendationRouter({
    loadSnapshot: async (cityId) => cityId === dataset.city.id ? dataset.snapshot : null,
    clock: () => ({ now: input.clock }),
  }));
  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No local API address.');
    const api = createApiProvider(`http://127.0.0.1:${address.port}`);
    const bundle = JSON.stringify({ version: 1, city: dataset.city, snapshot: dataset.snapshot });
    const recovery = createRecoveryProvider({ api, demo: fixtureProvider, initialChoice: 'api', cacheKey: 'evaluation',
      now: () => input.clock, storage: { getItem: async () => bundle,
        setItem: async () => { throw new Error('Evaluation must not write device storage.'); } } });
    await recovery.ready;
    await recovery.switchTo('cached');
    const records = [];
    for (const { label, query } of input.cases) {
      const rawMs = { scorerLocalNode: [] as number[], apiLoopbackRoundTripNode: [] as number[],
        apiReportedRankNode: [] as number[], cachedMobileAdapterInNode: [] as number[],
        cachedReportedRankNode: [] as number[] };
      let baseline: ReturnType<typeof rankSpots> | undefined;
      let scoreComponents: ScoreDiagnostic[] = [];
      for (let sample = 0; sample < samples; sample++) {
        const diagnostics: ScoreDiagnostic[] = [];
        const started = performance.now();
        const direct = rankSpots(dataset.snapshot.spots, query, { now: input.clock },
          (record) => diagnostics.push(record));
        rawMs.scorerLocalNode.push(performance.now() - started);
        const apiStarted = performance.now();
        const remote = await api.recommend(query);
        rawMs.apiLoopbackRoundTripNode.push(performance.now() - apiStarted);
        rawMs.apiReportedRankNode.push(remote.metrics.rankMs);
        const cacheStarted = performance.now();
        const cached = await recovery.provider.recommend(query);
        rawMs.cachedMobileAdapterInNode.push(performance.now() - cacheStarted);
        rawMs.cachedReportedRankNode.push(cached.metrics.rankMs);
        const expected = { datasetVersion: dataset.snapshot.datasetVersion, generatedAt: input.clock,
          results: direct.results, excludedCounts: direct.excludedCounts, relaxations: direct.relaxations,
          candidateCount: direct.candidateCount, qualifyingCount: direct.qualifyingCount };
        if (!isDeepStrictEqual(semantic(remote), expected) || !isDeepStrictEqual(semantic(cached), expected) ||
          (baseline && !isDeepStrictEqual(baseline, direct))) throw new Error(`Ranking parity failed: ${label}`);
        for (const response of [remote, cached]) {
          if (response.metrics.externalCalls !== 0) throw new Error('Unexpected acquisition count.');
          for (const result of response.results) {
            const original = dataset.snapshot.spots.find((spot) => spot.id === result.spotId);
            if (!isDeepStrictEqual({ ...result.spot, datasetMode: dataset.snapshot.mode }, original)) {
              throw new Error('Returned spot differs from the selected snapshot.');
            }
          }
        }
        baseline = direct;
        scoreComponents = diagnostics;
      }
      records.push({ label, query, parity: { scorerApiCached: true, repeatedSamplesStable: true, checkedSamples: samples },
        ranking: baseline!, names: baseline!.results.map((result) => ({ spotId: result.spotId,
          name: dataset.snapshot.spots.find((spot) => spot.id === result.spotId)!.name })),
        scoreComponents, acquisition: { externalCalls: 0, providerOrModelConstructed: false }, rawMs });
    }
    return records;
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

export function fictionalGoldens() {
  return ['study', 'friends'].map((intent) => {
    const query = createDemoQuery(intent === 'friends' ? { intent, groupSize: 4, targetNoise: 0.7,
      targetCrowd: 0.6, tagWeights: { lively: 1, group_friendly: 1 } } : {});
    return { label: `FICTIONAL ${intent}`, datasetVersion: fictionalSnapshot.datasetVersion, clock: DEMO_NOW,
      query, ranking: rankSpots(fictionalSnapshot.spots, query, { now: DEMO_NOW }) };
  });
}

async function main() {
  const [datasetPath, inputPath, ...extra] = process.argv.slice(2);
  if (!datasetPath || !inputPath || extra.length) {
    throw new Error('Usage: npx tsx packages/core/measurements/evaluate-real.ts <artifact.json> <inputs.json>');
  }
  const bytes = await readFile(datasetPath);
  const inputBytes = await readFile(inputPath);
  if (bytes.length > 5_000_000 || inputBytes.length > 100_000) throw new Error('Input too large.');
  const dataset = DatasetSchema.parse(JSON.parse(bytes.toString('utf8')));
  const input = parseInput(JSON.parse(inputBytes.toString('utf8')), dataset.city.id);
  const records = await evaluateDataset(dataset, input);
  console.log(JSON.stringify({ reportVersion: 1, measuredAt: new Date().toISOString(), clock: input.clock,
    measurementScope: 'Local Node only. Loopback HTTP is not deployed network latency. Mobile adapter runs in Node, not on a phone.',
    samplePolicy: '21 sequential samples per case/path; index 0 is first in this process, not a cold process/cache. No latency or savings claims.',
    runtime: { node: process.version, versions: process.versions, platform: platform(), release: release(),
      architecture: arch(), cpu: cpus()[0]?.model ?? 'unknown', logicalCpuCount: cpus().length },
    dataset: { cityId: dataset.city.id, mode: dataset.snapshot.mode, version: dataset.snapshot.datasetVersion,
      sha256: createHash('sha256').update(bytes).digest('hex'), byteLength: bytes.length,
      snapshotSha256: createHash('sha256').update(JSON.stringify(dataset.snapshot)).digest('hex'),
      evidenceCounts: evidenceCounts(dataset), sourceAges: sourceAges(dataset, input.clock) },
    inputSha256: createHash('sha256').update(inputBytes).digest('hex'), records,
    fictionalGoldens: fictionalGoldens(),
    limitations: [
      'Manual public demo origins only; device GPS inputs are rejected and never recorded.',
      'Artifact acquisition timestamps are not observation times; negative source age means a source is after the explicit clock.',
      'No provider/model acquisition. Cache hits in the mobile response mean a loaded local bundle, not avoided paid requests.',
      'Scores are heuristic fit scores, not calibrated quality or factual proof. Unknown facts remain unknown.',
      'Deployment approval is not semantic evidence approval. The separate Muse evidence audit may withhold claims.',
      'Phone performance, deployed network/cold-start latency, battery and savings have not been measured.',
    ] }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('Evaluation failed. Check local artifact, manual query/clock inputs and parity; no partial report is emitted.');
    process.exitCode = 1;
  });
}
