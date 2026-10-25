import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createEvidenceExtractor, MemoryEvidenceCache } from '../ai/extract';
import { normalizePlace } from '../data/normalize';
import { collectReviewEvidence } from '../data/review-evidence';
import { DatasetSchema } from '../data/dataset';
import { publishDataset } from './publish-dataset';

const at = '2026-10-25T02:49:00Z';
const spot = normalizePlace({ place_id: 'test-place', title: 'Test cafe', type: 'Coffee shop', address: 'Test address',
  gps_coordinates: { latitude: 30.2862, longitude: -97.7394 },
}, at, 'austin-muse-test');
const bundle = collectReviewEvidence(spot, { place_id: spot.providerPlaceId, user_reviews: { most_relevant: [
  { description: 'Quiet tables and Wi-Fi.', link: spot.publicPlaceUrl },
] } }, at)!;
const candidate = () => DatasetSchema.parse({ city: { id: spot.cityId, name: 'Austin', lat: spot.lat, lng: spot.lng,
  timezone: spot.timezone, mode: 'cached', datasetVersion: spot.datasetVersion }, snapshot: {
  schemaVersion: 1, cityId: spot.cityId, mode: 'cached', datasetVersion: spot.datasetVersion, fetchedAt: at, spots: [spot] },
  details: [{ schemaVersion: 1, spot, evidence: [] }] });
const complete = () => vi.fn(async () => JSON.stringify({ placeId: spot.id,
  summary: { text: 'Reviews describe quiet tables and Wi-Fi.', evidenceIds: [bundle.source.snippets[0]!.id] },
  tags: [], noise: { value: 0.1, evidenceIds: [bundle.source.snippets[0]!.id] },
  groupFriendly: { value: null, evidenceIds: [] }, wifi: { value: 'yes', evidenceIds: [bundle.source.snippets[0]!.id] },
  outlets: { value: 'unknown', evidenceIds: [] },
}));

describe('pre-publication extraction integration', () => {
  it('applies C’s validated extraction and selected citations before publish while preserving source facts', async () => {
    const db = { call: vi.fn(async () => true) }, input = candidate();
    const result = await publishDataset(input, db, { loadEvidence: async () => bundle,
      extract: createEvidenceExtractor({ complete: complete(), cache: new MemoryEvidenceCache(), now: () => at }) });
    expect(result.ready).toBe(1); expect(result.unavailable).toBe(0);
    expect(result.dataset.snapshot.spots[0]!.wifi).toMatchObject({ value: 'yes', source: 'muse', confidence: 0.7 });
    expect(result.dataset.details[0]!.spot).toEqual(result.dataset.snapshot.spots[0]);
    expect(result.dataset.details[0]!.evidence).toEqual([{ ...bundle.source.snippets[0], sourceUrl: spot.publicPlaceUrl }]);
    expect(result.dataset.snapshot.spots[0]!.fetchedAt).toBe(at);
    expect(input.snapshot.spots[0]!.wifi.value).toBe('unknown');
    expect(db.call).toHaveBeenCalledWith('rpc/publish_dataset', { dataset: result.dataset });
  });
  it('never runs extraction without evidence and preserves unknowns on failures or persistence failure', async () => {
    const input = candidate(), provider = complete();
    const db = { call: vi.fn(async () => true) };
    const extract = vi.fn(async () => ({ status: 'unavailable' as const, record: null, externalCalls: 0, cacheHits: 0, durationMs: 0 }));
    const missing = await publishDataset(input, db, { loadEvidence: async () => undefined, extract });
    expect(missing.missingEvidence).toBe(1); expect(extract).not.toHaveBeenCalled();
    const failed = await publishDataset(input, db, { loadEvidence: async () => bundle,
      extract: async () => { throw new Error('private upstream response'); } });
    expect(failed.unavailable).toBe(1); expect(failed.dataset).toEqual(input);
    const storageFailure = await publishDataset(input, db, { loadEvidence: async () => bundle,
      extract: createEvidenceExtractor({ complete: provider, cache: { get: async () => undefined, set: async () => { throw new Error('private storage error'); } } }) });
    expect(storageFailure.unavailable).toBe(1); expect(storageFailure.dataset).toEqual(input);
    expect(await publishDataset(input, db)).toMatchObject({ ready: 0, dataset: input });
  });
  it('rejects stale-source records and foreign citations before any inferred values enter publication', async () => {
    const extract = createEvidenceExtractor({ complete: complete(), cache: new MemoryEvidenceCache() });
    const valid = await extract(bundle.source);
    for (const mutation of ['source', 'citation'] as const) {
      const invalid = structuredClone(valid);
      if (mutation === 'source') invalid.record!.sourceHash = createHash('sha256').update('wrong').digest('hex');
      else invalid.record!.output.summary.evidenceIds = ['invented'];
      const result = await publishDataset(candidate(), { call: vi.fn(async () => true) }, {
        loadEvidence: async () => bundle, extract: async () => invalid,
      });
      expect(result.unavailable).toBe(1); expect(result.dataset).toEqual(candidate());
    }
  });
});
