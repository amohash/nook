import 'dotenv/config';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from '@space/contracts';
import type { Spot, SpotDetail } from '@space/contracts';
import { SerpApi, ProviderPlaceSchema } from '../providers/serpapi';
import { SupabaseStore } from '../data/supabase';
import { ServiceError } from '../providers/http';
import { AUSTIN_CITY_ID, deduplicatePlaces, normalizePlace } from '../data/normalize';
import { DatasetSchema } from '../data/dataset';

// Operator-only command. Public GET/recommendation routes never instantiate providers.
async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--authorize-spend')) throw new Error('Explicit --authorize-spend is required');
  const version = z.string().regex(/^austin-[a-z0-9-]{1,80}$/).parse(args.find((a) => a.startsWith('--version='))?.slice(10));
  const one = args.includes('--one');
  const config = z.object({ SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1), SERPAPI_API_KEY: z.string().min(1) }).safeParse(process.env);
  if (!config.success) throw new Error('Server provider configuration is missing');
  const db = new SupabaseStore(config.data.SUPABASE_URL, config.data.SUPABASE_SERVICE_ROLE_KEY);
  const api = new SerpApi({ key: config.data.SERPAPI_API_KEY, cache: db, authorized: true,
    maxCalls: one ? 1 : 16, beforeAttempt: () => db.reserveAttempt(version) });
  let spots: Spot[] = [];
  let invalidRecords = 0;
  for (const q of ['coffee near UT Austin', 'libraries near UT Austin', 'restaurants near UT Austin']) {
    for (const start of ['0', '20']) {
      const params = { q, ll: '@30.2862,-97.7394,14z', type: 'search', start };
      const response = await api.request(params);
      // Verify a repeat is served from persistent cache without resetting fetchedAt.
      const repeat = await api.request(params);
      // Postgres may render the same timestamptz as +00:00 instead of Z.
      if (Date.parse(repeat.fetchedAt) !== Date.parse(response.fetchedAt)) throw new Error('Cache repeat mismatch');
      for (const raw of response.payload.local_results ?? []) {
        const parsed = ProviderPlaceSchema.safeParse(raw);
        if (!parsed.success) { invalidRecords++; continue; }
        const spot = normalizePlace(parsed.data, response.fetchedAt, version);
        // Bound the snapshot to the campus / central Austin search window.
        if (spot.lat >= 30.24 && spot.lat <= 30.34 && spot.lng >= -97.78 && spot.lng <= -97.70) spots.push(spot);
      }
      spots = deduplicatePlaces(spots).slice(0, one ? 1 : 30);
      if (one || spots.length >= 25) break;
    }
    if (one || spots.length >= 25) break;
  }
  if (spots.length < (one ? 1 : 20)) throw new Error('Insufficient verified places; snapshot was not published');
  const details: SpotDetail[] = spots.map((spot) => ({ schemaVersion: 1, spot, evidence: [] }));
  if (!one) {
    for (const detail of details.slice(0, 10)) {
      const response = await api.request({ type: 'place', place_id: detail.spot.providerPlaceId });
      const raw = ProviderPlaceSchema.safeParse(response.payload.place_results);
      if (!raw.success || raw.data.place_id !== detail.spot.providerPlaceId) throw new Error('Detail identity mismatch');
      const spot = normalizePlace(raw.data, response.fetchedAt, version);
      detail.spot = spot;
      // Selected provider facts only; no reviewer identifiers or raw response URLs.
      detail.evidence = [{ id: `${spot.id}:provider-detail`, sourceUrl: spot.publicPlaceUrl,
        text: `Provider place detail fetched ${spot.fetchedAt}. ${spot.name}${spot.address ? ` — ${spot.address}` : ''}`.slice(0, 500) }];
    }
  }
  spots = details.map((detail) => detail.spot);
  const fetchedAt = new Date().toISOString();
  const dataset = DatasetSchema.parse({ city: { id: AUSTIN_CITY_ID, name: 'Austin', lat: 30.2862,
    lng: -97.7394, timezone: 'America/Chicago', mode: 'cached', datasetVersion: version },
  snapshot: { schemaVersion: 1, cityId: AUSTIN_CITY_ID, mode: 'cached', datasetVersion: version, fetchedAt, spots }, details });
  // One-place smoke is a local artifact only. Full snapshot is published atomically.
  if (!one) await db.call('rpc/publish_dataset', { dataset });
  const output = resolve(`../fixtures/data/${version}${one ? '-one' : ''}.json`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, JSON.stringify(dataset, null, 2) + '\n', { mode: 0o600 });
  await rename(`${output}.tmp`, output);
  console.log(JSON.stringify({ datasetVersion: version, places: spots.length, invalidRecords,
    ...api.metrics, output, published: !one }));
}
main().catch((error: unknown) => {
  const code = error instanceof ServiceError ? error.code : error instanceof z.ZodError ? 'validation_failed' : 'ingestion_failed';
  console.error(`Austin capture failed (${code}); check configuration, budget and provider availability. No secret details logged.`);
  process.exitCode = 1;
});
