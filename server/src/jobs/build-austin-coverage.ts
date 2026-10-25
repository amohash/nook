import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from '@space/contracts';
import { loadDataset } from '../data/dataset';
import { SupabaseStore } from '../data/supabase';
import { buildAustinCoverage, CoverageCacheRowSchema, type CoverageCacheRow } from './austin-coverage';

/** Operator-only dry run: private-cache GETs, no acquisition, publication or model transport. */
async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (args.some((a) => !/^--(source|version|now|output|report)=/.test(a))) throw new Error('Unsupported operator argument');
  const sourcePath = arg('source'), version = arg('version');
  if (!sourcePath || !version || !arg('output') || !arg('report')) throw new Error('Explicit source/version/output/report required');
  const now = arg('now') ?? new Date().toISOString();
  const env = z.object({ SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) }).parse(process.env);
  const db = new SupabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const source = await loadDataset(sourcePath);
  const exists = z.array(z.unknown()).parse(await db.call(`datasets?dataset_version=eq.${encodeURIComponent(version)}&select=dataset_version&limit=1`));
  if (exists.length) throw new Error('Candidate version already published; never overwrite');
  const rows: CoverageCacheRow[] = [];
  for (let offset = 0; offset <= 2000; offset += 100) {
    const page = z.array(CoverageCacheRowSchema).parse(await db.call(
      `api_cache?select=request_hash,payload,fetched_at&order=request_hash&limit=100&offset=${offset}`));
    rows.push(...page);
    if (rows.length > 2000) throw new Error('Private cache bound exceeded');
    if (page.length < 100) break;
  }
  const result = buildAustinCoverage(source, rows, { version, now });
  const ledger = z.array(z.object({ dataset_version: z.string(), attempts: z.number().int().min(0).max(18) }))
    .parse(await db.call('ingestion_runs?select=dataset_version,attempts&order=dataset_version'));
  const report = { ...result.report, sourceSha256: createHash('sha256').update(await readFile(sourcePath)).digest('hex'),
    operator: { providerCallsDuringBuild: 0, modelCallsDuringBuild: 0, published: false, ledger } };
  const output = resolve(arg('output')!), reportPath = resolve(arg('report')!);
  if (output === reportPath || output === resolve(sourcePath) || reportPath === resolve(sourcePath)) throw new Error('Distinct immutable output paths required');
  await writeFile(output, JSON.stringify(result.dataset, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ version, places: result.dataset.snapshot.spots.length, added: result.report.addedPlaces,
    providerCalls: 0, modelCalls: 0, published: false }));
}
main().catch(() => {
  console.error('Austin coverage dry run stopped; verify source, unique output paths, cache and operator configuration. No private payload or credentials logged.');
  process.exitCode = 1;
});
