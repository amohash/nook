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

it('durable runtime budget reserves at most 250 including all 18 legacy slots across concurrent instances', async () => {
  let attempts: number | null = null;
  let reservations = 0;
  vi.stubGlobal('fetch', async (input: URL, init: RequestInit) => {
    const url = new URL(input);
    if (init.method === 'POST') {
      expect((init.headers as Record<string, string>).Prefer).toContain('ignore-duplicates');
      if (attempts === null) attempts = JSON.parse(String(init.body)).payload.attempts;
      return Response.json([]);
    }
    if (init.method === 'GET') return Response.json([{payload: {attempts}, fetched_at: '2026-10-25T00:00:00Z', expires_at: '2100-01-01T00:00:00Z'}]);
    expect(init.method).toBe('PATCH');
    const expected = Number(url.searchParams.get('payload->>attempts')?.slice(3));
    if (attempts !== expected) return Response.json([]);
    attempts = JSON.parse(String(init.body)).payload.attempts;
    reservations++;
    return Response.json([{payload: {attempts}}]);
  });
  const makeStore = () => new SupabaseStore('https://example.supabase.co', 'test-key', {nearbyLimit: 250});
  const a = makeStore(); const b = makeStore();
  for (let batch = 0; batch < 58; batch++) {
    await Promise.all([a, b, a, b].map((store) => store.reserveAttempt('austin-test')));
  }
  expect(attempts).toBe(250); expect(reservations).toBe(232);
  await expect(makeStore().reserveAttempt('austin-test')).rejects.toThrow('request_budget_exhausted');
  expect(attempts).toBe(250);
});

it('invalid budget configuration and corrupt durable accounting fail closed', async () => {
  for (const nearbyLimit of [0, 17, 251, NaN, 18.5]) {
    expect(() => new SupabaseStore('https://example.supabase.co', 'test-key', {nearbyLimit})).toThrow();
  }
  vi.stubGlobal('fetch', async () => Response.json([]));
  await expect(new SupabaseStore('https://example.supabase.co', 'test-key', {nearbyLimit: 250})
    .reserveAttempt('austin-test')).rejects.toThrow('budget_storage_invalid');
});
