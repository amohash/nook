import { InstantSchema, QuerySchema, z, type Query, type Spot } from '@space/contracts';
import { estimatedWalkMinutes, rankSpots } from '@space/core';
import { createDemoQuery } from '@space/fixtures';
import { DatasetSchema, type Dataset } from '../data/dataset';
import { normalizePlace } from '../data/normalize';
import { ProviderPlaceSchema, ProviderResponseSchema } from '../providers/serpapi';

export const CoverageCacheRowSchema = z.object({ request_hash: z.string().regex(/^[a-f0-9]{64}$/),
  fetched_at: InstantSchema, payload: z.unknown() });
export type CoverageCacheRow = z.infer<typeof CoverageCacheRowSchema>;
// A named manual origin, never a persisted device position.
export const COVERAGE_ORIGIN = { lat: 30.2862, lng: -97.7394, source: 'manual' as const };
const addedCategories = ['library', 'park', 'restaurant'] as const;

/** Explicit provider types only. Secondary categories are facts, not amenity evidence. */
export function coverageCategories(raw: unknown): string[] {
  const input = z.object({ type: z.union([z.string(), z.array(z.string()).max(20)]).optional() }).safeParse(raw);
  if (!input.success) return [];
  const types = [input.data.type ?? []].flat().map((s) => s.trim().toLowerCase());
  const result = new Set<string>();
  for (const type of types) {
    if (/^(coffee shop|coffee stand|cafe|café|espresso bar)$/.test(type)) result.add('cafe');
    if (/\brestaurant$/.test(type)) result.add('restaurant');
    if (/\blibrary$/.test(type)) result.add('library');
    if (/^(park|city park|state park|national park)$/.test(type)) result.add('park');
  }
  return [...result].sort();
}

type Capture = { spot: Spot; categories: string[]; hash: string; fetchedAt: string };
export function buildAustinCoverage(source: Dataset, inputRows: readonly CoverageCacheRow[], options: {
  version: string; now: string;
}) {
  const original = DatasetSchema.parse(source);
  const version = z.string().regex(/^austin-[a-z0-9-]{1,80}$/).parse(options.version);
  const now = InstantSchema.parse(options.now);
  if (original.city.id !== 'us-tx-austin' || original.city.mode !== 'cached' || version === original.city.datasetVersion) {
    throw new Error('A distinct cached Austin candidate version is required');
  }
  if (inputRows.length > 2000) throw new Error('Cache input exceeds operator bound');
  const captures = new Map<string, Capture[]>();
  const rejected = { invalidRows: 0, invalidPlaces: 0, futureCaptures: 0, outsideWindow: 0,
    identityConflicts: 0, duplicateAliases: 0 };
  // Fixed ordering makes capture conflict handling independent of database order.
  for (const input of [...inputRows].sort((a, b) => a.request_hash.localeCompare(b.request_hash))) {
    const parsedRow = CoverageCacheRowSchema.safeParse(input);
    if (!parsedRow.success) { rejected.invalidRows++; continue; }
    const row = parsedRow.data;
    if (Date.parse(row.fetched_at) > Date.parse(now)) { rejected.futureCaptures++; continue; }
    const envelope = ProviderResponseSchema.safeParse(row.payload);
    if (!envelope.success || envelope.data.error) { rejected.invalidRows++; continue; }
    for (const raw of [...(envelope.data.local_results ?? []), ...(envelope.data.place_results ? [envelope.data.place_results] : [])]) {
      const place = ProviderPlaceSchema.safeParse(raw);
      if (!place.success) { rejected.invalidPlaces++; continue; }
      // normalizePlace is used only for NEW candidates; existing enrichment is never reconstructed.
      const spot = normalizePlace(raw, row.fetched_at, version);
      if (spot.lat < 30.24 || spot.lat > 30.34 || spot.lng < -97.78 || spot.lng > -97.70) {
        rejected.outsideWindow++; continue;
      }
      const value = { spot, categories: coverageCategories(raw), hash: row.request_hash, fetchedAt: row.fetched_at };
      captures.set(spot.providerPlaceId, [...(captures.get(spot.providerPlaceId) ?? []), value]);
    }
  }
  const dataset = structuredClone(original);
  dataset.city.datasetVersion = version; dataset.snapshot.datasetVersion = version;
  const provenance: { spotId: string; added: boolean; fields: string[];
    sources: { cacheHash: string; fetchedAt: string; sourceUrl: string | null; categories: string[]; priceLevel: number | null }[] }[] = [];
  const provenanceFor = (records: Capture[]) => records.map((c) => ({ cacheHash: c.hash, fetchedAt: c.fetchedAt,
    sourceUrl: c.spot.publicPlaceUrl, categories: c.categories, priceLevel: c.spot.priceLevel.value }));
  const seenPlace = new Set(dataset.snapshot.spots.map((s) => s.providerPlaceId));
  const seenData = new Set(dataset.snapshot.spots.flatMap((s) => s.providerDataId ? [s.providerDataId] : []));
  for (const spot of dataset.snapshot.spots) {
    spot.datasetVersion = version;
    const records = (captures.get(spot.providerPlaceId) ?? []).filter((c) => {
      if (c.spot.providerDataId && spot.providerDataId && c.spot.providerDataId !== spot.providerDataId) {
        rejected.identityConflicts++; return false;
      }
      return true;
    });
    const fields: string[] = [];
    const categories = [...new Set([...spot.categories, ...records.flatMap((c) => c.categories)])].sort();
    if (JSON.stringify([...spot.categories].sort()) !== JSON.stringify(categories)) { spot.categories = categories; fields.push('categories'); }
    const priceRecords = records.filter((c) => c.spot.priceLevel.value !== null);
    const prices = new Set(priceRecords.map((c) => c.spot.priceLevel.value));
    // Missing and conflicting captures cannot overwrite prior known evidence.
    if (spot.priceLevel.value === null && prices.size === 1) {
      const chosen = priceRecords.sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt) || a.hash.localeCompare(b.hash))[0]!;
      spot.priceLevel = structuredClone(chosen.spot.priceLevel); fields.push('priceLevel');
    }
    if (fields.length) provenance.push({ spotId: spot.id, added: false, fields, sources: provenanceFor(records) });
    dataset.details.find((d) => d.spot.id === spot.id)!.spot = structuredClone(spot);
  }
  const candidates: { spot: Spot; records: Capture[] }[] = [];
  for (const [placeId, records] of [...captures].sort(([a], [b]) => a.localeCompare(b))) {
    if (seenPlace.has(placeId)) continue;
    const dataIds = new Set(records.flatMap((c) => c.spot.providerDataId ? [c.spot.providerDataId] : []));
    if (dataIds.size > 1) { rejected.identityConflicts++; continue; }
    if ([...dataIds].some((id) => seenData.has(id))) { rejected.duplicateAliases++; continue; }
    const ordered = [...records].sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt) || a.hash.localeCompare(b.hash));
    const spot = structuredClone(ordered[0]!.spot);
    spot.categories = [...new Set(records.flatMap((c) => c.categories))].sort();
    if (!addedCategories.some((c) => spot.categories.includes(c)) || estimatedWalkMinutes(COVERAGE_ORIGIN, spot) > 30) continue;
    // A category never establishes free entry, positive access, Wi-Fi or outlets.
    const priceRecords = ordered.filter((c) => c.spot.priceLevel.value !== null);
    if (new Set(priceRecords.map((c) => c.spot.priceLevel.value)).size === 1) spot.priceLevel = structuredClone(priceRecords[0]!.spot.priceLevel);
    else spot.priceLevel = { ...spot.priceLevel, value: null, confidence: 0 };
    candidates.push({ spot, records });
  }
  // Bound additions per supported category; distance uses the production estimator.
  const selected = new Map<string, { spot: Spot; records: Capture[] }>();
  for (const category of addedCategories) {
    const nearby = candidates.filter((c) => c.spot.categories.includes(category)).sort((a, b) =>
      estimatedWalkMinutes(COVERAGE_ORIGIN, a.spot) - estimatedWalkMinutes(COVERAGE_ORIGIN, b.spot) || a.spot.id.localeCompare(b.spot.id));
    let count = 0;
    for (const candidate of nearby) {
      if (count >= 8 || original.snapshot.spots.length + selected.size >= 200) break;
      if (seenPlace.has(candidate.spot.providerPlaceId) || (candidate.spot.providerDataId && seenData.has(candidate.spot.providerDataId))) {
        if (!selected.has(candidate.spot.id)) rejected.duplicateAliases++;
        continue;
      }
      selected.set(candidate.spot.id, candidate); seenPlace.add(candidate.spot.providerPlaceId);
      if (candidate.spot.providerDataId) seenData.add(candidate.spot.providerDataId);
      count++;
    }
  }
  for (const { spot, records } of [...selected.values()].sort((a, b) => a.spot.id.localeCompare(b.spot.id))) {
    dataset.snapshot.spots.push(spot);
    dataset.details.push({ schemaVersion: 1, spot: structuredClone(spot), evidence: [{ id: `${spot.id}:provider-listing`,
      text: `Provider listing fetched ${spot.fetchedAt}. ${spot.name} — ${spot.address}`.slice(0, 500), sourceUrl: spot.publicPlaceUrl }] });
    provenance.push({ spotId: spot.id, added: true, fields: ['new-provider-listing'], sources: provenanceFor(records) });
  }
  const validated = DatasetSchema.parse(dataset);
  const reportFor = (data: Dataset) => {
    const spots = data.snapshot.spots;
    const known = (field: 'priceLevel' | 'wifi' | 'outlets' | 'publicAccess') => spots.filter((s) =>
      s[field].value !== null && s[field].value !== 'unknown' && s[field].confidence > 0).length;
    const query = createDemoQuery({ cityId: data.city.id, origin: COVERAGE_ORIGIN, departAt: now });
    const queries: Record<string, Partial<Query>> = { default15: {}, nearby30: { maxWalkMinutes: 30 },
      libraries15: { categories: ['library'] }, parks15: { categories: ['park'] }, restaurants15: { categories: ['restaurant'] },
      free15: { maxPriceLevel: 0 }, priceCap1: { maxPriceLevel: 1 }, wifiRequired: { amenities: { wifi: 'require', outlets: 'ignore' } },
      outletsRequired: { amenities: { wifi: 'ignore', outlets: 'require' } }, publicOnly: { access: 'public_only' },
      openSessionNow: { requireOpenForSession: true }, openSessionLater: { requireOpenForSession: true,
        departAt: new Date(Date.parse(now) + 12 * 3_600_000).toISOString() } };
    return { places: spots.length, categories: Object.fromEntries(['cafe', ...addedCategories].map((c) => [c, spots.filter((s) => s.categories.includes(c)).length])),
      facts: Object.fromEntries((['priceLevel', 'wifi', 'outlets', 'publicAccess'] as const).map((f) => [f, { known: known(f), unknown: spots.length - known(f),
        positive: f === 'priceLevel' ? null : spots.filter((s) => s[f].value === 'yes' && s[f].confidence >= 0.7).length }])),
      knownHours: spots.filter((s) => s.hoursStatus === 'known').length,
      unknownHours: spots.filter((s) => s.hoursStatus !== 'known').length,
      typicalRecords: spots.filter((s) => s.typicalCrowd !== null).length,
      unknownTypical: spots.filter((s) => s.typicalCrowd === null).length,
      liveRecords: spots.filter((s) => s.liveObservation !== null).length,
      unknownLive: spots.filter((s) => s.liveObservation === null).length,
      photos: spots.filter((s) => s.image !== null).length,
      museSummaries: spots.filter((s) => s.summary.source === 'muse' && s.summary.value !== null).length,
      strictQueries: Object.fromEntries(Object.entries(queries).map(([name, patch]) => {
        const q = QuerySchema.parse({ ...query, ...patch });
        const r = rankSpots(spots, q, { now });
        return [name, { query: q, qualifyingCount: r.qualifyingCount, resultIds: r.results.map((s) => s.spotId), excludedCounts: r.excludedCounts }];
      })) };
  };
  return { dataset: validated, report: { schemaVersion: 1, sourceVersion: original.city.datasetVersion, candidateVersion: version,
    measuredAt: now, originLabel: 'Manual UT Austin (app default); no device GPS stored', cacheRows: inputRows.length,
    addedPlaces: selected.size, changedExisting: provenance.filter((p) => !p.added).length, rejected,
    before: reportFor(original), after: reportFor(validated), provenance,
    acquisition: 'Cache-only construction. Acquisition ledger is reported separately by the operator; no provider or model transport here.',
    limitations: ['Bounded provider candidate coverage, not an exhaustive city directory.',
      'Prices, amenities and public access remain unknown without explicit evidence; category does not prove free entry.',
      'New places have provider listings only; no generated summary or live crowd claim.',
      'Existing Muse projections are retained verbatim; separate C semantic/provenance review remains a release gate.',
      'Review and B3 publication/deployment plus physical presenter-phone checks remain required.'] } };
}
