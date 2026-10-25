/** Paid opt-in CLI. Exactly two fixed, non-personal submissions; no automatic retry.
 * SERVER_ENV_FILE may point to the existing server environment file. Never prints credentials/prompts.
 * npx tsx server/src/ai/assistant-smoke.ts <normalized-real-dataset.json>
 */
import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { QuerySchema } from '@space/contracts';
import { DatasetSchema } from '../data/dataset';
import { createMuseProvider, MUSE_MODEL } from '../providers/muse';
import { createPlaceAssistant } from './assistant';

config({ path: process.env.SERVER_ENV_FILE ?? 'server/.env', quiet: true });
const key = process.env.META_API_KEY;
if (!key) {
  console.log(JSON.stringify({ status: 'blocked', missing: 'META_API_KEY (server-only)', externalAttempts: 0 }));
  process.exitCode = 1;
} else {
  const [path, ...extra] = process.argv.slice(2);
  if (!path || extra.length) throw new Error('Expected one normalized real dataset path');
  const dataset = DatasetSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  if (dataset.snapshot.mode === 'demo') throw new Error('Real provider smoke requires real place data');
  const now = new Date().toISOString();
  const query = QuerySchema.parse({ schemaVersion: 1, cityId: dataset.city.id,
    snapshotId: dataset.snapshot.datasetVersion,
    origin: { lat: 30.2862, lng: -97.7394, source: 'manual' }, departAt: now,
    sessionMinutes: 60, categories: [], maxWalkMinutes: 60, maxPriceLevel: null,
    requireOpenForSession: false, intent: 'study', groupSize: 1, targetNoise: 0.15,
    targetCrowd: 0.25, tagWeights: { study: 1, quiet: 1 }, amenities: { wifi: 'prefer', outlets: 'prefer' },
    access: 'any', limit: 3 });
  let externalAttempts = 0;
  const transport = createMuseProvider({ apiKey: key });
  const assist = createPlaceAssistant({ complete: (request) => { externalAttempts++; return transport(request); },
    authorizeSession: async () => true, resolveContext: async () => ({ snapshot: dataset.snapshot, details: dataset.details }),
    clock: () => ({ now }), maxTotalCalls: 2, maxSessionCalls: 2, budgetMs: 30_000 });
  const records = [];
  for (const [scenario, message] of [
    ['explain', 'Why this place? Explain its fit and uncertainty.'],
    ['preferences', 'Find a quiet cafe under $15 within 10 minutes.'],
  ]) {
    const started = performance.now(), before = externalAttempts;
    const result = await assist({ sessionId: 'fixed-public-origin-live-smoke-session', snapshotId: dataset.snapshot.datasetVersion,
      query, placeIds: [], message });
    records.push({ scenario, httpStatus: result.httpStatus, status: result.body.status,
      references: result.body.references, proposedQueryPatch: result.body.proposedQueryPatch ?? null,
      externalAttempts: externalAttempts - before, durationMs: performance.now() - started });
  }
  console.log(JSON.stringify({ measuredAt: now, model: MUSE_MODEL, evidenceMode: 'normalized-real-place-facts',
    datasetVersion: dataset.snapshot.datasetVersion, hardAttemptBudget: 2, externalAttempts, retries: 0,
    storesConversation: false, includesDeviceCoordinates: false, records }, null, 2));
  if (records.some((r) => r.status !== 'ready' || r.externalAttempts !== 1)) process.exitCode = 1;
}
