import { describe, expect, it } from 'vitest';
import { QuerySchema } from '@space/contracts';
import { createDemoQuery } from '@space/fixtures';
import { fixtureProvider } from '../../data/providers';
import { activeFilterCount, applyIntentPreset, resetExploreFilters } from './filters';

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

  it('resets exposed filters without resetting location, time or unrelated requirements', () => {
    const query = applyIntentPreset(createDemoQuery({ categories: ['park'], maxPriceLevel: 0,
      maxWalkMinutes: 5, departAt: '2026-10-25T01:00:00Z', sessionMinutes: 90,
      origin: { lat: 30.28, lng: -97.74, source: 'device' }, requireOpenForSession: true }), 'friends');
    const reset = resetExploreFilters(query);
    expect(activeFilterCount(reset)).toBe(0);
    expect(reset).toMatchObject({ categories: [], maxPriceLevel: null, maxWalkMinutes: 15,
      intent: 'study', groupSize: 1, targetNoise: 0.15, tagWeights: { study: 1, quiet: 1 },
      departAt: query.departAt, sessionMinutes: 90, origin: query.origin, requireOpenForSession: true });
    expect(query.categories).toEqual(['park']);
  });

  it('counts changed groups once and ignores tag ordering and zero weights', () => {
    expect(activeFilterCount(createDemoQuery({ tagWeights: { quiet: 1, study: 1, cozy: 0 } }))).toBe(0);
    expect(activeFilterCount(createDemoQuery({ categories: ['cafe', 'park'], maxPriceLevel: 0 }))).toBe(2);
    expect(activeFilterCount(applyIntentPreset(createDemoQuery({ categories: ['cafe'], maxPriceLevel: 1, maxWalkMinutes: 5 }), 'friends'))).toBe(5);
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
