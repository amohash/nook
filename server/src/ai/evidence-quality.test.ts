import { describe, expect, it } from 'vitest';
import { auditEvidenceQuality, digest } from './evidence-quality';
import { applyExtraction, PROMPT_VERSION, type ExtractionRecord } from './extract';
import { sanitizeSource, type ExtractionSource } from './schema';
import { extractionRecordKey } from '../cache/evidence-cache';
import { normalizePlace } from '../data/normalize';
import { DatasetSchema } from '../data/dataset';
import { MUSE_MODEL } from '../providers/muse';

function scenario() {
  const at = '2026-10-25T02:49:00Z';
  const spots = Array.from({ length: 10 }, (_, index) => normalizePlace({
    place_id: `synthetic-audit-${index}`, title: `Synthetic audit ${index}`, type: 'Coffee shop', address: 'Test address',
    gps_coordinates: { latitude: 30.2862, longitude: -97.7394 },
  }, at, 'austin-audit-test'));
  const base = DatasetSchema.parse({ city: { id: spots[0]!.cityId, name: 'Austin', lat: 30.2862, lng: -97.7394,
    timezone: 'America/Chicago', mode: 'cached', datasetVersion: 'austin-audit-test' },
    snapshot: { schemaVersion: 1, cityId: spots[0]!.cityId, mode: 'cached', datasetVersion: 'austin-audit-test', fetchedAt: at, spots },
    details: spots.map((spot) => ({ schemaVersion: 1, spot, evidence: [] })) });
  const entries = spots.map((spot) => {
    const text = 'Coffee truck beside a parking lot.';
    const evidenceId = `review:${digest(JSON.stringify([spot.id, text, spot.publicPlaceUrl, null])).slice(0, 48)}`;
    const source: ExtractionSource = { placeId: spot.id, category: 'cafe', language: 'en',
      snippets: [{ id: evidenceId, text }] };
    const evidenceIds = [source.snippets[0]!.id];
    const record: ExtractionRecord = { key: '', sourceHash: digest(JSON.stringify(sanitizeSource(source))),
      model: MUSE_MODEL, promptVersion: PROMPT_VERSION, language: 'en', generatedAt: at,
      output: { placeId: spot.id, summary: { text: 'Coffee truck.', evidenceIds },
        tags: [{ tag: 'outdoor', weight: 0.8, evidenceIds }], noise: { value: null, evidenceIds: [] },
        groupFriendly: { value: null, evidenceIds: [] }, wifi: { value: 'unknown', evidenceIds: [] }, outlets: { value: 'unknown', evidenceIds: [] } } };
    record.key = extractionRecordKey(record);
    return { placeId: spot.id, source, provenance: [{ id: evidenceId, sourceUrl: spot.publicPlaceUrl!, observedAt: null, fetchedAt: at }], result: { record } };
  });
  const published = structuredClone(base);
  published.snapshot.spots = spots.map((spot, index) => applyExtraction(spot, entries[index]!.result.record));
  published.details = published.snapshot.spots.map((spot, index) => ({ schemaVersion: 1, spot,
    evidence: entries[index]!.source.snippets.map((snippet) => ({ ...snippet, sourceUrl: spot.publicPlaceUrl! })) }));
  const semanticReviews = entries.map((entry) => ({ placeId: entry.placeId,
    sourceHash: entry.result.record.sourceHash, outputHash: digest(JSON.stringify(entry.result.record.output)),
    claims: {
      summary: { disposition: 'supported', rationale: 'Truck explicitly described.', support: [{ evidenceId: entry.source.snippets[0]!.id, quote: 'Coffee truck' }] },
      'tags.outdoor': { disposition: 'withhold', rationale: 'Truck is not outdoor customer space.', support: [{ evidenceId: entry.source.snippets[0]!.id, quote: 'parking lot' }] },
    }, privacyEvidenceIds: [] as string[],
  }));
  return { bundle: { datasetVersion: 'austin-audit-test', entries }, base, published,
    projectionReview: { sourceDatasetVersion: 'austin-audit-test', omissions: [] }, semanticReviews };
}

describe('offline evidence quality audit (synthetic, no provider transport)', () => {
  it('separates citation linkage from semantic support and reports rather than publishes holds', () => {
    const input = scenario(), before = structuredClone(input);
    const result = auditEvidenceQuality(input);
    expect(result.schemaAndCitationLinkage).toBe('passed');
    expect(result.semanticSupport).toBe('blocked');
    expect(result.unresolvedHolds).toHaveLength(10);
    expect(result.counts).toMatchObject({ records: 10, summaries: 10, numericNoise: 0, groupFriendly: 0, knownWifi: 0, knownOutlets: 0 });
    expect(input).toEqual(before);
  });
  it.each(['source', 'model', 'prompt', 'key', 'review', 'identity', 'support', 'missing', 'duplicate', 'citation', 'provenance', 'url', 'projection', 'structured'] as const)(
    'fails closed on changed %s', (mutation) => {
      const input = scenario(), entry = input.bundle.entries[0]!, record = entry.result.record;
      if (mutation === 'source') entry.source.snippets[0]!.text = 'Changed source';
      if (mutation === 'model') record.model = 'other-model';
      if (mutation === 'prompt') record.promptVersion = 'other-prompt';
      if (mutation === 'key') record.key = 'a'.repeat(64);
      if (mutation === 'review') input.semanticReviews[0]!.outputHash = 'other';
      if (mutation === 'identity') entry.placeId = input.bundle.entries[1]!.placeId;
      if (mutation === 'support') input.semanticReviews[0]!.claims.summary.support[0]!.quote = 'quiet with free seats';
      if (mutation === 'missing') delete (input.semanticReviews[0]!.claims as Record<string, unknown>)['tags.outdoor'];
      if (mutation === 'duplicate') input.semanticReviews[1]!.placeId = entry.placeId;
      if (mutation === 'citation') input.published.details[0]!.evidence[0]!.text = 'Redacted or changed';
      if (mutation === 'provenance') entry.provenance[0]!.sourceUrl = 'https://example.com/changed';
      if (mutation === 'url') input.published.details[0]!.evidence[0]!.sourceUrl = 'https://example.com/changed';
      if (mutation === 'projection' || mutation === 'structured') {
        const spot = input.published.snapshot.spots[0]!;
        if (mutation === 'projection') spot.tags.value!.outdoor = 1;
        else spot.priceLevel.value = 0;
        input.published.details[0]!.spot = structuredClone(spot);
      }
      expect(() => auditEvidenceQuality(input)).toThrow();
    });
  it('reports reviewed public privacy IDs without copying the private source or personal names', () => {
    const input = scenario();
    input.semanticReviews[0]!.privacyEvidenceIds = [input.bundle.entries[0]!.source.snippets[0]!.id];
    const result = auditEvidenceQuality(input);
    expect(result.counts.publicPrivacySnippets).toBe(1);
    expect(result.privacy[0]!.evidenceIds).toEqual(input.semanticReviews[0]!.privacyEvidenceIds);
    expect(JSON.stringify(result)).not.toContain('Coffee truck beside a parking lot.');
  });
});
