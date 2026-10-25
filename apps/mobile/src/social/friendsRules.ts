import { toE164 } from './profileRules';

// Pure rules for Friends search and contacts matching (no network, no native modules).

export const SEARCH_LIMIT = 20;
export const SEARCH_DEBOUNCE_MS = 300;
export const MATCH_BATCH = 200; // match_contacts rejects more than 200 hashes per call
const HASH = /^[0-9a-f]{64}$/;

/** Trims, drops one leading "@", collapses spaces and caps length. Empty means "no search". */
export function normalizeSearch(input: string): string {
  return input.trim().replace(/^@/, '').replace(/\s+/g, ' ').slice(0, 40);
}

/** ILIKE prefix pattern with LIKE wildcards escaped, so "a_b" matches literally. */
export function prefixPattern(query: string): string {
  return `${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Normalizes raw numbers to E.164 (US default), drops invalid ones and duplicates. */
export function uniqueE164(numbers: readonly string[]): string[] {
  return [...new Set(numbers.map((number) => toE164(number)).filter((value): value is string => !!value))];
}

/**
 * The whole contacts pipeline: numbers → E.164 → SHA-256 hex → match_contacts in batches of ≤200.
 * `hash` and `rpc` are injected so tests can prove that only 64-character hashes reach the RPC.
 * Matches are de-duplicated by id across batches.
 */
export async function matchNumbers<M extends { id: string }>(numbers: readonly string[],
  hash: (e164: string) => Promise<string>, rpc: (hashes: string[]) => Promise<M[]>): Promise<M[]> {
  const hashes = [...new Set(await Promise.all(uniqueE164(numbers).map(hash)))];
  if (hashes.some((value) => !HASH.test(value))) throw new Error('Refusing to send a non-hash value');
  const seen = new Map<string, M>();
  for (const batch of chunk(hashes, MATCH_BATCH)) {
    for (const match of await rpc(batch)) seen.set(match.id, match);
  }
  return [...seen.values()];
}

/** Optimistic follow toggle: returns the next set without mutating the input. */
export function toggledSet(ids: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(ids);
  if (on) next.add(id); else next.delete(id);
  return next;
}
