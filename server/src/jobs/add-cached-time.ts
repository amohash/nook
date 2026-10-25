import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from '@space/contracts';
import { loadDataset, DatasetSchema } from '../data/dataset';
import { SupabaseStore } from '../data/supabase';
import { publishDataset } from './publish-dataset';
import { diffTimeDataset, reconstructCachedTime } from './reconstruct-cached-time';

/** Read only, including expired captures. Stable pagination; never log raw payloads. */
export async function readCachedTimeRows(db: Pick<SupabaseStore, 'call'>) {
  const rows: unknown[] = [];
  for (let offset = 0; offset < 10_000; offset += 100) {
    const batch = z.array(z.unknown()).max(100).parse(await db.call(
      `api_cache?select=request_hash,payload,fetched_at&order=request_hash.asc&limit=100&offset=${offset}`));
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
  throw new Error('Cache scan limit reached; refusing partial replay');
}

/** Explicit publication of EXACT reviewed bytes; no cache re-read or inference.
 * The reviewed report binds source and candidate; the DB's immutable RPC provides
 * race protection after the target-version preflight.
 */
export async function publishReviewedTime(sourcePath: string, candidatePath: string, reportPath: string,
  version: string, db: Pick<SupabaseStore, 'call'>) {
  const { createHash } = await import('node:crypto');
  const source = await loadDataset(sourcePath), candidate = await loadDataset(candidatePath);
  const report = z.object({ sourceVersion: z.string(), version: z.string(), sourceSha256: z.string(), candidateSha256: z.string() })
    .parse(JSON.parse(await readFile(reportPath, 'utf8')));
  const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  if (candidate.city.datasetVersion !== version || source.city.datasetVersion === version
    || report.version !== version || report.sourceVersion !== source.city.datasetVersion
    || report.sourceSha256 !== hash(source) || report.candidateSha256 !== hash(candidate)
    || source.city.mode !== 'cached' || candidate.city.mode !== 'cached') throw new Error('Reviewed candidate mismatch');
  diffTimeDataset(source, candidate);
  const existing = z.array(z.unknown()).parse(await db.call(
    `datasets?dataset_version=eq.${encodeURIComponent(version)}&select=dataset_version&limit=1`));
  if (existing.length) throw new Error('Target version exists; immutable versions cannot be overwritten');
  await publishDataset(DatasetSchema.parse(candidate), db);
}

async function main() {
  const args = process.argv.slice(2);
  const allowed = ['source', 'version', 'output', 'cache-file', 'now', 'publish-reviewed', 'review-report', 'confirm-version'];
  for (const arg of args) if (!allowed.some((key) => arg.startsWith(`--${key}=`))) throw new Error('Unknown argument');
  const arg = (key: string) => args.find((value) => value.startsWith(`--${key}=`))?.slice(key.length + 3);
  const source = arg('source');
  const version = z.string().regex(/^austin-[a-z0-9-]{1,80}$/).parse(arg('version'));
  if (!source) throw new Error('Source required');
  const db = () => {
    const config = z.object({ SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) }).parse(process.env);
    return new SupabaseStore(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  };
  if (arg('publish-reviewed')) {
    if (!arg('review-report') || arg('confirm-version') !== version || arg('cache-file') || arg('output') || arg('now')) {
      throw new Error('Explicit reviewed report and matching version confirmation required');
    }
    await publishReviewedTime(source, arg('publish-reviewed')!, arg('review-report')!, version, db());
    console.log(JSON.stringify({ version, published: true, providerCalls: 0, modelCalls: 0 })); return;
  }
  if (arg('review-report') || arg('confirm-version')) throw new Error('Publication flags require reviewed artifact');
  const output = resolve(arg('output') ?? `../fixtures/data/${version}.json`);
  if (output === resolve(source)) throw new Error('Source must remain immutable');
  const cacheFile = arg('cache-file');
  const rows = cacheFile ? z.array(z.unknown()).parse(JSON.parse(await readFile(cacheFile, 'utf8')))
    : await readCachedTimeRows(db());
  const result = reconstructCachedTime(await loadDataset(source), rows, { version, now: arg('now') ?? new Date().toISOString() });
  // Exclusive creation never overwrites an existing candidate or reviewed output.
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result.dataset, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await writeFile(`${output}.diff.json`, JSON.stringify(result.diff, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await writeFile(`${output}.report.json`, JSON.stringify(result.report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ version, coverage: result.report.coverage, counts: result.report.counts,
    published: false, providerCalls: 0, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Cached time replay stopped; check source/configuration. No private payload or credentials logged.'); process.exitCode = 1; });
}
