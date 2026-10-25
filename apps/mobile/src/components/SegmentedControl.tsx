import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Chip } from './Chip';

export type SelectionValue = string | number | null;
export type SelectionOption<T extends SelectionValue> = { value: T; label: string };
export type SegmentedControlProps<T extends SelectionValue> = {
  options: readonly SelectionOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** Values pass through unchanged, including price 0 and null (no cap). */
export function SegmentedControl<T extends SelectionValue>({ options, value, onChange,
  accessibilityLabel }: SegmentedControlProps<T>) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.row}>
    {options.map((option) => <Chip key={`${typeof option.value}:${String(option.value)}`}
      label={option.label} selectionRole="radio" selected={option.value === value}
      onPress={() => onChange(option.value)} />)}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
});
