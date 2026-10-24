import { CitiesSchema, QuerySchema, SnapshotSchema, type Evidence, type Spot } from '@space/contracts';

export const DEMO_NOW = '2026-10-24T18:00:00-05:00';
export const DATASET_VERSION = 'fictional-austin-v1';
export const DEMO_CITY_ID = 'demo-austin';
export const DEMO_LABEL = 'Demo scenario · fictional venues and synthetic facts';
export const cities = CitiesSchema.parse({ schemaVersion: 1, cities: [{
  id: DEMO_CITY_ID, name: 'Austin · demo scenario', lat: 30.2862, lng: -97.7394,
  timezone: 'America/Chicago', mode: 'demo', datasetVersion: DATASET_VERSION,
}] }).cities;
function fact<T>(value: T | null): Evidence<T> {
  return { value, source: 'synthetic', observedAt: null, fetchedAt: DEMO_NOW, confidence: value === null ? 0 : 1 };
}
const definitions = [
  { name: 'Paper Lantern (fictional)', noise: 0.1, group: 0.3, price: 1, tags: { study: 1, quiet: 1 }, category: 'cafe' },
  { name: 'Gather Yard (fictional)', noise: 0.65, group: 1, price: 1, tags: { lively: 1, group_friendly: 1 }, category: 'cafe' },
  { name: 'Pocket Library (fictional)', noise: 0.05, group: 0.1, price: 0, tags: { quiet: 1, study: 1 }, category: 'library' },
  { name: 'Juniper Table (fictional)', noise: 0.3, group: 0.6, price: 2, tags: { cozy: 1, date_night: 1 }, category: 'restaurant' },
  { name: 'Moon Desk (fictional)', noise: 0.2, group: 0.4, price: null, tags: { study: 1, late_night: 1 }, category: 'cafe' },
  { name: 'Courtyard Club (fictional)', noise: 0.7, group: 0.95, price: 2, tags: { outdoor: 1, group_friendly: 1 }, category: 'restaurant' },
  { name: 'Copper Cup (fictional)', noise: 0.4, group: 0.5, price: 1, tags: { cozy: 1, work_friendly: 1 }, category: 'cafe' },
  { name: 'Lowlight Lounge (fictional)', noise: 0.5, group: 0.8, price: 3, tags: { date_night: 1, trendy: 1 }, category: 'restaurant' },
  { name: 'Green Steps (fictional)', noise: null, group: 0.7, price: 0, tags: { outdoor: 1, budget: 1 }, category: 'park' },
  { name: 'Little Bowl (fictional)', noise: 0.6, group: 0.9, price: 1, tags: { budget: 1, lively: 1 }, category: 'restaurant' },
] as const;

export const snapshot = SnapshotSchema.parse({ schemaVersion: 1, cityId: DEMO_CITY_ID,
  mode: 'demo', datasetVersion: DATASET_VERSION, fetchedAt: DEMO_NOW,
  spots: definitions.map((item, index): Spot => ({
    id: `demo:spot-${index + 1}`, cityId: DEMO_CITY_ID, providerPlaceId: `synthetic:${index + 1}`,
    name: item.name, categories: [item.category], lat: 30.2862 + (index + 1) * 0.00035,
    lng: -97.7394 + (index % 3) * 0.0004, timezone: 'America/Chicago',
    address: 'Illustrative campus-area location · not a real venue', datasetMode: 'demo',
    datasetVersion: DATASET_VERSION, fetchedAt: DEMO_NOW, status: 'active',
    priceLevel: fact(item.price), rating: fact<number>(null), reviewCount: fact<number>(null),
    noise: fact(item.noise), groupFriendly: fact(item.group),
    wifi: fact(index === 8 ? 'unknown' : 'yes'), outlets: fact(index % 3 === 0 ? 'yes' : 'unknown'),
    publicAccess: fact('yes'), tags: fact(item.tags),
    summary: fact('Hand-written fictional scenario for testing the starter. No Muse output or real venue evidence.'),
    image: null, publicPlaceUrl: null, hoursStatus: index === 8 ? 'unknown' : 'known',
    hoursFetchedAt: index === 8 ? null : DEMO_NOW,
    weeklyHours: Array.from({ length: 7 }, (_, weekday) => ({ weekday, startMinute: 8 * 60, endMinute: 26 * 60 })),
    hoursExceptions: {}, typicalCrowd: null, liveObservation: null,
  })),
});

export function createDemoQuery(overrides: Partial<ReturnType<typeof QuerySchema.parse>> = {}) {
  return QuerySchema.parse({ schemaVersion: 1, cityId: DEMO_CITY_ID,
    origin: { lat: 30.2862, lng: -97.7394, source: 'manual' }, departAt: DEMO_NOW,
    sessionMinutes: 60, categories: [], maxWalkMinutes: 15, maxPriceLevel: null,
    requireOpenForSession: false, intent: 'study', groupSize: 1, targetNoise: 0.15,
    targetCrowd: 0.25, tagWeights: { study: 1, quiet: 1 },
    amenities: { wifi: 'prefer', outlets: 'prefer' }, access: 'any', limit: 3, ...overrides });
}

export function getDemoDetail(id: string) {
  const spot = snapshot.spots.find((s) => s.id === id);
  if (!spot) throw new Error('Demo place not found');
  return { schemaVersion: 1 as const, spot, evidence: [] };
}
