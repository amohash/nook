import { CitySchema, QuerySchema, RecommendationSchema, SnapshotSchema, SpotDetailSchema, z,
  DiscoveryResponseSchema, AssistantResponseSchema, type City, type DataProvider, type Query, type Snapshot } from '@space/contracts';
import { rankSpots } from '@space/core';
import { PlaceNotFoundError } from './providers';
import type { SettingsStorage } from './settings';

export type ProviderChoice = 'api' | 'cached' | 'demo';
const BundleSchema = z.strictObject({version: z.literal(1), city: CitySchema, snapshot: SnapshotSchema});
type Bundle = z.infer<typeof BundleSchema>;
const MAX_CACHE_CHARS = 2_000_000;
function hasSynthetic(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => (key === 'source' && item === 'synthetic') || hasSynthetic(item));
}
export function validateRealBundle(input: unknown): Bundle {
  const bundle = BundleSchema.parse(input);
  const {city, snapshot} = bundle;
  if (city.mode === 'demo' || snapshot.mode === 'demo' || city.mode !== snapshot.mode || city.id !== snapshot.cityId ||
    city.datasetVersion !== snapshot.datasetVersion || new Set(snapshot.spots.map((s) => s.id)).size !== snapshot.spots.length ||
    snapshot.spots.some((s) => s.cityId !== city.id || s.datasetVersion !== city.datasetVersion ||
      s.datasetMode === 'demo' || s.datasetMode !== snapshot.mode) || hasSynthetic(snapshot)) {
    throw new Error('Offline dataset is invalid or mixes real and fictional data.');
  }
  return bundle;
}
export class StaleProviderError extends Error {
  constructor() { super('Dataset changed; previous request discarded.'); }
}
export type RecoveryState = {
  choice: ProviderChoice; revision: number; cached: {city: City; fetchedAt: string} | null;
  cacheWarning: string | null;
};

// Cache stores only a public normalized city snapshot. No Query, origin, endpoint,
// credentials, request body, or provider raw payload is serialized.
export function createRecoveryProvider(options: {
  api: DataProvider; demo: DataProvider; storage: SettingsStorage; cacheKey: string;
  initialChoice: 'api' | 'demo'; now?: () => string;
}) {
  let state: RecoveryState = {choice: options.initialChoice, revision: 0, cached: null, cacheWarning: null};
  let bundle: Bundle | null = null;
  let selected: Bundle | null = null;
  let apiCity: City | null = null;
  const snapshots = new Map<string, Snapshot>();
  let discoverySequence = 0;
  let writeQueue: Promise<unknown> = Promise.resolve();
  const now = options.now ?? (() => new Date().toISOString());
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<RecoveryState>) => {
    state = {...state, ...patch}; listeners.forEach((listener) => listener());
  };
  const assertCurrent = (revision: number) => {if (revision !== state.revision) throw new StaleProviderError();};
  async function readCache() {
    try {
      const raw = await options.storage.getItem(options.cacheKey);
      if (raw === null) return;
      if (raw.length > MAX_CACHE_CHARS) throw new Error('Cache too large');
      const value = validateRealBundle(JSON.parse(raw));
      // A fresh download wins over a slow disk read.
      if (!bundle) {bundle = value; publish({cached: {city: value.city, fetchedAt: value.snapshot.fetchedAt}});}
    } catch {publish({cacheWarning: 'Saved offline data is unavailable or invalid. Connect to the API to refresh it.'});}
  }
  const ready = readCache();
  async function storeBundle(value: Bundle, revision: number) {
    assertCurrent(revision);
    bundle = value;
    publish({cached: {city: value.city, fetchedAt: value.snapshot.fetchedAt}, cacheWarning: null});
    const serialized = JSON.stringify(value);
    const operation = writeQueue.then(async () => {
      if (revision !== state.revision) return;
      if (serialized.length > MAX_CACHE_CHARS) throw new Error('Cache too large');
      await options.storage.setItem(options.cacheKey, serialized);
    });
    writeQueue = operation.catch(() => {});
    // Failure to persist must not turn a successful API request into an outage.
    void operation.catch(() => {if (revision === state.revision) publish({cacheWarning: 'Offline data is available for this session only; it could not be saved on this device.'});});
  }
  function offlineSnapshot(): Snapshot {
    if (!selected) throw new Error('No validated cached dataset. Choose API or fictional demo explicitly.');
    return SnapshotSchema.parse({...selected.snapshot, mode: 'cached',
      spots: selected.snapshot.spots.map((spot) => ({...spot, datasetMode: 'cached'}))});
  }
  function checkSpot(spot: Snapshot['spots'][number], snapshotId?: string) {
    if (snapshotId) {
      const snapshot = snapshots.get(snapshotId);
      if (!snapshot || !snapshot.spots.some((item) => item.id === spot.id) || spot.cityId !== snapshot.cityId ||
        spot.datasetVersion !== snapshot.datasetVersion || spot.datasetMode !== snapshot.mode || hasSynthetic(spot)) {
        throw new Error('Discovery dataset changed. Refresh nearby explicitly.');
      }
      return;
    }
    if (!apiCity || spot.cityId !== apiCity.id || spot.datasetVersion !== apiCity.datasetVersion ||
      spot.datasetMode !== apiCity.mode || (apiCity.mode !== 'demo' && hasSynthetic(spot))) {
      throw new Error('API dataset changed. Select API again to reload it.');
    }
  }
  async function guarded<T>(operation: (choice: ProviderChoice, revision: number) => Promise<T>): Promise<T> {
    const {choice, revision} = state;
    try {const result = await operation(choice, revision); assertCurrent(revision); return result;}
    catch (error) {assertCurrent(revision); throw error;}
  }
  const provider: DataProvider = {
    createTesterSession: (input) => guarded(async (choice) => {
      if (choice !== 'api' || !options.api.createTesterSession) throw new Error('Tester access requires the API provider.');
      return options.api.createTesterSession(input);
    }),
    discover: (input) => guarded(async (choice, revision) => {
      if (choice !== 'api' || !options.api.discover) throw new Error('Nearby discovery requires the API provider.');
      const sequence = ++discoverySequence;
      const result = DiscoveryResponseSchema.parse(await options.api.discover(input));
      assertCurrent(revision);
      if (sequence !== discoverySequence) throw new StaleProviderError();
      if (result.snapshot && result.snapshotId) {
        const snapshot = result.snapshot;
        if (!apiCity || apiCity.id !== snapshot.cityId) throw new Error('Discovery city mismatch.');
        const city = {...apiCity, mode: snapshot.mode, datasetVersion: snapshot.datasetVersion};
        const value = validateRealBundle({version: 1, city, snapshot});
        snapshots.set(result.snapshotId, snapshot);
        await storeBundle(value, revision);
      }
      return result;
    }),
    assist: (input) => guarded(async (choice) => {
      if (choice !== 'api' || !options.api.assist || !snapshots.has(input.snapshotId)) throw new Error('Assistant requires the current nearby snapshot.');
      const result = AssistantResponseSchema.parse(await options.api.assist(input));
      const snapshot = snapshots.get(input.snapshotId)!;
      if (result.references.some((ref) => !snapshot.spots.some((spot) => spot.id === ref.placeId))) throw new Error('Assistant referenced an unknown place.');
      return result;
    }),
    listCities: () => guarded(async (choice, revision) => {
      if (choice === 'demo') return options.demo.listCities();
      if (choice === 'cached') return [{...selected!.city, mode: 'cached'}];
      const city = (await options.api.listCities())[0];
      assertCurrent(revision);
      if (!city) throw new Error('No API dataset available.');
      const snapshot = await options.api.listSpots(city.id);
      assertCurrent(revision);
      if (city.mode !== 'demo') {
        const value = validateRealBundle({version: 1, city, snapshot});
        await storeBundle(value, revision);
      } else if (snapshot.mode !== 'demo' || snapshot.datasetVersion !== city.datasetVersion ||
        snapshot.cityId !== city.id || snapshot.spots.some((s) => s.datasetMode !== 'demo')) {
        throw new Error('API dataset identity mismatch.');
      }
      assertCurrent(revision);
      apiCity = city;
      return [city];
    }),
    listSpots: (id, snapshotId) => guarded(async (choice) => {
      if (choice === 'api' && snapshotId) {
        const snapshot = snapshots.get(snapshotId);
        if (!snapshot || snapshot.cityId !== id) throw new Error('Discovery snapshot unavailable. Refresh nearby.');
        return snapshot;
      }
      if (choice === 'demo') return options.demo.listSpots(id);
      if (choice === 'cached') {
        const snapshot = offlineSnapshot();
        if (snapshot.cityId !== id) throw new Error('City not in selected dataset.');
        return snapshot;
      }
      const snapshot = await options.api.listSpots(id);
      if (!apiCity || snapshot.cityId !== apiCity.id || snapshot.datasetVersion !== apiCity.datasetVersion || snapshot.mode !== apiCity.mode) {
        throw new Error('API dataset changed. Select API again to reload it.');
      }
      snapshot.spots.forEach((spot) => checkSpot(spot));
      return snapshot;
    }),
    getSpot: (id, snapshotId) => guarded(async (choice) => {
      if (choice === 'demo') return options.demo.getSpot(id);
      if (choice === 'cached') {
        const spot = offlineSnapshot().spots.find((item) => item.id === id);
        if (!spot) throw new PlaceNotFoundError();
        // Source snippets are not in the snapshot endpoint. Never invent citations.
        return SpotDetailSchema.parse({schemaVersion: 1, spot, evidence: []});
      }
      const detail = await options.api.getSpot(id, snapshotId);
      checkSpot(detail.spot, snapshotId);
      return detail;
    }),
    recommend: (input) => guarded(async (choice) => {
      const query = QuerySchema.parse(input);
      if (choice === 'demo') return options.demo.recommend(query);
      if (choice === 'api') {
        const response = await options.api.recommend(query);
        if (!query.snapshotId && (!apiCity || query.cityId !== apiCity.id || response.datasetVersion !== apiCity.datasetVersion || response.mode !== apiCity.mode)) {
          throw new Error('API dataset changed. Select API again to reload it.');
        }
        if (query.snapshotId) {
          const snapshot = snapshots.get(query.snapshotId);
          if (!snapshot || response.datasetVersion !== snapshot.datasetVersion || response.mode !== snapshot.mode) throw new Error('Discovery recommendation identity mismatch.');
        }
        response.results.forEach((result) => checkSpot(result.spot, query.snapshotId));
        return response;
      }
      const snapshot = offlineSnapshot();
      if (query.cityId !== snapshot.cityId) throw new Error('City not in selected dataset.');
      const clock = now();
      const started = performance.now();
      const ranked = rankSpots(snapshot.spots, query, {now: clock});
      return RecommendationSchema.parse({schemaVersion: 1, requestId: `offline-${state.revision}`,
        mode: 'cached', datasetVersion: snapshot.datasetVersion, generatedAt: clock,
        results: ranked.results.map((result) => ({...result, spot: snapshot.spots.find((s) => s.id === result.spotId)!})),
        excludedCounts: ranked.excludedCounts, relaxations: ranked.relaxations,
        metrics: {rankMs: performance.now() - started, candidateCount: ranked.candidateCount,
          qualifyingCount: ranked.qualifyingCount, externalCalls: 0, cacheHits: 1}});
    }),
  };
  return {provider, ready, getState: () => state,
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    async switchTo(choice: ProviderChoice) {
      // A stalled device storage read must never block the bundled demo.
      if (choice === 'cached' && !bundle) await ready;
      if (choice === 'cached' && !bundle) throw new Error('No validated real offline dataset is available. Choose API or the fictional demo.');
      selected = choice === 'cached' ? bundle : null;
      apiCity = null;
      snapshots.clear();
      publish({choice, revision: state.revision + 1});
    },
  };
}

// Keep active strict constraints on switch, clear GPS and reset the clock for the
// destination dataset. Mode-specific saved IDs/preferences are loaded separately.
export function queryAfterSwitch(previous: Query | undefined, city: City, initial: Query): Query {
  return previous ? QuerySchema.parse({...previous, cityId: city.id, origin: initial.origin, departAt: initial.departAt, snapshotId: undefined}) : initial;
}
