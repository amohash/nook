import { CitiesSchema, QuerySchema, RecommendationSchema, SnapshotSchema,
  SpotDetailSchema, DiscoveryRequestSchema, DiscoveryResponseSchema, AssistantRequestSchema, AssistantResponseSchema,
  TesterSessionRequestSchema, TesterSessionResponseSchema, ApiErrorSchema, type DataProvider, type Query } from '@space/contracts';
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

export class ApiUnavailableError extends Error {
  constructor(public readonly code: string, public readonly retryable: boolean, message: string) {
    super(message); this.name = 'ApiUnavailableError';
  }
}

/** A hosted free-tier API can take about 30s to wake. Only the first lookup, which every launch makes,
 * gets this allowance, and only when the caller did not choose its own timeout. All other requests keep
 * the normal deadline. */
export const COLD_START_DEADLINE_MS = 45_000;

const DEFAULT_DEADLINE_MS = 8000;

export function createApiProvider(baseUrl: string, requestedTimeoutMs?: number): DataProvider {
  const timeoutMs = requestedTimeoutMs ?? DEFAULT_DEADLINE_MS;
  const base = publicApiBase(baseUrl);
  let sessionId: string | null = null;
  async function request(path: string, body?: unknown): Promise<unknown> {
    if (!base) throw new Error('Set a valid API base URL before using the API provider.');
    const deadlineMs = path === '/v1/discovery' ? Math.max(timeoutMs, 60_000) : path === '/v1/assistant' ? Math.max(timeoutMs, 20_000)
      : path === '/v1/cities' && requestedTimeoutMs === undefined ? COLD_START_DEADLINE_MS : timeoutMs;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Race the whole operation, including body reads. Abort alone is not a deadline
    // on transports that fail to settle after cancellation.
    const operation = async () => {
      const response = await fetch(`${base}${path}`, { signal: controller.signal,
        headers: { ...(body ? {'Content-Type': 'application/json'} : {}), ...(sessionId ? {Authorization: `Bearer ${sessionId}`} : {}) },
        ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
      if (response.status === 404 && (path.startsWith('/v1/spots/') || /^\/v1\/discovery\/[^/]+\/places\//.test(path))) throw new PlaceNotFoundError();
      if (response.status === 404 && (path.startsWith('/v1/cities/') || path === '/v1/recommendations')) throw new Error('City not found');
      const result: unknown = await response.json();
      if (!response.ok && path === '/v1/assistant') {
        const assistant = AssistantResponseSchema.safeParse(result);
        if (assistant.success) return assistant.data;
      }
      if (!response.ok) {
        const parsed = ApiErrorSchema.safeParse(result);
        throw new ApiUnavailableError(parsed.success ? parsed.data.error.code : 'unavailable',
          parsed.success ? parsed.data.error.retryable : true,
          response.status === 401 || response.status === 403 ? 'Tester access expired or was denied. Enter the access code again.' : 'API unavailable. Retry or choose an offline dataset.');
      }
      return result;
    };
    try {
      return await Promise.race([operation(), new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('API timed out. Retry or choose an offline dataset.'));
        }, deadlineMs);
      })]);
    } finally { clearTimeout(timeout); }
  }
  return {
    async createTesterSession(input) {
      const result = TesterSessionResponseSchema.parse(await request('/v1/tester-sessions', TesterSessionRequestSchema.parse(input)));
      sessionId = result.sessionId;
      return result;
    },
    async discover(input) { return DiscoveryResponseSchema.parse(await request('/v1/discovery', DiscoveryRequestSchema.parse(input))); },
    async assist(input) { return AssistantResponseSchema.parse(await request('/v1/assistant', AssistantRequestSchema.parse(input))); },
    async listCities() { return CitiesSchema.parse(await request('/v1/cities')).cities; },
    async listSpots(id, snapshotId) { return SnapshotSchema.parse(await request(snapshotId ? `/v1/discovery/${encodeURIComponent(snapshotId)}` : `/v1/cities/${encodeURIComponent(id)}/spots`)); },
    async getSpot(id, snapshotId) { return SpotDetailSchema.parse(await request(snapshotId ? `/v1/discovery/${encodeURIComponent(snapshotId)}/places/${encodeURIComponent(id)}` : `/v1/spots/${encodeURIComponent(id)}`)); },
    async recommend(query) { return RecommendationSchema.parse(await request('/v1/recommendations', QuerySchema.parse(query))); },
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
