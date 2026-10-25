import { createHash } from 'node:crypto';
import { InstantSchema, type Spot, z } from '@space/contracts';
import { DatasetSchema, type Dataset } from '../data/dataset';
import { ProviderPlaceSchema, ProviderResponseSchema } from '../providers/serpapi';
import { normalizeTimeEvidence } from '../providers/serpapi-time';

export const timeFields = ['hoursStatus', 'hoursFetchedAt', 'weeklyHours', 'hoursExceptions',
  'typicalCrowd', 'liveObservation'] as const;
export const CacheCaptureSchema = z.object({ request_hash: z.string().regex(/^[a-f0-9]{64}$/),
  fetched_at: InstantSchema, payload: z.unknown() });
export type CacheCapture = z.infer<typeof CacheCaptureSchema>;
type Time = Pick<Spot, typeof timeFields[number]>;
type Provenance = { requestHash: string | null; fetchedAt: string; kind: 'listing' | 'detail' | 'source' };
type Capture = { time: Time; provenance: Provenance };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Stable object keys for equivalence; array order is preserved (the parser sorts intervals).
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const project = (spot: Spot): Time => Object.fromEntries(timeFields.map((key) => [key, spot[key]])) as Time;

/** Pure cache replay: no clock reads, transports, DB writes or acquisition fallback.
 * Conflicting supported values abstain for the entire field. Missing/unsupported
 * fields do not vote. Agreeing captures retain the OLDEST timestamp, so a replay
 * cannot promote stale evidence to fresh. Hours form one atomic schedule group.
 */
export function reconstructCachedTime(input: Dataset, rows: readonly unknown[], options: { version: string; now: string }) {
  const original = DatasetSchema.parse(input);
  const now = Date.parse(InstantSchema.parse(options.now));
  const version = z.string().regex(/^austin-[a-z0-9-]{1,80}$/).parse(options.version);
  if (original.city.mode !== 'cached' || original.city.id !== 'us-tx-austin' || version === original.city.datasetVersion) {
    throw new Error('New cached Austin version required');
  }
  const dataset = structuredClone(original);
  const captures = new Map<string, Capture[]>();
  const counts = { rows: rows.length, invalidRows: 0, futureRows: 0, invalidPayloads: 0,
    invalidPlaces: 0, unmatchedPlaces: 0, identityConflicts: 0, matchedCaptures: 0 };
  const identities = new Map(original.snapshot.spots.map((s) => [s.providerPlaceId, s]));
  for (const raw of rows) {
    const parsed = CacheCaptureSchema.safeParse(raw);
    if (!parsed.success) { counts.invalidRows++; continue; }
    const row = parsed.data;
    if (Date.parse(row.fetched_at) > now) { counts.futureRows++; continue; }
    const payload = ProviderResponseSchema.safeParse(row.payload);
    if (!payload.success || payload.data.error) { counts.invalidPayloads++; continue; }
    const items = [...(payload.data.local_results ?? []).map((place) => ({ place, kind: 'listing' as const })),
      ...(payload.data.place_results === undefined ? [] : [{ place: payload.data.place_results, kind: 'detail' as const }])];
    for (const { place: rawPlace, kind } of items) {
      const parsedPlace = ProviderPlaceSchema.safeParse(rawPlace);
      if (!parsedPlace.success) { counts.invalidPlaces++; continue; }
      const place = parsedPlace.data, spot = identities.get(place.place_id);
      if (!spot) { counts.unmatchedPlaces++; continue; }
      if (spot.providerDataId && place.data_id && spot.providerDataId !== place.data_id) {
        counts.identityConflicts++; continue;
      }
      const capture = { time: normalizeTimeEvidence(place, row.fetched_at),
        provenance: { requestHash: row.request_hash, fetchedAt: row.fetched_at, kind } };
      captures.set(spot.id, [...(captures.get(spot.id) ?? []), capture]); counts.matchedCaptures++;
    }
  }
  const places = dataset.snapshot.spots.map((spot) => {
    const candidates = captures.get(spot.id) ?? [];
    // Include existing supported time facts in conflict resolution, without ever
    // changing the original place/source timestamp or unrelated enriched facts.
    const base = project(spot);
    const supported = { ...base,
      ...(base.hoursFetchedAt && Date.parse(base.hoursFetchedAt) > now
        ? { hoursStatus: 'unknown' as const, hoursFetchedAt: null, weeklyHours: [], hoursExceptions: {} } : {}),
      ...(base.typicalCrowd && Date.parse(base.typicalCrowd.fetchedAt) > now ? { typicalCrowd: null } : {}),
      ...(base.liveObservation && Date.parse(base.liveObservation.fetchedAt) > now ? { liveObservation: null } : {}),
    };
    const source: Capture = { time: supported, provenance: { requestHash: null, fetchedAt: spot.fetchedAt, kind: 'source' } };
    const all = [...candidates, source];
    const resolve = <T>(field: string, select: (time: Time) => { value: T; fetchedAt: string } | null) => {
      const evidence = all.flatMap((capture) => {
        const selected = select(capture.time);
        return selected ? [{ ...selected, provenance: { ...capture.provenance, fetchedAt: selected.fetchedAt } }] : [];
      }).sort((a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt)
        || canonical(a.provenance).localeCompare(canonical(b.provenance)));
      const conflict = new Set(evidence.map((item) => canonical(item.value))).size > 1;
      return { field, status: conflict ? 'conflict' : evidence.length ? 'supported' : 'unknown',
        selected: conflict ? null : evidence[0] ?? null, captures: evidence.map((item) => item.provenance) };
    };
    const hours = resolve('hours', (time) => time.hoursFetchedAt && (time.hoursStatus === 'known'
      || Object.keys(time.hoursExceptions).length) ? { value: { hoursStatus: time.hoursStatus,
        weeklyHours: time.weeklyHours, hoursExceptions: time.hoursExceptions }, fetchedAt: time.hoursFetchedAt } : null);
    const typical = resolve('typicalCrowd', (time) => time.typicalCrowd
      ? { value: { entries: time.typicalCrowd.entries, source: time.typicalCrowd.source }, fetchedAt: time.typicalCrowd.fetchedAt } : null);
    const live = resolve('liveObservation', (time) => time.liveObservation
      ? { value: { text: time.liveObservation.text, numericValue: time.liveObservation.numericValue,
        observedAt: time.liveObservation.observedAt }, fetchedAt: time.liveObservation.fetchedAt } : null);
    Object.assign(spot, { hoursStatus: 'unknown', hoursFetchedAt: null, weeklyHours: [], hoursExceptions: {},
      typicalCrowd: null, liveObservation: null });
    if (hours.selected) Object.assign(spot, hours.selected.value, { hoursFetchedAt: hours.selected.fetchedAt });
    if (typical.selected) spot.typicalCrowd = { ...typical.selected.value, fetchedAt: typical.selected.fetchedAt };
    if (live.selected) spot.liveObservation = { ...live.selected.value, fetchedAt: live.selected.fetchedAt };
    spot.datasetVersion = version;
    const detail = dataset.details.find((d) => d.spot.id === spot.id)!;
    // Patch only the allowed fields in each copy; keep detail evidence untouched.
    Object.assign(detail.spot, project(spot), { datasetVersion: version });
    return { id: spot.id, providerPlaceId: spot.providerPlaceId, fields: [hours, typical, live].map((field) => ({
      field: field.field, status: field.status, selected: field.selected?.provenance ?? null, captures: field.captures,
    })) };
  });
  dataset.city.datasetVersion = version; dataset.snapshot.datasetVersion = version;
  const validated = DatasetSchema.parse(dataset);
  const diff = diffTimeDataset(original, validated);
  const spots = validated.snapshot.spots;
  const report = { sourceVersion: original.city.datasetVersion, version, evaluatedAt: options.now,
    sourceSha256: digest(original), candidateSha256: digest(validated), providerCalls: 0, modelCalls: 0,
    policy: 'Unsupported fields abstain; conflicting supported fields become unknown; oldest agreeing capture retained; future captures excluded; expired captures retain original times.',
    counts, coverage: { places: spots.length, knownHours: spots.filter((s) => s.hoursStatus === 'known').length,
      unknownHours: spots.filter((s) => s.hoursStatus !== 'known').length,
      typicalRecords: spots.filter((s) => s.typicalCrowd !== null).length,
      historicalHours: spots.reduce((n, s) => n + (s.typicalCrowd?.entries.filter((e) => e.value !== null).length ?? 0), 0),
      historicalNullHours: spots.reduce((n, s) => n + (s.typicalCrowd?.entries.filter((e) => e.value === null).length ?? 0), 0),
      unknownTypical: spots.filter((s) => s.typicalCrowd === null).length,
      liveText: spots.filter((s) => s.liveObservation?.text).length,
      numericLive: spots.filter((s) => s.liveObservation?.numericValue != null).length,
      unknownLive: spots.filter((s) => s.liveObservation === null).length,
      staleHours: spots.filter((s) => s.hoursFetchedAt && now - Date.parse(s.hoursFetchedAt) > 86_400_000).length,
      staleTypical: spots.filter((s) => s.typicalCrowd && now - Date.parse(s.typicalCrowd.fetchedAt) > 604_800_000).length,
      staleLive: spots.filter((s) => s.liveObservation && now - Date.parse(s.liveObservation.fetchedAt) > 300_000).length }, places };
  return { dataset: validated, diff, report };
}

/** Independent recursive allowlist: fails closed on any non-time/non-version change. */
export function diffTimeDataset(original: Dataset, candidate: Dataset) {
  const changes: { path: string; before: unknown; after: unknown }[] = [];
  function walk(before: unknown, after: unknown, path: string) {
    if (canonical(before) === canonical(after)) return;
    const allowed = /^\/(city|snapshot)\/datasetVersion$/.test(path)
      || new RegExp(`^/(snapshot/spots/\\d+|details/\\d+/spot)/(${[...timeFields, 'datasetVersion'].join('|')})$`).test(path);
    if (allowed) { changes.push({ path, before, after }); return; }
    if (before !== null && after !== null && typeof before === 'object' && typeof after === 'object'
      && Array.isArray(before) === Array.isArray(after)) {
      if (Array.isArray(before) && Array.isArray(after) && before.length !== after.length) throw new Error(`Unrelated change: ${path}`);
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        walk((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], `${path}/${key}`);
      }
      return;
    }
    throw new Error(`Unrelated change: ${path}`);
  }
  walk(original, candidate, '');
  return changes;
}
