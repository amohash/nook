import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoQuery, snapshot } from '@space/fixtures';
import { DatasetSchema } from '../../../server/src/data/dataset';
import { rankSpots } from '../src/index';
import { evaluateDataset, evidenceCounts, fictionalGoldens, parseInput, sourceAges } from './evaluate-real';

const bytes = readFileSync(new URL('../../../fixtures/data/austin-20261025-muse-photos-v1.json', import.meta.url));
const dataset = DatasetSchema.parse(JSON.parse(bytes.toString('utf8')));
const rawInput = JSON.parse(readFileSync(new URL('./real-inputs.json', import.meta.url), 'utf8'));
const input = parseInput(rawInput, dataset.city.id);
afterEach(() => vi.restoreAllMocks());

describe('reproducible real-dataset evaluation', () => {
  it('pins the approved artifact independently of fictional goldens', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('bae26a4d32597262f8f8cbfa4740535505b732f5a30684a921781f3c7ab1b731');
    expect(dataset.snapshot.spots).toHaveLength(30);
    expect(evidenceCounts(dataset)).toEqual({ price: 0, numericNoise: 0, groupFriendly: 1,
      wifi: 0, outlets: 0, hours: 0, summaries: 10 });
  });

  it('checks every real case through the production API router and actual cached mobile path without acquisition', async () => {
    const fetch = globalThis.fetch;
    const requests = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      expect(String(url)).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/v1\/recommendations$/);
      return fetch(url, options);
    });
    const records = await evaluateDataset(dataset, input, 2);
    expect(requests).toHaveBeenCalledTimes(14);
    for (const record of records) {
      expect(record.parity).toEqual({ scorerApiCached: true, repeatedSamplesStable: true, checkedSamples: 2 });
      expect(record.acquisition).toEqual({ externalCalls: 0, providerOrModelConstructed: false });
      expect(record.ranking.candidateCount).toBe(30);
      for (const values of Object.values(record.rawMs)) {
        expect(values).toHaveLength(2);
        expect(values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
      }
    }
    const [study, friends, later, price, hours, wifi, downtown] = records;
    expect(study!.names.map(({ name }) => name)).toEqual(['Trippy Buck Coffee Truck', 'St Benedict Coffee Company', 'Lucky Lab Coffee Co.']);
    expect(friends!.names).toEqual(study!.names);
    expect(later!.names).toEqual(study!.names);
    expect(study!.ranking.qualifyingCount).toBe(3);
    expect(later!.ranking.results[0]!.arrivalAt).not.toBe(study!.ranking.results[0]!.arrivalAt);
    for (const [record, code] of [[price, 'unknown_price'], [hours, 'unknown_hours'], [wifi, 'amenity']] as const) {
      expect(record!.ranking.results).toEqual([]);
      expect(record!.ranking.qualifyingCount).toBe(0);
      expect(record!.ranking.excludedCounts).toEqual({ distance: 27, [code]: 3 });
      expect(record!.ranking.relaxations.length).toBeGreaterThan(0);
    }
    expect(study!.ranking.results.every((result) => result.warnings.includes('Noise unknown'))).toBe(true);
    expect(downtown!.ranking.qualifyingCount).toBe(5);
    expect(downtown!.names.map(({ name }) => name)).toEqual(['Cielito Lindo Cafe', 'Trippy Buck Coffee', 'Black Fox Coffee']);
  });

  it('fails rather than recording a parity success when API warnings differ', async () => {
    const fetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      const response = await fetch(url, options);
      const body = await response.json();
      body.results[0].warnings = [];
      return Response.json(body);
    });
    await expect(evaluateDataset(dataset, { ...input, cases: input.cases.slice(0, 1) }, 1)).rejects.toThrow('Ranking parity failed');
  });

  it('requires an explicit clock, rejects GPS and mixed cities before measurement, and preserves the base limit', () => {
    expect(() => parseInput({ ...rawInput, clock: undefined }, dataset.city.id)).toThrow();
    expect(() => parseInput({ ...rawInput, baseQuery: { ...rawInput.baseQuery,
      origin: { ...rawInput.baseQuery.origin, source: 'device' } } }, dataset.city.id)).toThrow();
    expect(() => parseInput({ ...rawInput, cases: [{ label: 'gps', overrides: {
      origin: { lat: 30, lng: -97, source: 'device' } } }] }, dataset.city.id)).toThrow();
    expect(() => parseInput(rawInput, 'another-city')).toThrow();
    expect(() => parseInput({ ...rawInput, cases: [{ label: 'invalid', overrides: { extraSecret: 'not-a-query-field' } }] }, dataset.city.id)).toThrow();
    expect(parseInput({ ...rawInput, baseQuery: { ...rawInput.baseQuery, limit: 7 } }, dataset.city.id)
      .cases.every(({ query }) => query.limit === 7)).toBe(true);
  });

  it('does not refresh source timestamps, hide sources after the clock or conflate them with observation times', () => {
    const ages = sourceAges(dataset, input.clock);
    expect(ages.find(({ field }) => field === 'snapshot')).toEqual({ field: 'snapshot',
      fetchedAt: dataset.snapshot.fetchedAt, ageMs: Date.parse(input.clock) - Date.parse(dataset.snapshot.fetchedAt), count: 1 });
    expect(sourceAges(dataset, '2026-01-01T00:00:00Z').every(({ ageMs }) => ageMs < 0)).toBe(true);
    expect(ages.some(({ field }) => field === 'hours')).toBe(false);
  });

  it('keeps clearly fictional Study/Friends winners and deterministic ties separate from real claims', () => {
    const goldens = fictionalGoldens();
    expect(goldens.map(({ label }) => label)).toEqual(['FICTIONAL study', 'FICTIONAL friends']);
    expect(goldens.map(({ ranking }) => ranking.results.map(({ spotId }) => spotId))).toEqual([
      ['demo:spot-1', 'demo:spot-3', 'demo:spot-11'], ['demo:spot-2', 'demo:spot-12', 'demo:spot-10'],
    ]);
    const spots = ['tie:z', 'tie:a'].map((id) => ({ ...structuredClone(snapshot.spots[0]!), id, providerPlaceId: id }));
    expect(rankSpots(spots, createDemoQuery(), { now: goldens[0]!.clock }).results.map(({ spotId }) => spotId))
      .toEqual(['tie:a', 'tie:z']);
    expect(rankSpots([...spots].reverse(), createDemoQuery(), { now: goldens[0]!.clock }).results)
      .toEqual(rankSpots(spots, createDemoQuery(), { now: goldens[0]!.clock }).results);
  });
});
