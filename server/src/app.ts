import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cors from 'cors';
import { CitiesSchema, HealthSchema, SnapshotSchema,
  SpotDetailSchema } from '@space/contracts';
import { DEMO_NOW } from '@space/fixtures';
import { z } from '@space/contracts';
import { DatasetSchema, demoDataset, type Dataset } from './data/dataset';
import { createRecommendationRouter } from './routes/recommend';
import { createAssistantRouter, type AssistantDependencies } from './ai/assistant';
import { createDiscoveryRouter, type TesterAccess } from './discovery/access';
import type { DiscoveryService } from './discovery/service';
import { ServiceError } from './providers/http';

export function createApp({ commit = 'development', dataset = demoDataset, nearby }: {
  commit?: string; dataset?: Dataset;
  nearby?: { service: DiscoveryService; access: TesterAccess; assistant?: Pick<AssistantDependencies, 'complete' | 'maxTotalCalls'> };
} = {}) {
  const validated = DatasetSchema.parse(dataset);
  const { snapshot } = validated;
  const cities = [validated.city];
  const details = new Map(validated.details.map((detail) => [detail.spot.id, detail]));
  const getDetail = (id: string) => details.get(id)!;
  const idSchema = z.string().min(1).max(200);
  const readParams: RequestHandler = (req, res, next) => {
    if (!idSchema.safeParse(req.params.id).success || Object.keys(req.query).length) {
      res.status(400).json(error('invalid_query', 'Expected a bounded resource ID and no query parameters', res.locals.requestId)); return;
    }
    next();
  };
  const app = express();
  app.disable('x-powered-by');
  // Existing pinned dataset remains usable when the opt-in runtime is disabled.
  app.use(cors());
  app.use((_req, res, next) => { res.locals.requestId = randomUUID(); next(); });
  app.use(express.json({ limit: '32kb' }));
  if (nearby) {
    app.use('/v1', createDiscoveryRouter(nearby.service, nearby.access));
    app.use('/v1/assistant', createAssistantRouter({
      ...nearby.assistant,
      authorizeSession: nearby.access.authorizeSession,
      resolveContext: async (sessionId, snapshotId) => {
        if (!await nearby.access.authorizeSession(sessionId)) return null;
        const data = await nearby.service.getDataset(snapshotId);
        return data ? { snapshot: data.snapshot, details: data.details } : null;
      },
      clock: (data) => ({ now: data.mode === 'demo' ? DEMO_NOW : new Date().toISOString() }),
    }));
  }
  app.get('/health', (_req, res) => res.json(HealthSchema.parse({ status: 'ok', contractVersion: 1, commit })));
  app.get('/v1/cities', (_req, res) => res.json(CitiesSchema.parse({ schemaVersion: 1, cities })));
  app.get('/v1/cities/:id/spots', readParams, (req, res) => {
    if (req.params.id !== snapshot.cityId) { res.status(404).json(error('not_found', 'City not found', res.locals.requestId)); return; }
    res.json(SnapshotSchema.parse(snapshot));
  });
  app.get('/v1/spots/:id', readParams, (req, res) => {
    if (!snapshot.spots.some((spot) => spot.id === req.params.id)) {
      res.status(404).json(error('not_found', 'Place not found', res.locals.requestId)); return;
    }
    res.json(SpotDetailSchema.parse(getDetail(idSchema.parse(req.params.id))));
  });
  app.use('/v1/recommendations', async (req, res, next) => {
    if (req.body && typeof req.body === 'object' && 'snapshotId' in req.body) {
      const header = req.get('authorization');
      const session = header?.startsWith('Bearer ') ? header.slice(7) : '';
      if (!nearby || !await nearby.access.authorizeSession(session)) {
        res.status(401).json(error('session_expired', 'Enter a valid tester access code', res.locals.requestId)); return;
      }
    }
    next();
  }, createRecommendationRouter({
    loadSnapshot: async (cityId, snapshotId) => {
      if (snapshotId) {
        const data = await nearby?.service.getDataset(snapshotId);
        return data?.snapshot.cityId === cityId ? data.snapshot : null;
      }
      return cityId === snapshot.cityId ? snapshot : null;
    },
    clock: (data) => ({ now: data.mode === 'demo' ? DEMO_NOW : new Date().toISOString() }),
  }));
  app.use((_req, res) => res.status(404).json(error('not_found', 'Route not found', res.locals.requestId)));
  const handleError: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    if (err instanceof ServiceError) {
      res.status(err.status).json(error('service_unavailable', 'The requested source is temporarily unavailable', res.locals.requestId, true)); return;
    }
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
