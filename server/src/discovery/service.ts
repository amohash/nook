import { createHash, randomUUID } from 'node:crypto';
import { DiscoveryRequestSchema, DiscoveryResponseSchema, z, type DiscoveryResponse, type Spot } from '@space/contracts';
import { cacheKey, type ProviderCache } from '../cache/provider-cache';
import { DatasetSchema, type Dataset } from '../data/dataset';
import { deduplicatePlaces, normalizePlace } from '../data/normalize';
import { collectReviewEvidence, type ReviewEvidence } from '../data/review-evidence';
import { prepareDataset, type IngestionEvidence } from '../jobs/publish-dataset';
import { ServiceError } from '../providers/http';
import { ProviderPlaceSchema, SerpApi } from '../providers/serpapi';

export const COVERAGE_BOUNDS = { south: 30.24, north: 30.34, west: -97.78, east: -97.70 } as const;
const TTL = 86_400_000;
const StoredSchema = z.strictObject({ dataset: DatasetSchema,
  coverage: z.strictObject({ policy: z.literal('central-austin-v1'),
    center: z.strictObject({ lat: z.number(), lng: z.number() }), radiusMeters: z.literal(3000) }),
  warnings: z.array(z.string()), partialFailures: z.number().int().nonnegative(),
});
type Stored = z.infer<typeof StoredSchema>;
export interface DiscoveryStore extends ProviderCache {
  reserveAttempt(version: string): Promise<void>;
  claimLease(key: string, owner: string, now: number, durationMs: number): Promise<boolean>;
  releaseLease(key: string, owner: string): Promise<void>;
}
export function coverageFor(origin: { lat: number; lng: number }) {
  const b = COVERAGE_BOUNDS;
  if (origin.lat < b.south || origin.lat > b.north || origin.lng < b.west || origin.lng > b.east) return null;
  return { policy: 'central-austin-v1' as const,
    center: { lat: Math.round(origin.lat * 100) / 100, lng: Math.round(origin.lng * 100) / 100 }, radiusMeters: 3000 as const };
}
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
async function bounded<T, U>(items: T[], work: (item: T) => Promise<U>): Promise<PromiseSettledResult<U>[]> {
  const results: PromiseSettledResult<U>[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = { status: 'fulfilled', value: await work(items[index]!) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  }));
  return results;
}
export function createDiscoveryService(options: { store: DiscoveryStore; apiKey: string;
  accountBudgetKey: string; now?: () => number; transport?: typeof fetch;
  extract?: IngestionEvidence['extract']; timeoutMs?: number }) {
  if (!/^austin-[a-z0-9-]{1,80}$/.test(options.accountBudgetKey)) throw new Error('Invalid fixed account budget key');
  const now = options.now ?? Date.now;
  const flights = new Map<string, Promise<DiscoveryResponse>>();
  let active = 0;
  let providerActive = 0;
  const providerQueue: (() => void)[] = [];
  async function providerSlot<T>(work: () => Promise<T>): Promise<T> {
    if (providerActive >= 3) await new Promise<void>((resolve) => providerQueue.push(resolve));
    else providerActive++;
    try { return await work(); }
    finally {
      const next = providerQueue.shift();
      if (next) next(); else providerActive--;
    }
  }
  async function stored(key: string): Promise<{ value: Stored; expiresAt: number } | null> {
    const row = await options.store.get(key);
    if (!row) return null;
    const parsed = StoredSchema.safeParse(row.payload);
    return parsed.success ? { value: parsed.data, expiresAt: Date.parse(row.expiresAt) } : null;
  }
  const snapshotKey = (id: string) => cacheKey({ kind: 'nearby-snapshot-v1', id });
  function response(status: DiscoveryResponse['status'], value: Stored | null,
    metrics: Partial<DiscoveryResponse['metrics']> = {}, coverage = value?.coverage ?? null): DiscoveryResponse {
    const times = value?.dataset.snapshot.spots.map((s) => Date.parse(s.fetchedAt)) ?? [];
    const oldest = times.length ? new Date(Math.min(...times)).toISOString() : null;
    const newest = times.length ? new Date(Math.max(...times)).toISOString() : null;
    return DiscoveryResponseSchema.parse({ schemaVersion: 1, requestId: randomUUID(), status,
      snapshotId: value?.dataset.snapshot.datasetVersion ?? null, snapshot: value?.dataset.snapshot ?? null, coverage,
      metrics: { externalAttempts: 0, cacheHits: 0, coalesced: 0, partialFailures: value?.partialFailures ?? 0,
        sourceOldestAt: oldest, sourceNewestAt: newest, stale: oldest ? Date.parse(oldest) + TTL <= now() : false, ...metrics },
      warnings: value?.warnings ?? [],
    });
  }
  async function getDataset(id: string): Promise<Dataset | null> {
    if (!/^nearby-[a-f0-9]{40}$/.test(id)) return null;
    const row = await stored(snapshotKey(id));
    if (!row || row.expiresAt <= now() || row.value.dataset.snapshot.datasetVersion !== id) return null;
    return row.value.dataset;
  }
  async function discover(input: unknown): Promise<DiscoveryResponse> {
    const request = DiscoveryRequestSchema.parse(input);
    const coverage = coverageFor(request.origin);
    if (!coverage) return response('unsupported_area', null);
    // Only coarse public area centers enter persistent data or provider requests.
    const areaKey = cacheKey({ kind: 'nearby-area-v1', lat: String(coverage.center.lat), lng: String(coverage.center.lng) });
    const existing = flights.get(areaKey);
    if (existing) {
      const result = await existing;
      return { ...result, requestId: randomUUID(), metrics: { ...result.metrics, externalAttempts: 0, coalesced: 1 } };
    }
    const work = acquire(areaKey, coverage, request.refresh);
    flights.set(areaKey, work);
    try { return await work; } finally { flights.delete(areaKey); }
  }
  async function acquire(areaKey: string, coverage: NonNullable<ReturnType<typeof coverageFor>>, refresh: boolean) {
    let previous: Awaited<ReturnType<typeof stored>> = null;
    let acquired = false;
    let slot = false;
    const owner = randomUUID();
    const leaseKey = cacheKey({ kind: 'nearby-lease-v1', area: areaKey });
    const api = new SerpApi({ key: options.apiKey, cache: options.store, authorized: true, maxCalls: 18,
      now, transport: options.transport, timeoutMs: options.timeoutMs,
      beforeAttempt: () => options.store.reserveAttempt(options.accountBudgetKey) });
    const failures: string[] = [];
    try {
      previous = await stored(areaKey);
      if (previous && Date.parse(previous.value.dataset.snapshot.fetchedAt) + 7 * TTL <= now()) previous = null;
      // Explicit refresh respects a shared 60s area cooldown. Outside it the
      // request may spend again; filters never reach this operation.
      if (previous && previous.expiresAt > now() && (!refresh || Date.parse(previous.value.dataset.snapshot.fetchedAt) + 60_000 > now())) {
        return response(previous.value.dataset.snapshot.spots.length ? (previous.value.partialFailures ? 'partial' : 'ready') : 'empty', previous.value, { cacheHits: 1 });
      }
      if (active >= 2) return response('quota', previous?.value ?? null, {}, coverage);
      active++; slot = true;
      acquired = await options.store.claimLease(leaseKey, owner, now(), 120_000);
      if (!acquired) return response('unavailable', previous?.value ?? null, { coalesced: 1 }, coverage);
      const version = `nearby-pending-${owner}`;
      let invalid = 0;
      const accept = (raw: unknown, fetchedAt: string): Spot | null => {
        const parsed = ProviderPlaceSchema.safeParse(raw);
        if (!parsed.success) { invalid++; return null; }
        const spot = normalizePlace(parsed.data, fetchedAt, version);
        const b = COVERAGE_BOUNDS;
        if (spot.lat < b.south || spot.lat > b.north || spot.lng < b.west || spot.lng > b.east || distance(coverage.center, spot) > 3000) return null;
        return spot;
      };
      const listings = await bounded(['cafes', 'libraries', 'parks', 'restaurants'], async (category) => {
        const result = await providerSlot(() => api.request({ type: 'search', q: `${category} near Austin Texas`,
          ll: `@${coverage.center.lat.toFixed(2)},${coverage.center.lng.toFixed(2)},15z`, start: '0' }, { refresh }));
        return (result.payload.local_results ?? []).flatMap((raw) => { const s = accept(raw, result.fetchedAt); return s ? [s] : []; });
      });
      let spots: Spot[] = [];
      for (const result of listings) {
        if (result.status === 'fulfilled') spots.push(...result.value);
        else failures.push(result.reason instanceof ServiceError ? result.reason.code : 'provider_unavailable');
      }
      spots = deduplicatePlaces(spots).slice(0, 80);
      const reviews = new Map<string, ReviewEvidence>();
      // Four details maximum, selected geometrically across supported categories.
      const chosen: Spot[] = [];
      for (const category of ['cafe', 'library', 'park', 'restaurant']) {
        const candidate = spots.filter((s) => s.categories.includes(category) && !chosen.some((c) => c.id === s.id))
          .sort((a, b) => distance(coverage.center, a) - distance(coverage.center, b) || a.id.localeCompare(b.id))[0];
        if (candidate) chosen.push(candidate);
      }
      const enriched = await bounded(chosen, async (spot) => {
        const result = await providerSlot(() => api.request({ type: 'place', place_id: spot.providerPlaceId }, { refresh }));
        const candidate = accept(result.payload.place_results, result.fetchedAt);
        if (!candidate || candidate.providerPlaceId !== spot.providerPlaceId ||
          (spot.providerDataId && candidate.providerDataId && spot.providerDataId !== candidate.providerDataId)) throw new ServiceError('provider_identity_mismatch');
        const bundle = collectReviewEvidence(candidate, result.payload.place_results, result.fetchedAt);
        if (bundle) reviews.set(candidate.id, bundle);
        return candidate;
      });
      for (const result of enriched) {
        if (result.status === 'fulfilled') spots = spots.map((s) => s.id === result.value.id ? result.value : s);
        else failures.push(result.reason instanceof ServiceError ? result.reason.code : 'provider_unavailable');
      }
      if (invalid) failures.push('invalid_records_omitted');
      if (!spots.length && failures.length) throw new ServiceError(failures[0]!);
      let dataset = DatasetSchema.parse({ city: { id: 'us-tx-austin', name: 'Austin', ...coverage.center,
        timezone: 'America/Chicago', mode: 'cached', datasetVersion: version },
        snapshot: { schemaVersion: 1, cityId: 'us-tx-austin', mode: 'cached', datasetVersion: version,
          fetchedAt: new Date(now()).toISOString(), spots },
        details: spots.map((spot) => ({ schemaVersion: 1, spot, evidence: [] })) });
      const warnings = ['Bounded provider search; coverage is not exhaustive. No current occupancy or seating guarantee.'];
      if (failures.length) warnings.push(`Partial source acquisition: ${[...new Set(failures)].join(', ')}`);
      if (options.extract) {
        const prepared = await prepareDataset(dataset, { extract: options.extract, loadEvidence: async (id) => reviews.get(id) });
        dataset = prepared.dataset;
        if (prepared.unavailable || prepared.missingEvidence) warnings.push('Muse inference unavailable for some places; source facts remain usable.');
      } else warnings.push('Muse inference unavailable; atmosphere and unsupported amenities remain unknown.');
      // Content identity includes acquisition metadata and coarse area, never user coordinates.
      const id = `nearby-${createHash('sha256').update(JSON.stringify([coverage, dataset])).digest('hex').slice(0, 40)}`;
      dataset.city.datasetVersion = id;
      dataset.snapshot.datasetVersion = id;
      dataset.snapshot.spots.forEach((s) => { s.datasetVersion = id; });
      dataset.details.forEach((d) => { d.spot.datasetVersion = id; });
      const value = StoredSchema.parse({ dataset, coverage, warnings, partialFailures: failures.length });
      const fetchedAt = new Date(now()).toISOString();
      await options.store.put(snapshotKey(id), { payload: value, fetchedAt, expiresAt: new Date(now() + 7 * TTL).toISOString() });
      await options.store.put(areaKey, { payload: value, fetchedAt,
        expiresAt: new Date(now() + (failures.length || !spots.length ? 300_000 : TTL)).toISOString() });
      return response(!spots.length ? 'empty' : failures.some((f) => /budget|rate_limit/.test(f)) ? 'quota' : failures.length ? 'partial' : 'ready', value,
        { externalAttempts: api.metrics.externalCalls, cacheHits: api.metrics.cacheHits, partialFailures: failures.length });
    } catch (error) {
      const code = error instanceof ServiceError ? error.code : 'storage_unavailable';
      const status = /budget|rate_limit/.test(code) ? 'quota' : /timeout/.test(code) ? 'timeout' : 'unavailable';
      const result = response(status, previous?.value ?? null, { externalAttempts: api.metrics.externalCalls,
        cacheHits: api.metrics.cacheHits, partialFailures: Math.max(1, failures.length) }, coverage);
      result.warnings.push(previous ? 'Acquisition failed; previous area snapshot retained with original source times.' : 'No verified snapshot is available for this area.');
      return result;
    } finally {
      if (slot) active--;
      if (acquired) await options.store.releaseLease(leaseKey, owner).catch(() => undefined);
    }
  }
  return { discover, getDataset };
}
export type DiscoveryService = ReturnType<typeof createDiscoveryService>;
