import { z } from '@space/contracts';
import type { ExtractionRecord } from '../ai/extract';
import { DatasetSchema, type Dataset } from './dataset';

export const ProjectionReviewSchema = z.strictObject({
  sourceDatasetVersion: z.string().min(1),
  omissions: z.array(z.discriminatedUnion('field', [
    z.strictObject({ placeId: z.string().min(1), field: z.literal('outlets'), expectedValue: z.literal('no'), reason: z.string().min(1) }),
    z.strictObject({ placeId: z.string().min(1), field: z.literal('tag'), tag: z.literal('date_night'), reason: z.string().min(1) }),
  ])).max(20),
});

/** A review may withhold an inferred claim; it cannot introduce a replacement fact. */
export function applyProjectionReview(input: Dataset, original: Dataset,
  records: ReadonlyMap<string, ExtractionRecord>, review: z.infer<typeof ProjectionReviewSchema>): Dataset {
  const dataset = structuredClone(DatasetSchema.parse(input));
  if (original.snapshot.datasetVersion !== review.sourceDatasetVersion) throw new Error('Review source version mismatch');
  for (const omission of review.omissions) {
    const spot = dataset.snapshot.spots.find((s) => s.id === omission.placeId);
    const base = original.snapshot.spots.find((s) => s.id === omission.placeId);
    const record = records.get(omission.placeId);
    if (!spot || !base || !record) throw new Error('Review place mismatch');
    if (omission.field === 'outlets') {
      if (spot.outlets.source !== 'muse' || spot.outlets.value !== omission.expectedValue || base.outlets.value !== 'unknown') {
        throw new Error('Review no longer matches projected outlet claim');
      }
      spot.outlets = structuredClone(base.outlets);
    } else {
      if (spot.tags.source !== 'muse' || !spot.tags.value || !(omission.tag in spot.tags.value)) throw new Error('Review tag mismatch');
      delete spot.tags.value[omission.tag];
      const remaining = record.output.tags.filter((t) => spot.tags.value && t.tag in spot.tags.value);
      spot.tags.evidenceIds = [...new Set(remaining.flatMap((t) => t.evidenceIds))];
      if (!Object.keys(spot.tags.value).length) { spot.tags.value = null; spot.tags.confidence = 0; }
    }
    const detail = dataset.details.find((d) => d.spot.id === spot.id)!;
    detail.spot = structuredClone(spot);
  }
  return DatasetSchema.parse(dataset);
}
