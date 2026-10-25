import { z } from 'zod';
// Keep consumers on the contracts package's Zod major without undeclared dependencies.
export { z } from 'zod';

export const CONTRACT_VERSION = 1 as const;
export const InstantSchema = z.iso.datetime({ offset: true });
export const LocalDateSchema = z.iso.date();
export const DatasetModeSchema = z.enum(['live', 'cached', 'demo']);
export const FactSourceSchema = z.enum(['serpapi', 'muse', 'curated', 'synthetic']);
export const IntentSchema = z.enum(['study', 'friends', 'date', 'cheap_eats']);
export const AmenityStateSchema = z.enum(['yes', 'no', 'unknown']);
export const TAGS = ['study', 'quiet', 'lively', 'cozy', 'date_night', 'late_night',
  'group_friendly', 'outdoor', 'budget', 'live_music', 'work_friendly', 'trendy'] as const;
export const TagWeightsSchema = z.partialRecord(z.enum(TAGS), z.number().min(0).max(1));
const UnitSchema = z.number().min(0).max(1);
const IdSchema = z.string().min(1).max(200);
export const TimezoneSchema = z.string().max(100).refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; }
  catch { return false; }
}, 'Expected an IANA timezone');

export function evidenceSchema<T extends z.ZodType>(value: T) {
  return z.strictObject({
    value: value.nullable(), source: FactSourceSchema,
    observedAt: InstantSchema.nullable(), fetchedAt: InstantSchema,
    confidence: UnitSchema, sourceUrl: z.url().optional(),
    evidenceIds: z.array(IdSchema).max(20).optional(),
  });
}
export type Evidence<T> = {
  value: T | null; source: z.infer<typeof FactSourceSchema>;
  observedAt: string | null; fetchedAt: string; confidence: number;
  sourceUrl?: string; evidenceIds?: string[];
};
export const CoordinatesSchema = z.strictObject({
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
});
export const QuerySchema = z.strictObject({
  schemaVersion: z.literal(1), cityId: IdSchema,
  origin: CoordinatesSchema.extend({ source: z.enum(['device', 'manual']) }),
  departAt: InstantSchema, sessionMinutes: z.number().int().min(15).max(240),
  categories: z.array(z.string().min(1).max(60)).max(20),
  maxWalkMinutes: z.number().min(5).max(60),
  maxPriceLevel: z.number().int().min(0).max(4).nullable(),
  requireOpenForSession: z.boolean(), intent: IntentSchema,
  groupSize: z.number().int().min(1).max(8), targetNoise: UnitSchema, targetCrowd: UnitSchema,
  tagWeights: TagWeightsSchema,
  amenities: z.strictObject({
    wifi: z.enum(['ignore', 'prefer', 'require']), outlets: z.enum(['ignore', 'prefer', 'require']),
  }),
  access: z.enum(['any', 'public_only']), limit: z.number().int().min(1).max(10).default(3),
});
export type Query = z.infer<typeof QuerySchema>;
export type DatasetMode = z.infer<typeof DatasetModeSchema>;

const DailyIntervalSchema = z.strictObject({
  startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(2880),
}).refine((v) => v.endMinute > v.startMinute, 'End must follow start; overnight ends exceed 1440');
export const WeeklyIntervalSchema = z.strictObject({
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(2880),
}).refine((v) => v.endMinute > v.startMinute, 'End must follow start');
export const SpotSchema = z.strictObject({
  id: IdSchema, cityId: IdSchema, providerPlaceId: IdSchema, providerDataId: IdSchema.optional(),
  name: z.string().min(1).max(160), categories: z.array(z.string().min(1).max(60)).max(20),
  lat: CoordinatesSchema.shape.lat, lng: CoordinatesSchema.shape.lng, timezone: TimezoneSchema,
  address: z.string().max(300), datasetMode: DatasetModeSchema, datasetVersion: IdSchema,
  fetchedAt: InstantSchema, status: z.enum(['active', 'temporarily_closed', 'permanently_closed', 'unknown']),
  priceLevel: evidenceSchema(z.number().int().min(0).max(4)),
  rating: evidenceSchema(z.number().min(0).max(5)),
  reviewCount: evidenceSchema(z.number().int().nonnegative()),
  noise: evidenceSchema(UnitSchema), groupFriendly: evidenceSchema(UnitSchema),
  wifi: evidenceSchema(AmenityStateSchema), outlets: evidenceSchema(AmenityStateSchema),
  publicAccess: evidenceSchema(AmenityStateSchema), tags: evidenceSchema(TagWeightsSchema),
  summary: evidenceSchema(z.string().min(1).max(300)),
  image: z.strictObject({ url: z.url(), attribution: z.string().min(1).max(300) }).nullable(),
  publicPlaceUrl: z.url().nullable(),
  hoursStatus: z.enum(['known', 'unknown']), hoursFetchedAt: InstantSchema.nullable(),
  weeklyHours: z.array(WeeklyIntervalSchema).max(50),
  hoursExceptions: z.record(LocalDateSchema, z.array(DailyIntervalSchema).max(10)),
  typicalCrowd: z.strictObject({
    entries: z.array(z.strictObject({ weekday: z.number().int().min(0).max(6),
      hour: z.number().int().min(0).max(23), value: UnitSchema.nullable() })).max(168),
    source: FactSourceSchema, fetchedAt: InstantSchema,
  }).nullable(),
  liveObservation: z.strictObject({ text: z.string().max(300), observedAt: InstantSchema.nullable(),
    fetchedAt: InstantSchema, numericValue: UnitSchema.nullable() }).nullable(),
});
export type Spot = z.infer<typeof SpotSchema>;
export const RankingResultSchema = z.strictObject({
  spotId: IdSchema, score: z.number().min(0).max(100), evidenceCoverage: UnitSchema,
  estimatedWalkMinutes: z.number().int().nonnegative(), arrivalAt: InstantSchema,
  reasons: z.array(z.strictObject({ code: z.string(), text: z.string(), evidenceIds: z.array(IdSchema) })),
  warnings: z.array(z.string()),
});
export type RankingResult = z.infer<typeof RankingResultSchema>;
export const ExclusionCodeSchema = z.enum(['distance', 'category', 'price', 'unknown_price',
  'hours', 'unknown_hours', 'amenity', 'access', 'closed']);
export type ExclusionCode = z.infer<typeof ExclusionCodeSchema>;
export const RelaxationSchema = z.strictObject({
  label: z.string(), patch: QuerySchema.partial(), countEstimate: z.number().int().nonnegative().optional(),
});
export const RecommendationSchema = z.strictObject({
  schemaVersion: z.literal(1), requestId: IdSchema, mode: DatasetModeSchema,
  datasetVersion: IdSchema, generatedAt: InstantSchema,
  results: z.array(RankingResultSchema.extend({ spot: SpotSchema })).max(10),
  excludedCounts: z.partialRecord(ExclusionCodeSchema, z.number().int().nonnegative()),
  relaxations: z.array(RelaxationSchema),
  metrics: z.strictObject({ rankMs: z.number().nonnegative(), candidateCount: z.number().int().nonnegative(),
    qualifyingCount: z.number().int().nonnegative(), externalCalls: z.number().int().nonnegative(),
    cacheHits: z.number().int().nonnegative() }),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;
export const CitySchema = CoordinatesSchema.extend({
  id: IdSchema, name: z.string().min(1), timezone: TimezoneSchema,
  mode: DatasetModeSchema, datasetVersion: IdSchema,
});
export type City = z.infer<typeof CitySchema>;
export const CitiesSchema = z.strictObject({ schemaVersion: z.literal(1), cities: z.array(CitySchema) });
export const SnapshotSchema = z.strictObject({ schemaVersion: z.literal(1), cityId: IdSchema,
  mode: DatasetModeSchema, datasetVersion: IdSchema, fetchedAt: InstantSchema, spots: z.array(SpotSchema).max(200) });
export type Snapshot = z.infer<typeof SnapshotSchema>;
export const SpotDetailSchema = z.strictObject({ schemaVersion: z.literal(1), spot: SpotSchema,
  evidence: z.array(z.strictObject({ id: IdSchema, text: z.string().max(500), sourceUrl: z.url().nullable() })).max(20) });
export type SpotDetail = z.infer<typeof SpotDetailSchema>;
export const HealthSchema = z.strictObject({ status: z.literal('ok'), contractVersion: z.literal(1), commit: z.string() });
export const ApiErrorSchema = z.strictObject({ error: z.strictObject({ code: z.string(), message: z.string(),
  retryable: z.boolean() }), requestId: IdSchema });

export interface DataProvider {
  listCities(): Promise<City[]>;
  listSpots(cityId: string): Promise<Snapshot>;
  getSpot(id: string): Promise<SpotDetail>;
  recommend(query: Query): Promise<Recommendation>;
}
