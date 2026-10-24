import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { CitiesSchema, HealthSchema, QuerySchema, RecommendationSchema, SnapshotSchema,
  SpotDetailSchema } from '@space/contracts';
import { rankSpots } from '@space/core';
import { cities, DEMO_NOW, getDemoDetail, snapshot } from '@space/fixtures';

export function createApp({ commit = 'development' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Public, read-only fixture API. Paid provider actions and user writes are not exposed.
  app.use(cors());
  app.use((_req, res, next) => { res.locals.requestId = randomUUID(); next(); });
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.json(HealthSchema.parse({ status: 'ok', contractVersion: 1, commit })));
  app.get('/v1/cities', (_req, res) => res.json(CitiesSchema.parse({ schemaVersion: 1, cities })));
  app.get('/v1/cities/:id/spots', (req, res) => {
    if (req.params.id !== snapshot.cityId) { res.status(404).json(error('not_found', 'City not found', res.locals.requestId)); return; }
    res.json(SnapshotSchema.parse(snapshot));
  });
  app.get('/v1/spots/:id', (req, res) => {
    if (!snapshot.spots.some((spot) => spot.id === req.params.id)) {
      res.status(404).json(error('not_found', 'Place not found', res.locals.requestId)); return;
    }
    res.json(SpotDetailSchema.parse(getDemoDetail(req.params.id)));
  });
  app.post('/v1/recommendations', (req, res) => {
    const parsed = QuerySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json(error('invalid_query', 'Query does not match contract version 1', res.locals.requestId)); return; }
    if (parsed.data.cityId !== snapshot.cityId) { res.status(404).json(error('not_found', 'City not found', res.locals.requestId)); return; }
    const started = performance.now();
    const ranking = rankSpots(snapshot.spots, parsed.data, { now: DEMO_NOW });
    const rankMs = performance.now() - started;
    res.json(RecommendationSchema.parse({ schemaVersion: 1, requestId: res.locals.requestId,
      mode: snapshot.mode, datasetVersion: snapshot.datasetVersion, generatedAt: DEMO_NOW,
      results: ranking.results.map((result) => ({ ...result, spot: getDemoDetail(result.spotId).spot })),
      excludedCounts: ranking.excludedCounts, relaxations: ranking.relaxations,
      metrics: { rankMs, candidateCount: ranking.candidateCount, qualifyingCount: ranking.qualifyingCount,
        externalCalls: 0, cacheHits: 0 },
    }));
  });
  app.use((_req, res) => res.status(404).json(error('not_found', 'Route not found', res.locals.requestId)));
  const handleError: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    const status = typeof err === 'object' && err !== null && 'status' in err ? err.status : 500;
    const invalid = status === 400 || status === 413;
    res.status(invalid ? 400 : 500).json(error(invalid ? 'invalid_body' : 'internal_error',
      invalid ? 'Expected a JSON body of at most 32 KB' : 'Request could not be completed',
      res.locals.requestId, !invalid));
  };
  app.use(handleError);
  return app;
}

function error(code: string, message: string, requestId: string, retryable = false) {
  return { error: { code, message, retryable }, requestId };
}
