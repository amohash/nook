import { z } from 'zod';
import { TAGS } from '@space/contracts';

const ids = z.array(z.string().min(1).max(100)).max(8).refine((v) => new Set(v).size === v.length);
const measure = z.strictObject({ value: z.number().min(0).max(1).nullable(), evidenceIds: ids });
const amenity = z.strictObject({ value: z.enum(['yes', 'no', 'unknown']), evidenceIds: ids });
export const ExtractionSchema = z.strictObject({
  placeId: z.string().min(1).max(200),
  summary: z.strictObject({ text: z.string().max(300).nullable(), evidenceIds: ids }),
  tags: z.array(z.strictObject({ tag: z.enum(TAGS), weight: z.number().min(0).max(1), evidenceIds: ids })).max(12),
  noise: measure, groupFriendly: measure, wifi: amenity, outlets: amenity,
}).superRefine((v, ctx) => {
  if (v.summary.text !== null && (!v.summary.text.trim() || v.summary.text.trim().split(/\s+/u).length > 25)) {
    ctx.addIssue({ code: 'custom', message: 'Summary must contain 1–25 words' });
  }
  if (new Set(v.tags.map((t) => t.tag)).size !== v.tags.length) ctx.addIssue({ code: 'custom', message: 'Duplicate tags' });
  for (const field of [v.noise, v.groupFriendly, v.wifi, v.outlets]) {
    if (field.value !== null && field.value !== 'unknown' && !field.evidenceIds.length) ctx.addIssue({ code: 'custom', message: 'Claims require evidence' });
  }
  if (v.summary.text !== null && !v.summary.evidenceIds.length) ctx.addIssue({ code: 'custom', message: 'Summary requires evidence' });
  if (v.tags.some((t) => !t.evidenceIds.length)) ctx.addIssue({ code: 'custom', message: 'Tags require evidence' });
});
export type Extraction = z.infer<typeof ExtractionSchema>;
export const SourceSchema = z.strictObject({
  placeId: z.string().min(1).max(200), category: z.string().min(1).max(60),
  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  snippets: z.array(z.strictObject({ id: z.string().min(1).max(100), text: z.string().min(1).max(500) })).max(8),
}).refine((s) => new Set(s.snippets.map((e) => e.id)).size === s.snippets.length, 'Duplicate evidence IDs');
export type ExtractionSource = z.infer<typeof SourceSchema>;

/** Callers supply anonymous snippets, never full review objects or author metadata.
 * Named identifiers known to the importer are removed in addition to common contact identifiers.
 */
export function sanitizeSource(input: ExtractionSource, personalIdentifiers: readonly string[] = []): ExtractionSource {
  const source = SourceSchema.parse(input);
  source.snippets = source.snippets.map(({ id, text }) => {
    for (const identifier of personalIdentifiers) if (identifier.trim()) text = text.split(identifier).join('[redacted]');
    text = text.replace(/https?:\/\/\S+|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|@[\w.-]+|\+?\d[\d ().-]{7,}\d/gi, '[redacted]');
    return { id, text };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return SourceSchema.parse(source);
}
export function parseExtraction(text: string, source: ExtractionSource): Extraction {
  if (Buffer.byteLength(text, 'utf8') > 8192) throw new Error('Extraction exceeds limit');
  const value = ExtractionSchema.parse(JSON.parse(text));
  if (value.placeId !== source.placeId) throw new Error('Unexpected place identity');
  const allowed = new Set(source.snippets.map((s) => s.id));
  for (const field of [value.summary, value.noise, value.groupFriendly, value.wifi, value.outlets, ...value.tags]) {
    if (field.evidenceIds.some((id) => !allowed.has(id))) throw new Error('Unknown evidence reference');
  }
  return value;
}
