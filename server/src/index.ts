import 'dotenv/config';
import { createApp } from './app';
import { loadDataset } from './data/dataset';
import { createDiscoveryService } from './discovery/service';
import { createTesterAccess } from './discovery/access';
import { SupabaseStore } from './data/supabase';
import { SupabaseEvidenceCache } from './cache/evidence-cache';
import { createEvidenceExtractor } from './ai/extract';
import { createMuseProvider } from './providers/muse';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
const dataset = await loadDataset(process.env.DATASET_PATH);
let nearby: NonNullable<Parameters<typeof createApp>[0]>['nearby'];
if (process.env.NEARBY_ENABLED === '1') {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SERPAPI_API_KEY',
    'NEARBY_TESTER_ACCESS_CODE', 'NEARBY_ACCOUNT_BUDGET_KEY'] as const;
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Nearby configuration missing: ${missing.join(', ')}`);
  const db = new SupabaseStore(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  // Review extraction is cache-only during the bounded verification. It still
  // runs C's validated pipeline; a miss is labeled unavailable without model spend.
  const extract = createEvidenceExtractor({ cache: new SupabaseEvidenceCache(db), budgetMs: 1000,
    complete: async () => { throw new Error('Runtime extraction is cache-only'); } });
  nearby = { service: createDiscoveryService({ store: db, apiKey: process.env.SERPAPI_API_KEY!,
    accountBudgetKey: process.env.NEARBY_ACCOUNT_BUDGET_KEY!, extract }),
  access: createTesterAccess({ accessCode: process.env.NEARBY_TESTER_ACCESS_CODE! }),
  assistant: { complete: process.env.META_API_KEY?.trim() ? createMuseProvider({ apiKey: process.env.META_API_KEY }) : undefined,
    maxTotalCalls: 2 } };
}
const server = createApp({ dataset, nearby, commit: process.env.COMMIT_SHA ?? 'development' }).listen(port, '0.0.0.0', () => {
  console.log(`Space API listening on port ${port}`);
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.keepAliveTimeout = 5000;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { server.close(() => process.exit(0)); });
}
