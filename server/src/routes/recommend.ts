import { randomUUID } from 'node:crypto';
import { Router, json, type ErrorRequestHandler } from 'express';
import { InstantSchema, QuerySchema, RecommendationSchema, SnapshotSchema, type Snapshot } from '@space/contracts';
import { rankSpots, type Clock } from '@space/core';

export type RecommendationDependencies = {
  /** Cached normalized data only: no SerpApi or Muse calls on filter changes. */
  loadSnapshot: (cityId: string) => Promise<Snapshot | null>;
  /** Supply the labeled fixture clock for demo and current server clock for real data. */
  clock: (snapshot: Snapshot) => Clock;
};
/** B mounts this router at /v1/recommendations, replacing the foundation inline handler. */
export function createRecommendationRouter({ loadSnapshot, clock }: RecommendationDependencies) {
  const router = Router();
  router.use((_req, res, next) => { res.locals.requestId ??= randomUUID(); next(); });
  router.use(json({ limit: '32kb' }));
  router.post('/', async (req, res) => {
    const requestId = res.locals.requestId as string;
    const error = (status: number, code: string, message: string, retryable = false) =>
      res.status(status).json({ error: { code, message, retryable }, requestId });
    const query = QuerySchema.safeParse(req.body);
    if (!query.success) { error(400, 'invalid_query', 'Query does not match contract version 1'); return; }
    try {
      const raw = await loadSnapshot(query.data.cityId);
      if (!raw) { error(404, 'not_found', 'City not found'); return; }
      const snapshot = SnapshotSchema.parse(raw);
      if (snapshot.cityId !== query.data.cityId || snapshot.spots.some((s) => s.cityId !== snapshot.cityId ||
        s.datasetMode !== snapshot.mode || s.datasetVersion !== snapshot.datasetVersion) ||
        new Set(snapshot.spots.map((s) => s.id)).size !== snapshot.spots.length) {
        error(409, 'incompatible_snapshot', 'Snapshot identity or dataset metadata is inconsistent'); return;
      }
      const currentClock = clock(snapshot);
      InstantSchema.parse(currentClock.now);
      const started = performance.now();
      const ranking = rankSpots(snapshot.spots, query.data, currentClock);
      const rankMs = performance.now() - started;
      const spots = new Map(snapshot.spots.map((spot) => [spot.id, spot]));
      res.json(RecommendationSchema.parse({ schemaVersion: 1, requestId, mode: snapshot.mode,
        datasetVersion: snapshot.datasetVersion, generatedAt: currentClock.now,
        results: ranking.results.map((r) => ({ ...r, spot: spots.get(r.spotId) })),
        excludedCounts: ranking.excludedCounts, relaxations: ranking.relaxations,
        metrics: { rankMs, candidateCount: ranking.candidateCount, qualifyingCount: ranking.qualifyingCount,
          externalCalls: 0, cacheHits: 0 },
      }));
    } catch { error(503, 'recommendations_unavailable', 'Recommendations are temporarily unavailable', true); }
  });
  const invalidBody: ErrorRequestHandler = (_err, _req, res, _next) => {
    res.status(400).json({ error: { code: 'invalid_body', message: 'Expected a JSON body of at most 32 KB', retryable: false },
      requestId: res.locals.requestId });
  };
  router.use(invalidBody);
  return router;
}
