import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from '@space/contracts';
import { createEvidenceExtractor, PROMPT_VERSION, type ExtractionRecord } from '../ai/extract';
import { parseExtraction, sanitizeSource } from '../ai/schema';
import { SupabaseEvidenceCache, extractionRecordKey } from '../cache/evidence-cache';
import { loadDataset, DatasetSchema } from '../data/dataset';
import { SupabaseStore } from '../data/supabase';
import { SupabaseReviewEvidenceStore } from '../data/review-evidence';
import { ProjectionReviewSchema, applyProjectionReview } from '../data/reviewed-projection';
import { MUSE_MODEL } from '../providers/muse';
import { prepareDataset, publishDataset } from './publish-dataset';

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const sourcePath = arg('source'), reviewPath = arg('review');
  if (!sourcePath || !reviewPath) throw new Error('Explicit source and review required');
  const version = z.string().regex(/^austin-[a-z0-9-]{1,80}$/).parse(arg('version'));
  const publish = args.includes('--publish');
  const config = z.object({ SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) }).parse(process.env);
  const db = new SupabaseStore(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  const original = await loadDataset(sourcePath);
  if (original.snapshot.mode !== 'cached' || original.city.id !== 'us-tx-austin' || version === original.snapshot.datasetVersion) {
    throw new Error('A new real Austin version is required');
  }
  const existing = z.array(z.unknown()).parse(await db.call(`datasets?dataset_version=eq.${encodeURIComponent(version)}&select=dataset_version&limit=1`));
  if (existing.length) throw new Error('Target version is already published; do not overwrite');
  const review = ProjectionReviewSchema.parse(JSON.parse(await readFile(reviewPath, 'utf8')));
  const sources = new SupabaseReviewEvidenceStore(db), records = new Map<string, ExtractionRecord>();
  for (const spot of original.snapshot.spots) {
    const bundle = await sources.get(spot.id, original.snapshot.datasetVersion);
    if (!bundle) continue;
    const source = sanitizeSource(bundle.source);
    const sourceHash = createHash('sha256').update(JSON.stringify(source)).digest('hex');
    const key = extractionRecordKey({ sourceHash, model: MUSE_MODEL, promptVersion: PROMPT_VERSION,
      language: source.language, output: { placeId: spot.id } });
    const record = await new SupabaseEvidenceCache(db).get(key);
    if (!record) throw new Error('Matching cached extraction missing; acquisition is disabled');
    parseExtraction(JSON.stringify(record.output), source);
    records.set(spot.id, record);
  }
  if (records.size !== 10) throw new Error('Expected exactly ten reviewed cached extractions');
  const candidate = structuredClone(original);
  candidate.city.datasetVersion = version; candidate.snapshot.datasetVersion = version;
  candidate.snapshot.spots.forEach((s) => { s.datasetVersion = version; });
  candidate.details.forEach((d) => { d.spot.datasetVersion = version; });
  let blockedModelCalls = 0, cacheHits = 0;
  const extract = createEvidenceExtractor({ cache: new SupabaseEvidenceCache(db), model: MUSE_MODEL,
    complete: async () => { blockedModelCalls++; throw new Error('Model acquisition is disabled'); } });
  const prepared = await prepareDataset(DatasetSchema.parse(candidate), {
    loadEvidence: (id) => sources.get(id, original.snapshot.datasetVersion),
    extract: async (source) => {
      const result = await extract(source);
      if (result.externalCalls !== 0 || result.cacheHits !== 1) throw new Error('Expected a persistent cache hit');
      cacheHits += result.cacheHits;
      return result;
    },
  });
  if (blockedModelCalls || prepared.ready !== 10 || prepared.unavailable) throw new Error('Incomplete cached projection');
  const dataset = applyProjectionReview(prepared.dataset, original, records, review);
  if (dataset.snapshot.spots.filter((s) => s.summary.source === 'muse' && s.summary.value).length !== 10) throw new Error('Ten summaries required');
  const output = resolve(`../fixtures/data/${version}.json`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, JSON.stringify(dataset, null, 2) + '\n', { mode: 0o600 });
  await rename(`${output}.tmp`, output);
  if (publish) await publishDataset(dataset, db);
  console.log(JSON.stringify({ version, places: dataset.snapshot.spots.length, summaries: prepared.ready,
    cacheHits, modelCalls: 0, withheldClaims: review.omissions.length, output, published: publish }));
}
main().catch(() => { console.error('Cached enrichment stopped; verify review, source identities and configuration. No private error details logged.'); process.exitCode = 1; });
