import { describe, expect, it } from 'vitest';
import { STUDY_STYLE_OPTIONS, toggleStudyStyle, type StudyStyleId } from './studyStyle';

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
});
