import { describe, expect, it } from 'vitest';
import { DEMO_NOW } from '@space/fixtures';
import type { ExtractionRecord } from '../ai/extract';
import { demoDataset, DatasetSchema } from './dataset';
import { applyProjectionReview, ProjectionReviewSchema } from './reviewed-projection';

function scenario() {
  const original = structuredClone(demoDataset);
  const base = original.snapshot.spots[0]!;
  base.outlets = { ...base.outlets, value: 'unknown', confidence: 0 };
  original.details.find((d) => d.spot.id === base.id)!.spot = structuredClone(base);
  const projected = structuredClone(original), spot = projected.snapshot.spots[0]!;
  spot.outlets = { value: 'no', confidence: 0.7, source: 'muse', observedAt: null, fetchedAt: DEMO_NOW, evidenceIds: ['outlet-review'] };
  spot.tags = { value: { date_night: 0.7, cozy: 0.8 }, confidence: 0.7, source: 'muse',
    observedAt: null, fetchedAt: DEMO_NOW, evidenceIds: ['date-review', 'cozy-review'] };
  projected.details.find((d) => d.spot.id === spot.id)!.spot = structuredClone(spot);
  const record: ExtractionRecord = { key: 'a'.repeat(64), sourceHash: 'b'.repeat(64), model: 'test',
    promptVersion: 'test', language: 'en', generatedAt: DEMO_NOW, output: { placeId: spot.id,
      summary: { text: null, evidenceIds: [] }, tags: [
        { tag: 'date_night', weight: 0.7, evidenceIds: ['date-review'] },
        { tag: 'cozy', weight: 0.8, evidenceIds: ['cozy-review'] },
      ], noise: { value: null, evidenceIds: [] }, groupFriendly: { value: null, evidenceIds: [] },
      wifi: { value: 'unknown', evidenceIds: [] }, outlets: { value: 'no', evidenceIds: ['outlet-review'] },
    } };
  const records = new Map([[spot.id, record]]);
  const review = ProjectionReviewSchema.parse({ sourceDatasetVersion: original.snapshot.datasetVersion,
    omissions: [{ placeId: spot.id, field: 'outlets', expectedValue: 'no', reason: 'Few does not establish absence' },
      { placeId: spot.id, field: 'tag', tag: 'date_night', reason: 'Brunch does not establish night-time' }],
  });
  return { original, projected, records, review, spot };
}
describe('conservative projection review', () => {
  it('withholds unsupported claims in both public copies without rewriting the cached model record', () => {
    const s = scenario(), before = structuredClone(s.records.get(s.spot.id));
    const result = DatasetSchema.parse(applyProjectionReview(s.projected, s.original, s.records, s.review));
    expect(result.snapshot.spots[0]!.outlets).toEqual(s.original.snapshot.spots[0]!.outlets);
    expect(result.snapshot.spots[0]!.tags).toMatchObject({ value: { cozy: 0.8 }, evidenceIds: ['cozy-review'] });
    expect(result.details.find((d) => d.spot.id === s.spot.id)!.spot).toEqual(result.snapshot.spots[0]);
    expect(s.records.get(s.spot.id)).toEqual(before);
    expect(s.projected.snapshot.spots[0]!.outlets.value).toBe('no');
  });
  it('cannot introduce a positive amenity or erase a known provider fact', () => {
    const s = scenario();
    expect(ProjectionReviewSchema.safeParse({ ...s.review, omissions: [{ ...s.review.omissions[0], expectedValue: 'yes' }] }).success).toBe(false);
    s.original.snapshot.spots[0]!.outlets.value = 'yes';
    expect(() => applyProjectionReview(s.projected, s.original, s.records, s.review)).toThrow('Review no longer matches');
  });
  it('fails closed when source identity or projected claims have changed', () => {
    const s = scenario();
    expect(() => applyProjectionReview(s.projected, s.original, s.records, { ...s.review, sourceDatasetVersion: 'wrong' })).toThrow('version mismatch');
    delete s.projected.snapshot.spots[0]!.tags.value!.date_night;
    s.projected.details.find((d) => d.spot.id === s.spot.id)!.spot = structuredClone(s.projected.snapshot.spots[0]!);
    expect(() => applyProjectionReview(s.projected, s.original, s.records, s.review)).toThrow('Review tag mismatch');
  });
});
