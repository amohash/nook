import { afterEach, expect, it, vi } from 'vitest';
import { SupabaseStore } from '../data/supabase';
afterEach(() => vi.unstubAllGlobals());
it('private acquisition lease uses atomic insert and expired-row compare-and-set, then owner-scoped release', async () => {
  const requests: { url: URL; init: RequestInit }[] = [];
  const outputs = [[], [{ request_hash: 'a'.repeat(64) }], []];
  vi.stubGlobal('fetch', async (input: URL, init: RequestInit) => {
    requests.push({ url: new URL(input), init });
    return Response.json(outputs.shift());
  });
  const store = new SupabaseStore('https://example.supabase.co', 'synthetic-test-service-key');
  const start = Date.parse('2026-10-25T08:00:00Z');
  expect(await store.claimLease('a'.repeat(64), 'test-owner', start, 120_000)).toBe(true);
  expect(requests[0]!.init.method).toBe('POST');
  expect((requests[0]!.init.headers as Record<string, string>).Prefer).toContain('resolution=ignore-duplicates');
  expect(requests[1]!.init.method).toBe('PATCH');
  expect(requests[1]!.url.searchParams.get('expires_at')).toBe('lte.2026-10-25T08:00:00.000Z');
  const body = JSON.parse(String(requests[1]!.init.body));
  expect(body.payload).toEqual({ owner: 'test-owner' });
  expect(body.expires_at).toBe('2026-10-25T08:02:00.000Z');
  await store.releaseLease('a'.repeat(64), 'test-owner');
  expect(requests[2]!.init.method).toBe('DELETE');
  expect(requests[2]!.url.searchParams.get('payload->>owner')).toBe('eq.test-owner');
});
it('an unexpired lease is not stolen and duplicate insertion is not an update', async () => {
  vi.stubGlobal('fetch', async () => Response.json([]));
  const store = new SupabaseStore('https://example.supabase.co', 'synthetic-test-service-key');
  expect(await store.claimLease('b'.repeat(64), 'other-owner', Date.now(), 120_000)).toBe(false);
});
