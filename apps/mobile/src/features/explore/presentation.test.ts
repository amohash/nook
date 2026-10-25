import { describe, expect, it, vi } from 'vitest';
import { createDemoQuery, DEMO_NOW, snapshot } from '@space/fixtures';
import { departureAt, hoursStatus, lookupPlaces, mapsUrl, venueTime } from './presentation';
import { createSettingsStore, defaultSettings, SettingsSchema } from '../../data/settings';

describe('Explore and detail presentation integration', () => {
  it('keeps the venue weekday when Hermes reports weekday text as a literal', () => {
    const original = Intl.DateTimeFormat.prototype.formatToParts;
    const parts = vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockImplementation(function (this: Intl.DateTimeFormat, date) {
      return original.call(this, date).map((part) => part.type === 'weekday' ? {...part, type: 'literal' as const} : part);
    });
    try {
      expect(venueTime(DEMO_NOW, 'America/Chicago')).toMatchObject({weekday: 6, hour: 18});
      expect(venueTime('2026-10-25T05:00:00Z', 'America/Chicago')).toMatchObject({weekday: 0, hour: 0});
    } finally {parts.mockRestore();}
  });
  it('converts instants in the venue timezone, including midnight and DST boundaries', () => {
    expect(venueTime('2026-10-25T05:00:00Z', 'America/Chicago')).toMatchObject({weekday: 0, hour: 0});
    expect(venueTime('2026-11-01T06:30:00Z', 'America/Chicago')).toMatchObject({weekday: 0, hour: 1});
    expect(venueTime('2026-11-01T07:30:00Z', 'America/Chicago')).toMatchObject({weekday: 0, hour: 1});
    expect(venueTime('invalid', 'America/Chicago').hour).toBe(-1);
    expect(venueTime(DEMO_NOW, 'invalid').weekday).toBe(-1);
  });
  it('builds relative-time presets from explicit real or demo clock inputs', () => {
    expect(departureAt(DEMO_NOW, 0)).toBe(new Date(DEMO_NOW).toISOString());
    expect(Date.parse(departureAt(DEMO_NOW, 60)) - Date.parse(DEMO_NOW)).toBe(3_600_000);
    expect(Date.parse(departureAt('2026-10-25T23:30:00Z', 120))).toBe(Date.parse('2026-10-26T01:30:00Z'));
  });
  it('keeps unknown/stale hours and explicit closure statuses distinct', () => {
    const spot = structuredClone(snapshot.spots[0]!);
    expect(hoursStatus({...spot, hoursStatus: 'unknown'}, DEMO_NOW, 60, DEMO_NOW).status).toBe('unknown');
    expect(hoursStatus({...spot, hoursFetchedAt: null}, DEMO_NOW, 60, DEMO_NOW).status).toBe('unknown');
    expect(hoursStatus(spot, DEMO_NOW, 60, '2026-10-25T01:00:00Z').status).toBe('open');
    expect(hoursStatus(spot, DEMO_NOW, 60, '2026-10-27T01:00:00Z').status).toBe('stale');
    expect(hoursStatus(spot, DEMO_NOW, 60, '2020-01-01T00:00:00Z').status).toBe('stale');
    expect(hoursStatus({...spot, status: 'permanently_closed'}, DEMO_NOW, 60, DEMO_NOW).status).toBe('permanently_closed');
  });
  it('reuses core session coverage for dated exceptions and overnight boundaries', () => {
    const spot = structuredClone(snapshot.spots[0]!);
    const now = '2026-10-25T06:30:00Z'; // Sunday 01:30 CDT, weekly overnight spillover.
    spot.hoursFetchedAt = now;
    expect(hoursStatus(spot, now, 15, now).status).toBe('open');
    expect(hoursStatus(spot, now, 60, now).status).toBe('closing_soon');
    spot.hoursExceptions['2026-10-25'] = [];
    expect(hoursStatus(spot, now, 15, now).status).toBe('closed');
  });
  it('does literal bounded lookup without mutating the recommendation input', () => {
    const query = createDemoQuery({categories: ['library'], maxPriceLevel: 0});
    const before = structuredClone(query);
    expect(lookupPlaces(snapshot.spots, '  PAPER lantern ')[0]?.id).toBe(snapshot.spots[0]!.id);
    expect(lookupPlaces(snapshot.spots, '.*')).toEqual([]);
    expect(lookupPlaces(snapshot.spots, '  ')).toEqual([]);
    expect(lookupPlaces(snapshot.spots, 'fictional')).toHaveLength(10);
    expect(query).toEqual(before);
  });
  it('does not offer Maps for fictional places and rejects non-HTTP public links', () => {
    const demo = snapshot.spots[0]!;
    expect(mapsUrl(demo)).toBeNull();
    const real = {...demo, datasetMode: 'cached' as const, publicPlaceUrl: 'https://example.com/place'};
    expect(mapsUrl(real)).toBe(real.publicPlaceUrl);
    expect(mapsUrl({...real, publicPlaceUrl: 'javascript:alert(1)'})).toMatch(/^https:\/\/www.google.com\/maps/);
  });
  it('migrates existing device settings and persists saved IDs without a second store', async () => {
    const legacy = defaultSettings(createDemoQuery());
    const {savedIds: _ids, ...old} = legacy;
    expect(SettingsSchema.parse(old).savedIds).toEqual([]);
    let value: string | null = null;
    const store = createSettingsStore({async getItem() {return value;}, async setItem(_key, next) {value = next;}});
    await store.save('test', {...legacy, savedIds: [snapshot.spots[0]!.id]});
    expect((await store.load('test'))?.savedIds).toEqual([snapshot.spots[0]!.id]);
    await store.save('test', defaultSettings(createDemoQuery()));
    expect((await store.load('test'))?.savedIds).toEqual([]);
  });
});
