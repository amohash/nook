import { SegmentedControl, type SelectionOption } from './SegmentedControl';

export type LevelSteps =
  | readonly [SelectionOption<number>, SelectionOption<number>, SelectionOption<number>]
  | readonly [SelectionOption<number>, SelectionOption<number>, SelectionOption<number>, SelectionOption<number>]
  | readonly [SelectionOption<number>, SelectionOption<number>, SelectionOption<number>, SelectionOption<number>, SelectionOption<number>];
export type LevelPickerProps = {
  steps: LevelSteps;
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
};

/** Labeled discrete steps; never rounds or normalizes D's [0, 1] values. */
export function LevelPicker({ steps, ...props }: LevelPickerProps) {
  return <SegmentedControl options={steps} {...props} />;
}
