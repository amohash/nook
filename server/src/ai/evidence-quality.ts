import { createHash } from 'node:crypto';
import { InstantSchema, z } from '@space/contracts';
import { ExtractionRecordSchema, extractionRecordKey } from '../cache/evidence-cache';
import { DatasetSchema } from '../data/dataset';
import { applyProjectionReview, ProjectionReviewSchema } from '../data/reviewed-projection';
import { applyExtraction, PROMPT_VERSION } from './extract';
import { parseExtraction, sanitizeSource, SourceSchema, type Extraction } from './schema';
import { MUSE_MODEL } from '../providers/muse';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const BundleSchema = z.object({ datasetVersion: z.string(), entries: z.array(z.object({
  placeId: z.string(), source: SourceSchema,
  provenance: z.array(z.object({ id: z.string(), sourceUrl: z.url(), observedAt: InstantSchema.nullable(), fetchedAt: InstantSchema })),
  result: z.object({ record: ExtractionRecordSchema }),
})).length(10) });
const ReviewSchema = z.strictObject({
  placeId: z.string(), sourceHash: z.string(), outputHash: z.string(),
  claims: z.record(z.string(), z.strictObject({
    disposition: z.enum(['supported', 'withhold']), rationale: z.string().min(1),
    support: z.array(z.strictObject({ evidenceId: z.string(), quote: z.string().min(1).max(180) })).min(1),
  })),
  privacyEvidenceIds: z.array(z.string()),
});
export const SemanticReviewsSchema = z.array(ReviewSchema).length(10);

function claims(output: Extraction) {
  return [
    ...(output.summary.text === null ? [] : [{ field: 'summary', value: output.summary.text, evidenceIds: output.summary.evidenceIds }]),
    ...output.tags.map((tag) => ({ field: `tags.${tag.tag}`, value: tag.weight, evidenceIds: tag.evidenceIds })),
    ...(['noise', 'groupFriendly', 'wifi', 'outlets'] as const).flatMap((field) => {
      const claim = output[field];
      return claim.value === null || claim.value === 'unknown' ? [] : [{ field, ...claim }];
    }),
  ];
}

export function auditEvidenceQuality(input: { bundle: unknown; base: unknown; published: unknown;
  projectionReview: unknown; semanticReviews: unknown }) {
  const bundle = BundleSchema.parse(input.bundle), base = DatasetSchema.parse(input.base);
  const published = DatasetSchema.parse(input.published);
  const projectionReview = ProjectionReviewSchema.parse(input.projectionReview);
  const reviews = SemanticReviewsSchema.parse(input.semanticReviews);
  const requireMatch = (condition: boolean, label: string) => { if (!condition) throw new Error(`Audit mismatch: ${label}`); };
  requireMatch(bundle.datasetVersion === base.snapshot.datasetVersion, 'source dataset');
  requireMatch(new Set(bundle.entries.map((entry) => entry.placeId)).size === 10, 'unique records');
  requireMatch(new Set(reviews.map((review) => review.placeId)).size === 10, 'unique reviews');
  requireMatch(base.snapshot.mode === 'cached' && published.snapshot.mode === 'cached', 'real cached mode');
  requireMatch(JSON.stringify(base.snapshot.spots.map((spot) => spot.id).sort()) ===
    JSON.stringify(published.snapshot.spots.map((spot) => spot.id).sort()), 'published place set');
  const records = new Map(bundle.entries.map((entry) => [entry.placeId, entry.result.record]));
  const candidate = structuredClone(base);
  candidate.snapshot.spots = candidate.snapshot.spots.map((spot) => records.has(spot.id) ? applyExtraction(spot, records.get(spot.id)!) : spot);
  candidate.details.forEach((detail) => { detail.spot = candidate.snapshot.spots.find((spot) => spot.id === detail.spot.id)!; });
  const expected = applyProjectionReview(candidate, base, records, projectionReview);
  const aiFields = ['summary', 'tags', 'noise', 'groupFriendly', 'wifi', 'outlets'] as const;
  for (const spot of published.snapshot.spots) {
    const original = base.snapshot.spots.find((value) => value.id === spot.id)!;
    const projected = expected.snapshot.spots.find((value) => value.id === spot.id)!;
    for (const field of aiFields) requireMatch(JSON.stringify(spot[field]) === JSON.stringify(projected[field]), `projection ${field}`);
    for (const field of Object.keys(original) as (keyof typeof original)[]) {
      if (field === 'datasetVersion' || field === 'image' || (aiFields as readonly string[]).includes(field)) continue;
      requireMatch(JSON.stringify(spot[field]) === JSON.stringify(original[field]), `structured fact ${field}`);
    }
  }
  const places = bundle.entries.map((entry) => {
    const source = sanitizeSource(SourceSchema.parse(entry.source)), record = entry.result.record;
    const spot = published.snapshot.spots.find((value) => value.id === entry.placeId);
    const original = base.snapshot.spots.find((value) => value.id === entry.placeId);
    const detail = published.details.find((value) => value.spot.id === entry.placeId);
    const review = reviews.find((value) => value.placeId === entry.placeId);
    requireMatch(!!spot && !!original && !!detail && !!review, 'place membership');
    requireMatch(source.placeId === entry.placeId && record.output.placeId === entry.placeId, 'place identity');
    requireMatch(entry.provenance.length === source.snippets.length && new Set(entry.provenance.map((value) => value.id)).size === source.snippets.length, 'source provenance set');
    for (const snippet of source.snippets) {
      const provenance = entry.provenance.find((value) => value.id === snippet.id);
      requireMatch(!!provenance && snippet.id === `review:${digest(JSON.stringify([
        entry.placeId, snippet.text, provenance.sourceUrl, provenance.observedAt,
      ])).slice(0, 48)}`, 'source evidence ID hash');
    }
    requireMatch(record.sourceHash === digest(JSON.stringify(source)) && record.key === extractionRecordKey(record), 'hash/key');
    requireMatch(record.model === MUSE_MODEL && record.promptVersion === PROMPT_VERSION && record.language === source.language, 'model/prompt/language');
    parseExtraction(JSON.stringify(record.output), source);
    requireMatch(review!.sourceHash === record.sourceHash && review!.outputHash === digest(JSON.stringify(record.output)), 'review identity');
    const extractedClaims = claims(record.output);
    requireMatch(JSON.stringify(Object.keys(review!.claims).sort()) === JSON.stringify(extractedClaims.map((claim) => claim.field).sort()), 'complete semantic review');
    const manifest = extractedClaims.map((claim) => {
      const decision = review!.claims[claim.field]!;
      for (const support of decision.support) requireMatch(claim.evidenceIds.includes(support.evidenceId) &&
        source.snippets.some((snippet) => snippet.id === support.evidenceId && snippet.text.includes(support.quote)), 'supporting quote');
      const admitted = claim.field.startsWith('tags.') ? spot!.tags.source === 'muse' &&
        (spot!.tags.value as Record<string, number> | null)?.[claim.field.slice(5)] === claim.value :
        spot![claim.field as Exclude<typeof aiFields[number], 'tags'>].source === 'muse' &&
        spot![claim.field as Exclude<typeof aiFields[number], 'tags'>].value === claim.value;
      if (admitted) for (const evidenceId of claim.evidenceIds) requireMatch(detail!.evidence.some((evidence) =>
        evidence.id === evidenceId && evidence.text === source.snippets.find((snippet) => snippet.id === evidenceId)?.text &&
        evidence.sourceUrl === entry.provenance.find((value) => value.id === evidenceId)?.sourceUrl), 'public citation mapping');
      return { ...claim, admitted, ...decision };
    });
    for (const evidenceId of review!.privacyEvidenceIds) requireMatch(source.snippets.some((snippet) => snippet.id === evidenceId), 'privacy review identity');
    const publicPrivacyEvidenceIds = review!.privacyEvidenceIds.filter((evidenceId) => detail!.evidence.some((evidence) => evidence.id === evidenceId));
    return { placeId: entry.placeId, name: spot!.name, providerPlaceId: original!.providerPlaceId,
      sourceHash: record.sourceHash, cacheKey: record.key, model: record.model, promptVersion: record.promptVersion,
      generatedAt: record.generatedAt, summaryWords: record.output.summary.text?.trim().split(/\s+/u).length ?? 0,
      publicPrivacyEvidenceIds, claims: manifest };
  });
  const admitted = places.flatMap((place) => place.claims.filter((claim) => claim.admitted));
  const unresolvedHolds = places.flatMap((place) => place.claims.filter((claim) => claim.admitted && claim.disposition === 'withhold')
    .map((claim) => ({ placeId: place.placeId, field: claim.field, reason: claim.rationale })));
  const privacy = places.filter((place) => place.publicPrivacyEvidenceIds.length).map((place) => ({
    placeId: place.placeId, evidenceIds: place.publicPrivacyEvidenceIds,
    reason: 'Previously reviewed embedded personal names remain in public text; B must review redaction and source/citation identity together.',
  }));
  return { sourceDatasetVersion: bundle.datasetVersion, publishedDatasetVersion: published.snapshot.datasetVersion,
    scope: 'Read-only replay of historical private records against immutable artifacts; not a fresh private-store or phone check.',
    schemaAndCitationLinkage: 'passed', semanticSupport: unresolvedHolds.length ? 'blocked' : 'reviewed',
    acquisitionCalls: 0, modelCalls: 0,
    counts: { places: published.snapshot.spots.length, records: places.length,
      sourceSnippets: bundle.entries.reduce((total, entry) => total + SourceSchema.parse(entry.source).snippets.length, 0),
      reviewedClaims: places.reduce((total, place) => total + place.claims.length, 0),
      admittedClaims: admitted.length, summaries: admitted.filter((claim) => claim.field === 'summary').length,
      supportedAdmittedClaims: admitted.filter((claim) => claim.disposition === 'supported').length,
      tags: admitted.filter((claim) => claim.field.startsWith('tags.')).length,
      numericNoise: admitted.filter((claim) => claim.field === 'noise').length,
      groupFriendly: admitted.filter((claim) => claim.field === 'groupFriendly').length,
      knownWifi: admitted.filter((claim) => claim.field === 'wifi').length,
      knownOutlets: admitted.filter((claim) => claim.field === 'outlets').length,
      publicReviewCitations: published.details.reduce((total, detail) => total + detail.evidence.filter((evidence) => evidence.id.startsWith('review:')).length, 0),
      preservedOmissions: places.flatMap((place) => place.claims.filter((claim) => !claim.admitted && claim.disposition === 'withhold')).length,
      publicPrivacySnippets: privacy.reduce((total, place) => total + place.evidenceIds.length, 0) },
    unresolvedHolds, privacy, places };
}
