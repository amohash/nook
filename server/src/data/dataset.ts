import { readFile } from 'node:fs/promises';
import { z } from '@space/contracts';
import { CitySchema, SnapshotSchema, SpotDetailSchema } from '@space/contracts';
import { cities, snapshot, getDemoDetail } from '@space/fixtures';

export const DatasetSchema = z.strictObject({ city: CitySchema, snapshot: SnapshotSchema,
  details: z.array(SpotDetailSchema).max(200) }).superRefine((data, ctx) => {
  const ids = new Set(data.snapshot.spots.map((spot) => spot.id));
  const providerIds = new Set(data.snapshot.spots.map((spot) => spot.providerPlaceId));
  const valid = data.city.id === data.snapshot.cityId && data.city.mode === data.snapshot.mode
    && data.city.datasetVersion === data.snapshot.datasetVersion
    && ids.size === data.snapshot.spots.length && providerIds.size === ids.size
    && data.details.length === ids.size && new Set(data.details.map((detail) => detail.spot.id)).size === ids.size
    && data.snapshot.spots.every((spot) => spot.cityId === data.city.id && spot.datasetMode === data.city.mode
      && spot.datasetVersion === data.city.datasetVersion
      && (data.city.mode === 'demo' || !Object.values(spot).some((v) => v && typeof v === 'object' && 'source' in v && v.source === 'synthetic')))
    && data.details.every((detail) => JSON.stringify(detail.spot) === JSON.stringify(data.snapshot.spots.find((s) => s.id === detail.spot.id)));
  if (!valid) ctx.addIssue({ code: 'custom', message: 'Inconsistent or mixed dataset' });
});
export type Dataset = z.infer<typeof DatasetSchema>;
export const demoDataset: Dataset = DatasetSchema.parse({ city: cities[0], snapshot,
  details: snapshot.spots.map((spot) => getDemoDetail(spot.id)) });
export async function loadDataset(path?: string): Promise<Dataset> {
  if (!path) return demoDataset;
  const buffer = await readFile(path);
  if (buffer.length > 5_000_000) throw new Error('Dataset too large');
  return DatasetSchema.parse(JSON.parse(buffer.toString('utf8')));
}
