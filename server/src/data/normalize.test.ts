import { describe, expect, it, vi } from 'vitest';
import { coversSession, rankSpots } from '@space/core';
import { createDemoQuery } from '@space/fixtures';
import { SpotSchema } from '@space/contracts';
import { normalizePlace } from './normalize';
import { ProviderPlaceSchema, SerpApi } from '../providers/serpapi';
import { MemoryCache, cacheKey } from '../cache/provider-cache';
import { parseDayHours } from '../providers/serpapi-time';

// Synthetic provider-shaped fixtures, based on public SerpApi examples; these
// are not real Austin captures. Never committed private payloads or review text.
const place = { place_id: 'synthetic-time-place', title: 'Synthetic cafe', address: 'Synthetic address',
  type: 'Cafe', gps_coordinates: { latitude: 30.2862, longitude: -97.7394 }, reviews: 1234 };
const fetchedAt = '2026-10-25T05:00:00+00:00';
const version = 'austin-synthetic-time-test';
const week = { sunday: 'Closed', monday: '7:30–10:30 AM, 12–10:30 PM', tuesday: 'Open 24 hours',
  wednesday: '09:00–17:00', thursday: '9 AM–5 PM', friday: '10\u202fAM–5\u202fAM', saturday: '10PM–2AM' };
const normalize = (fields: Record<string, unknown> = {}) => normalizePlace({ ...place, ...fields }, fetchedAt, version);
const session = (spot: ReturnType<typeof normalize>, start: string, end: string) =>
  coversSession(spot, Date.parse(start), Date.parse(end));

describe('provider to normalized opening evidence', () => {
  it.each(['operating_hours', 'hours'])('preserves %s through provider validation and normalizes the full week', (field) => {
    const input = { ...place, [field]: field === 'hours' ? Object.entries(week).map(([k, v]) => ({ [k]: v })) : week };
    const parsed = ProviderPlaceSchema.parse(input);
    const spot = normalizePlace(parsed, fetchedAt, version);
    expect(SpotSchema.safeParse(spot).success).toBe(true);
    expect(spot.hoursStatus).toBe('known'); expect(spot.hoursFetchedAt).toBe(fetchedAt);
    expect(spot.weeklyHours).toEqual([
      { weekday: 1, startMinute: 450, endMinute: 630 }, { weekday: 1, startMinute: 720, endMinute: 1350 },
      { weekday: 2, startMinute: 0, endMinute: 1440 }, { weekday: 3, startMinute: 540, endMinute: 1020 },
      { weekday: 4, startMinute: 540, endMinute: 1020 }, { weekday: 5, startMinute: 600, endMinute: 1740 },
      { weekday: 6, startMinute: 1320, endMinute: 1560 },
    ]);
    expect(spot.hoursExceptions).toEqual({});
    expect(spot.id).toBe(normalize().id); expect(spot.datasetVersion).toBe(version);
  });
  it.each([undefined, true, 'Open ⋅ Closes 5PM', [], [{ saturday: '10PM–2AM' }],
    { ...week, sunday: 'Hours might differ' }, { ...week, sunday: '9AM–9AM' },
    { ...week, monday: '9AM–5PM, appointment required' }, { ...week, monday: null },
    { ...week, '2026-02-30': 'Closed' }])('leaves absent, partial or ambiguous schedules unknown (%j)', (hours) => {
    const spot = normalize({ hours, operating_hours: typeof hours === 'object' && !Array.isArray(hours) ? hours : undefined,
      open_now: true, hours_last_updated: 'Confirmed 4 weeks ago' });
    expect(spot.hoursStatus).toBe('unknown'); expect(spot.weeklyHours).toEqual([]);
  });
  it('rejects conflicting duplicate days and does not fall back from malformed detail hours', () => {
    const hours = Object.entries(week).map(([k, v]) => ({ [k]: v }));
    expect(normalize({ hours: [...hours, { monday: 'Closed' }] }).hoursStatus).toBe('unknown');
    expect(normalize({ hours: [{ monday: 'unknown' }], operating_hours: week }).hoursStatus).toBe('unknown');
  });
  it('retains explicitly dated closures/overrides without deriving dates from weekdays', () => {
    const spot = normalize({ operating_hours: { ...week, '2026-10-25': 'Closed', '2026-10-26': '11AM–1PM' } });
    expect(spot.hoursExceptions).toEqual({ '2026-10-25': [], '2026-10-26': [{ startMinute: 660, endMinute: 780 }] });
    expect(session(spot, '2026-10-25T01:00:00-05:00', '2026-10-25T01:30:00-05:00')).toBe(false);
    expect(session(spot, '2026-10-26T11:00:00-05:00', '2026-10-26T12:00:00-05:00')).toBe(true);
    expect(session(spot, '2026-10-26T09:00:00-05:00', '2026-10-26T10:00:00-05:00')).toBe(false);
  });
  it('covers overnight sessions using venue timezone, exclusive closing and split-hour gaps', () => {
    const spot = normalize({ operating_hours: week });
    expect(session(spot, '2026-10-25T06:00:00Z', '2026-10-25T07:00:00Z')).toBe(true);
    expect(session(spot, '2026-10-25T06:00:00Z', '2026-10-25T07:01:00Z')).toBe(false);
    expect(session(spot, '2026-10-26T10:00:00-05:00', '2026-10-26T12:30:00-05:00')).toBe(false);
  });
  it('covers repeated and skipped DST hours with the existing time implementation', () => {
    const spot = normalize({ operating_hours: { ...week, sunday: '12AM–3AM' } });
    expect(session(spot, '2026-11-01T01:15:00-05:00', '2026-11-01T01:45:00-06:00')).toBe(true);
    expect(session(spot, '2026-03-08T01:30:00-06:00', '2026-03-08T03:00:00-05:00')).toBe(true);
  });
  it.each(['9–5 PM', '12AM–12AM', '25:00–26:00', '0AM–4AM', '9:70AM–5PM', '9AM–5PM (holiday)', '', '9AM–5PM–6PM'])(
    'does not guess an ambiguous/invalid day: %s', (value) => expect(parseDayHours(value)).toBeNull());
});

describe('historical activity and separate live observations', () => {
  it('preserves zero, null and omitted-hour gaps; never uses historical text as a number', () => {
    const spot = normalize({ popular_times: { graph_results: { sunday: [
      { time: '6 AM', busyness_score: 0 }, { time: '7 AM', busyness_score: null },
      { time: '9 AM', info: 'Usually busy' }, { time: '10 AM', busyness_score: 100 },
      { time: '11 AM', busyness_score: 101 }, { time: '12 PM', busyness_score: '50' },
      { time: '1 PM', busyness_score: -1 }, { time: '2:30 PM', busyness_score: 50 },
      { time: 'nonsense', busyness_score: 50 },
    ] } } });
    expect(spot.typicalCrowd).toEqual({ source: 'serpapi', fetchedAt, entries: [
      { weekday: 0, hour: 6, value: 0 }, { weekday: 0, hour: 7, value: null },
      { weekday: 0, hour: 9, value: null }, { weekday: 0, hour: 10, value: 1 },
      { weekday: 0, hour: 11, value: null }, { weekday: 0, hour: 12, value: null },
      { weekday: 0, hour: 13, value: null },
    ] });
    expect(spot.liveObservation).toBeNull(); expect(spot.groupFriendly.value).toBeNull();
  });
  it('keeps duplicate conflicting hours unknown and rejects malformed/oversized days', () => {
    const spot = normalize({ popular_times: { graph_results: { sunday: [
      { time: '6 AM', busyness_score: 10 }, { time: '6 AM', busyness_score: 50 },
    ], monday: 'busy', tuesday: Array(25).fill({ time: '6 AM', busyness_score: 50 }), unknown: [] } } });
    expect(spot.typicalCrowd?.entries).toEqual([{ weekday: 0, hour: 6, value: null }]);
  });
  it('keeps textual live evidence without manufacturing numeric or observation timestamps', () => {
    const spot = normalize({ popular_times: { current_day: 'sunday', live_hash: {
      info: 'Less busy than usual', time_spent: 'Typically 45 min', observed_at: 'not supported',
    }, graph_results: { sunday: [{ time: '6 AM', busyness_score: 50, info: 'Usually busy' }] } } });
    expect(spot.liveObservation).toEqual({ text: 'Less busy than usual', numericValue: null, observedAt: null, fetchedAt });
    expect(spot.rating.observedAt).toBeNull(); expect(spot.fetchedAt).toBe(fetchedAt);
  });
  it('uses only an explicit current numeric measurement, independently from the historical score', () => {
    const spot = normalize({ popular_times: { current_day: 'sunday', graph_results: { sunday: [
      { time: '6 AM', current: true, busyness_score: 65, live_busyness_score: 15 },
      { time: '7 AM', busyness_score: 30, live_busyness_score: 80 },
    ] } } });
    expect(spot.liveObservation).toEqual({ text: '', numericValue: 0.15, observedAt: null, fetchedAt });
    expect(spot.typicalCrowd?.entries[0]?.value).toBe(0.65);
  });
  it.each([
    [{ time: '6 AM', current: true, live_busyness_score: 0 }],
    [{ time: '6 AM', current: true, live_busyness_score: 10 }, { time: '7 AM', current: true, live_busyness_score: 90 }],
    [{ time: '6 AM', current: true, live_busyness_score: 10 }, { time: '6 AM', busyness_score: 30 }],
    [{ time: '6 AM', current: true, live_busyness_score: 101 }],
  ])('does not select arbitrarily among conflicting/invalid live measurements (%j)', (...rows) => {
    const spot = normalize({ popular_times: { current_day: 'sunday', graph_results: { sunday: rows } } });
    expect(spot.liveObservation?.numericValue ?? null).toBe(rows.length === 1 && rows[0]?.live_busyness_score === 0 ? 0 : null);
  });
  it('accepts a full 168-hour graph without filling missing days or exceeding contract bounds', () => {
    const graph_results = Object.fromEntries(Object.keys(week).map((day) => [day,
      Array.from({ length: 24 }, (_, hour) => ({ time: `${String(hour).padStart(2, '0')}:00`, busyness_score: 50 })),
    ]));
    const spot = normalize({ popular_times: { graph_results } });
    expect(spot.typicalCrowd?.entries).toHaveLength(168); expect(SpotSchema.safeParse(spot).success).toBe(true);
    expect(normalize().typicalCrowd).toBeNull(); expect(normalize().liveObservation).toBeNull();
  });
  it.each([undefined, null, 'busy', {}, { live_hash: { time_spent: '45 minutes' } },
    { graph_results: { sunday: [{ time: '6 AM', live_busyness_score: 60 }] } }])(
    'does not derive crowd/live evidence from reviews, time spent or unsupported data (%j)', (popular_times) => {
      const spot = normalize({ popular_times });
      expect(spot.liveObservation).toBeNull(); expect(spot.noise.value).toBeNull();
      expect(spot.wifi.value).toBe('unknown'); expect(spot.outlets.value).toBe('unknown');
    });
  it('keeps stale hours ineligible and never uses live text/numbers for a future ranking', () => {
    const base = normalize({ operating_hours: week });
    const query = createDemoQuery({ cityId: base.cityId, origin: { lat: base.lat, lng: base.lng, source: 'manual' },
      departAt: '2026-10-27T14:00:00Z', requireOpenForSession: true, maxPriceLevel: null, categories: [] });
    expect(rankSpots([base], query, { now: query.departAt }).excludedCounts).toEqual({ unknown_hours: 1 });
    const withLive = { ...base, liveObservation: { text: 'Busy now', numericValue: 1, observedAt: fetchedAt, fetchedAt } };
    const future = { ...query, requireOpenForSession: false };
    expect(rankSpots([withLive], future, { now: fetchedAt })).toEqual(rankSpots([base], future, { now: fetchedAt }));
  });
  it('retains evidence through a cache-only response and seed-style repeated schema parsing', async () => {
    const cache = new MemoryCache();
    const params = { type: 'place', place_id: place.place_id };
    const key = cacheKey({ ...params, engine: 'google_maps', hl: 'en', gl: 'us' });
    await cache.put(key, { payload: { place_results: { ...place, operating_hours: week,
      popular_times: { live_hash: { info: 'Less busy than usual' } } } }, fetchedAt, expiresAt: '2026-10-26T05:00:00Z' });
    const transport = vi.fn<typeof fetch>();
    const api = new SerpApi({ key: '', authorized: true, maxCalls: 1, cache, transport, now: () => Date.parse(fetchedAt) + 1000 });
    const response = await api.request(params);
    const spot = normalizePlace(ProviderPlaceSchema.parse(response.payload.place_results), response.fetchedAt, version);
    expect(spot.hoursStatus).toBe('known'); expect(spot.liveObservation?.fetchedAt).toBe(fetchedAt);
    expect(api.metrics.externalCalls).toBe(0); expect(transport).not.toHaveBeenCalled();
  });
});
