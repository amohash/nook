import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { DatasetSchema, type Dataset } from '../data/dataset';
import { buildAustinCoverage, coverageCategories, type CoverageCacheRow } from './austin-coverage';

const source = DatasetSchema.parse(JSON.parse(readFileSync(new URL('../../../fixtures/data/austin-20261025-muse-photos-v1.json', import.meta.url), 'utf8')));
const now = '2026-10-25T07:00:00Z', fetchedAt = '2026-10-25T06:58:00Z';
const options = { version: 'austin-synthetic-coverage-test', now };
// Synthetic provider records test mapping; they are never published as Austin facts.
const library = { place_id: 'synthetic-library', data_id: 'synthetic-data', title: 'Synthetic provider library fixture',
  address: 'Synthetic test address', gps_coordinates: { latitude: 30.2863, longitude: -97.7395 }, type: 'University library' };
function row(raw: unknown, hash = 'a', at = fetchedAt): CoverageCacheRow {
  return { request_hash: hash.repeat(64), fetched_at: at, payload: { local_results: [raw] } };
}
const added = (result: ReturnType<typeof buildAustinCoverage>) => result.dataset.snapshot.spots.filter((s) => !source.snapshot.spots.some((o) => o.id === s.id));

describe('bounded Austin coverage candidate', () => {
  it('admits explicit secondary categories but never derives categories from names, ratings or review count', () => {
    expect(coverageCategories({ type: ['Coffee shop', 'Restaurant', 'University library', 'City park'] }))
      .toEqual(['cafe', 'library', 'park', 'restaurant']);
    expect(coverageCategories({ title: 'Library Park Restaurant', reviews: 900, rating: 5 })).toEqual([]);
    expect(coverageCategories({ type: 'Parking lot' })).toEqual([]);
  });
  it('preserves prior photos, reviewed Muse projections, citations, IDs, source timestamps and time fields', () => {
    const original = structuredClone(source);
    const spot = original.snapshot.spots[0]!;
    spot.hoursStatus = 'known'; spot.hoursFetchedAt = fetchedAt;
    spot.weeklyHours = [{ weekday: 0, startMinute: 0, endMinute: 1440 }];
    original.details.find((d) => d.spot.id === spot.id)!.spot = structuredClone(spot);
    const result = buildAustinCoverage(original, [row(library)], options);
    const restored: Dataset = structuredClone(result.dataset);
    restored.city.datasetVersion = original.city.datasetVersion; restored.snapshot.datasetVersion = original.snapshot.datasetVersion;
    restored.snapshot.spots = restored.snapshot.spots.slice(0, original.snapshot.spots.length).map((s) => ({ ...s, datasetVersion: original.city.datasetVersion }));
    restored.details = restored.details.slice(0, original.details.length).map((d) => ({ ...d, spot: { ...d.spot, datasetVersion: original.city.datasetVersion } }));
    expect(restored).toEqual(original); expect(source).toEqual(DatasetSchema.parse(source));
    expect(result.report.after.museSummaries).toBe(10);
  });
  it('normalizes a new library without inferring free entry, public access or amenities', () => {
    const result = buildAustinCoverage(source, [row({ ...library, extensions: [{ accessibility: ['Wheelchair accessible entrance'] }], price_level: 0 })], options);
    const spot = added(result)[0]!;
    expect(spot.categories).toEqual(['library']); expect(spot.priceLevel.value).toBeNull();
    expect(spot.wifi.value).toBe('unknown'); expect(spot.outlets.value).toBe('unknown'); expect(spot.publicAccess.value).toBe('unknown');
    expect(spot.summary.value).toBeNull(); expect(spot.fetchedAt).toBe(fetchedAt);
    expect(result.dataset.details.find((d) => d.spot.id === spot.id)!.spot).toEqual(spot);
  });
  it('maps only dollar-sign price tiers and preserves their actual chosen capture time', () => {
    const early = '2026-10-24T06:58:00Z';
    const result = buildAustinCoverage(source, [row({ ...library, price: '$$' }, 'a', early), row(library, 'b')], options);
    expect(added(result)[0]!.priceLevel).toMatchObject({ value: 2, fetchedAt: early, source: 'serpapi', observedAt: null });
    expect(added(buildAustinCoverage(source, [row({ ...library, price: 'Free' })], options))[0]!.priceLevel.value).toBeNull();
    expect(added(buildAustinCoverage(source, [row({ ...library, price: '$10–20' })], options))[0]!.priceLevel.value).toBeNull();
  });
  it('does not choose a known price from conflicting captures', () => {
    const result = buildAustinCoverage(source, [row({ ...library, price: '$' }), row({ ...library, price: '$$' }, 'b')], options);
    expect(added(result)[0]!.priceLevel.value).toBeNull();
  });
  it('deduplicates exact provider identities and data-ID aliases without losing existing enrichment', () => {
    const old = source.snapshot.spots[0]!;
    const result = buildAustinCoverage(source, [row(library), row(library, 'b'), row({ ...library, place_id: 'synthetic-alias' }, 'c'),
      row({ ...library, place_id: 'synthetic-existing-alias', data_id: old.providerDataId }, 'd')], options);
    expect(added(result)).toHaveLength(1);
    expect(result.report.rejected.duplicateAliases).toBeGreaterThan(0);
    expect(result.dataset.snapshot.spots[0]!.summary).toEqual(old.summary);
  });
  it('rejects conflicting provider identities, future captures and out-of-area records', () => {
    const result = buildAustinCoverage(source, [row(library), row({ ...library, data_id: 'different-data' }, 'b'),
      row({ ...library, place_id: 'future' }, 'c', '2027-01-01T00:00:00Z'),
      row({ ...library, place_id: 'elsewhere', gps_coordinates: { latitude: 31, longitude: -98 } }, 'd')], options);
    expect(added(result)).toHaveLength(0);
    expect(result.report.rejected).toMatchObject({ identityConflicts: 1, futureCaptures: 1, outsideWindow: 1 });
  });
  it('adds provider-backed secondary categories to exact existing identities, retaining every unrelated fact', () => {
    const old = source.snapshot.spots[0]!;
    const raw = { ...library, place_id: old.providerPlaceId, data_id: old.providerDataId, title: old.name,
      gps_coordinates: { latitude: old.lat, longitude: old.lng }, type: ['Coffee shop', 'Restaurant'], price: '$' };
    const result = buildAustinCoverage(source, [row(raw)], options);
    const spot = result.dataset.snapshot.spots[0]!;
    expect(spot.categories).toContain('restaurant'); expect(spot.priceLevel.value).toBe(1);
    expect({ ...spot, categories: old.categories, priceLevel: old.priceLevel, datasetVersion: old.datasetVersion }).toEqual(old);
    expect(result.report.changedExisting).toBe(1);
  });
  it('rejects a data-ID mismatch on an existing provider ID', () => {
    const old = source.snapshot.spots[0]!;
    const result = buildAustinCoverage(source, [row({ ...library, place_id: old.providerPlaceId, data_id: 'wrong-data', type: 'Restaurant' })], options);
    expect(result.report.changedExisting).toBe(0); expect(result.report.rejected.identityConflicts).toBe(1);
  });
  it('uses one production scorer for honest strict-query outcomes without any network calls', () => {
    const transport = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected transport'));
    try {
      const result = buildAustinCoverage(source, [row(library)], options);
      const queries = result.report.after.strictQueries;
      expect(queries.libraries15!.qualifyingCount).toBe(1);
      for (const name of ['free15', 'priceCap1', 'wifiRequired', 'outletsRequired', 'publicOnly', 'openSessionNow']) {
        expect(queries[name]!.qualifyingCount).toBe(0);
      }
      expect(transport).not.toHaveBeenCalled();
    } finally { transport.mockRestore(); }
  });
  it('is independent of capture ordering, bounded to eight additions per category, and never emits raw private evidence', () => {
    const rows = Array.from({ length: 12 }, (_, i) => row({ ...library, place_id: `synthetic-${i}`, data_id: `synthetic-data-${i}`,
      user_reviews: { reviewer: 'PRIVATE_SENTINEL' }, website: 'https://private.invalid/?api_key=PRIVATE_SENTINEL' }, String(i % 10)));
    const a = buildAustinCoverage(source, rows, options), b = buildAustinCoverage(source, [...rows].reverse(), options);
    expect(a).toEqual(b); expect(added(a)).toHaveLength(8);
    expect(JSON.stringify(a)).not.toContain('PRIVATE_SENTINEL');
  });
  it('fails closed on source/version mismatch and excessive cache input', () => {
    expect(() => buildAustinCoverage(source, [], { ...options, version: source.city.datasetVersion })).toThrow();
    expect(() => buildAustinCoverage(source, Array.from({ length: 2001 }, () => row(library)), options)).toThrow();
  });
  it('rejects cache error envelopes rather than treating partial provider results as successful evidence', () => {
    const input = row(library); input.payload = { error: 'upstream failed', local_results: [library] };
    const result = buildAustinCoverage(source, [input], options);
    expect(result.report.addedPlaces).toBe(0); expect(result.report.rejected.invalidRows).toBe(1);
  });
  it('keeps the recorded real candidate faithful to all prior non-time enrichment and paired details', () => {
    const candidate = DatasetSchema.parse(JSON.parse(readFileSync(new URL('../../../fixtures/data/austin-20261025-muse-coverage-v1.json', import.meta.url), 'utf8')));
    const ignored = new Set(['datasetVersion', 'categories', 'priceLevel', 'hoursStatus', 'hoursFetchedAt', 'weeklyHours', 'hoursExceptions', 'typicalCrowd', 'liveObservation']);
    const preserved = (spot: typeof source.snapshot.spots[number]) => Object.fromEntries(Object.entries(spot).filter(([k]) => !ignored.has(k)));
    for (const original of source.snapshot.spots) {
      const next = candidate.snapshot.spots.find((s) => s.id === original.id)!;
      expect(preserved(next)).toEqual(preserved(original));
      expect(next.priceLevel).toEqual(original.priceLevel);
      expect(next.categories).toEqual(expect.arrayContaining(original.categories));
      expect(candidate.details.find((d) => d.spot.id === original.id)!.evidence)
        .toEqual(source.details.find((d) => d.spot.id === original.id)!.evidence);
    }
    expect(new Set(candidate.snapshot.spots.map((s) => s.providerPlaceId)).size).toBe(candidate.snapshot.spots.length);
    expect(new Set(candidate.snapshot.spots.map((s) => s.providerDataId)).size).toBe(candidate.snapshot.spots.length);
    for (const spot of candidate.snapshot.spots) {
      expect(spot.priceLevel.value).toBeNull(); expect(spot.wifi.value).toBe('unknown');
      expect(spot.outlets.value).toBe('unknown'); expect(spot.publicAccess.value).toBe('unknown');
      expect(spot.typicalCrowd).toBeNull(); expect(spot.liveObservation).toBeNull();
    }
    for (const category of ['library', 'park', 'restaurant']) expect(candidate.snapshot.spots.some((s) => s.categories.includes(category))).toBe(true);
  });
});
