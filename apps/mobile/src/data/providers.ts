import { CitiesSchema, QuerySchema, RecommendationSchema, SnapshotSchema,
  SpotDetailSchema, type DataProvider, type Query } from '@space/contracts';
import { rankSpots } from '@space/core';
import { cities, DEMO_NOW, getDemoDetail, snapshot } from '@space/fixtures';

let fixtureRequest = 0;
export class PlaceNotFoundError extends Error {
  constructor() {
    super('Place not found');
    this.name = 'PlaceNotFoundError';
  }
}

export const fixtureProvider: DataProvider = {
  async listCities() { return cities; },
  async listSpots(cityId) {
    if (cityId !== snapshot.cityId) throw new Error('City not found');
    return SnapshotSchema.parse(snapshot);
  },
  async getSpot(id) {
    if (!snapshot.spots.some((spot) => spot.id === id)) throw new PlaceNotFoundError();
    return SpotDetailSchema.parse(getDemoDetail(id));
  },
  async recommend(input: Query) {
    const query = QuerySchema.parse(input);
    if (query.cityId !== snapshot.cityId) throw new Error('City not found');
    const started = performance.now();
    const ranked = rankSpots(snapshot.spots, query, { now: DEMO_NOW });
    return RecommendationSchema.parse({ schemaVersion: 1, requestId: `fixture-${++fixtureRequest}`,
      mode: snapshot.mode, datasetVersion: snapshot.datasetVersion, generatedAt: DEMO_NOW,
      results: ranked.results.map((r) => ({ ...r, spot: getDemoDetail(r.spotId).spot })),
      excludedCounts: ranked.excludedCounts, relaxations: ranked.relaxations,
      metrics: { rankMs: performance.now() - started, candidateCount: ranked.candidateCount,
        qualifyingCount: ranked.qualifyingCount, externalCalls: 0, cacheHits: 0 },
    });
  },
};

export function createApiProvider(baseUrl: string, timeoutMs = 8000): DataProvider {
  const base = publicApiBase(baseUrl);
  async function request(path: string, query?: Query): Promise<unknown> {
    if (!base) throw new Error('Set a valid API base URL before using the API provider.');
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Race the whole operation, including body reads. Abort alone is not a deadline
    // on transports that fail to settle after cancellation.
    const operation = async () => {
      const response = await fetch(`${base}${path}`, { signal: controller.signal,
        ...(query ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(QuerySchema.parse(query)) } : {}) });
      if (response.status === 404 && path.startsWith('/v1/spots/')) throw new PlaceNotFoundError();
      if (response.status === 404 && (path.startsWith('/v1/cities/') || path === '/v1/recommendations')) throw new Error('City not found');
      const body: unknown = await response.json();
      if (!response.ok) throw new Error('API unavailable. Retry or choose an offline dataset.');
      return body;
    };
    try {
      return await Promise.race([operation(), new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('API timed out. Retry or choose an offline dataset.'));
        }, timeoutMs);
      })]);
    } finally { clearTimeout(timeout); }
  }
  return {
    async listCities() { return CitiesSchema.parse(await request('/v1/cities')).cities; },
    async listSpots(id) { return SnapshotSchema.parse(await request(`/v1/cities/${encodeURIComponent(id)}/spots`)); },
    async getSpot(id) { return SpotDetailSchema.parse(await request(`/v1/spots/${encodeURIComponent(id)}`)); },
    async recommend(query) { return RecommendationSchema.parse(await request('/v1/recommendations', query)); },
  };
}

// Public API configuration must not contain a secret-bearing query or user info.
export function publicApiBase(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, '');
  } catch {return null;}
}
