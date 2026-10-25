import 'dotenv/config';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from '@space/contracts';
import { DatasetSchema, loadDataset } from '../data/dataset';
import { providerImage } from '../data/place-image';
import { SupabaseStore } from '../data/supabase';
import { publishDataset } from './publish-dataset';

/** Cache-only image backfill. No SerpApi search/photo endpoint or model is called. */
async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const source = arg('source');
  if (!source) throw new Error('Explicit source required');
  const version = z.string().regex(/^austin-[a-z0-9-]{1,80}$/).parse(arg('version'));
  const config = z.object({ SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) }).parse(process.env);
  const db = new SupabaseStore(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  const original = await loadDataset(source);
  if (original.city.mode !== 'cached' || original.city.id !== 'us-tx-austin' || version === original.city.datasetVersion) {
    throw new Error('A new real Austin version required');
  }
  const existing = z.array(z.unknown()).parse(await db.call(`datasets?dataset_version=eq.${encodeURIComponent(version)}&select=dataset_version&limit=1`));
  if (existing.length) throw new Error('Target already published; do not overwrite');
  const rows = z.array(z.object({ payload: z.object({ local_results: z.array(z.unknown()).optional(), place_results: z.unknown().optional() }) }))
    .parse(await db.call('api_cache?select=payload'));
  const candidates = new Map<string, string[]>();
  for (const row of rows) for (const raw of [...(row.payload.local_results ?? []), row.payload.place_results]) {
    const place = z.object({ place_id: z.string(), thumbnail: z.unknown().optional() }).safeParse(raw);
    if (!place.success) continue;
    const image = providerImage(place.data.thumbnail);
    if (image) candidates.set(place.data.place_id, [...new Set([...(candidates.get(place.data.place_id) ?? []), image.url])]);
  }
  const dataset = structuredClone(original);
  dataset.city.datasetVersion = version; dataset.snapshot.datasetVersion = version;
  let images = 0;
  for (const spot of dataset.snapshot.spots) {
    spot.datasetVersion = version;
    for (const url of candidates.get(spot.providerPlaceId) ?? []) {
      try {
        const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(8000) });
        if (!response.ok || !/^image\/(jpeg|png|webp)(;|$)/.test(response.headers.get('content-type') ?? '')
          || Number(response.headers.get('content-length')) > 5_000_000) { await response.body?.cancel(); continue; }
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength < 100 || bytes.byteLength > 5_000_000) continue;
        spot.image = providerImage(url); break;
      } catch { /* Leave absent photos unknown rather than substitute unrelated images. */ }
    }
    if (spot.image) images++;
    dataset.details.find((d) => d.spot.id === spot.id)!.spot = structuredClone(spot);
  }
  // This demo's cached sources cover every place; fail closed on incomplete recovery.
  if (images !== dataset.snapshot.spots.length) throw new Error('Not every place has a verified image');
  const validated = DatasetSchema.parse(dataset);
  const output = resolve(`../fixtures/data/${version}.json`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, JSON.stringify(validated, null, 2) + '\n', { mode: 0o600 });
  await rename(`${output}.tmp`, output);
  const publish = args.includes('--publish');
  if (publish) await publishDataset(validated, db);
  console.log(JSON.stringify({ version, places: dataset.snapshot.spots.length, images, providerCalls: 0, modelCalls: 0, published: publish }));
}
main().catch(() => { console.error('Cached image backfill stopped; check source/configuration. No credentials or private payload logged.'); process.exitCode = 1; });
