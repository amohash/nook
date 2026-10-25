import { describe, expect, it } from 'vitest';
import { SpotDetailSchema, SpotSchema } from '@space/contracts';
import { rankSpots } from '@space/core';
import { cities, createDemoQuery, DATASET_VERSION, DEMO_LABEL, DEMO_NOW, getDemoDetail, snapshot } from '@space/fixtures';
import { fixtureProvider } from '../../../apps/mobile/src/data/providers';
import { applyIntentPreset } from '../../../apps/mobile/src/features/explore/filters';

const clock = { now: DEMO_NOW };
describe('honest bundled morning scenario', () => {
  it('keeps every synthetic fact in demo mode, with fictional names and unknown ratings/reviews', () => {
    expect(cities[0]!.mode).toBe('demo'); expect(DEMO_LABEL).toContain('Demo scenario');
    expect(DATASET_VERSION).toBe('fictional-austin-v2'); expect(snapshot.spots).toHaveLength(12);
    for (const spot of snapshot.spots) {
      expect(SpotSchema.safeParse(spot).success).toBe(true);
      expect(spot.datasetMode).toBe('demo'); expect(spot.datasetVersion).toBe(DATASET_VERSION);
      expect(spot.name).toContain('(fictional)'); expect(spot.providerPlaceId).toMatch(/^synthetic:/);
      expect(spot.rating.value).toBeNull(); expect(spot.reviewCount.value).toBeNull();
      expect(spot.summary.source).toBe('synthetic'); expect(spot.image).toBeNull();
      expect(spot.liveObservation).toBeNull();
      expect(SpotDetailSchema.parse(getDemoDetail(spot.id)).spot).toEqual(spot);
    }
  });
  it('changes actual ranking order with the existing Study/Meet Friends controls', async () => {
    const study = createDemoQuery(); const friends = applyIntentPreset(study, 'friends');
    const a = rankSpots(snapshot.spots, study, clock), b = rankSpots(snapshot.spots, friends, clock);
    expect(a.results.map((r) => r.spotId)).toEqual(['demo:spot-1', 'demo:spot-3', 'demo:spot-11']);
    expect(b.results.map((r) => r.spotId)).toEqual(['demo:spot-2', 'demo:spot-12', 'demo:spot-10']);
    expect((await fixtureProvider.recommend(study)).results.map((r) => r.spot.id)).toEqual(a.results.map((r) => r.spotId));
    expect((await fixtureProvider.recommend(friends)).results.map((r) => r.spot.id)).toEqual(b.results.map((r) => r.spotId));
  });
  it('includes both new sites at 15 minutes and excludes them at 10 without relaxing the walk constraint', () => {
    const wide = rankSpots(snapshot.spots, createDemoQuery({ limit: 200 }), clock);
    const narrow = rankSpots(snapshot.spots, createDemoQuery({ maxWalkMinutes: 10, limit: 200 }), clock);
    expect(wide.qualifyingCount).toBe(12); expect(narrow.qualifyingCount).toBe(10);
    for (const id of ['demo:spot-11', 'demo:spot-12']) {
      expect(wide.results.find((r) => r.spotId === id)?.estimatedWalkMinutes).toBe(13);
      expect(narrow.results.some((r) => r.spotId === id)).toBe(false);
    }
    expect(narrow.excludedCounts.distance).toBe(2);
  });
  it('keeps synthetic crowd gaps unknown and new-site price caps strict', () => {
    for (const id of ['demo:spot-11', 'demo:spot-12']) {
      const spot = getDemoDetail(id).spot;
      expect(spot.typicalCrowd?.source).toBe('synthetic');
      expect(spot.typicalCrowd?.entries.find((e) => e.hour === 19)?.value).toBeNull();
      expect(spot.typicalCrowd?.entries.some((e) => e.hour === 21)).toBe(false);
      const result = rankSpots([spot], createDemoQuery({ maxPriceLevel: 1 }), clock);
      expect(result.qualifyingCount).toBe(0); expect(result.excludedCounts.unknown_price).toBe(1);
    }
  });
});
