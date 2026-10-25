/** Run from the repository root: npx tsx server/src/ai/smoke.ts [anonymous-source.json]
 * Makes a real paid server request only when META_API_KEY is configured. Default evidence is synthetic.
 */
import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { createMuseProvider } from '../providers/muse';
import { createEvidenceExtractor, MemoryEvidenceCache } from './extract';
import { SourceSchema } from './schema';

config({ path: 'server/.env', quiet: true });
const key = process.env.META_API_KEY;
if (!key) {
  console.log(JSON.stringify({ status: 'blocked', reason: 'META_API_KEY is not configured on the server', externalCalls: 0 }));
  process.exitCode = 1;
} else {
  const file = process.argv[2];
  const source = SourceSchema.parse(file ? JSON.parse(await readFile(file, 'utf8')) : {
    placeId: 'smoke:fictional-cafe', category: 'cafe', language: 'en',
    snippets: [{ id: 'synthetic:1', text: 'Fictional test evidence: quiet tables with Wi-Fi. No information about outlets or groups.' }],
  });
  const extractor = createEvidenceExtractor({ complete: createMuseProvider({ apiKey: key }), cache: new MemoryEvidenceCache(),
    model: process.env.META_MODEL || undefined });
  const cold = await extractor(source);
  const warm = cold.status === 'ready' ? await extractor(source) : null;
  console.log(JSON.stringify({ evidenceMode: file ? 'caller-supplied-anonymous-source' : 'synthetic-test-evidence',
    cold, warm }, null, 2));
  if (cold.status !== 'ready' || warm?.cacheHits !== 1) process.exitCode = 1;
}
