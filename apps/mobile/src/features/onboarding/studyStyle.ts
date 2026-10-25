// Reuse contract vocabulary where it describes the choice directly. The other
// IDs are local onboarding choices, not additional API tags or strict filters.
export const STUDY_STYLE_OPTIONS = [
  { id: 'quiet', label: 'Silent' },
  { id: 'some_chatter', label: 'Some chatter' },
  { id: 'outlets', label: 'Outlets' },
  { id: 'late_night', label: 'Open late' },
  { id: 'solo', label: 'Solo' },
  { id: 'group_friendly', label: 'Group tables' },
  { id: 'wifi', label: 'Good Wi-Fi' },
  { id: 'coffee_nearby', label: 'Coffee nearby' },
  { id: 'outdoor', label: 'Outdoors' },
  { id: 'whiteboards', label: 'Whiteboards' },
] as const;

export type StudyStyleId = (typeof STUDY_STYLE_OPTIONS)[number]['id'];

export function toggleStudyStyle(selected: readonly StudyStyleId[], id: StudyStyleId): StudyStyleId[] {
  return selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
}
