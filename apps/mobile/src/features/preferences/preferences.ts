import type { Query } from '@space/contracts';

export type PreferenceValues = Pick<Query, 'intent' | 'maxWalkMinutes' | 'maxPriceLevel' | 'tagWeights' | 'amenities'>;
export type VibeTag = keyof Query['tagWeights'];

export const VIBE_LABELS = [
  { id: 'study', label: 'Study' }, { id: 'quiet', label: 'Quiet' },
  { id: 'lively', label: 'Lively' }, { id: 'cozy', label: 'Cozy' },
  { id: 'date_night', label: 'Date night' }, { id: 'late_night', label: 'Late night' },
  { id: 'group_friendly', label: 'Group friendly' }, { id: 'outdoor', label: 'Outdoor' },
  { id: 'budget', label: 'Budget' }, { id: 'live_music', label: 'Live music' },
  { id: 'work_friendly', label: 'Work friendly' }, { id: 'trendy', label: 'Trendy' },
] as const satisfies readonly { id: VibeTag; label: string }[];

export function toggleVibe(values: PreferenceValues, tag: VibeTag): PreferenceValues {
  const tagWeights = { ...values.tagWeights };
  if ((tagWeights[tag] ?? 0) > 0) delete tagWeights[tag];
  else {
    if (Object.values(tagWeights).filter((weight) => (weight ?? 0) > 0).length >= 3) return values;
    tagWeights[tag] = 1;
  }
  return { ...values, tagWeights };
}
