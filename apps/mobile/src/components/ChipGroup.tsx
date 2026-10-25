import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Chip } from './Chip';
import type { SelectionOption, SelectionValue } from './SegmentedControl';

export type ChipGroupProps<T extends SelectionValue> = {
  options: readonly SelectionOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  accessibilityLabel?: string;
};

/** Selection rules and tag weights stay with the caller. */
export function ChipGroup<T extends SelectionValue>({ options, selected, onToggle,
  accessibilityLabel }: ChipGroupProps<T>) {
  return <View accessibilityLabel={accessibilityLabel} style={styles.row}>
    {options.map((option) => <Chip key={`${typeof option.value}:${String(option.value)}`}
      label={option.label} selected={selected.includes(option.value)} onPress={() => onToggle(option.value)} />)}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
});
