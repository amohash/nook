import { createHash } from 'node:crypto';
import type { ExtractionResult } from '../ai/extract';
import { applyExtraction } from '../ai/extract';
import { parseExtraction, sanitizeSource, type ExtractionSource } from '../ai/schema';
import { ExtractionRecordSchema, extractionRecordKey } from '../cache/evidence-cache';
import { DatasetSchema, type Dataset } from '../data/dataset';
import { ReviewEvidenceSchema, type ReviewEvidence } from '../data/review-evidence';
import type { SupabaseStore } from '../data/supabase';

export type IngestionEvidence = {
  loadEvidence: (placeId: string) => Promise<ReviewEvidence | undefined>;
  extract: (source: ExtractionSource) => Promise<ExtractionResult>;
};

/** Prepare without publication so B can review the projection before an immutable write. */
export async function prepareDataset(candidate: Dataset, muse?: IngestionEvidence) {
  const dataset = structuredClone(DatasetSchema.parse(candidate));
  const counts = { ready: 0, unavailable: 0, missingEvidence: 0 };
  if (muse) for (const detail of dataset.details) {
    try {
      const input = await muse.loadEvidence(detail.spot.id);
      if (!input) { counts.missingEvidence++; continue; }
      const bundle = ReviewEvidenceSchema.parse(input);
      if (bundle.source.placeId !== detail.spot.id) throw new Error('Review identity mismatch');
      const source = sanitizeSource(bundle.source);
      if (!source.snippets.length) { counts.missingEvidence++; continue; }
      const result = await muse.extract(source);
      if (result.status !== 'ready' || !result.record || result.cacheWriteFailed) { counts.unavailable++; continue; }
      const record = ExtractionRecordSchema.parse(result.record);
      const sourceHash = createHash('sha256').update(JSON.stringify(source)).digest('hex');
      if (record.sourceHash !== sourceHash || record.language !== source.language || record.key !== extractionRecordKey(record)) {
        throw new Error('Extraction source mismatch');
      }
      parseExtraction(JSON.stringify(record.output), source);
      const projected = applyExtraction(detail.spot, record);
      const cited = new Set([record.output.summary, record.output.noise, record.output.groupFriendly,
        record.output.wifi, record.output.outlets, ...record.output.tags].flatMap((field) => field.evidenceIds));
      const selected = source.snippets.filter((snippet) => cited.has(snippet.id)).map((snippet) => ({
        ...snippet, sourceUrl: bundle.provenance.find((p) => p.id === snippet.id)!.sourceUrl,
      }));
      // Validate the entire projection before changing any input state or publishing.
      const evidence = [...detail.evidence.filter((item) => !cited.has(item.id)), ...selected];
      const next = DatasetSchema.parse({ ...dataset,
        snapshot: { ...dataset.snapshot, spots: dataset.snapshot.spots.map((s) => s.id === projected.id ? projected : s) },
        details: dataset.details.map((d) => d.spot.id === projected.id ? { ...d, spot: projected, evidence } : d),
      });
      dataset.snapshot = next.snapshot;
      dataset.details = next.details;
      counts.ready++;
    } catch { counts.unavailable++; } // Keep unknowns and previous valid facts; never invent a fallback claim.
  }
  return { dataset, ...counts };
}

/** Operator ingestion only. No provider is constructed here; callers authorize any model calls. */
export async function publishDataset(candidate: Dataset, db: Pick<SupabaseStore, 'call'>, muse?: IngestionEvidence) {
  const prepared = await prepareDataset(candidate, muse);
  await db.call('rpc/publish_dataset', { dataset: DatasetSchema.parse(prepared.dataset) });
  return prepared;
}
