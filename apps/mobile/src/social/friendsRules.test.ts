import { describe, expect, it } from 'vitest';
import { chunk, MATCH_BATCH, matchNumbers, normalizeSearch, prefixPattern, toggledSet, uniqueE164 } from './friendsRules';

const sha256Hex = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
  .map((byte) => byte.toString(16).padStart(2, '0')).join('');

describe('friends search', () => {
  it('normalizes the query and escapes LIKE wildcards', () => {
    expect(normalizeSearch('  @Maya  Lopez ')).toBe('Maya Lopez');
    expect(normalizeSearch('@')).toBe('');
    expect(prefixPattern('ma')).toBe('ma%');
    expect(prefixPattern('a_b%c')).toBe('a\\_b\\%c%');
  });
});

describe('contacts matching', () => {
  it('normalizes, de-duplicates and chunks', () => {
    expect(uniqueE164(['(512) 555-0123', '+1 512 555 0123', 'not a number', '555-0123'])).toEqual(['+15125550123']);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('sends only 64-character hashes, in batches of at most 200, never raw numbers', async () => {
    // 450 distinct valid US numbers, formatted the way an address book might store them.
    const numbers = Array.from({ length: 450 }, (_, i) => `(512) 55${String(i).padStart(1, '0').slice(-1)}-${String(1000 + i)}`);
    const calls: unknown[][] = [];
    const matches = await matchNumbers(numbers, sha256Hex, async (hashes) => {
      calls.push(hashes);
      return hashes.slice(0, 1).map((hash) => ({ id: `user-${hash.slice(0, 6)}`, username: 'x' }));
    });
    const sent = calls.flat();
    expect(calls.length).toBeGreaterThan(1);
    expect(calls.every((batch) => batch.length <= MATCH_BATCH)).toBe(true);
    expect(sent.every((value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value))).toBe(true);
    expect(new Set(sent).size).toBe(sent.length);
    const wire = JSON.stringify(calls);
    for (const number of numbers) {
      expect(wire).not.toContain(number);
      expect(wire).not.toContain(number.replace(/\D/g, ''));
    }
    expect(matches).toHaveLength(calls.length);
  });

  it('refuses to call the RPC with anything that is not a hash', async () => {
    let called = false;
    await expect(matchNumbers(['(512) 555-0123'], async (e164) => e164, async () => { called = true; return []; }))
      .rejects.toThrow('non-hash');
    expect(called).toBe(false);
  });

  it('makes no call when no number is valid', async () => {
    let called = false;
    expect(await matchNumbers(['hello'], sha256Hex, async () => { called = true; return []; })).toEqual([]);
    expect(called).toBe(false);
  });
});

describe('optimistic follow set', () => {
  it('toggles without mutating and can roll back', () => {
    const start = new Set(['a']);
    const optimistic = toggledSet(start, 'b', true);
    expect([...optimistic].sort()).toEqual(['a', 'b']);
    expect([...start]).toEqual(['a']);
    expect([...toggledSet(optimistic, 'b', false)]).toEqual(['a']);
  });
});
