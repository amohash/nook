import { describe, expect, it } from 'vitest';
import { QuerySchema, type Query } from '@space/contracts';
import { rankSpots } from '@space/core';
import { createDemoQuery, DEMO_NOW, snapshot } from '@space/fixtures';
import { fixtureProvider } from '../../data/providers';
import { activeFilterCount, applyExploreFilters, applyIntentPreset, resetExploreFilters } from './filters';

describe('Explore query integration', () => {
  it.each(['study', 'friends'] as const)('keeps strict constraints and context when selecting %s', (intent) => {
    const query = createDemoQuery({ categories: ['cafe'], maxPriceLevel: 1, maxWalkMinutes: 5,
      requireOpenForSession: true, amenities: { wifi: 'require', outlets: 'require' }, access: 'public_only' });
    const preset = applyIntentPreset(query, intent);
    expect(QuerySchema.safeParse(preset).success).toBe(true);
    expect(preset).toMatchObject({ categories: query.categories, maxPriceLevel: 1, maxWalkMinutes: 5,
      amenities: query.amenities, access: query.access, requireOpenForSession: true,
      origin: query.origin, cityId: query.cityId, departAt: query.departAt, sessionMinutes: query.sessionMinutes,
      intent, groupSize: intent === 'study' ? 1 : 4 });
    expect(query.intent).toBe('study');
  });

  it('resets every exposed field to documented defaults while retaining query context', () => {
    const query = applyIntentPreset(createDemoQuery({ categories: ['park'], maxPriceLevel: 0,
      maxWalkMinutes: 5, departAt: '2026-10-25T01:00:00Z', sessionMinutes: 90,
      origin: { lat: 30.28, lng: -97.74, source: 'device' }, requireOpenForSession: true,
      amenities: { wifi: 'require', outlets: 'ignore' }, access: 'public_only', limit: 10 }), 'friends');
    const reset = resetExploreFilters(query);
    expect(activeFilterCount(reset)).toBe(0);
    expect(reset).toMatchObject({ categories: [], maxPriceLevel: null, maxWalkMinutes: 15,
      intent: 'study', groupSize: 1, targetNoise: 0.15, tagWeights: { study: 1, quiet: 1 },
      departAt: query.departAt, sessionMinutes: 60, origin: query.origin, requireOpenForSession: false,
      amenities: { wifi: 'prefer', outlets: 'prefer' }, access: 'any', limit: 10, cityId: query.cityId });
    expect(query.categories).toEqual(['park']);
  });

  it('counts changed groups once and ignores tag ordering and zero weights', () => {
    expect(activeFilterCount(createDemoQuery({ tagWeights: { quiet: 1, study: 1, cozy: 0 } }))).toBe(0);
    expect(activeFilterCount(createDemoQuery({ categories: ['cafe', 'park'], maxPriceLevel: 0 }))).toBe(2);
    expect(activeFilterCount(applyIntentPreset(createDemoQuery({ categories: ['cafe'], maxPriceLevel: 1, maxWalkMinutes: 5 }), 'friends'))).toBe(5);
  });

  it.each([
    { groupSize: 8 }, { sessionMinutes: 240 }, { requireOpenForSession: true },
    { amenities: { wifi: 'require', outlets: 'prefer' } },
    { amenities: { wifi: 'prefer', outlets: 'ignore' } }, { access: 'public_only' },
  ] satisfies Partial<Query>[])('counts each new changed group once: %j', (patch) => {
    expect(activeFilterCount(createDemoQuery(patch))).toBe(1);
  });

  it('counts all ten groups and clears their counts on reset', () => {
    const query = applyIntentPreset(createDemoQuery({ categories: ['park'], maxPriceLevel: 0,
      maxWalkMinutes: 5, sessionMinutes: 240, requireOpenForSession: true,
      amenities: { wifi: 'require', outlets: 'require' }, access: 'public_only' }), 'friends');
    expect(activeFilterCount(query)).toBe(10);
    expect(activeFilterCount(resetExploreFilters(query))).toBe(0);
  });

  it('stages edits and reset without mutating applied values; cancel discards the draft', () => {
    const applied = createDemoQuery({ groupSize: 8, sessionMinutes: 240,
      requireOpenForSession: true, amenities: { wifi: 'require', outlets: 'require' }, access: 'public_only' });
    const before = structuredClone(applied);
    let draft: Query | null = QuerySchema.parse(applied);
    draft.amenities.wifi = 'ignore';
    draft.sessionMinutes = 15;
    draft = resetExploreFilters(draft);
    expect(activeFilterCount(draft)).toBe(0);
    expect(applied).toEqual(before);
    draft = null; // Explore dismisses the sheet without applying this draft.
    expect(draft).toBeNull();
    expect(QuerySchema.parse(applied)).toEqual(before); // Reopening starts with applied values.
  });

  it('applies every new field while preserving the latest origin, departure and query context', () => {
    const initial = createDemoQuery();
    const draft = createDemoQuery({ groupSize: 8, sessionMinutes: 240, requireOpenForSession: true,
      amenities: { wifi: 'require', outlets: 'ignore' }, access: 'public_only' });
    const latest = createDemoQuery({ origin: { lat: 30.28, lng: -97.74, source: 'device' },
      departAt: '2026-10-25T01:00:00Z', cityId: 'another-city', limit: 10 });
    const applied = applyExploreFilters(latest, draft);
    expect(applied).toEqual({ ...draft, origin: latest.origin, departAt: latest.departAt,
      cityId: latest.cityId, limit: latest.limit });
    expect(initial).toEqual(createDemoQuery());
    expect(draft.origin).not.toEqual(latest.origin);
    expect(resetExploreFilters(applied)).toEqual({ ...initial, origin: latest.origin,
      departAt: latest.departAt, cityId: latest.cityId, limit: latest.limit });
  });

  it.each([1, 8])('applies contract group boundary %i', (groupSize) => {
    expect(applyExploreFilters(createDemoQuery(), createDemoQuery({ groupSize })).groupSize).toBe(groupSize);
  });
  it.each([15, 240])('applies contract duration boundary %i', (sessionMinutes) => {
    expect(applyExploreFilters(createDemoQuery(), createDemoQuery({ sessionMinutes })).sessionMinutes).toBe(sessionMinutes);
  });
  it.each([{ groupSize: 0 }, { groupSize: 9 }, { sessionMinutes: 14 }, { sessionMinutes: 241 }])('rejects an invalid filter draft: %j', (patch) => {
    const query = createDemoQuery();
    expect(() => applyExploreFilters(query, { ...query, ...patch })).toThrow();
  });

  it.each(['wifi', 'outlets'] as const)('forwards strict %s to the shared scorer and excludes unknown evidence', (amenity) => {
    const spot = structuredClone(snapshot.spots[0]!);
    spot[amenity].value = 'unknown';
    const base = createDemoQuery();
    const preferred = applyExploreFilters(base, createDemoQuery({ amenities: { ...base.amenities, [amenity]: 'prefer' } }));
    expect(rankSpots([spot], preferred, { now: DEMO_NOW }).results).toHaveLength(1);
    const required = applyExploreFilters(base, createDemoQuery({ amenities: { ...base.amenities, [amenity]: 'require' } }));
    expect(rankSpots([spot], required, { now: DEMO_NOW }).excludedCounts).toEqual({ amenity: 1 });
    expect(required.amenities[amenity]).toBe('require');
  });

  it('forwards public-only and open-session requirements without accepting unknown facts', () => {
    const spot = structuredClone(snapshot.spots[0]!);
    spot.publicAccess.value = 'unknown';
    const base = createDemoQuery();
    const publicOnly = applyExploreFilters(base, createDemoQuery({ access: 'public_only' }));
    expect(rankSpots([spot], publicOnly, { now: DEMO_NOW }).excludedCounts).toEqual({ access: 1 });
    spot.hoursStatus = 'unknown';
    const open = applyExploreFilters(base, createDemoQuery({ requireOpenForSession: true }));
    expect(rankSpots([spot], open, { now: DEMO_NOW }).excludedCounts).toEqual({ unknown_hours: 1 });
    expect(rankSpots([spot], base, { now: DEMO_NOW }).results).toHaveLength(1);
  });

  it('uses applied session duration for full-session eligibility after travel', () => {
    const spot = structuredClone(snapshot.spots[0]!);
    spot.weeklyHours = [{ weekday: 6, startMinute: 18 * 60, endMinute: 19 * 60 }];
    const base = createDemoQuery();
    const short = applyExploreFilters(base, createDemoQuery({ requireOpenForSession: true, sessionMinutes: 15 }));
    const long = applyExploreFilters(base, { ...short, sessionMinutes: 60 });
    expect(rankSpots([spot], short, { now: DEMO_NOW }).results).toHaveLength(1);
    expect(rankSpots([spot], long, { now: DEMO_NOW }).excludedCounts).toEqual({ hours: 1 });
  });

  it('applies multi-category, price and estimated walk constraints through the existing provider', async () => {
    const query = createDemoQuery({ categories: ['cafe', 'library'], maxPriceLevel: 1, maxWalkMinutes: 5, limit: 10 });
    const result = await fixtureProvider.recommend(query);
    expect(result.results.length).toBeGreaterThan(0);
    for (const card of result.results) {
      expect(card.spot.categories.some((category) => query.categories.includes(category))).toBe(true);
      expect(card.spot.priceLevel.value).not.toBeNull();
      expect(card.spot.priceLevel.value!).toBeLessThanOrEqual(1);
      expect(card.estimatedWalkMinutes).toBeLessThanOrEqual(5);
    }
  });

  it('returns a genuine empty state without mutating or relaxing the applied query', async () => {
    const query = createDemoQuery({ categories: ['cafe'], maxPriceLevel: 0 });
    const before = structuredClone(query);
    const result = await fixtureProvider.recommend(query);
    expect(result.results).toEqual([]);
    expect(query).toEqual(before);
    expect((await fixtureProvider.recommend(resetExploreFilters(query))).results).toHaveLength(3);
  });

  it('passes atmosphere and vibe preferences to C through the same provider', async () => {
    const base = createDemoQuery();
    const changed = QuerySchema.parse({ ...base, targetNoise: 0.65, tagWeights: { lively: 1, outdoor: 1 } });
    const before = await fixtureProvider.recommend(base);
    const after = await fixtureProvider.recommend(changed);
    expect(after.results).not.toEqual(before.results);
    expect(after.mode).toBe('demo');
    expect(after.metrics.externalCalls).toBe(0);
  });
});
