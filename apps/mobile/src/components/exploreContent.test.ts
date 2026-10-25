import { describe, expect, it } from 'vitest';
import { crowdHours, crowdSourceLabel, proximityLevel, normalizedFit, observationTime, OPEN_STATUS_LABELS,
  typicalLevel, typicalWording, type TypicalCrowd } from './exploreContent';

const fetchedAt = '2026-10-24T18:00:00-05:00';

describe('historical crowd display normalization', () => {
  it('returns 24 unknown gaps for absent data and missing weekdays', () => {
    expect(crowdHours(null, 6)).toEqual(Array(24).fill(null));
    expect(crowdHours({ source: 'synthetic', fetchedAt, entries: [{ weekday: 5, hour: 9, value: 1 }] }, 6)).toEqual(Array(24).fill(null));
  });

  it('keeps zero distinct from null and missing hours; orders and deduplicates without filling gaps', () => {
    const crowd: TypicalCrowd = { source: 'synthetic', fetchedAt, entries: [
      { weekday: 6, hour: 12, value: 0.8 }, { weekday: 6, hour: 9, value: 0 },
      { weekday: 6, hour: 12, value: null }, { weekday: 6, hour: 3, value: 0.2 },
    ] };
    const before = JSON.stringify(crowd);
    const hours = crowdHours(crowd, 6);
    expect(hours).toHaveLength(24);
    expect(hours[3]).toBe(0.2);
    expect(hours[9]).toBe(0);
    expect(hours[10]).toBeNull();
    expect(hours[12]).toBeNull(); // Last input entry wins even when null.
    expect(JSON.stringify(crowd)).toBe(before);
  });

  it('does not reinterpret invalid input as known low activity', () => {
    const crowd: TypicalCrowd = { source: 'synthetic', fetchedAt, entries: [
      { weekday: 6, hour: 9, value: NaN }, { weekday: 6, hour: 10, value: -1 },
      { weekday: 6, hour: 11, value: 2 }, { weekday: 6, hour: 24, value: 0 },
    ] };
    expect(crowdHours(crowd, 6)).toEqual(Array(24).fill(null));
    expect(crowdHours(crowd, 7)).toEqual(Array(24).fill(null));
  });

  it('uses historical wording and treats zero as quiet', () => {
    expect(typicalWording(0)).toBe('Usually quiet at this hour');
    expect(typicalWording(0.5)).toBe('Usually moderate at this hour');
    expect(typicalWording(1)).toBe('Usually busy at this hour');
    expect(typicalWording(null)).toBe('No typical crowd data for this hour');
    expect(typicalLevel(NaN)).toBe('unknown');
  });

  it('maps all contract source labels without claiming an observation time', () => {
    expect(['serpapi', 'muse', 'curated', 'synthetic'].map((source) => crowdSourceLabel(source as NonNullable<TypicalCrowd>['source'])))
      .toEqual(['Google popular times', 'Estimated by Muse', 'Curated by Nook', 'Demo estimate']);
  });
});

describe('separate observation and display-only status inputs', () => {
  it('uses observedAt when present and explicitly labels the fetched fallback', () => {
    const observation = { text: 'Example', observedAt: '2026-10-24T17:55:00-05:00', fetchedAt, numericValue: null };
    expect(observationTime(observation)).toBe('Observed 2026-10-24T17:55:00-05:00');
    expect(observationTime({ ...observation, observedAt: null })).toBe(`Fetched ${fetchedAt}`);
  });

  it('has all seven supplied status labels, without deriving a status from dates', () => {
    expect(Object.keys(OPEN_STATUS_LABELS)).toEqual(['open', 'closing_soon', 'closed', 'temporarily_closed', 'permanently_closed', 'unknown', 'stale']);
    expect(OPEN_STATUS_LABELS.stale).toBe('Hours may be outdated');
  });

  it('keeps unknown fit separate from a real zero and bounds only the visual input', () => {
    expect(normalizedFit(null)).toBeNull();
    expect(normalizedFit(NaN)).toBeNull();
    expect(normalizedFit(0)).toBe(0);
    expect(normalizedFit(150)).toBe(100);
    expect(normalizedFit(-10)).toBe(0);
  });
});

 it('uses absolute proximity bands and keeps missing/invalid walks unknown', () => {
   expect([0, 10, 11, 20, 21, 60].map(proximityLevel)).toEqual(['near', 'near', 'medium', 'medium', 'far', 'far']);
   expect([null, undefined, NaN, -1].map(proximityLevel)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
 });
