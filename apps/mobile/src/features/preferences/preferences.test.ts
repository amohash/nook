import { describe, expect, it } from 'vitest';
import { QuerySchema, TAGS } from '@space/contracts';
import { createDemoQuery } from '@space/fixtures';
import { toggleVibe, VIBE_LABELS } from './preferences';

describe('preference edits', () => {
  it('uses only the shared tag vocabulary', () => {
    expect(VIBE_LABELS.map(({ id }) => id).sort()).toEqual([...TAGS].sort());
  });

  it('caps new picks at three without removing existing preferences', () => {
    const initial = createDemoQuery({ tagWeights: { quiet: 1, study: 1, cozy: 1 } });
    expect(toggleVibe(initial, 'outdoor')).toBe(initial);
    expect(toggleVibe(toggleVibe(initial, 'cozy'), 'outdoor').tagWeights).toEqual({ quiet: 1, study: 1, outdoor: 1 });
  });

  it('keeps strict fields and the saved draft untouched during a vibe edit', () => {
    const initial = createDemoQuery({ maxPriceLevel: 0, maxWalkMinutes: 5,
      amenities: { wifi: 'require', outlets: 'require' } });
    const edited = toggleVibe(initial, 'outdoor');
    expect(initial.tagWeights).toEqual({ study: 1, quiet: 1 });
    const merged = QuerySchema.parse({ ...initial, ...edited });
    expect(merged.maxPriceLevel).toBe(0);
    expect(merged.maxWalkMinutes).toBe(5);
    expect(merged.amenities).toEqual(initial.amenities);
    expect(merged.tagWeights.outdoor).toBe(1);
  });
});
