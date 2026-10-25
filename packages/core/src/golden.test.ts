import { describe, expect, it } from 'vitest';
import { snapshot, createDemoQuery, DEMO_NOW } from '@space/fixtures';
import { rankSpots, estimatedWalkMinutes, coversSession } from './index';

const clock = { now: DEMO_NOW };
const base = () => structuredClone(snapshot.spots[0]!);
describe('Person C golden constraints and evidence', () => {
  it('accepts exact walk and price limits and excludes the next minute/level', () => {
    const spot = base(); spot.lat += 0.003;
    const walk = estimatedWalkMinutes(createDemoQuery().origin, spot);
    expect(walk).toBeGreaterThanOrEqual(5);
    expect(rankSpots([spot], createDemoQuery({ maxWalkMinutes: walk, maxPriceLevel: 1 }), clock).qualifyingCount).toBe(1);
    expect(rankSpots([spot], createDemoQuery({ maxWalkMinutes: walk - 1 }), clock).excludedCounts).toEqual({ distance: 1 });
    expect(rankSpots([spot], createDemoQuery({ maxPriceLevel: 0 }), clock).excludedCounts).toEqual({ price: 1 });
  });
  it('zero-confidence price cannot satisfy a budget and free is a known value', () => {
    const spot = base(); spot.priceLevel.value = 0;
    expect(rankSpots([spot], createDemoQuery({ maxPriceLevel: 0 }), clock).qualifyingCount).toBe(1);
    spot.priceLevel.confidence = 0;
    expect(rankSpots([spot], createDemoQuery({ maxPriceLevel: 0 }), clock).excludedCounts).toEqual({ unknown_price: 1 });
  });
  it('does not reward zero-confidence numeric or amenity values', () => {
    const spot = base(); spot.groupFriendly.confidence = 0; spot.outlets.confidence = 0;
    const first = rankSpots([spot], createDemoQuery(), clock);
    spot.groupFriendly.value = null; spot.outlets.value = 'unknown';
    expect(rankSpots([spot], createDemoQuery(), clock).results).toEqual(first.results);
  });
  it('caps inferred confidence and does not claim stale noise matches', () => {
    const spot = base(); spot.noise.source = 'muse';
    const score = rankSpots([spot], createDemoQuery(), clock).results[0]!;
    spot.noise.confidence = 0.7;
    expect(rankSpots([spot], createDemoQuery(), clock).results[0]).toEqual(score);
    spot.noise.fetchedAt = '2026-10-01T00:00:00Z';
    expect(rankSpots([spot], createDemoQuery(), clock).results[0]!.reasons.some((r) => r.code === 'atmosphere')).toBe(false);
  });
  it('proposes each amenity independently without clearing the other requirement', () => {
    const spot = base(); spot.wifi.value = 'unknown'; spot.outlets.value = 'unknown';
    const query = createDemoQuery({ amenities: { wifi: 'require', outlets: 'require' } });
    const result = rankSpots([spot], query, clock);
    expect(result.results).toEqual([]);
    expect(result.relaxations.map((r) => r.patch)).toEqual([
      { amenities: { wifi: 'prefer', outlets: 'require' }, limit: 3 }, { amenities: { wifi: 'require', outlets: 'prefer' }, limit: 3 },
    ]);
    expect(query.amenities.wifi).toBe('require');
  });
  it('uses historical arrival-hour crowd rather than live text or review count', () => {
    const spot = base(); spot.lat = createDemoQuery().origin.lat; spot.lng = createDemoQuery().origin.lng;
    spot.typicalCrowd = { source: 'synthetic', fetchedAt: DEMO_NOW, entries: [
      { weekday: 6, hour: 18, value: 0 }, { weekday: 6, hour: 19, value: 1 },
    ] };
    const early = rankSpots([spot], createDemoQuery({ targetCrowd: 0 }), clock).results[0]!;
    const later = rankSpots([spot], createDemoQuery({ targetCrowd: 0, departAt: '2026-10-24T19:00:00-05:00' }), clock).results[0]!;
    expect(early.score).toBeGreaterThan(later.score);
  });
  it('honors a dated closure at midnight over weekly overnight spillover', () => {
    const spot = base(); spot.hoursExceptions['2026-10-25'] = [];
    expect(coversSession(spot, Date.parse('2026-10-24T23:30:00-05:00'), Date.parse('2026-10-25T00:30:00-05:00'))).toBe(false);
    expect(coversSession(spot, NaN, NaN)).toBe(false);
  });
  it('rejects ambiguous clocks and query local times', () => {
    expect(() => rankSpots([base()], createDemoQuery(), { now: '2026-11-01T01:30:00' })).toThrow();
    expect(() => createDemoQuery({ departAt: '2026-11-01T01:30:00' })).toThrow();
  });
  it('normalizes once per query: exact all-unknown baseline except proximity and rating prior', () => {
    const spot = base(); const query = createDemoQuery({ tagWeights: {}, amenities: { wifi: 'ignore', outlets: 'ignore' } });
    spot.lat = query.origin.lat; spot.lng = query.origin.lng;
    spot.noise.value = null; spot.groupFriendly.value = null; spot.priceLevel.value = null;
    // Remaining weights P=.20,A=.30,Q=.10,B=.10,G=.05, sum=.75.
    const expected = 100 * ((0.20 + 0.30 * 0.5 + 0.10 * 0.8 + 0.10 * 0.5 + 0.05 * 0.5) / 0.75 - 0.1 * (1 - 0.20 / 0.75));
    expect(rankSpots([spot], query, clock).results[0]!.score).toBeCloseTo(expected, 10);
  });
  it('ten fictional goldens have fixed study and friends orders', () => {
    const study = rankSpots(snapshot.spots, createDemoQuery(), clock);
    const friends = rankSpots(snapshot.spots, createDemoQuery({ intent: 'friends', groupSize: 4,
      targetNoise: 0.65, tagWeights: { lively: 1, group_friendly: 1 } }), clock);
    expect(study.results.map((r) => r.spotId)).toEqual(['demo:spot-1', 'demo:spot-3', 'demo:spot-5']);
    expect(friends.results.map((r) => r.spotId)).toEqual(['demo:spot-2', 'demo:spot-10', 'demo:spot-6']);
  });
});
