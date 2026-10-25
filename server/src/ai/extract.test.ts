import { describe, expect, it, vi } from 'vitest';
import { snapshot, DEMO_NOW } from '@space/fixtures';
import { createEvidenceExtractor, MemoryEvidenceCache, applyExtraction } from './extract';
import { parseExtraction, sanitizeSource, type ExtractionSource } from './schema';
import { createMuseProvider } from '../providers/muse';

const source: ExtractionSource = { placeId: 'demo:spot-1', category: 'cafe', language: 'en',
  snippets: [{ id: 'review:1', text: 'Quiet tables with Wi-Fi and outlets.' }] };
const valid = () => ({ placeId: source.placeId, summary: { text: 'Reviews describe quiet tables, Wi-Fi and outlets.', evidenceIds: ['review:1'] },
  tags: [{ tag: 'quiet', weight: 1, evidenceIds: ['review:1'] }],
  noise: { value: 0.1, evidenceIds: ['review:1'] }, groupFriendly: { value: null, evidenceIds: [] },
  wifi: { value: 'yes', evidenceIds: ['review:1'] }, outlets: { value: 'yes', evidenceIds: ['review:1'] } });
const complete = () => vi.fn(async () => JSON.stringify(valid()));

describe('bounded evidence extraction', () => {
  it('validates output, stores provenance and reuses unchanged source without new calls', async () => {
    const provider = complete(), cache = new MemoryEvidenceCache();
    const extract = createEvidenceExtractor({ complete: provider, cache, now: () => DEMO_NOW });
    const first = await extract(source), second = await extract(source);
    expect(first.status).toBe('ready'); expect(first.externalCalls).toBe(1);
    expect(first.record).toMatchObject({ model: 'muse-spark-1.3', promptVersion: 'space-evidence-v1', generatedAt: DEMO_NOW });
    expect(second.record).toEqual(first.record); expect(second.cacheHits).toBe(1); expect(second.externalCalls).toBe(0);
    expect(provider).toHaveBeenCalledTimes(1);
    const changed = await extract({ ...source, snippets: [{ id: 'review:1', text: 'Different evidence.' }] });
    expect(changed.record!.sourceHash).not.toBe(first.record!.sourceHash); expect(provider).toHaveBeenCalledTimes(2);
    await createEvidenceExtractor({ complete: provider, cache, model: 'different-model' })(source);
    await extract({ ...source, language: 'es' });
    expect(provider).toHaveBeenCalledTimes(4);
  });
  it('retries malformed JSON exactly once then marks inference unavailable', async () => {
    const provider = vi.fn(async () => 'bad JSON with a secret-looking upstream error');
    const result = await createEvidenceExtractor({ complete: provider, cache: new MemoryEvidenceCache() })(source);
    expect(result).toMatchObject({ status: 'unavailable', record: null, externalCalls: 2, cacheHits: 0 });
    expect(JSON.stringify(result)).not.toContain('secret-looking');
  });
  it('can recover on the one correction retry', async () => {
    const provider = complete().mockResolvedValueOnce('{}');
    const result = await createEvidenceExtractor({ complete: provider, cache: new MemoryEvidenceCache() })(source);
    expect(result.status).toBe('ready'); expect(result.externalCalls).toBe(2);
  });
  it.each([
    () => ({ ...valid(), placeId: 'invented' }),
    () => ({ ...valid(), noise: { value: 1.01, evidenceIds: ['review:1'] } }),
    () => ({ ...valid(), wifi: { value: 'yes', evidenceIds: [] } }),
    () => ({ ...valid(), noise: { value: 0.2, evidenceIds: ['invented'] } }),
    () => ({ ...valid(), summary: { text: 'word '.repeat(26), evidenceIds: ['review:1'] } }),
    () => ({ ...valid(), bestTime: '8pm' }),
    () => ({ ...valid(), tags: [...valid().tags, ...valid().tags] }),
    () => [valid(), valid()],
  ])('rejects unsupported, unbounded or extra output', (make) => {
    expect(() => parseExtraction(JSON.stringify(make()), source)).toThrow();
  });
  it('bounds source and response text; strips known personal identifiers and contact data', () => {
    expect(() => sanitizeSource({ ...source, snippets: [{ id: 'x', text: 'x'.repeat(501) }] })).toThrow();
    expect(() => parseExtraction(' '.repeat(8193), source)).toThrow();
    const clean = sanitizeSource({ ...source, snippets: [{ id: 'review:1', text: 'Alice says quiet. alice@example.com +1 (512) 555-1234 @alice https://example.com' }] }, ['Alice']);
    expect(clean.snippets[0]!.text).not.toMatch(/Alice|alice|512|example/);
    expect(clean.snippets[0]!.text).toContain('quiet');
  });
  it('does not call Muse with no evidence', async () => {
    const provider = complete();
    expect((await createEvidenceExtractor({ complete: provider, cache: new MemoryEvidenceCache() })({ ...source, snippets: [] })).status).toBe('unavailable');
    expect(provider).not.toHaveBeenCalled();
  });
  it('deduplicates simultaneous identical extractions', async () => {
    const provider = complete(); const extract = createEvidenceExtractor({ complete: provider, cache: new MemoryEvidenceCache() });
    const results = await Promise.all([extract(source), extract(source), extract(source)]);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(results.reduce((sum, r) => sum + r.externalCalls, 0)).toBe(1);
  });
  it('aborts within a total deadline without an unbounded retry', async () => {
    let signal: AbortSignal | undefined;
    const extract = createEvidenceExtractor({ budgetMs: 10, cache: new MemoryEvidenceCache(),
      complete: (request) => { signal = request.signal; return new Promise(() => undefined); } });
    const result = await extract(source);
    expect(result.status).toBe('unavailable'); expect(result.externalCalls).toBe(1); expect(signal!.aborted).toBe(true);
  });
  it('does not retry a paid request when the cache write fails', async () => {
    const provider = complete();
    const result = await createEvidenceExtractor({ complete: provider,
      cache: { get: async () => undefined, set: async () => { throw new Error('storage unavailable'); } } })(source);
    expect(result.status).toBe('ready'); expect(result.cacheWriteFailed).toBe(true); expect(provider).toHaveBeenCalledTimes(1);
  });
  it('projects inferred evidence without overriding structured facts', async () => {
    const result = await createEvidenceExtractor({ complete: complete(), cache: new MemoryEvidenceCache() })(source);
    const spot = structuredClone(snapshot.spots[0]!); spot.wifi.source = 'serpapi'; spot.wifi.value = 'no';
    spot.noise.value = null;
    const projected = applyExtraction(spot, result.record!);
    expect(projected.wifi).toEqual(spot.wifi);
    expect(projected.noise).toMatchObject({ source: 'muse', confidence: 0.7, value: 0.1, observedAt: null });
    expect(spot.noise.value).toBeNull();
  });
});

describe('server Muse transport', () => {
  it('sends the documented endpoint, JSON contract and bounded completion request', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(valid()) } }] })));
    const provider = createMuseProvider({ apiKey: 'test-only', fetchImpl });
    const text = await provider({ model: 'muse-spark-1.3', system: 'rules', user: 'evidence', signal: new AbortController().signal });
    expect(parseExtraction(text, source).placeId).toBe(source.placeId);
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.meta.ai/v1/chat/completions');
  });
  it('does not expose upstream error bodies or credentials', async () => {
    const provider = createMuseProvider({ apiKey: 'test-only', fetchImpl: async () => new Response('sensitive provider body', { status: 401 }) });
    await expect(provider({ model: 'm', system: '', user: '', signal: new AbortController().signal })).rejects.toThrow('Muse request failed (401)');
  });
  it('rejects oversized responses', async () => {
    const provider = createMuseProvider({ apiKey: 'test-only', fetchImpl: async () => new Response('x'.repeat(65_537)) });
    await expect(provider({ model: 'm', system: '', user: '', signal: new AbortController().signal })).rejects.toThrow('exceeds limit');
  });
});

describe('cache failure isolation', () => {
  it('returns an unavailable result without paid calls if cache reads fail', async () => {
    const provider = complete();
    const result = await createEvidenceExtractor({ complete: provider,
      cache: { get: async () => { throw new Error('private cache error'); }, set: async () => undefined } })(source);
    expect(result).toMatchObject({ status: 'unavailable', externalCalls: 0 }); expect(provider).not.toHaveBeenCalled();
  });
  it('bounds stalled cache reads within the extraction deadline', async () => {
    const provider = complete();
    const result = await createEvidenceExtractor({ complete: provider, budgetMs: 10,
      cache: { get: () => new Promise(() => undefined), set: async () => undefined } })(source);
    expect(result).toMatchObject({ status: 'unavailable', externalCalls: 0 }); expect(provider).not.toHaveBeenCalled();
  });
  it('revalidates cached evidence before trusting it', async () => {
    const cache = new MemoryEvidenceCache(), provider = complete();
    const extract = createEvidenceExtractor({ complete: provider, cache });
    const first = await extract(source);
    const record = structuredClone(first.record!); record.output.placeId = 'wrong';
    await cache.set(record.key, record);
    const second = await extract(source);
    expect(second.cacheHits).toBe(0); expect(second.record!.output.placeId).toBe(source.placeId);
    expect(provider).toHaveBeenCalledTimes(2);
  });
});
