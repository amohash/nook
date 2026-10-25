import { createHash } from 'node:crypto';
import { InstantSchema, z, type Spot } from '@space/contracts';
import { SourceSchema, type ExtractionSource } from '../ai/schema';
import type { SupabaseStore } from './supabase';
import { cacheKey } from '../cache/provider-cache';
import type { Dataset } from './dataset';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// C's schemas currently use Zod 3; validate through them without nesting across Zod majors.
const ValidatedSourceSchema = z.unknown().transform((value, ctx) => {
  const result = SourceSchema.safeParse(value);
  if (result.success) return result.data;
  ctx.addIssue({ code: 'custom', message: 'Invalid extraction source' });
  return z.NEVER;
});
const ProvenanceSchema = z.strictObject({
  id: z.string().min(1).max(100), sourceUrl: z.url(),
  observedAt: InstantSchema.nullable(), fetchedAt: InstantSchema,
  sourceDateText: z.string().max(100).nullable(),
});
export const ReviewEvidenceSchema = z.strictObject({
  schemaVersion: z.literal(1), kind: z.literal('anonymous-reviews'),
  datasetVersion: z.string().min(1).max(200),
  languageBasis: z.literal('provider_request_locale'),
  source: ValidatedSourceSchema, provenance: z.array(ProvenanceSchema).max(8),
}).superRefine((value, ctx) => {
  const ids = new Set(value.source.snippets.map((s) => s.id));
  if (value.provenance.length !== ids.size || new Set(value.provenance.map((s) => s.id)).size !== ids.size ||
    value.provenance.some((s) => !ids.has(s.id))) {
    ctx.addIssue({ code: 'custom', message: 'Review provenance must match snippets' });
  }
});
export type ReviewEvidence = z.infer<typeof ReviewEvidenceSchema>;

// Parse only the fields needed from the private provider object. No author object is retained.
const DetailReviewsSchema = z.object({ place_id: z.string(), user_reviews: z.object({
  most_relevant: z.array(z.object({ description: z.string().optional(),
    username: z.string().optional(), contributor_id: z.string().optional(),
    link: z.string().optional(), date_iso8601: z.string().optional(), date: z.string().optional(),
  })).max(100).optional(),
}).optional() });

function anonymousText(text: string, identifiers: string[]): string {
  for (const identifier of identifiers) {
    if (!identifier.trim()) continue;
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp('(?<![\\p{L}\\p{N}])' + escaped + '(?![\\p{L}\\p{N}])', 'giu'), '[redacted]');
  }
  // Redact before truncation so partial phone numbers, URLs or addresses cannot leak at the boundary.
  return text.replace(/https?:\/\/\S+|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|@[\w.-]+|\+?\d[\d ().-]{7,}\d/gi, '[redacted]')
    .replace(/\b\d{3}[-.\s]\d{4}\b/g, '[redacted]')
    .replace(/\s+/gu, ' ').trim().slice(0, 500);
}
function reviewUrl(value: string | undefined, fallback: string, identifiers: string[]): string {
  try {
    const url = new URL(value ?? '');
    if (url.protocol !== 'https:' || url.username || url.password ||
      !/^(?:www\.)?google\.(?:com|[a-z]{2}(?:\.[a-z]{2})?)$/i.test(url.hostname) ||
      !url.pathname.startsWith('/maps/') || url.pathname.includes('/contrib/') ||
      [...url.searchParams.keys()].some((key) => /key|token|secret|email|author|user/i.test(key)) ||
      identifiers.some((id) => id.trim().length >= 3 && (url.href.includes(id) || decodeURIComponent(url.href).includes(id)))) return fallback;
    return url.href;
  } catch { return fallback; }
}

/** Read existing detail data only. Never fetches reviews or synthesizes evidence from place metadata. */
export function collectReviewEvidence(spot: Spot, raw: unknown, fetchedAt: string, requestedLanguage = 'en', batchIdentifiers: readonly string[] = []): ReviewEvidence | undefined {
  const parsed = DetailReviewsSchema.safeParse(raw);
  if (!parsed.success || parsed.data.place_id !== spot.providerPlaceId || !spot.categories[0] || !spot.publicPlaceUrl) return;
  const reviews = parsed.data.user_reviews?.most_relevant ?? [];
  const identifiers = [...new Set([...batchIdentifiers,
    ...reviews.flatMap((review) => [review.username, review.contributor_id].filter((v): v is string => !!v))])];
  const snippets: ExtractionSource['snippets'] = [];
  const provenance: z.infer<typeof ProvenanceSchema>[] = [];
  const seenText = new Set<string>();
  for (const review of reviews) {
    const text = anonymousText(review.description ?? '', identifiers);
    if (!text || !text.replace(/\[redacted\]/g, '').trim() || seenText.has(text)) continue;
    seenText.add(text);
    const sourceUrl = reviewUrl(review.link, spot.publicPlaceUrl, identifiers);
    const observedAt = InstantSchema.safeParse(review.date_iso8601);
    const id = `review:${hash(JSON.stringify([spot.id, text, sourceUrl, observedAt.success ? observedAt.data : null])).slice(0, 48)}`;
    snippets.push({ id, text });
    provenance.push({ id, sourceUrl, observedAt: observedAt.success ? observedAt.data : null,
      fetchedAt, sourceDateText: review.date && /^[\p{L}\p{N}\s,./:+-]{1,100}$/u.test(review.date) ? review.date : null });
    if (snippets.length === 8) break;
  }
  if (!snippets.length) return;
  snippets.sort((a, b) => a.id.localeCompare(b.id));
  provenance.sort((a, b) => a.id.localeCompare(b.id));
  return ReviewEvidenceSchema.parse({ schemaVersion: 1, kind: 'anonymous-reviews',
    datasetVersion: spot.datasetVersion, languageBasis: 'provider_request_locale',
    source: { placeId: spot.id, category: spot.categories[0], language: requestedLanguage, snippets }, provenance });
}

const rowId = (placeId: string, version: string) => `anonymous-reviews:${hash(JSON.stringify([placeId, version]))}`;
/** Service-role only. The existing private table's document holds the anonymous source and provenance. */
export class SupabaseReviewEvidenceStore {
  constructor(private db: Pick<SupabaseStore, 'call'>) {}
  async put(input: ReviewEvidence): Promise<void> {
    const document = ReviewEvidenceSchema.parse(input);
    await this.db.call('place_evidence?on_conflict=id', {
      id: rowId(document.source.placeId, document.datasetVersion), spot_id: document.source.placeId, document,
    });
  }
  async get(placeId: string, datasetVersion: string): Promise<ReviewEvidence | undefined> {
    const rows = z.array(z.object({ document: z.unknown() })).parse(await this.db.call(
      `place_evidence?id=eq.${rowId(placeId, datasetVersion)}&select=document&limit=1`));
    if (!rows[0]) return;
    const document = ReviewEvidenceSchema.parse(rows[0].document);
    if (document.source.placeId !== placeId || document.datasetVersion !== datasetVersion) throw new Error('Review identity mismatch');
    return document;
  }
}

/** Copies only already-cached detail reviews. No SerpApi transport, spend flag, or new acquisition. */
export async function importCachedReviewEvidence(dataset: Dataset, db: SupabaseStore) {
  const store = new SupabaseReviewEvidenceStore(db);
  const imported: { placeId: string; category: string; snippets: number; language: string }[] = [];
  const entries: { spot: Spot; raw: unknown; fetchedAt: string }[] = [];
  const identifiers: string[] = [];
  let unavailable = 0;
  for (const spot of dataset.snapshot.spots) {
    const cached = await db.get(cacheKey({ engine: 'google_maps', hl: 'en', gl: 'us',
      type: 'place', place_id: spot.providerPlaceId }));
    if (!cached) { unavailable++; continue; }
    const payload = z.object({ place_results: z.unknown() }).safeParse(cached.payload);
    if (!payload.success) { unavailable++; continue; }
    const detail = DetailReviewsSchema.safeParse(payload.data.place_results);
    if (!detail.success || detail.data.place_id !== spot.providerPlaceId) { unavailable++; continue; }
    entries.push({ spot, raw: payload.data.place_results, fetchedAt: cached.fetchedAt });
    identifiers.push(...(detail.data.user_reviews?.most_relevant ?? [])
      .flatMap((r) => [r.username, r.contributor_id].filter((v): v is string => !!v)));
  }
  for (const { spot, raw, fetchedAt } of entries) {
    const bundle = collectReviewEvidence(spot, raw, fetchedAt, 'en', identifiers);
    if (!bundle) { unavailable++; continue; }
    await store.put(bundle);
    imported.push({ placeId: spot.id, category: bundle.source.category, snippets: bundle.source.snippets.length, language: bundle.source.language });
  }
  return { datasetVersion: dataset.snapshot.datasetVersion, imported, unavailable, externalCalls: 0 };
}
