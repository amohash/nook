import { describe, expect, it } from 'vitest';
import { createDemoQuery } from '@space/fixtures';
import { fixtureProvider } from '../../data/providers';
import { applyRelaxation, relaxationActions, validateRelaxation } from './relaxations';

const query = createDemoQuery({
  categories: ['cafe'], maxPriceLevel: 0, maxWalkMinutes: 5,
  origin: {lat: 30.28, lng: -97.74, source: 'device'}, departAt: '2026-10-25T01:00:00Z',
  sessionMinutes: 90, limit: 7, requireOpenForSession: true, access: 'public_only',
  amenities: {wifi: 'require', outlets: 'require'}, groupSize: 4,
});

describe('explicit constraint relaxations', () => {
  it.each([
    {maxWalkMinutes: 20}, {maxPriceLevel: null}, {maxPriceLevel: 2}, {categories: []},
    {categories: ['cafe', 'library']}, {requireOpenForSession: false}, {access: 'any'},
    {amenities: {wifi: 'prefer', outlets: 'require'}},
    {amenities: {wifi: 'require', outlets: 'ignore'}},
  ])('applies only the validated patch %j and preserves every unrelated query field', (patch) => {
    const original = structuredClone(query);
    const next = applyRelaxation(query, {label: 'Proposal', patch: {...patch, limit: 3}});
    expect(next).toEqual({...query, ...patch});
    expect(query).toEqual(original);
    expect(next.origin).toEqual(query.origin);
    expect(next.departAt).toBe(query.departAt);
    expect(next.limit).toBe(7);
  });

  it.each([
    undefined, null, {}, {label: 'Bad', patch: null},
    {label: 'Bad', patch: {maxWalkMinutes: 61}},
    {label: 'Bad', patch: {maxWalkMinutes: Number.NaN}},
    {label: 'Bad', patch: {maxPriceLevel: -1}},
    {label: 'Bad', patch: {categories: ['library']}},
    {label: 'Bad', patch: {maxPriceLevel: null, categories: []}},
    {label: 'Bad', patch: {amenities: {wifi: 'prefer', outlets: 'prefer'}}},
    {label: 'Bad', patch: {amenities: {wifi: 'prefer'}}},
    {label: 'Bad', patch: {origin: query.origin, maxPriceLevel: null}},
    {label: 'Bad', patch: {departAt: query.departAt}},
    {label: 'Bad', patch: {sessionMinutes: 30}},
    {label: 'Bad', patch: {intent: 'friends'}},
    {label: 'Bad', patch: {unknownField: true}},
    {label: 'Bad', patch: {limit: 10}},
    {label: 'Bad', patch: {}},
  ])('ignores missing, invalid, multi-constraint and context-changing proposals: %j', (proposal) => {
    expect(validateRelaxation(query, proposal)).toBeNull();
    expect(applyRelaxation(query, proposal)).toBe(query);
  });

  it('rejects tightened constraints and treats repeated application as a no-op', () => {
    const base = createDemoQuery({maxWalkMinutes: 20});
    expect(validateRelaxation(base, {label: 'Bad', patch: {maxWalkMinutes: 10}})).toBeNull();
    expect(validateRelaxation(base, {label: 'Bad', patch: {requireOpenForSession: true}})).toBeNull();
    const proposal = {label: 'Remove price', patch: {maxPriceLevel: null}};
    const next = applyRelaxation(query, proposal);
    expect(applyRelaxation(next, proposal)).toBe(next);
  });

  it('omits invalid/missing proposals, deduplicates patches and explains the actual change', () => {
    expect(relaxationActions(query, undefined)).toEqual([]);
    const proposal = {label: 'Invented 99 matches', patch: {maxPriceLevel: null}, countEstimate: 99};
    const actions = relaxationActions(query, [null, proposal, proposal, {label: 'Empty', patch: {}}]);
    expect(actions).toHaveLength(1);
    expect(actions[0]!.label).toBe('Remove the price cap (includes unknown prices)');
  });

  it('reranks a selected provider proposal while keeping other constraints, even when still empty', async () => {
    const base = createDemoQuery({categories: ['nonexistent'], maxPriceLevel: 0, limit: 7});
    const empty = await fixtureProvider.recommend(base);
    expect(empty.results).toEqual([]);
    const category = relaxationActions(base, empty.relaxations).find((action) => action.patch.categories);
    expect(category).toBeDefined();
    const next = applyRelaxation(base, category);
    expect(next).toEqual({...base, categories: []});
    const reranked = await fixtureProvider.recommend(next);
    expect(reranked.results.length).toBeGreaterThan(0);
    expect(reranked.results.every((result) => result.spot.priceLevel.value === 0)).toBe(true);

    const blocked = createDemoQuery({categories: ['nonexistent'], maxWalkMinutes: 5, maxPriceLevel: 0});
    const walk = {label: 'Walk', patch: {maxWalkMinutes: 10}};
    expect((await fixtureProvider.recommend(applyRelaxation(blocked, walk))).results).toEqual([]);
    expect(blocked.maxWalkMinutes).toBe(5);
  });
});
