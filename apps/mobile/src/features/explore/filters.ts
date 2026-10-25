import { QuerySchema, type Query } from '@space/contracts';
import { createDemoQuery } from '@space/fixtures';

export const CATEGORY_OPTIONS = [
  { value: 'cafe', label: 'Café' }, { value: 'library', label: 'Library' },
  { value: 'restaurant', label: 'Restaurant' }, { value: 'park', label: 'Park' },
] as const;
export const ATMOSPHERE_OPTIONS = [
  { value: 0.15, label: 'Quiet' }, { value: 0.4, label: 'Balanced' }, { value: 0.65, label: 'Lively' },
] as const;
export const VIBE_OPTIONS = ['study', 'quiet', 'lively', 'cozy', 'group_friendly', 'outdoor', 'budget', 'work_friendly'] as const satisfies readonly (keyof Query['tagWeights'])[];

// These are query presets only. Eligibility and scoring belong to C's ranker,
// reached through DataProvider.recommend; screens never filter/sort result cards.
export function applyIntentPreset(query: Query, intent: 'study' | 'friends'): Query {
  return QuerySchema.parse({ ...query, intent,
    groupSize: intent === 'study' ? 1 : 4,
    targetNoise: intent === 'study' ? 0.15 : 0.65,
    targetCrowd: intent === 'study' ? 0.25 : 0.6,
    tagWeights: intent === 'study' ? { study: 1, quiet: 1 } : { lively: 1, group_friendly: 1 },
  });
}

export function resetExploreFilters(query: Query): Query {
  return applyExploreFilters(query, createDemoQuery());
}

// A GPS result can arrive while the sheet is open. Apply only its filter fields,
// preserving the latest origin/time instead of restoring stale draft context.
export function applyExploreFilters(query: Query, draft: Query): Query {
  return QuerySchema.parse({ ...query, categories: draft.categories,
    maxPriceLevel: draft.maxPriceLevel, maxWalkMinutes: draft.maxWalkMinutes,
    intent: draft.intent, groupSize: draft.groupSize, targetNoise: draft.targetNoise,
    targetCrowd: draft.targetCrowd, tagWeights: draft.tagWeights,
  });
}

function sameTags(a: Query['tagWeights'], b: Query['tagWeights']): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as (keyof Query['tagWeights'])[]);
  return [...keys].every((key) => (a[key] ?? 0) === (b[key] ?? 0));
}

// Count changed groups once, relative to the visible default Study preferences.
export function activeFilterCount(query: Query): number {
  const defaults = createDemoQuery();
  return [query.categories.length > 0, query.maxPriceLevel !== defaults.maxPriceLevel,
    query.maxWalkMinutes !== defaults.maxWalkMinutes,
    query.targetNoise !== defaults.targetNoise || query.targetCrowd !== defaults.targetCrowd || !sameTags(query.tagWeights, defaults.tagWeights),
    query.intent !== defaults.intent || query.groupSize !== defaults.groupSize,
  ].filter(Boolean).length;
}

export function priceLabel(price: Query['maxPriceLevel']): string {
  return price === null ? 'No price cap' : price === 0 ? 'Free only' : `${'$'.repeat(price)} maximum`;
}
