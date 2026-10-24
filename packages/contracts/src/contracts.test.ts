import { describe, expect, it } from 'vitest';
import { InstantSchema, QuerySchema, SnapshotSchema, SpotSchema } from './index';
import { createDemoQuery, snapshot } from '@space/fixtures';

describe('contract version 1', () => {
  it('validates every labeled fixture and its provenance', () => {
    expect(SnapshotSchema.parse(snapshot).spots).toHaveLength(10);
    for (const spot of snapshot.spots) {
      expect(spot.datasetMode).toBe('demo');
      expect(spot.name).toContain('(fictional)');
      expect(spot.summary.source).toBe('synthetic');
      expect(spot.rating.value).toBeNull();
    }
  });
  it.each(['2026-02-30T12:00:00Z', '2026-10-24T18:00:00', 'not-a-date'])(
    'rejects invalid or offset-free timestamp %s', (date) => expect(InstantSchema.safeParse(date).success).toBe(false));
  it.each([
    { origin: { lat: NaN, lng: 0, source: 'manual' } },
    { origin: { lat: 91, lng: 0, source: 'manual' } },
    { origin: { lat: 30, lng: Infinity, source: 'manual' } },
    { maxPriceLevel: 5 }, { maxWalkMinutes: 0 }, { sessionMinutes: 241 },
    { intent: 'party' }, { tagWeights: { invented_tag: 1 } },
    { categories: Array.from({ length: 21 }, () => 'cafe') }, { secret: 'not-a-contract-field' },
  ])('rejects invalid query patch %j', (patch) => {
    expect(QuerySchema.safeParse({ ...createDemoQuery(), ...patch }).success).toBe(false);
  });
  it('uses the shared default limit', () => {
    const { limit: _limit, ...input } = createDemoQuery();
    expect(QuerySchema.parse(input).limit).toBe(3);
  });
  it('rejects invalid timezone, malformed intervals and out-of-range evidence', () => {
    const spot = snapshot.spots[0]!;
    expect(SpotSchema.safeParse({ ...spot, timezone: 'Mars/Olympus' }).success).toBe(false);
    expect(SpotSchema.safeParse({ ...spot, weeklyHours: [{ weekday: 0, startMinute: 600, endMinute: 500 }] }).success).toBe(false);
    expect(SpotSchema.safeParse({ ...spot, noise: { ...spot.noise, confidence: 1.1 } }).success).toBe(false);
  });
});
