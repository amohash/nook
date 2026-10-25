import { describe, expect, it, vi } from 'vitest';
import { createEvidenceExtractor, type ExtractionRecord } from '../ai/extract';
import type { ExtractionSource } from '../ai/schema';
import { SupabaseEvidenceCache, extractionRecordKey } from './evidence-cache';

const source: ExtractionSource = { placeId: 'test-place', category: 'cafe', language: 'en',
  snippets: [{ id: 'test-review', text: 'Quiet tables for studying.' }] };
function store() {
  const rows = new Map<string, Record<string, unknown>>();
  const call = vi.fn(async (path: string, body?: unknown): Promise<unknown> => {
    if (body) {
      const row = structuredClone(body) as Record<string, unknown>;
      rows.set(JSON.stringify([row.spot_id, row.source_hash, row.model, row.prompt_version]), row);
      return [];
    }
    const key = new URL(`https://example.com/${path}`).searchParams.get('document->>key')!.slice(3);
    return [...rows.values()].filter((row) => (row.document as ExtractionRecord).key === key);
  });
  return { rows, call };
}
const output = (placeId: string) => ({ placeId, summary: { text: 'Reviews describe quiet tables.', evidenceIds: ['test-review'] },
  tags: [], noise: { value: 0.1, evidenceIds: ['test-review'] }, groupFriendly: { value: null, evidenceIds: [] },
  wifi: { value: 'unknown', evidenceIds: [] }, outlets: { value: 'unknown', evidenceIds: [] } });

describe('persistent EvidenceCache interface', () => {
  it('retains a complete C record and survives a new adapter/extractor instance without another model call', async () => {
    const db = store();
    const complete = vi.fn(async () => JSON.stringify(output(source.placeId)));
    const first = await createEvidenceExtractor({ complete, cache: new SupabaseEvidenceCache(db) })(source);
    expect(first.status).toBe('ready'); expect(first.cacheWriteFailed).toBe(false);
    expect((await new SupabaseEvidenceCache(db).get(first.record!.key))).toEqual(first.record);
    const second = await createEvidenceExtractor({ complete, cache: new SupabaseEvidenceCache(db) })(source);
    expect(second).toMatchObject({ status: 'ready', cacheHits: 1, externalCalls: 0, record: first.record });
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('isolates source, model, prompt and language identities instead of dropping record fields', async () => {
    const db = store(), cache = new SupabaseEvidenceCache(db);
    const complete = vi.fn(async () => JSON.stringify(output(source.placeId)));
    const first = (await createEvidenceExtractor({ complete, cache })(source)).record!;
    const changed = (await createEvidenceExtractor({ complete, cache })({ ...source,
      snippets: [{ id: 'test-review', text: 'New source text.' }] })).record!;
    const model = (await createEvidenceExtractor({ complete, cache, model: 'other-model' })(source)).record!;
    const language = (await createEvidenceExtractor({ complete, cache })({ ...source, language: 'es' })).record!;
    const prompt = { ...first, promptVersion: 'next-prompt' }; prompt.key = extractionRecordKey(prompt);
    await cache.set(prompt.key, prompt);
    for (const record of [first, changed, model, language, prompt]) expect(await cache.get(record.key)).toEqual(record);
    expect(db.rows.size).toBe(5);
  });
  it('rejects a mismatched key, corrupt row metadata, invalid records and unbounded query input', async () => {
    const db = store(), cache = new SupabaseEvidenceCache(db);
    const first = (await createEvidenceExtractor({ complete: async () => JSON.stringify(output(source.placeId)), cache })(source)).record!;
    await expect(cache.set('0'.repeat(64), first)).rejects.toThrow('Extraction cache identity mismatch');
    const row = [...db.rows.values()][0]!; row.spot_id = 'wrong';
    await expect(cache.get(first.key)).rejects.toThrow('Extraction cache identity mismatch');
    const complete = vi.fn(async () => JSON.stringify(output(source.placeId)));
    expect(await createEvidenceExtractor({ complete, cache })(source)).toMatchObject({ status: 'unavailable', externalCalls: 0 });
    expect(complete).not.toHaveBeenCalled();
    await expect(cache.get('bad&query=secret')).rejects.toThrow();
    await expect(cache.set(first.key, { ...first, generatedAt: 'invalid' })).rejects.toThrow();
  });
});
