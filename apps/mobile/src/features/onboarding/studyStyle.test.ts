import { describe, expect, it } from 'vitest';
import { applyStudyStyles } from '../../data/settings';
import { createDemoQuery } from '@space/fixtures';
import { STUDY_STYLE_OPTIONS, VISIBLE_STUDY_STYLE_OPTIONS, toggleStudyStyle, type StudyStyleId } from './studyStyle';

describe('study style selection', () => {
  it('allows every choice together, including opposing preferences', () => {
    const selected = STUDY_STYLE_OPTIONS.reduce<StudyStyleId[]>((values, option) => toggleStudyStyle(values, option.id), []);
    expect(selected).toEqual(STUDY_STYLE_OPTIONS.map(({ id }) => id));
  });

  it('allows deselecting the last choice without mutating saved preferences', () => {
    const saved = Object.freeze(['quiet'] as const);
    expect(toggleStudyStyle(saved, 'quiet')).toEqual([]);
    expect(saved).toEqual(['quiet']);
  });

  it('preserves other picks and does not duplicate a toggled choice', () => {
    const selected = toggleStudyStyle(['outlets', 'quiet', 'wifi'], 'quiet');
    expect(selected).toEqual(['outlets', 'wifi']);
    expect(toggleStudyStyle(selected, 'quiet')).toEqual(['outlets', 'wifi', 'quiet']);
  });

  it('only shows choices that change ranking, while saved legacy choices stay valid', () => {
    const demo = createDemoQuery();
    // Neutral baseline so each choice's own effect is visible.
    const query = { ...demo, tagWeights: {}, targetNoise: 0.5, groupSize: 3,
      amenities: { ...demo.amenities, wifi: 'ignore' as const, outlets: 'ignore' as const } };
    for (const { id } of VISIBLE_STUDY_STYLE_OPTIONS) expect(applyStudyStyles(query, [id])).not.toEqual(applyStudyStyles(query, []));
    expect(VISIBLE_STUDY_STYLE_OPTIONS.map(({ id }) => id)).not.toContain('coffee_nearby');
    expect(STUDY_STYLE_OPTIONS.map(({ id }) => id)).toContain('coffee_nearby');
  });
});
