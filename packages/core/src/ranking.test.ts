import { describe, expect, it } from 'vitest';
import { createDemoQuery, DEMO_NOW, snapshot } from '@space/fixtures';
import type { Query, Spot } from '@space/contracts';
import { coversSession, rankSpots, type ScoreDiagnostic } from './index';

const base = (): Spot => structuredClone(snapshot.spots[0]!);
const clock = { now: DEMO_NOW };
const rank = (spot: Spot, patch: Partial<Query> = {}) => rankSpots([spot], createDemoQuery(patch), clock);

describe('strict eligibility', () => {
  it('never treats missing price as free', () => {
    const spot = base(); spot.priceLevel.value = null;
    expect(rank(spot, { maxPriceLevel: 0 }).excludedCounts).toEqual({ unknown_price: 1 });
    expect(rank(spot).results).toHaveLength(1);
  });
  it('excludes over-cap price before scoring and proposes an unapplied relaxation', () => {
    const query = createDemoQuery({ maxPriceLevel: 0 });
    const result = rankSpots([base()], query, clock);
    expect(result.results).toEqual([]); expect(result.excludedCounts).toEqual({ price: 1 });
    expect(result.relaxations[0]?.patch).toEqual({ maxPriceLevel: null, limit: 3 });
    expect(query.maxPriceLevel).toBe(0);
  });
  it.each([null, 'unknown', 'no'] as const)('required Wi-Fi excludes %s', (value) => {
    const spot = base(); spot.wifi.value = value;
    expect(rank(spot, { amenities: { wifi: 'require', outlets: 'ignore' } }).excludedCounts).toEqual({ amenity: 1 });
  });
  it('required amenity needs confidence >= 0.7', () => {
    const spot = base(); spot.wifi.confidence = 0.69;
    expect(rank(spot, { amenities: { wifi: 'require', outlets: 'ignore' } }).results).toEqual([]);
  });
  it('enforces categories, walking distance, closure and public access', () => {
    expect(rank(base(), { categories: ['park'] }).excludedCounts).toEqual({ category: 1 });
    const far = base(); far.lat += 1;
    expect(rank(far).excludedCounts).toEqual({ distance: 1 });
    const closed = base(); closed.status = 'permanently_closed';
    expect(rank(closed).excludedCounts).toEqual({ closed: 1 });
    const access = base(); access.publicAccess.value = 'unknown';
    expect(rank(access, { access: 'public_only' }).excludedCounts).toEqual({ access: 1 });
  });
  it('unknown and stale hours cannot satisfy open-for-session', () => {
    const spot = base(); spot.hoursStatus = 'unknown';
    expect(rank(spot, { requireOpenForSession: true }).excludedCounts).toEqual({ unknown_hours: 1 });
    spot.hoursFetchedAt = '2026-10-25T23:00:00Z';
    expect(rank(spot, { requireOpenForSession: true }).excludedCounts).toEqual({ unknown_hours: 1 });
    spot.hoursStatus = 'known'; spot.hoursFetchedAt = '2026-10-22T18:00:00-05:00';
    expect(rank(spot, { requireOpenForSession: true }).excludedCounts).toEqual({ unknown_hours: 1 });
  });
  it('returns no matches honestly', () => {
    const result = rankSpots(snapshot.spots, createDemoQuery({ categories: ['nonexistent'] }), clock);
    expect(result.results).toEqual([]); expect(result.excludedCounts.category).toBe(snapshot.spots.length);
  });
});

describe('timezones and opening intervals', () => {
  it('includes the previous local day overnight interval', () => {
    const spot = base(); spot.weeklyHours = [{ weekday: 6, startMinute: 22 * 60, endMinute: 26 * 60 }];
    expect(coversSession(spot, Date.parse('2026-10-25T01:00:00-05:00'), Date.parse('2026-10-25T02:00:00-05:00'))).toBe(true);
    expect(coversSession(spot, Date.parse('2026-10-25T01:30:00-05:00'), Date.parse('2026-10-25T02:01:00-05:00'))).toBe(false);
  });
  it('uses venue timezone and local-date exceptions', () => {
    const spot = base(); spot.weeklyHours = [{ weekday: 6, startMinute: 18 * 60, endMinute: 20 * 60 }];
    expect(coversSession(spot, Date.parse('2026-10-24T23:00:00Z'), Date.parse('2026-10-25T00:00:00Z'))).toBe(true);
    spot.hoursExceptions = { '2026-10-24': [] };
    expect(coversSession(spot, Date.parse('2026-10-24T23:00:00Z'), Date.parse('2026-10-25T00:00:00Z'))).toBe(false);
  });
  it('requires continuous coverage and supports adjacent intervals', () => {
    const spot = base(); spot.weeklyHours = [{ weekday: 6, startMinute: 1080, endMinute: 1110 },
      { weekday: 6, startMinute: 1110, endMinute: 1140 }];
    expect(coversSession(spot, Date.parse(DEMO_NOW), Date.parse(DEMO_NOW) + 3_600_000)).toBe(true);
    spot.weeklyHours[1]!.startMinute++;
    expect(coversSession(spot, Date.parse(DEMO_NOW), Date.parse(DEMO_NOW) + 3_600_000)).toBe(false);
  });
  it('handles spring-forward real instants and fall-back repeated hours', () => {
    const spot = base(); spot.weeklyHours = [{ weekday: 0, startMinute: 60, endMinute: 240 }];
    expect(coversSession(spot, Date.parse('2026-03-08T01:30:00-06:00'), Date.parse('2026-03-08T03:30:00-05:00'))).toBe(true);
    expect(coversSession(spot, Date.parse('2026-11-01T01:30:00-05:00'), Date.parse('2026-11-01T01:30:00-06:00'))).toBe(true);
  });
});

describe('deterministic scoring', () => {
  it('reports exact normalized score components only for eligible candidates without changing results', () => {
    const diagnostics: ScoreDiagnostic[] = [];
    const query = createDemoQuery({ tagWeights: {}, amenities: { wifi: 'ignore', outlets: 'ignore' }, maxPriceLevel: 1 });
    const instrumented = rankSpots(snapshot.spots, query, clock, (record) => diagnostics.push(record));
    expect(instrumented).toEqual(rankSpots(snapshot.spots, query, clock));
    expect(diagnostics).toHaveLength(instrumented.qualifyingCount);
    for (const record of diagnostics) {
      const features = Object.values(record.components);
      expect(features.reduce((sum, f) => sum + f.weight, 0)).toBeCloseTo(1, 14);
      expect(features.reduce((sum, f) => sum + f.contribution, 0)).toBeCloseTo(record.base, 14);
      expect(features.reduce((sum, f) => sum + f.weight * f.confidence, 0)).toBeCloseTo(record.evidenceCoverage, 14);
      expect(record.score).toBeCloseTo(100 * Math.max(0, Math.min(1, record.base - record.uncertaintyPenalty)), 12);
      expect(record.components.M!.weight).toBe(0); expect(record.components.V!.weight).toBe(0);
    }
    for (const result of instrumented.results) expect(diagnostics.find((d) => d.spotId === result.spotId)!.score).toBe(result.score);
    const none: ScoreDiagnostic[] = [];
    rankSpots(snapshot.spots, createDemoQuery({ categories: ['missing'] }), clock, (record) => none.push(record));
    expect(none).toEqual([]);
  });
  it('bounds every score and normalizes weights when dimensions are irrelevant', () => {
    const result = rankSpots(snapshot.spots, createDemoQuery({ limit: 10, tagWeights: {},
      amenities: { wifi: 'ignore', outlets: 'ignore' } }), clock);
    expect(result.results).toHaveLength(10);
    for (const r of result.results) {
      expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100);
      expect(r.evidenceCoverage).toBeGreaterThanOrEqual(0); expect(r.evidenceCoverage).toBeLessThanOrEqual(1);
    }
  });
  it('orders exact ties by stable ID regardless of input order', () => {
    const a = base(), b = base(); a.id = 'demo:a'; b.id = 'demo:b'; b.providerPlaceId = 'synthetic:b';
    const result = rankSpots([b, a], createDemoQuery(), clock);
    expect(result.results.map((r) => r.spotId)).toEqual(['demo:a', 'demo:b']);
  });
  it('deduplicates provider identities and rejects invalid coordinates', () => {
    const a = base(), b = base(), bad = base(); b.id = 'duplicate'; bad.lat = NaN;
    expect(rankSpots([a, b, bad], createDemoQuery(), clock).candidateCount).toBe(1);
  });
  it('uses the rating prior, keeps crowd unknown and does not mutate inputs', () => {
    const spot = base(), before = structuredClone(spot);
    const result = rank(spot).results[0]!;
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.warnings).toContain('Typical activity unknown; no seat availability estimate');
    expect(spot).toEqual(before);
    const moreReviews = base(); moreReviews.reviewCount.value = 100_000;
    // Review count alone cannot establish quality or crowd without an actual rating.
    expect(rank(moreReviews).results[0]?.score).toBe(result.score);
  });
  it('ignores live-only observations for future what-if results', () => {
    const a = base(), b = base(); b.liveObservation = { text: 'Busy', observedAt: DEMO_NOW,
      fetchedAt: DEMO_NOW, numericValue: 1 };
    const patch = { departAt: '2026-10-25T18:00:00-05:00' };
    expect(rank(a, patch).results).toEqual(rank(b, patch).results);
  });
  it('study and friends preferences genuinely change the ordering', () => {
    const study = rankSpots(snapshot.spots, createDemoQuery(), clock);
    const friends = rankSpots(snapshot.spots, createDemoQuery({ intent: 'friends', groupSize: 4, targetNoise: 0.65,
      tagWeights: { lively: 1, group_friendly: 1 } }), clock);
    expect(study.results[0]?.spotId).not.toBe(friends.results[0]?.spotId);
    expect(rankSpots(snapshot.spots, createDemoQuery(), clock)).toEqual(study);
  });
});
