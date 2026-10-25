import { z, QuerySchema, type Query, type City } from '@space/contracts';
import { createInitialQuery } from './initialQuery';
import { applyIntentPreset } from '../features/explore/filters';
import { STUDY_STYLE_OPTIONS, type StudyStyleId } from '../features/onboarding/studyStyle';
import type { PreferenceValues } from '../features/preferences';

export const PreferenceSchema = QuerySchema.pick({intent: true, maxWalkMinutes: true,
  maxPriceLevel: true, tagWeights: true, amenities: true}).strip();
const StyleSchema = z.enum(STUDY_STYLE_OPTIONS.map(({id}) => id) as [StudyStyleId, ...StudyStyleId[]]);
export const SettingsSchema = z.strictObject({version: z.literal(1), completed: z.boolean(),
  styles: z.array(StyleSchema).max(STUDY_STYLE_OPTIONS.length), preferences: PreferenceSchema});
export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsStorage = {getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>};
export const settingsKey = (city: City) => `nook:settings:v1:${city.mode}:${city.id}:${city.datasetVersion}`;
export function defaultSettings(query: Query): Settings {
  return {version: 1, completed: false, styles: [], preferences: PreferenceSchema.parse(query)};
}
export function createSettingsStore(storage: SettingsStorage) {
  // Serialize writes so a reset cannot be overtaken by an earlier save.
  let queue: Promise<unknown> = Promise.resolve();
  return {
    async load(key: string): Promise<Settings | null> {
      const value = await storage.getItem(key);
      return value === null ? null : SettingsSchema.parse(JSON.parse(value));
    },
    save(key: string, value: Settings): Promise<void> {
      const serialized = JSON.stringify(SettingsSchema.parse(value));
      const operation = queue.then(() => storage.setItem(key, serialized));
      queue = operation.catch(() => {});
      return operation;
    },
  };
}
export function applyPreferences(query: Query, values: PreferenceValues): Query {
  const preferences = PreferenceSchema.parse(values);
  const preset = preferences.intent !== query.intent && (preferences.intent === 'study' || preferences.intent === 'friends')
    ? applyIntentPreset(query, preferences.intent) : query;
  return QuerySchema.parse({...preset, ...preferences});
}
export function applyStudyStyles(query: Query, styles: readonly StudyStyleId[]): Query {
  const tags: Query['tagWeights'] = {};
  for (const tag of ['quiet', 'late_night', 'group_friendly', 'outdoor'] as const) {
    if (styles.includes(tag)) tags[tag] = 1;
  }
  const someChatter = styles.includes('some_chatter');
  return QuerySchema.parse({...query,
    // Both noise choices use the existing Balanced target; no new scorer.
    targetNoise: someChatter ? 0.4 : query.targetNoise,
    groupSize: styles.includes('solo') ? 1 : query.groupSize,
    tagWeights: {...query.tagWeights, ...tags},
    amenities: {...query.amenities,
      wifi: styles.includes('wifi') && query.amenities.wifi === 'ignore' ? 'prefer' : query.amenities.wifi,
      outlets: styles.includes('outlets') && query.amenities.outlets === 'ignore' ? 'prefer' : query.amenities.outlets},
  });
}
export function restoredQuery(city: City, settings: Settings | null, now: string): Query {
  const initial = createInitialQuery(city, now);
  return settings ? applyPreferences(applyStudyStyles(initial, settings.styles), settings.preferences) : initial;
}
