import 'dotenv/config';
import { z } from '@space/contracts';
import { loadDataset } from '../data/dataset';
import { SupabaseStore } from '../data/supabase';
import { importCachedReviewEvidence } from '../data/review-evidence';

async function main() {
  const path = process.argv.slice(2).find((arg) => arg.startsWith('--dataset='))?.slice(10);
  if (!path) throw new Error('An explicit dataset path is required');
  const config = z.object({ SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) }).parse(process.env);
  const dataset = await loadDataset(path);
  if (dataset.snapshot.mode !== 'cached') throw new Error('Only captured real snapshots are accepted');
  const db = new SupabaseStore(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  // Require the exact immutable snapshot already published by B before attaching private evidence.
  const rows = z.array(z.object({ document: z.unknown() })).parse(await db.call(
    `datasets?dataset_version=eq.${encodeURIComponent(dataset.snapshot.datasetVersion)}&select=document&limit=1`));
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
  if (!rows[0] || JSON.stringify(canonical(rows[0].document)) !== JSON.stringify(canonical(dataset))) throw new Error('Published dataset mismatch');
  console.log(JSON.stringify(await importCachedReviewEvidence(dataset, db)));
}
main().catch(() => { console.error('Private review import failed; no source text or credentials logged.'); process.exitCode = 1; });
