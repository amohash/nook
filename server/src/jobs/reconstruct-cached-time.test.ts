import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { coversSession, rankSpots } from '@space/core';
import { createDemoQuery } from '@space/fixtures';
import { DatasetSchema, loadDataset } from '../data/dataset';
import { diffTimeDataset, reconstructCachedTime, type CacheCapture } from './reconstruct-cached-time';
import { publishReviewedTime, readCachedTimeRows } from './add-cached-time';

const original = await loadDataset(fileURLToPath(new URL('../../../fixtures/data/austin-20261025-muse-photos-v1.json', import.meta.url)));
const spot = original.snapshot.spots[0]!;
const time = '2026-10-25T05:00:00+00:00';
const now = '2026-10-25T07:00:00Z';
const version = 'austin-synthetic-cache-replay-test';
// Explicitly synthetic provider payloads: no private captures/review text in tests.
const raw = { place_id: spot.providerPlaceId, data_id: spot.providerDataId, title: 'Synthetic place',
  address: 'Synthetic address', gps_coordinates: { latitude: spot.lat, longitude: spot.lng } };
const week = { sunday: 'Closed', monday: '9AM–5PM', tuesday: '9AM–5PM', wednesday: '9AM–5PM',
  thursday: '9AM–5PM', friday: '9AM–5PM', saturday: '10PM–2AM' };
const row = (fields: Record<string, unknown> = {}, fetched_at = time, kind: 'local_results' | 'place_results' = 'place_results', hash = 'a'):
  CacheCapture => ({ request_hash: hash.repeat(64), fetched_at, payload: { [kind]: kind === 'local_results' ? [{ ...raw, ...fields }] : { ...raw, ...fields } } });
const replay = (rows: unknown[] = []) => reconstructCachedTime(original, rows, { version, now });
const resultSpot = (rows: unknown[]) => replay(rows).dataset.snapshot.spots[0]!;
afterEach(() => vi.unstubAllGlobals());

describe('cache-only time reconstruction', () => {
  it('preserves every unrelated field, photos, summaries, citations and original timestamps in both copies', () => {
    const before = structuredClone(original);
    const result = replay([row({ operating_hours: week })]);
    expect(DatasetSchema.safeParse(result.dataset).success).toBe(true);
    expect(original).toEqual(before);
    expect(result.dataset.snapshot.spots[0]!.hoursStatus).toBe('known');
    expect(result.dataset.details[0]!.spot).toEqual(result.dataset.snapshot.spots[0]);
    expect(result.dataset.details.map((d) => d.evidence)).toEqual(original.details.map((d) => d.evidence));
    expect(result.dataset.snapshot.spots.filter((s) => s.summary.value !== null)).toHaveLength(10);
    expect(result.dataset.snapshot.spots.map((s) => s.image)).toEqual(original.snapshot.spots.map((s) => s.image));
    expect(result.diff.every((d) => /datasetVersion|hoursStatus|hoursFetchedAt|weeklyHours/.test(d.path))).toBe(true);
    const corrupted = structuredClone(result.dataset); corrupted.snapshot.spots[0]!.name = 'changed';
    expect(() => diffTimeDataset(original, corrupted)).toThrow('Unrelated change');
    const removed = structuredClone(result.dataset); removed.details.pop();
    expect(() => diffTimeDataset(original, removed)).toThrow('Unrelated change');
  });
  it('keeps supported listing hours when detail is absent, malformed or only an open-state string', () => {
    for (const hours of [undefined, 'Open now', [{ monday: 'unknown' }]]) {
      const recovered = resultSpot([row({ operating_hours: week }, time, 'local_results'), row({ hours }, now, 'place_results', 'b')]);
      expect(recovered.hoursStatus).toBe('known'); expect(recovered.hoursFetchedAt).toBe(time);
    }
  });
  it('keeps missing schedules and unsupported shapes unknown, never fills missing crowd hours with zero', () => {
    const result = resultSpot([row({ operating_hours: { sunday: 'Closed' }, popular_times: { graph_results: { sunday: [
      { time: '6 AM', busyness_score: 0 }, { time: '7 AM', busyness_score: null }, { time: '9 AM', busyness_score: 50 },
    ] } } })]);
    expect(result.hoursStatus).toBe('unknown'); expect(result.weeklyHours).toEqual([]);
    expect(result.typicalCrowd?.entries).toEqual([{ weekday: 0, hour: 6, value: 0 }, { weekday: 0, hour: 7, value: null },
      { weekday: 0, hour: 9, value: 0.5 }]);
    expect(result.typicalCrowd?.entries.some((e) => e.hour === 8)).toBe(false);
    expect(result.liveObservation).toBeNull();
  });
  it('abstains per conflicting field and keeps independent supported fields', () => {
    const rows = [row({ operating_hours: week, popular_times: { live_hash: { info: 'Busy now' } } }),
      row({ operating_hours: { ...week, sunday: 'Open 24 hours' } }, now, 'place_results', 'b')];
    const result = replay(rows), recovered = result.dataset.snapshot.spots[0]!;
    expect(recovered.hoursStatus).toBe('unknown'); expect(recovered.hoursFetchedAt).toBeNull();
    expect(recovered.liveObservation?.text).toBe('Busy now');
    expect(result.report.places[0]!.fields[0]!.status).toBe('conflict');
    expect(result.report.places[0]!.fields[0]!.captures).toHaveLength(2);
    expect(replay(rows.slice().reverse())).toEqual(result);
  });
  it('does not combine conflicting historical graphs or live measurements into fabricated captures', () => {
    const popular = (score: number, text: string) => ({ current_day: 'sunday', live_hash: { info: text },
      graph_results: { sunday: [{ time: '6 AM', busyness_score: score, current: true, live_busyness_score: score }] } });
    const result = replay([row({ popular_times: popular(20, 'Quiet') }), row({ popular_times: popular(80, 'Busy') }, now, 'place_results', 'b')]);
    expect(result.dataset.snapshot.spots[0]!.typicalCrowd).toBeNull();
    expect(result.dataset.snapshot.spots[0]!.liveObservation).toBeNull();
    expect(result.report.places[0]!.fields.slice(1).map((f) => f.status)).toEqual(['conflict', 'conflict']);
  });
  it('uses exact provider identity, rejects conflicting secondary identity, never matches title/coordinates', () => {
    const result = replay([row({ ...raw, place_id: 'different-provider', operating_hours: week }),
      row({ data_id: 'wrong-data-id', operating_hours: week }, time, 'place_results', 'b'),
      row({ title: undefined, operating_hours: week }, time, 'place_results', 'c')]);
    expect(result.report.counts.unmatchedPlaces).toBe(1);
    expect(result.report.counts.identityConflicts).toBe(spot.providerDataId ? 1 : 0);
    expect(result.report.counts.invalidPlaces).toBe(1);
    expect(result.dataset.snapshot.spots[0]!.hoursStatus).toBe('unknown');
  });
  it('retains expired evidence at its original offset timestamp and rejects future/invalid timestamps', () => {
    const stale = '2026-10-20T01:00:00-05:00';
    const result = replay([row({ operating_hours: week }, stale), row({ operating_hours: week }, '2026-10-26T00:00:00Z'),
      row({ operating_hours: week }, 'bad')]);
    const recovered = result.dataset.snapshot.spots[0]!;
    expect(recovered.hoursFetchedAt).toBe(stale); expect(recovered.fetchedAt).toBe(spot.fetchedAt);
    expect(result.report.counts.futureRows).toBe(1); expect(result.report.counts.invalidRows).toBe(1);
    expect(result.report.coverage.staleHours).toBe(1);
    const query = createDemoQuery({ cityId: spot.cityId, origin: { lat: spot.lat, lng: spot.lng, source: 'manual' },
      departAt: now, categories: [], maxPriceLevel: null, requireOpenForSession: true });
    expect(rankSpots([recovered], query, { now }).excludedCounts).toEqual({ unknown_hours: 1 });
  });
  it('retains the oldest agreeing capture per field and records independent provenance', () => {
    const result = replay([row({ operating_hours: week }), row({ operating_hours: week }, now, 'place_results', 'b'),
      row({ popular_times: { live_hash: { info: 'Quiet now' } } }, now, 'place_results', 'c')]);
    const recovered = result.dataset.snapshot.spots[0]!;
    expect(recovered.hoursFetchedAt).toBe(time); expect(recovered.liveObservation?.fetchedAt).toBe(now);
    expect(recovered.liveObservation?.observedAt).toBeNull();
    expect(result.report.places[0]!.fields[0]!.selected?.requestHash).toBe('a'.repeat(64));
  });
  it('supports overnight and DST sessions without inventing observation timestamps', () => {
    const recovered = resultSpot([row({ operating_hours: { ...week, sunday: '12AM–3AM' } })]);
    expect(coversSession(recovered, Date.parse('2026-10-25T01:00:00-05:00'), Date.parse('2026-10-25T02:00:00-05:00'))).toBe(true);
    expect(coversSession(recovered, Date.parse('2026-11-01T01:15:00-05:00'), Date.parse('2026-11-01T01:45:00-06:00'))).toBe(true);
    expect(coversSession(recovered, Date.parse('2026-03-08T01:30:00-06:00'), Date.parse('2026-03-08T03:00:00-05:00'))).toBe(true);
  });
  it('never lets replayed live-only data affect future ranking', () => {
    const recovered = resultSpot([row({ popular_times: { live_hash: { info: 'Busy' } } })]);
    const query = createDemoQuery({ cityId: spot.cityId, origin: { lat: spot.lat, lng: spot.lng, source: 'manual' },
      departAt: '2026-10-25T12:00:00Z', categories: [], maxPriceLevel: null });
    expect(rankSpots([recovered], query, { now })).toEqual(rankSpots([{ ...recovered, liveObservation: null }], query, { now }));
  });
  it('makes zero acquisition calls even with no captures and ignores error payloads', () => {
    const network = vi.fn(() => { throw new Error('Network forbidden'); }); vi.stubGlobal('fetch', network);
    const result = replay([row(), { ...row(), payload: { error: 'synthetic failure' } }]);
    expect(result.report.coverage.knownHours).toBe(0); expect(result.report.counts.invalidPayloads).toBe(1);
    expect(result.report.providerCalls).toBe(0); expect(result.report.modelCalls).toBe(0);
    expect(network).not.toHaveBeenCalled();
  });
  it('reads private cache GET pages only, including expired captures, and fails closed on malformed batches', async () => {
    const call = vi.fn().mockResolvedValueOnce(Array.from({ length: 100 }, () => row())).mockResolvedValueOnce([row()]);
    expect(await readCachedTimeRows({ call })).toHaveLength(101);
    expect(call.mock.calls).toEqual([
      ['api_cache?select=request_hash,payload,fetched_at&order=request_hash.asc&limit=100&offset=0'],
      ['api_cache?select=request_hash,payload,fetched_at&order=request_hash.asc&limit=100&offset=100'],
    ]);
    await expect(readCachedTimeRows({ call: vi.fn().mockResolvedValue({ error: 'bad' }) })).rejects.toThrow();
  });
});

describe('reviewed immutable publication', () => {
  it('publishes exact reviewed candidate only; rejects existing version, changed facts and hash mismatches without writes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'space-time-test-'));
    try {
      const result = replay([row({ operating_hours: week })]);
      const source = join(dir, 'source.json'), candidate = join(dir, 'candidate.json'), report = join(dir, 'report.json');
      await writeFile(source, JSON.stringify(original)); await writeFile(candidate, JSON.stringify(result.dataset));
      await writeFile(report, JSON.stringify(result.report));
      const call = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(true);
      await publishReviewedTime(source, candidate, report, version, { call });
      expect(call.mock.calls[1]).toEqual(['rpc/publish_dataset', { dataset: result.dataset }]);
      const existing = vi.fn().mockResolvedValue([{}]);
      await expect(publishReviewedTime(source, candidate, report, version, { call: existing })).rejects.toThrow('exists');
      expect(existing).toHaveBeenCalledTimes(1);
      const changed = structuredClone(result.dataset); changed.snapshot.spots[0]!.image = null; changed.details[0]!.spot.image = null;
      await writeFile(candidate, JSON.stringify(changed));
      const forbidden = vi.fn();
      await expect(publishReviewedTime(source, candidate, report, version, { call: forbidden })).rejects.toThrow('mismatch');
      expect(forbidden).not.toHaveBeenCalled();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
