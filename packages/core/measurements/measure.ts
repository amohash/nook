/** Run: npx tsx packages/core/measurements/measure.ts > packages/core/measurements/baseline.json */
import { createDemoQuery, snapshot, DEMO_NOW } from '@space/fixtures';
import { rankSpots } from '../src/index';
const records = [];
for (const count of [10, 200]) {
  const spots = Array.from({ length: count }, (_, i) => ({ ...structuredClone(snapshot.spots[i % 10]!),
    id: `benchmark:${i}`, providerPlaceId: `synthetic-benchmark:${i}` }));
  for (const requireOpenForSession of [false, true]) {
    const query = createDemoQuery({ requireOpenForSession });
    const samples = [];
    let qualifyingCount = 0;
    for (let i = 0; i < 21; i++) {
      const started = performance.now();
      const result = rankSpots(spots, query, { now: DEMO_NOW });
      samples.push(performance.now() - started); qualifyingCount = result.qualifyingCount;
    }
    const warm = samples.slice(1).sort((a, b) => a - b);
    records.push({ candidateCount: count, qualifyingCount, requireOpenForSession,
      sessionMinutes: query.sessionMinutes, firstRunMs: samples[0], warmMedianMs: (warm[9]! + warm[10]!) / 2, warmP95Ms: warm[18],
      rawMs: samples, externalCalls: 0, cacheHits: 0 });
  }
}
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), runtime: process.version,
  platform: process.platform, architecture: process.arch,
  dataset: 'Synthetic repetitions of ten fictional fixtures; not real venue coverage or phone performance', records }, null, 2));
