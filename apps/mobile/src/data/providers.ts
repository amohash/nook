import { ApiErrorSchema, CitiesSchema, QuerySchema, RecommendationSchema, SnapshotSchema,
  SpotDetailSchema, type DataProvider, type Query } from '@space/contracts';
import { rankSpots } from '@space/core';
import { cities, DEMO_NOW, getDemoDetail, snapshot } from '@space/fixtures';

let fixtureRequest = 0;
export const fixtureProvider: DataProvider = {
  async listCities() { return cities; },
  async listSpots(cityId) {
    if (cityId !== snapshot.cityId) throw new Error('City not found');
    return SnapshotSchema.parse(snapshot);
  },
  async getSpot(id) { return SpotDetailSchema.parse(getDemoDetail(id)); },
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

export function createApiProvider(baseUrl: string): DataProvider {
  const base = baseUrl.replace(/\/$/, '');
  async function request(path: string, query?: Query): Promise<unknown> {
    if (!/^https?:\/\//.test(base)) throw new Error('Set a valid API base URL before using the API provider.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${base}${path}`, { signal: controller.signal,
        ...(query ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(QuerySchema.parse(query)) } : {}) });
      const body: unknown = await response.json();
      if (!response.ok) {
        const parsed = ApiErrorSchema.safeParse(body);
        throw new Error(parsed.success ? parsed.data.error.message : 'API request failed');
      }
      return body;
    } finally { clearTimeout(timeout); }
  }
  return {
    async listCities() { return CitiesSchema.parse(await request('/v1/cities')).cities; },
    async listSpots(id) { return SnapshotSchema.parse(await request(`/v1/cities/${encodeURIComponent(id)}/spots`)); },
    async getSpot(id) { return SpotDetailSchema.parse(await request(`/v1/spots/${encodeURIComponent(id)}`)); },
    async recommend(query) { return RecommendationSchema.parse(await request('/v1/recommendations', query)); },
  };
}
