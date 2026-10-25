import { describe, expect, it } from 'vitest';
import type { Recommendation } from '@space/contracts';
import { DEMO_NOW, snapshot } from '@space/fixtures';
import { compactCardDetails } from './compactCardContent';

const spot = snapshot.spots[0]!;
const result: Recommendation['results'][number] = {
  spotId: spot.id, score: 0, evidenceCoverage: 0, estimatedWalkMinutes: 0,
  arrivalAt: DEMO_NOW, reasons: [], warnings: [], spot,
};
describe('compact card facts', () => {
  it('keeps zero walk, rating and review count as real values', () => {
    expect(compactCardDetails({ ...result, spot: { ...spot,
      rating: { ...spot.rating, value: 0 }, reviewCount: { ...spot.reviewCount, value: 0 },
    } })).toEqual({ metadata: 'cafe · 0 min walk · ★ 0 (0)', limited: false });
  });
  it('consolidates missing rating/count without listing unknown facts', () => {
    expect(compactCardDetails(result)).toEqual({ metadata: 'cafe · 0 min walk', limited: true });
  });
  it('retains a known rating when the review count is absent', () => {
    expect(compactCardDetails({ ...result, spot: { ...spot, rating: { ...spot.rating, value: 4.5 } } }))
      .toEqual({ metadata: 'cafe · 0 min walk · ★ 4.5', limited: false });
  });
  it('omits absent category and invalid walking values', () => {
    expect(compactCardDetails({ ...result, estimatedWalkMinutes: NaN, spot: { ...spot, categories: [] } }))
      .toEqual({ metadata: '', limited: true });
  });
});
